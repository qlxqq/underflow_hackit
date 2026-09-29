// Extracts text from a photographed image (menu, note, screenshot).
// Tesseract.js runs entirely in the browser - no server needed.
const OCR_LANGUAGES = { zh: "chi_sim", ms: "msa", ta: "tam" };

async function extractTextFromImage(imageFileOrUrl, language) {
  const { data } = await window.Tesseract.recognize(imageFileOrUrl, OCR_LANGUAGES[language]);
  const text = data.text.trim();
  return language === "zh" ? text.replace(/\s+/g, "") : text.replace(/\s+/g, " ");
}