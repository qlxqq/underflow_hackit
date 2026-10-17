// Capture page: four views - Capture, Pick your words (photo highlight), Words found, and Collection -
// switched by showView(). Login lives on the Journey page; anyone who is not
// logged in is sent there. Every data call passes the logged-in user's id,
// since vocabulary is scoped per user.

const $ = (id) => document.getElementById(id);

const JOURNEY_PAGE = "../auth/login.html"; 

const appSection = $("app-section");
const signOutButton = $("sign-out");

const views = { capture: $("capture-view"), highlight: $("highlight-view"), found: $("found-view"), collection: $("collection-view") };
const captureForm = $("capture-form");
const textInput = $("capture-text");
const languageLabel = $("capture-language"); // shows the language; it cannot be changed here
const imageInput = $("capture-image");
const previewList = $("preview-list");
const albumView = $("album-view");
const statusMessage = $("status-message");
const previewButton = captureForm.querySelector("button[type=submit]");
const saveButton = $("save-selected");
const foundBack = $("found-back");
const foundSummary = $("found-summary");
const collectionStats = $("collection-stats");
const streetStrip = $("street-strip");
const foundStrip = $("found-strip");

let currentUser = null;
let currentPreviewWords = [];
let currentContextSentence = "";
let isSaving = false;
const MAX_WORDS_PER_CAPTURE = 30; // keeps each capture to a number of cards worth choosing from
let hiddenWordCount = 0; // words found beyond the limit, not shown
let statusTimer = null;
// The pack-opening reveal is for island cards. Captured words go straight
// into the collection (there can be a lot of them). To try a pack with
// captured words, open the page with ?pack=1 on the end of the address. That
// is remembered on this device until you open it with ?pack=0.
const packParam = new URLSearchParams(location.search).get("pack");
if (packParam === "1" || packParam === "0") {
  try { localStorage.setItem("packOnCapture", packParam); } catch (err) { /* ignore */ }
}
const PACK_ON_CAPTURE = (() => {
  try {
    return localStorage.getItem("packOnCapture") === "1";
  } catch (err) {
    return packParam === "1";
  }
})();

// ---- small helpers ----
function showStatus(message, type = "info") {
  clearTimeout(statusTimer);
  statusMessage.textContent = message;
  statusMessage.className = `status-message status-${type}`;
  statusTimer = setTimeout(clearStatus, 6000);
}

function clearStatus() {
  clearTimeout(statusTimer);
  statusMessage.textContent = "";
  statusMessage.className = "status-message";
}

function setBusy(button, busyText) {
  button.disabled = true;
  button.dataset.originalText = button.textContent;
  button.textContent = busyText;
}

function clearBusy(button) {
  button.disabled = false;
  button.textContent = button.dataset.originalText || button.textContent;
}

function showView(name) {
  Object.entries(views).forEach(([key, el]) => (el.hidden = key !== name));
  setBottomNavActive(name === "collection" ? "collection" : "capture");
  window.scrollTo(0, 0);
}

// The capture and found views take the colour of the chosen language, the
// same green / sand / blue the Journey language cards use.
function setLanguageTint(code) {
  languageLabel.textContent = LANGUAGE_NAMES[code] || "";
  views.capture.dataset.lang = code;
  views.highlight.dataset.lang = code;
  views.found.dataset.lang = code;
  streetStrip.innerHTML = getStreetStrip(code);
  foundStrip.innerHTML = getStreetStrip(code);
}

// ---- rewards: XP, coins, quests, streak ----
// None of this may ever stop a capture from being saved, so every call is
// wrapped: if the rewards tables are missing the app still works.
async function safely(label, fn) {
  try {
    return await fn();
  } catch (err) {
    console.error(`${label} failed (is database/rewards.sql run?):`, err);
    return null;
  }
}

// Counts towards today's quests (shown on the Journey page).
async function questEvent(event, amount = 1) {
  await safely("Quest progress", () => recordQuestEvent(currentUser.id, event, amount));
}

