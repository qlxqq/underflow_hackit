// The Collection's "Practise" button.
//
// Practising a card means playing it on the island: this page works out whether the
// island has a challenge that can use the word, and if it does opens the island at
// island.html?practice=<word>&album=<albumId>. The island then points to the right NPC
// and puts the word into that challenge (js/island/practice.js).
//
// Questions change every time an NPC is played, so this does not look at any one set of
// questions. It looks at the words each NPC can ask about (their role cards, from
// shared/roleCards.js, the same list the island builds its NPC challenges from). The island
// always includes the practice word in the challenge it sends you to.
//
//   - A role card (neighbourhood, hawker-centre or public-transport album): practisable if
//     one of that album's NPCs has the word.
//   - A zone card with no NPC or mini-game that uses it: not practisable yet.
//   - A captured word: practisable. The island adds captured words to the challenges of the
//     zone their theme belongs to.
//   - Only Chinese has an island so far.

const CollectionPractice = {
  ISLAND_PAGE: "../island/island.html",
  LANGUAGES: ["zh"],

  // Is this word one of the words an NPC asks about? Pass an album id to look only in that album.
  npcHas(word, albumId) {
    if (typeof ROLE_CARDS === "undefined") return false;
    const albums = ROLE_CARDS.zh || {};
    return Object.entries(albums).some(([id, groups]) =>
      (!albumId || id === albumId) && groups.some((g) => g.words.some((w) => w.word === word)));
  },

  // { ok: true } or { ok: false, reason } with a sentence to show the player.
  check({ word, album = null, language = "zh", captured = false }) {
    if (!this.LANGUAGES.includes(language)) {
      return { ok: false, reason: "Practising on the island is only in Chinese for now." };
    }
    if (captured) return { ok: true };
    if (this.npcHas(word, album)) return { ok: true };
    return { ok: false, reason: `No practice for ${word} yet.` };
  },

  url(word, album) {
    const params = new URLSearchParams({ practice: word });
    if (album) params.set("album", album);
    return `${this.ISLAND_PAGE}?${params.toString()}`;
  },

  go(word, album) {
    window.location.href = this.url(word, album);
  },
};