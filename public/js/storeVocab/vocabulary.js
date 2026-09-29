// Data layer: all reads/writes to the Supabase "vocabulary" table.
// This replaces what used to be model/storeVocab/vocabModel.js.

async function getAllVocabulary(language) {
  let query = supabase.from("vocabulary").select("*").order("created_at", { ascending: false });
  if (language) query = query.eq("language", language);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function findExistingWords(language, words) {
  if (words.length === 0) return [];

  const { data, error } = await supabase
    .from("vocabulary")
    .select("word")
    .eq("language", language)
    .in("word", words);

  if (error) throw error;
  return data.map((row) => row.word);
}

async function saveEntry(entry) {
  const { data, error } = await supabase
    .from("vocabulary")
    .insert({
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

async function deleteById(id) {
  const { error } = await supabase.from("vocabulary").delete().eq("vocab_id", id);
  if (error) throw error;
}

// Called whenever a word gets used successfully (e.g. in the future quiz
// feature). Bumps the usage count and evolves the card at set thresholds.
const EVOLUTION_THRESHOLDS = [1, 3]; // usage count needed for stage 1, stage 2

async function incrementUsage(vocabId, currentUsageCount, currentStage) {
  const newUsageCount = currentUsageCount + 1;
  let newStage = currentStage;

  if (newStage < EVOLUTION_THRESHOLDS.length && newUsageCount >= EVOLUTION_THRESHOLDS[newStage]) {
    newStage += 1;
  }

  const { data, error } = await supabase
    .from("vocabulary")
    .update({ usage_count: newUsageCount, evolution_stage: newStage })
    .eq("vocab_id", vocabId)
    .select()
    .single();

  if (error) throw error;
  return data;
}