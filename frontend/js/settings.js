import { getSettings, saveSettings } from "./api.js";

let settings = {
  lang: "en",
  theme: "light",
};

/**
 * โหลด settings จาก backend
 */
export async function initSettings() {
  try {
    const res = await getSettings();
    if (res) {
      settings = { ...settings, ...res };
    }
  } catch (err) {
    console.error("❌ Failed to init settings:", err);
  }
}

/**
 * ดึงค่าภาษา
 */
export function getLanguage() {
  return settings.lang || "en";
}

/**
 * อัปเดตค่าภาษา (และบันทึกไป backend)
 */
export async function setLanguageSetting(lang) {
  settings.lang = lang;
  try {
    await saveSettings(settings);
  } catch (err) {
    console.error("❌ Failed to save language setting:", err);
  }
}

/**
 * อัปเดตธีม (และบันทึกไป backend)
 */
export async function setThemeSetting(theme) {
  settings.theme = theme;
  document.documentElement.setAttribute("data-theme", theme); // apply ทันที
  try {
    await saveSettings(settings);
  } catch (err) {
    console.error("❌ Failed to save theme setting:", err);
  }
}
