// Festival page: the live treasure hunt. Step 1: photograph a real decoration. Step 2: name it in Chinese.
// A word is found only after both; the card then shows the player's photo and how each character is written and the festivals coming up.
// Both steps are checked by the festival-verify Edge Function; points are the strokes in each new word.

const $ = (id) => document.getElementById(id);
const LOGIN_PAGE = "../auth/login.html";

let user = null, language = "zh", event = null, eventWords = [], foundSet = new Set(), spottedSet = new Set(), busy = false;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
function say(text, kind) {
  const s = $("fest-status");
  s.textContent = text || "";
  s.className = "status-message" + (kind ? ` ${kind}` : "");
}
function motherTongue() {
  try { return localStorage.getItem(`journeyLanguage:${user.id}`) || "zh"; } catch (e) { return "zh"; }
}

// The banner at the top of a found word: a cartoon picture of it on a Halloween night (festivalArt.js), with the player's
// own photo as a small round picture in the corner when it is on this phone.
function banner(w) {
  const box = el("div", "fw-banner fw-art");
  box.innerHTML = typeof FESTIVAL_ART !== "undefined" ? FESTIVAL_ART.svgFor(w.word) : "";
  if (!box.firstElementChild) { box.className = "fw-banner fw-banner-text"; box.textContent = w.word; return box; }
  const photo = Festival.loadPhoto(user.id, event.id, w.word);
  if (photo) {
    const img = el("img", "fw-photo");
    img.src = photo; img.alt = `Your photo of the ${w.meaning}`;
    box.append(img);
  }
  return box;
}

function wordCard(w) {
  const found = foundSet.has(w.word), pending = !found && spottedSet.has(w.word);
  const li = el("li", "fest-word" + (found ? " is-found" : pending ? " is-pending" : ""));
  if (found) {
    li.append(banner(w));
    const head = el("div", "fw-head");
    head.append(el("span", "fw-word", w.word), el("span", "fw-py", w.pinyin), el("span", "fw-pts", `+${w.strokes} pts`));
    li.append(head, el("p", "fw-meaning", w.meaning));
  } else if (pending) {
    // The photo passed. The player still has to say what the word is in Chinese.
    const photo = Festival.loadPhoto(user.id, event.id, w.word);
    if (photo) { const img = el("img", "fw-banner"); img.src = photo; img.alt = `Your photo of the ${w.meaning}`; li.append(img); }
    const head = el("div", "fw-head");
    head.append(el("span", "fw-word fw-hidden", "?"), el("span", "fw-pts", `${w.strokes} pts`));
    li.append(head, el("p", "fw-meaning", `Photo approved: ${w.meaning}. Tap to name it in Chinese.`));
    li.tabIndex = 0; li.setAttribute("role", "button");
    li.addEventListener("click", () => openAsk(w.word));
    li.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openAsk(w.word); } });
  } else {
    const head = el("div", "fw-head");
    head.append(el("span", "fw-word fw-hidden", "?"), el("span", "fw-pts", `${w.strokes} pts`));
    li.append(head, el("p", "fw-meaning", `Hint: ${w.meaning}`));
  }
  return li;
}

// Whole days from today (Singapore date, the same day the database uses) to a YYYY-MM-DD date. Worked out each time it is drawn,
// so the count never goes stale.
function daysFromToday(date) { return Math.round((Date.parse(date) - Date.parse(Festival.today())) / 86400000); }

function renderLive() {
  const total = eventWords.length, n = foundSet.size;
  const pts = eventWords.filter((w) => foundSet.has(w.word)).reduce((s, w) => s + w.strokes, 0);
  $("fest-icon").replaceChildren(Festival.iconSvg(event.icon, 40));
  $("fest-name").textContent = event.name;
  $("fest-native").textContent = event.name_native || "";
  $("fest-blurb").textContent = event.blurb || "";
  const left = daysFromToday(event.ends_on) + 1;
  $("fest-days").textContent = left <= 1 ? "Last day!" : `${left} days left`;
  $("fest-points").textContent = `${pts} pts earned`;
  $("fest-fill").style.width = total ? `${Math.round((n / total) * 100)}%` : "0%";
  $("fest-progress").textContent = n >= total && total ? `All ${total} found! Bonus collected.` : `${n} of ${total} found. Find them all for a ${event.bonus} point bonus.`;
  $("fest-words").replaceChildren(...eventWords.map(wordCard));
}

