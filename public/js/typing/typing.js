// Typing mini-game ("Monkeytype for Mother Tongue").
//
// Each round is a few real-life sentences. Each sentence is typed once per stage,
// with the help taken away each stage (set in config.js: all shown -> no pinyin ->
// English only). Typing can be done in the mother-tongue script (an IME) or, for
// people without that keyboard, in romanisation (e.g. pinyin) - the switch below the
// input. Which levels run Typing, which language is played, how many stages, the
// wording and the reward all come from config.js, so nothing here is hard-coded.
//
// Low pressure on purpose: wrong characters just turn red, nothing is taken away for
// them. The only thing that lowers the reward is tapping "Show me".
//
// How it plugs in (nothing else on the island had to change):
//   - it wraps IslandHooks.startMiniGame (ui.js) and opens when the level's slot is
//     the Typing mini-game (config.miniGameId); every other level falls through to
//     whatever handled it before
//   - it shows itself in the island's pop-up sheet (IslandUI.openSheet)
//   - when the round ends it calls IslandAPI.completeLevel(level, ratio), which pays
//     coins + XP, opens the way on, counts the streak and ticks the quests
//   - captured words that appear in a sentence count as practised (IslandAPI.recordPractice),
//     and those sentences are picked first
//
// Everything for this feature lives in this folder (public/typing/):
//   config.js (all settings), typingData.js (the sentences), typing.js (this file),
//   typing.css, index.html (a test page). On the island page it loads after ui.js,
//   and config.js + typingData.js load before it.

// ---------- text helpers (plain functions so they are easy to test) ----------
const TYPING_PUNCT = /[\s　，。！？、；：“”‘’「」『』（）《》〈〉…—·,.!?;:'"()\-~]/;

const TypingText = {
  isPunct(ch) { return TYPING_PUNCT.test(ch); },
  // Characters that have to be typed (everything but spaces and punctuation).
  typable(text) { return Array.from(text).filter((c) => !TYPING_PUNCT.test(c)); },
  // "Jīn tiān" -> "jintian": no tones, no spaces, ü counts as u (so "lü", "lu" and "lv" all match).
  toneless(text) {
    return String(text).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ü|v/gi, "u").toLowerCase().replace(/[^a-z]/g, "");
  },
  // The romanisation as a list of toneless syllables, e.g. "jīn tiān." -> ["jin", "tian"].
  syllables(roman) { return String(roman).split(/[\s,.!?;:]+/).map((s) => this.toneless(s)).filter(Boolean); },

  // How each character to type is doing, given what was typed.
  //   "ok" typed right, "bad" typed wrong, "idle" not typed yet
  // Returns { states: [...], done: true when everything matches }.
  // With roman = true the input is romanisation and is matched syllable by syllable.
  compare(sentence, typedValue, roman) {
    const target = this.typable(sentence.target);
    const states = target.map(() => "idle");
    if (!roman) {
      const typed = this.typable(typedValue);
      for (let i = 0; i < Math.min(typed.length, target.length); i += 1) states[i] = typed[i] === target[i] ? "ok" : "bad";
      return { states, done: typed.length === target.length && states.every((s) => s === "ok") };
    }
    const syl = this.syllables(sentence.roman);
    const typed = this.toneless(typedValue);
    let pos = 0;
    for (let i = 0; i < syl.length && i < states.length; i += 1) {
      if (pos >= typed.length) break;
      const piece = typed.slice(pos, pos + syl[i].length);
      if (piece === syl[i]) { states[i] = "ok"; pos += syl[i].length; continue; }
      // still being typed (the last, unfinished syllable) is not a mistake yet
      if (pos + piece.length === typed.length && syl[i].startsWith(piece)) break;
      states[i] = "bad";
      break;
    }
    return { states, done: syl.length === target.length && typed === syl.join("") };
  },
};

