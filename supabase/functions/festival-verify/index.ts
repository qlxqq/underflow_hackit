// Supabase Edge Function: festival-verify
// The treasure hunt has two steps, and both are checked here so the app cannot skip either one:
//
//   1. PHOTO  { image, mediaType, eventId }
//      Claude looks at the photo and says which of the event's words are really there as a physical
//      decoration or object (drawings, printed pictures and screens do not count). Words that pass are
//      saved as "spotted". Nothing is paid yet.
//      -> { spotted: [word], already: [word], rejected: [{ word, why: "picture" | "screen" }] }
//
//   2. ANSWER { mode: "answer", eventId, word, answer }
//      The player must give the Chinese word (characters, or pinyin with or without tones) for a spotted
//      word. When it is right the word is claimed and paid through festival_claim.
//      -> { correct: true, claim: { found, points, bonus, total_found, total_words } } or { correct: false }
//
// festival_claim can only be called with the service role, so a word can only be found through this function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
// A bigger model is better at telling a real object from a picture of one. Swap in a Haiku model to save cost.
const VERIFY_MODEL = "claude-sonnet-4-5-20250929";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

function parseObject(text: string) {
  try { return JSON.parse(text); } catch { /* fall through */ }
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a === -1 || b === -1) return null;
  try { return JSON.parse(text.slice(a, b + 1)); } catch { return null; }
}

// Characters: ignore spaces and punctuation. Pinyin: ignore tone marks, tone numbers, spaces and v/ü.
const keepChars = (s: string) => s.normalize("NFKC").replace(/[\s·.,。，、!！?？'’"“”-]/g, "");
const plainPinyin = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-zv]/g, "").replace(/v/g, "u");
function answerMatches(answer: string, word: string, pinyin: string) {
  if (!answer.trim()) return false;
  if (keepChars(answer) === keepChars(word)) return true;
  const p = plainPinyin(answer);
  return p.length > 0 && p === plainPinyin(pinyin);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } });
    const { data: u, error: ue } = await asUser.auth.getUser();
    if (ue || !u.user) return json({ error: "Not authenticated." }, 401);
    const userId = u.user.id;

    const body = await req.json();
    const { eventId } = body;
    if (typeof eventId !== "string") return json({ error: "Bad event." }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: words, error: we } = await admin.from("festival_words")
      .select("word, meaning, pinyin").eq("event_id", eventId).order("sort");
    if (we || !words || !words.length) return json({ error: "Unknown event." }, 400);

    // ---------- step 2: the player names the word ----------
    if (body.mode === "answer") {
      const target = words.find((w) => w.word === body.word);
      if (!target || typeof body.answer !== "string" || body.answer.length > 40) return json({ error: "Bad word." }, 400);
      const { data: seen } = await admin.from("festival_spotted").select("word")
        .eq("user_id", userId).eq("event_id", eventId).eq("word", target.word).maybeSingle();
      if (!seen) return json({ error: "Take a photo of it first." }, 400);
      if (!answerMatches(body.answer, target.word, target.pinyin)) return json({ correct: false });
      const { data, error } = await admin.rpc("festival_claim", { p_user: userId, p_event: eventId, p_words: [target.word] });
      if (error) return json({ error: error.message }, 400);
      return json({ correct: true, claim: data });
    }

    // ---------- step 1: the photo ----------
    const { image, mediaType } = body;
    if (typeof image !== "string" || image.length < 100 || image.length > 7_000_000) return json({ error: "Bad image." }, 400);

    const list = words.map((w) => `- ${w.word} = ${w.meaning}`).join("\n");
    const system = `You check photos for a festival treasure hunt in a language-learning app.
The player must photograph REAL things in the real world. You get one photo and a list of target words with their English meanings.

For each target that you can see in the photo, give a status:
- "real": a real, physical object or decoration, photographed in person. Examples: an actual pumpkin, a plastic or fabric bat hanging up, an inflatable ghost, a costume, a real candle, packaged sweets, a skeleton prop, a paper cut-out or hanging ornament stuck up as a decoration, a sign or banner whose text is the target.
- "picture": only a drawing, painting, sketch, sticker sheet, poster, flat printed picture, book page or cartoon of it. Hand-drawn or printed images are NOT real.
- "screen": it appears on a phone, tablet, TV or computer screen, or the photo is clearly a photo of another photo.
Do not list targets that are not in the photo. A mere shape that vaguely resembles the target is not enough: only list a target when you are confident. When unsure between real and picture, choose "picture".
Reply with ONLY JSON, no markdown: {"results":[{"word":"...","status":"real|picture|screen"}]}
Use the target word exactly as written in the list. If none of the targets are in the photo, reply {"results":[]}.

Targets:
${list}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: VERIFY_MODEL, max_tokens: 400, system,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: image } },
          { type: "text", text: "Which targets are in this photo, and are they real?" },
        ] }],
      }),
    });
    if (!res.ok) return json({ error: "Could not check the photo." }, 502);
    const reply = await res.json();
    const text = (reply.content || []).map((c: { text?: string }) => c.text || "").join("");
    const parsed = parseObject(text);
    if (!parsed || !Array.isArray(parsed.results)) return json({ error: "Could not check the photo." }, 502);

    const valid = new Set(words.map((w) => w.word));
    const real: string[] = [], rejected: { word: string; why: string }[] = [];
    for (const r of parsed.results) {
      if (!r || !valid.has(r.word)) continue;
      if (r.status === "real") real.push(r.word);
      else if (r.status === "picture" || r.status === "screen") rejected.push({ word: r.word, why: r.status });
    }

    // Already-found words are not spotted again; the rest become "spotted" and wait for the player to name them.
    let spotted: string[] = [], already: string[] = [];
    if (real.length) {
      const { data: done } = await admin.from("festival_finds").select("word")
        .eq("user_id", userId).eq("event_id", eventId).in("word", real);
      const doneSet = new Set((done || []).map((d: { word: string }) => d.word));
      already = real.filter((w) => doneSet.has(w));
      spotted = real.filter((w) => !doneSet.has(w));
      if (spotted.length) {
        await admin.from("festival_spotted").upsert(
          spotted.map((w) => ({ user_id: userId, event_id: eventId, word: w })),
          { onConflict: "user_id,event_id,word", ignoreDuplicates: true });
      }
    }
    return json({ spotted, already, rejected });
  } catch (err) {
    console.error(err);
    return json({ error: "Something went wrong." }, 500);
  }
});