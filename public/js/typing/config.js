// Every tunable for the Typing mini-game, in one place, so typing.js has no magic
// numbers or strings and nothing is hard-coded to one language. Change the game,
// its wording or add a language here, not in the game code.
//
// Loaded first on pages/typing/typing.html (then typingData.js, save.js, typing.js).

const TYPING_CONFIG = {
  // Used only when the page address and the saved choice do not say which language is being practised.
  defaultLanguage: "zh",

  questionsPerRound: 5,                // each question is one sentence, typed once
  bonusMinWords: 2,                    // captured words (that fit the zone) needed for the bonus question; it replaces one of the five
  bonusStage: 0,                       // the bonus sentence is always typed with this stage's help (0 = everything shown)
  advanceDelay: 900,                   // ms to enjoy a correct answer before the next prompt
  storageKey: "island.typing.roman",   // remembers the "type romanization" switch on this device
  quitArmMs: 2500,                     // how long "tap back again to quit" stays armed

  // How much help is left on screen. The help fades across the round: question n uses stage stagePlan[n - 1]
  // (one entry per question). Add, remove or reorder stages here and the game follows.
  //   showRoman  show the romanization row (pinyin for Chinese)
  //   showTarget show the mother-tongue sentence itself
  stagePlan: [0, 0, 1, 1, 2],
  stages: [
    { name: "Training wheels", showRoman: true, showTarget: true },
    { name: "No pinyin", showRoman: false, showTarget: true },
    { name: "English only", showRoman: false, showTarget: false },
  ],

  // How each language is shown and whether it can be typed in romanization.
  //   name      shown to the player and used in the wording below
  //   label     the small badge in the top bar
  //   script    BCP-47 tag for the mother-tongue text (sets the right font/shaping)
  //   roman     BCP-47 tag for the romanization row
  //   romanName what the romanization is called ("pinyin")
  //   romanize  false hides the "type romanization" switch (e.g. Malay is already Latin)
  //   speak     BCP-47 tag "Hear it" uses to pick a voice; audio only plays if the
  //             player's device has a voice for it (browser built-in text-to-speech)
  languages: {
    zh: { name: "Chinese", label: "中文", script: "zh-Hans", roman: "zh-Latn-pinyin", romanName: "pinyin", romanize: true, speak: "zh-CN" },
    ms: { name: "Malay", label: "Melayu", script: "ms", romanize: false, speak: "ms-MY" },
    ta: { name: "Tamil", label: "தமிழ்", script: "ta", roman: "ta-Latn", romanName: "romanised Tamil", romanize: true, speak: "ta-IN" },
  },

  // The three zones, in the order the island numbers them (1-3). id = the album / zone id used in the data.
  zones: {
    1: { id: "neighbourhood", name: "NEIGHBOURHOOD", color: "#2e9e5b" },
    2: { id: "hawker-centre", name: "HAWKER CENTRE", color: "#c2611a" },
    3: { id: "public-transport", name: "PUBLIC TRANSPORT", color: "#2f6fd6" },
  },

  // All on-screen wording. {placeholders} are filled from the current language.
  text: {
    loading: "Loading sentences...",
    noSentences: "There are no typing sentences in this language yet.",
    loadFailed: "Could not start typing practice.",
    back: "Back to the island",
    quitConfirm: "Tap back again to quit",
    hear: "Hear it",
    show: "Show me",
    romanSwitch: "No {language} keyboard? Type {roman} instead",
    placeholderRoman: "Type the {roman} (no tones needed)...",
    placeholderTarget: "Type it in {language}...",
    good: "Nice!",
    nudge: "Almost! Fix the red ones and keep going.",
    noPaste: "No pasting — type it out yourself to practise.",
    noVoice: "No {language} voice on this device, so there's nothing to play.",
    noSpeech: "This browser can't read it aloud.",
    counter: "Typing · Question {n} of {total}",
    counterDone: "Typing · done",
    stageLabel: "{name}",
    bonusLabel: "Bonus · built from your captured words",
    bonusTag: "Bonus",
    emptyBox: "＿",
    doneTitle: "Well done!",
    doneClean: "No hints needed. That's real fluency.",
    doneSome: "{n} of {total} questions with no \"Show me\". Those are the ones that count towards cards.",
    doneIsland: "Collect reward on the island →",
    donePlain: "Back to the island →",
    doneAgain: "Play again",
  },

  // ---------- helpers ----------
  // The settings for a language, with safe fallbacks so an unlisted code still works.
  languageInfo(code) {
    const info = this.languages[code] || {};
    return { name: info.name || code, label: info.label || code, script: info.script || code, roman: info.roman || "", romanName: info.romanName || "romanisation", romanize: info.romanize !== false, speak: info.speak || code };
  },

  // Fills {name} style placeholders in a text key.
  t(key, vars = {}) {
    return String(this.text[key] || "").replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m));
  },
};