// XP for newly won cards, by rarity. Also counts towards the daily streak
// and (for captured words) the "capture 3 words" quest. Returns the lines
// for the pack summary ("+35 XP", "Level up!").
async function rewardCards(rows, { fromCapture = true } = {}) {
  const lines = [];
  const xp = rows.reduce((sum, r) => sum + (RARITY_XP[r.rarity] || RARITY_XP.common), 0);
  const reward = await safely("Rewards", () => grantRewards(currentUser.id, { xp, coins: 0 }));
  if (reward) {
    lines.push(`+${xp} XP`);
    if (reward.levelUps > 0) lines.push(`Level up! You are now level ${reward.level} (+${reward.levelUps * LEVEL_UP_COINS} coins)`);
  }
  await safely("Streak", () => recordStreakActivity(currentUser.id));
  if (fromCapture) await questEvent("capture_word", rows.length);
  return lines;
}

// ---- collection ----
function renderCollectionStats(entries) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const mastered = entries.filter((e) => e.evolution_stage >= 2).length;
  const recent = entries.filter((e) => new Date(e.created_at).getTime() >= weekAgo).length;
  collectionStats.hidden = entries.length === 0;
  collectionStats.innerHTML = `
    <div class="stat-tile stat-words"><strong>${entries.length}</strong><span>${entries.length === 1 ? "Word" : "Words"}</span></div>
    <div class="stat-tile stat-mastered"><strong>${mastered}</strong><span>Mastered</span></div>
    <div class="stat-tile stat-recent" title="Words added in the last 7 days"><strong>${recent}</strong><span>This week</span></div>
  `;
}

// The Mother Tongue the player chose on the island. Capture, the Collection
// and everything else on this page use this language and nothing else; it is
// changed on the island, not here.
function getMotherTongue() {
  try {
    const code = localStorage.getItem(`journeyLanguage:${currentUser.id}`);
    if (code && LANGUAGE_NAMES[code]) return code;
  } catch (err) {
    // storage blocked: fall back to Chinese
  }
  return "zh";
}

async function loadCardGrid() {
  try {
    const language = getMotherTongue();
    const captured = await getAllVocabulary(currentUser.id, language);
    let albumRows = [];
    try {
      albumRows = await getAlbumCards(currentUser.id, language);
    } catch (err) {
      console.error("Could not load island album cards (is the album_cards table created?):", err);
    }
    renderAlbums({ captured, albumRows, language });
    // Rewards must never stop the collection from showing, so a problem here is only logged.
    try {
      if (typeof checkAlbumBadges === "function") checkAlbumBadges(currentUser.id, albumRows, language); // not awaited: the pop-up appears on top
    } catch (err) {
      console.error("Album reward check failed:", err);
    }
    renderCollectionStats([...captured, ...albumRows.map((r) => ({ evolution_stage: r.evolution_stage, created_at: r.earned_at }))]);
    backfillArt(captured);
  } catch (err) {
    console.error("Failed to load word bank:", err);
    showStatus("Could not load your word bank. Check your connection and try again.", "error");
  }
}

// Island album cards level up the same way, but are kept in their own table.
async function handleAlbumPractice(cardId) {
  try {
    const { data, error } = await supabase.from("album_cards").select("word, album_id, language")
      .eq("card_id", cardId).eq("user_id", currentUser.id).maybeSingle();
    if (error || !data) throw error || new Error("card not found");
    const result = CollectionPractice.check({ word: data.word, album: data.album_id, language: data.language });
    if (!result.ok) { showStatus(result.reason, "error"); return; }
    showStatus(`Opening the island to practise ${data.word}...`, "success");
    CollectionPractice.go(data.word, data.album_id);
  } catch (err) {
    console.error("Could not start practice:", err);
    showStatus("Could not start practice. Try again.", "error");
  }
}
// Only used when the page is opened with ?dev=1, so island cards can be
// tried out before the island and its mini-games exist.
async function handleDevAward(albumId, word) {
  try {
    const language = getMotherTongue();
    const { isNew, row } = await awardAlbumCard(currentUser.id, albumId, language, word, "dev");
    if (isNew) {
      const card = albumCardPreview(albumId, word, language, row);
      const lines = await rewardCards([card || { rarity: "common" }], { fromCapture: false });
      if (card) await openPack([card], { summaryLines: lines });
    }
    await loadCardGrid();
  } catch (err) {
    console.error("Could not award that card:", err);
    showStatus("Could not award that card.", "error");
  }
}

