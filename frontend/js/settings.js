import { getSettings as apiGetSettings, saveSettings, getCurrentUser } from "./api.js";
import { setLanguage, applyTranslations } from "./i18n.js";

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
  settings.lang = getLocalSetting("language", settings.lang);
  settings.theme = getLocalSetting("theme", settings.theme);

  try {
    const res = await apiGetSettings(settings.lang);
    if (res) {
      // ✅ merge API settings (res[key].value)
      Object.keys(res).forEach((k) => {
        settings[k] = res[k].value || settings[k];
      });
    }
  } catch (err) {
    console.warn("⚠️ Failed to load API settings, using localStorage only");
  }

  // apply theme + lang
  document.documentElement.setAttribute("data-theme", settings.theme);
  await setLanguage(settings.lang);
}

/* -------------------- Language -------------------- */
export function getLanguage() {
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

  // เปลี่ยนภาษาแบบ dynamic ไม่ reload
  await setLanguage(lang);
  applyTranslations(document);
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

  // ไม่ reload แค่ apply
  document.documentElement.setAttribute("data-theme", theme);
}
