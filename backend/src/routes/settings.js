import express from "express";
import db from "../db.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { cache, invalidateCache } from "../middleware/cache.js";

const router = express.Router();

// ดีฟอลต์แบบเบา ๆ ถ้า DB ยังไม่มีค่า
const DEFAULT_SETTINGS = {
  en: { siteName: { value: "De-Delute", type: "text", lang: "en" } },
  th: { siteName: { value: "De-Delute", type: "text", lang: "th" } },
};

/**
 * @route GET /api/settings
 * @desc Public - get settings by lang (cache 300s)
 */
router.get("/", cache("settings:", 300), async (req, res) => {
  const lang = (req.query.lang || "en").toLowerCase();
  try {
    const result = await db.query(
      "SELECT key, value, type, lang FROM settings WHERE lang = $1 ORDER BY key",
      [lang]
    );

    if (!result.rows.length) {
      // ไม่มีใน DB → ส่งดีฟอลต์
      return res.json(DEFAULT_SETTINGS[lang] || DEFAULT_SETTINGS.en);
    }

    const settingsObj = {};
    for (const row of result.rows) {
      settingsObj[row.key] = {
        value: row.value,
        type: row.type,
        lang: row.lang,
      };
    }
    return res.json(settingsObj);
  } catch (err) {
    // 42P01 = undefined_table, 42703 = undefined_column
    if (err?.code === "42P01" || err?.code === "42703") {
      console.warn("Settings table/columns missing. Serving defaults.");
      return res.json(DEFAULT_SETTINGS[lang] || DEFAULT_SETTINGS.en);
    }
    console.error("Error fetching settings:", err);
    return res.status(200).json(DEFAULT_SETTINGS[lang] || DEFAULT_SETTINGS.en);
  }
});

/**
 * @route POST /api/settings
 * @desc Admin only - upsert settings
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
        const { key, value, type = "text", lang = "en" } = s || {};
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

      await invalidateCache("settings:");
      return res.json({ message: "Settings updated successfully", settings: updated });
    } catch (err) {
      console.error("Error saving settings:", err);
      return res.status(500).json({ error: "Failed to save settings" });
    }
  }
);

export default router;