async function handleDelete(vocabId) {
  try {
    await deleteById(currentUser.id, vocabId);
    showStatus("Word deleted.", "success");
    await loadCardGrid();
  } catch (err) {
    console.error("Failed to delete word:", err);
    showStatus("Could not delete that word. Try again.", "error");
  }
}

// Practise sends the player to the island, to the challenge that uses this word
// (see storeVocab/practiceLink.js). The island counts the practice when the word comes up.
async function handlePractice(vocabId) {
  try {
    const { data, error } = await supabase.from("vocabulary").select("word, language")
      .eq("vocab_id", vocabId).eq("user_id", currentUser.id).maybeSingle();
    if (error || !data) throw error || new Error("word not found");
    const result = CollectionPractice.check({ word: data.word, language: data.language, captured: true });
    if (!result.ok) { showStatus(result.reason, "error"); return; }
    showStatus(`Opening the island to practise ${data.word}...`, "success");
    CollectionPractice.go(data.word, null);
  } catch (err) {
    console.error("Could not start practice:", err);
    showStatus("Could not start practice. Try again.", "error");
  }
}
// ---- pictures drawn by Claude ----
// Words that none of the ready-made pictures fit get a picture drawn for
// them. This runs in the background: the cards show their usual picture
// first and switch when the drawing is ready.
const artTried = new Set(); // cards already tried this visit, so a failure is not retried in a loop

async function drawMissingArt(rows) {
  if (!currentUser || rows.length === 0) return;
  let drawn = 0;
  let failed = 0;
  await Promise.allSettled(
    rows.map(async (row) => {
      artTried.add(row.vocab_id);
      const svg = await requestWordArt({ word: row.word, englishMeaning: row.english_meaning, language: row.language });
      if (!svg || !currentUser) { failed++; return; }
      try {
        await updateArtById(currentUser.id, row.vocab_id, svg);
        drawn++;
      } catch (err) {
        console.error(`Could not save the picture for "${row.word}":`, err);
        failed++;
      }
    }),
  );
  if (drawn > 0 && currentUser && !views.collection.hidden) await loadCardGrid();
  if (failed > 0 && drawn === 0) {
    showStatus(`Could not draw ${failed === 1 ? "a picture" : failed + " pictures"} right now. They will be tried again next time.`, "error");
  }
}

// Any card that ended up with only the plain signboard (words saved before
// pictures were drawn, a drawing that failed, or the page closed too early)
// gets one drawn when the collection is shown. A few at a time.
function backfillArt(entries) {
  const todo = entries
    .filter((e) => !e.art_svg && pickTheme(e) === "generic" && !artTried.has(e.vocab_id))
    .slice(0, 4);
  if (todo.length > 0) drawMissingArt(todo);
}

// ---- capture -> words found ----
// Only words written in the chosen language's own script are kept: Chinese
// mode keeps Chinese characters only, Tamil mode keeps Tamil only. Malay is
// written in the same letters as English, so it cannot be told apart this way.
const SCRIPT_ONLY = {
  zh: /^\p{Script=Han}+$/u,
  ta: /^\p{Script=Tamil}+$/u,
};

function keepOwnScript(words, language) {
  const pattern = SCRIPT_ONLY[language];
  return pattern ? words.filter((w) => pattern.test(w)) : words;
}

async function buildPreview(text, language) {
  setLanguageTint(language);
  const rawWords = await segmentText(text, language);
  const allWords = keepOwnScript(filterFillerWords(rawWords, language), language);
  const words = allWords.slice(0, MAX_WORDS_PER_CAPTURE);
  hiddenWordCount = allWords.length - words.length;
  const existing = new Set(
    (await findExistingWords(currentUser.id, language, words)).map((w) => w.toLowerCase()),
  );

  // Auto-fill meanings via the Edge Function. If it fails or is slow this
  // comes back empty and the fields stay editable - capture never blocks.
  const meanings = await lookupMeanings(words, language, text);

  currentPreviewWords = words.map((word) => ({
    word,
    language,
    rarity: getRarity(word, language),
    alreadySaved: existing.has(word.toLowerCase()),
    romanization: meanings[word]?.romanization || "",
    englishMeaning: meanings[word]?.englishMeaning || "",
    theme: meanings[word]?.theme || "", // a ready-made picture, or "none"
  }));
  currentContextSentence = text;

  renderPreview();
  showView("found");
}

