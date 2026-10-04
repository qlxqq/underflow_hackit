// Reads/writes journey_progress, plus pure helper logic for deciding when
// a level is complete and which levels are locked.
//
// Each level is now ONE mini-game, so a level counts as complete when
// slot_1_completed is true. slot_2_completed / slot_3_completed remain in
// the table from the earlier three-slot design and are unused.

async function getProgress(userId, language, levelNumber) {
  const { data, error } = await supabase
    .from("journey_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("language", language)
    .eq("level_number", levelNumber)
    .maybeSingle();

  if (error) throw error;
  return data; // null if this level has never been started
}

async function ensureProgressRow(userId, language, levelNumber) {
  const existing = await getProgress(userId, language, levelNumber);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("journey_progress")
    .insert({ user_id: userId, language, level_number: levelNumber })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function completeLevel(userId, language, levelNumber) {
  const { data, error } = await supabase
    .from("journey_progress")
    .update({ slot_1_completed: true, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("language", language)
    .eq("level_number", levelNumber)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Pure logic below - no Supabase calls, safe to unit test directly.

function isLevelComplete(progressRow) {
  return !!progressRow && !!progressRow.slot_1_completed;
}

function nextLevelNumber(currentLevel, totalLevels, progressRow) {
  if (!isLevelComplete(progressRow)) return currentLevel;
  return Math.min(currentLevel + 1, totalLevels);
}

// A level is locked if it is beyond the first incomplete level. Everything
// up to and including the current level stays open for replay.
function isLevelLocked(levelNumber, currentLevel) {
  return levelNumber > currentLevel;
}

function getVisibleLevelNumbers(totalLevels) {
  const levels = [];
  for (let i = 1; i <= totalLevels; i++) levels.push(i);
  return levels;
}