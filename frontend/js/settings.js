import { getSettings as apiGetSettings, saveSettings, getCurrentUser } from "./api.js";

let settings = {
  lang: "en",
  theme: "light",
};

/* -------------------- Local Fallback -------------------- */
function setLocalSetting(key, value) {
  localStorage.setItem(`app_${key}`, value);
}

function getLocalSetting(key, defaultValue) {
  return localStorage.getItem(`app_${key}`) || defaultValue;
}

/* -------------------- Init Settings -------------------- */
export async function initSettings() {
  try {
    const res = await apiGetSettings();
    if (res) {
      settings = { ...settings, ...res };
    } else {
      // fallback localStorage
      settings.lang = getLocalSetting("language", settings.lang);
      settings.theme = getLocalSetting("theme", settings.theme);
    }
  } catch (err) {
    console.warn("⚠️ Failed to init settings, fallback to localStorage");
    settings.lang = getLocalSetting("language", settings.lang);
    settings.theme = getLocalSetting("theme", settings.theme);
  }

  // apply theme to <html>
  document.documentElement.setAttribute("data-theme", settings.theme);
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
      return;
    } catch (err) {
      console.error("❌ Failed to save language setting, fallback to localStorage");
    }
  }

  // fallback guest
  setLocalSetting("language", lang);
}

/* -------------------- Theme -------------------- */
export function getTheme() {
  return settings.theme || "light";
}

export async function setThemeSetting(theme) {
  settings.theme = theme;
  document.documentElement.setAttribute("data-theme", theme); // apply ทันที

  const user = await getCurrentUser();
  if (user) {
    try {
      await saveSettings(settings);
      return;
    } catch (err) {
      console.error("❌ Failed to save theme setting, fallback to localStorage");
    }
  }

  // fallback guest
  setLocalSetting("theme", theme);
}
