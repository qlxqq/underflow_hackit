// Opens the island's mini-games and takes their results back.
//
// Which game a building has is set by getMiniGameForLevel (js/journey/levels.js):
// level 1, 4, 7 Pronunciation   level 2, 5, 8 Typing   level 3, 6, 9 Composition.
// A game that is built gets an entry in ISLAND_MINIGAMES below. A level whose game is not
// listed (or not ready in the player's language) keeps showing "coming soon".
//
// A game runs on its own page. It opens with  ?zone=<1-3>&level=<1-3 inside the zone>&island=<1-9>
// and, when the player finishes, saves its result and sends them back to the island:
//   localStorage["island:minigame-result"] = { userId, level, language, ratio, total, words, right, at }
//     ratio = how well it went (0-1)      total = how many questions the game has
//     words = zone words the player got right (they can win cards)
//   Rewards scale with total (economy.js): a longer game pays more coins and XP and can give more cards.
// collect() (called by app.js once the island is up) takes that result and pays it with the island's own
// rules: IslandAPI.completeLevel (coins, XP, level done, gates) and IslandAPI.awardWords (cards).
//
// Needs: ui.js (IslandHooks), lang.js (IslandLang), islandData.js, journey/levels.js, save.js (IslandSave).

// The zone words each Pronunciation phrase uses (per language and album). Practise sends a card to the Pronunciation
// building only if one of its phrases has that word. Generated from the phrase tags in js/pronunciation/lessons.js.
const ISLAND_PRONUNCIATION_WORDS = {
 "zh": {
  "neighbourhood": [
   "楼下",
   "请问",
   "药房",
   "阿嬷",
   "吃饱",
   "最近",
   "组屋",
   "邻居",
   "实习",
   "期待",
   "下班",
   "晚餐",
   "阿公",
   "声音",
   "装修",
   "社区",
   "活动"
  ],
  "hawker-centre": [
   "鸡饭",
   "辣椒",
   "老板",
   "咖啡",
   "糖",
   "位子",
   "云吞面",
   "叉烧面",
   "排队",
   "鱼片汤",
   "手机",
   "转账",
   "汤",
   "付款",
   "现金",
   "辣",
   "换",
   "粥"
  ],
  "public-transport": [
   "巴士",
   "地铁站",
   "下一站",
   "下车",
   "坐",
   "地铁",
   "故障",
   "司机",
   "路口",
   "转乘",
   "学校",
   "挤",
   "下一班",
   "交通卡",
   "充值",
   "巴士站",
   "马路",
   "对面",
   "提醒"
  ]
 },
 "ms": {
  "neighbourhood": [
   "kedai",
   "blok",
   "farmasi",
   "nenek",
   "kenyang",
   "drama",
   "jiran",
   "latihan industri",
   "kerja",
   "makan malam",
   "atuk",
   "telefon",
   "tingkat",
   "bising",
   "acara",
   "pusat komuniti"
  ],
  "hawker-centre": [
   "nasi",
   "sambal",
   "kopi",
   "bungkus",
   "duduk",
   "mi goreng",
   "pesan",
   "gerai",
   "beratur",
   "sup ikan",
   "kongsi",
   "bayar",
   "mi",
   "kuah",
   "duit tunai",
   "pedas",
   "bubur",
   "cop"
  ],
  "public-transport": [
   "bas",
   "stesen",
   "turun",
   "perhentian",
   "pakcik",
   "berdiri",
   "rosak",
   "lambat",
   "berhenti",
   "simpang",
   "tren",
   "tukar",
   "sesak",
   "kad",
   "tambah nilai",
   "lintas jalan",
   "seberang",
   "terlepas"
  ]
 },
 "ta": {
  "neighbourhood": [
   "கடை",
   "கீழே",
   "மருந்துக் கடை",
   "பாட்டி",
   "தொடர்",
   "கதை",
   "மாசம்",
   "வர்ணம்",
   "வாரம்",
   "வேலைப் பயிற்சி",
   "வேலை",
   "ராத்திரி",
   "தாத்தா",
   "போன்",
   "சத்தம்",
   "மேல் வீட்டுக்காரங்க",
   "நிகழ்ச்சி",
   "வார இறுதி"
  ],
  "hawker-centre": [
   "கோழி சோறு",
   "காரம்",
   "காப்பி",
   "சர்க்கரை",
   "தோசை",
   "இட்லி",
   "வரிசை",
   "காசு",
   "வெங்காயம்",
   "குழம்பு",
   "பணம்",
   "கஞ்சி"
  ],
  "public-transport": [
   "பஸ்",
   "ரயில்",
   "வழி",
   "சந்திப்பு",
   "நன்றி",
   "பள்ளி",
   "அட்டை",
   "நிறுத்தம்"
  ]
 }
};

