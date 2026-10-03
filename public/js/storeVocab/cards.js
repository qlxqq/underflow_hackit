// Renders vocabulary entries as collectible cards.

const RARITY_LABELS = { common: "Common", uncommon: "Uncommon", rare: "Rare" };
const STAGE_LABELS = ["Caught", "Trained", "Mastered"];

function renderCard(entry, onDelete, onPractice) {
  const card = document.createElement("div");
  card.className = `vocab-card rarity-${entry.rarity} stage-${entry.evolution_stage}`;

  card.innerHTML = `
    <div class="card-art">${getPlaceholderArt(entry.rarity)}</div>
    <div class="card-rarity">${RARITY_LABELS[entry.rarity] || "Common"}</div>
    <div class="card-stage">${STAGE_LABELS[entry.evolution_stage] || "Caught"}</div>
    <div class="card-word">${entry.word}</div>
    <div class="card-romanization">${entry.romanization || ""}</div>
    <div class="card-meaning">${entry.english_meaning || "(meaning pending)"}</div>
    <div class="card-usage">Used ${entry.usage_count} time${entry.usage_count === 1 ? "" : "s"}</div>
    <button class="card-play-audio" data-word="${entry.word}" data-lang="${entry.language}">
      Play pronunciation
    </button>
    <button class="card-practice" data-id="${entry.vocab_id}">
      Practice this word
    </button>
    <button class="card-delete" data-id="${entry.vocab_id}">Delete</button>
  `;

  card.querySelector(".card-play-audio").addEventListener("click", (e) => {
    speakWord(e.target.dataset.word, e.target.dataset.lang);
  });

  // TODO: this button is a stand-in for actually using the word in the
  // composition-quiz mini-game (on its own branch, not built yet). For
  // now it just directly increments usage so the evolution mechanic can
  // be tested and demoed. Remove this button once the real quiz exists
  // and calls incrementUsage after a correct answer instead.
  card.querySelector(".card-practice").addEventListener("click", () => {
    onPractice(entry.vocab_id, entry.usage_count, entry.evolution_stage);
  });

  card.querySelector(".card-delete").addEventListener("click", () => {
    const confirmed = window.confirm(`Delete "${entry.word}" from your word bank?`);
    if (confirmed) onDelete(entry.vocab_id);
  });

  return card;
}

function renderCardGrid(entries, containerEl, onDelete, onPractice) {
  containerEl.innerHTML = "";
  if (entries.length === 0) {
    containerEl.innerHTML = `<p class="empty-state">No words caught yet. Capture some above!</p>`;
    return;
  }
  entries.forEach((entry) => containerEl.appendChild(renderCard(entry, onDelete, onPractice)));
}