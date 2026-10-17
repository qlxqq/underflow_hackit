// XP, coins, levels, daily quests, badges and the activity streak.
// Shared, so the Capture page now and the island and its mini-games later
// all reward the player the same way. Needs the global `supabase` client and
// streak.js (calculateStreak, localDateString).
//
// What the player earns:
//   XP     -> account level (and, later, the leaderboard, banners, borders)
//   Coins  -> to spend on customising things (shop to come)
// Every level gained also pays a few bonus coins.
//
// All of this is stored on the player's own rows and is client-side, so it
// can be faked by a determined player. Fine for now; before XP feeds a real
// leaderboard, move the awarding into server-side functions.

// ---------- numbers to tune ----------
const RARITY_XP = { common: 5, uncommon: 8, rare: 15, epic: 30, legendary: 60 }; // XP per captured word
const ALBUM_COMPLETE_REWARD = { xp: 150, coins: 100 };
const LEVEL_UP_COINS = 20;

// ---------- levels ----------
// Total XP needed to reach level L is 50 * (L - 1)^2: 50, 200, 450, 800, ...
function levelFromXp(xp) {
  const safe = Math.max(0, Number(xp) || 0);
  const level = Math.floor(Math.sqrt(safe / 50)) + 1;
  const floor = 50 * (level - 1) * (level - 1);
  const next = 50 * level * level;
  return { level, into: safe - floor, span: next - floor, next };
}

// ---------- player stats ----------
// XP is the player's, shared by all languages. Coins are kept per language (island_progress.coins),
// so every page shows and pays the coins of the language the player is on now.
function rewardLanguage(userId) {
  try {
    const code = localStorage.getItem(`journeyLanguage:${userId}`);
    if (code === "ms" || code === "ta" || code === "zh") return code;
  } catch (err) { /* storage blocked */ }
  return "zh";
}

async function getPlayerStats(userId) {
  const [profile, wallet] = await Promise.all([
    supabase.from("profiles").select("xp").eq("user_id", userId).maybeSingle(),
    supabase.from("island_progress").select("coins").eq("user_id", userId).eq("language", rewardLanguage(userId)).maybeSingle(),
  ]);
  if (profile.error || !profile.data) return { xp: 0, coins: 0, available: false };
  return { xp: profile.data.xp ?? 0, coins: wallet.data ? wallet.data.coins ?? 0 : 0, available: true };
}

// Adds XP and coins, and pays the level-up bonus. Returns the new totals and
// what was gained, so the screen can say "+35 XP" and "Level up!".
async function grantRewards(userId, { xp = 0, coins = 0 }) {
  const before = await getPlayerStats(userId);
  const levelBefore = levelFromXp(before.xp).level;
  const levelAfter = levelFromXp(before.xp + xp).level;
  const levelUps = Math.max(0, levelAfter - levelBefore);
  const bonusCoins = levelUps * LEVEL_UP_COINS;

  const language = rewardLanguage(userId);
  let { data, error } = await supabase.rpc("add_rewards", { p_xp: xp, p_coins: coins + bonusCoins, p_language: language });
  if (error && /p_language|add_rewards/i.test(error.message || "")) {
    // the database has not been updated yet (database/schema.sql): pay the old way
    ({ data, error } = await supabase.rpc("add_rewards", { p_xp: xp, p_coins: coins + bonusCoins }));
  }
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    xp: row.new_xp,
    coins: row.new_coins,
    level: levelFromXp(row.new_xp).level,
    gainedXp: xp,
    gainedCoins: coins + bonusCoins,
    levelUps,
  };
}

// ---------- streak ----------
// The streak grows when the player captures a word or wins a mini-game
// (not just by opening the app). Call this when either happens.
async function recordStreakActivity(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("current_streak, longest_streak, last_active_date")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;

  const result = calculateStreak({
    lastActiveDate: data.last_active_date,
    today: localDateString(),
    currentStreak: data.current_streak ?? 0,
    longestStreak: data.longest_streak ?? 0,
  });
  if (result.changed) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        current_streak: result.currentStreak,
        longest_streak: result.longestStreak,
        last_active_date: result.lastActiveDate,
      })
      .eq("user_id", userId);
    if (updateError) throw updateError;
  }
  return result;
}

// ---------- daily quests ----------
// Quests reset every day. Each one counts one kind of event; call
// recordQuestEvent(userId, event, amount) when it happens.
//   capture_word   a word was added to the collection
//   photo_scan     a photo was scanned
//   practise_card  a card was practised
//   minigame_win   a mini-game was won (the island is not built yet)
const QUEST_DEFS = [
  { id: "capture3", title: "Capture 3 words", event: "capture_word", target: 3, xp: 30, coins: 10 },
  { id: "scan1", title: "Scan a photo", event: "photo_scan", target: 1, xp: 15, coins: 5 },
  { id: "practise2", title: "Practise 2 cards", event: "practise_card", target: 2, xp: 20, coins: 5 },
  { id: "minigame1", title: "Win a mini-game", event: "minigame_win", target: 1, xp: 40, coins: 15, soon: true },
];

async function getTodayQuests(userId) {
  const today = localDateString();
  const { data, error } = await supabase
    .from("daily_quests")
    .select("quest_id, progress, claimed")
    .eq("user_id", userId)
    .eq("quest_date", today);
  if (error) throw error;
  const saved = new Map((data || []).map((row) => [row.quest_id, row]));
  return QUEST_DEFS.map((def) => {
    const row = saved.get(def.id);
    const progress = Math.min(def.target, row ? row.progress : 0);
    return { ...def, progress, claimed: !!(row && row.claimed), done: progress >= def.target };
  });
}

async function recordQuestEvent(userId, event, amount = 1) {
  const quests = await getTodayQuests(userId);
  const today = localDateString();
  const rows = quests
    .filter((q) => q.event === event && !q.claimed && !q.done)
    .map((q) => ({
      user_id: userId,
      quest_date: today,
      quest_id: q.id,
      progress: Math.min(q.target, q.progress + amount),
    }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("daily_quests").upsert(rows, { onConflict: "user_id,quest_date,quest_id" });
  if (error) throw error;
}

// Marks a finished quest as claimed (once) and pays its reward.
async function claimQuest(userId, questId) {
  const def = QUEST_DEFS.find((q) => q.id === questId);
  if (!def || def.soon) throw new Error("That quest can't be claimed.");
  const quests = await getTodayQuests(userId);
  const quest = quests.find((q) => q.id === questId);
  if (!quest || !quest.done || quest.claimed) throw new Error("That quest isn't ready.");

  const { data, error } = await supabase
    .from("daily_quests")
    .update({ claimed: true })
    .eq("user_id", userId)
    .eq("quest_date", localDateString())
    .eq("quest_id", questId)
    .eq("claimed", false)
    .select();
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Already claimed.");
  return grantRewards(userId, { xp: def.xp, coins: def.coins });
}

// ---------- badges ----------
// Shown off on the profile page later.
async function getBadges(userId) {
  const { data, error } = await supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", userId);
  if (error) throw error;
  return data;
}

// Gives a badge once. Returns { isNew }.
async function awardBadge(userId, badgeId) {
  const { data, error } = await supabase
    .from("user_badges")
    .upsert({ user_id: userId, badge_id: badgeId }, { onConflict: "user_id,badge_id", ignoreDuplicates: true })
    .select();
  if (error) throw error;
  return { isNew: data.length > 0 };
}