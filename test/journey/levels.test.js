// Tests the zone/level structure and word lists. Files use global
// declarations (not module.exports), so they are loaded with vm the same
// way the browser loads <script> tags.
const vm = require("vm");
const fs = require("fs");
const path = require("path");

function load() {
  const context = vm.createContext({ console });
  ["js/journey/zoneWords.js", "js/journey/levels.js"].forEach((file) => {
    const code = fs.readFileSync(path.join(__dirname, "..", "..", "public", file), "utf8");
    vm.runInContext(code, context, { filename: file });
  });
  return context;
}

// Traditional-only forms. None of these should appear in the word lists,
// which must be Simplified Chinese.
const TRADITIONAL_ONLY = /[與這說們會國學對來個為從無過還進動業發點開關聽鄰區組場鬧環護責堅誠謙體團節負邊飲單擁參觀]/;

describe("journey structure", () => {
  let ctx;
  const run = (code) => vm.runInContext(code, ctx);
  beforeEach(() => { ctx = load(); });

  test("there are 3 zones and 9 levels in total", () => {
    expect(run("ZONES.length")).toBe(3);
    expect(run("getTotalLevels()")).toBe(9);
  });

  test("levels 1-3, 4-6 and 7-9 belong to Void Deck, Hawker Centre and Marina Bay", () => {
    expect(run("getZoneForLevel(1).id")).toBe("void-deck");
    expect(run("getZoneForLevel(3).id")).toBe("void-deck");
    expect(run("getZoneForLevel(4).id")).toBe("hawker-centre");
    expect(run("getZoneForLevel(6).id")).toBe("hawker-centre");
    expect(run("getZoneForLevel(7).id")).toBe("marina-bay");
    expect(run("getZoneForLevel(9).id")).toBe("marina-bay");
  });

  test("a level number outside the journey has no zone", () => {
    expect(run("getZoneForLevel(10)")).toBeNull();
    expect(run("getLevelWords('zh', 10)")).toEqual([]);
  });

  test("mini-game types rotate typing, pronunciation, composition", () => {
    expect(run("getMiniGameForLevel(1).id")).toBe("typing");
    expect(run("getMiniGameForLevel(2).id")).toBe("pronunciation");
    expect(run("getMiniGameForLevel(3).id")).toBe("composition");
    expect(run("getMiniGameForLevel(4).id")).toBe("typing");
  });
});

describe("zone word lists", () => {
  let ctx;
  const run = (code) => vm.runInContext(code, ctx);
  beforeEach(() => { ctx = load(); });

  test("every level in a zone shows that zone's words", () => {
    const level1 = run("getLevelWords('zh', 1)");
    const level3 = run("getLevelWords('zh', 3)");
    expect(level1).toEqual(level3);
    expect(level1[0].word).toBe("邻居");
  });

  test("different zones have different words", () => {
    const voidDeck = run("getLevelWords('zh', 1)").map((w) => w.word);
    const hawker = run("getLevelWords('zh', 4)").map((w) => w.word);
    expect(voidDeck.filter((w) => hawker.includes(w))).toHaveLength(0);
  });

  test("each zone has at least 10 Chinese words, each with pinyin", () => {
    [1, 4, 7].forEach((level) => {
      const words = run(`getLevelWords('zh', ${level})`);
      expect(words.length).toBeGreaterThanOrEqual(10);
      words.forEach((w) => expect(w.pinyin).toBeTruthy());
    });
  });

  test("Chinese words are Simplified, not Traditional", () => {
    [1, 4, 7].forEach((level) => {
      run(`getLevelWords('zh', ${level})`).forEach((w) => {
        expect(w.word).not.toMatch(TRADITIONAL_ONLY);
      });
    });
  });

  test("Malay and Tamil have no lists yet, so they return nothing", () => {
    expect(run("getLevelWords('ms', 1)")).toEqual([]);
    expect(run("getLevelWords('ta', 1)")).toEqual([]);
  });

  test("an unsupported language returns nothing", () => {
    expect(run("getLevelWords('en', 1)")).toEqual([]);
  });
});