// Journey structure: 3 zones x 3 levels. Each level is ONE mini-game, and
// the mini-game type rotates through the list below. The mini-games
// themselves are not built yet - these are names and blurbs only.
const ZONES = [
  { id: "void-deck", name: "Void Deck", levels: [1, 2, 3] },
  { id: "hawker-centre", name: "Hawker Centre", levels: [4, 5, 6] },
  { id: "marina-bay", name: "Marina Bay", levels: [7, 8, 9] },
];

const MINI_GAMES = [
  { id: "typing", name: "Typing", icon: "keyboard", blurb: "Type each word as you see it." },
  { id: "pronunciation", name: "Pronunciation", icon: "mic", blurb: "Listen to each word, then say it out loud." },
  { id: "composition", name: "Composition", icon: "pen", blurb: "Use the words to build your own sentences." },
];

function getTotalLevels() {
  return ZONES.reduce((sum, zone) => sum + zone.levels.length, 0);
}

function getZoneForLevel(levelNumber) {
  return ZONES.find((zone) => zone.levels.includes(levelNumber)) || null;
}

function getMiniGameForLevel(levelNumber) {
  return MINI_GAMES[(levelNumber - 1) % MINI_GAMES.length];
}

// Words for a level come from its zone, so every word is related to the
// zone's theme. Returns [] for languages with no list yet.
function getLevelWords(language, levelNumber) {
  const zone = getZoneForLevel(levelNumber);
  if (!zone) return [];
  const byLanguage = ZONE_WORDS[language];
  return (byLanguage && byLanguage[zone.id]) || [];
}

// Placeholder for later: once store-vocabulary is merged in, this should
// return the user's own captured words that match the zone's theme, so
// they can be shown first. Returns [] until that integration exists.
async function getPriorityWords(userId, language) {
  return [];
}