// Which language the island is in. Chinese, Malay and Tamil all use the same island and the
// same code; only the words change. The language is fixed for a visit: switching language
// reloads the island page (app.js), so nothing here has to change while the player plays.
//
//   IslandLang.code      "zh" | "ms" | "ta"
//   IslandLang.set(code) called once by IslandApp.mount()
//   IslandLang.saveSuffix()  "" for Chinese (so saves made before Malay and Tamil stay where
//                            they are), ".ms" / ".ta" for the others
//
// Each language has its own island progress, island cards and captured words. Coins and XP
// belong to the player and are shared (they live on the profile).

const ISLAND_LANG_INFO = {
  zh: { name: "Chinese", speech: "zh-CN", roman: "pinyin", sample: "岛屿小店鸡饭熟食中心沙爹煎饼烧烤饮料站面杂货店巴刹咖啡店巴士转换站的士站民众俱乐部警察岗亭诊所小学水果售票处" },
  ms: { name: "Malay", speech: "ms-MY", roman: "", sample: "" },
  ta: { name: "Tamil", speech: "ta-IN", roman: "romanisation", sample: "தமிழ் பேருந்து நிலையம் உணவு கடை பள்ளி" },
};

// NPC names for Malay and Tamil (Latin letters, so the island's lettering stays clear).
// Chinese keeps the names in islandData.js.
const ISLAND_NPC_NAMES = {
  ms: { teacher: "Cikgu Aminah", ccAuntie: "Kak Siti", officer: "Konstabel Hafiz", stallUncle: "Pak Cik Samad", tehAuntie: "Mak Cik Rohana",
        fruitSeller: "Penjual Buah", stationMaster: "Ketua Stesen", busCaptain: "Kapten Bas", taxiDriver: "Pak Cik Teksi" },
  ta: { teacher: "Ms Lakshmi", ccAuntie: "Auntie Valli", officer: "Officer Ravi", stallUncle: "Uncle Murugan", tehAuntie: "Auntie Kamala",
        fruitSeller: "Fruit Seller", stationMaster: "Station Master", busCaptain: "Bus Captain", taxiDriver: "Taxi Uncle" },
};

const IslandLang = {
  code: "zh",

  set(code) {
    if (!ISLAND_LANG_INFO[code]) return;
    this.code = code;
    this.localiseNpcs();
  },

  get info() { return ISLAND_LANG_INFO[this.code]; },
  get name() { return this.info.name; },
  get speech() { return this.info.speech; },
  // The word for how to read a word aloud: "pinyin" for Chinese, "romanisation" for Tamil. "" = none (Malay).
  get roman() { return this.info.roman; },
  get hasRoman() { return !!this.info.roman; },

  saveSuffix() { return this.code === "zh" ? "" : `.${this.code}`; },

  // NPC names, and the greeting that mentions the language, for the chosen language.
  localiseNpcs() {
    if (typeof ISLAND_NPCS === "undefined") return;
    if (!this.originalNpcs) this.originalNpcs = ISLAND_NPCS.map((n) => ({ id: n.id, name: n.name, greeting: n.greeting }));
    const names = ISLAND_NPC_NAMES[this.code] || {};
    ISLAND_NPCS.forEach((n) => {
      const o = this.originalNpcs.find((x) => x.id === n.id);
      n.name = names[n.id] || o.name;
      n.greeting = o.greeting.replace(/Chinese/g, this.name);
    });
  },
};