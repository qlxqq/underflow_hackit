// Journey structure: 3 zones x 3 levels. Each level is one mini-game

const ZONES = [
  { id: "neighbourhood", name: "Neighbourhood", levels: [1, 2, 3] },
  { id: "hawker-centre", name: "Hawker Centre", levels: [4, 5, 6] },
  { id: "public-transport", name: "Public Transport", levels: [7, 8, 9] },
];

const MINI_GAMES = [
  { id: "pronunciation", name: "Pronunciation", icon: "mic", blurb: "Listen to each word, then say it out loud." },
  { id: "typing", name: "Typing", icon: "keyboard", blurb: "Type each word as you see it." },
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

// Return the user's own captured words that match the zone's theme, so
// they can be shown first. Returns [] until that integration exists.
async function getPriorityWords(userId, language) {
  return [];
}

// What to tell a player who taps the map somewhere that is not a level dot.
function getTapPrompt(currentLevel, lockedLevel = null) {
  if (currentLevel === null) return "You've finished every level. Tap any dot to replay one.";
  if (lockedLevel !== null) return `Level ${lockedLevel} is locked. Tap the dot for Level ${currentLevel} to play.`;
  return `Tap the dot for Level ${currentLevel} to play.`;
}