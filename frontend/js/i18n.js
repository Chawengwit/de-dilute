let translations = {};
let currentLang = "en";

/**
 * โหลดไฟล์แปลตามภาษา
 */
export async function loadTranslations(lang = "en") {
  try {
    const res = await fetch(`/lang/${lang}.json`);
    if (!res.ok) throw new Error("Failed to load translations");
    translations = await res.json();
    currentLang = lang;
  } catch (err) {
    console.error(`❌ Failed to load translations for ${lang}:`, err);
    translations = {};
    currentLang = "en";
  }
}

/**
 * ตั้งค่าภาษา (โหลด + apply)
 */
export async function setLanguage(lang = "en") {
  await loadTranslations(lang);
  applyTranslations();
}

/**
 * ใช้ translations กับ elements ทั้งหน้า
 */
export function applyTranslations(root = document) {
  const elements = root.querySelectorAll("[data-i18n]");
  elements.forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (translations[key]) {
      el.textContent = translations[key];
    }
  });
}

/**
 * ดึงข้อความจาก translations ตาม key
 */
export function t(key) {
  return translations[key] || key;
}

/**
 * ดึงภาษาใช้งานปัจจุบัน
 */
export function getCurrentLanguage() {
  return currentLang;
}