// The zone words each Typing sentence uses (per language and album). Practise sends a card to the Typing building
// only if one of its sentences has that word. Generated from the sentence tags in js/typing/typingData.js.
const ISLAND_TYPING_WORDS = {
 "zh": {
  "neighbourhood": [
   "今天",
   "攀岩",
   "手臂",
   "酸痛",
   "游乐场",
   "小孩",
   "玩",
   "晚上",
   "阿姨",
   "吃饭",
   "奶奶",
   "喜欢",
   "聊天",
   "中午",
   "滑梯",
   "烫",
   "公园",
   "散步",
   "楼下",
   "叔叔",
   "下棋",
   "邻居",
   "记得",
   "打招呼",
   "电梯",
   "坏了",
   "楼梯",
   "走"
  ],
  "hawker-centre": [
   "鸡饭",
   "打包",
   "老板",
   "一包",
   "咖啡",
   "糖",
   "一杯",
   "少糖",
   "有人",
   "排队",
   "好多",
   "辣",
   "辣椒",
   "加",
   "一点",
   "多少钱",
   "一共",
   "位子",
   "拥挤",
   "找",
   "付钱",
   "手机",
   "可以",
   "好吃"
  ],
  "public-transport": [
   "乌节路",
   "师傅",
   "车费",
   "德士",
   "德士站",
   "下一站",
   "转乘",
   "巴士",
   "刷卡",
   "地铁",
   "延误",
   "淡滨尼",
   "停车",
   "谢谢",
   "让座"
  ]
 }
};

// words (optional) = the zone words the game can ask, per language and album. A game without it is assumed to ask every zone word.
const ISLAND_MINIGAMES = {
  composition: { page: "../composition/composition.html", languages: ["zh"] },
  pronunciation: { page: "../pronunciation/pronunciation.html", languages: ["zh", "ms", "ta"], words: ISLAND_PRONUNCIATION_WORDS },
  typing: { page: "../typing/typing.html", languages: ["zh"], words: ISLAND_TYPING_WORDS },   // Malay and Tamil sentences are not written yet
};

const ISLAND_MINIGAME_RESULT_KEY = "island:minigame-result";
const ISLAND_MINIGAME_RESULT_MAX_AGE = 30 * 60 * 1000; // a result older than this is ignored
const ISLAND_RETURN_SPOT_KEY = "island:return-spot";      // where the player stood when they left the island page
const ISLAND_RETURN_SPOT_MAX_AGE = 6 * 60 * 60 * 1000;

