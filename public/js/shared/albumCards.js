// Data layer for island album cards (the "album_cards" table).
// Shared, so the island and its mini-games can award cards and the
// Collection can show them. Needs the global `supabase` client.
//
// Mini-games award a card like this (the word must be in that album's list,
// see ALBUMS / getAlbumWords in storeVocab/albums.js):
//   const { isNew } = await awardAlbumCard(user.id, "hawker-centre", "zh", "鸡饭", "hawker-game");

// Same rule as vocabulary.js: usage 1 -> Trained, usage 3 -> Mastered.
const ALBUM_EVOLUTION_THRESHOLDS = [1, 3];

async function getAlbumCards(userId, language) {
  const { data, error } = await supabase
    .from("album_cards")
    .select("*")
    .eq("user_id", userId)
    .eq("language", language)
    .order("earned_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Gives the player one album card. Awarding a card they already have does
// nothing. Returns { isNew, row }.
async function awardAlbumCard(userId, albumId, language, word, source = "island") {
  const { data, error } = await supabase
    .from("album_cards")
    .upsert(
      { user_id: userId, album_id: albumId, language, word, source },
      { onConflict: "user_id,album_id,language,word", ignoreDuplicates: true },
    )
    .select();
  if (error) throw error;
  return { isNew: data.length > 0, row: data[0] || null };
}

async function incrementAlbumCardUsage(userId, cardId, currentUsageCount, currentStage) {
  const usageCount = currentUsageCount + 1;
  let stage = currentStage;
  if (stage < ALBUM_EVOLUTION_THRESHOLDS.length && usageCount >= ALBUM_EVOLUTION_THRESHOLDS[stage]) stage += 1;

  const { data, error } = await supabase
    .from("album_cards")
    .update({ usage_count: usageCount, evolution_stage: stage })
    .eq("card_id", cardId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}