// ---------- the game ----------
const IslandTyping = {
  language: null,    // worked out from the page when a round starts (config.resolveLanguage)
  info: {},          // config.languageInfo(language)
  level: null,
  landmark: null,
  sentences: [],
  index: 0,          // which sentence of the round
  stage: 1,          // 1 .. config.stages.length
  hints: 0,          // times "Show me" was used in the whole round
  revealed: false,   // "Show me" used on this prompt
  romanMode: false,  // typing in romanisation instead of the native script
  composing: false,
  locked: false,     // true while a correct answer is celebrated, so it can only count once
  finished: false,
  timer: null,
  leaveArmed: false,
  el: {},

  cfg() { return TYPING_CONFIG; },
  stageCount() { return this.cfg().stages.length; },
  stageDef() { return this.cfg().stages[this.stage - 1] || {}; },

  // ---------- picking sentences ----------
  // Sentences live per language, per zone; the level's zone decides which list, so no
  // level numbers are hard-coded here.
  poolFor(level) {
    const byLanguage = typeof TYPING_SENTENCES !== "undefined" ? TYPING_SENTENCES[this.language] : null;
    if (!byLanguage) return [];
    const zone = typeof getZoneForLevel === "function" ? getZoneForLevel(level) : null;
    const key = zone ? zone.id : level;
    return byLanguage[key] || [];
  },

  capturedWords() {
    try { return typeof IslandCaptured !== "undefined" ? IslandCaptured.rows.map((r) => r.word).filter(Boolean) : []; }
    catch (err) { return []; }
  },

  shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  },

  // A random few, but sentences that use words the player captured come first.
  pick(level) {
    const words = this.capturedWords();
    const uses = (s) => words.some((w) => s.target.includes(w));
    const shuffled = this.shuffle(this.poolFor(level));
    const mine = shuffled.filter(uses);
    const rest = shuffled.filter((s) => !uses(s));
    return [...mine, ...rest].slice(0, this.cfg().sentencesPerRound);
  },

  // ---------- opening and closing ----------
  isTypingLevel(level) {
    if (typeof getMiniGameForLevel !== "function") return false;
    const game = getMiniGameForLevel(level);
    return !!game && game.id === this.cfg().miniGameId;
  },

  start(landmark) {
    this.landmark = landmark;
    this.level = landmark.level;
    this.language = this.cfg().resolveLanguage();
    this.info = this.cfg().languageInfo(this.language);
    this.sentences = this.pick(this.level);
    if (this.sentences.length === 0) return false;
    this.index = 0;
    this.stage = 1;
    this.hints = 0;
    this.finished = false;
    this.romanMode = false;
    if (this.info.romanize) { try { this.romanMode = localStorage.getItem(this.cfg().storageKey) === "1"; } catch (err) { this.romanMode = false; } }
    this.renderShell();
    this.loadPrompt();
    return true;
  },

  close() {
    clearTimeout(this.timer);
    this.locked = true;
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (err) { /* no speech on this device */ }
    IslandUI.close(true);
  },

  // ---------- drawing ----------
  esc(text) { return IslandUI.esc(text); },

  renderShell() {
    const cfg = this.cfg();
    const zone = typeof ISLAND_ZONES !== "undefined" ? ISLAND_ZONES.find((z) => z.id === this.landmark.zone) : null;
    const switchLabel = cfg.t("romanSwitch", { language: this.info.name, roman: this.info.romanName });
    // The landmark sheet we are replacing has a close callback the island needs (it forgets the
    // building the player stood at), so hand it on instead of dropping it.
    const keepOnClose = IslandUI.onClose;
    IslandUI.openSheet(
      `<div class="ty">
         <div class="ty-head">
           <span class="chip" style="--zone:${zone ? zone.accent : cfg.defaultAccent}">${this.esc(this.landmark.name)}</span>
           <button type="button" class="ty-leave" id="ty-leave">${this.esc(cfg.text.quit)}</button>
         </div>
         <div class="ty-progress" aria-hidden="true"><i id="ty-bar"></i></div>
         <div class="ty-meta"><span id="ty-count"></span><span id="ty-stage" class="ty-stage"></span></div>
         <div class="ty-card">
           <div id="ty-english" class="ty-row ty-english"></div>
           <div id="ty-pinyin" class="ty-row ty-pinyin" lang="${this.info.roman}"></div>
           <div id="ty-chinese" class="ty-row ty-chinese" lang="${this.info.script}"></div>
         </div>
         <input type="text" id="ty-input" class="ty-input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" />
         <div id="ty-feedback" class="ty-feedback" role="status" aria-live="polite"></div>
         <div class="ty-actions">
           <button type="button" class="btn btn-outline btn-sm" id="ty-hear">${this.esc(cfg.text.hear)}</button>
           <button type="button" class="btn btn-outline btn-sm" id="ty-show">${this.esc(cfg.text.show)}</button>
         </div>
         <label class="ty-switch" id="ty-switch-wrap"><input type="checkbox" id="ty-pinyin-mode" /> <span>${this.esc(switchLabel)}</span></label>
       </div>`,
      keepOnClose,
      true // locked: only the Quit button closes it, so a stray tap outside does not lose the round
    );
    const $ = (id) => document.getElementById(id);
    this.el = {
      leave: $("ty-leave"), bar: $("ty-bar"), count: $("ty-count"), stage: $("ty-stage"),
      english: $("ty-english"), pinyin: $("ty-pinyin"), chinese: $("ty-chinese"),
      input: $("ty-input"), feedback: $("ty-feedback"), hear: $("ty-hear"), show: $("ty-show"),
      mode: $("ty-pinyin-mode"), switchWrap: $("ty-switch-wrap"), root: document.querySelector(".ty"),
    };
    // The romanisation switch only makes sense for a language that has one.
    this.el.switchWrap.hidden = !this.info.romanize;
    this.el.mode.checked = this.romanMode;
    this.el.leave.addEventListener("click", () => this.onLeave());
    this.el.hear.addEventListener("click", () => this.hear());
    this.el.show.addEventListener("click", () => this.showMe());
    this.el.mode.addEventListener("change", () => this.setRomanMode(this.el.mode.checked));

    // IMEs fire several events per character. While the player is still choosing a
    // character (composing) nothing is checked; the choice is checked when it ends.
    this.el.input.addEventListener("compositionstart", () => { this.composing = true; });
    this.el.input.addEventListener("compositionend", () => { this.composing = false; this.check(); });
    this.el.input.addEventListener("input", () => {
      // Romanisation is plain letters, so check as it goes even if the phone keyboard calls it "composing".
      if (this.romanMode || !this.composing) this.check();
    });
  },

  stageName() { return this.stageDef().name || ""; },

  current() { return this.sentences[this.index]; },

  loadPrompt() {
    clearTimeout(this.timer);
    this.locked = false;
    this.revealed = false;
    this.leaveArmed = false;
    const cfg = this.cfg();
    this.el.leave.textContent = cfg.text.quit;
    const s = this.current();
    const stages = this.stageCount();
    const total = this.sentences.length * stages;
    const done = this.index * stages + (this.stage - 1);

    this.el.bar.style.width = `${Math.round((done / total) * 100)}%`;
    this.el.count.textContent = cfg.t("sentenceCount", { n: this.index + 1, total: this.sentences.length });
    this.el.stage.textContent = cfg.t("stageLabel", { n: this.stage, total: stages, name: this.stageName() });
    this.el.english.textContent = s.english;
    this.el.pinyin.textContent = s.roman || "";

    // One span per target character, so each can be marked right or wrong. Punctuation is shown, never typed.
    // Each character is grouped with the punctuation after it so a "。" can never wrap onto a line by itself.
    this.el.chinese.textContent = "";
    this.spans = [];
    let group = null;
    for (const ch of Array.from(s.target)) {
      const span = document.createElement("span");
      span.textContent = ch;
      if (TypingText.isPunct(ch)) {
        span.className = "ty-punct";
        (group || this.el.chinese).appendChild(span);
      } else {
        span.dataset.ch = ch;
        this.spans.push(span);
        group = document.createElement("span");
        group.className = "ty-grp";
        group.appendChild(span);
        this.el.chinese.appendChild(group);
      }
    }

    this.el.input.value = "";
    this.el.feedback.textContent = "";
    this.el.feedback.className = "ty-feedback";
    const def = this.stageDef();
    this.el.show.hidden = !!(def.showRoman && def.showTarget); // nothing to reveal when all help is shown
    this.applyVisibility();
    this.paint({ states: this.spans.map(() => "idle") }, "");
    this.el.input.focus();
  },

  // Which rows are visible at this stage (or after "Show me").
  applyVisibility() {
    const def = this.stageDef();
    const cfg = this.cfg();
    const showRoman = !!def.showRoman || this.revealed;
    const showTarget = !!def.showTarget || this.revealed;
    this.el.pinyin.style.visibility = showRoman && this.info.roman ? "visible" : "hidden";
    this.el.root.dataset.hideChinese = showTarget ? "0" : "1";
    this.el.input.placeholder = this.romanMode
      ? cfg.t("placeholderRoman", { roman: this.info.romanName })
      : cfg.t("placeholderTarget", { language: this.info.name });
    this.el.input.lang = this.romanMode ? "en" : this.info.script;
  },

  // Colours the characters. When the target is hidden (last stage) the boxes stay empty until a
  // character is typed, so the player gets feedback without the answer being shown.
  paint(result, typedValue) {
    const hidden = this.el.root.dataset.hideChinese === "1";
    const typed = this.romanMode ? [] : TypingText.typable(typedValue);
    const empty = this.cfg().text.emptyBox;
    this.spans.forEach((span, i) => {
      const state = result.states[i] || "idle";
      span.className = `ty-ch ty-${state}`;
      if (!hidden) span.textContent = span.dataset.ch;
      else if (state === "ok") span.textContent = span.dataset.ch;
      else if (state === "bad" && typed[i]) span.textContent = typed[i];
      else span.textContent = empty;
    });
  },

  // ---------- checking ----------
  check() {
    if (this.locked || this.finished) return;
    const cfg = this.cfg();
    const value = this.el.input.value;
    const result = TypingText.compare(this.current(), value, this.romanMode);
    this.paint(result, value);

    if (result.done) {
      // Lock first: two events can arrive for one correct answer (some browsers fire both
      // compositionend and input), and the stage must only move on once.
      this.locked = true;
      this.el.feedback.textContent = this.stage < this.stageCount() ? cfg.text.goodStage : cfg.text.goodLast;
      this.el.feedback.className = "ty-feedback is-good";
      this.spans.forEach((span) => { span.className = "ty-ch ty-ok"; span.textContent = span.dataset.ch; });
      this.timer = setTimeout(() => this.advance(), cfg.advanceDelay);
      return;
    }
    // Friendly nudge once they have typed enough characters but something is off.
    const enough = this.romanMode ? TypingText.toneless(value).length >= TypingText.syllables(this.current().roman).join("").length
      : TypingText.typable(value).length >= this.spans.length;
    const anyBad = result.states.includes("bad");
    this.el.feedback.textContent = enough || anyBad ? cfg.text.nudge : "";
    this.el.feedback.className = "ty-feedback";
  },

  advance() {
    if (this.stage < this.stageCount()) {
      this.stage += 1;
    } else {
      this.stage = 1;
      this.index += 1;
      if (this.index >= this.sentences.length) { this.finish(); return; }
    }
    this.loadPrompt();
  },

  // ---------- helpers on the screen ----------
  hear() {
    const s = this.current();
    if (typeof speakWord === "function") { try { window.speechSynthesis.cancel(); speakWord(s.target, this.language); } catch (err) { /* no speech on this device */ } }
    this.el.input.focus();
  },

  // Reveals the answer for this prompt. The player still has to type it, but the reward drops a little.
  showMe() {
    if (this.revealed || this.locked) return;
    this.revealed = true;
    this.hints += 1;
    this.applyVisibility();
    this.paint(TypingText.compare(this.current(), this.el.input.value, this.romanMode), this.el.input.value);
    this.el.show.hidden = true;
    this.el.input.focus();
  },

  setRomanMode(on) {
    this.romanMode = on;
    try { localStorage.setItem(this.cfg().storageKey, on ? "1" : "0"); } catch (err) { /* private mode: just not remembered */ }
    this.el.input.value = "";
    this.applyVisibility();
    this.paint({ states: this.spans.map(() => "idle") }, "");
    this.el.input.focus();
  },

  // Quit needs a second tap, so a slip does not throw away a round.
  onLeave() {
    const cfg = this.cfg();
    if (this.finished || this.leaveArmed) { this.close(); return; }
    this.leaveArmed = true;
    this.el.leave.textContent = cfg.text.quitConfirm;
    setTimeout(() => { if (this.el.leave) { this.leaveArmed = false; if (!this.finished) this.el.leave.textContent = cfg.text.quit; } }, 2500);
  },

  // ---------- the end ----------
  // 1 for a clean round; each "Show me" takes a little off (the island turns it into a payout share).
  ratio() { return Math.max(0, 1 - this.hints * this.cfg().hintPenalty); },

  async finish() {
    this.finished = true;
    this.locked = true;
    const cfg = this.cfg();
    const ratio = this.ratio();
    let gain = "";
    try {
      // what this round is worth, worked out before it is paid (paying counts the play)
      const pay = typeof IslandEconomy !== "undefined" ? IslandEconomy.miniPayout(this.level, ratio) : null;
      if (pay) gain = [pay.coins ? cfg.t("gainCoins", { n: pay.coins }) : "", pay.xp ? cfg.t("gainXp", { n: pay.xp }) : ""].filter(Boolean).join(cfg.text.gainJoin);
    } catch (err) { /* the numbers are only a preview */ }

    this.showDone(gain);

    try { if (window.IslandAPI && IslandAPI.completeLevel) await IslandAPI.completeLevel(this.level, ratio); }
    catch (err) { console.error("Typing: could not complete the level.", err); }

    // Captured words that were in the sentences count as practised.
    const used = this.capturedWords().filter((w) => this.sentences.some((s) => s.target.includes(w)));
    if (used.length && window.IslandAPI && IslandAPI.recordPractice) {
      try { await IslandAPI.recordPractice(used); } catch (err) { console.warn("Typing: could not record practice.", err && err.message); }
    }
  },

  showDone(gain) {
    const cfg = this.cfg();
    const sheet = document.querySelector(".ty");
    if (!sheet) return;
    const clean = this.hints === 0;
    const sub = clean ? cfg.text.doneClean : cfg.t("doneHints", { n: this.hints, times: this.hints === 1 ? "time" : "times" });
    sheet.innerHTML = `
      <div class="ty-done">
        <div class="ty-done-emoji" aria-hidden="true">🎉</div>
        <h2 class="sheet-title">${this.esc(cfg.text.doneTitle)}</h2>
        <p class="sheet-sub">${this.esc(sub)}</p>
        ${gain ? `<p class="ty-gain">${this.esc(gain)}</p>` : ""}
        <div class="ty-done-list">${this.sentences.map((s) => `<div><span lang="${this.info.script}">${this.esc(s.target)}</span><small>${this.esc(s.english)}</small></div>`).join("")}</div>
        <button type="button" class="btn btn-primary btn-block" id="ty-done-close">${this.esc(cfg.text.doneBack)}</button>
        <button type="button" class="btn btn-outline btn-block" id="ty-again" style="margin-top:10px">${this.esc(cfg.text.doneAgain)}</button>
      </div>`;
    document.getElementById("ty-done-close").addEventListener("click", () => this.close());
    document.getElementById("ty-again").addEventListener("click", () => this.start(this.landmark));
  },
};

// ---------- plug into the island ----------
// Keep whatever handled startMiniGame before us (other mini-games), so they keep working.
(function connectTyping() {
  if (typeof IslandHooks === "undefined") return;
  const previous = IslandHooks.startMiniGame;
  IslandHooks.startMiniGame = function (landmark) {
    if (IslandTyping.isTypingLevel(landmark.level) && IslandTyping.start(landmark)) return true;
    return typeof previous === "function" ? previous.call(this, landmark) : false;
  };
})();