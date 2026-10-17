// Renders vocabulary entries as collectible cards.

const RARITY_LABELS = { common: "Common", uncommon: "Uncommon", rare: "Rare", epic: "Epic", legendary: "Legendary" };
const STAGE_LABELS = ["Caught", "Trained", "Mastered"];
// Words, meanings and romanization can come from OCR or the AI lookup, so
// they are escaped before being put into markup.
// Longer words get a smaller size so they stay on one line (mostly Tamil).
function wordSizeClass(word) {
  const n = [...String(word)].length;
  return n > 9 ? " xlong" : n > 5 ? " long" : "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderCard(entry, onDelete, onPractice) {
  const rarity = RARITY_LABELS[entry.rarity] ? entry.rarity : "common";
  const stage = Math.min(Math.max(entry.evolution_stage || 0, 0), STAGE_LABELS.length - 1);
  const card = document.createElement("article");
  card.className = `vocab-card rarity-${rarity} stage-${stage}`;

  const word = escapeHtml(entry.word);
  const uses = entry.usage_count;

  card.innerHTML = `
    <div class="card-top">
      <span class="card-rarity">${RARITY_LABELS[rarity]}</span>
      <button type="button" class="card-play-audio" aria-label="Play pronunciation of ${word}">${icon("volume", 18)}</button>
    </div>
    <div class="card-art">${getCardArt(entry, stage)}</div>
    <div class="card-word${wordSizeClass(entry.word)}">${word}</div>
    <div class="card-romanization">${escapeHtml(entry.romanization || "")}</div>
    <div class="card-meaning">${escapeHtml(entry.english_meaning || "(meaning pending)")}</div>
    <div class="card-progress">
      <span class="card-pips" aria-hidden="true"><i class="on"></i><i class="${stage >= 1 ? "on" : ""}"></i><i class="${stage >= 2 ? "on" : ""}"></i></span>
      <span class="card-stage">${STAGE_LABELS[stage]}</span>
    </div>
    <div class="card-usage">Used ${uses} time${uses === 1 ? "" : "s"}</div>
    <div class="card-actions">
      <button type="button" class="card-practice">${icon("spark", 16)}<span>Practise</span></button>
      <button type="button" class="card-delete" aria-label="Delete ${word}">${icon("trash", 18)}</button>
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
    containerEl.innerHTML = `
      <div class="empty-card">
        <div class="empty-art" aria-hidden="true">${["home", "food", "bus"].map((t) => `<span>${getCardArt({ theme: t }, 0)}</span>`).join("")}</div>
        <h2 class="empty-title">No words caught yet</h2>
        <p class="empty-text">Capture a sign, a menu or a sentence, and every word becomes a card.</p>
        <button type="button" class="btn btn-primary btn-sm" data-go-capture>Capture a word</button>
      </div>`;
    return;
  }
  entries.forEach((entry) => containerEl.appendChild(renderCard(entry, onDelete, onPractice)));
}
