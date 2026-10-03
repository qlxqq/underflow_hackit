// Tests the pure level-generation logic in isolation, loaded with vm so
// it behaves the same way the real <script> tags do in journey.html -
// these files use global `const` declarations, not module.exports.
const vm = require("vm");
const fs = require("fs");
const path = require("path");

function loadInSharedContext(files) {
  const context = vm.createContext({ console });
  files.forEach((file) => {
    const code = fs.readFileSync(path.join(__dirname, "..", "..", "public", file), "utf8");
    vm.runInContext(code, context, { filename: file });
  });
  return context;
}

const FILES = [
  "js/journey/zhFrequencyPlaceholder.js",
  "js/journey/msFrequencyPlaceholder.js",
  "js/journey/taFrequencyPlaceholder.js",
  "js/journey/levels.js",
];

describe("level generation", () => {
  let context;

  beforeEach(() => {
    context = loadInSharedContext(FILES);
  });

  function getLevelWords(language, level) {
    return vm.runInContext(`getLevelWords(${JSON.stringify(language)}, ${level})`, context);
  }

  function getTotalLevels(language) {
    return vm.runInContext(`getTotalLevels(${JSON.stringify(language)})`, context);
  }

  test("level 1 contains the first 10 most common Chinese words", () => {
    const words = getLevelWords("zh", 1);
    expect(words).toHaveLength(10);
    expect(words[0]).toBe("的"); // the single most common word in the list
  });

  test("level 2 contains different words than level 1", () => {
    const level1 = getLevelWords("zh", 1);
    const level2 = getLevelWords("zh", 2);
    const overlap = level1.filter((w) => level2.includes(w));
    expect(overlap).toHaveLength(0);
  });

  test("a level past the end of the wordlist returns whatever remains, not an error", () => {
    const totalLevels = getTotalLevels("zh");
    const words = getLevelWords("zh", totalLevels + 5);
    expect(Array.isArray(words)).toBe(true);
  });

  test("total levels reflects the actual wordlist length for each language", () => {
    expect(getTotalLevels("zh")).toBeGreaterThan(0);
    expect(getTotalLevels("ms")).toBeGreaterThan(0);
    expect(getTotalLevels("ta")).toBeGreaterThan(0);
  });

  test("an unsupported language returns no words and a minimum of 1 level", () => {
    expect(getLevelWords("en", 1)).toEqual([]);
    expect(getTotalLevels("en")).toBe(1);
  });
});