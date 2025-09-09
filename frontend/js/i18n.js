export async function loadTranslations(lang = "en") {
  try {
    const res = await fetch(`/lang/${lang}.json`);
    if (!res.ok) throw new Error("Failed to load translations");
    return res.json();
  } catch (err) {
    console.error(`❌ Failed to load translations for ${lang}:`, err);
    return {}; // fallback
  }
}