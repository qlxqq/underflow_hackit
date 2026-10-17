// Practice and captured words.
//
//  1. The Collection's "Practise" button opens the island with
//     island.html?practice=<word>&album=<albumId>. The island sails to the
//     right place, points an arrow at the NPC (or mini-game) that has that word,
//     and puts the word in that challenge. A word that comes up counts as practice:
//     the card's usage goes up (it can evolve) and the "practise a card" quest ticks.
//     Captured words that come up in a challenge count as practice too (once per challenge).
//  2. Words the player captured that fit a zone (theme -> zone) join that zone's
//     NPC challenges as extra words, so what they capture shows up in the game.
//
// Mini-games can read the same words with IslandAPI.zoneWords(zoneId).
// To make a mini-game the first stop for a word, return its level number from
// IslandHooks.findMiniGame(word, language).

const ZONE_OF_ALBUM = { neighbourhood: "neighbourhood", "hawker-centre": "hawker", "public-transport": "transport" };
const ALBUM_OF_ZONE = { neighbourhood: "neighbourhood", hawker: "hawker-centre", transport: "public-transport" };

// Captured-word themes (from the AI lookup) that belong to the hawker and transport
// zones. Everything else is an everyday word and goes to the neighbourhood.
const THEME_ZONE = {
  food: "hawker", drink: "hawker", stall: "hawker", fruit: "hawker", cake: "hawker", chilli: "hawker",
  bus: "transport", taxi: "transport", train: "transport", car: "transport", bicycle: "transport", plane: "transport",
};
const USAGE_STAGES = [1, 3]; // usage 1 -> Trained, usage 3 -> Mastered (same rule as the Collection)

const IslandCaptured = {
  language: "zh",
  rows: [],

  async load() {
    this.rows = [];
    if (typeof IslandSave === "undefined" || !IslandSave.userId || !IslandSave.hasCloud() || IslandState.testing) return;
    try {
      const { data, error } = await supabase.from("vocabulary")
        .select("vocab_id, word, romanization, english_meaning, theme, usage_count, evolution_stage")
        .eq("user_id", IslandSave.userId).eq("language", this.language).limit(300);
      if (error) throw error;
      this.rows = (data || []).filter((r) => r.word && r.romanization && r.english_meaning);
    } catch (err) { console.warn("Island: could not read captured words.", err && err.message); }
  },

  zoneOf(row) { return THEME_ZONE[row.theme] || "neighbourhood"; },

  // Is this word already one of the NPCs' role words (then it is not an "extra")?
  isAuthored(word) {
    return typeof ISLAND_NPC_DATA !== "undefined" && Object.values(ISLAND_NPC_DATA).some((d) => d.words.some((w) => w.w === word));
  },

  // Captured words for one zone, shaped like the authored words (no sentence).
  forZone(zoneId) {
    return this.rows.filter((r) => this.zoneOf(r) === zoneId && !this.isAuthored(r.word)).map((r) => ({
      w: r.word, p: r.romanization, m: r.english_meaning, captured: true, id: r.vocab_id, usage: r.usage_count || 0, stage: r.evolution_stage || 0,
    }));
  },
  find(word) { return this.rows.find((r) => r.word === word) || null; },
};

