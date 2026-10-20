/* Page logic: state, rendering, buttons. Loads last. */
/* ---------- State ---------- */
const params = new URLSearchParams(location.search);
// The island opens this page as  pronunciation.html?zone=2&level=2&island=4&lang=zh[&focus=<word>]
//   island = the level's number on the island (1-9). Only present when the island opened the page:
//            then the island pays the reward (coins, XP, cards) when the player goes back to it,
//            and this page saves nothing to the account except the daily streak.
//   focus  = a zone word the player is practising: one of the phrases always uses it.
const islandLevel = Number(params.get('island')) || 0;
const focusWord = params.get('focus') || '';
const ISLAND_PAGE = '../island/island.html';
const RESULT_KEY = 'island:minigame-result';   // read by js/island/miniGames.js
const ISLAND_PASS_RATIO = 0.75;                // on the island, clearing the level needs 75% of the phrases (5 of 6), the same rule as every island game
// true = a phrase counts only if the FIRST try passed (like composition). false = the best try counts (Retry is allowed).
const FIRST_TRY_ONLY = false;
const state = {
  lang: params.get('lang') || 'zh',     // ?lang=zh | ms | ta
  zone: Number(params.get('zone')) || 1, // ?zone=1 | 2 | 3
  pool: [],                             // ALL phrases for this level (the question bank)
  items: [],                            // the phrases picked for this run
  index: 0,
  results: [],   // { text, score, heard, skipped }
  listening: false,
  bestThisItem: null,
  firstScoreThisItem: null,  // score of the first try at this phrase
  captured: []               // the player's captured words that fit this zone (for the bonus question)
};
if (!LESSONS[state.lang]) state.lang = 'zh';
if (!LESSONS[state.lang].zones[state.zone]) state.zone = 1;
state.pool = LESSONS[state.lang].zones[state.zone];

/* ============================================================
   Mistakes: remembered per language + zone in this browser, so
   phrases you failed or skipped come back next time you play.
   ============================================================ */
const MISTAKES_KEY = 'pr-mistakes:' + state.lang + ':' + state.zone;

function loadMistakes() {
  try { return JSON.parse(localStorage.getItem(MISTAKES_KEY)) || []; }
  catch (err) { return []; }   // private window / storage blocked: just start fresh
}
function saveMistakes(list) {
  try { localStorage.setItem(MISTAKES_KEY, JSON.stringify(list)); }
  catch (err) { /* storage blocked: mistakes won't carry over, page still works */ }
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pick this run's phrases from the whole question bank: past mistakes first (up to MAX_REVIEW), the rest
// phrases not asked recently (random), in a random order.
// Phrases already asked, remembered per language + zone in this browser, so the next run starts with
// phrases the player has not had yet (then the ones asked longest ago). A bigger question bank feels fresher.
const SEEN_KEY = 'pr-seen:' + state.lang + ':' + state.zone;
function loadSeen() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || []; }
  catch (err) { return []; }
}
function saveSeen(texts) {
  try {
    const now = new Set(texts);
    localStorage.setItem(SEEN_KEY, JSON.stringify(loadSeen().filter((t) => !now.has(t)).concat(texts).slice(-400)));
  } catch (err) { /* storage blocked: still random, just no memory */ }
}
// not seen yet (random order) first, then the seen ones, longest ago first
function unseenFirst(list) {
  const seen = loadSeen();
  const rank = new Map(seen.map((t, i) => [t, i]));
  return shuffle(list.filter((p) => !rank.has(p.text)))
    .concat(list.filter((p) => rank.has(p.text)).sort((x, y) => rank.get(x.text) - rank.get(y.text)));
}

