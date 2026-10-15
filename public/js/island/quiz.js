// NPC challenges. Each NPC has a `kind` (see ISLAND_NPCS) and asks three
// multiple-choice questions built from the zone's word list.
//
//   pinyin    - show a word, pick its pinyin
//   meaning   - show a word, pick its English meaning
//   listening - play a word aloud, pick the character you heard
//
// To change how the challenges work (more kinds, other languages, other
// question counts) edit only this file; the rest of the island just calls
// IslandQuiz.make(npc, zone).

// English meanings for the placeholder word lists. A word list that already
// has a `meaning` field wins over this table.
const NPC_MEANINGS = {
  邻居: "neighbour", 聊天: "chat", 热闹: "lively", 电梯: "lift", 组屋: "HDB flat", 社区: "community", 活动: "activity", 下棋: "play chess", 乘凉: "enjoy the cool shade", 老人: "elderly person",
  小贩: "hawker", 摊位: "stall", 排队: "queue", 打包: "takeaway", 美味: "delicious", 菜单: "menu", 饮料: "drink", 辣椒: "chilli", 零钱: "small change", 拥挤: "crowded",
  海湾: "bay", 游客: "tourist", 景点: "attraction", 地标: "landmark", 夜景: "night view", 灯光: "lights", 烟花: "fireworks", 参观: "visit", 拍照: "take photos", 风景: "scenery",
};

const IslandQuiz = {
  count: 3,
  pass: 2,

  // The words for a zone, tolerant of the different list shapes in the app.
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

  shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  },

  // Returns [] when the zone has too few words.
  make(npc, zone) {
    const words = this.wordsFor(zone);
    let kind = npc.kind || "pinyin";
    const usable = (field) => words.filter((w) => w[field]);
    if (kind === "meaning" && usable("meaning").length < 3) kind = "pinyin";
    if (kind === "pinyin" && usable("pinyin").length < 3) return [];
    const pool = this.shuffle(kind === "meaning" ? usable("meaning") : kind === "pinyin" ? usable("pinyin") : words);
    if (pool.length < 3) return [];
    return pool.slice(0, this.count).map((item) => {
      const others = this.shuffle(pool.filter((w) => w.word !== item.word)).slice(0, 2);
      if (kind === "pinyin") {
        return { kind, prompt: "Which is the pinyin for", big: item.word, lang: "zh", answer: item.pinyin, speak: null,
          options: this.shuffle([item, ...others].map((w) => ({ value: w.pinyin, label: w.pinyin }))), reveal: item.pinyin };
      }
      if (kind === "meaning") {
        return { kind, prompt: "What does this word mean?", big: item.word, lang: "zh", answer: item.meaning, speak: null,
          options: this.shuffle([item, ...others].map((w) => ({ value: w.meaning, label: w.meaning }))), reveal: item.meaning };
      }
      return { kind: "listening", prompt: "Listen, then pick the word you heard", big: null, lang: "zh", answer: item.word, speak: item.word, hint: item.pinyin,
        options: this.shuffle([item, ...others].map((w) => ({ value: w.word, label: w.word, lang: "zh" }))), reveal: `${item.word} (${item.pinyin})` };
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