const IslandPractice = {
  pending: null,   // { word, album, npcId }

  // Reads ?practice=...&album=... once and tidies the address bar.
  read() {
    try {
      const params = new URLSearchParams(location.search);
      const word = params.get("practice");
      if (!word) return false;
      this.pending = { word, album: params.get("album") || null, npcId: null };
      params.delete("practice"); params.delete("album");
      const q = params.toString();
      history.replaceState(null, "", location.pathname + (q ? `?${q}` : "") + location.hash);
      return true;
    } catch (err) { return false; }
  },

  // Where can this word be practised? { level } for a mini-game, { npcId } for an NPC, or null.
  // Mini-games and NPC challenges that contain the word are all candidates; the one the player
  // has played the LEAST wins (a tie goes to the mini-game). Captured words are mixed into the NPC
  // challenges of their zone, so they always have somewhere to go. Role cards go to their own NPC.
  // A zone card with no mini-game wired yet has no place: the caller says so.
  find(word, album) {
    const options = [];
    try {
      const level = IslandHooks.findMiniGame ? IslandHooks.findMiniGame(word, "zh") : null;
      if (level) options.push({ level, plays: IslandState.playsOf(`mini:${level}`), mini: true });
    } catch (err) { console.error(err); }
    const data = typeof ISLAND_NPC_DATA !== "undefined" ? ISLAND_NPC_DATA : {};
    Object.entries(data).forEach(([id, d]) => {
      if (d.words.some((w) => w.w === word) && (!album || d.album === album)) options.push({ npcId: id, plays: IslandState.playsOf(`npc:${id}`) });
    });
    if (!options.some((o) => o.npcId) && !options.length) {
      const row = IslandCaptured.find(word);
      if (row) ISLAND_NPCS.filter((n) => n.zone === IslandCaptured.zoneOf(row)).forEach((n) => options.push({ npcId: n.id, plays: IslandState.playsOf(`npc:${n.id}`) }));
    }
    if (!options.length) return null;
    const least = Math.min(...options.map((o) => o.plays));
    const best = options.filter((o) => o.plays === least);
    const pick = best.find((o) => o.mini) || best[Math.floor(Math.random() * best.length)];
    return pick.mini ? { level: pick.level } : { npcId: pick.npcId };
  },

  // Counts one practice for every captured word (and the practice word) that came up in a
  // challenge or mini-game, right or wrong. `words` are the words that were used.
  // Returns [{ word, evolved }]. Mini-games call this too: IslandAPI.recordPractice(words).
  async record(npcId, words) {
    const right = [...new Set(words)];
    const done = [];
    const focus = this.pending && this.pending.npcId === npcId ? this.pending.word : null;
    const useCloud = typeof IslandSave !== "undefined" && IslandSave.userId && IslandSave.hasCloud() && !IslandState.testing;
    if (!useCloud) { if (focus && right.includes(focus)) done.push({ word: focus, evolved: false }); return done; }
    for (const word of right) {
      const captured = IslandCaptured.find(word);
      try {
        if (captured) {
          done.push(await this.bump("vocabulary", "vocab_id", captured.vocab_id, captured, word));
        } else if (word === focus) {
          const card = await this.cardRow(word);
          if (card) done.push(await this.bump("album_cards", "card_id", card.card_id, card, word));
        }
      } catch (err) { console.warn("Island: could not record practice for", word, err && err.message); }
    }
    if (done.length && typeof recordQuestEvent === "function") { try { await recordQuestEvent(IslandSave.userId, "practise_card", 1); } catch (err) { /* quests are optional */ } }
    return done.filter(Boolean);
  },

  async cardRow(word) {
    const { data } = await supabase.from("album_cards").select("card_id, usage_count, evolution_stage")
      .eq("user_id", IslandSave.userId).eq("language", "zh").eq("word", word).limit(1);
    return data && data[0] ? { card_id: data[0].card_id, usage_count: data[0].usage_count, evolution_stage: data[0].evolution_stage } : null;
  },

  async bump(table, idCol, id, row, word) {
    const usage = (row.usage_count != null ? row.usage_count : row.usage || 0) + 1;
    let stage = row.evolution_stage != null ? row.evolution_stage : row.stage || 0;
    const before = stage;
    if (stage < USAGE_STAGES.length && usage >= USAGE_STAGES[stage]) stage += 1;
    const { error } = await supabase.from(table).update({ usage_count: usage, evolution_stage: stage }).eq(idCol, id).eq("user_id", IslandSave.userId);
    if (error) throw error;
    row.usage_count = usage; row.evolution_stage = stage; row.usage = usage; row.stage = stage;
    return { word, evolved: stage > before };
  },
};

// For mini-games: the words of a zone (authored words plus the player's captured words).
window.IslandAPI = Object.assign(window.IslandAPI || {}, {
  // Mini-games: call with the words a game used; captured words get +1 practice.
  recordPractice: (words) => IslandPractice.record(null, words || []),
  zoneWords(zoneId) {
    const album = ALBUM_OF_ZONE[zoneId];
    const authored = (typeof IslandCards !== "undefined" ? IslandCards.zoneList(album) : []).map((w) => ({ word: w.w, pinyin: w.p, meaning: w.m, captured: false }));
    const extra = IslandCaptured.forZone(zoneId).map((w) => ({ word: w.w, pinyin: w.p, meaning: w.m, captured: true }));
    return [...authored, ...extra];
  },
});