// The player's profile: username, picture and daily streak, stored on the
// profiles table (see database/journeyProfileColumns.sql for the columns).

async function loadProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("username, avatar, current_streak, longest_streak, last_active_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    // The new columns may not exist yet (the SQL hasn't been run). Fall back
    // to the basics so the page still works, just without streak/picture.
    const basic = await supabase.from("profiles").select("username").eq("user_id", userId).maybeSingle();
    if (basic.error) throw basic.error;
    if (!basic.data) return null;
    return { username: basic.data.username, avatar: DEFAULT_AVATAR, currentStreak: 0, longestStreak: 0, lastActiveDate: null, hasExtras: false };
  }
  if (!data) return null;

  return {
    username: data.username,
    avatar: isValidAvatar(data.avatar) ? data.avatar : DEFAULT_AVATAR,
    currentStreak: data.current_streak ?? 0,
    longestStreak: data.longest_streak ?? 0,
    lastActiveDate: data.last_active_date ?? null,
    hasExtras: true,
  };
}

// Counts today as a visit and saves the new streak if it changed.
async function recordDailyVisit(userId, profile) {
  if (!profile || !profile.hasExtras) return profile;

  const result = calculateStreak({
    lastActiveDate: profile.lastActiveDate,
    today: localDateString(),
    currentStreak: profile.currentStreak,
    longestStreak: profile.longestStreak,
  });

  if (result.changed) {
    const { error } = await supabase
      .from("profiles")
      .update({
        current_streak: result.currentStreak,
        longest_streak: result.longestStreak,
        last_active_date: result.lastActiveDate,
      })
      .eq("user_id", userId);
    if (error) throw error;
  }
  return { ...profile, currentStreak: result.currentStreak, longestStreak: result.longestStreak, lastActiveDate: result.lastActiveDate };
}

async function saveAvatar(userId, avatarId) {
  if (!isValidAvatar(avatarId)) throw new Error("Unknown picture.");
  const { error } = await supabase.from("profiles").update({ avatar: avatarId }).eq("user_id", userId);
  if (error) throw error;
}

// The Mother Tongue a player last chose is remembered on this device, per
// player, so they go straight to their map next time.
function savedLanguageKey(userId) {
  return `journeyLanguage:${userId}`;
}

function readSavedLanguage(storage, userId, validCodes) {
  try {
    const code = storage.getItem(savedLanguageKey(userId));
    return validCodes.includes(code) ? code : null;
  } catch (err) {
    return null; // storage can be blocked (e.g. some private browsing modes)
  }
}

function writeSavedLanguage(storage, userId, code) {
  try {
    storage.setItem(savedLanguageKey(userId), code);
  } catch (err) {
    // not remembered this time; carry on
  }
}