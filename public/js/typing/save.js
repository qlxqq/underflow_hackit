/* Talks to Supabase for the Typing page:
     - loads the sentence bank (table typing_questions, see database/typing_questions.sql)
     - reads the player's captured words (table vocabulary): sentences that use them come first, and the bonus
       question is built from them
     - counts the daily streak
   Uses the app's shared code: supabaseClient.js (the `supabase` client), streak.js + rewards.js (recordStreakActivity).
   Load those before this file. If they are missing or the player is not signed in, nothing is saved and the page
   still works. The coins, XP and cards are NOT paid here: the island pays them when the player goes back to it. */

// Is the Supabase client usable? (try/catch: if supabaseClient.js crashed, even checking `supabase` throws)
function typingDbAvailable() {
  try {
    return typeof supabase !== 'undefined' && supabase && typeof supabase.from === 'function';
  } catch (err) {
    return false;
  }
}

// A promise that gives up after a few seconds, so a slow connection falls back to the built-in sentences.
function typingTimeout(ms) {
  return new Promise((resolve) => setTimeout(() => resolve({ data: null, error: 'timeout' }), ms));
}

// The sentence bank for one language + zone, from the typing_questions table.
// Returns the sentences in the same shape as typingData.js, or null if the table can't be reached
// (offline, table not created yet, too slow) so the page uses typingData.js instead.
async function loadTypingBank(lang, zone) {
  if (!typingDbAvailable()) return null;
  try {
    const query = supabase
      .from('typing_questions')
      .select('target, romanization, english, words')
      .eq('language', lang)
      .eq('zone', zone);
    const { data, error } = await Promise.race([query, typingTimeout(4000)]);
    if (error || !data || !data.length) return null;
    return data.map((r) => ({
      target: r.target,
      roman: r.romanization || '',
      english: r.english,
      words: Array.isArray(r.words) ? r.words : []
    }));
  } catch (err) {
    return null;
  }
}

// The words the player has captured in this language. Never throws: [] means nothing is prioritised.
async function loadTypingCapturedWords(userId, lang) {
  if (!typingDbAvailable() || !userId) return [];
  try {
    const query = supabase.from('vocabulary').select('word').eq('user_id', userId).eq('language', lang).limit(500);
    const { data, error } = await Promise.race([query, typingTimeout(4000)]);
    if (error || !data) return [];
    return data.map((r) => r.word).filter(Boolean);
  } catch (err) {
    return [];
  }
}

/* ============================================================
   Bonus question: a sentence built from the player's own captured words
   A captured word is used only when it is a plain NOUN that makes a sensible sentence in the zone
   (decided from its English meaning), so the bonus always makes sense. With fewer than
   config.bonusMinWords fitting words there is simply no bonus question.
   ============================================================ */
const TYPING_BONUS_NOUNS = {
  1: new Set(['park', 'playground', 'supermarket', 'shop', 'market', 'school', 'library', 'clinic', 'hospital', 'pharmacy', 'bakery', 'cafe', 'coffee shop', 'food court', 'hawker centre', 'bus stop', 'mrt station', 'void deck', 'lift', 'garden', 'mall', 'shopping mall', 'restaurant', 'bank', 'post office', 'kindergarten', 'temple', 'church', 'mosque', 'swimming pool', 'gym', 'basketball court', 'fitness corner', 'pavilion', 'bench', 'carpark', 'car park', 'minimart', 'convenience store']),
  2: /\b(rice|noodles?|tea|coffee|soup|juice|milk|water|satay|laksa|prata|dumplings?|chicken|egg|eggs|bread|cake|apple|orange|banana|mango|watermelon|papaya|durian|ice cream|porridge|congee|kopi|teh|toast|burger|pizza|fish ball|fish|duck|pork|beef)\b/,
  3: new Set(['bus', 'taxi', 'train', 'mrt', 'subway', 'plane', 'airplane', 'car', 'ferry', 'boat', 'tram', 'lrt', 'school bus', 'minibus', 'cab'])
};
// what a captured word must look like in each language (one word, no spaces)
const TYPING_WORD_SHAPE = { zh: /^[\u4e00-\u9fff]{1,4}$/, ms: /^[a-z]{3,16}$/i, ta: /^[\u0b80-\u0bff]{2,18}$/ };
const TYPING_FILLER = new Set(['的', '了', '是', '在', '和', '也', '都', '就', '着', '而', '及', '與', '我', '你', '他', '她', '它', '们', '这', '那', '不', '很', '个', '吗', '呢', '吧', '啊', '要', '想', '请', '有', '给', '坐', '骑', '一', '二', '三', '里', '上', '下', '喜欢', '可以']);

function typingBonusMeaningOk(zone, meaning) {
  if (!meaning || /^to\s/i.test(meaning) || /\b(spicy|hot|cold|big|small|good|bad|very)\b/.test(meaning)) return false;
  const rule = TYPING_BONUS_NOUNS[zone];
  if (!rule) return false;
  if (rule instanceof Set) return rule.has(meaning.replace(/^(a|an|the)\s+/, ''));
  return rule.test(meaning) && !/\b(stall|shop|centre|center|menu|order|eat|drink)\b/.test(meaning);
}

// The player's captured words that fit this zone, with their romanization and a simple English meaning.
// Never throws: [] means no bonus question.
async function loadTypingBonusWords(userId, lang, zone) {
  if (!typingDbAvailable() || !userId || !TYPING_BONUS_NOUNS[zone] || !TYPING_WORD_SHAPE[lang]) return [];
  try {
    const query = supabase.from('vocabulary')
      .select('vocab_id, word, romanization, english_meaning, usage_count')
      .eq('user_id', userId).eq('language', lang).limit(300);
    const { data, error } = await Promise.race([query, typingTimeout(4000)]);
    if (error || !data) return [];
    const seen = new Set();
    return data.filter((row) => {
      const meaning = String(row.english_meaning || '').split(/[\/;,(]/)[0].trim();
      if (!row.word || seen.has(row.word) || TYPING_FILLER.has(row.word) || !row.romanization) return false;
      if (!TYPING_WORD_SHAPE[lang].test(row.word)) return false;
      if (!/^[A-Za-z][A-Za-z '\-]{0,28}$/.test(meaning)) return false;
      if (!typingBonusMeaningOk(zone, meaning.toLowerCase())) return false;
      row.simpleMeaning = meaning.toLowerCase().replace(/^(a|an|the)\s+/, '');
      seen.add(row.word);
      return true;
    });
  } catch (err) {
    console.warn('Typing: could not read the captured words, no bonus question.', err);
    return [];
  }
}

// Playing counts towards the daily streak (the streak itself grows once a day).
async function countTypingStreak(userId) {
  if (!userId || typeof recordStreakActivity !== 'function') return null;
  try {
    return await recordStreakActivity(userId);
  } catch (err) {
    console.error('Typing: could not update the streak.', err);
    return null;
  }
}