// Pack opening for island rewards. When a challenge wins cards, they arrive
// in a sealed pack that the player opens (the same reveal the Collection page
// uses, from js/storeVocab/packOpening.js), and then the result sheet shows.
//
//   await IslandPack.show(cards, ["+25 coins", "+25 XP"]);
//
// `cards` = [{ word, album, kind }] as returned by IslandCards.award.
// A mini-game gives its cards, and opens the pack, with one call:
//   const won = await IslandAPI.awardWords("hawker-centre", ["鸡饭", "茶"]);   // zone words it got right
//   -> { cards, dupes }   new cards are saved to the Collection and shown in a pack
// (IslandAPI.showPack(albumId, [words], lines) only shows a pack, for cards a game saved itself.)
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

  async show(cards, lines = [], dupes = []) {
    cards = cards || []; dupes = dupes || [];
    if (!(cards.length + dupes.length) || !this.available()) return;
    try {
      const language = IslandCards.language;
      const make = (list) => list.map((c) => this.entry(c.album, c.word, language)).filter(Boolean);
      const entries = [...make(cards), ...make(dupes.filter((d) => d.album))];
      if (!entries.length) return;
      // cards already owned still come out of the pack (they turn into coins and XP)
      const title = cards.length ? "" : (entries.length === 1 ? "A card you already own" : "Cards you already own");
      await openPack(entries, { summaryLines: lines, title });
    } catch (err) {
      console.error("Island: could not open the pack.", err);
      document.body.classList.remove("pack-open");
      document.querySelectorAll(".pack-overlay").forEach((el) => el.remove());
    }
  },
};

window.IslandAPI = Object.assign(window.IslandAPI || {}, {
  awardWords: async (albumId, words, lines) => {
    const won = await IslandCards.awardWords(albumId, words);
    await IslandPack.show(won.cards, lines || [], won.dupes);
    return won;
  },
  showPack: (albumId, words, lines) => IslandPack.show((words || []).map((word) => ({ album: albumId, word })), lines || []),
});