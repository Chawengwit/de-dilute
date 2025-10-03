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
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { pipeline } from "stream";
import { promisify } from "util";

const streamPipeline = promisify(pipeline);
const router = Router();

/* ---------------------------------------------
 * S3/R2 Client
 * --------------------------------------------- */
const s3 = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true, // good for S3-compatible (R2)
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
});

const PUBLIC_BASE = (process.env.PUBLIC_MEDIA_BASE_URL || "").replace(/\/+$/, "");
const BUCKET = process.env.S3_BUCKET;

// key prefix (e.g. "de-delute") if your objects live under a folder in the bucket
const KEY_PREFIX = (process.env.S3_KEY_PREFIX || "").replace(/^\/+|\/+$/g, "");
const withPrefix = (k = "") => (KEY_PREFIX ? `${KEY_PREFIX}/${k.replace(/^\/+/, "")}` : k.replace(/^\/+/, ""));
const stripPrefix = (k = "") =>
  KEY_PREFIX && k.startsWith(KEY_PREFIX + "/") ? k.slice(KEY_PREFIX.length + 1) : k;

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

const ENTITY_MAP = {
  product: {
    table: "media_assets",
    idColumn: "entity_id",
    entityType: "product",
  },
};

function makeObjectKey(entityType, entityId, originalName, purpose = "gallery") {
  const ts = Date.now();
  const rand = Math.round(Math.random() * 1e9);
  const ext = (path.extname(originalName || "") || "").toLowerCase();
  // products/123/gallery/media-<ts>-<rand>.jpg
  return `${entityType}s/${entityId}/${purpose}/media-${ts}-${rand}${ext}`;
}
function detectType(mime) {
  return mime?.startsWith("video/") ? "video" : "image";
}
function envReady() {
  return !!(BUCKET && process.env.S3_ENDPOINT /* PUBLIC_BASE optional for proxy */);
}

/* -------------------------------------------------------
 * POST /api/media/upload  (ADMIN)
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
            "S3/R2 misconfigured. Please set S3_BUCKET and S3_ENDPOINT. PUBLIC_MEDIA_BASE_URL is optional when using the proxy.",
        });
      }

      const { table, idColumn, entityType } = ENTITY_MAP[entity_type];

      // validate entity exists (เฉพาะ product)
      if (entity_type === "product") {
        const chk = await client.query("SELECT id FROM products WHERE id = $1", [
          Number(entity_id),
        ]);
        if (chk.rows.length === 0) {
          return res.status(404).json({ error: "Product not found" });
        }
      }

      // next sort_order
      const { rows: maxRows } = await client.query(
        `SELECT COALESCE(MAX(sort_order), -1) AS max_order
           FROM ${table}
          WHERE entity_type = $1 AND ${idColumn} = $2`,
        [entityType, Number(entity_id)]
      );
      let nextOrder = (maxRows[0]?.max_order ?? -1) + 1;

      // replace old thumbnail
      if (purpose === "thumbnail" && String(replace).toLowerCase() === "true") {
        const { rows: olds } = await client.query(
          `SELECT id, s3_key, url
             FROM ${table}
            WHERE entity_type = $1 AND ${idColumn} = $2 AND purpose = 'thumbnail'`,
          [entityType, Number(entity_id)]
        );

        if (olds.length) {
          await client.query(
            `DELETE FROM ${table}
              WHERE entity_type = $1 AND ${idColumn} = $2 AND purpose = 'thumbnail'`,
            [entityType, Number(entity_id)]
          );

          for (const row of olds) {
            const storedKey = row.s3_key || deriveKeyFromUrl(row.url);
            const delKey = withPrefix(stripPrefix(storedKey || ""));
            if (!delKey) continue;
            try {
              await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: delKey }));
            } catch (e) {
              console.warn("Delete old thumbnail warning:", e?.message || e);
            }
          }
        }
        nextOrder = 0;
      }

      // uploads
      const results = [];
      const filesToUse =
        purpose === "thumbnail" ? [req.files[0]] : Array.from(req.files);

      for (const file of filesToUse) {
        const rawKey = makeObjectKey(entityType, entity_id, file.originalname, purpose);
        const Key = withPrefix(rawKey);     // <<<<<< ใช้ prefix ที่นี่
        const ContentType = file.mimetype || "application/octet-stream";

        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key,
            Body: file.buffer,
            ContentType,
            Metadata: {
              "cross-origin-resource-policy": "cross-origin",
            },
          })
        );

        // PUBLIC_BASE optional; ถ้าไม่ได้ตั้ง เราก็ยังเสิร์ฟผ่าน proxy ได้
        const publicUrl = PUBLIC_BASE ? `${PUBLIC_BASE}/${Key}` : `/api/media/file/${Key}`;
        const mediaType = detectType(file.mimetype);

        const insertSQL = `
          INSERT INTO ${table} (entity_type, ${idColumn}, purpose, url, s3_key, type, mime_type, sort_order)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          RETURNING id, entity_type, ${idColumn} AS entity_id, purpose, url, type, sort_order
        `;
        const { rows } = await client.query(insertSQL, [
          entityType,
          Number(entity_id),
          purpose,
          publicUrl,
          Key,                 // <<<<<< เก็บ key พร้อม prefix
          mediaType,
          ContentType,
          nextOrder,
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

      const storedKey = entity.rows[0].s3_key || deriveKeyFromUrl(entity.rows[0].url);
      const delKey = withPrefix(stripPrefix(storedKey || ""));
      if (delKey) {
        try {
          await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: delKey }));
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

      for (const m of medias) {
        const storedKey = m.s3_key || deriveKeyFromUrl(m.url);
        const delKey = withPrefix(stripPrefix(storedKey || ""));
        if (!delKey) continue;
        try {
          await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: delKey }));
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

/* -------------------------------------------------------
 * PROXY FETCH (recommended)
 * GET /api/media/file/<S3_KEY>
 * (Router นี้ mount ที่ /api/media แล้ว จึงแมตช์ /file/... ภายใน)
 * - รองรับทั้ง key ที่มี prefix (de-delute/...) และที่ไม่มี
 * ------------------------------------------------------- */
