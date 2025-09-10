import { getSettings as apiGetSettings, saveSettings, getCurrentUser } from "./api.js";

let settings = {
  lang: "en",
  theme: "light",
};

/* -------------------- Local Fallback -------------------- */
function setLocalSetting(key, value) {
  localStorage.setItem(key, value);
}

function getLocalSetting(key, defaultValue) {
  return localStorage.getItem(key) || defaultValue;
}

/* -------------------- Init Settings -------------------- */
export async function initSettings() {
  // preload localStorage ก่อน
  settings.lang = getLocalSetting("language", settings.lang);
  settings.theme = getLocalSetting("theme", settings.theme);

  try {
    const res = await apiGetSettings();
    if (res) {
      // ถ้ามีค่าใน API override localStorage
      settings = { ...settings, ...res };
    }
  } catch (err) {
    console.warn("⚠️ Failed to load API settings, using localStorage only");
  }

  // apply theme
  document.documentElement.setAttribute("data-theme", settings.theme);
}

/* -------------------- Language -------------------- */
export function getLanguage() {
  // return จาก settings (sync แล้วกับ localStorage)
  return settings.lang || "en";
}

export async function setLanguageSetting(lang) {
  settings.lang = lang;

  const user = await getCurrentUser();
  if (user) {
    try {
      await saveSettings(settings);
    } catch (err) {
      console.error("❌ Failed to save language, fallback to localStorage");
      setLocalSetting("language", lang);
    }
  } else {
    setLocalSetting("language", lang);
  }

  window.location.reload();
}

/* -------------------- Theme -------------------- */
export function getTheme() {
  return settings.theme || "light";
}

export async function setThemeSetting(theme) {
  settings.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);

  const user = await getCurrentUser();
  if (user) {
    try {
      await saveSettings(settings);
    } catch (err) {
      console.error("❌ Failed to save theme, fallback to localStorage");
      setLocalSetting("theme", theme);
    }
  } else {
    setLocalSetting("theme", theme);
  }

  window.location.reload();
}
