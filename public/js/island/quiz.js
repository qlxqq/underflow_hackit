// NPC challenges. Each challenge is 8 questions, different every time:
//   7 single questions, one of each type, on 7 different words:
//       meaning (word -> English)      reverse (English -> word)
//       pinyin (word -> pinyin)        listening (hear -> pick the word)
//       hear + meaning (hear -> English)
//       fill the gap (sentence)        sentence meaning (sentence -> English)
//   1 matching round (5 words to their meanings or pinyin)
// The questions are about the NPC's eight ROLE words (roleCards.js) and the
// player's captured words that belong to the zone (practice.js). Zone words (the
// mini-game words) are never asked. Words the player got wrong before come first,
// then role cards not won yet, so every replay has something to win. Get 6 of 8
// to pass. NPCs without data fall back to three simple questions from the zone list.
//
// To change how the challenges work edit only this file and npcData.js; the
// rest of the island just calls IslandQuiz.make(npc, zone, { focus }).

// English meanings for the fallback word lists. A word list that already has a
// `meaning` field wins over this table.
const NPC_MEANINGS = {
  邻居: "neighbour", 聊天: "chat", 热闹: "lively", 电梯: "lift", 组屋: "HDB flat", 社区: "community", 活动: "activity", 下棋: "play chess", 乘凉: "enjoy the cool shade", 老人: "elderly person",
  小贩: "hawker", 摊位: "stall", 排队: "queue", 打包: "takeaway", 美味: "delicious", 菜单: "menu", 饮料: "drink", 辣椒: "chilli", 零钱: "small change", 拥挤: "crowded",
};

