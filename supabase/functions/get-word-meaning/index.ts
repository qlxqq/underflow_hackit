// Supabase Edge Function: get-word-meaning
// Looks up English meaning + romanization for captured words, using the
// Anthropic API key stored as a secret (never exposed to the frontend).
// Requires a real logged-in user - not just the public anon key - so this
// can't be called anonymously by anyone who finds the project URL.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a dictionary for Singaporean students learning their Mother Tongue.
For each word, give a concise English meaning that fits how the word is used in the given sentence, plus romanization.
Romanization rules: pinyin with tone marks for Mandarin; standard Latin transliteration for Tamil; null for Malay.
Respond ONLY with a JSON array, no markdown, in exactly this shape:
[{"word": "...", "englishMeaning": "...", "romanization": "..."}]`;

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
      return new Response(JSON.stringify({ error: "Not authenticated." }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { words, language, contextSentence } = await req.json();

    if (!Array.isArray(words) || words.length === 0) {
      return new Response(JSON.stringify({ meanings: {} }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: JSON.stringify({ language, sentence: contextSentence, words }) },
        ],
      }),
    });

    const data = await response.json();
    const parsed = parseJsonArray(data.content?.[0]?.text ?? "");

    const meanings: Record<string, { englishMeaning: string | null; romanization: string | null }> = {};
    if (parsed) {
      for (const item of parsed) {
        if (item?.word) {
          meanings[item.word] = {
            englishMeaning: item.englishMeaning ?? null,
            romanization: item.romanization ?? null,
          };
        }
      }
    }

    return new Response(JSON.stringify({ meanings }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("get-word-meaning failed:", err);
    return new Response(JSON.stringify({ error: "Failed to look up meanings." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});