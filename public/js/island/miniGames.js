// Opens the island's mini-games and takes their results back.
//
// Which game a building has is set by getMiniGameForLevel (js/journey/levels.js):
// level 1, 4, 7 Pronunciation   level 2, 5, 8 Typing   level 3, 6, 9 Composition.
// A game that is built gets an entry in ISLAND_MINIGAMES below. A level whose game is not
// listed (or not ready in the player's language) keeps showing "coming soon".
//
// A game runs on its own page. It opens with  ?zone=<1-3>&level=<1-3 inside the zone>&island=<1-9>
// and, when the player finishes, saves its result and sends them back to the island:
//   localStorage["island:minigame-result"] = { userId, level, language, ratio, total, words, at }
//     ratio = how well it went (0-1)      total = how many questions the game has
//     words = zone words the player got right (they can win cards)
//   Rewards scale with total (economy.js): a longer game pays more coins and XP and can give more cards.
// collect() (called by app.js once the island is up) takes that result and pays it with the island's own
// rules: IslandAPI.completeLevel (coins, XP, level done, gates) and IslandAPI.awardWords (cards).
//
// Needs: ui.js (IslandHooks), lang.js (IslandLang), islandData.js, journey/levels.js, save.js (IslandSave).

const ISLAND_MINIGAMES = {
  composition: { page: "../composition/composition.html", languages: ["zh"] },
  // pronunciation: { page: "../pronunciation/pronunciation.html", languages: ["zh", "ms", "ta"] },
  // typing: { page: "../typing/typing.html", languages: ["zh", "ms", "ta"] },
};

const ISLAND_MINIGAME_RESULT_KEY = "island:minigame-result";
const ISLAND_MINIGAME_RESULT_MAX_AGE = 30 * 60 * 1000; // a result older than this is ignored
const ISLAND_RETURN_SPOT_KEY = "island:return-spot";      // where the player stood before the game

