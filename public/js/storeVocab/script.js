// Wires up the UI: capturing text/images, previewing words, saving picks,
// and refreshing the card grid.

const captureForm = document.getElementById("capture-form");
const textInput = document.getElementById("capture-text");
const languageSelect = document.getElementById("capture-language");
const previewList = document.getElementById("preview-list");
const cardGrid = document.getElementById("card-grid");
const imageInput = document.getElementById("capture-image");

let currentPreviewWords = [];
let currentContextSentence = "";

async function loadCardGrid() {
  const entries = await getAllVocabulary();
  renderCardGrid(entries, cardGrid);
}

async function buildPreview(text, language) {
  const rawWords = await segmentText(text, language);
  const words = filterFillerWords(rawWords, language);
  const existing = new Set((await findExistingWords(language, words)).map((w) => w.toLowerCase()));

  currentPreviewWords = words.map((word) => ({
    word,
    language,
    rarity: getRarity(word, language),
    alreadySaved: existing.has(word.toLowerCase()),
  }));
  currentContextSentence = text;

  renderPreview();
}

function renderPreview() {
  previewList.innerHTML = "";
  currentPreviewWords.forEach((item, index) => {
    const row = document.createElement("label");
    row.className = "preview-row";
    row.innerHTML = `
      <input type="checkbox" data-index="${index}" ${item.alreadySaved ? "disabled" : ""} />
      ${item.word} <span class="rarity-tag rarity-${item.rarity}">${item.rarity}</span>
      ${item.alreadySaved ? "<em>(already saved)</em>" : ""}
    `;
    previewList.appendChild(row);
  });
}

captureForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = textInput.value.trim();
  const language = languageSelect.value;
  if (!text) return;
  await buildPreview(text, language);
});

imageInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const language = languageSelect.value;
  const extractedText = await extractTextFromImage(file, language);
  textInput.value = extractedText;
  await buildPreview(extractedText, language);
});

document.getElementById("save-selected").addEventListener("click", async () => {
  const checked = [...previewList.querySelectorAll("input[type=checkbox]:checked")];

  for (const checkbox of checked) {
    const item = currentPreviewWords[checkbox.dataset.index];
    await saveEntry({
      word: item.word,
      language: item.language,
      contextSentence: currentContextSentence,
      source: "text",
      rarity: item.rarity,
    });
  }

  previewList.innerHTML = "";
  textInput.value = "";
  await loadCardGrid();
});

loadCardGrid();