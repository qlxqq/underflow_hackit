// Loads the island's words and text from Supabase (the island_* tables, filled by database/island_*_seed.sql)
// and puts them into the lists the game already reads: ZONE_WORDS, ROLE_CARDS, ISLAND_SENTENCES, and the names,
// greetings and prices on ISLAND_ZONES / ISLAND_LEVELS / ISLAND_NPCS / HOME_ITEMS.
//
// The lists in the JS files stay as the fallback: if Supabase cannot be reached (or a table is empty) the game
// simply uses them. Where things stand on the map (x, y), the building art and the walking areas are NOT in the
// database; they stay in islandData.js / homeData.js.
//
// Needs: supabase (supabaseClient.js), and this file loaded AFTER zoneWords.js, roleCards.js, npcData.js,
// islandData.js and homeData.js (the ones that exist on the page).
// Use:   await IslandContent.ready;   before reading the lists (the island does this before it starts).

const IslandContent = (() => {
  const TIMEOUT_MS = 4000;

  async function table(name, orderBy) {
    let q = supabase.from(name).select("*");
    orderBy.forEach((c) => { q = q.order(c, { ascending: true }); });
    const { data, error } = await q.range(0, 4999);
    if (error) throw error;
    return data || [];
  }
  // Copy the listed fields from database rows onto the matching objects of a JS list.
  function merge(list, rows, keyField, fields) {
    if (typeof list === "undefined" || !Array.isArray(list)) return;
    rows.forEach((r) => {
      const item = list.find((x) => String(x[keyField]) === String(r[keyField]));
      if (item) fields.forEach((f) => { if (r[f] !== undefined && r[f] !== null) item[f] = r[f]; });
    });
  }
  const step = async (label, fn) => { try { await fn(); } catch (err) { console.warn(`Island content (${label}) not loaded, using the built-in list:`, err); } };

  async function loadAll() {
    await Promise.all([
      step("zone words", async () => {
        const rows = await table("island_zone_words", ["language", "zone", "sort"]);
        if (!rows.length || typeof ZONE_WORDS === "undefined") return;
        const next = {};
        rows.forEach((r) => {
          ((next[r.language] = next[r.language] || {})[r.zone] = next[r.language][r.zone] || [])
            .push({ word: r.word, romanization: r.romanization || "", meaning: r.meaning });
        });
        Object.entries(next).forEach(([lang, zones]) => {
          ZONE_WORDS[lang] = ZONE_WORDS[lang] || {};
          Object.entries(zones).forEach(([zone, words]) => { ZONE_WORDS[lang][zone] = words; });
        });
      }),
      step("role cards", async () => {
        const rows = await table("island_role_words", ["language", "album", "npc_sort", "sort"]);
        if (!rows.length || typeof ROLE_CARDS === "undefined") return;
        const next = {};
        rows.forEach((r) => {
          const albums = (next[r.language] = next[r.language] || {});
          const groups = (albums[r.album] = albums[r.album] || []);
          let g = groups.find((x) => x.id === r.npc_id);
          if (!g) { g = { id: r.npc_id, label: r.npc_label, words: [] }; groups.push(g); }
          g.words.push({ word: r.word, romanization: r.romanization || "", meaning: r.meaning });
        });
        Object.entries(next).forEach(([lang, albums]) => {
          ROLE_CARDS[lang] = ROLE_CARDS[lang] || {};
          Object.entries(albums).forEach(([album, groups]) => { ROLE_CARDS[lang][album] = groups; });
        });
      }),
      step("NPC sentences", async () => {
        const rows = await table("island_sentences", ["word"]);
        if (typeof ISLAND_SENTENCES === "undefined") return;
        rows.forEach((r) => { ISLAND_SENTENCES[r.word] = { zh: r.sentence, py: r.reading || "", en: r.english || "", wrong: r.wrong || [] }; });
      }),
      step("zones, levels and NPCs", async () => {
        const [zones, levels, npcs] = await Promise.all([table("island_zones", ["sort"]), table("island_levels", ["level"]), table("island_npcs", ["sort"])]);
        if (typeof ISLAND_ZONES !== "undefined") merge(ISLAND_ZONES, zones, "id", ["name"]);
        if (typeof ISLAND_LEVELS !== "undefined") merge(ISLAND_LEVELS, levels, "level", ["name", "sub"]);
        if (typeof ISLAND_NPCS !== "undefined") merge(ISLAND_NPCS, npcs, "id", ["name", "role", "kind", "greeting"]);
      }),
      step("shop", async () => {
        const [cats, items] = await Promise.all([table("island_shop_categories", ["sort"]), table("island_shop_items", ["sort"])]);
        if (typeof HOME_CATEGORIES !== "undefined") merge(HOME_CATEGORIES, cats, "id", ["name"]);
        if (typeof HOME_ITEMS !== "undefined") merge(HOME_ITEMS, items, "id", ["name", "cat", "price"]);
      }),
    ]);
  }

  // Never rejects and never waits longer than TIMEOUT_MS: the game starts either way.
  const ready = Promise.race([
    loadAll().catch((err) => console.warn("Island content not loaded:", err)),
    new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS)),
  ]);

  return { ready };
})();