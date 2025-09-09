import { getSettings } from "./api.js";

export async function loadSettings(lang = "en") {
  try {
    return await getSettings(lang);
  } catch (err) {
    console.error(`❌ Failed to load settings for ${lang}:`, err);
    return {}; // fallback
  }
}
