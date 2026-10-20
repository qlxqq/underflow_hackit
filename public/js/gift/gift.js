// Opening a gifted card: pages/gift/gift.html?id=<gift id>
//
// A friend sent a spare copy of an island card (see database/gifts.sql). It stays locked until the player has
//   1. typed the word from its English meaning (in the script, or in romanization such as pinyin),
//   2. said it out loud (the browser's speech recognition; skipped when the device has none, or after two misses),
//   3. written a short sentence of their own with it (any sentence, as long as it uses the word).
// Then gift_claim adds the card to their collection and pays XP. Leaving half way keeps the gift waiting.
//
// Text helpers are plain functions on GiftText so they are easy to test.

const GIFT_PAGE_FRIENDS = "../friends/friends.html";
const GIFT_PAGE_LOGIN = "../auth/login.html";

const GIFT_LANGUAGES = {
  zh: { name: "Chinese", label: "中文", script: "zh-Hans", speak: "zh-CN", romanName: "pinyin" },
  ms: { name: "Malay", label: "Melayu", script: "ms", speak: "ms-MY", romanName: "" },
  ta: { name: "Tamil", label: "தமிழ்", script: "ta", speak: "ta-IN", romanName: "romanised Tamil" },
};

const GiftText = {
  // "Jīn tiān" -> "jintian": no tones, no spaces, ü counts as u. Plain letters only.
  toneless(text) {
    return String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ü|v/gi, "u").toLowerCase().replace(/[^a-z]/g, "");
  },
  // Letters of a word with spaces and punctuation removed.
  letters(text) {
    return Array.from(String(text || "").toLowerCase()).filter((c) => /[\p{L}\p{N}]/u.test(c)).join("");
  },
  // Is what was typed the word? The native script counts; so does the romanization when the card has one.
  isWord(input, gift, romanMode) {
    const typed = this.letters(input);
    if (!typed) return false;
    if (typed === this.letters(gift.word)) return true;
    // romanization counts too, whichever way the switch is set (the switch only changes the hint in the box)
    return !!gift.romanization && this.toneless(input) !== "" && this.toneless(input) === this.toneless(gift.romanization);
  },
  // Does a sentence use the word? (zh and ta are written without spaces, so it is a plain "contains".)
  usesWord(sentence, gift) {
    const s = this.letters(sentence);
    const w = this.letters(gift.word);
    if (w && s.includes(w)) return true;
    // Chinese typed in pinyin: the sentence must carry the word's pinyin
    if (gift.language === "zh" && gift.romanization) {
      const r = this.toneless(gift.romanization);
      if (r && this.toneless(sentence).includes(r)) return true;
    }
    return false;
  },
  // Long enough to be a sentence, not just the word: 2 more characters (zh, ta) or 2 words in all (ms).
  longEnough(sentence, gift) {
    if (gift.language === "ms") return String(sentence).trim().split(/\s+/).filter(Boolean).length >= 2;
    return this.letters(sentence).length >= this.letters(gift.word).length + 2;
  },
  // Similarity of two strings, 0..1 (edit distance).
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
  // Did the speech recogniser hear the word? Any of its guesses counts.
  heard(alternatives, gift) {
    const w = this.letters(gift.word);
    return (alternatives || []).some((alt) => {
      const a = this.letters(alt);
      if (!a || !w) return false;
      if (a.includes(w)) return true;
      // a close miss on a short word is fine; a one-character guess for a longer word is not
      return this.similar(a.length > w.length * 2 ? a.slice(0, w.length * 2) : a, w) >= (gift.language === "zh" ? 0.99 : 0.72);
    });
  },
};

