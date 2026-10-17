// Pack opening for island rewards. When a challenge wins cards, they arrive
// in a sealed pack that the player opens (the same reveal the Collection page
// uses, from js/storeVocab/packOpening.js), and then the result sheet shows.
//
//   await IslandPack.show(cards, ["+25 coins", "+25 XP"]);
//
// `cards` = [{ word, album, kind }] as returned by IslandCards.award.
// Mini-games can open a pack for cards they award with
// IslandAPI.showPack(albumId, [words], lines).
//
// This never blocks a reward: if the card scripts are not on the page, or a
// card cannot be drawn, it resolves straight away and the result sheet still
// lists the cards.

const IslandPack = {
  available() {
    return typeof openPack === "function" && typeof albumCardPreview === "function";
  },

  // A card shaped like the Collection's cards, for one freshly won word.
  entry(albumId, word, language) {
    const row = {
      album_id: albumId, language, word, source: "island",
      evolution_stage: 0, usage_count: 0, earned_at: new Date().toISOString(),
    };
    return albumCardPreview(albumId, word, language, row);
  },

  async show(cards, lines = []) {
    if (!cards || !cards.length || !this.available()) return;
    try {
      const language = IslandCards.language;
      const entries = cards
        .map((c) => this.entry(c.album, c.word, language))
        .filter(Boolean);
      if (!entries.length) return;
      await openPack(entries, { summaryLines: lines });
    } catch (err) {
      console.error("Island: could not open the pack.", err);
      document.body.classList.remove("pack-open");
      document.querySelectorAll(".pack-overlay").forEach((el) => el.remove());
    }
  },
};

window.IslandAPI = Object.assign(window.IslandAPI || {}, {
  showPack: (albumId, words, lines) => IslandPack.show((words || []).map((word) => ({ album: albumId, word })), lines || []),
});