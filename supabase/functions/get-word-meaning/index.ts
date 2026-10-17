// Supabase Edge Function: get-word-meaning
// Uses the Anthropic API key stored as a secret (never exposed to the
// frontend). Requires a real logged-in user - not just the public anon key -
// so this can't be called anonymously by anyone who finds the project URL.
//
// Two jobs, chosen by the request body:
//   1. Meanings (default): { words, language, contextSentence }
//      -> { meanings: { word: { englishMeaning, romanization, theme } } }
//      "theme" is the name of one of the app's ready-made card pictures, or
//      "none" when none of them fits the word.
//   3. OCR: { mode: "ocr", image (base64), mediaType, language } -> { text }
//   2. Art: { mode: "art", word, englishMeaning, language, note }
//      -> { svg }   a small flat illustration drawn by Claude, cleaned up so
//      it can only contain simple shapes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Change these two lines to use a different model. A bigger model usually
// draws better pictures but costs more per picture.
const TEXT_MODEL = "claude-haiku-4-5-20251001";
const ART_MODEL = "claude-haiku-4-5-20251001";
// Reading text from photos needs the most accurate eyes, so this one uses a
// bigger model. It is only called once per photo.
const OCR_MODEL = "claude-sonnet-5-5";

// Must match THEMES in public/js/storeVocab/cardArt.js (everything except
// "generic", which is only the plain fallback picture).
const THEME_NAMES = [
  "food", "drink", "stall", "bus", "taxi", "train", "card", "home", "lift", "park",
  "playground", "people", "chat", "shop", "chess", "cat", "rain", "clock", "chilli",
  "family", "book", "pencil", "sun", "moon", "flower", "bird", "heart", "smile", "phone",
  "bed", "fruit", "cake", "gift", "key", "car", "bicycle", "plane", "medical", "coin",
  "shirt", "bag", "bulb", "star", "fish", "eye", "shoe",
];
const THEME_SET = new Set(THEME_NAMES);

const SYSTEM_PROMPT = `You are a dictionary for Singaporean students learning their Mother Tongue.
For each word, give a concise English meaning that fits how the word is used in the given sentence, plus romanization.
Romanization rules: pinyin with tone marks for Mandarin; standard Latin transliteration for Tamil; null for Malay.
Also choose "theme": the name from this list whose picture best shows the word's meaning: ${THEME_NAMES.join(", ")}.
If no picture on the list clearly fits the word, use "none". Prefer "none" over a poor match.
Respond ONLY with a JSON array, no markdown, in exactly this shape:
[{"word": "...", "englishMeaning": "...", "romanization": "...", "theme": "..."}]`;

const ART_SYSTEM_PROMPT = `You draw small flat icons for a vocabulary card game used by Singaporean students.
You will get a word, its English meaning and optionally an extra request from the player.
Draw ONE simple picture that shows the meaning, as SVG shapes for a 72 x 72 box (viewBox 0 0 72 72).

Rules:
- Output ONLY the SVG shapes. No <svg> wrapper, no markdown, no explanation.
- Allowed elements: g, path, circle, ellipse, rect, line, polygon, polyline.
- Allowed attributes: fill, stroke, stroke-width, stroke-linecap, stroke-linejoin, opacity, d, cx, cy, r, rx, ry, x, y, width, height, x1, y1, x2, y2, points, transform.
- Never use text, gradients, filters, images, scripts, style or class attributes. Use flat colours written as hex like #f2a93b.
- Centre the picture and fill most of the box, leaving about 4 units of margin. Use at most 30 shapes.
- Style: friendly, rounded, flat colour with one lighter highlight shape. Start with a soft shadow: <ellipse cx="36" cy="64" rx="26" ry="3.5" fill="#1c2541" opacity="0.1"/>
- Palette: ink #18233a, amber #f2a93b, gold #ffc94d, teal #17a596, dark teal #0f7a6f, blue #2f6fd6, light blue #4a6cf0, red #e0463a, dark red #c23a30, green #4a9565, light green #5fae7a, brown #8a5a3c, skin #e8b890, grey-blue #a9bad0, slate #7f94b0, white #ffffff.
- Use a Singaporean version of things where it makes sense (an HDB block, a kopi cup, a hawker stall).
- If the player's extra request asks for something else, follow it, but keep the same style and rules.

Example of the style (a heart):
<ellipse cx="36" cy="64" rx="22" ry="3" fill="#1c2541" opacity="0.1"/><path d="M36 62 C6 42 8 12 26 12 C32 12 36 18 36 18 C36 18 40 12 46 12 C64 12 66 42 36 62z" fill="#e8445a"/><path d="M16 24 q2-8 10-8" fill="none" stroke="#ff9aa8" stroke-width="3.6" stroke-linecap="round"/>

Example of the style (a coffee cup):
<ellipse cx="34" cy="58" rx="25" ry="5.5" fill="#d8cdb8"/><path d="M13 28h40v12a20 16 0 0 1-40 0z" fill="#ffffff" stroke="#e1d5bd" stroke-width="2"/><ellipse cx="33" cy="28" rx="20" ry="5.5" fill="#6b3f1d"/><path d="M53 33a8.5 8.5 0 0 1 0 17" fill="none" stroke="#e1d5bd" stroke-width="5" stroke-linecap="round"/><path d="M24 20q-4-6 0-12M34 20q-4-6 0-12M44 20q-4-6 0-12" fill="none" stroke="#c4cedb" stroke-width="3" stroke-linecap="round"/>`;

