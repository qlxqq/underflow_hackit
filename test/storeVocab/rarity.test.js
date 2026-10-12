// Tests the pure rarity-scoring logic in isolation. Loaded with vm so the
// test sees the same global-scope behavior as the real <script> tags do
// in storeVocab.html - a plain require() would not work here since these
// files use global `const` declarations, not module.exports.
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
  "js/cards/data/zhFrequency.js",
  "js/cards/data/msFrequency.js",
  "js/cards/data/taFrequency.js",
  "js/cards/rarity.js",
];

describe("rarity scoring", () => {
  let context;

  beforeEach(() => {
    context = loadInSharedContext(FILES);
  });

  function getRarity(word, language) {
    return vm.runInContext(`getRarity(${JSON.stringify(word)}, ${JSON.stringify(language)})`, context);
  }

  test("a top-ranked Chinese word is common", () => {
    expect(getRarity("的", "zh")).toBe("common");
  });

  test("a mid-ranked Chinese word is uncommon", () => {
    expect(getRarity("开心", "zh")).toBe("uncommon");
  });

  test("a Chinese word not in the list is rare", () => {
    expect(getRarity("犀利", "zh")).toBe("rare");
  });

  test("a top-ranked Malay word is common", () => {
    expect(getRarity("saya", "ms")).toBe("common");
  });

  test("a Malay word outside the list is rare", () => {
    expect(getRarity("gergasi", "ms")).toBe("rare");
  });

  test("a top-ranked Tamil word is common", () => {
    expect(getRarity("நான்", "ta")).toBe("common");
  });

  test("a Tamil word outside the list is rare", () => {
    expect(getRarity("கடல்", "ta")).toBe("rare");
  });

  test("an unsupported language falls back to rare rather than crashing", () => {
    expect(getRarity("hello", "en")).toBe("rare");
  });
});