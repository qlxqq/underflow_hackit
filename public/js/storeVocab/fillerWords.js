// Words that carry little standalone meaning and shouldn't clutter the
// word bank (particles, pronouns, connectors). Not exhaustive - extend as
// you find more noise coming through in testing.
const FILLER_WORDS = {
  zh: new Set([
    // particles and connectors
    "的", "了", "着", "过", "是", "在", "和", "与", "與", "及", "而", "也", "都", "就", "还", "但", "或", "把", "被", "跟", "对", "给", "从", "到",
    // question and sentence-end particles
    "吗", "呢", "吧", "啊", "呀", "哦", "嗯", "啦",
    // pronouns and measure word
    "我", "你", "他", "她", "它", "们", "个", "这", "那",
  ]),
  ms: new Set([
    "yang", "dan", "di", "ke", "dari", "ini", "itu", "untuk", "dengan", "pada", "juga", "atau",
    "dalam", "oleh", "kepada", "akan", "telah", "sudah", "ada", "lah", "kah",
    "saya", "aku", "awak", "kami", "kita", "dia", "mereka",
  ]),
  ta: new Set([
    "ஒரு", "இது", "அது", "இந்த", "அந்த", "மற்றும்", "என்று", "ஆனால்", "மேலும்",
    "நான்", "நீ", "அவன்", "அவள்", "நாம்", "நாங்கள்",
  ]),
};

// OCR often produces stray punctuation, digits and single Latin letters.
// A token with no letter in any script is noise, and so is a lone a-z.
function isNoise(word) {
  const w = word.trim();
  if (!/\p{L}/u.test(w)) return true;
  if (/^[A-Za-z]$/.test(w)) return true;
  return false;
}

function filterFillerWords(words, language) {
  const filler = FILLER_WORDS[language] || new Set();
  return words.filter((w) => !isNoise(w) && !filler.has(w) && !filler.has(w.toLowerCase()));
}