function updateSaveButton() {
  const count = previewList.querySelectorAll("input[type=checkbox]:checked:not(:disabled)").length;
  saveButton.textContent = count === 0 ? "Select words to add" : `Add ${count} word${count === 1 ? "" : "s"} to collection`;
  saveButton.disabled = count === 0 || isSaving;
  updateSelectAll();
}

// "Select all" / "Clear all": acts on every word that is not already saved.
function selectableBoxes() {
  return [...previewList.querySelectorAll("input[type=checkbox]:not(:disabled)")];
}

function updateSelectAll() {
  const button = $("select-all");
  if (!button) return;
  const boxes = selectableBoxes();
  button.hidden = boxes.length === 0;
  button.textContent = boxes.every((box) => box.checked) ? "Clear all" : "Select all";
}

foundSummary.addEventListener("click", (e) => {
  if (!e.target.closest("#select-all")) return;
  const boxes = selectableBoxes();
  const checkAll = !boxes.every((box) => box.checked);
  boxes.forEach((box) => (box.checked = checkAll));
  updateSaveButton();
});

function renderFoundSummary() {
  const total = currentPreviewWords.length;
  const saved = currentPreviewWords.filter((w) => w.alreadySaved).length;
  foundSummary.hidden = total === 0;
  foundSummary.innerHTML = `
    <span class="sum-chip"><strong>${total}</strong> found</span>
    <span class="sum-chip sum-new"><strong>${total - saved}</strong> new</span>
    ${saved > 0 ? `<span class="sum-chip sum-saved"><strong>${saved}</strong> in collection</span>` : ""}
    ${hiddenWordCount > 0 ? `<span class="sum-chip" title="Capture a smaller area to see the rest"><strong>${hiddenWordCount}</strong> more not shown</span>` : ""}
    <button type="button" id="select-all" class="select-all-btn">Select all</button>
  `;
}

function renderPreview() {
  previewList.innerHTML = "";
  renderFoundSummary();

  if (currentPreviewWords.length === 0) {
    previewList.innerHTML = `<p class="empty-state">No ${LANGUAGE_NAMES[getMotherTongue()] || ""} words found. Try a different part of the photo, or different text.</p>`;
    updateSaveButton();
    return;
  }

  currentPreviewWords.forEach((item, index) => {
    const word = escapeHtml(item.word);
    const row = document.createElement("div");
    const saved = item.alreadySaved;
    const noRomanization = item.language === "ms"; // Malay has none
    row.className = `found-row${saved ? " is-saved" : ""}`;
    row.innerHTML = `
      <label class="check-wrap">
        <input type="checkbox" data-index="${index}" aria-label="Add ${word}" ${saved ? "checked disabled" : ""} />
      </label>
      <div class="found-main">
        <div class="found-head">
          <span class="found-word">${word}</span>
          ${saved ? '<span class="found-saved-note">Already in your collection</span>' : ""}
        </div>
        ${
          saved
            ? ""
            : `<div class="found-fields${noRomanization ? " single" : ""}">
          <label class="found-field"><span class="field-cap" aria-hidden="true">Meaning</span>
            <input type="text" class="field-inline meaning-input" data-index="${index}" aria-label="English meaning of ${word}" placeholder="Add meaning" value="${escapeHtml(item.englishMeaning)}" /></label>
          ${
            noRomanization
              ? ""
              : `<label class="found-field"><span class="field-cap" aria-hidden="true">Romanization</span>
            <input type="text" class="field-inline romanization-input" data-index="${index}" aria-label="Romanization of ${word}" placeholder="Add reading" value="${escapeHtml(item.romanization)}" /></label>`
          }
        </div>`
        }
      </div>
    `;
    previewList.appendChild(row);
  });

  previewList.querySelectorAll(".meaning-input").forEach((input) => {
    input.addEventListener("input", (e) => {
      currentPreviewWords[e.target.dataset.index].englishMeaning = e.target.value;
    });
  });
  previewList.querySelectorAll(".romanization-input").forEach((input) => {
    input.addEventListener("input", (e) => {
      currentPreviewWords[e.target.dataset.index].romanization = e.target.value;
    });
  });

  updateSaveButton();
}

