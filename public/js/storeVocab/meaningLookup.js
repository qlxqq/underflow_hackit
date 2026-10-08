// Calls the get-word-meaning Edge Function to auto-fill English meanings,
// romanization and a card picture during capture. Falls back to empty values
// (so the user can still type them in manually) if the call fails for any
// reason - a slow/broken AI call should never block capturing and saving words.

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

// Asks Claude to draw a picture for one word. `note` is optional extra
// instructions from the player ("make it a kopi cup"). Returns the picture
// as SVG shapes, or null if it could not be drawn - the card then keeps
// whatever picture it already had.
async function requestWordArt({ word, englishMeaning, language, note }) {
  try {
    const { data, error } = await supabase.functions.invoke("get-word-meaning", {
      body: { mode: "art", word, englishMeaning, language, note: note || "" },
    });
    if (error) throw error;
    return data.svg || null;
  } catch (err) {
    console.error(`Could not draw a picture for "${word}":`, err);
    return null;
  }
}