const OCR_LANGUAGE_NAMES: Record<string, string> = {
  zh: "Simplified Chinese (Mandarin)",
  ms: "Malay",
  ta: "Tamil",
};

function ocrSystemPrompt(language: string) {
  const name = OCR_LANGUAGE_NAMES[language] ?? "the requested language";
  return `You read text from photos of school textbooks and notes. This is a transcription job, not a writing job.
Copy out ONLY the ${name} text that is clearly visible in the photo, exactly as printed.
Rules:
- Never guess, complete or invent text. If a character or word is blurry or cut off, skip it.
- Ignore pinyin or other romanization, English text, page numbers, exercise numbers, pictures and decorations.
- Keep the original reading order. Put each line or sentence on its own line.
- Do not translate, explain or add comments.
- If there is no clear ${name} text, reply with nothing at all (an empty reply).
Reply with the transcribed text only.`;
}

async function readTextFromPhoto(image: string, mediaType: string, language: string) {
  const text = await callClaude(
    OCR_MODEL,
    ocrSystemPrompt(language),
    [
      { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
      { type: "text", text: "Transcribe the text in this photo." },
    ],
    1500,
    // A failed call is reported to the app, not turned into "no text found".
    { throwOnError: true },
  );
  return text.trim();
}

// <sanitizer>
// Whatever Claude draws is rebuilt from scratch: only the shapes and
// attributes below survive, and every value must look like a plain number,
// colour or path. Anything else (scripts, links, styles, text) is dropped.
// The app runs the same rules again before showing a picture.
const ART_TAGS = ["g", "path", "circle", "ellipse", "rect", "line", "polygon", "polyline"];
const NUMBER = /^-?[\d.]+(e-?\d+)?%?$/i;
const COLOR = /^(none|#[0-9a-f]{3,8}|[a-z]{3,20}|rgba?\([\d\s.,%]+\))$/i;
const ART_ATTRS: Record<string, RegExp> = {
  fill: COLOR, stroke: COLOR,
  "stroke-width": NUMBER, opacity: NUMBER,
  "stroke-linecap": /^(butt|round|square)$/, "stroke-linejoin": /^(miter|round|bevel)$/,
  d: /^[MmLlHhVvCcSsQqTtAaZz\d\s.,+eE-]+$/, points: /^[\d\s.,+eE-]+$/,
  cx: NUMBER, cy: NUMBER, r: NUMBER, rx: NUMBER, ry: NUMBER,
  x: NUMBER, y: NUMBER, width: NUMBER, height: NUMBER,
  x1: NUMBER, y1: NUMBER, x2: NUMBER, y2: NUMBER,
  transform: /^[a-zA-Z\d\s.,()+eE-]+$/,
};

function sanitizeArt(raw: unknown): string {
  if (typeof raw !== "string" || raw.length > 20000) return "";
  const markup = raw.replace(/```[a-z]*/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  const tags = markup.match(/<\/?[a-zA-Z][^>]*>/g) || [];
  let out = "";
  let depth = 0;
  let shapes = 0;
  for (const tag of tags) {
    const name = (tag.match(/^<\/?([a-zA-Z][\w-]*)/) || [])[1]?.toLowerCase();
    if (!name || !ART_TAGS.includes(name)) continue;
    if (tag.startsWith("</")) {
      if (name === "g" && depth > 0) { out += "</g>"; depth--; }
      continue;
    }
    if (++shapes > 80) return "";
    let attrs = "";
    for (const m of tag.matchAll(/([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      const key = m[1].toLowerCase();
      const value = (m[2] ?? m[3] ?? "").trim();
      if (ART_ATTRS[key] && ART_ATTRS[key].test(value) && !/url|javascript/i.test(value)) attrs += ` ${key}="${value}"`;
    }
    if (name === "g") { out += `<g${attrs}>`; depth++; } else out += `<${name}${attrs}/>`;
  }
  out += "</g>".repeat(depth);
  return out.length > 12 && out.length <= 9000 ? out : "";
}
// </sanitizer>

function parseJsonArray(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end === -1) return null;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function callClaude(model: string, system: string, userContent: string | unknown[], maxTokens: number, options: { temperature?: number; throwOnError?: boolean } = {}) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      system,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  const data = await response.json();
  // Shows up in the function's logs in the Supabase dashboard.
  if (!response.ok) {
    console.error("Anthropic API error:", response.status, JSON.stringify(data));
    if (options.throwOnError) throw new Error(`Reader error ${response.status}: ${data?.error?.message ?? "unknown"}`);
  }
  return data.content?.[0]?.text ?? "";
}

async function lookupMeanings(words: string[], language: string, contextSentence: string) {
  const text = await callClaude(
    TEXT_MODEL,
    SYSTEM_PROMPT,
    JSON.stringify({ language, sentence: contextSentence, words }),
    2500,
  );
  const parsed = parseJsonArray(text);

  const meanings: Record<string, { englishMeaning: string | null; romanization: string | null; theme: string | null }> = {};
  if (parsed) {
    for (const item of parsed) {
      if (item?.word) {
        const theme = typeof item.theme === "string" ? item.theme.toLowerCase().trim() : "";
        meanings[item.word] = {
          englishMeaning: item.englishMeaning ?? null,
          romanization: item.romanization ?? null,
          // Only a real picture name, or "none" (meaning: draw a new one).
          theme: THEME_SET.has(theme) || theme === "none" ? theme : null,
        };
      }
    }
  }
  return meanings;
}

async function drawArt(word: string, englishMeaning: string, language: string, note: string) {
  const text = await callClaude(
    ART_MODEL,
    ART_SYSTEM_PROMPT,
    JSON.stringify({ word, englishMeaning, language, extraRequest: note }),
    3000,
  );
  const svg = sanitizeArt(text);
  if (!svg) console.error(`No usable picture for "${word}". Claude replied:`, text.slice(0, 600));
  return svg;
}

Deno.serve(async (req) => {
  // Browsers send an OPTIONS preflight request before the real one - this
  // has to be answered or the actual call never gets sent.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // Verify this is a real logged-in user, not just the anon key alone.
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData.user) {
      return json({ error: "Not authenticated." }, 401);
    }

    const body = await req.json();

    // ---- job 3: read the text in a photo ----
    if (body.mode === "ocr") {
      const image = String(body.image ?? "");
      const mediaType = String(body.mediaType ?? "image/jpeg");
      const language = String(body.language ?? "").slice(0, 5);
      if (!image || image.length > 6_000_000) return json({ error: "Photo missing or too large." }, 400);
      if (!["image/jpeg", "image/png", "image/webp"].includes(mediaType)) {
        return json({ error: "Unsupported photo type." }, 400);
      }
      try {
        return json({ text: await readTextFromPhoto(image, mediaType, language) });
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : "Could not read the photo." }, 502);
      }
    }

    // ---- job 2: draw a picture for one word ----
    if (body.mode === "art") {
      const word = String(body.word ?? "").slice(0, 40);
      const englishMeaning = String(body.englishMeaning ?? "").slice(0, 120);
      const language = String(body.language ?? "").slice(0, 5);
      const note = String(body.note ?? "").slice(0, 200);
      if (!word) return json({ error: "No word given." }, 400);

      const svg = await drawArt(word, englishMeaning, language, note);
      if (!svg) return json({ error: "Could not draw that one. Try again." }, 502);
      return json({ svg });
    }

    // ---- job 1: meanings, romanization and a picture theme ----
    const { words, language, contextSentence } = body;
    if (!Array.isArray(words) || words.length === 0) {
      return json({ meanings: {} });
    }
    return json({ meanings: await lookupMeanings(words, language, contextSentence) });
  } catch (err) {
    console.error("get-word-meaning failed:", err);
    return json({ error: "Failed to look up meanings." }, 500);
  }
});