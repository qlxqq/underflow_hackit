// Assigns a rarity tier to a captured word, based on how common it is
// in everyday use. Each language has its own frequency list; a word not
// found in the list for its language is treated as "rare" by default.
const RARITY = { COMMON: "common", UNCOMMON: "uncommon", RARE: "rare" };

// Position in a frequency list roughly maps to how common the word is.
// Tune these cutoffs once fuller wordlists are in place.
const COMMON_CUTOFF = 15;

const FREQUENCY_LISTS = {
  zh: typeof ZH_COMMON_WORDS !== "undefined" ? ZH_COMMON_WORDS : [],
  ms: typeof MS_COMMON_WORDS !== "undefined" ? MS_COMMON_WORDS : [],
  ta: typeof TA_COMMON_WORDS !== "undefined" ? TA_COMMON_WORDS : [],
};

function getRarity(word, language) {
  const list = FREQUENCY_LISTS[language] || [];
  const rank = list.indexOf(word);

  if (rank === -1) return RARITY.RARE;
  if (rank < COMMON_CUTOFF) return RARITY.COMMON;
  return RARITY.UNCOMMON;
}