function pickRun(count) {
  const want = count || QUESTIONS_PER_RUN;
  const missed = new Set(loadMistakes());
  const reviews = shuffle(state.pool.filter((p) => missed.has(p.text)))
    .slice(0, Math.min(MAX_REVIEW, want))
    .map((p) => Object.assign({}, p, { review: true }));
  const fresh = unseenFirst(state.pool.filter((p) => !missed.has(p.text)))
    .slice(0, want - reviews.length);
  // If the pool ran out of fresh ones, top up with more reviews
  const extra = shuffle(state.pool.filter((p) => missed.has(p.text) && !reviews.some((r) => r.text === p.text)))
    .slice(0, want - reviews.length - fresh.length)
    .map((p) => Object.assign({}, p, { review: true }));
  const run = reviews.concat(fresh, extra);
  // Practising a card: make sure one phrase uses that word (it replaces the longest fresh one)
  if (focusWord && !run.some((p) => (p.words || []).includes(focusWord))) {
    const hit = shuffle(state.pool.filter((p) => (p.words || []).includes(focusWord)))[0];
    if (hit) {
      let at = -1;
      run.forEach((p, i) => { if (!p.review && (at < 0 || p.text.length > run[at].text.length)) at = i; });
      if (at < 0) at = run.length - 1;
      if (run.length) run[at] = Object.assign({}, hit); else run.push(Object.assign({}, hit));
    }
  }
  saveSeen(run.map((p) => p.text));
  return shuffle(run);   // any phrase from the question bank, in a random order
}

// One bonus phrase built from two of the player's captured words, or null (fewer than BONUS_MIN_WORDS fit the zone).
function makeBonus() {
  const frame = (BONUS_FRAMES[state.lang] || {})[state.zone];
  if (!frame || state.captured.length < BONUS_MIN_WORDS) return null;
  // the two words the player has practised least (ties are random)
  const pair = shuffle(state.captured).sort((x, y) => (x.usage_count || 0) - (y.usage_count || 0)).slice(0, 2);
  const [a, b] = pair;
  const fill = (t) => t.replace('{A}', a.word).replace('{B}', b.word);
  const bothRoman = a.romanization && b.romanization;
  return {
    text: fill(frame.text),
    roman: bothRoman && frame.roman ? frame.roman.replace('{A}', a.romanization).replace('{B}', b.romanization) : '',
    meaning: frame.en(a.simpleMeaning, b.simpleMeaning) + '  (your words: ' + a.word + ' = ' + a.simpleMeaning + ', ' + b.word + ' = ' + b.simpleMeaning + ')',
    context: 'Bonus \u00b7 your own words',
    words: [],                                   // not zone words, so no zone cards for these
    bonus: true,
    bonusWords: [a.word, b.word],
    bonusMeanings: [a.simpleMeaning, b.simpleMeaning]
  };
}

// The phrases of one run: with a bonus question the run is one phrase shorter and the bonus goes in at a random place.
function buildRun() {
  const bonus = makeBonus();
  const run = pickRun(bonus ? QUESTIONS_PER_RUN - 1 : QUESTIONS_PER_RUN);
  if (bonus) run.splice(Math.floor(Math.random() * (run.length + 1)), 0, bonus);
  return run;
}

// After a run: passed phrases leave the mistakes list, failed/skipped ones join it
function updateMistakes() {
  const list = new Set(loadMistakes());
  state.results.forEach((r) => {
    if (!r.skipped && r.score >= PASS) list.delete(r.text);
    else list.add(r.text);
  });
  // only keep phrases that still exist in this level
  saveMistakes([...list].filter((t) => state.pool.some((p) => p.text === t)));
}

state.items = pickRun();   // replaced by buildRun() once the captured words are known (below)

const LANG_LABELS = { zh: '中文', ms: 'Melayu', ta: 'தமிழ்' };
const $ = (id) => document.getElementById(id);
const els = {
  progress: $('progress'), langBadge: $('langBadge'), contextText: $('contextText'),
  phrase: $('phrase'), roman: $('roman'), meaning: $('meaning'),
  listenBtn: $('listenBtn'), slowBtn: $('slowBtn'), micBtn: $('micBtn'), micZone: $('micZone'),
  micHint: $('micHint'), heard: $('heard'), notice: $('notice'), result: $('result'),
  ringArc: $('ringArc'), scoreNum: $('scoreNum'), resultTitle: $('resultTitle'), resultSub: $('resultSub'),
  actions: $('actions'), retryBtn: $('retryBtn'), nextBtn: $('nextBtn'), skipBtn: $('skipBtn'),
  lesson: $('lesson'), done: $('done'), doneXp: $('doneXp'),
  finishBtn: $('finishBtn'), backBtn: $('backBtn'),
  zonePill: $('zonePill'), levelLabel: $('levelLabel'), doneTitle: $('doneTitle'),
  doneMsg: $('doneMsg'), donePassed: $('donePassed'), doneIconPass: $('doneIconPass'),
  doneIconRetry: $('doneIconRetry'), retryLevelBtn: $('retryLevelBtn'),
  reviewTag: $('reviewTag'), doneCards: $('doneCards'),
  compare: $('compare'), playMineBtn: $('playMineBtn'), compareBtn: $('compareBtn'), compareTip: $('compareTip'),
  saveStatus: $('saveStatus')
};


