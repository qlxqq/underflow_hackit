// Every tunable for the Typing mini-game, in one place, so game.js has no magic
// numbers or strings and nothing is hard-coded to one language. Change the game,
// its wording or add a language here, not in the game code.
//
// Loaded before typingData.js and typing.js.

const TYPING_CONFIG = {
  // Which mini-game slot this is. Must match an id in MINI_GAMES (js/journey/levels.js);
  // the level's slot decides which levels run Typing, so level numbers are never listed here.
  miniGameId: "typing",

  // Used only when the page does not say which language is being practised.
  defaultLanguage: "zh",

  sentencesPerRound: 3,
  hintPenalty: 0.15,                   // each "Show me" lowers the payout share by this
  advanceDelay: 900,                   // ms to enjoy a correct answer before the next prompt
  storageKey: "island.typing.roman",   // remembers the "type romanization" switch on this device
  defaultAccent: "#8190a8",            // chip colour when a zone has none

  // The stages each sentence is typed through, in order. Each says what help is
  // left on screen. Add, remove or reorder stages here and the game follows.
  //   showRoman  show the romanization row (pinyin for Chinese)
  //   showTarget show the mother-tongue sentence itself
  stages: [
    { name: "Training wheels", showRoman: true, showTarget: true },
    { name: "No pinyin", showRoman: false, showTarget: true },
    { name: "English only", showRoman: false, showTarget: false },
  ],

  // How each language is shown and whether it can be typed in romanization.
  //   name      shown to the player and used in the wording below
  //   script    BCP-47 tag for the mother-tongue text (sets the right font/shaping)
  //   roman     BCP-47 tag for the romanization row
  //   romanName what the romanization is called ("pinyin")
  //   romanize  false hides the "type romanization" switch (e.g. Malay is already Latin)
  languages: {
    zh: { name: "Chinese", script: "zh-Hans", roman: "zh-Latn-pinyin", romanName: "pinyin", romanize: true },
    ms: { name: "Malay", script: "ms", romanize: false },
    ta: { name: "Tamil", script: "ta", roman: "ta-Latn", romanName: "romanised Tamil", romanize: true },
  },

  // All on-screen wording. {placeholders} are filled from the current language.
  text: {
    quit: "Quit",
    quitConfirm: "Tap again to quit",
    hear: "Hear it",
    show: "Show me",
    romanSwitch: "No {language} keyboard? Type {roman} instead",
    placeholderRoman: "Type the {roman} (no tones needed)...",
    placeholderTarget: "Type it in {language}...",
    goodStage: "Nice! Taking the training wheels off...",
    goodLast: "Perfect!",
    nudge: "Almost! Fix the red ones and keep going.",
    sentenceCount: "Sentence {n} of {total}",
    stageLabel: "Stage {n}/{total} · {name}",
    emptyBox: "＿",
    gainCoins: "+{n} coins",
    gainXp: "+{n} XP",
    gainJoin: " · ",
    doneTitle: "Round complete!",
    doneClean: "No hints needed. That's real fluency.",
    doneHints: "You used \"Show me\" {n} {times}. Try again with fewer for the full reward.",
    doneBack: "Back to the island",
    doneAgain: "Play again",
  },

  // ---------- helpers ----------
  // The settings for a language, with safe fallbacks so an unlisted code still works.
  languageInfo(code) {
    const info = this.languages[code] || {};
    return { name: info.name || code, script: info.script || code, roman: info.roman || "", romanName: info.romanName || "romanisation", romanize: info.romanize !== false };
  },

  // Fills {name} style placeholders in a text key.
  t(key, vars = {}) {
    return String(this.text[key] || "").replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m));
  },

  // Works out which language to practise from whatever the island exposes, with a
  // fallback, so the game never hard-codes a language.
  resolveLanguage() {
    let lang = null;
    try { if (typeof currentLanguage === "string" && currentLanguage) lang = currentLanguage; } catch (err) { /* not on the page yet */ }
    if (!lang) { try { if (typeof IslandCaptured !== "undefined" && IslandCaptured && IslandCaptured.language) lang = IslandCaptured.language; } catch (err) { /* ignore */ } }
    return lang || this.defaultLanguage;
  },
};