const IslandMiniGames = {
  // Where a level sits in its zone: zone 1-3 and place 1-3 (the number the games use to pick questions).
  position(levelNumber) {
    const level = ISLAND_LEVELS.find((l) => l.level === levelNumber);
    if (!level) return null;
    const zoneIndex = ISLAND_ZONES.findIndex((z) => z.id === level.zone);
    const inZone = ISLAND_LEVELS.filter((l) => l.zone === level.zone).sort((a, b) => a.level - b.level);
    return { zone: zoneIndex + 1, place: inZone.findIndex((l) => l.level === levelNumber) + 1, level };
  },

  // Remember which island the player is on and where they stand, so that coming back from another
  // page (the Collection, a mini-game...) puts them there. Kept for this browser tab only, so
  // opening the app fresh still starts on the home island.
  saveReturnSpot() {
    try {
      const api = window.IslandAPI;
      const spot = api && api.spot && api.where ? api.spot() : null;
      if (spot && Number.isFinite(spot.x) && Number.isFinite(spot.y)) {
        sessionStorage.setItem(ISLAND_RETURN_SPOT_KEY, JSON.stringify({ where: api.where(), x: spot.x, y: spot.y, userId: IslandSave.userId || null, at: Date.now() }));
      }
    } catch (err) { /* storage blocked: the player starts at the usual place */ }
  },
  readReturnSpot() {
    try {
      const s = JSON.parse(sessionStorage.getItem(ISLAND_RETURN_SPOT_KEY));
      const ok = s && (s.where === "home" || s.where === "mystery") && Number.isFinite(s.x) && Number.isFinite(s.y)
        && Date.now() - (s.at || 0) <= ISLAND_RETURN_SPOT_MAX_AGE && (s.userId || null) === (IslandSave.userId || null);
      return ok ? s : null;
    } catch (err) { return null; }
  },
  // a finished mini-game is waiting to be paid
  hasPendingResult() { return !!this.readResult(); },
  // The spot for this island, once (the scene puts the player there). null = start at the usual place.
  takeReturnSpot(where) {
    const s = this.readReturnSpot();
    if (!s || s.where !== where) return null;
    try { sessionStorage.removeItem(ISLAND_RETURN_SPOT_KEY); } catch (err) { /* ignore */ }
    return { x: s.x, y: s.y };
  },

  start(landmark) {
    const game = typeof getMiniGameForLevel === "function" ? getMiniGameForLevel(landmark.level) : null;
    const cfg = game && ISLAND_MINIGAMES[game.id];
    if (!cfg || !cfg.languages.includes(IslandLang.code)) return false; // not built yet: "coming soon"
    const pos = this.position(landmark.level);
    if (!pos) return false;
    try { localStorage.removeItem(ISLAND_MINIGAME_RESULT_KEY); } catch (err) { /* storage blocked */ }
    this.saveReturnSpot();
    // Practise on a zone card: the game always asks one question with that word
    const p = typeof IslandPractice !== "undefined" ? IslandPractice.pending : null;
    const focus = p && !p.npcId && p.word ? `&focus=${encodeURIComponent(p.word)}` : "";
    location.href = `${cfg.page}?zone=${pos.zone}&level=${pos.place}&island=${landmark.level}&lang=${encodeURIComponent(IslandLang.code)}${focus}`;
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
    const ratioNum = Number(result.ratio);
    const ratio = Number.isFinite(ratioNum) ? Math.max(0, Math.min(1, ratioNum)) : 1;
    const total = Math.max(0, Math.round(Number(result.total))) || undefined;
    const score = total ? Math.round(ratio * total) : undefined;   // questions right first time
    const album = typeof ALBUM_OF_ZONE !== "undefined" ? ALBUM_OF_ZONE[level.zone] : null;
    const cardCount = IslandEconomy.miniCards(total, score);       // all right = half the questions, a pass = one fewer, a fail = none
    console.info("Island: mini-game result", { economyCardsPerQuestion: (typeof ISLAND_ECONOMY !== "undefined" && ISLAND_ECONOMY.mini) ? ISLAND_ECONOMY.mini.cardsPerQuestion : "OLD economy.js", level: level.level, questions: total, right: score, cardsAllowed: cardCount, wordsRight: (result.words || []).length });
    if (!total) console.warn("Island: the game did not send its question count (total), so the standard reward is used. Is composition.js up to date?");

    // coins, XP and the level itself (no banner: the result sheet below tells the story)
    let paid = null;
    try { paid = await window.IslandAPI.completeLevel(level.level, ratio, total, { quiet: true }); } catch (err) { console.error("Island: could not finish the level.", err); }

    // Cards the player already owns (captured words, and island album cards) whose word was in a question
    // answered right the first time get +1 practice, so they can evolve. This runs BEFORE the new cards
    // are saved, so a card won just now does not count as practised.
    let practised = [];
    const rightWords = Array.isArray(result.right) ? result.right : (Array.isArray(result.words) ? result.words : []);
    if (rightWords.length && window.IslandAPI.recordPractice) {
      try { practised = (await window.IslandAPI.recordPractice(rightWords)) || []; } catch (err) { console.error("Island: could not record practice.", err); }
    }
    if (practised.length && IslandHooks.onPractice) { try { IslandHooks.onPractice(practised); } catch (err) { console.error(err); } }

    // cards: zone cards only, drawn from the words answered right; owned ones are duplicates
    const before = album ? IslandCards.albumInfo(album) : null;
    let won = { cards: [], dupes: [] };
    if (album && cardCount > 0 && Array.isArray(result.words) && result.words.length) {
      try { won = await IslandCards.awardWords(album, result.words, { max: cardCount, fill: true }); } catch (err) { console.error("Island: could not award cards.", err); }
    }
    console.info("Island: mini-game cards", { allowed: cardCount, newCards: won.cards.length, duplicates: won.dupes.length });
    // a duplicate turns into coins and XP, the same as in an NPC challenge
    const dupePay = won.dupes.length ? IslandEconomy.duplicatePayout(won.dupes.length) : null;
    let paidDupes = { coins: 0, xp: 0, levelUps: 0 };
    if (dupePay) { try { paidDupes = await IslandEconomy.pay(dupePay); } catch (err) { console.error("Island: could not pay for duplicates.", err); } }

    const info = {
      level, total, score, album, before, won, dupePay, practised, bonus: result.bonus || null,
      coins: (paid ? paid.coins : 0) + paidDupes.coins,
      xp: (paid ? paid.xp : 0) + paidDupes.xp,
      levelUps: (paid ? paid.levelUps : 0) + (paidDupes.levelUps || 0),
      title: paid ? paid.title : "", note: paid ? paid.note : "",
    };
    // new cards arrive in a pack, then the summary
    if ((won.cards.length || won.dupes.length) && typeof IslandPack !== "undefined") {
      const lines = [info.coins ? `+${info.coins} coins` : "", info.xp ? `+${info.xp} XP` : "",
        won.dupes.length ? `${won.dupes.length} duplicate${won.dupes.length > 1 ? "s" : ""} turned into coins and XP` : "",
        info.practised.some((p) => p && p.evolved) ? `${info.practised.filter((p) => p && p.evolved).length} card${info.practised.filter((p) => p && p.evolved).length > 1 ? "s" : ""} evolved` : ""].filter(Boolean);
      try { await IslandPack.show(won.cards, lines, won.dupes); } catch (err) { console.error("Island: could not open the pack.", err); }
    }
    this.showSummary(info);
  },

  // The result sheet: score, what was earned, the cards, and what the duplicates became.
  showSummary(info) {
    if (typeof IslandUI === "undefined" || !IslandUI.openSheet) return;
    const esc = (t) => IslandUI.esc(t);
    const zone = ISLAND_ZONES.find((z) => z.id === info.level.zone);
    const pass = info.total ? info.score >= IslandQuiz.passMark(info.total) : true;
    const msg = !info.total ? "Well done!" : info.score === info.total ? "Perfect! Well done." : pass ? "Nice work!"
      : `Good try. You need ${IslandQuiz.passMark(info.total)} right the first time to win cards. Play again!`;
    const earned = [info.coins ? `+${info.coins} coins` : "", info.xp ? `+${info.xp} XP` : "",
      info.won.cards.length ? `+${info.won.cards.length} card${info.won.cards.length > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ");
    const cardsHtml = info.won.cards.length
      ? `<div class="won-cards">${info.won.cards.map((c) => `<div class="won-card is-zone" lang="${IslandLang.code}"><b>${esc(c.word)}</b><small>${c.pinyin ? `${esc(c.pinyin)} · ` : ""}${esc(c.meaning)}</small><em>Zone card</em></div>`).join("")}</div>`
      : "";
    const d = info.won.dupes.length;
    const dupeHtml = d && info.dupePay
      ? `<p class="sheet-sub">${d === 1 ? "A card you already own" : `${d} cards you already own`} turned into +${info.dupePay.coins} coins and +${info.dupePay.xp} XP.</p>` : "";
    const noCards = !info.won.cards.length && !d
      ? `<p class="sheet-sub">${pass ? "No cards this time. Words you get right the first time can win zone cards." : "No cards this time."}</p>` : "";
    // the bonus question (a sentence built with one of the player's own captured words) and which cards evolved
    const stageName = ["", "Trained", "Mastered"];
    const evolved = (info.practised || []).filter((p) => p && p.evolved);
    const bonusHtml = info.bonus && info.bonus.words
      ? `<p class="sheet-sub">Bonus question: ${info.bonus.right ? "you used your words" : "keep practising your words"} ${info.bonus.words.map((w, i) => `<b lang="${IslandLang.code}">${esc(w)}</b> (${esc(info.bonus.meanings[i])})`).join(" and ")}${info.bonus.right ? " correctly!" : "."}</p>` : "";
    const evolvedHtml = evolved.length
      ? `<p class="album-done">${evolved.length === 1 ? "A card evolved!" : `${evolved.length} cards evolved!`} ${evolved.map((p) => `<b lang="${IslandLang.code}">${esc(p.word)}</b>${stageName[p.stage] ? ` is now ${stageName[p.stage]}` : ""}`).join(", ")}</p>` : "";
    const practisedOnly = (info.practised || []).filter((p) => p && !p.evolved);
    const practisedHtml = practisedOnly.length
      ? `<p class="sheet-sub">Practised: ${practisedOnly.map((p) => `<b lang="${IslandLang.code}">${esc(p.word)}</b>`).join(", ")}</p>` : "";
    const after = info.album ? IslandCards.albumInfo(info.album) : null;
    const albumHtml = after && after.total ? `<p class="sheet-sub">${esc(after.name)} album: ${after.have} / ${after.total} cards</p>` : "";
    const zoneDone = info.before && after && info.before.zoneHave < info.before.zoneTotal && after.zoneTotal > 0 && after.zoneHave >= after.zoneTotal;
    IslandUI.openSheet(
      `${IslandUI.head(zone ? zone.name : "Mini-game", zone ? zone.accent : "#8190a8")}
       <h2 class="sheet-title">${info.total ? `${info.score} / ${info.total}` : "Done"}</h2>
       <p class="sheet-sub">${esc(info.title)}${info.note ? ` · ${esc(info.note)}` : ""}</p>
       <p class="sheet-sub">${msg}</p>
       ${earned ? `<p class="reward-line">${earned}</p>` : ""}
       ${info.levelUps ? '<p class="album-done">Level up! Check your profile.</p>' : ""}
       ${cardsHtml}
       ${dupeHtml}
       ${noCards}
       ${bonusHtml}
       ${evolvedHtml}
       ${practisedHtml}
       ${albumHtml}
       ${zoneDone ? '<p class="album-done">All zone cards collected! Open Collection to claim your badge.</p>' : ""}
       <button class="btn btn-primary btn-block" data-close type="button">Done</button>`
    );
  },
};

IslandHooks.startMiniGame = (landmark) => IslandMiniGames.start(landmark);

// Which building plays a word? Used by a card's Practise button (practice.js).
// The zone words are the words of the built games, so a zone word is practised in the zone's
// building of a game that is built for this language. null = no game yet (an NPC takes it instead).
// A game with a `words` list in ISLAND_MINIGAMES is only picked for the words it asks; one without a list takes any zone word.
IslandHooks.findMiniGame = (word, language) => {
  try {
    const albumId = Object.keys(ALBUM_OF_ZONE).map((z) => ALBUM_OF_ZONE[z]).find((a) => IslandCards.zoneList(a).some((w) => w.w === word));
    if (!albumId) return null;
    const zoneId = ZONE_OF_ALBUM[albumId];
    const levels = ISLAND_LEVELS.filter((l) => l.zone === zoneId).sort((a, b) => a.level - b.level);
    const built = levels.filter((l) => {
      const game = typeof getMiniGameForLevel === "function" ? getMiniGameForLevel(l.level) : null;
      const cfg = game && ISLAND_MINIGAMES[game.id];
      // a game with a word list only counts if it really asks this word
      return cfg && cfg.languages.includes(language) && (!cfg.words || ((cfg.words[language] || {})[albumId] || []).includes(word));
    });
    return built.length ? built[0].level : null;
  } catch (err) { return null; }
};

// Take back a finished game as soon as the page has loaded (waits inside until the island is ready).
window.addEventListener("load", () => { IslandMiniGames.collect(); });

// Leaving the island page for any reason (Collection, Profile, a game...): remember where the player is.
window.addEventListener("pagehide", () => IslandMiniGames.saveReturnSpot());
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") IslandMiniGames.saveReturnSpot(); });