/* ============================================================
   Scoring + feedback
   ============================================================ */
function handleFinal(alternatives) {
  const lesson = LESSONS[state.lang];
  const item = state.items[state.index];

  // Use whichever alternative scored best
  let best = { score: -1 };
  for (const alt of alternatives) {
    const r = scoreAttempt(item.text, alt, lesson.unit);
    if (r.score > best.score) best = { ...r, heard: alt };
  }

  if (state.firstScoreThisItem === null) state.firstScoreThisItem = best.score;
  if (!state.bestThisItem || best.score > state.bestThisItem.score) state.bestThisItem = best;

  paintTokens(best.matched);
  showResult(best.score);
}

function paintTokens(matched) {
  const toks = els.phrase.querySelectorAll('.pr-tok[data-i]');
  toks.forEach((el) => {
    const i = Number(el.dataset.i);
    el.classList.toggle('is-ok', !!matched[i]);
    el.classList.toggle('is-miss', !matched[i]);
  });
}

function feedbackFor(score) {
  if (score >= 85) return { title: 'Steady! Sounds natural.', sub: 'You could say that to anyone.' };
  if (score >= PASS) return { title: 'Nearly there!', sub: 'Check the red parts, then go again or carry on.' };
  return { title: 'Good try!', sub: 'Listen once more (try Slow), then have another go.' };
}

function showResult(score) {
  const C = 2 * Math.PI * 30;
  els.ringArc.style.strokeDashoffset = String(C * (1 - score / 100));
  els.ringArc.style.opacity = score > 0 ? '1' : '0';
  els.scoreNum.textContent = score;
  const fb = feedbackFor(score);
  const xp = score >= PASS ? XP_PASS : XP_TRY;
  els.resultTitle.textContent = fb.title;
  els.resultSub.innerHTML = '';
  els.resultSub.append(fb.sub + ' ');
  const xpEl = document.createElement('span');
  xpEl.className = 'pr-xp';
  xpEl.textContent = '+' + xp + ' XP';
  els.resultSub.append(xpEl);

  els.result.hidden = false;
  els.actions.hidden = false;
  els.skipBtn.hidden = true;
  els.compare.hidden = !myRecordingUrl;   // may also appear a moment later, see below
}

function hideResult() {
  els.result.hidden = true;
  els.compare.hidden = true;
  els.ringArc.style.strokeDashoffset = '188.5';
}

// Called by speech.js when the recording of this attempt is ready
function onRecordingReady() {
  if (!els.result.hidden) els.compare.hidden = false;
}

/* ============================================================
   Rendering
   ============================================================ */
// Progress bar: green = passed, pale amber = tried but below the pass mark,
// grey = skipped, orange = the phrase you're on now
function renderProgress() {
  const total = state.items.length;
  els.progress.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const s = document.createElement('span');
    const r = state.results[i];
    if (r) s.className = r.skipped ? 'is-skipped' : r.score >= PASS ? 'is-done' : 'is-weak';
    else if (i === state.index) s.className = 'is-current';
    els.progress.appendChild(s);
  }
}

function renderItem() {
  const lesson = LESSONS[state.lang];
  const item = state.items[state.index];
  state.bestThisItem = null;
  state.firstScoreThisItem = null;
  clearRecording();

  els.contextText.textContent = item.context;
  els.reviewTag.hidden = !item.review;   // "Missed last time" tag
  els.phrase.className = 'pr-phrase lang-' + state.lang;
  // Shrink the text for longer sentences so the mic stays on screen
  const len = item.text.length;
  if (len > 30) els.phrase.classList.add('is-xlong');
  else if (len > 12) els.phrase.classList.add('is-long');
  els.phrase.innerHTML = '';
  let k = 0;
  displayUnits(item.text, lesson.unit).forEach((u) => {
    const span = document.createElement('span');
    span.className = 'pr-tok';
    span.textContent = u.shown;
    if (u.scorable) span.dataset.i = String(k++);
    els.phrase.appendChild(span);
  });
  els.roman.textContent = item.roman;
  els.roman.hidden = !item.roman;
  els.meaning.textContent = item.meaning;

  els.heard.textContent = '';
  hideNotice();
  hideResult();
  els.actions.hidden = true;
  els.skipBtn.hidden = false;
  renderProgress();
}

