// Renders vocabulary entries as collectible cards.

const RARITY_LABELS = { common: "Common", uncommon: "Uncommon", rare: "Rare" };
const STAGE_LABELS = ["Caught", "Trained", "Mastered"];

function renderCard(entry, onDelete) {
  const card = document.createElement("div");
  card.className = `vocab-card rarity-${entry.rarity} stage-${entry.evolution_stage}`;

  card.innerHTML = `
    <div class="card-rarity">${RARITY_LABELS[entry.rarity] || "Common"}</div>
    <div class="card-stage">${STAGE_LABELS[entry.evolution_stage] || "Caught"}</div>
    <div class="card-word">${entry.word}</div>
    <div class="card-romanization">${entry.romanization || ""}</div>
    <div class="card-meaning">${entry.english_meaning || "(meaning pending)"}</div>
    <button class="card-play-audio" data-word="${entry.word}" data-lang="${entry.language}">
      Play pronunciation
    </button>
    <button class="card-delete" data-id="${entry.vocab_id}">Delete</button>
  `;

  card.querySelector(".card-play-audio").addEventListener("click", (e) => {
    speakWord(e.target.dataset.word, e.target.dataset.lang);
  });

  card.querySelector(".card-delete").addEventListener("click", () => {
    const confirmed = window.confirm(`Delete "${entry.word}" from your word bank?`);
    if (confirmed) onDelete(entry.vocab_id);
  });

  return card;
}

function renderCardGrid(entries, containerEl, onDelete) {
  containerEl.innerHTML = "";
  if (entries.length === 0) {
    containerEl.innerHTML = `<p class="empty-state">No words caught yet. Capture some above!</p>`;
    return;
  }
  entries.forEach((entry) => containerEl.appendChild(renderCard(entry, onDelete)));
}