function renderUpcoming(list) {
  $("fest-upcoming-wrap").hidden = list.length === 0;
  $("fest-upcoming").replaceChildren(...list.map((e) => {
    const li = el("li", "fest-up");
    const ic = el("span", "fest-up-icon"); ic.append(Festival.iconSvg(e.icon, 30));
    const txt = el("div", "fest-up-text");
    txt.append(el("strong", "", e.name_native ? `${e.name_native}` : e.name), el("span", "", e.name));
    li.append(ic, txt, el("span", "fest-pill", daysFromToday(e.starts_on) <= 1 ? "Tomorrow" : `In ${daysFromToday(e.starts_on)} days`));
    return li;
  }));
}

// The card reveal: the card's back flips over to the new hunt card with its festival label. Resolves when the player moves on.
function revealCard(w) {
  return new Promise((resolve) => {
    if (typeof FESTIVAL_CARD === "undefined") { resolve(); return; }
    const wrap = el("div", "fr-wrap");
    wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-modal", "true"); wrap.setAttribute("aria-label", "New treasure card");
    const stage = el("div", "fr-stage");
    const flip = el("div", "fr-flip"), inner = el("div", "fr-inner");
    const front = el("div", "fr-face fr-front");
    front.append(FESTIVAL_CARD.cardEl({ event_id: event.id, event_name: event.name, word: w.word, pinyin: w.pinyin, meaning: w.meaning, usage_count: 0, evolution_stage: 0 }));
    inner.append(front, el("div", "fr-face fr-back", "?"));
    flip.append(inner);
    const link = el("a", "fr-btn main", "See it in your collection");
    link.href = `../storeVocab/storeVocab.html?festival=${encodeURIComponent(event.id)}#collection`;
    const keep = el("button", "fr-btn ghost", "Keep hunting");
    keep.type = "button";
    const actions = el("div", "fr-actions"); actions.append(link, keep);
    stage.append(el("h2", "fr-title", "New treasure card!"), flip, el("p", "fr-line", `Added to your ${FESTIVAL_CARD.info(event.id, event.name).label} album.`), actions);
    wrap.append(stage);
    document.body.append(wrap);
    const done = () => { wrap.remove(); resolve(); };
    keep.addEventListener("click", done);
    link.addEventListener("click", () => { wrap.remove(); resolve(); });
    setTimeout(() => inner.classList.add("is-flipped"), 350);
    setTimeout(() => wrap.classList.add("is-shown"), 700);
    keep.focus();
  });
}

const WHY = { picture: "a drawing or printed picture", screen: "a screen" };

// ---- step 2: name the word ----
let askWord = null, askWrong = 0;

function askSay(text, kind) {
  const n = $("ask-status");
  n.textContent = text || "";
  n.className = "status-message" + (kind ? ` ${kind}` : "");
}
function openAsk(word) {
  const w = eventWords.find((x) => x.word === word);
  if (!w) return;
  askWord = word; askWrong = 0;
  const photo = Festival.loadPhoto(user.id, event.id, word);
  const box = $("ask-photo");
  box.hidden = !photo;
  if (photo) box.src = photo;
  $("ask-text").textContent = `You spotted a ${w.meaning}! What is the Chinese word for it?`;
  $("ask-input").value = "";
  askSay("");
  $("fest-ask").hidden = false;
  setTimeout(() => $("ask-input").focus(), 50);
}
function closeAsk() { $("fest-ask").hidden = true; askWord = null; }

