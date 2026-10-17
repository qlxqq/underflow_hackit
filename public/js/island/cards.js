// Island cards. Two kinds go into the island albums of the Collection (the
// `album_cards` table), which are filled only on the island:
//
//   ZONE cards  the zone's mini-game words (zoneWords.js). Won in mini-games, and
//               they can also drop as a bonus from an NPC challenge.
//   ROLE cards  the ten words of each NPC's job (roleCards.js). Won only from that
//               NPC's challenge, and only for a word that was asked AND answered right.
//
// Per NPC challenge: failed = no cards. Passed = 2 role cards, all right = 3, plus one
// zone card (at most one, on any pass). Role cards come from words answered right, cards
// not owned yet first; if there are not enough new ones the rest are duplicates. A duplicate
// (role or zone) turns into coins and XP. Finishing the zone words earns the album badge;
// every card (zone + role) earns the shiny one - both are paid when the Collection opens.
//
//   IslandCards.load()                      read what the player owns
//   IslandCards.award(npcId, tier, right)   give the cards for this attempt
//   IslandCards.left(npcId)                 role cards of that NPC still to win
//   IslandCards.finished(npcId)             NPC challenge passed and all eight role cards owned
//
// Logged in: saved in `album_cards` (and a copy in this browser).
// Guest / offline: this browser only.

const ROLE_CARDS_PER_PASS = 2;      // role cards for a pass (all right: 3)
const ZONE_UNOWNED_WEIGHT = 3;      // an unowned zone card is 3x as likely as one the player has

const ISLAND_ALBUM_NAMES = { neighbourhood: "Neighbourhood", "hawker-centre": "Hawker Centre", "public-transport": "Public Transport" };

