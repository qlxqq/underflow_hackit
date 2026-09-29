// Words that carry little standalone meaning and shouldn't clutter the
// word bank (particles, connectors). Not exhaustive - extend as you find
// more noise coming through in testing.
const FILLER_WORDS = {
  zh: new Set(["的", "了", "是", "在", "和", "也", "都", "就", "着", "而", "及", "與"]),
  ms: new Set(["yang", "dan", "di", "ke", "dari", "ini", "itu", "untuk"]),
  ta: new Set(["ஒரு", "இது", "அது", "மற்றும்"]),
};

function filterFillerWords(words, language) {
  const filler = FILLER_WORDS[language] || new Set();
  return words.filter((w) => !filler.has(w));
}