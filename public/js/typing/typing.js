// Typing mini-game ("Monkeytype for Mother Tongue"). Runs on its own page, pages/typing/typing.html,
// the same way Pronunciation and Composition do.
//
// Each round is FIVE questions in random order, one sentence each, typed once. The help fades across the round
// (config.js stagePlan: all shown -> no pinyin -> English only). When the player has captured at least two words
// that fit the zone, ONE of the five is a bonus sentence built from those words and a few filler words
// ("I often go to the park and the library.") and the other four are normal; otherwise all five are normal.
// Typing can be done in the mother-tongue script (an IME) or, for people without that keyboard, in
// romanisation (e.g. pinyin) - the switch below the input. Wrong characters just turn red and nothing is taken
// away for them. The only thing that counts against a question is tapping "Show me".
//
// The island opens this page as  typing.html?zone=2&level=1&island=5&lang=zh[&focus=<word>]
//   zone    = the zone (1-3). The sentences are random ones from that zone's bank, whatever "level" it is.
//   island  = the level's number on the island (1-9). Only present when the island opened the page: then the
//             island pays the reward (coins, XP, cards) when the player goes back to it.
//   lang    = zh / ms / ta
//   focus   = a zone word (a card's Practise button): one sentence with this word is always asked.
//
// Result handed back to the island (same contract as the other games), saved in localStorage
// ["island:minigame-result"] and also on the island's address (?mg=...):
//   { userId, level, language, ratio, total, words, right, bonus, at }
//   total = 5 questions                 ratio = questions done with no "Show me" / total
//   words = zone words of the clean normal questions (they can win cards)
//   right = those words plus the captured words used in clean questions (owned cards for them get +1 practice)
//   bonus = { words, meanings, right } when a bonus question was asked, else null
//
// Files: js/typing/config.js (all settings and wording), typingData.js (fallback sentences), save.js (Supabase),
// typing.js (this file), css/typing/typing.css. The sentence bank is the typing_questions table.

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
const IslandTyping = (() => {
  const cfg = TYPING_CONFIG;
  const $ = (id) => document.getElementById(id);

  const params = new URLSearchParams(location.search);
  const zoneNum = [1, 2, 3].includes(Number(params.get("zone"))) ? Number(params.get("zone")) : 1;
  const zone = cfg.zones[zoneNum];
  const islandLevel = Number(params.get("island")) || 0;
  const focusWord = params.get("focus") || "";
  const ISLAND_PAGE = "../island/island.html";
  const LOGIN_PAGE = "../auth/login.html";
  const RESULT_KEY = "island:minigame-result";   // read by js/island/miniGames.js

  const G = {
    user: null,
    language: cfg.defaultLanguage,
    info: {},
    sentences: [],
    captured: [],
    index: 0,            // which question of the round (0-4)
    stageResults: [],    // one per question: "ok" = no "Show me", "weak" = "Show me" was used
    hints: 0,            // times "Show me" was used in the whole round
    revealed: false,     // "Show me" used on this prompt
    romanMode: false,    // typing in romanisation instead of the native script
    composing: false,
    locked: false,       // true while a correct answer is celebrated, so it can only count once
    finished: false,
    ready: false,        // a round is on screen (so leaving needs a second tap)
    timer: null,
    leaveArmed: false,
    streakPromise: null, // the daily streak is counted at the first correct answer
    returnUrl: ISLAND_PAGE,
    spans: [],
    el: {},
  };

  // How much help question n gets: the bonus always uses cfg.bonusStage, the rest follow cfg.stagePlan.
  const stageIdx = (i = G.index) => {
    const q = G.sentences[i];
    const k = q && q.bonus ? cfg.bonusStage : (cfg.stagePlan[i] !== undefined ? cfg.stagePlan[i] : cfg.stagePlan[cfg.stagePlan.length - 1]);
    return Math.min(Math.max(k || 0, 0), cfg.stages.length - 1);
  };
  const stageDef = () => cfg.stages[stageIdx()] || {};
  const current = () => G.sentences[G.index];
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shuffle = (list) => {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const position = () => G.index;

  // ---------- picking sentences ----------
  // A random few. Sentences this player has not seen yet come first (then the ones seen longest ago), and
  // within each group sentences that use a word the player captured come first. A card's Practise button
  // (?focus=word) always gets one sentence with that word. The order of play is random.
  function pick(bank, count) {
    const seenKey = `typing:seen:${G.user ? G.user.id : "guest"}:${G.language}:${zoneNum}`;
    let seenOrder = [];
    try { seenOrder = JSON.parse(localStorage.getItem(seenKey)) || []; } catch (err) { /* nothing remembered */ }
    const rank = new Map(seenOrder.map((t, i) => [t, i]));
    const uses = (s) => G.captured.some((w) => s.target.includes(w));
    const unseen = shuffle(bank.filter((s) => !rank.has(s.target)));
    const seen = shuffle(bank.filter((s) => rank.has(s.target))).sort((a, b) => rank.get(a.target) - rank.get(b.target));
    const ordered = [...unseen.filter(uses), ...unseen.filter((s) => !uses(s)), ...seen.filter(uses), ...seen.filter((s) => !uses(s))];
    let chosen = ordered.slice(0, count);
    const hasFocus = (s) => (s.words || []).includes(focusWord) || s.target.includes(focusWord);
    if (focusWord && chosen.length && !chosen.some(hasFocus)) {
      const withWord = bank.filter(hasFocus);
      if (withWord.length) chosen[Math.floor(Math.random() * chosen.length)] = withWord[Math.floor(Math.random() * withWord.length)];
    }
    chosen = shuffle(chosen);
    try {
      const keys = chosen.map((s) => s.target);
      localStorage.setItem(seenKey, JSON.stringify(seenOrder.filter((t) => !keys.includes(t)).concat(keys).slice(-400)));
    } catch (err) { /* private browsing: no memory, still random */ }
    return chosen;
  }

  // ---------- the bonus question ----------
  // Splits a romanisation into one syllable per character ("gōngyuán" -> "gōng yuán"). Returns null when it can't.
  const SYLLABLE = /^(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?[aeiouv]+(?:ng|n|r)?$/;
  function splitRoman(roman, chars) {
    const parts = String(roman).trim().split(/\s+/).filter(Boolean);
    if (parts.length === chars) return parts;
    const flat = parts.join("");
    const letters = Array.from(flat);
    const base = letters.map((c) => TypingText.toneless(c) || "?");
    const go = (pos, left) => {
      if (left === 0) return pos === letters.length ? [] : null;
      for (let len = Math.min(6, letters.length - pos - (left - 1)); len >= 1; len -= 1) {
        if (!SYLLABLE.test(base.slice(pos, pos + len).join(""))) continue;
        const rest = go(pos + len, left - 1);
        if (rest) return [letters.slice(pos, pos + len).join("")].concat(rest);
      }
      return null;
    };
    return go(0, chars);
  }

  // A sentence from the player's captured words: two of them dropped into one of the zone's frames
  // (typingData.js TYPING_BONUS_FRAMES). The least practised words are used first. Returns null if it can't be built.
  function buildBonus(rows) {
    const frames = typeof TYPING_BONUS_FRAMES !== "undefined" && TYPING_BONUS_FRAMES[G.language] ? TYPING_BONUS_FRAMES[G.language][zoneNum] : null;
    if (!frames || !frames.length || !rows || rows.length < cfg.bonusMinWords) return null;
    const usable = [];
    rows.forEach((row) => {
      const syl = splitRoman(row.romanization, Array.from(row.word).length);
      if (syl) usable.push({ word: row.word, roman: syl.join(" "), meaning: row.simpleMeaning || row.english_meaning, used: Number(row.usage_count) || 0 });
    });
    if (usable.length < cfg.bonusMinWords) return null;
    const two = shuffle(usable).sort((a, b) => a.used - b.used).slice(0, 2);
    const [a, b] = two;
    const frame = frames[Math.floor(Math.random() * frames.length)];
    const noun = (w) => (zoneNum === 1 ? "a " : "") + w.meaning;
    let target = ""; let roman = [];
    frame.parts.forEach((p) => {
      if (p === "A") { target += a.word; roman.push(a.roman); }
      else if (p === "B") { target += b.word; roman.push(b.roman); }
      else { target += p.t; roman.push(p.r); }
    });
    const english = frame.en.replace(/the \{([ab])\}/gi, (m, k) => `the ${(k.toLowerCase() === "a" ? a : b).meaning}`)
      .replace(/\{([ab])\}/gi, (m, k) => noun(k.toLowerCase() === "a" ? a : b));
    return {
      english: english.charAt(0).toUpperCase() + english.slice(1),
      roman: roman.join(" ").replace(/\s+([,.!?])/g, "$1"),
      target, words: [], bonus: true,
      bonusWords: [a.word, b.word], bonusMeanings: [a.meaning, b.meaning],
    };
  }

  // ---------- drawing ----------
  // One segment per (sentence, stage): green = done with no "Show me", pale amber = done after "Show me", orange = now.
  function renderProgress() {
    const bar = G.el.progress;
    if (!bar) return;
    bar.replaceChildren();
    const total = G.sentences.length;
    for (let i = 0; i < total; i += 1) {
      const seg = document.createElement("span");
      if (G.stageResults[i]) seg.className = G.stageResults[i] === "ok" ? "is-done" : "is-weak";
      else if (i === position() && !G.finished) seg.className = "is-current";
      if (G.sentences[i] && G.sentences[i].bonus) seg.classList.add("is-bonus");
      bar.appendChild(seg);
    }
  }

  function showError(text) {
    G.ready = false;
    $("game").hidden = true;
    $("done").hidden = true;
    G.el.notice.textContent = text;
    G.el.notice.hidden = false;
    G.el.counter.textContent = "";
  }

  function loadPrompt() {
    clearTimeout(G.timer);
    G.locked = false;
    G.revealed = false;
    const s = current();
    G.el.counter.textContent = cfg.t("counter", { n: G.index + 1, total: G.sentences.length });
    G.el.stage.textContent = s.bonus ? cfg.text.bonusLabel : cfg.t("stageLabel", { name: stageDef().name || "" });
    G.el.english.textContent = s.english;
    G.el.pinyin.textContent = s.roman || "";

    // One span per target character, so each can be marked right or wrong. Punctuation is shown, never typed.
    // Each character is grouped with the punctuation after it so a "。" can never wrap onto a line by itself.
    G.el.chinese.textContent = "";
    G.spans = [];
    let group = null;
    for (const ch of Array.from(s.target)) {
      const span = document.createElement("span");
      span.textContent = ch;
      if (TypingText.isPunct(ch)) {
        span.className = "ty-punct";
        (group || G.el.chinese).appendChild(span);
      } else {
        span.dataset.ch = ch;
        G.spans.push(span);
        group = document.createElement("span");
        group.className = "ty-grp";
        group.appendChild(span);
        G.el.chinese.appendChild(group);
      }
    }

    G.el.input.value = "";
    setFeedback("");
    const def = stageDef();
    G.el.show.hidden = !!(def.showRoman && def.showTarget); // nothing to reveal when all help is shown
    applyVisibility();
    paint({ states: G.spans.map(() => "idle") }, "");
    renderProgress();
    G.el.input.focus();
  }

  // Which rows are visible at this stage (or after "Show me").
  function applyVisibility() {
    const def = stageDef();
    const showRoman = !!def.showRoman || G.revealed;
    const showTarget = !!def.showTarget || G.revealed;
    G.el.pinyin.style.visibility = showRoman && G.info.roman ? "visible" : "hidden";
    G.el.root.dataset.hideChinese = showTarget ? "0" : "1";
    G.el.input.placeholder = G.romanMode
      ? cfg.t("placeholderRoman", { roman: G.info.romanName })
      : cfg.t("placeholderTarget", { language: G.info.name });
    G.el.input.lang = G.romanMode ? "en" : G.info.script;
  }

  // Colours the characters. When the target is hidden (last stage) the boxes stay empty until a
  // character is typed, so the player gets feedback without the answer being shown.
  function paint(result, typedValue) {
    const hidden = G.el.root.dataset.hideChinese === "1";
    const typed = G.romanMode ? [] : TypingText.typable(typedValue);
    G.spans.forEach((span, i) => {
      const state = result.states[i] || "idle";
      span.className = `ty-ch ty-${state}`;
      if (!hidden) span.textContent = span.dataset.ch;
      else if (state === "ok") span.textContent = span.dataset.ch;
      else if (state === "bad" && typed[i]) span.textContent = typed[i];
      else span.textContent = cfg.text.emptyBox;
    });
  }

  function setFeedback(text, good) {
    G.el.feedback.textContent = text || "";
    G.el.feedback.className = "ty-feedback" + (good ? " is-good" : "");
  }

  // ---------- checking ----------
  function check() {
    if (G.locked || G.finished) return;
    const value = G.el.input.value;
    const result = TypingText.compare(current(), value, G.romanMode);
    paint(result, value);

    if (result.done) {
      // Lock first: two events can arrive for one correct answer (some browsers fire both
      // compositionend and input), and the stage must only move on once.
      G.locked = true;
      G.stageResults[position()] = G.revealed ? "weak" : "ok";
      if (!G.streakPromise) G.streakPromise = countTypingStreak(G.user && G.user.id);
      renderProgress();
      setFeedback(cfg.text.good, true);
      G.spans.forEach((span) => { span.className = "ty-ch ty-ok"; span.textContent = span.dataset.ch; });
      G.timer = setTimeout(advance, cfg.advanceDelay);
      return;
    }
    // Friendly nudge once they have typed enough characters but something is off.
    const enough = G.romanMode ? TypingText.toneless(value).length >= TypingText.syllables(current().roman).join("").length
      : TypingText.typable(value).length >= G.spans.length;
    setFeedback(enough || result.states.includes("bad") ? cfg.text.nudge : "");
  }

  function advance() {
    G.index += 1;
    if (G.index >= G.sentences.length) { finish(); return; }
    loadPrompt();
  }

  // ---------- helpers on the screen ----------
  // Reads the sentence aloud with the browser's built-in text-to-speech. This only makes a sound if the
  // player's device has a voice for the language, so when it can't, we say so instead of failing silently.
  // Voices load asynchronously and cancel()+speak() in the same tick is dropped by some browsers; both handled.
  function hear() {
    const s = current();
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") { setFeedback(cfg.text.noSpeech); return; }
    const code = G.info.speak || "";
    const base = code.slice(0, 2).toLowerCase();

    let fired = false;
    const speak = () => {
      if (fired) return;
      fired = true;
      const voices = synth.getVoices() || [];
      const voice = base ? voices.find((v) => v.lang && v.lang.toLowerCase().replace("_", "-").startsWith(base)) : null;
      // Voices are listed but none match this language: nothing useful would play.
      if (base && voices.length && !voice) { setFeedback(cfg.t("noVoice", { language: G.info.name })); return; }
      const utter = new SpeechSynthesisUtterance(s.target);
      if (code) utter.lang = code;
      try { if (voice) utter.voice = voice; } catch (err) { /* keep the default voice */ }
      utter.rate = 0.9;
      utter.onerror = () => setFeedback(cfg.t("noVoice", { language: G.info.name }));
      if (synth.speaking) { synth.cancel(); setTimeout(() => synth.speak(utter), 60); }
      else synth.speak(utter);
    };

    // getVoices() is often empty on the first click; wait for the list once, with a short timeout as a
    // backstop for browsers that never fire the event.
    if ((synth.getVoices() || []).length === 0) {
      const prev = synth.onvoiceschanged;
      synth.onvoiceschanged = () => { synth.onvoiceschanged = prev || null; speak(); };
      setTimeout(speak, 300);
    } else {
      speak();
    }
    G.el.input.focus();
  }

  // Reveals the answer for this prompt. The player still has to type it, but the sentence no longer counts as clean.
  function showMe() {
    if (G.revealed || G.locked) return;
    G.revealed = true;
    G.hints += 1;
    applyVisibility();
    paint(TypingText.compare(current(), G.el.input.value, G.romanMode), G.el.input.value);
    G.el.show.hidden = true;
    G.el.input.focus();
  }

  function setRomanMode(on) {
    G.romanMode = on;
    try { localStorage.setItem(cfg.storageKey, on ? "1" : "0"); } catch (err) { /* private mode: just not remembered */ }
    G.el.input.value = "";
    applyVisibility();
    paint({ states: G.spans.map(() => "idle") }, "");
    G.el.input.focus();
  }

  // Leaving mid-round needs a second tap, so a slip does not throw away a round.
  function leave() {
    if (!G.ready || G.finished || G.leaveArmed) {
      try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (err) { /* no speech on this device */ }
      location.href = ISLAND_PAGE;
      return;
    }
    G.leaveArmed = true;
    setFeedback(cfg.text.quitConfirm);
    setTimeout(() => { G.leaveArmed = false; if (!G.finished && !G.locked) setFeedback(""); }, cfg.quitArmMs);
  }

  // ---------- the end ----------
  // Which questions were typed without "Show me".
  function cleanFlags() {
    return G.sentences.map((s, i) => G.stageResults[i] === "ok");
  }

  async function finish() {
    G.finished = true;
    G.locked = true;
    G.ready = false;
    const flags = cleanFlags();
    const total = G.sentences.length;
    const right = flags.filter(Boolean).length;
    const clean = G.sentences.filter((s, i) => flags[i] && !s.bonus);
    const bonusQ = G.sentences.find((s, i) => s.bonus && flags[i]);
    const bonusAsked = G.sentences.find((s) => s.bonus);
    renderProgress();
    showDone(flags, right, total);

    // Hand the result to the island. It pays coins, XP and cards with its own rules (less each time a level
    // is replayed) and marks the level as done.
    if (islandLevel && G.user) {
      const zoneWords = [];
      clean.forEach((s) => (s.words || []).forEach((w) => { if (!zoneWords.includes(w)) zoneWords.push(w); }));
      const capturedUsed = G.captured.filter((w) => clean.some((s) => s.target.includes(w)));
      const bonusRight = bonusQ ? bonusQ.bonusWords : [];
      const bonus = bonusAsked ? { words: bonusAsked.bonusWords, meanings: bonusAsked.bonusMeanings, right: bonusRight } : null;
      const result = {
        userId: G.user.id,
        level: islandLevel,
        language: G.language,
        ratio: total ? right / total : 0,
        total,
        words: zoneWords,
        // zone words and captured words from clean sentences: owned cards for them get +1 practice (they can evolve)
        right: zoneWords.concat(capturedUsed.concat(bonusRight).filter((w, i, all) => !zoneWords.includes(w) && all.indexOf(w) === i)),
        bonus,
        at: Date.now(),
      };
      // Two ways to hand it over, in case one is blocked: saved on this device, and on the island's address.
      try { localStorage.setItem(RESULT_KEY, JSON.stringify(result)); }
      catch (err) { console.error("Typing: could not save the result for the island.", err); }
      G.returnUrl = ISLAND_PAGE + "?mg=" + encodeURIComponent(JSON.stringify(result));
    }
    $("doneBack").disabled = false;

    const streak = await G.streakPromise;
    if (streak && streak.changed) {
      const p = $("doneStreak");
      p.textContent = streak.currentStreak === 1 ? "Day 1 of your streak!" : `${streak.currentStreak} day streak!`;
      p.hidden = false;
    }
  }

  function showDone(flags, right, total) {
    $("game").hidden = true;
    $("done").hidden = false;
    G.el.counter.textContent = cfg.text.counterDone;
    $("doneSub").textContent = right === total ? cfg.text.doneClean : cfg.t("doneSome", { n: right, total });
    $("doneList").innerHTML = G.sentences.map((s, i) =>
      `<div><span lang="${esc(G.info.script)}">${flags[i] ? "✓ " : ""}${esc(s.target)}</span><small>${s.bonus ? esc(cfg.text.bonusTag) + " · " : ""}${esc(s.english)}</small></div>`).join("");
    $("doneBack").textContent = islandLevel ? cfg.text.doneIsland : cfg.text.donePlain;
    $("doneBack").disabled = true;   // enabled once the result is saved for the island
    $("doneAgain").hidden = !!islandLevel;
  }

  // ---------- start ----------
  async function start() {
    G.el = {
      progress: $("progress"), counter: $("counter"), stage: $("stageLabel"), notice: $("notice"),
      english: $("ty-english"), pinyin: $("ty-pinyin"), chinese: $("ty-chinese"),
      input: $("ty-input"), feedback: $("ty-feedback"), hear: $("ty-hear"), show: $("ty-show"),
      mode: $("ty-pinyin-mode"), switchWrap: $("ty-switch-wrap"), root: $("game"),
    };
    $("backBtn").addEventListener("click", leave);
    $("doneBack").addEventListener("click", () => { location.href = G.returnUrl; });
    $("doneAgain").addEventListener("click", () => location.reload());
    G.el.hear.addEventListener("click", hear);
    G.el.show.addEventListener("click", showMe);
    G.el.mode.addEventListener("change", () => setRomanMode(G.el.mode.checked));
    // IMEs fire several events per character. While the player is still choosing a character (composing)
    // nothing is checked; the choice is checked when it ends.
    G.el.input.addEventListener("compositionstart", () => { G.composing = true; });
    G.el.input.addEventListener("compositionend", () => { G.composing = false; check(); });
    G.el.input.addEventListener("input", () => {
      // Romanisation is plain letters, so check as it goes even if the phone keyboard calls it "composing".
      if (G.romanMode || !G.composing) check();
    });
    // The player has to type the answer themselves, so pasting or dragging the shown text
    // into the box is blocked (covers Ctrl/Cmd-V, right-click and middle-click paste, and drag-drop).
    ["paste", "drop"].forEach((evt) => G.el.input.addEventListener(evt, (e) => { e.preventDefault(); setFeedback(cfg.text.noPaste); }));

    $("zonePill").textContent = `ZONE ${zoneNum}  ${zone.name}`;
    $("zonePill").style.background = zone.color;
    G.el.counter.textContent = cfg.text.loading;

    try {
      G.user = typeof getCurrentUser === "function" ? await getCurrentUser() : null;   // js/shared/auth.js
    } catch (err) { G.user = null; }
    if (!G.user) { location.replace(LOGIN_PAGE); return; }

    // Language: the island passes it; otherwise the one saved for this player.
    let lang = params.get("lang");
    if (!cfg.languages[lang]) {
      try { lang = localStorage.getItem("journeyLanguage:" + G.user.id); } catch (err) { lang = null; }
    }
    G.language = cfg.languages[lang] ? lang : cfg.defaultLanguage;
    G.info = cfg.languageInfo(G.language);
    $("langBadge").textContent = G.info.label;
    G.el.pinyin.setAttribute("lang", G.info.roman);
    G.el.chinese.setAttribute("lang", G.info.script);

    // The romanisation switch only makes sense for a language that has one.
    G.el.switchWrap.hidden = !G.info.romanize;
    $("ty-switch-text").textContent = cfg.t("romanSwitch", { language: G.info.name, roman: G.info.romanName });
    if (G.info.romanize) { try { G.romanMode = localStorage.getItem(cfg.storageKey) === "1"; } catch (err) { G.romanMode = false; } }
    G.el.mode.checked = G.romanMode;

    // The bank comes from the typing_questions table; typingData.js is the fallback.
    let bank = await loadTypingBank(G.language, zoneNum);
    if (!bank) {
      const local = typeof TYPING_SENTENCES !== "undefined" ? TYPING_SENTENCES[G.language] : null;
      bank = (local && local[zone.id]) || [];
    }
    if (!bank.length) { showError(cfg.text.noSentences); return; }

    G.captured = await loadTypingCapturedWords(G.user.id, G.language);
    // Bonus: only when enough captured words fit this zone. Then it is 4 normal questions + the bonus at a random place.
    const bonusRows = await loadTypingBonusWords(G.user.id, G.language, zoneNum);
    const bonus = buildBonus(bonusRows);
    G.sentences = pick(bank, cfg.questionsPerRound - (bonus ? 1 : 0));
    if (bonus) G.sentences.splice(Math.floor(Math.random() * (G.sentences.length + 1)), 0, bonus);
    G.ready = true;
    $("game").hidden = false;
    loadPrompt();
  }

  return { start, TypingText };
})();

IslandTyping.start().catch((err) => {
  console.error("Typing: could not start.", err);
  const n = document.getElementById("notice");
  if (n) { n.textContent = TYPING_CONFIG.text.loadFailed; n.hidden = false; }
  const c = document.getElementById("counter");
  if (c) c.textContent = "";
});