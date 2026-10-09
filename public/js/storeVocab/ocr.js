// Reads text from a photographed page (textbook, note, menu).
//
// Main route: the photo is shrunk on the phone, then sent to the
// get-word-meaning Edge Function, where Claude reads it. Claude is far more
// accurate than Tesseract on phone photos, and it will not invent words that
// are not on the page.
//
// Backup route: if that call fails (offline, function not deployed), the
// photo is cleaned up and read by Tesseract.js in the browser. Low-confidence
// guesses are thrown away so the "words found" list does not fill with junk.

const OCR_LANGUAGES = { zh: "chi_sim", ms: "msa", ta: "tam" };
const OCR_MAX_SIDE = 1800;        // longest side of the photo we send
const OCR_MIN_CONFIDENCE = 70;    // Tesseract words below this are dropped

// Shrinks the photo and fixes its rotation. Returns a canvas.
async function photoToCanvas(file) {
  let source;
  if (window.createImageBitmap) {
    try {
      source = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch (err) {
      source = null;
    }
  }
  if (!source) {
    source = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;
  const scale = Math.min(1, OCR_MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Greyscale + contrast stretch, which helps Tesseract on shadowy photos.
function cleanForTesseract(canvas) {
  const ctx = canvas.getContext("2d");
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  let min = 255;
  let max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = g;
    if (g < min) min = g;
    if (g > max) max = g;
  }
  const range = Math.max(1, max - min);
  for (let i = 0; i < d.length; i += 4) {
    const v = ((d[i] - min) * 255) / range;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

async function readWithClaude(canvas, language) {
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const image = dataUrl.split(",")[1];
  const { data, error } = await supabase.functions.invoke("get-word-meaning", {
    body: { mode: "ocr", image, mediaType: "image/jpeg", language },
  });
  if (error) throw error;
  if (typeof data?.text !== "string") throw new Error("No text field in reply.");
  return data.text;
}

async function readWithTesseract(canvas, language) {
  const worker = await window.Tesseract.createWorker(OCR_LANGUAGES[language]);
  try {
    const { data } = await worker.recognize(cleanForTesseract(canvas));
    const kept = (data.words || []).filter((w) => w.confidence >= OCR_MIN_CONFIDENCE);
    return kept.map((w) => w.text).join(language === "zh" ? "" : " ");
  } finally {
    await worker.terminate();
  }
}

async function extractTextFromImage(imageFile, language) {
  const canvas = await photoToCanvas(imageFile);

  let text;
  try {
    text = await readWithClaude(canvas, language);
  } catch (err) {
    console.error("Claude photo reading failed, using Tesseract instead:", err);
    text = await readWithTesseract(canvas, language);
  }

  text = text.trim();
  return language === "zh" ? text.replace(/\s+/g, "") : text.replace(/\s+/g, " ");
}