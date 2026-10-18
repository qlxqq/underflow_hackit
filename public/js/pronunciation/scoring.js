/* Splits phrases into pieces and scores what the mic heard. */
/* ============================================================
   Text helpers: split into display units + scoring tokens
   ============================================================ */
const PUNCT = /[\p{P}\p{S}]/u;

function normalize(str) {
  return str.toLowerCase().normalize('NFC').replace(/[\p{P}\p{S}]/gu, ' ').replace(/\s+/g, ' ').trim();
}

// Tokens used for comparison
function tokenize(str, unit) {
  const clean = normalize(str);
  if (!clean) return [];
  return unit === 'char' ? Array.from(clean.replace(/\s/g, '')) : clean.split(' ');
}

// Units used for display (keeps punctuation, flags which ones are scorable)
function displayUnits(str, unit) {
  if (unit === 'char') {
    // Punctuation sticks to the character before it, so "。" never wraps onto its own line
    const units = [];
    for (const c of Array.from(str)) {
      const isText = !PUNCT.test(c) && c.trim() !== '';
      if (!isText && units.length) units[units.length - 1].shown += c;
      else units.push({ shown: c, scorable: isText });
    }
    return units;
  }
  return str.split(/\s+/).map((w) => ({ shown: w, scorable: normalize(w) !== '' }));
}

// Longest-common-subsequence: which target tokens were heard, in order
function matchTokens(target, heard) {
  const n = target.length, m = heard.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = target[i] === heard[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const matched = new Array(n).fill(false);
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (target[i] === heard[j]) { matched[i] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return matched;
}

function scoreAttempt(targetText, heardText, unit) {
  const target = tokenize(targetText, unit);
  const heard = tokenize(heardText, unit);
  const matched = matchTokens(target, heard);
  const hits = matched.filter(Boolean).length;
  // Small penalty for lots of extra words/characters
  const extra = Math.max(0, heard.length - target.length);
  const raw = target.length ? hits / target.length : 0;
  const score = Math.max(0, Math.round((raw - extra * 0.05) * 100));
  return { score, matched };
}