// Turns the existing frequency wordlists into Journey levels. Level 1 gets
// the most common words, each later level gets progressively rarer ones.
// This re-uses the same ZH/MS/TA_COMMON_WORDS arrays that power rarity.js -
// one dataset, two features.
const WORDS_PER_LEVEL = 10;

const FREQUENCY_LISTS = {
  zh: typeof ZH_COMMON_WORDS !== "undefined" ? ZH_COMMON_WORDS : [],
  ms: typeof MS_COMMON_WORDS !== "undefined" ? MS_COMMON_WORDS : [],
  ta: typeof TA_COMMON_WORDS !== "undefined" ? TA_COMMON_WORDS : [],
};

// Returns the words assigned to a given level (1-indexed).
function getLevelWords(language, levelNumber) {
  const list = FREQUENCY_LISTS[language] || [];
  const start = (levelNumber - 1) * WORDS_PER_LEVEL;
  return list.slice(start, start + WORDS_PER_LEVEL);
}

// How many levels exist in total for a language, based on wordlist length.
function getTotalLevels(language) {
  const list = FREQUENCY_LISTS[language] || [];
  return Math.max(1, Math.ceil(list.length / WORDS_PER_LEVEL));
}

// Placeholder for later: once store-vocabulary is merged in, this should
// query the vocabulary table for this user's own captured words and mix
// them in, prioritized over the auto-generated list (per the "user input
// words are priority" decision). Returns [] until that integration exists.
async function getPriorityWords(userId, language) {
  return [];
}