const IslandCards = {
  get language() { return IslandLang.code; },
  have: new Set(),   // "albumId|word"

  key(album, word) { return `${album}|${word}`; },
  localKey() { return `island.cards.v1.${(typeof IslandSave !== "undefined" && IslandSave.userId) || "guest"}${IslandLang.saveSuffix()}`; },
  useCloud() { return typeof IslandSave !== "undefined" && !!IslandSave.userId && IslandSave.hasCloud() && !IslandState.testing; },

  async load() {
    this.have = new Set();
    try { (JSON.parse(localStorage.getItem(this.localKey())) || []).forEach((k) => this.have.add(k)); } catch (err) { /* none saved */ }
    if (!this.useCloud()) return;
    try {
      const { data, error } = await supabase.from("album_cards").select("album_id, word")
        .eq("user_id", IslandSave.userId).eq("language", this.language);
      if (error) throw error;
      (data || []).forEach((r) => this.have.add(this.key(r.album_id, r.word)));
      this.saveLocal();
    } catch (err) { console.warn("Island: could not read album cards, using this device's copy.", err && err.message); }
  },

  saveLocal() {
    if (IslandState.testing) return;
    try { localStorage.setItem(this.localKey(), JSON.stringify([...this.have])); } catch (err) { /* private browsing */ }
  },

  data(npcId) { return typeof ISLAND_NPC_DATA !== "undefined" ? ISLAND_NPC_DATA[npcId] || null : null; },

  // The zone's mini-game words, as { w, p, m }.
  zoneList(album) {
    const list = typeof ZONE_WORDS !== "undefined" && ZONE_WORDS[this.language] && ZONE_WORDS[this.language][album];
    return (list || []).map((x) => ({ w: x.word, p: x.romanization || x.pinyin || "", m: x.meaning || (typeof NPC_MEANINGS !== "undefined" && NPC_MEANINGS[x.word]) || "" }));
  },
  // An NPC's role cards, minus any word the zone list also has (the zone card wins).
  roleList(npcId) {
    const d = this.data(npcId);
    if (!d) return [];
    const zone = new Set(this.zoneList(d.album).map((x) => x.w));
    return d.words.filter((w) => !zone.has(w.w));
  },
  albumRoleTotal(album) {
    return Object.entries(typeof ISLAND_NPC_DATA !== "undefined" ? ISLAND_NPC_DATA : {})
      .filter(([, d]) => d.album === album).reduce((n, [id]) => n + this.roleList(id).length, 0);
  },
  albumTotal(album) { return this.zoneList(album).length + this.albumRoleTotal(album); },
  albumHave(album) { return [...this.have].filter((k) => k.startsWith(`${album}|`)).length; },
  zoneHave(album) { return this.zoneList(album).filter((w) => this.have.has(this.key(album, w.w))).length; },
  albumInfo(album) {
    return { id: album, name: ISLAND_ALBUM_NAMES[album] || album, have: this.albumHave(album), total: this.albumTotal(album),
      zoneHave: this.zoneHave(album), zoneTotal: this.zoneList(album).length };
  },

  left(npcId) {
    const d = this.data(npcId);
    return d ? this.roleList(npcId).filter((w) => !this.have.has(this.key(d.album, w.w))) : [];
  },
  owned(npcId) {
    const d = this.data(npcId);
    return d ? this.roleList(npcId).length - this.left(npcId).length : 0;
  },
  finished(npcId) {
    const d = this.data(npcId);
    return IslandState.npcDone(npcId) && (!d || this.left(npcId).length === 0);
  },

  // One random zone card, unowned ones more likely. `skip` = words already picked this attempt.
  rollZone(album, skip) {
    const pool = this.zoneList(album).filter((w) => !skip.has(w.w));
    if (!pool.length) return null;
    const weights = pool.map((w) => (this.have.has(this.key(album, w.w)) ? 1 : ZONE_UNOWNED_WEIGHT));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r < 0) return pool[i]; }
    return pool[pool.length - 1];
  },

  // Cards for one finished challenge. tier: "fail" | "pass" | "perfect".
  // right = the words answered right. Returns { cards, dupes, album, zoneDone, masterDone }.
  async award(npcId, tier, right) {
    const d = this.data(npcId);
    const empty = { cards: [], dupes: [], album: d ? this.albumInfo(d.album) : null, zoneDone: false, masterDone: false };
    if (!d || tier === "fail") return empty;
    const before = this.albumInfo(d.album);
    const rightSet = new Set(right || []);
    const perfect = tier === "perfect";

    // role cards: words answered right. New ones first; when too few, duplicates fill the rest
    const count = ROLE_CARDS_PER_PASS + (perfect ? 1 : 0);
    const rightRole = this.roleList(npcId).filter((w) => rightSet.has(w.w));
    const isNew = (w) => !this.have.has(this.key(d.album, w.w));
    const chosen = [...this.shuffle(rightRole.filter(isNew)), ...this.shuffle(rightRole.filter((w) => !isNew(w)))].slice(0, count);
    const roleCards = chosen.filter(isNew).map((w) => ({ ...w, kind: "role" }));
    const dupes = chosen.filter((w) => !isNew(w)).map((w) => ({ ...w, kind: "role" }));

    // one zone card at most; if the player already has it, it is a duplicate
    const zoneCards = [];
    const z = this.rollZone(d.album, new Set());
    if (z) { if (isNew(z)) zoneCards.push({ ...z, kind: "zone" }); else dupes.push({ ...z, kind: "zone" }); }

    const fresh = [...roleCards, ...zoneCards];
    fresh.forEach((w) => this.have.add(this.key(d.album, w.w)));
    this.saveLocal();
    if (fresh.length && this.useCloud()) {
      try {
        const rows = fresh.map((w) => ({ user_id: IslandSave.userId, album_id: d.album, language: this.language, word: w.w, source: w.kind === "role" ? "island-npc" : "island-npc-bonus" }));
        const { error } = await supabase.from("album_cards").upsert(rows, { onConflict: "user_id,album_id,language,word", ignoreDuplicates: true });
        if (error) throw error;
      } catch (err) { console.warn("Island: could not save cards to Supabase.", err && err.message); }
    }
    const album = this.albumInfo(d.album);
    return {
      cards: fresh.map((w) => ({ word: w.w, pinyin: w.p, meaning: w.m, kind: w.kind, role: w.kind === "role" ? d.label : null })),
      dupes: dupes.map((w) => ({ word: w.w, pinyin: w.p, meaning: w.m })),
      album,
      zoneDone: before.zoneHave < before.zoneTotal && album.zoneTotal > 0 && album.zoneHave >= album.zoneTotal,
      masterDone: before.have < before.total && album.total > 0 && album.have >= album.total,
    };
  },

  shuffle(list) { return typeof IslandQuiz !== "undefined" ? IslandQuiz.shuffle(list) : list.slice(); },
};