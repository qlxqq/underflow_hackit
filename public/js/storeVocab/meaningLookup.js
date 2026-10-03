// Calls the get-word-meaning Edge Function to auto-fill English meanings
// and romanization during capture. Falls back to empty values (so the
// user can still type them in manually) if the call fails for any reason -
// a slow/broken AI call should never block capturing and saving words.

async function lookupMeanings(words, language, contextSentence) {
  if (words.length === 0) return {};

  try {
    const { data, error } = await supabase.functions.invoke("get-word-meaning", {
      body: { words, language, contextSentence },
    });

    if (error) throw error;
    return data.meanings || {};
  } catch (err) {
    console.error("Meaning lookup failed, leaving fields blank for manual entry:", err);
    return {};
  }
}