const GiftPage = (() => {
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const giftId = params.get("id") || "";
  const db = window.supabaseClient || (typeof supabase !== "undefined" && supabase.auth ? supabase : null);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const STEPS = ["stepIntro", "stepType", "stepSay", "stepWrite", "stepDone"];

  const G = { gift: null, info: GIFT_LANGUAGES.zh, step: 0, wrongTyped: 0, hintLevel: 0, sayMisses: 0, romanMode: false, listening: false, rec: null, claiming: false };

  function show(step) {
    G.step = step;
    STEPS.forEach((id, i) => { $(id).hidden = i !== step; });
    const bar = $("progress");
    bar.replaceChildren();
    for (let i = 1; i <= 3; i += 1) {
      const seg = document.createElement("span");
      if (i < step || step === 4) seg.className = "is-done";
      else if (i === step) seg.className = "is-current";
      bar.appendChild(seg);
    }
    window.scrollTo(0, 0);
  }

  function notice(text) {
    $("notice").textContent = text || "";
    $("notice").hidden = !text;
  }

  function say(id, text, kind) {
    const node = $(id);
    node.textContent = text || "";
    node.className = "gf-feedback" + (kind ? " is-" + kind : "");
  }

  function stopSpeech() {
    try { if (G.rec) G.rec.abort(); } catch (err) { /* already stopped */ }
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (err) { /* no speech */ }
  }

  // ---------- step 1: type it ----------
  function startType() {
    const g = G.gift;
    show(1);
    $("typeLang").textContent = G.info.name;
    $("typeEnglish").textContent = g.meaning || "(a card)";
    $("typeBoxes").textContent = Array.from(g.word).filter((c) => /[\p{L}\p{N}]/u.test(c)).map(() => "＿").join(" ");
    $("typeHint").hidden = true;
    $("typeInput").value = "";
    $("typeInput").lang = G.info.script;
    typePlaceholder();
    say("typeFeedback", "");
    $("typeInput").focus();
  }

  function typePlaceholder() {
    const r = G.info.romanName;   // the box takes the word itself or its romanization (pinyin)
    $("typeInput").placeholder = "Type it in " + G.info.name + (r ? " or " + (r === "pinyin" ? "Pinyin" : r) : "") + "...";
  }

  function checkType() {
    const g = G.gift;
    const value = $("typeInput").value;
    if (!value.trim()) { say("typeFeedback", "Type your answer first.", "bad"); return; }
    if (GiftText.isWord(value, g, G.romanMode)) {
      say("typeFeedback", "Yes! That's it.", "good");
      $("typeCheck").disabled = true;
      setTimeout(() => { $("typeCheck").disabled = false; startSay(); }, 700);
      return;
    }
    G.wrongTyped += 1;
    say("typeFeedback", G.wrongTyped >= 2 ? "Not quite. Tap Hint if you'd like some help." : "Not quite. Have another go!", "bad");
  }

  function typeHint() {
    const g = G.gift;
    G.hintLevel += 1;
    const hint = $("typeHint");
    if (G.hintLevel === 1 && g.romanization) hint.textContent = g.romanization;   // first hint: how it sounds
    else hint.textContent = g.word;                                                // second hint: the word itself (still to be typed)
    hint.hidden = false;
    hint.lang = G.hintLevel === 1 && g.romanization ? "" : G.info.script;
    $("typeInput").focus();
  }

  // ---------- step 2: say it ----------
  function startSay() {
    const g = G.gift;
    show(2);
    $("sayWord").textContent = g.word;
    $("sayWord").lang = G.info.script;
    $("sayRoman").textContent = g.romanization || "";
    $("sayEnglish").textContent = g.meaning || "";
    G.sayMisses = 0;
    $("saySkip").hidden = true;
    say("sayFeedback", "");
    if (!SR) {
      $("sayMic").disabled = true;
      say("sayFeedback", "This browser can't listen to you, so you can skip this step.");
      $("saySkip").hidden = false;
      $("saySkip").textContent = "Continue";
    } else {
      $("sayMic").disabled = false;
      $("saySkip").textContent = "Skip this step";
    }
  }

  function hear() {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") { say("sayFeedback", "This browser can't read it aloud."); return; }
    const base = G.info.speak.slice(0, 2).toLowerCase();
    const speak = () => {
      const voices = synth.getVoices() || [];
      const voice = voices.find((v) => v.lang && v.lang.toLowerCase().replace("_", "-").startsWith(base));
      if (voices.length && !voice) { say("sayFeedback", "No " + G.info.name + " voice on this device, so there's nothing to play."); return; }
      const utter = new SpeechSynthesisUtterance(G.gift.word);
      utter.lang = G.info.speak;
      if (voice) utter.voice = voice;
      utter.rate = 0.85;
      if (synth.speaking) { synth.cancel(); setTimeout(() => synth.speak(utter), 60); } else synth.speak(utter);
    };
    if ((synth.getVoices() || []).length === 0) { synth.onvoiceschanged = () => { synth.onvoiceschanged = null; speak(); }; setTimeout(speak, 300); } else speak();
  }

  function micOff() {
    G.listening = false;
    $("sayMic").classList.remove("gf-mic-live");
    $("sayMic").textContent = "Tap and say it";
  }

  function listen() {
    if (!SR || G.listening) return;
    const rec = new SR();
    G.rec = rec;
    rec.lang = G.info.speak;
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    G.listening = true;
    $("sayMic").classList.add("gf-mic-live");
    $("sayMic").textContent = "Listening...";
    say("sayFeedback", "");
    let got = false;
    rec.onresult = (e) => {
      got = true;
      const alts = [];
      for (let i = 0; i < e.results.length; i += 1) for (let j = 0; j < e.results[i].length; j += 1) alts.push(e.results[i][j].transcript);
      if (GiftText.heard(alts, G.gift)) {
        say("sayFeedback", "That sounded right!", "good");
        setTimeout(startWrite, 800);
      } else {
        G.sayMisses += 1;
        say("sayFeedback", "I heard “" + (alts[0] || "") + "”. Listen again and have another go.", "bad");
        if (G.sayMisses >= 2) $("saySkip").hidden = false;
      }
    };
    rec.onerror = (e) => {
      got = true;
      const blocked = e && (e.error === "not-allowed" || e.error === "service-not-allowed");
      say("sayFeedback", blocked ? "The microphone is blocked. Allow it in your browser, or skip this step." : "I couldn't hear that. Try again, or skip this step.", "bad");
      $("saySkip").hidden = false;   // any microphone problem: the player can skip at once
    };
    rec.onend = () => {
      micOff();
      if (!got) { say("sayFeedback", "I didn't hear anything. Tap and try again.", "bad"); G.sayMisses += 1; $("saySkip").hidden = false; }
    };
    try { rec.start(); } catch (err) { micOff(); say("sayFeedback", "Couldn't start the microphone. You can skip this step.", "bad"); $("saySkip").hidden = false; }
  }

  // ---------- step 3: write it ----------
  function startWrite() {
    const g = G.gift;
    stopSpeech();
    show(3);
    $("writeWord").textContent = g.word;
    $("writeWord").lang = G.info.script;
    $("writeInput").value = "";
    $("writeInput").lang = G.info.script;
    $("writeInput").placeholder = g.language === "zh" ? "Write it in Chinese or Pinyin, e.g. use " + g.word + "..." : "Write your sentence here...";
    say("writeFeedback", "");
    $("writeInput").focus();
  }

  // Asks the get-word-meaning function (mode "sentence") whether the sentence is real and uses the word.
  // Returns { valid, reason }, or null when it could not be checked (then the player is not blocked).
  async function checkSentence(sentence, g) {
    try {
      const { data, error } = await db.functions.invoke("get-word-meaning", { body: { mode: "sentence", word: g.word, language: g.language, sentence } });
      if (error || !data || typeof data.valid !== "boolean") return null;
      return data;
    } catch (err) { return null; }
  }

  async function finish() {
    if (G.claiming) return;
    const g = G.gift;
    const sentence = $("writeInput").value.trim();
    if (!GiftText.usesWord(sentence, g)) { say("writeFeedback", "Your sentence needs to use " + g.word + ".", "bad"); return; }
    if (!GiftText.longEnough(sentence, g)) { say("writeFeedback", "Add a little more: a full sentence, not just the word.", "bad"); return; }
    G.claiming = true;
    $("writeDone").disabled = true;
    // Is it a real, sensible sentence? (asked of the server; if it cannot be reached the sentence is let through)
    say("writeFeedback", "Checking your sentence...");
    const check = await checkSentence(sentence, g);
    if (check && check.valid === false) {
      G.claiming = false;
      $("writeDone").disabled = false;
      say("writeFeedback", (check.reason || "That is not a full sentence yet.") + " Try again.", "bad");
      return;
    }
    say("writeFeedback", "Adding it to your collection...");
    const { data, error } = await db.rpc("gift_claim", { p_gift: g.gift_id, p_sentence: sentence });
    if (error) {
      G.claiming = false;
      $("writeDone").disabled = false;
      say("writeFeedback", (error.message || "Something went wrong.") + " Try again.", "bad");
      return;
    }
    showDone(data || {});
  }

  function showDone(result) {
    const g = G.gift;
    show(4);
    $("doneWord").textContent = g.word;
    $("doneWord").lang = G.info.script;
    $("doneRoman").textContent = g.romanization || "";
    $("doneMeaning").textContent = g.meaning || "";
    // the card's rarity (same rule as the Collection)
    let rarity = "common";
    try { if (typeof getRarity === "function") rarity = getRarity(g.word, g.language) || "common"; } catch (err) { /* rarity.js missing */ }
    const badge = $("doneRarity");
    badge.textContent = rarity.charAt(0).toUpperCase() + rarity.slice(1);
    badge.className = "gf-rarity is-" + rarity;
    $("doneCard").className = "gf-final-card is-" + rarity;
    const xp = Number(result.xp) || 0;
    const friend = g.other_username || "your friend";
    if (result.added === false) {
      // The player already had this card: it counts as one more use instead.
      const used = Number(result.usage_count) || 0;
      $("doneTitle").textContent = "You already had this one!";
      $("doneUsed").textContent = "Used " + used + " time" + (used === 1 ? "" : "s");
      $("doneUsed").hidden = false;
      $("doneSub").textContent = "It counts as one more use for the card you own. +" + xp + " XP for you, and " + friend + " gets XP too. Say thanks!";
    } else {
      $("doneTitle").textContent = "Added to your collection!";
      $("doneUsed").hidden = true;
      $("doneSub").textContent = "+" + xp + " XP for you, and " + friend + " gets XP too. Say thanks!";
    }
    // "Show me in collection": opens that album with the card showing
    const album = result.album || g.album_id;
    $("doneCollection").href = "../storeVocab/storeVocab.html?album=" + encodeURIComponent(album) + "&find=" + encodeURIComponent(g.word) + "#collection";
  }

  function leave() {
    stopSpeech();
    location.href = GIFT_PAGE_FRIENDS;
  }

  // ---------- start ----------
  async function start() {
    $("backBtn").addEventListener("click", leave);
    $("introGo").addEventListener("click", startType);
    $("typeCheck").addEventListener("click", checkType);
    $("typeHintBtn").addEventListener("click", typeHint);
    $("typeInput").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); checkType(); } });
    $("sayHear").addEventListener("click", hear);
    $("sayMic").addEventListener("click", listen);
    $("saySkip").addEventListener("click", startWrite);
    $("writeDone").addEventListener("click", finish);

    if (!db) { notice("Could not connect. Check the script paths in gift.html."); return; }
    const { data: session } = await db.auth.getSession();
    if (!session || !session.session) { location.replace(GIFT_PAGE_LOGIN); return; }
    if (!giftId) { notice("This gift link is missing its code. Open it from the Friends page."); return; }

    const { data, error } = await db.rpc("gift_my_open");
    if (error) { notice("Could not load your gifts. Try again from the Friends page."); return; }
    const gift = (data || []).find((row) => row.gift_id === giftId && row.is_incoming);
    if (!gift) {
      notice("This gift isn't waiting any more. It may have been opened, taken back or expired.");
      $("backBtn").setAttribute("aria-label", "Back to friends");
      return;
    }
    G.gift = gift;
    G.info = GIFT_LANGUAGES[gift.language] || GIFT_LANGUAGES.zh;
    $("langBadge").textContent = G.info.label;
    $("introFrom").textContent = (gift.other_username || "A friend") + " sent you a card";
    show(0);
  }

  return { start };
})();

GiftPage.start().catch((err) => {
  console.error("Gift page: could not start.", err);
  const n = document.getElementById("notice");
  if (n) { n.textContent = "Could not open this gift."; n.hidden = false; }
});