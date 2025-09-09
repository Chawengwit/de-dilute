import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      "SELECT lang, theme FROM user_settings WHERE user_id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      // return default settings
      return res.json({ lang: "en", theme: "light" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error fetching settings:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { lang, theme } = req.body;

    const result = await db.query(
      `INSERT INTO user_settings (user_id, lang, theme)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id)
       DO UPDATE SET lang = EXCLUDED.lang,
                     theme = EXCLUDED.theme,
                     updated_at = now()
       RETURNING lang, theme`,
      [userId, lang || "en", theme || "light"]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error saving settings:", err);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

export default router;