router.get(/^\/file\/(.+)$/, async (req, res) => {
  try {
    const raw = req.params[0] || "";
    // key จาก URL อาจมีหรือไม่มี prefix มาก็ได้
    const requested = decodeURIComponent(raw).replace(/^\/+/, "");

    // ลองแบบที่ “เติม prefix” ก่อน (คือของจริงใน R2)
    const prefKey = withPrefix(stripPrefix(requested));
    const tryKeys = Array.from(
      new Set([
        prefKey,                  // de-delute/products/...
        requested,                // products/...  (สำหรับกรณีส่งมาครบแล้ว)
      ])
    );

    let found = null;
    for (const k of tryKeys) {
      try {
        const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: k }));
        found = { key: k, obj };
        break;
      } catch (e) {
        // ลองตัวถัดไป
      }
    }

    if (!found) {
      if (process.env.DEBUG_MEDIA === "1") {
        console.error("[media-proxy] NotFound bucket=%s tried=%o", BUCKET, tryKeys);
      }
      return res.status(404).send("Not found");
    }

    const { obj } = found;
    if (obj.ContentType) res.setHeader("Content-Type", obj.ContentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");

    await streamPipeline(obj.Body, res);
  } catch (err) {
    const code = err?.$metadata?.httpStatusCode || 500;
    if (process.env.DEBUG_MEDIA === "1") {
      console.error("[media-proxy] GetObject error:", code, err?.name, err?.message);
    }
    if (code === 404 || err?.name === "NoSuchKey") {
      return res.status(404).send("Not found");
    }
    res.status(500).send("Internal server error");
  }
});

/* ---------------------------------------------
 * small util: derive s3 key from public URL
 * --------------------------------------------- */
function deriveKeyFromUrl(url = "") {
  try {
    if (!url) return null;
    // รองรับทั้ง absolute/relative
    const u = new URL(url, "http://placeholder.local");
    let key = u.pathname.replace(/^\/+/, "");
    // ถ้า URL เป็น public base ที่มี prefix อยู่แล้วก็ใช้ตามนั้น
    key = withPrefix(stripPrefix(key));
    return key;
  } catch {
    try {
      const cleanBase = (process.env.PUBLIC_MEDIA_BASE_URL || "").replace(/\/+$/, "");
      if (cleanBase && String(url).startsWith(cleanBase + "/")) {
        const k = String(url).substring(cleanBase.length + 1);
        return withPrefix(stripPrefix(k));
      }
    } catch {}
    return null;
  }
}

export default router;
