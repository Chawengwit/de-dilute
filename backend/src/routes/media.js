// @backend/src/routes/media.js  (Generic Media API for Thumbnail / Gallery / Video)
// Cloudflare R2 / S3-compatible

import { Router } from "express";
import multer from "multer";
import path from "path";
import pool from "../db.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { invalidateCache } from "../middleware/cache.js";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const router = Router();

/* ---------------------------------------------
 * S3/R2 Client
 * --------------------------------------------- */
const s3 = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
});
const PUBLIC_BASE = (process.env.PUBLIC_MEDIA_BASE_URL || "").replace(/\/+$/, "");
const BUCKET = process.env.S3_BUCKET;

/* ---------------------------------------------
 * Multer → memoryStorage
 * --------------------------------------------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 10 }, // 50MB/ไฟล์ สูงสุด 10 ไฟล์
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype?.startsWith("image/") || file.mimetype?.startsWith("video/");
    cb(ok ? null : new Error("Unsupported file type"), ok);
  },
});

/* ---------------------------------------------
 * Helpers
 * --------------------------------------------- */
const PURPOSES = new Set(["thumbnail", "gallery", "video"]);

/** map entity_type -> table & column config (generic media_assets) */
const ENTITY_MAP = {
  product: {
    table: "media_assets",
    idColumn: "entity_id",   // media_assets(entity_type, entity_id, ...)
    entityType: "product",
  },
  // ขยายได้ในอนาคต เช่น:
  // post: { table: "media_assets", idColumn: "entity_id", entityType: "post" },
};

function makeObjectKey(entityType, entityId, originalName, purpose = "gallery") {
  const ts = Date.now();
  const rand = Math.round(Math.random() * 1e9);
  const ext = (path.extname(originalName || "") || "").toLowerCase();
  // e.g. products/123/gallery/media-<ts>-<rand>.jpg
  return `${entityType}s/${entityId}/${purpose}/media-${ts}-${rand}${ext}`;
}
function detectType(mime) {
  return mime?.startsWith("video/") ? "video" : "image";
}
function envReady() {
  return !!(BUCKET && PUBLIC_BASE && process.env.S3_ENDPOINT);
}

/* -------------------------------------------------------
 * POST /api/media/upload  (ADMIN)
 * multipart/form-data:
 *   - entity_type: "product" | ... (required)
 *   - entity_id:   number (required)
 *   - purpose:     "thumbnail" | "gallery" | "video" (required)
 *   - replace:     "true"/"false" (optional, default=false; ใช้กับ thumbnail)
 *   - files[]:     image/* | video/* (1..10)
 * Behavior:
 *   - thumbnail: ใช้ไฟล์แรกเท่านั้น; ถ้า replace=true → ลบรายการ purpose เดิมก่อน
 *   - gallery/video: แทรกต่อท้าย (sort_order auto-increment)
 * ------------------------------------------------------- */
router.post(
  "/upload",
  authenticate,
  requirePermission("ADMIN"),
  upload.array("files", 10),
  async (req, res) => {
    const client = await pool.connect();
    try {
      const { entity_type, entity_id, purpose, replace } = req.body;

      if (!entity_type || !ENTITY_MAP[entity_type]) {
        return res.status(400).json({ error: "Invalid or missing entity_type" });
      }
      if (!entity_id || Number.isNaN(Number(entity_id))) {
        return res.status(400).json({ error: "Missing or invalid entity_id" });
      }
      if (!purpose || !PURPOSES.has(purpose)) {
        return res.status(400).json({ error: "Invalid purpose" });
      }
      if (!req.files?.length) {
        return res.status(400).json({ error: "No files uploaded" });
      }
      if (!envReady()) {
        return res.status(500).json({
          error:
            "S3/R2 misconfigured. Please set S3_BUCKET, S3_ENDPOINT, PUBLIC_MEDIA_BASE_URL.",
        });
      }

      const { table, idColumn, entityType } = ENTITY_MAP[entity_type];

      // 1) validate entity exists (เฉพาะ product)
      if (entity_type === "product") {
        const chk = await client.query("SELECT id FROM products WHERE id = $1", [
          Number(entity_id),
        ]);
        if (chk.rows.length === 0) {
          return res.status(404).json({ error: "Product not found" });
        }
      }

      // 2) ฐาน sort_order ต่อท้าย
      const { rows: maxRows } = await client.query(
        `SELECT COALESCE(MAX(sort_order), -1) AS max_order
           FROM ${table}
          WHERE entity_type = $1 AND ${idColumn} = $2`,
        [entityType, Number(entity_id)]
      );
      let nextOrder = (maxRows[0]?.max_order ?? -1) + 1;

      // 3) ถ้าเป็น thumbnail + replace=true → ลบของเดิมตาม purpose='thumbnail'
      if (purpose === "thumbnail" && String(replace).toLowerCase() === "true") {
        const { rows: olds } = await client.query(
          `SELECT id, s3_key, url
             FROM ${table}
            WHERE entity_type = $1 AND ${idColumn} = $2 AND purpose = 'thumbnail'`,
          [entityType, Number(entity_id)]
        );

        if (olds.length) {
          // ลบ DB
          await client.query(
            `DELETE FROM ${table}
              WHERE entity_type = $1 AND ${idColumn} = $2 AND purpose = 'thumbnail'`,
            [entityType, Number(entity_id)]
          );

          // ลบ object R2 (best-effort)
          for (const row of olds) {
            const key = row.s3_key || deriveKeyFromUrl(row.url);
            if (!key) continue;
            try {
              await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
            } catch (e) {
              console.warn("Delete old thumbnail warning:", e?.message || e);
            }
          }
        }
        // Thumbnail → sort_order = 0
        nextOrder = 0;
      }

      // 4) Upload(s) → R2 และ Insert DB
      const results = [];
      const filesToUse =
        purpose === "thumbnail" ? [req.files[0]] : Array.from(req.files);

      for (const file of filesToUse) {
        const Key = makeObjectKey(entityType, entity_id, file.originalname, purpose);
        const ContentType = file.mimetype || "application/octet-stream";

        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key,
            Body: file.buffer,
            ContentType,
          })
        );

        const publicUrl = `${PUBLIC_BASE}/${Key}`;
        const mediaType = detectType(file.mimetype);

        const insertSQL = `
          INSERT INTO ${table} (entity_type, ${idColumn}, purpose, url, s3_key, type, mime_type, sort_order)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          RETURNING id, entity_type, ${idColumn} AS entity_id, purpose, url, type, sort_order
        `;
        const { rows } = await client.query(insertSQL, [
          entityType,                 // entity_type: 'product'
          Number(entity_id),          // entity_id
          purpose,                    // 'thumbnail' | 'gallery' | 'video'
          publicUrl,                  // url
          Key,                        // s3_key
          mediaType,                  // 'image' | 'video'
          ContentType,                // mime_type
          nextOrder,                  // sort_order
        ]);
        results.push(rows[0]);

        if (purpose === "thumbnail") break;
        nextOrder++;
      }

      await invalidateCache("products_public:");
      res.status(201).json(results);
    } catch (err) {
      console.error("Media upload (generic) error:", err);
      res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  }
);

