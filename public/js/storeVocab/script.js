// Capture page: login gate, then three views - Capture, Words found, and
// Collection - switched by showView(). Every data call passes the logged-in
// user's id, since vocabulary is scoped per user.

const $ = (id) => document.getElementById(id);

const authSection = $("auth-section");
const appSection = $("app-section");
const signupForm = $("signup-form");
const loginForm = $("login-form");
const authStatus = $("auth-status");
const signOutButton = $("sign-out");

const views = { capture: $("capture-view"), found: $("found-view"), collection: $("collection-view") };
const captureForm = $("capture-form");
const textInput = $("capture-text");
const languageSelect = $("capture-language");
const imageInput = $("capture-image");
const previewList = $("preview-list");
const cardGrid = $("card-grid");
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
let statusTimer = null;

// ---- small helpers ----
function showAuthError(message) {
  authStatus.textContent = message;
  authStatus.className = "status-message status-error";
}

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
  views.capture.dataset.lang = code;
  views.found.dataset.lang = code;
  streetStrip.innerHTML = getStreetStrip(code);
  foundStrip.innerHTML = getStreetStrip(code);
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

async function loadCardGrid() {
  try {
    const entries = await getAllVocabulary(currentUser.id);
    renderCardGrid(entries, cardGrid, handleDelete, handlePractice);
    renderCollectionStats(entries);
    backfillArt(entries);
  } catch (err) {
    console.error("Failed to load word bank:", err);
    showStatus("Could not load your word bank. Check your connection and try again.", "error");
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

// TODO: placeholder trigger for incrementUsage until the real composition
// mini-game exists and calls this after a correct answer.
async function handlePractice(vocabId, currentUsageCount, currentStage) {
  try {
    const updated = await incrementUsage(currentUser.id, vocabId, currentUsageCount, currentStage);
    showStatus(updated.evolution_stage > currentStage ? `"${updated.word}" evolved!` : `Practised "${updated.word}".`, "success");
    await loadCardGrid();
  } catch (err) {
    console.error("Failed to record practice:", err);
    showStatus("Could not record that practice attempt.", "error");
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
async function buildPreview(text, language) {
  setLanguageTint(language);
  const rawWords = await segmentText(text, language);
  const words = filterFillerWords(rawWords, language);
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
    <button type="button" id="select-all" class="select-all-btn">Select all</button>
  `;
}

function renderPreview() {
  previewList.innerHTML = "";
  renderFoundSummary();

  if (currentPreviewWords.length === 0) {
    previewList.innerHTML = `<p class="empty-state">No words found. Try different text.</p>`;
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
  setBusy(previewButton, "Finding words...");
  try {
    await buildPreview(text, languageSelect.value);
  } catch (err) {
    console.error("Failed to preview text:", err);
    showStatus("Could not process that text. Try again.", "error");
  } finally {
    clearBusy(previewButton);
  }
});

imageInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  clearStatus();
  showStatus("Reading text from the photo. This can take a moment...", "info");
  imageInput.disabled = true;

  try {
    const extractedText = await extractTextFromImage(file, languageSelect.value);
    if (!extractedText) {
      showStatus("Could not find any text in that photo. Try a clearer one.", "error");
      return;
    }
    textInput.value = extractedText;
    await buildPreview(extractedText, languageSelect.value);
    clearStatus();
  } catch (err) {
    console.error("Failed to process image:", err);
    showStatus("Could not read that photo. Try a clearer one.", "error");
  } finally {
    imageInput.disabled = false;
    imageInput.value = "";
  }
});

foundBack.addEventListener("click", () => showView("capture"));

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
  history.replaceState(null, "", "#collection");
  showView("collection");
  await loadCardGrid();

  if (skippedCount === 0) {
    showStatus(`Added ${savedCount} word${savedCount === 1 ? "" : "s"} to your collection.`, "success");
  } else {
    showStatus(`Added ${savedCount}, but ${skippedCount} could not be added (likely already in your collection).`, "error");
  }

  drawMissingArt(needArt); // not awaited: pictures appear when ready
});

// The empty collection has a button that goes to Capture.
cardGrid.addEventListener("click", (e) => {
  if (!e.target.closest("[data-go-capture]")) return;
  history.replaceState(null, "", "#capture");
  showView("capture");
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
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await signUp($("signup-email").value.trim(), $("signup-password").value);
    authStatus.textContent = "Account created. If email confirmation is on, confirm it first, then log in.";
    authStatus.className = "status-message status-success";
  } catch (err) {
    console.error("Sign up failed:", err);
    showAuthError(err.message || "Could not sign up.");
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await signIn($("login-email").value.trim(), $("login-password").value);
    await enterApp();
  } catch (err) {
    console.error("Login failed:", err);
    showAuthError(err.message || "Could not log in.");
  }
});

signOutButton.addEventListener("click", async () => {
  await signOut();
  currentUser = null;
  appSection.hidden = true;
  authSection.hidden = false;
});

async function enterApp() {
  currentUser = await getCurrentUser();
  if (!currentUser) return;
  authSection.hidden = true;
  appSection.hidden = false;

  if (location.hash === "#collection") {
    showView("collection");
    await loadCardGrid();
  } else {
    showView("capture");
  }
}

// ---- one-time setup: icons that live in static markup, then the nav ----
$("photo-icon").innerHTML = icon("camera", 26);
languageSelect.addEventListener("change", () => setLanguageTint(languageSelect.value));
setLanguageTint(languageSelect.value);
$("found-back").innerHTML = icon("chevLeft", 22);
$("found-note-icon").innerHTML = icon("info", 18);
signOutButton.innerHTML = icon("logout", 22);
renderBottomNav();
enterApp();