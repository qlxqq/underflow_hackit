/* Page logic: state, rendering, buttons. Loads last. */
/* ---------- State ---------- */
const params = new URLSearchParams(location.search);
const state = {
  lang: params.get('lang') || 'zh',     // ?lang=zh | ms | ta
  zone: Number(params.get('zone')) || 1, // ?zone=1 | 2 | 3
  pool: [],                             // ALL phrases for this level (the question bank)
  items: [],                            // the phrases picked for this run
  index: 0,
  results: [],   // { text, score, heard, skipped }
  listening: false,
  bestThisItem: null
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

// Pick this run's phrases: past mistakes first (up to MAX_REVIEW), the rest
// fresh at random, then ordered short -> long so it still gets harder.
function pickRun() {
  const missed = new Set(loadMistakes());
  const reviews = shuffle(state.pool.filter((p) => missed.has(p.text)))
    .slice(0, MAX_REVIEW)
    .map((p) => Object.assign({}, p, { review: true }));
  const fresh = shuffle(state.pool.filter((p) => !missed.has(p.text)))
    .slice(0, QUESTIONS_PER_RUN - reviews.length);
  // If the pool ran out of fresh ones, top up with more reviews
  const extra = shuffle(state.pool.filter((p) => missed.has(p.text) && !reviews.some((r) => r.text === p.text)))
    .slice(0, QUESTIONS_PER_RUN - reviews.length - fresh.length)
    .map((p) => Object.assign({}, p, { review: true }));
  return reviews.concat(fresh, extra).sort((x, y) => x.text.length - y.text.length);
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

state.items = pickRun();

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
function passesNeeded() { return Math.ceil(state.items.length * 2 / 3); }

function finish() {
  const total = state.items.length;
  const attempted = state.results.filter((r) => !r.skipped);
  const passedCount = attempted.filter((r) => r.score >= PASS).length;
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
  const level = ZONES[state.zone].level;

  els.doneXp.textContent = '+' + xp + ' XP';
  els.donePassed.textContent = passedCount + ' / ' + total;
  els.done.classList.toggle('is-failed', !levelCleared);
  // (SVG icons need the attribute itself; .hidden = true does nothing on an <svg>)
  els.doneIconPass.toggleAttribute('hidden', !levelCleared);
  els.doneIconRetry.toggleAttribute('hidden', levelCleared);
  els.retryLevelBtn.hidden = levelCleared;
  els.finishBtn.className = levelCleared ? 'btn btn-primary btn-block' : 'btn btn-outline btn-block';

  els.doneCards.hidden = cards === 0;
  els.doneCards.textContent = cards + ' reward cards earned';

  if (perfect) {
    els.doneTitle.textContent = 'Perfect! Level ' + level + ' complete!';
    els.doneMsg.textContent = 'All ' + total + ' phrases passed. Steady lah.';
  } else if (levelCleared) {
    els.doneTitle.textContent = 'Level ' + level + ' complete!';
    els.doneMsg.textContent = 'Get all ' + total + ' right for an extra card. The ones you missed will come back next time.';
  } else if (attempted.length === 0) {
    els.doneTitle.textContent = 'Not cleared yet';
    els.doneMsg.textContent = 'You skipped every phrase. Give it a go when you can, no one else can hear you.';
  } else {
    els.doneTitle.textContent = 'Almost there!';
    els.doneMsg.textContent = 'Pass ' + needed + ' of ' + total + ' phrases to clear Level ' + level +
      '. You got ' + passedCount + '. The ones you missed will come back, so use Listen or Slow first.';
  }

  els.lesson.hidden = true;
  els.done.hidden = false;
  renderProgress();

  const detail = {
    lang: state.lang, zone: state.zone, level, passed: levelCleared,
    perfect, cards, passedCount, needed, total, xp, avg, results: state.results
  };
  // Always fired when the level ends (pass or not). XP, coins and level progress are
  // already saved by save.js, so listeners should NOT add them again: use it for cards.
  window.dispatchEvent(new CustomEvent('pronunciation:finished', { detail }));
  // Only fired when the level is cleared
  if (levelCleared) {
    window.dispatchEvent(new CustomEvent('pronunciation:complete', { detail }));
  }

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

function showSaveStatus(text) {
  els.saveStatus.textContent = text;
  els.saveStatus.hidden = !text;
}

// Start the same level again from the first phrase
function restartLevel() {
  if (rec) rec.abort();
  if (window.speechSynthesis) speechSynthesis.cancel();
  showSaveStatus('');
  state.items = pickRun();   // new mix: fresh phrases + the ones just missed
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
const JOURNEY_URL = '../island/island.html';
function goToJourney() {
  if (rec) rec.abort();                                  // stop the mic
  releaseMic();
  if (window.speechSynthesis) speechSynthesis.cancel(); // stop any audio
  window.location.href = JOURNEY_URL;
}
els.finishBtn.addEventListener('click', goToJourney);
els.retryLevelBtn.addEventListener('click', restartLevel);
els.playMineBtn.addEventListener('click', () => playMine());
els.compareBtn.addEventListener('click', compareWithCorrect);
els.backBtn.addEventListener('click', goToJourney);

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
els.levelLabel.textContent = 'Level ' + zoneInfo.level + ' · Pronunciation';
els.doneTitle.textContent = 'Level ' + zoneInfo.level + ' complete!';
document.title = 'Pronunciation · Level ' + zoneInfo.level;
document.documentElement.lang = state.lang;
if (!SR) showNotice('Speech recognition needs Chrome or Edge. You can still listen and skip for now.');

// Load the question bank from the database (pronunciation_questions table).
// If it can't be reached, keep using the phrases in lessons.js.
els.micBtn.disabled = true;
els.phrase.textContent = 'Loading…';
const bankReady = typeof loadQuestionBank === 'function' ? loadQuestionBank(state.lang, state.zone) : Promise.resolve(null);
bankReady.catch(() => null).then((rows) => {
  if (rows && rows.length >= QUESTIONS_PER_RUN) {
    state.pool = rows;
    console.info('[pronunciation] question bank: database (' + rows.length + ' phrases)');
  } else {
    console.info('[pronunciation] question bank: lessons.js (database not available)');
  }
  state.items = pickRun();
  els.micBtn.disabled = false;
  renderItem();
});