const IslandQuiz = {
  fallbackCount: 3,

  // Right answers needed out of `total` questions.
  passMark(total) { return total <= 3 ? Math.min(2, total) : Math.ceil(total * 0.75); },

  shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  },

  // The questions for one NPC: an array of steps. A "match" step is one question.
  // opts.focus: a word the player came to practise; it is always included.
  make(npc, zone, opts = {}) {
    const data = typeof ISLAND_NPC_DATA !== "undefined" ? ISLAND_NPC_DATA[npc.id] : null;
    return data ? this.makeFromData(npc, data, opts) : this.makeBasic(npc, zone);
  },

  // Words ordered for picking: wrong before first, then role cards not won yet, then the rest.
  // Each group is shuffled, so the order differs every time.
  rank(words, albumId) {
    const weak = (w) => IslandState.isWeak(w.w);
    const unowned = (w) => typeof IslandCards !== "undefined" && !IslandCards.have.has(IslandCards.key(albumId, w.w));
    const a = words.filter(weak), b = words.filter((w) => !weak(w) && unowned(w)), c = words.filter((w) => !weak(w) && !unowned(w));
    return [...this.shuffle(a), ...this.shuffle(b), ...this.shuffle(c)];
  },

  makeFromData(npc, data, opts = {}) {
    const own = (typeof IslandCards !== "undefined" ? IslandCards.roleList(npc.id) : data.words).map((w) => ({ ...w, npcId: npc.id }));
    const zoneId = typeof ZONE_OF_ALBUM !== "undefined" ? ZONE_OF_ALBUM[data.album] : npc.zone;
    const captured = typeof IslandCaptured !== "undefined" ? IslandCaptured.forZone(zoneId) : [];
    const everyone = [...own, ...captured];
    const focusWord = opts.focus || null;
    const focus = focusWord ? everyone.find((w) => w.w === focusWord) : null;

    // 7 different words for the single questions: up to 2 captured words (wrong ones first), the rest role words
    const rankedOwn = this.rank(own, data.album);
    const capPick = this.rank(captured, data.album).slice(0, Math.min(2, captured.length));
    let picks = [...capPick, ...rankedOwn].slice(0, 7);
    if (focus && !picks.includes(focus)) {
      // the practice word replaces the last pick that is not a wrong or unowned role word
      picks[picks.length - 1] = focus;
    }
    picks = this.shuffle(picks);

    // sentence questions need an authored sentence; captured words get the plain types
    const withSentence = this.shuffle(picks.filter((w) => w.s));
    const sentenceWords = withSentence.slice(0, 2);
    const plainWords = this.shuffle(picks.filter((w) => !sentenceWords.includes(w)));
    const plainTypes = this.shuffle(["meaning", "reverse", "pinyin", "listening", "hearMeaning"]);
    const jobs = [
      ...sentenceWords.map((w, i) => ({ word: w, kind: i === 0 ? "cloze" : "translate" })),
      ...plainWords.map((w, i) => ({ word: w, kind: plainTypes[i % plainTypes.length] })),
    ];

    const pickOthers = (word, n, key) => this.shuffle(everyone.filter((x) => x.w !== word.w && x[key])).slice(0, n);
    const steps = jobs.map(({ word, kind }) => {
      const base = { kind, word: word.w };
      if (kind === "meaning") {
        const opts3 = this.shuffle([word, ...pickOthers(word, 2, "m")]);
        return { ...base, prompt: "What does this word mean?", big: word.w, answer: word.m, reveal: word.m, options: opts3.map((o) => ({ value: o.m, label: o.m })) };
      }
      if (kind === "reverse") {
        const opts3 = this.shuffle([word, ...pickOthers(word, 2, "w")]);
        return { ...base, prompt: "Which word means this?", big: word.m, bigIsEnglish: true, answer: word.w, reveal: `${word.w} (${word.p})`, options: opts3.map((o) => ({ value: o.w, label: o.w, lang: "zh" })) };
      }
      if (kind === "pinyin") {
        const opts3 = this.shuffle([word, ...pickOthers(word, 2, "p")]);
        return { ...base, prompt: "Which is the pinyin for", big: word.w, answer: word.p, reveal: word.p, options: opts3.map((o) => ({ value: o.p, label: o.p })) };
      }
      if (kind === "listening") {
        const opts3 = this.shuffle([word, ...pickOthers(word, 2, "w")]);
        return { ...base, prompt: "Listen, then pick the word you heard", speak: word.w, hint: word.p, answer: word.w, reveal: `${word.w} (${word.p})`, options: opts3.map((o) => ({ value: o.w, label: o.w, lang: "zh" })) };
      }
      if (kind === "hearMeaning") {
        const opts3 = this.shuffle([word, ...pickOthers(word, 2, "m")]);
        return { ...base, prompt: "Listen, then pick what it means", speak: word.w, hint: `${word.p} - ${word.m}`, answer: word.m, reveal: `${word.w} means ${word.m}`, options: opts3.map((o) => ({ value: o.m, label: o.m })) };
      }
      if (kind === "cloze") {
        const s = word.s;
        const opts3 = this.shuffle([word.w, ...s.wrong.slice(0, 2)]);
        return { ...base, prompt: "Pick the word that fits the gap", sentence: s.zh, py: s.py, en: s.en, answer: word.w, reveal: word.w, options: opts3.map((w) => ({ value: w, label: w, lang: "zh" })) };
      }
      // translate: a whole sentence, pick its English meaning
      const s = word.s;
      const wrongEn = this.shuffle(own.filter((x) => x.w !== word.w && x.s)).slice(0, 2).map((x) => x.s.en);
      return { ...base, prompt: "What does this sentence mean?", sentence: s.zh.replace("＿＿", word.w), py: s.py, en: s.en, answer: s.en, reveal: s.en, options: this.shuffle([s.en, ...wrongEn]).map((e) => ({ value: e, label: e })) };
    });
    const order = this.shuffle(steps);

    // the finale: match five words. Role words not used above come first (more cards in play),
    // then wrong / unowned ones. One captured word may join; the practice word is always in.
    const unused = this.rank(own.filter((w) => !picks.includes(w)), data.album);
    const used = this.rank(own.filter((w) => picks.includes(w)), data.album);
    const capLeft = this.rank(captured.filter((w) => !picks.includes(w)), data.album);
    let pairWords = [...unused, ...used].slice(0, capLeft.length ? 4 : 5);
    if (capLeft.length) pairWords.push(capLeft[0]);
    if (focus && !pairWords.includes(focus)) pairWords[pairWords.length - 1] = focus;
    pairWords = this.shuffle(pairWords);
    const side = Math.random() < 0.5 ? "meaning" : "pinyin";
    order.push({ kind: "match", prompt: side === "meaning" ? "Match each word to its meaning" : "Match each word to its pinyin", side, allowedMistakes: 2,
      words: pairWords.map((x) => x.w),
      pairs: pairWords.map((x) => ({ word: x.w, pinyin: x.p, meaning: x.m, target: side === "meaning" ? x.m : x.p })) });
    return order;
  },

  // ---- fallback for NPCs with no entry in npcData.js ----
  wordsFor(zone) {
    const lists = (typeof ZONE_WORDS !== "undefined" && ZONE_WORDS.zh) || {};
    const alias = { transport: "public-transport", hawker: "hawker-centre", neighbourhood: "neighbourhood" };
    const raw = lists[zone.words] || lists[zone.id] || lists[alias[zone.id]] || [];
    return raw.map((w) => ({
      word: w.word,
      pinyin: w.pinyin || w.romanization || "",
      meaning: w.meaning || NPC_MEANINGS[w.word] || "",
    })).filter((w) => w.word);
  },

  makeBasic(npc, zone) {
    const words = this.wordsFor(zone);
    let kind = npc.kind || "pinyin";
    const usable = (field) => words.filter((w) => w[field]);
    if (kind === "meaning" && usable("meaning").length < 3) kind = "pinyin";
    if (kind === "pinyin" && usable("pinyin").length < 3) return [];
    const pool = this.shuffle(kind === "meaning" ? usable("meaning") : kind === "pinyin" ? usable("pinyin") : words);
    if (pool.length < 3) return [];
    return pool.slice(0, this.fallbackCount).map((item) => {
      const others = this.shuffle(pool.filter((w) => w.word !== item.word)).slice(0, 2);
      if (kind === "pinyin") {
        return { kind, word: item.word, prompt: "Which is the pinyin for", big: item.word, answer: item.pinyin, reveal: item.pinyin,
          options: this.shuffle([item, ...others].map((w) => ({ value: w.pinyin, label: w.pinyin }))) };
      }
      if (kind === "meaning") {
        return { kind, word: item.word, prompt: "What does this word mean?", big: item.word, answer: item.meaning, reveal: item.meaning,
          options: this.shuffle([item, ...others].map((w) => ({ value: w.meaning, label: w.meaning }))) };
      }
      return { kind: "listening", word: item.word, prompt: "Listen, then pick the word you heard", speak: item.word, hint: item.pinyin, answer: item.word, reveal: `${item.word} (${item.pinyin})`,
        options: this.shuffle([item, ...others].map((w) => ({ value: w.word, label: w.word, lang: "zh" }))) };
    });
  },

  canSpeak() { return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined"; },
  speak(text) {
    if (!this.canSpeak()) return false;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
      return true;
    } catch (err) { return false; }
  },
};