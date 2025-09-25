import express from "express";
import db from "../db.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { cache, invalidateCache } from "../middleware/cache.js";

const router = express.Router();

/**
 * @route GET /api/settings
 * @desc Admin only - get settings by lang
 * @query lang=th|en
 *
 * ป้องกันด้วย authenticate + requirePermission("ADMIN")
 */
router.get(
  "/",
  authenticate,
  requirePermission("ADMIN"),
  cache("settings:", 300),
  async (req, res) => {
    try {
      const lang = req.query.lang || "en";

      const result = await db.query(
        "SELECT key, value, type, lang FROM settings WHERE lang = $1 ORDER BY key",
        [lang]
      );

      // แปลงเป็น object: { key1: { value, type, lang } }
      const settingsObj = {};
      result.rows.forEach((row) => {
        settingsObj[row.key] = {
          value: row.value,
          type: row.type,
          lang: row.lang,
        };
      });

      res.json(settingsObj);
    } catch (err) {
      console.error("Error fetching settings:", err);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  }
);

/**
 * @route POST /api/settings
 * @desc Admin only - upsert settings
 * @body { settings: [{ key, value, type, lang }] }
 *
 * ป้องกันด้วย authenticate + requirePermission("ADMIN")
 */
router.post(
  "/",
  authenticate,
  requirePermission("ADMIN"),
  async (req, res) => {
    try {
      const { settings } = req.body;
      if (!Array.isArray(settings)) {
        return res.status(400).json({ error: "Invalid request format" });
      }

      const updated = [];
      for (const s of settings) {
        const { key, value, type = "text", lang = "en" } = s;
        if (!key) continue;

        const result = await db.query(
          `INSERT INTO settings (key, value, type, lang)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (key, lang)
           DO UPDATE SET value = EXCLUDED.value,
                         type = EXCLUDED.type,
                         updated_at = now()
           RETURNING id, key, value, type, lang`,
          [key, value, type, lang]
        );
        updated.push(result.rows[0]);
      }

      // ล้าง cache หลังแก้ไข
      await invalidateCache("settings:");

      res.json({ message: "Settings updated successfully", settings: updated });
    } catch (err) {
      console.error("Error saving settings:", err);
      res.status(500).json({ error: "Failed to save settings" });
    }
  }
);

export default router;