function showNotice(msg) { els.notice.textContent = msg; els.notice.hidden = false; }
function hideNotice() { els.notice.hidden = true; }

function next(skipped) {
  const item = state.items[state.index];
  const best = state.bestThisItem;
  state.results.push({
    text: item.text,
    words: item.words || [],
    bonus: !!item.bonus,
    firstScore: skipped || state.firstScoreThisItem === null ? 0 : state.firstScoreThisItem,
    score: skipped || !best ? 0 : best.score,
    heard: best ? best.heard : '',
    skipped: !!skipped
  });
  state.index++;
  if (state.index >= state.items.length) finish();
  else renderItem();
}

// How many phrases you must pass (score >= PASS, not skipped) to clear the level.
// 2/3 of the phrases, so 4 out of 6.
function passesNeeded() { return Math.ceil(state.items.length * (islandLevel ? ISLAND_PASS_RATIO : 2 / 3)); }

// Does this phrase count as passed (for the level and for the island)?
function phrasePassed(r) { return !r.skipped && (FIRST_TRY_ONLY ? r.firstScore : r.score) >= PASS; }

function finish() {
  const total = state.items.length;
  const attempted = state.results.filter((r) => !r.skipped);
  const passedCount = state.results.filter(phrasePassed).length;
  const needed = passesNeeded();
  const levelCleared = passedCount >= needed;
  const perfect = passedCount === total;
  // Reward cards (handed out by the shared card system, not this page):
  // all correct = 3, cleared = 2, not cleared = 0
  const cards = perfect ? 3 : levelCleared ? 2 : 0;
  updateMistakes();
  // XP: full points for a pass, a little for trying, nothing for skipping
  const xp = attempted.reduce((sum, r) => sum + (r.score >= PASS ? XP_PASS : XP_TRY), 0);
  const avg = attempted.length ? Math.round(attempted.reduce((s, r) => s + r.score, 0) / attempted.length) : 0;
  const level = islandLevel || ZONES[state.zone].level;

  els.doneXp.textContent = '+' + xp + ' XP';
  els.donePassed.textContent = passedCount + ' / ' + total;
  els.done.classList.toggle('is-failed', !levelCleared);
  // (SVG icons need the attribute itself; .hidden = true does nothing on an <svg>)
  els.doneIconPass.toggleAttribute('hidden', !levelCleared);
  els.doneIconRetry.toggleAttribute('hidden', levelCleared);
  els.retryLevelBtn.hidden = levelCleared;
  els.finishBtn.className = levelCleared ? 'btn btn-primary btn-block' : 'btn btn-outline btn-block';

  // On the island the island decides the cards (and pays coins and XP), so just say where to collect
  if (islandLevel) {
    els.doneXp.textContent = 'On the island';
    els.doneCards.hidden = true;
  } else {
    els.doneCards.hidden = cards === 0;
    els.doneCards.textContent = cards + ' reward cards earned';
  }

  if (perfect) {
    els.doneTitle.textContent = 'Perfect!';
    els.doneMsg.textContent = 'All ' + total + ' phrases passed. Steady lah.';
  } else if (levelCleared) {
    els.doneTitle.textContent = 'Well done!';
    els.doneMsg.textContent = 'Get all ' + total + ' right for an extra card. The ones you missed will come back next time.';
  } else if (attempted.length === 0) {
    els.doneTitle.textContent = 'Not cleared yet';
    els.doneMsg.textContent = 'You skipped every phrase. Give it a go when you can, no one else can hear you.';
  } else {
    els.doneTitle.textContent = 'Almost there!';
    els.doneMsg.textContent = 'Pass ' + needed + ' of ' + total + ' phrases to clear this game' +
      '. You got ' + passedCount + '. The ones you missed will come back, so use Listen or Slow first.';
  }

  els.lesson.hidden = true;
  els.done.hidden = false;
  renderProgress();

  const detail = {
    lang: state.lang, zone: state.zone, level, passed: levelCleared,
    perfect, cards, passedCount, needed, total, xp, avg, results: state.results,
    fromIsland: !!islandLevel
  };
  // Always fired when the level ends (pass or not). XP, coins and level progress are
  // already saved by save.js, so listeners should NOT add them again: use it for cards.
  window.dispatchEvent(new CustomEvent('pronunciation:finished', { detail }));
  // Only fired when the level is cleared
  if (levelCleared) {
    window.dispatchEvent(new CustomEvent('pronunciation:complete', { detail }));
  }

  // Opened from the island: hand the result back to it. It pays coins, XP and cards (and marks the level done).
  if (islandLevel) { handOffToIsland(detail, levelCleared); return; }

  // Save XP, coins and level progress to the player's account (save.js)
  showSaveStatus('Saving…');
  if (typeof savePronunciationResult !== 'function') { showSaveStatus(''); return; }
  savePronunciationResult(detail).catch(() => ({ saved: false, unavailable: true, coins: 0 })).then((r) => {
    const coinsText = r.coins ? '+' + r.coins + ' coins · ' : '';
    if (r.saved) {
      showSaveStatus(coinsText + (r.levelUps ? 'Level up! ' : '') + 'Saved to your progress');
    } else if (r.unavailable) {
      showSaveStatus("Progress couldn't be saved right now (no connection to the server)");
    } else if (!r.signedIn) {
      showSaveStatus('Not signed in, so this run was not saved');
    } else {
      showSaveStatus("Couldn't save this run. Check your connection.");
    }
  });
}