const IslandMiniGames = {
  // Where a level sits in its zone: zone 1-3 and place 1-3 (the number the games use to pick questions).
  position(levelNumber) {
    const level = ISLAND_LEVELS.find((l) => l.level === levelNumber);
    if (!level) return null;
    const zoneIndex = ISLAND_ZONES.findIndex((z) => z.id === level.zone);
    const inZone = ISLAND_LEVELS.filter((l) => l.zone === level.zone).sort((a, b) => a.level - b.level);
    return { zone: zoneIndex + 1, place: inZone.findIndex((l) => l.level === levelNumber) + 1, level };
  },

  // Remember where the player stands, so the island puts them back there after the game.
  saveReturnSpot() {
    try {
      const spot = window.IslandAPI && window.IslandAPI.spot ? window.IslandAPI.spot() : null;
      if (spot) localStorage.setItem(ISLAND_RETURN_SPOT_KEY, JSON.stringify({ x: spot.x, y: spot.y, userId: IslandSave.userId || null, at: Date.now() }));
    } catch (err) { /* storage blocked: the player starts at the usual place */ }
  },
  readReturnSpot() {
    try {
      const s = JSON.parse(localStorage.getItem(ISLAND_RETURN_SPOT_KEY));
      const ok = s && Number.isFinite(s.x) && Number.isFinite(s.y) && Date.now() - (s.at || 0) <= ISLAND_MINIGAME_RESULT_MAX_AGE && (s.userId || null) === (IslandSave.userId || null);
      return ok ? s : null;
    } catch (err) { return null; }
  },
  hasReturnSpot() { return !!this.readReturnSpot(); },
  // true when the page was opened by a finished (or just left) mini-game
  cameBackFromGame() { return this.hasReturnSpot() || !!this.readResult(); },
  takeReturnSpot() {
    const s = this.readReturnSpot();
    try { localStorage.removeItem(ISLAND_RETURN_SPOT_KEY); } catch (err) { /* ignore */ }
    return s ? { x: s.x, y: s.y } : null;
  },

  start(landmark) {
    const game = typeof getMiniGameForLevel === "function" ? getMiniGameForLevel(landmark.level) : null;
    const cfg = game && ISLAND_MINIGAMES[game.id];
    if (!cfg || !cfg.languages.includes(IslandLang.code)) return false; // not built yet: "coming soon"
    const pos = this.position(landmark.level);
    if (!pos) return false;
    try { localStorage.removeItem(ISLAND_MINIGAME_RESULT_KEY); } catch (err) { /* storage blocked */ }
    this.saveReturnSpot();
    location.href = `${cfg.page}?zone=${pos.zone}&level=${pos.place}&island=${landmark.level}`;
    return true;
  },

  // The result comes on the page's address (?mg=...) or, failing that, from this device's storage.
  readResult() {
    try {
      const fromUrl = new URLSearchParams(location.search).get("mg");
      if (fromUrl) return JSON.parse(fromUrl);
    } catch (err) { /* fall through to storage */ }
    try {
      const raw = localStorage.getItem(ISLAND_MINIGAME_RESULT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) { return null; }
  },
  clearResult() {
    try { localStorage.removeItem(ISLAND_MINIGAME_RESULT_KEY); } catch (err) { /* ignore */ }
    try {
      const url = new URL(location.href);
      if (url.searchParams.has("mg")) { url.searchParams.delete("mg"); history.replaceState(null, "", url.pathname + url.search + url.hash); }
    } catch (err) { /* ignore */ }
  },

  // Pays a finished game, once. Waits for the island scene to be ready; if it never is (for
  // example the player is on the home island) the result is kept for the next visit.
  async collect() {
    if (this.collecting) return;   // it starts itself when the page loads, and app.js may call it too
    const result = this.readResult();
    if (!result) return;
    this.collecting = true;
    try { await this.pay(result); } finally { this.collecting = false; }
  },

  async pay(result) {
    // wait for the island scene (it makes IslandAPI.completeLevel) and for the player to be known
    for (let i = 0; i < 300 && !(window.IslandAPI && window.IslandAPI.completeLevel && IslandLang.code); i++) await new Promise((r) => setTimeout(r, 200));
    if (!(window.IslandAPI && window.IslandAPI.completeLevel)) { console.warn("Island: the island was not ready, the mini-game reward is kept for the next visit."); return; }
    const level = ISLAND_LEVELS.find((l) => l.level === Number(result.level));
    const mine = !IslandSave.userId || result.userId === IslandSave.userId;
    const fresh = Date.now() - (result.at || 0) <= ISLAND_MINIGAME_RESULT_MAX_AGE;
    if (!level || !mine || result.language !== IslandLang.code || !fresh) {
      console.warn("Island: ignored a mini-game result", { level: !!level, mine, sameLanguage: result.language === IslandLang.code, fresh });
      this.clearResult();
      return;
    }
    this.clearResult(); // before paying, so a reload can never pay twice
    const ratio = Math.max(0, Math.min(1, Number(result.ratio)));
    const total = Math.max(0, Math.round(Number(result.total))) || undefined;
    try { await window.IslandAPI.completeLevel(level.level, Number.isFinite(ratio) ? ratio : 1, total); } catch (err) { console.error("Island: could not finish the level.", err); }
    const album = typeof ALBUM_OF_ZONE !== "undefined" ? ALBUM_OF_ZONE[level.zone] : null;
    if (album && Array.isArray(result.words) && result.words.length && window.IslandAPI.awardWords) {
      try { await window.IslandAPI.awardWords(album, result.words, null, { max: IslandEconomy.miniCards(total) }); } catch (err) { console.error("Island: could not award cards.", err); }
    }
  },
};

IslandHooks.startMiniGame = (landmark) => IslandMiniGames.start(landmark);

// Which building plays a word? Used by a card's Practise button (practice.js).
// The zone words are the words of the built games, so a zone word is practised in the zone's
// building of a game that is built for this language. null = no game yet (an NPC takes it instead).
// When the pronunciation or typing game is added to ISLAND_MINIGAMES it needs no change here
// as long as its words are in the zone list.
IslandHooks.findMiniGame = (word, language) => {
  try {
    const albumId = Object.keys(ALBUM_OF_ZONE).map((z) => ALBUM_OF_ZONE[z]).find((a) => IslandCards.zoneList(a).some((w) => w.w === word));
    if (!albumId) return null;
    const zoneId = ZONE_OF_ALBUM[albumId];
    const levels = ISLAND_LEVELS.filter((l) => l.zone === zoneId).sort((a, b) => a.level - b.level);
    const built = levels.filter((l) => {
      const game = typeof getMiniGameForLevel === "function" ? getMiniGameForLevel(l.level) : null;
      const cfg = game && ISLAND_MINIGAMES[game.id];
      return cfg && cfg.languages.includes(language);
    });
    return built.length ? built[0].level : null;
  } catch (err) { return null; }
};

// Take back a finished game as soon as the page has loaded (waits inside until the island is ready).
window.addEventListener("load", () => { IslandMiniGames.collect(); });