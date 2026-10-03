// Wires up the UI: login gate, capturing text/images, previewing words,
// saving picks, deleting cards, and refreshing the card grid. Every data
// call now passes the logged-in user's id, since vocabulary is scoped
// per user now that real accounts exist.

const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("login-form");
const authStatus = document.getElementById("auth-status");
const signOutButton = document.getElementById("sign-out");

const captureForm = document.getElementById("capture-form");
const textInput = document.getElementById("capture-text");
const languageSelect = document.getElementById("capture-language");
const previewList = document.getElementById("preview-list");
const cardGrid = document.getElementById("card-grid");
const imageInput = document.getElementById("capture-image");
const statusMessage = document.getElementById("status-message");
const previewButton = captureForm.querySelector("button[type=submit]");
const saveButton = document.getElementById("save-selected");

let currentUser = null;
let currentPreviewWords = [];
let currentContextSentence = "";
let isSaving = false;

function showAuthError(message) {
  authStatus.textContent = message;
  authStatus.className = "status-message status-error";
}

function showStatus(message, type = "info") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message status-${type}`;
}

function clearStatus() {
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

async function loadCardGrid() {
  try {
    const entries = await getAllVocabulary(currentUser.id);
    renderCardGrid(entries, cardGrid, handleDelete);
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

async function buildPreview(text, language) {
  const rawWords = await segmentText(text, language);
  const words = filterFillerWords(rawWords, language);
  const existing = new Set(
    (await findExistingWords(currentUser.id, language, words)).map((w) => w.toLowerCase()),
  );

  // Auto-fill meanings via the Edge Function. If it fails or is slow, this
  // just comes back empty and the fields stay manually editable, same as
  // before - capture never gets blocked waiting on this.
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

  renderPreview();
}

function renderPreview() {
  previewList.innerHTML = "";

  if (currentPreviewWords.length === 0) {
    previewList.innerHTML = `<p class="empty-state">No words found. Try different text.</p>`;
    return;
  }

  currentPreviewWords.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "preview-row";
    row.innerHTML = `
      <label>
        <input type="checkbox" data-index="${index}" ${item.alreadySaved ? "disabled" : ""} />
        <strong>${item.word}</strong>
        <span class="rarity-tag rarity-${item.rarity}">${item.rarity}</span>
        ${item.alreadySaved ? "<em>(already saved)</em>" : ""}
      </label>
      ${
        !item.alreadySaved
          ? `
        <input type="text" class="meaning-input" data-index="${index}" placeholder="English meaning" value="${item.englishMeaning}" />
        <input type="text" class="romanization-input" data-index="${index}" placeholder="Romanization / pinyin" value="${item.romanization}" />
      `
          : ""
      }
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
}

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;

  try {
    await signUp(email, password);
    authStatus.textContent = "Account created. Check your email if confirmation is required, then log in.";
    authStatus.className = "status-message status-success";
  } catch (err) {
    console.error("Sign up failed:", err);
    showAuthError(err.message || "Could not sign up.");
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    await signIn(email, password);
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

captureForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = textInput.value.trim();
  const language = languageSelect.value;
  if (!text) {
    showStatus("Type or paste some text first.", "error");
    return;
  }

  clearStatus();
  setBusy(previewButton, "Processing...");
  try {
    await buildPreview(text, language);
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
  const language = languageSelect.value;

  clearStatus();
  showStatus("Reading text from image, this can take a moment...", "info");
  imageInput.disabled = true;

  try {
    const extractedText = await extractTextFromImage(file, language);
    if (!extractedText) {
      showStatus("Could not find any text in that image. Try a clearer photo.", "error");
      return;
    }
    textInput.value = extractedText;
    await buildPreview(extractedText, language);
    clearStatus();
  } catch (err) {
    console.error("Failed to process image:", err);
    showStatus("Could not read that image. Try a clearer photo.", "error");
  } finally {
    imageInput.disabled = false;
  }
});

saveButton.addEventListener("click", async () => {
  if (isSaving) return;
  const checked = [...previewList.querySelectorAll("input[type=checkbox]:checked")];

  if (checked.length === 0) {
    showStatus("Select at least one word to save.", "error");
    return;
  }

  isSaving = true;
  setBusy(saveButton, "Saving...");
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
      console.error(`Failed to save "${item.word}":`, err);
      skippedCount++;
    }
  }

  previewList.innerHTML = "";
  textInput.value = "";
  isSaving = false;
  clearBusy(saveButton);

  if (skippedCount === 0) {
    showStatus(`Saved ${savedCount} word${savedCount === 1 ? "" : "s"}.`, "success");
  } else {
    showStatus(
      `Saved ${savedCount}, but ${skippedCount} could not be saved (likely already in your word bank).`,
      "error",
    );
  }

  await loadCardGrid();
});

async function enterApp() {
  currentUser = await getCurrentUser();
  if (!currentUser) return;
  authSection.hidden = true;
  appSection.hidden = false;
  await loadCardGrid();
}

// If already logged in from a previous visit, skip straight past the
// login form.
enterApp();