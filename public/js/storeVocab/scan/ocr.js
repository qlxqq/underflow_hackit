// Reads text from a photographed page (textbook, note, menu).
//
// The photo is shrunk on the phone, then sent to the get-word-meaning Edge
// Function, where Claude reads it. There is no backup reader: a worse reader
// (Tesseract) made up words, so if Claude cannot read the photo the player is
// told so and can try again or type the words.
//
// Photo highlighting (the screen after "Take a photo"): the player draws boxes
// round the words they want, and only those parts are sent to Claude to be
// read (extractTextFromRegions).

const OCR_MAX_SIDE = 1800;        // longest side of the photo we send
const OCR_TRIES = 2;              // one retry if the reader is busy or the connection blips

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

// Reads with Claude, trying again once. Throws an Error with a message the player can read.
async function readWithRetry(canvas, language) {
  let lastError = null;
  for (let attempt = 1; attempt <= OCR_TRIES; attempt++) {
    try {
      const text = await readWithClaude(canvas, language);
      window.lastOcrInfo = "";
      return text;
    } catch (err) {
      lastError = err;
      console.error(`Photo reading failed (try ${attempt} of ${OCR_TRIES}):`, err);
    }
  }
  window.lastOcrInfo = "";
  const reason = lastError && lastError.message ? lastError.message : String(lastError);
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  throw new Error(offline
    ? "You seem to be offline. Connect to the internet to read a photo, or type the words instead."
    : `Could not read the photo right now (${reason}). Try again, or type the words instead.`);
}

// Kept for the page: empty unless there is something to tell the player.
window.lastOcrInfo = "";

async function extractTextFromImage(imageFile, language) {
  return extractTextFromCanvas(await photoToCanvas(imageFile), language);
}

// Reads the whole photo. Used for "Use the whole photo" on the highlight screen.
async function extractTextFromCanvas(canvas, language) {
  let text = await readWithRetry(canvas, language);
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
  let width = Math.max(...crops.map((c) => c.dw)) + REGION_GAP;
  let height = crops.reduce((sum, c) => sum + c.dh + REGION_GAP, REGION_GAP);
  const shrink = Math.min(1, REGION_MAX_SIDE / Math.max(width, height));
  const out = document.createElement("canvas");
  out.width = Math.round(width * shrink);
  out.height = Math.round(height * shrink);
  const ctx = out.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, out.width, out.height);
  let y = REGION_GAP * shrink;
  crops.forEach((c) => {
    ctx.drawImage(canvas, c.x0, c.y0, c.w, c.h, (REGION_GAP / 2) * shrink, y, c.dw * shrink, c.dh * shrink);
    y += (c.dh + REGION_GAP) * shrink;
  });
  return out;
}

// Reads only the boxed areas. Areas are joined with a break the word splitter
// treats as a gap, so a word is never glued across two boxes.
async function extractTextFromRegions(canvas, rects, language) {
  const stacked = stackRegions(canvas, rects);
  const divider = language === "zh" ? "，" : " ";

  let text = await readWithRetry(stacked, language);
  text = text.trim().replace(/\s*\n+\s*/g, divider);
  return language === "zh" ? text.replace(/\s+/g, "") : text.replace(/\s+/g, " ");
}