// The island pays the reward when the player goes back to it. This page only counts the daily streak
// (save.js) and leaves the result where the island looks for it (the same way composition does).
async function handOffToIsland(detail, levelCleared) {
  els.finishBtn.disabled = true;   // until the result is ready to hand over
  els.finishBtn.textContent = levelCleared ? 'Collect reward on the island \u2192' : 'Back to the island \u2192';
  showSaveStatus('');
  let userId = null;
  try {
    const r = typeof savePronunciationResult === 'function' ? await savePronunciationResult(detail) : null;
    userId = r && r.userId ? r.userId : null;
  } catch (err) { console.error('[pronunciation] could not count the streak:', err); }
  if (!userId && typeof currentUserId === 'function') { try { userId = await currentUserId(); } catch (err) { /* not signed in */ } }
  if (userId) {
    // the zone words of the phrases that passed (they can win zone cards and make owned cards evolve)
    const words = [];
    state.results.filter(phrasePassed).forEach((r) => (r.words || []).forEach((w) => { if (!words.includes(w)) words.push(w); }));
    const result = {
      userId, level: islandLevel, language: state.lang,
      ratio: detail.total ? detail.passedCount / detail.total : 0,
      total: detail.total, words, right: words, at: Date.now()
    };
    // the bonus question: the player's own captured words (not zone cards, but they can make owned cards evolve)
    const bonusItem = state.items.find((i) => i.bonus);
    const bonusRes = state.results.find((r) => r.bonus);
    if (bonusItem) {
      const ok = !!(bonusRes && phrasePassed(bonusRes));
      result.bonus = { words: bonusItem.bonusWords, meanings: bonusItem.bonusMeanings, right: ok };
      if (ok) result.right = words.concat(bonusItem.bonusWords.filter((w) => !words.includes(w)));
    }
    // two ways to hand it over, in case one is blocked: saved on this device, and on the island's address
    try { localStorage.setItem(RESULT_KEY, JSON.stringify(result)); } catch (err) { console.error('[pronunciation] could not save the result for the island:', err); }
    journeyUrl = ISLAND_PAGE + '?mg=' + encodeURIComponent(JSON.stringify(result));
  } else {
    showSaveStatus('Not signed in, so this run was not saved');
  }
  els.finishBtn.disabled = false;
}

function showSaveStatus(text) {
  els.saveStatus.textContent = text;
  els.saveStatus.hidden = !text;
}

// Start the same level again from the first phrase
function restartLevel() {
  if (rec) rec.abort();
  if (window.speechSynthesis) speechSynthesis.cancel();
  showSaveStatus('');
  els.finishBtn.disabled = false;
  state.items = buildRun();   // new mix: fresh phrases + the ones just missed (+ a new bonus)
  state.index = 0;
  state.results = [];
  els.done.hidden = true;
  els.lesson.hidden = false;
  renderItem();
}

