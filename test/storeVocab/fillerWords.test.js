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

  test("removes Chinese particles but keeps real words", () => {
    const result = filterFillerWords(["我", "今天", "很", "开心", "的", "了"], "zh");
    expect(result).toEqual(["我", "今天", "很", "开心"]);
  });

  test("removes Malay connectors but keeps real words", () => {
    const result = filterFillerWords(["saya", "suka", "yang", "makan", "di"], "ms");
    expect(result).toEqual(["saya", "suka", "makan"]);
  });

  test("removes Tamil fillers but keeps real words", () => {
    const result = filterFillerWords(["நான்", "ஒரு", "வீடு", "மற்றும்"], "ta");
    expect(result).toEqual(["நான்", "வீடு"]);
  });

  test("an unsupported language passes every word through unchanged", () => {
    expect(filterFillerWords(["hello", "world"], "en")).toEqual(["hello", "world"]);
  });

  test("an empty list returns an empty list", () => {
    expect(filterFillerWords([], "zh")).toEqual([]);
  });
});