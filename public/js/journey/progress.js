// Reads/writes journey_progress, plus pure helper logic for deciding
// when a level is complete and what the next level should be.

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

async function completeSlot(userId, language, levelNumber, slotNumber) {
  const columnName = `slot_${slotNumber}_completed`;
  const { data, error } = await supabase
    .from("journey_progress")
    .update({ [columnName]: true, updated_at: new Date().toISOString() })
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
  if (!progressRow) return false;
  return (
    progressRow.slot_1_completed && progressRow.slot_2_completed && progressRow.slot_3_completed
  );
}

function nextLevelNumber(currentLevel, totalLevels, progressRow) {
  if (!isLevelComplete(progressRow)) return currentLevel; // stay put until all 3 slots are done
  return Math.min(currentLevel + 1, totalLevels); // don't go past the last level
}

// A level is locked if it's beyond the first incomplete level - you can't
// skip ahead, but everything up to and including your current level stays
// open for replay once reached, even after it's marked complete.
function isLevelLocked(levelNumber, currentLevel) {
  return levelNumber > currentLevel;
}

function getVisibleLevelNumbers(totalLevels) {
  const levels = [];
  for (let i = 1; i <= totalLevels; i++) levels.push(i);
  return levels;
}