function restart(lang) {
  if (rec) rec.abort();
  if (window.speechSynthesis) speechSynthesis.cancel();
  state.lang = lang;
  state.index = 0;
  state.results = [];
  document.documentElement.lang = lang;
  els.lesson.hidden = false;
  els.done.hidden = true;
  renderItem();
}

/* ============================================================
   Events
   ============================================================ */
els.micBtn.addEventListener('click', () => (state.listening ? stopListening() : startListening()));
els.listenBtn.addEventListener('click', () => speak(0.9));
els.slowBtn.addEventListener('click', () => speak(0.6));
els.retryBtn.addEventListener('click', () => {
  hideResult();
  els.actions.hidden = true;
  els.skipBtn.hidden = false;
  els.phrase.querySelectorAll('.pr-tok').forEach((el) => el.classList.remove('is-ok', 'is-miss'));
  startListening();
});
els.nextBtn.addEventListener('click', () => next(false));
els.skipBtn.addEventListener('click', () => next(true));
// Where the back arrow and "Back to journey" go. Change this if your journey page lives elsewhere.
let journeyUrl = '../island/island.html';   // becomes island.html?mg=... once a result is ready
function goToJourney() {
  if (rec) rec.abort();                                  // stop the mic
  releaseMic();
  if (window.speechSynthesis) speechSynthesis.cancel(); // stop any audio
  window.location.href = journeyUrl;
}
els.finishBtn.addEventListener('click', goToJourney);
els.retryLevelBtn.addEventListener('click', restartLevel);
els.playMineBtn.addEventListener('click', () => playMine());
els.compareBtn.addEventListener('click', compareWithCorrect);
els.backBtn.addEventListener('click', async () => {
  // Part-way through a run the player is asked first: leaving throws the run away. Once the results are showing there is nothing to lose.
  if (els.done.hidden) {
    const leave = await (typeof LeaveGuard !== "undefined" ? LeaveGuard.confirm() : Promise.resolve(window.confirm("Leave this round? All your progress will be lost and you will start again.")));
    if (!leave) return;
  }
  goToJourney();
});

/* ---------- Init ---------- */
els.langBadge.textContent = LANG_LABELS[state.lang];
// Chinese is tonal, Malay and Tamil aren't, so the Compare tip differs
els.compareTip.textContent = state.lang === 'zh'
  ? 'Compare plays your voice, then the correct one. Listen for the tones and rhythm.'
  : 'Compare plays your voice, then the correct one. Listen for the sounds and rhythm.';
// Zone name, colour and level number at the top + on the done screen
const zoneInfo = ZONES[state.zone];
els.zonePill.textContent = 'ZONE ' + state.zone + '\u00a0\u00a0' + zoneInfo.name;
els.zonePill.style.background = zoneInfo.color;
const shownLevel = islandLevel || zoneInfo.level;
els.levelLabel.textContent = 'Pronunciation';
els.doneTitle.textContent = 'Well done!';
document.title = 'Pronunciation';
document.documentElement.lang = state.lang;
if (!SR) showNotice('Speech recognition needs Chrome or Edge. You can still listen and skip for now.');

// Load the question bank from the database (pronunciation_questions table).
// If it can't be reached, keep using the phrases in lessons.js.
els.micBtn.disabled = true;
els.phrase.textContent = 'Loading…';
const bankReady = typeof loadQuestionBank === 'function' ? loadQuestionBank(state.lang, state.zone) : Promise.resolve(null);
const capturedReady = typeof loadCapturedWords === 'function' ? loadCapturedWords(state.lang, state.zone) : Promise.resolve([]);
Promise.all([bankReady.catch(() => null), capturedReady.catch(() => [])]).then(([rows, captured]) => {
  state.captured = captured || [];
  if (rows && rows.length >= QUESTIONS_PER_RUN) {
    state.pool = rows;
    console.info('[pronunciation] question bank: database (' + rows.length + ' phrases)');
  } else {
    console.info('[pronunciation] question bank: lessons.js (database not available)');
  }
  state.items = buildRun();
  console.info('[pronunciation] bonus question: ' + (state.items.some((i) => i.bonus) ? 'yes' : 'no') + ' (' + state.captured.length + ' captured words fit this zone)');
  els.micBtn.disabled = false;
  renderItem();
});