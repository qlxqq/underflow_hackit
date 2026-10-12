// Assigns a rarity tier to a captured word from how common it is in
// everyday speech. The frequency lists (zhFrequency.js, msFrequency.js,
// taFrequency.js) hold the most common words, most common first. The
// further down a list a word sits, the rarer it is. A word that is not in
// the list at all is Legendary: often something distinctly Singaporean,
// like 组屋 (HDB flat), 德士 (taxi) or தோசை (dosai).
const RARITY = {
  COMMON: "common",
  UNCOMMON: "uncommon",
  RARE: "rare",
  EPIC: "epic",
  LEGENDARY: "legendary",
};
const RARITY_ORDER = [RARITY.COMMON, RARITY.UNCOMMON, RARITY.RARE, RARITY.EPIC, RARITY.LEGENDARY];

// The last rank in each tier, per language. Anything past the last number
// (or missing from the list) is Legendary. Tamil's list is shorter, so its
// cutoffs are lower. Tune these to make a tier easier or harder to reach.
const RARITY_CUTOFFS = {
  zh: [400, 1500, 4000, 8000],
  ms: [400, 1500, 4000, 8000],
  ta: [300, 1000, 2500, 6000],
};

const FREQUENCY_LISTS = {
  zh: typeof ZH_COMMON_WORDS !== "undefined" ? ZH_COMMON_WORDS : [],
  ms: typeof MS_COMMON_WORDS !== "undefined" ? MS_COMMON_WORDS : [],
  ta: typeof TA_COMMON_WORDS !== "undefined" ? TA_COMMON_WORDS : [],
};

// word -> rank (1 = most common), built once so each lookup is instant.
const WORD_RANKS = {};
Object.keys(FREQUENCY_LISTS).forEach((language) => {
  WORD_RANKS[language] = new Map(FREQUENCY_LISTS[language].map((word, i) => [word, i + 1]));
});

function getRarity(word, language) {
  const cutoffs = RARITY_CUTOFFS[language];
  if (!cutoffs) return RARITY.COMMON; // an unsupported language: nothing to rank by

  const rank = WORD_RANKS[language].get(word) || WORD_RANKS[language].get(word.toLowerCase());
  if (!rank) return RARITY.LEGENDARY;

  const tier = cutoffs.findIndex((lastRank) => rank <= lastRank);
  return tier === -1 ? RARITY.LEGENDARY : RARITY_ORDER[tier];
}