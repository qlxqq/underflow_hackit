/* Talks to Supabase for the pronunciation page:
     - loads the question bank (table pronunciation_questions, see database/pronunciation_questions.sql)
     - saves a finished level
   Uses the app's shared code:
     - supabaseClient.js  -> the `supabase` client
     - rewards.js         -> grantRewards (XP + coins), recordStreakActivity, recordQuestEvent
     - streak.js          -> needed by rewards.js
   Load those before this file. If they're missing or the player isn't signed in,
   nothing is saved and the page still works. */

// Coins for clearing a level (XP comes from the phrases themselves).
// Not cleared = no coins, but the XP earned for trying is still saved.
const COINS_PERFECT = 15;   // all phrases passed
const COINS_PASS = 10;      // level cleared, but not perfect

// Is the Supabase client usable? (try/catch for the same reason as saveIsAvailable below)
function dbAvailable() {
  try {
    return typeof supabase !== 'undefined' && supabase && typeof supabase.from === 'function';
  } catch (err) {
    return false;
  }
}

// The phrase bank for one language + zone, from the pronunciation_questions table.
// Returns the phrases in the same shape as lessons.js, or null if the table can't be reached
// (offline, table not created yet, too slow) so the page uses lessons.js instead.
async function loadQuestionBank(lang, zone) {
  if (!dbAvailable()) return null;
  try {
    const query = supabase
      .from('pronunciation_questions')
      .select('phrase, romanization, meaning, context')
      .eq('language', lang)
      .eq('zone', zone)
      .eq('level', 1);
    const tooSlow = new Promise((resolve) => setTimeout(() => resolve({ data: null, error: 'timeout' }), 4000));
    const { data, error } = await Promise.race([query, tooSlow]);
    if (error || !data || !data.length) return null;
    return data.map((r) => ({
      text: r.phrase,
      roman: r.romanization || '',
      meaning: r.meaning,
      context: r.context || ''
    }));
  } catch (err) {
    return null;
  }
}

function saveIsAvailable() {
  // try/catch: if supabaseClient.js crashed (e.g. the Supabase library didn't load),
  // even checking `supabase` throws an error
  try {
    return typeof supabase !== 'undefined' && supabase && typeof supabase.from === 'function'
      && typeof grantRewards === 'function';
  } catch (err) {
    return false;
  }
}

async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data && data.session ? data.session.user.id : null;
}

// detail = the same object sent in the 'pronunciation:finished' event
// Returns { saved, signedIn, coins, levelUps, error }
async function savePronunciationResult(detail) {
  const coins = detail.perfect ? COINS_PERFECT : detail.passed ? COINS_PASS : 0;
  if (!saveIsAvailable()) return { saved: false, unavailable: true, coins };

  try {
    const userId = await currentUserId();
    if (!userId) return { saved: false, signedIn: false, coins };

    // 1) Mark the level done so the journey map unlocks the next one
    if (detail.passed) {
      const { error } = await supabase.from('journey_progress').upsert({
        user_id: userId,
        language: detail.lang,
        level_number: detail.level,
        slot_1_completed: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,language,level_number' });
      if (error) throw error;
    }

    // 2) XP (always) and coins (only when cleared), the same way every feature pays out.
    // grantRewards pays coins into the wallet of the journey language saved in the browser,
    // so make sure that's the language just played (otherwise Tamil coins could land in Chinese).
    try { localStorage.setItem('journeyLanguage:' + userId, detail.lang); } catch (err) { /* storage blocked */ }
    let levelUps = 0;
    if (detail.xp > 0 || coins > 0) {
      const reward = await grantRewards(userId, { xp: detail.xp, coins });
      levelUps = reward.levelUps || 0;
    }

    // 3) Clearing a level counts as activity for the streak and the "Win a mini-game" quest
    if (detail.passed) {
      if (typeof recordStreakActivity === 'function') await recordStreakActivity(userId);
      if (typeof recordQuestEvent === 'function') await recordQuestEvent(userId, 'minigame_win');
    }

    return { saved: true, signedIn: true, coins, levelUps };
  } catch (err) {
    console.error('[pronunciation] could not save result:', err);
    return { saved: false, signedIn: true, coins, error: err };
  }
}