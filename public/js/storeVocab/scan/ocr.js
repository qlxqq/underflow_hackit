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
//
// Photo highlighting (the screen after "Take a photo"): the player draws boxes
// round the words they want, and only those parts are sent to Claude to be
// read (extractTextFromRegions).

const OCR_LANGUAGES = { zh: "chi_sim", ms: "msa", ta: "tam" };
const OCR_MAX_SIDE = 1800;        // longest side of the photo we send
const OCR_MIN_CONFIDENCE = 70;    // Tesseract words below this are dropped
const BOX_BACKUP_CONFIDENCE = 40; // lower for boxed areas: the player chose them, so a few wrong guesses do little harm

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

function cloneCanvas(canvas) {
  const copy = document.createElement("canvas");
  copy.width = canvas.width;
  copy.height = canvas.height;
  copy.getContext("2d").drawImage(canvas, 0, 0);
  return copy;
}

// Greyscale + contrast stretch, which helps Tesseract on shadowy photos.
// Works on the canvas it is given, so pass a copy if the original is still shown.
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

async function readWithTesseract(canvas, language, minConfidence = OCR_MIN_CONFIDENCE) {
  const worker = await window.Tesseract.createWorker(OCR_LANGUAGES[language]);
  try {
    const { data } = await worker.recognize(cleanForTesseract(cloneCanvas(canvas)));
    const kept = (data.words || []).filter((w) => w.confidence >= minConfidence);
    return kept.map((w) => w.text).join(language === "zh" ? "" : " ");
  } finally {
    await worker.terminate();
  }
}

// Tells the page how the last photo was read, so a wrong result can be
// traced: "Claude", or "Tesseract (backup)" plus the reason Claude failed.
window.lastOcrInfo = "";

async function extractTextFromImage(imageFile, language) {
  return extractTextFromCanvas(await photoToCanvas(imageFile), language);
}

// Reads the whole photo. Used for "Use the whole photo" on the highlight screen.
async function extractTextFromCanvas(canvas, language) {
  let text;
  try {
    text = await readWithClaude(canvas, language);
    window.lastOcrInfo = "Read by Claude.";
  } catch (err) {
    console.error("Claude photo reading failed, using Tesseract instead:", err);
    window.lastOcrInfo = "Read by backup (Tesseract) because: " + (err && err.message ? err.message : err);
    text = await readWithTesseract(canvas, language);
  }

  text = text.trim();
  return language === "zh" ? text.replace(/\s+/g, "") : text.replace(/\s+/g, " ");
}

// ---- photo highlighting ----

// Copies the chosen areas (canvas pixels, {x0,y0,x1,y1}) onto one tall
// canvas, stacked top to bottom with white gaps, so they can be read in a
// single request. Small areas are enlarged so the text is easier to read.
const REGION_PAD = 12;          // drawn boxes are often tight, so take a little extra round them
const REGION_MIN_HEIGHT = 64;
const REGION_GAP = 24;
const REGION_MAX_SIDE = 3600;
const REGION_MIN_W = 640;        // a box can be any size: it is placed on a white sheet at least this big,
const REGION_MIN_H = 400;        // because a very thin strip of text is hard for the reader to recognise

function stackRegions(canvas, rects) {
  const crops = rects.map((r) => {
    const x0 = Math.max(0, Math.floor(r.x0 - REGION_PAD));
    const y0 = Math.max(0, Math.floor(r.y0 - REGION_PAD));
    const x1 = Math.min(canvas.width, Math.ceil(r.x1 + REGION_PAD));
    const y1 = Math.min(canvas.height, Math.ceil(r.y1 + REGION_PAD));
    const w = Math.max(1, x1 - x0);
    const h = Math.max(1, y1 - y0);
    const scale = Math.min(3, Math.max(1, REGION_MIN_HEIGHT / h));
    return { x0, y0, w, h, scale, dw: Math.round(w * scale), dh: Math.round(h * scale) };
  });
  const contentW = Math.max(...crops.map((c) => c.dw));
  const contentH = crops.reduce((sum, c) => sum + c.dh + REGION_GAP, REGION_GAP);
  const width = Math.max(contentW + REGION_GAP, REGION_MIN_W);
  const height = Math.max(contentH, REGION_MIN_H);
  const shrink = Math.min(1, REGION_MAX_SIDE / Math.max(width, height));
  const out = document.createElement("canvas");
  out.width = Math.round(width * shrink);
  out.height = Math.round(height * shrink);
  const ctx = out.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, out.width, out.height);
  let y = ((height - contentH) / 2 + REGION_GAP) * shrink;   // centred on the sheet
  crops.forEach((c) => {
    ctx.drawImage(canvas, c.x0, c.y0, c.w, c.h, ((width - c.dw) / 2) * shrink, y, c.dw * shrink, c.dh * shrink);
    y += (c.dh + REGION_GAP) * shrink;
  });
  return out;
}

// Reads only the boxed areas. Areas are joined with a break the word splitter
// treats as a gap, so a word is never glued across two boxes.
async function extractTextFromRegions(canvas, rects, language) {
  const stacked = stackRegions(canvas, rects);
  const divider = language === "zh" ? "，" : " ";
  const hasText = (t) => typeof t === "string" && t.replace(/\s+/g, "") !== "";

  let text = "";
  try {
    text = await readWithClaude(stacked, language);
    window.lastOcrInfo = "Read by Claude.";
  } catch (err) {
    console.error("Claude reading of the boxed area failed, using Tesseract instead:", err);
    window.lastOcrInfo = "Read by backup (Tesseract) because: " + (err && err.message ? err.message : err);
    text = await readWithTesseract(stacked, language, BOX_BACKUP_CONFIDENCE);
  }

  // Claude answered but found no text: let the backup have a look before giving up.
  if (!hasText(text)) {
    try {
      text = await readWithTesseract(stacked, language, BOX_BACKUP_CONFIDENCE);
      window.lastOcrInfo = hasText(text)
        ? "Claude found no text in the box, so the backup (Tesseract) read it."
        : "Neither Claude nor the backup (Tesseract) found text in the box.";
    } catch (err) {
      console.error("Backup reading failed:", err);
    }
  }

  text = (text || "").trim().replace(/\s*\n+\s*/g, divider);
  return language === "zh" ? text.replace(/\s+/g, "") : text.replace(/\s+/g, " ");
}