previewList.addEventListener("change", (e) => {
  if (e.target.matches("input[type=checkbox]")) updateSaveButton();
});

captureForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = textInput.value.trim();
  if (!text) {
    showStatus("Type or paste some text first.", "error");
    return;
  }

  clearStatus();
  leavePhoto();
  setBusy(previewButton, "Finding words...");
  try {
    await buildPreview(text, getMotherTongue());
  } catch (err) {
    console.error("Failed to preview text:", err);
    showStatus("Could not process that text. Try again.", "error");
  } finally {
    clearBusy(previewButton);
  }
});

// ---- photo -> pick your words -> words found ----
// After a photo, the player highlights the words they want on a screen of
// their own (scan/highlight.js): they draw boxes round the words they want and
// only those parts are read.
let photoCanvas = null;       // the photo being boxed
let photoLanguage = "zh";     // the language it was taken in
let photoQuestCounted = false; // "scan a photo" counts once per photo, however many times it is read
let cameFromPhoto = false;    // so the back arrow on Words found returns to the photo

const highlighter = createPhotoHighlighter(
  {
    stage: $("hl-stage"),
    hint: $("hl-hint"),
    clearBtn: $("hl-clear"),
    findBtn: $("hl-find"),
    wholeBtn: $("hl-whole"),
  },
  {
    onFind: (rects) => readPhoto(rects),
    onWhole: () => readPhoto(null),
    onMessage: (message) => showStatus(message, "info"),
  },
);

function leavePhoto() {
  highlighter.close();
  photoCanvas = null;
  cameFromPhoto = false;
}

async function openHighlight(file) {
  clearStatus();
  showStatus("Opening your photo...", "info");
  imageInput.disabled = true;
  try {
    photoCanvas = await photoToCanvas(file);
  } catch (err) {
    console.error("Failed to open image:", err);
    showStatus("Could not open that photo. Try another one.", "error");
    return;
  } finally {
    imageInput.disabled = false;
    imageInput.value = "";
  }
  clearStatus();

  photoLanguage = getMotherTongue();
  photoQuestCounted = false;
  cameFromPhoto = false;
  setLanguageTint(photoLanguage);
  highlighter.open(photoCanvas);
  showView("highlight");
}

// rects = the highlighted areas, or null for the whole photo.
async function readPhoto(rects) {
  if (!photoCanvas) return;
  highlighter.setBusy(true);
  clearStatus();
  showStatus("Reading your words. This can take a moment...", "info");
  try {
    const extractedText = rects
      ? await extractTextFromRegions(photoCanvas, rects, photoLanguage)
      : await extractTextFromCanvas(photoCanvas, photoLanguage);
    if (!extractedText) {
      showStatus("Could not find any text there. Try a slightly bigger box.", "error");
      return;
    }
    textInput.value = extractedText;
    if (!photoQuestCounted) {
      photoQuestCounted = true;
      questEvent("photo_scan");
    }
    cameFromPhoto = true;
    await buildPreview(extractedText, photoLanguage);
    showStatus(window.lastOcrInfo || "", "info");
  } catch (err) {
    console.error("Failed to process image:", err);
    showStatus(err && err.message ? err.message : "Could not read that. Try a clearer photo or a different part.", "error");
  } finally {
    highlighter.setBusy(false);
  }
}

imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) openHighlight(file);
});

$("highlight-back").addEventListener("click", () => {
  leavePhoto();
  showView("capture");
});

foundBack.addEventListener("click", () => {
  if (cameFromPhoto && photoCanvas && highlighter.isOpen) {
    setLanguageTint(photoLanguage);
    showView("highlight");
  } else {
    showView("capture");
  }
});