$("ask-later").addEventListener("click", closeAsk);
$("ask-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = $("ask-input").value.trim();
  if (!text || busy || !askWord) return;
  const w = eventWords.find((x) => x.word === askWord);
  busy = true; askSay("Checking...", "info");
  try {
    const r = await Festival.answer(event.id, askWord, text);
    if (!r.correct) {
      askWrong += 1;
      const hint = askWrong >= 2 ? ` Hint: it sounds like "${w.pinyin}".` : ` Hint: it has ${[...w.word].length} character${[...w.word].length === 1 ? "" : "s"}.`;
      askSay(`Not quite.${hint}`, "error");
      return;
    }
    const claim = r.claim;
    spottedSet.delete(askWord); foundSet.add(askWord);
    closeAsk(); renderLive();
    const lines = claim.found.map((f) => `${f.word} <b>+${f.points}</b>`);
    if (claim.bonus) lines.push(`All words found! <b>+${claim.bonus}</b> bonus`);
    // The new hunt card is revealed first (flip, festival label), then the coins and XP.
    const fresh = claim.found && claim.found[0] && eventWords.find((x) => x.word === claim.found[0].word);
    if (fresh) await revealCard(fresh);
    try { await recordStreakActivity(user.id); } catch (err) { /* streak is a nice-to-have */ }
    await showCelebration({
      title: "Treasure found!",
      text: `You earned ${claim.points + claim.bonus} coins and XP.`,
      badgeHtml: "",
      lines,
    });
  } catch (err) {
    console.error(err);
    askSay("Could not check that. Check your connection and try again.", "error");
  } finally { busy = false; }
});

// ---- step 1: the photo ----
async function checkPhoto(file) {
  const canvas = await photoToCanvas(file);
  const r = await Festival.verify(event.id, canvas);
  if (r.spotted && r.spotted.length) {
    const thumb = Festival.makeThumb(canvas);
    r.spotted.forEach((word) => { spottedSet.add(word); Festival.savePhoto(user.id, event.id, word, thumb); });
    renderLive();
    say("");
    openAsk(r.spotted[0]); // the others wait in the list, marked "Photo approved"
    return;
  }
  if (r.already && r.already.length) { say("You already collected that one. Each item can only be collected once, so look for another!", "info"); return; }
  if (r.rejected && r.rejected.length) {
    const w = r.rejected[0], meaning = (eventWords.find((x) => x.word === w.word) || {}).meaning || "that";
    say(`That looks like ${WHY[w.why] || "a picture"} of a ${meaning}. Find a real one and photograph it.`, "error");
    return;
  }
  say("No festival decorations found in that photo. Move closer and try again.", "error");
}

$("fest-photo").addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!file || busy) return;
  busy = true; say("Checking your photo...", "info");
  try {
    await checkPhoto(file);
  } catch (err) {
    console.error(err);
    say("Could not check the photo. Check your connection and try again.", "error");
  } finally { busy = false; }
});

(async function start() {
  try { user = await getCurrentUser(); } catch (e) { user = null; }
  if (!user) { location.href = LOGIN_PAGE; return; }
  language = motherTongue();
  let all = [];
  try { all = await Festival.events(language); } catch (err) { console.error(err); }
  event = all.find((e) => e.live) || null;
  if (event) {
    try {
      eventWords = await Festival.words(event.id);
      foundSet = new Set((await Festival.finds(user.id, event.id)).map((f) => f.word));
      try { spottedSet = new Set((await Festival.spotted(user.id, event.id)).filter((w) => !foundSet.has(w))); } catch (err) { console.error(err); }
      renderLive();
      $("fest-live").hidden = false;
    } catch (err) { console.error(err); event = null; }
  }
  $("fest-none").hidden = !!event;
  renderUpcoming(all.filter((e) => e.upcoming));
  $("fest-main").hidden = false;
})();

// The count follows the calendar: redraw when the phone wakes up or the tab comes back, and at midnight Singapore time.
// When the hunt has ended or the next one has begun, reload so the right event shows.
let shownDay = Festival.today();
function refreshDay() {
  if (Festival.today() === shownDay) return;
  location.reload();
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshDay(); });
setInterval(refreshDay, 60000);