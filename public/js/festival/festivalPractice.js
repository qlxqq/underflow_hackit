// Practising a festival (treasure-hunt) card, from the Festival album in the Collection.
// There are no mini-games for these cards, so a practise is the same three steps as opening a gift: type the word, say it,
// then write a sentence with it. Finishing all three adds one use (festival_card_practise): 1 use = Trained, 3 = Mastered.
// Hunt cards have their OWN count; it is not shared with captured or island cards, and they are not used in games or battles.
//
//   FestivalPractice.open({ eventId, word, pinyin, meaning, language, onDone(result) })   result = { usage_count, stage }
//
// Needs festivalPractice styles (festivalCard.css) and the Supabase client. The sentence check uses the get-word-meaning
// Edge Function (mode "sentence"); if it cannot be reached the sentence is let through.

const FestivalPractice = (() => {
  const LANGS = {
    zh: { name: "Chinese", script: "zh-Hans", speak: "zh-CN", roman: "Pinyin" },
    ms: { name: "Malay", script: "ms", speak: "ms-MY", roman: "" },
    ta: { name: "Tamil", script: "ta", speak: "ta-IN", roman: "romanised Tamil" },
  };

  // ---- text helpers (same rules as the gift page) ----
  const T = {
    toneless(text) { return String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ü|v/gi, "u").toLowerCase().replace(/[^a-z]/g, ""); },
    letters(text) { return Array.from(String(text || "").toLowerCase()).filter((c) => /[\p{L}\p{N}]/u.test(c)).join(""); },
    isWord(input, c) {
      const typed = this.letters(input);
      if (!typed) return false;
      if (typed === this.letters(c.word)) return true;
      return !!c.roman && this.toneless(input) !== "" && this.toneless(input) === this.toneless(c.roman);
    },
    usesWord(sentence, c) {
      const s = this.letters(sentence), w = this.letters(c.word);
      if (w && s.includes(w)) return true;
      if (c.language === "zh" && c.roman) { const r = this.toneless(c.roman); if (r && this.toneless(sentence).includes(r)) return true; }
      return false;
    },
    longEnough(sentence, c) {
      if (c.language === "ms") return String(sentence).trim().split(/\s+/).filter(Boolean).length >= 2;
      return this.letters(sentence).length >= this.letters(c.word).length + 2;
    },
    similar(a, b) {
      a = this.letters(a); b = this.letters(b);
      if (!a || !b) return 0;
      const m = a.length, n = b.length;
      let prev = Array.from({ length: n + 1 }, (_, j) => j);
      for (let i = 1; i <= m; i += 1) {
        const row = [i];
        for (let j = 1; j <= n; j += 1) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = row;
      }
      return 1 - prev[n] / Math.max(m, n);
    },
    heard(alternatives, c) {
      const w = this.letters(c.word);
      return (alternatives || []).some((alt) => {
        const a = this.letters(alt);
        if (!a || !w) return false;
        if (a.includes(w)) return true;
        return this.similar(a.length > w.length * 2 ? a.slice(0, w.length * 2) : a, w) >= (c.language === "zh" ? 0.99 : 0.72);
      });
    },
  };

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  function client() {
    if (typeof supabase !== "undefined" && supabase && typeof supabase.rpc === "function") return supabase;
    return window.supabaseClient || null;
  }

  function open(opts) {
    const card = { word: opts.word, roman: opts.pinyin || "", meaning: opts.meaning || "", language: opts.language || "zh" };
    const info = LANGS[card.language] || LANGS.zh;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const db = client();

    const wrap = document.createElement("div");
    wrap.className = "fp-wrap";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    const box = document.createElement("div");
    box.className = "fp-box";
    // a close button that stays on every step: the player can stop practising at any time (nothing is counted until all three steps are done)
    const x = document.createElement("button");
    x.type = "button"; x.className = "fp-x"; x.setAttribute("aria-label", "Stop practising"); x.innerHTML = "&times;";
    const body = document.createElement("div");
    body.className = "fp-body";
    box.append(x, body);
    wrap.appendChild(box);
    document.body.appendChild(wrap);

    let inProgress = false, asking = false, wrongTyped = 0, hintLevel = 0, sayMisses = 0, listening = false, rec = null, busy = false, result = null;

    const $ = (sel) => body.querySelector(sel);
    const say = (sel, text, kind) => { const n = $(sel); if (n) { n.textContent = text || ""; n.className = "fp-feedback" + (kind ? " is-" + kind : ""); } };
    const dots = (n) => `<div class="fp-dots" aria-hidden="true">${[1, 2, 3].map((i) => `<span class="${i < n ? "is-done" : i === n ? "is-current" : ""}"></span>`).join("")}</div>`;
    const wordHtml = `<span lang="${info.script}">${esc(card.word)}</span>`;

    function stopSpeech() {
      try { if (rec) rec.abort(); } catch (err) { /* already stopped */ }
      try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (err) { /* no speech */ }
    }
    // Leaving part-way asks first (the same pop-up as leaving a mini-game round). The intro and the finish screen close at once.
    async function requestClose() {
      if (busy || asking) return;
      if (!inProgress) { close(); return; }
      asking = true;
      let leave;
      const text = "This practise won't count and you will start again.";
      if (typeof LeaveGuard !== "undefined") leave = await LeaveGuard.confirm({ title: "Stop practising?", text, keepLabel: "Keep practising", leaveLabel: "Stop" });
      else leave = window.confirm("Stop practising? " + text);
      asking = false;
      if (leave) close();
    }
    function onKey(e) { if (e.key === "Escape") requestClose(); }
    function close() {
      stopSpeech();
      document.removeEventListener("keydown", onKey);
      wrap.remove();
      if (result && opts.onDone) opts.onDone(result);
    }
    document.addEventListener("keydown", onKey);
    x.addEventListener("click", requestClose);

    // ---- intro ----
    function intro() {
      inProgress = false;
      body.innerHTML = `
        <h3>Practise ${wordHtml}</h3>
        <p class="fp-note">There are no games for this card yet. Practise it here in three quick steps:</p>
        <ol class="fp-steps"><li>Type it</li><li>Say it</li><li>Use it in a sentence</li></ol>
        <button type="button" class="fp-main" data-go>Start</button>
        <button type="button" class="fp-ghost" data-close>Not now</button>`;
      $("[data-go]").addEventListener("click", typeStep);
      $("[data-close]").addEventListener("click", close);
      $("[data-go]").focus();
    }

    // ---- step 1: type it ----
    function typeStep() {
      inProgress = true;
      const boxes = Array.from(card.word).filter((c) => /[\p{L}\p{N}]/u.test(c)).map(() => "＿").join(" ");
      body.innerHTML = `${dots(1)}
        <p class="fp-small">Type this in ${esc(info.name)}</p>
        <div class="fp-meaning">${esc(card.meaning)}</div>
        <div class="fp-blanks" aria-hidden="true">${boxes}</div>
        <div class="fp-hint" hidden></div>
        <input class="fp-input" type="text" lang="${info.script}" autocomplete="off" placeholder="Type it in ${esc(info.name)}${info.roman ? " or " + esc(info.roman) : ""}..." />
        <div class="fp-feedback" role="status" aria-live="polite"></div>
        <div class="fp-row"><button type="button" data-hint>Hint</button><button type="button" class="main" data-check>Check</button></div>`;
      const input = $(".fp-input");
      const check = () => {
        if (!input.value.trim()) { say(".fp-feedback", "Type your answer first.", "bad"); return; }
        if (T.isWord(input.value, card)) {
          say(".fp-feedback", "Yes! That's it.", "good");
          $("[data-check]").disabled = true;
          setTimeout(sayStep, 700);
          return;
        }
        wrongTyped += 1;
        say(".fp-feedback", wrongTyped >= 2 ? "Not quite. Tap Hint if you'd like some help." : "Not quite. Have another go!", "bad");
      };
      $("[data-check]").addEventListener("click", check);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); check(); } });
      $("[data-hint]").addEventListener("click", () => {
        hintLevel += 1;
        const h = $(".fp-hint");
        h.textContent = hintLevel === 1 && card.roman ? card.roman : card.word;
        h.hidden = false;
        input.focus();
      });
      input.focus();
    }

    // ---- step 2: say it ----
    function sayStep() {
      inProgress = true;
      sayMisses = 0;
      body.innerHTML = `${dots(2)}
        <p class="fp-small">Now say it out loud</p>
        <div class="fp-bigword" lang="${info.script}">${esc(card.word)}</div>
        <div class="fp-roman">${esc(card.roman)}</div>
        <div class="fp-meaning">${esc(card.meaning)}</div>
        <div class="fp-feedback" role="status" aria-live="polite"></div>
        <div class="fp-row"><button type="button" data-hear>Hear it</button><button type="button" class="main" data-mic>Tap and say it</button></div>
        <button type="button" class="fp-ghost" data-skip hidden>Skip this step</button>`;
      const skip = $("[data-skip]"), mic = $("[data-mic]");
      skip.addEventListener("click", writeStep);
      $("[data-hear]").addEventListener("click", hear);
      mic.addEventListener("click", listen);
      if (!SR) {
        mic.disabled = true;
        say(".fp-feedback", "This browser can't listen to you, so you can skip this step.");
        skip.hidden = false; skip.textContent = "Continue";
      }
    }
    function hear() {
      const synth = window.speechSynthesis;
      if (!synth || typeof SpeechSynthesisUtterance === "undefined") { say(".fp-feedback", "This browser can't read it aloud."); return; }
      const base = info.speak.slice(0, 2).toLowerCase();
      const speak = () => {
        const voices = synth.getVoices() || [];
        const voice = voices.find((v) => v.lang && v.lang.toLowerCase().replace("_", "-").startsWith(base));
        if (voices.length && !voice) { say(".fp-feedback", "No " + info.name + " voice on this device, so there's nothing to play."); return; }
        const u = new SpeechSynthesisUtterance(card.word);
        u.lang = info.speak; if (voice) u.voice = voice; u.rate = 0.85;
        if (synth.speaking) { synth.cancel(); setTimeout(() => synth.speak(u), 60); } else synth.speak(u);
      };
      if ((synth.getVoices() || []).length === 0) { synth.onvoiceschanged = () => { synth.onvoiceschanged = null; speak(); }; setTimeout(speak, 300); } else speak();
    }
    function listen() {
      if (!SR || listening) return;
      const mic = $("[data-mic]"), skip = $("[data-skip]");
      const micOff = () => { listening = false; if (mic) { mic.classList.remove("is-live"); mic.textContent = "Tap and say it"; } };
      const r = new SR();
      rec = r; r.lang = info.speak; r.interimResults = false; r.maxAlternatives = 5;
      listening = true; mic.classList.add("is-live"); mic.textContent = "Listening...";
      say(".fp-feedback", "");
      let got = false;
      r.onresult = (e) => {
        got = true;
        const alts = [];
        for (let i = 0; i < e.results.length; i += 1) for (let j = 0; j < e.results[i].length; j += 1) alts.push(e.results[i][j].transcript);
        if (T.heard(alts, card)) { say(".fp-feedback", "That sounded right!", "good"); setTimeout(writeStep, 800); }
        else {
          sayMisses += 1;
          say(".fp-feedback", "I heard “" + (alts[0] || "") + "”. Listen again and have another go.", "bad");
          if (sayMisses >= 2) skip.hidden = false;
        }
      };
      r.onerror = (e) => {
        got = true;
        const blocked = e && (e.error === "not-allowed" || e.error === "service-not-allowed");
        say(".fp-feedback", blocked ? "The microphone is blocked. Allow it in your browser, or skip this step." : "I couldn't hear that. Try again, or skip this step.", "bad");
        skip.hidden = false;   // any microphone problem: skip at once
      };
      r.onend = () => { micOff(); if (!got) { say(".fp-feedback", "I didn't hear anything. Tap and try again.", "bad"); skip.hidden = false; } };
      try { r.start(); } catch (err) { micOff(); say(".fp-feedback", "Couldn't start the microphone. You can skip this step.", "bad"); skip.hidden = false; }
    }

    // ---- step 3: use it in a sentence ----
    function writeStep() {
      inProgress = true;
      stopSpeech();
      body.innerHTML = `${dots(3)}
        <p class="fp-small">Write a short sentence with</p>
        <div class="fp-bigword" lang="${info.script}">${esc(card.word)}</div>
        <textarea class="fp-input fp-area" rows="3" lang="${info.script}" placeholder="${card.language === "zh" ? "Write it in Chinese or Pinyin, e.g. use " + esc(card.word) + "..." : "Write your sentence here..."}"></textarea>
        <div class="fp-feedback" role="status" aria-live="polite"></div>
        <button type="button" class="fp-main" data-done>Done</button>`;
      $(".fp-area").focus();
      $("[data-done]").addEventListener("click", finish);
    }
    async function checkSentence(sentence) {
      try {
        const { data, error } = await db.functions.invoke("get-word-meaning", { body: { mode: "sentence", word: card.word, language: card.language, sentence } });
        if (error || !data || typeof data.valid !== "boolean") return null;
        return data;
      } catch (err) { return null; }
    }
    async function finish() {
      if (busy) return;
      const sentence = $(".fp-area").value.trim();
      if (!T.usesWord(sentence, card)) { say(".fp-feedback", "Your sentence needs to use " + card.word + ".", "bad"); return; }
      if (!T.longEnough(sentence, card)) { say(".fp-feedback", "Add a little more: a full sentence, not just the word.", "bad"); return; }
      busy = true; $("[data-done]").disabled = true;
      say(".fp-feedback", "Checking your sentence...");
      const check = await checkSentence(sentence);
      if (check && check.valid === false) {
        busy = false; $("[data-done]").disabled = false;
        say(".fp-feedback", (check.reason || "That is not a full sentence yet.") + " Try again.", "bad");
        return;
      }
      say(".fp-feedback", "Adding the use...");
      try {
        const { data, error } = await db.rpc("festival_card_practise", { p_event: opts.eventId, p_word: card.word, p_sentence: sentence });
        if (error) throw error;
        result = { usage_count: data.usage_count, stage: data.stage };
        done();
      } catch (err) {
        busy = false; $("[data-done]").disabled = false;
        say(".fp-feedback", ((err && err.message) || "Something went wrong.") + " Try again.", "bad");
      }
    }

    // ---- finished ----
    function done() {
      inProgress = false;
      const n = result.usage_count;
      const left = Math.max(0, 3 - n);
      body.innerHTML = `
        <h3>${result.stage >= 2 ? "Mastered!" : "Nicely done!"}</h3>
        <div class="fp-bigword" lang="${info.script}">${esc(card.word)}</div>
        <p class="fp-note">Used ${n} time${n === 1 ? "" : "s"}. ${result.stage >= 2 ? "This card is now a shiny Mastered card." : left + " more practise" + (left === 1 ? "" : "s") + " to master it."}</p>
        <button type="button" class="fp-main" data-close>Close</button>`;
      $("[data-close]").addEventListener("click", close);
      $("[data-close]").focus();
    }

    intro();
  }

  return { open };
})();