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

describe("filler word filtering", () => {
  let context;

  beforeEach(() => {
    context = loadInSharedContext(["js/storeVocab/fillerWords.js"]);
  });

  function filterFillerWords(words, language) {
    return vm.runInContext(
      `filterFillerWords(${JSON.stringify(words)}, ${JSON.stringify(language)})`,
      context,
    );
  }

  test("removes Chinese particles and pronouns but keeps real words", () => {
    const result = filterFillerWords(["我", "今天", "很", "开心", "的", "了", "吗"], "zh");
    expect(result).toEqual(["今天", "很", "开心"]);
  });

  test("removes both forms of the Chinese word for 'and'", () => {
    expect(filterFillerWords(["与", "與", "组屋"], "zh")).toEqual(["组屋"]);
  });

  test("removes Malay connectors and pronouns but keeps real words", () => {
    const result = filterFillerWords(["saya", "suka", "yang", "makan", "di"], "ms");
    expect(result).toEqual(["suka", "makan"]);
  });

  test("ignores capital letters for Malay filler words", () => {
    expect(filterFillerWords(["Yang", "Makan", "DAN"], "ms")).toEqual(["Makan"]);
  });

  test("removes Tamil fillers but keeps real words", () => {
    const result = filterFillerWords(["நான்", "ஒரு", "வீடு", "மற்றும்"], "ta");
    expect(result).toEqual(["வீடு"]);
  });

  test("drops OCR noise: punctuation, digits and lone Latin letters", () => {
    const result = filterFillerWords(["，", "12", "-", "a", "B", "makan", "3.50"], "ms");
    expect(result).toEqual(["makan"]);
  });

  test("keeps real Chinese and Tamil words that are not filler", () => {
    expect(filterFillerWords(["开心", "，", "2024"], "zh")).toEqual(["开心"]);
    expect(filterFillerWords(["நன்றி", "%"], "ta")).toEqual(["நன்றி"]);
  });

  test("an unsupported language only drops noise, not real words", () => {
    expect(filterFillerWords(["hello", "world", "7"], "en")).toEqual(["hello", "world"]);
  });

  test("an empty list returns an empty list", () => {
    expect(filterFillerWords([], "zh")).toEqual([]);
  });
});