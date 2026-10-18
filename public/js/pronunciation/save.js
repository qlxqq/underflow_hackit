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
      .eq('zone', zone);
    const tooSlow = new Promise((resolve) => setTimeout(() => resolve({ data: null, error: 'timeout' }), 4000));
    const { data, error } = await Promise.race([query, tooSlow]);
    if (error || !data || !data.length) return null;
    // The zone words of each phrase are not in the table: they come from lessons.js (matched by the phrase)
    const local = (typeof LESSONS !== 'undefined' && LESSONS[lang] && LESSONS[lang].zones[zone]) || [];
    return data.map((r) => {
      const known = local.find((p) => p.text === r.phrase);
      return {
        text: r.phrase,
        roman: r.romanization || '',
        meaning: r.meaning,
        context: r.context || '',
        words: known && known.words ? known.words : []
      };
    });
  } catch (err) {
    return null;
  }
}

/* ============================================================
   Bonus question: the player's own captured words
   A captured word is used only when it is a plain NOUN that makes a sensible sentence in the zone
   (decided from its English meaning), so the bonus always makes sense. With fewer than
   BONUS_MIN_WORDS fitting words there is simply no bonus question.
   ============================================================ */
const BONUS_MIN_WORDS = 2;
const BONUS_NOUNS = {
  1: new Set(['park', 'playground', 'supermarket', 'shop', 'market', 'school', 'library', 'clinic', 'hospital', 'pharmacy', 'bakery', 'cafe', 'coffee shop', 'food court', 'hawker centre', 'bus stop', 'mrt station', 'void deck', 'lift', 'garden', 'mall', 'shopping mall', 'restaurant', 'bank', 'post office', 'kindergarten', 'temple', 'church', 'mosque', 'swimming pool', 'gym', 'basketball court', 'fitness corner', 'pavilion', 'bench', 'carpark', 'car park', 'minimart', 'convenience store']),
  2: /\b(rice|noodles?|tea|coffee|soup|juice|milk|water|satay|laksa|prata|dumplings?|chicken|egg|eggs|bread|cake|apple|orange|banana|mango|watermelon|papaya|durian|ice cream|porridge|congee|kopi|teh|toast|burger|pizza|fish ball|fish|duck|pork|beef)\b/,
  3: new Set(['bus', 'taxi', 'train', 'mrt', 'subway', 'plane', 'airplane', 'car', 'ferry', 'boat', 'tram', 'lrt', 'school bus', 'minibus', 'cab'])
};
// what a captured word must look like in each language (one word, no spaces)
const BONUS_WORD_SHAPE = { zh: /^[一-鿿]{1,4}$/, ms: /^[a-z]{3,16}$/i, ta: /^[஀-௿]{2,18}$/ };
const BONUS_FILLER = new Set(['的', '了', '是', '在', '和', '也', '都', '就', '着', '而', '及', '與', '我', '你', '他', '她', '它', '们', '这', '那', '不', '很', '个', '吗', '呢', '吧', '啊', '要', '想', '请', '有', '给', '坐', '骑', '一', '二', '三', '里', '上', '下', '喜欢', '可以']);

function bonusMeaningOk(zone, meaning) {
  if (!meaning || /^to\s/i.test(meaning) || /\b(spicy|hot|cold|big|small|good|bad|very)\b/.test(meaning)) return false;
  const rule = BONUS_NOUNS[zone];
  if (!rule) return false;
  if (rule instanceof Set) return rule.has(meaning.replace(/^(a|an|the)\s+/, ''));
  return rule.test(meaning) && !/\b(stall|shop|centre|center|menu|order|eat|drink)\b/.test(meaning);
}

// The player's captured words that fit this zone. Never throws: [] means no bonus question.
async function loadCapturedWords(lang, zone) {
  if (!dbAvailable() || !BONUS_NOUNS[zone] || !BONUS_WORD_SHAPE[lang]) return [];
  try {
    const userId = await currentUserId();
    if (!userId) return [];
    const query = supabase.from('vocabulary')
      .select('vocab_id, word, romanization, english_meaning, usage_count')
      .eq('user_id', userId).eq('language', lang).limit(300);
    const tooSlow = new Promise((resolve) => setTimeout(() => resolve({ data: null, error: 'timeout' }), 4000));
    const { data, error } = await Promise.race([query, tooSlow]);
    if (error || !data) return [];
    const seen = new Set();
    return data.filter((row) => {
      const meaning = String(row.english_meaning || '').split(/[\/;,(]/)[0].trim();
      if (!row.word || seen.has(row.word) || BONUS_FILLER.has(row.word)) return false;
      if (!BONUS_WORD_SHAPE[lang].test(row.word)) return false;
      if (!/^[A-Za-z][A-Za-z '\-]{0,28}$/.test(meaning)) return false;
      if (!bonusMeaningOk(zone, meaning.toLowerCase())) return false;
      row.simpleMeaning = meaning.toLowerCase().replace(/^(a|an|the)\s+/, '');
      seen.add(row.word);
      return true;
    });
  } catch (err) {
    console.warn('[pronunciation] could not read the captured words, no bonus question.', err);
    return [];
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
  const coins = detail.fromIsland ? 0 : detail.perfect ? COINS_PERFECT : detail.passed ? COINS_PASS : 0;
  if (!saveIsAvailable()) return { saved: false, unavailable: true, coins };

  try {
    const userId = await currentUserId();
    if (!userId) return { saved: false, signedIn: false, coins };

    // Opened from the island: the island pays coins, XP and the level itself when the player goes back.
    // Only the daily streak and the "Win a mini-game" quest are counted here.
    if (detail.fromIsland) {
      if (typeof recordStreakActivity === 'function') { try { await recordStreakActivity(userId); } catch (err) { console.error(err); } }
      if (detail.passed && typeof recordQuestEvent === 'function') { try { await recordQuestEvent(userId, 'minigame_win'); } catch (err) { console.error(err); } }
      return { saved: true, signedIn: true, coins: 0, userId };
    }

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

    return { saved: true, signedIn: true, coins, levelUps, userId };
  } catch (err) {
    console.error('[pronunciation] could not save result:', err);
    return { saved: false, signedIn: true, coins, error: err };
  }
}