saveButton.addEventListener("click", async () => {
  if (isSaving) return;
  const checked = [...previewList.querySelectorAll("input[type=checkbox]:checked:not(:disabled)")];
  if (checked.length === 0) {
    showStatus("Select at least one word to add.", "error");
    return;
  }

  isSaving = true;
  saveButton.disabled = true;
  saveButton.textContent = "Adding...";
  clearStatus();

  let savedCount = 0;
  let skippedCount = 0;
  const needArt = []; // saved words that need a picture drawn
  const savedRows = [];

  for (const checkbox of checked) {
    const item = currentPreviewWords[checkbox.dataset.index];
    try {
      const row = await saveEntry(currentUser.id, {
        word: item.word,
        language: item.language,
        contextSentence: currentContextSentence,
        source: "text",
        rarity: item.rarity,
        romanization: item.romanization,
        englishMeaning: item.englishMeaning,
        theme: item.theme === "none" ? null : item.theme,
      });
      if (item.theme === "none") needArt.push(row);
      savedRows.push(row);
      savedCount++;
    } catch (err) {
      // Most likely the unique constraint rejecting a duplicate that
      // slipped through (e.g. two tabs saving the same word at once).
      console.error(`Failed to save "${item.word}":`, err);
      skippedCount++;
    }
  }

  isSaving = false;
  previewList.innerHTML = "";
  textInput.value = "";
  leavePhoto();
  history.replaceState(null, "", "#collection");
  showView("collection");
  const loadingGrid = loadCardGrid();
  if (savedRows.length > 0) {
    const lines = await rewardCards(savedRows);
    if (PACK_ON_CAPTURE) await openPack(savedRows, { summaryLines: lines });
    else if (lines.length) showStatus(lines.join(" · "), "success");
  }
  await loadingGrid;

  if (skippedCount === 0) {
    showStatus(`Added ${savedCount} word${savedCount === 1 ? "" : "s"} to your collection.`, "success");
  } else {
    showStatus(`Added ${savedCount}, but ${skippedCount} could not be added (likely already in your collection).`, "error");
  }

  drawMissingArt(needArt); // not awaited: pictures appear when ready
});

// ---- bottom nav: Capture and Collection switch views in place ----
$("bottom-nav").addEventListener("click", async (e) => {
  const link = e.target.closest("[data-nav]");
  if (!link) return;
  if (link.dataset.nav === "capture") {
    e.preventDefault();
    history.replaceState(null, "", "#capture");
    showView("capture");
  } else if (link.dataset.nav === "collection") {
    e.preventDefault();
    history.replaceState(null, "", "#collection");
    showView("collection");
    await loadCardGrid();
  }
});

// ---- auth ----
// Login and sign-up live on the Journey page. Anyone who is not logged in is
// sent there.
signOutButton.addEventListener("click", async () => {
  await signOut();
  currentUser = null;
  location.href = JOURNEY_PAGE;
});

async function enterApp() {
  currentUser = await getCurrentUser();
  if (!currentUser) {
    location.replace(JOURNEY_PAGE);
    return;
  }
  appSection.hidden = false;
  if (PACK_ON_CAPTURE) showStatus("Pack test is on for captured words. Open the page with ?pack=0 on the end to turn it off.", "info");
  // Capture uses the player's Mother Tongue and nothing else.
  setLanguageTint(getMotherTongue());

  if (location.hash === "#collection") {
    showView("collection");
    await loadCardGrid();
  } else {
    showView("capture");
  }
}

// ---- one-time setup: icons that live in static markup, then the nav ----
initAlbums(albumView, {
  onDelete: handleDelete,
  onPractice: handlePractice,
  onPracticeAlbum: handleAlbumPractice,
  onDevAward: handleDevAward,
  onCapture: () => {
    history.replaceState(null, "", "#capture");
    showView("capture");
  },
});
// The tips card is open the first time. Once the player hides it, it stays
// hidden (on this device) until they tap Show.
const tipsCard = document.querySelector(".tips-card");
if (tipsCard) {
  try {
    if (localStorage.getItem("tipsHidden") === "1") tipsCard.open = false;
  } catch (err) { /* storage blocked: stays open */ }
  tipsCard.addEventListener("toggle", () => {
    try { localStorage.setItem("tipsHidden", tipsCard.open ? "0" : "1"); } catch (err) { /* ignore */ }
  });
}
$("photo-icon").innerHTML = icon("camera", 26);
$("found-note-icon").innerHTML = icon("info", 18);
renderBottomNav();
enterApp();