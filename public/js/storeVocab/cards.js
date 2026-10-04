// Renders vocabulary entries as collectible cards.

const RARITY_LABELS = { common: "Common", uncommon: "Uncommon", rare: "Rare" };
const STAGE_LABELS = ["Caught", "Trained", "Mastered"];

// Words, meanings and romanization can come from OCR or the AI lookup, so
// they are escaped before being put into markup.
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderCard(entry, onDelete, onPractice) {
  const card = document.createElement("article");
  card.className = `vocab-card rarity-${entry.rarity} stage-${entry.evolution_stage}`;

  const word = escapeHtml(entry.word);
  const uses = entry.usage_count;

  card.innerHTML = `
    <div class="card-top">
      <span class="card-rarity">${RARITY_LABELS[entry.rarity] || "Common"}</span>
      <span class="card-stage">${STAGE_LABELS[entry.evolution_stage] || "Caught"}</span>
    </div>
    <div class="card-art">${getPlaceholderArt(entry.rarity)}</div>
    <div class="card-word">${word}</div>
    <div class="card-romanization">${escapeHtml(entry.romanization || "")}</div>
    <div class="card-meaning">${escapeHtml(entry.english_meaning || "(meaning pending)")}</div>
    <div class="card-usage">Used ${uses} time${uses === 1 ? "" : "s"}</div>
    <div class="card-actions">
      <button type="button" class="icon-btn card-play-audio" aria-label="Play pronunciation of ${word}">${icon("volume", 20)}</button>
      <button type="button" class="btn btn-sm btn-outline card-practice">Practice</button>
      <button type="button" class="icon-btn muted card-delete" aria-label="Delete ${word}">${icon("trash", 20)}</button>
    </div>
  `;

  card.querySelector(".card-play-audio").addEventListener("click", () => {
    speakWord(entry.word, entry.language);
  });

  // TODO: this button stands in for using the word in the composition
  // mini-game (on its own branch, not built yet). For now it directly
  // increments usage so the evolution mechanic can be tested and demoed.
  // Remove it once the real mini-game calls incrementUsage instead.
  card.querySelector(".card-practice").addEventListener("click", () => {
    onPractice(entry.vocab_id, entry.usage_count, entry.evolution_stage);
  });

  card.querySelector(".card-delete").addEventListener("click", () => {
    if (window.confirm(`Delete "${entry.word}" from your word bank?`)) onDelete(entry.vocab_id);
  });

  return card;
}

function renderCardGrid(entries, containerEl, onDelete, onPractice) {
  containerEl.innerHTML = "";
  if (entries.length === 0) {
    containerEl.innerHTML = `<p class="empty-state">No words caught yet. Use Capture to add some.</p>`;
    return;
  }
  entries.forEach((entry) => containerEl.appendChild(renderCard(entry, onDelete, onPractice)));
}