/* -------------------------------------------------------
 * DELETE /api/media/delete/:id  (ADMIN)
 * ------------------------------------------------------- */
router.delete(
  "/delete/:id",
  authenticate,
  requirePermission("ADMIN"),
  async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;

      const entity = await client.query(
        `SELECT id, s3_key, url FROM media_assets WHERE id = $1`,
        [Number(id)]
      );
      if (!entity.rows.length) {
        return res.status(404).json({ error: "Media not found" });
      }

      await client.query(`DELETE FROM media_assets WHERE id = $1`, [Number(id)]);

      // ลบ object บน R2 (best-effort)
      const key = entity.rows[0].s3_key || deriveKeyFromUrl(entity.rows[0].url);
      if (key) {
        try {
          await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
        } catch (e) {
          console.warn("DeleteObject warning:", e?.message || e);
        }
      }

      await invalidateCache("products_public:");
      res.json({ message: "Media deleted", id: Number(id) });
    } catch (err) {
      console.error("Media delete error:", err);
      res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  }
);

/* -------------------------------------------------------
 * DELETE /api/media/by-entity  (ADMIN)
 * body: { entity_type, entity_id, purpose? }
 * ------------------------------------------------------- */
router.delete(
  "/by-entity",
  authenticate,
  requirePermission("ADMIN"),
  async (req, res) => {
    const client = await pool.connect();
    try {
      const { entity_type, entity_id, purpose } = req.body;

      if (!entity_type || !ENTITY_MAP[entity_type]) {
        return res.status(400).json({ error: "Invalid or missing entity_type" });
      }
      if (!entity_id || Number.isNaN(Number(entity_id))) {
        return res.status(400).json({ error: "Missing or invalid entity_id" });
      }
      const { table, idColumn, entityType } = ENTITY_MAP[entity_type];

      const cond = [`entity_type = $1`, `${idColumn} = $2`];
      const params = [entityType, Number(entity_id)];

      if (purpose && PURPOSES.has(purpose)) {
        cond.push(`purpose = $3`);
        params.push(purpose);
      }

      const selectSQL = `SELECT id, s3_key, url FROM ${table} WHERE ${cond.join(" AND ")}`;
      const { rows: medias } = await client.query(selectSQL, params);

      if (!medias.length) {
        return res.json({ message: "No media to delete", count: 0 });
      }

      const deleteSQL = `DELETE FROM ${table} WHERE ${cond.join(" AND ")}`;
      await client.query(deleteSQL, params);

      // ลบ object ใน R2 (best-effort)
      for (const m of medias) {
        const key = m.s3_key || deriveKeyFromUrl(m.url);
        if (!key) continue;
        try {
          await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
        } catch (e) {
          console.warn("DeleteObject warning:", e?.message || e);
        }
      }

      await invalidateCache("products_public:");
      res.json({ message: "Media deleted by entity", count: medias.length });
    } catch (err) {
      console.error("Media delete by entity error:", err);
      res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  }
);

/* -------------------------------------------------------
 * PATCH /api/media/sort  (ADMIN)
 * body: { items: [{ id, sort_order }, ...] }
 * ------------------------------------------------------- */
router.patch(
  "/sort",
  authenticate,
  requirePermission("ADMIN"),
  async (req, res) => {
    const client = await pool.connect();
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "items is required" });
      }

      for (const it of items) {
        if (!it?.id || Number.isNaN(Number(it.id))) continue;
        if (it.sort_order == null || Number.isNaN(Number(it.sort_order))) continue;
        await client.query(
          "UPDATE media_assets SET sort_order = $1 WHERE id = $2",
          [Number(it.sort_order), Number(it.id)]
        );
      }

      await invalidateCache("products_public:");
      res.json({ message: "Sort order updated" });
    } catch (err) {
      console.error("Media sort error:", err);
      res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  }
);

/* ---------------------------------------------
 * small util: derive s3 key from public URL
 * --------------------------------------------- */
function deriveKeyFromUrl(url = "") {
  try {
    const cleanBase = PUBLIC_BASE.replace(/\/+$/, "");
    if (cleanBase && String(url).startsWith(cleanBase + "/")) {
      return String(url).substring(cleanBase.length + 1);
    }
    return null;
  } catch {
    return null;
  }
}

export default router;
