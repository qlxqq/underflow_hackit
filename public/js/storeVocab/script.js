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
const sourceText = $("source-text");
const cardGrid = $("card-grid");
const statusMessage = $("status-message");
const previewButton = captureForm.querySelector("button[type=submit]");
const saveButton = $("save-selected");
const foundBack = $("found-back");

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

// ---- collection ----
async function loadCardGrid() {
  try {
    const entries = await getAllVocabulary(currentUser.id);
    renderCardGrid(entries, cardGrid, handleDelete, handlePractice);
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

// ---- capture -> words found ----
async function buildPreview(text, language) {
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
  }));
  currentContextSentence = text;

  sourceText.textContent = text;
  renderPreview();
  showView("found");
}

function updateSaveButton() {
  const count = previewList.querySelectorAll("input[type=checkbox]:checked:not(:disabled)").length;
  saveButton.textContent = count === 0 ? "Select words to add" : `Add ${count} word${count === 1 ? "" : "s"} to collection`;
  saveButton.disabled = count === 0 || isSaving;
}

function renderPreview() {
  previewList.innerHTML = "";

  if (currentPreviewWords.length === 0) {
    previewList.innerHTML = `<p class="empty-state">No words found. Try different text.</p>`;
    updateSaveButton();
    return;
  }

  currentPreviewWords.forEach((item, index) => {
    const word = escapeHtml(item.word);
    const row = document.createElement("div");
    row.className = "found-row";
    row.innerHTML = `
      <label class="check-wrap">
        <input type="checkbox" data-index="${index}" aria-label="Add ${word}" ${item.alreadySaved ? "disabled" : "checked"} />
      </label>
      <div class="found-main">
        <div class="found-head">
          <span class="found-word">${word}</span>
          <span class="found-tag rarity-${item.rarity}">${item.rarity}</span>
          ${item.alreadySaved ? '<span class="found-tag in-collection">In collection</span>' : ""}
        </div>
        ${
          item.alreadySaved
            ? ""
            : `<div class="found-fields">
          <input type="text" class="field-inline meaning-input" data-index="${index}" aria-label="English meaning of ${word}" placeholder="English meaning" value="${escapeHtml(item.englishMeaning)}" />
          <input type="text" class="field-inline romanization-input" data-index="${index}" aria-label="Romanization of ${word}" placeholder="Romanization" value="${escapeHtml(item.romanization)}" />
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

  for (const checkbox of checked) {
    const item = currentPreviewWords[checkbox.dataset.index];
    try {
      await saveEntry(currentUser.id, {
        word: item.word,
        language: item.language,
        contextSentence: currentContextSentence,
        source: "text",
        rarity: item.rarity,
        romanization: item.romanization,
        englishMeaning: item.englishMeaning,
      });
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
$("photo-icon").innerHTML = icon("camera", 24);
$("found-back").innerHTML = icon("chevLeft", 22);
$("found-note-icon").innerHTML = icon("info", 18);
signOutButton.innerHTML = icon("logout", 22);
renderBottomNav();
enterApp();