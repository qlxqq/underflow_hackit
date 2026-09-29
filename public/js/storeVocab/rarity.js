// Assigns a rarity tier to a captured word. Chinese uses a real frequency
// list; Malay and Tamil fall back to "common" until we have wordlists for
// them too (flagged as an open task, not solved here).
const RARITY = { COMMON: "common", UNCOMMON: "uncommon", RARE: "rare" };

// Position in the frequency list roughly maps to how common the word is.
// Tune these cutoffs once a fuller wordlist is in place.
const COMMON_CUTOFF = 15;

function getRarity(word, language) {
  if (language !== "zh") return RARITY.COMMON;

  const rank = ZH_COMMON_WORDS.indexOf(word);
  if (rank === -1) return RARITY.RARE;
  if (rank < COMMON_CUTOFF) return RARITY.COMMON;
  return RARITY.UNCOMMON;
}