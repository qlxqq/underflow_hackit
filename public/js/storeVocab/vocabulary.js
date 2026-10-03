// Data layer: all reads/writes to the Supabase "vocabulary" table.
// Every function now takes userId explicitly and filters by it, rather
// than relying on Row Level Security alone - RLS is still the real
// enforcement, but filtering here too makes the intent clear in the code
// and avoids ever accidentally fetching another user's rows client-side.

async function getAllVocabulary(userId, language) {
  let query = supabase
    .from("vocabulary")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (language) query = query.eq("language", language);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function findExistingWords(userId, language, words) {
  if (words.length === 0) return [];

  const { data, error } = await supabase
    .from("vocabulary")
    .select("word")
    .eq("user_id", userId)
    .eq("language", language)
    .in("word", words);

  if (error) throw error;
  return data.map((row) => row.word);
}

async function saveEntry(userId, entry) {
  const { data, error } = await supabase
    .from("vocabulary")
    .insert({
      user_id: userId,
      word: entry.word,
      language: entry.language,
      romanization: entry.romanization || null,
      english_meaning: entry.englishMeaning || null,
      context_sentence: entry.contextSentence || null,
      source: entry.source || "text",
      rarity: entry.rarity || "common",
      evolution_stage: 0,
      usage_count: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteById(userId, id) {
  const { error } = await supabase
    .from("vocabulary")
    .delete()
    .eq("vocab_id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

// Still waiting on the composition-quiz feature to call this - unchanged
// from before, aside from now requiring userId to scope the update.
const EVOLUTION_THRESHOLDS = [1, 3];

async function incrementUsage(userId, vocabId, currentUsageCount, currentStage) {
  const newUsageCount = currentUsageCount + 1;
  let newStage = currentStage;

  if (newStage < EVOLUTION_THRESHOLDS.length && newUsageCount >= EVOLUTION_THRESHOLDS[newStage]) {
    newStage += 1;
  }

  const { data, error } = await supabase
    .from("vocabulary")
    .update({ usage_count: newUsageCount, evolution_stage: newStage })
    .eq("vocab_id", vocabId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}