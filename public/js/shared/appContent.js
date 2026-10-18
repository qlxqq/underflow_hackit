// Loads the app-wide numbers and text from Supabase and puts them into the lists the pages already read:
//   rewards  : RARITY_XP, ALBUM_COMPLETE_REWARD, ALBUM_MASTER_REWARD, LEVEL_UP_REWARD, QUEST_DEFS   (tables rarity_tiers, reward_config, quest_defs)
//   cards    : RARITY_LABELS, RARITY_CUTOFFS, the card stage names and thresholds, album names, picture groups
//   capture  : FILLER_WORDS                                                                          (table filler_words)
//   profile  : the names of the profile pictures                                                     (table avatar_defs)
//
// The lists in the JS files stay as the fallback: if Supabase cannot be reached (or a table is empty) the page simply
// uses them. Needs: supabase (supabaseClient.js), and this file loaded AFTER the files it fills (the ones on the page).
// Use:   await AppContent.ready;   before the page reads those lists.

const AppContent = (() => {
  const TIMEOUT_MS = 4000;
  const TIERS = ["common", "uncommon", "rare", "epic", "legendary"];

  async function table(name, orderBy = []) {
    let q = supabase.from(name).select("*");
    orderBy.forEach((c) => { q = q.order(c, { ascending: true }); });
    const { data, error } = await q.range(0, 4999);
    if (error) throw error;
    return data || [];
  }
  const step = async (label, fn) => { try { await fn(); } catch (err) { console.warn(`App content (${label}) not loaded, using the built-in list:`, err); } };
  // Replace what is inside an array / object without replacing the array / object itself (other files hold it).
  const refill = (arr, items) => { arr.splice(0, arr.length, ...items); };

  async function loadAll() {
    await Promise.all([
      step("rarity", async () => {
        const [tiers, cuts] = await Promise.all([table("rarity_tiers", ["sort"]), table("rarity_cutoffs")]);
        tiers.forEach((t) => {
          if (typeof RARITY_XP !== "undefined") RARITY_XP[t.id] = t.xp;
          if (typeof RARITY_LABELS !== "undefined") RARITY_LABELS[t.id] = t.label;
        });
        if (typeof RARITY_CUTOFFS !== "undefined") {
          const byLang = {};
          cuts.forEach((c) => { (byLang[c.language] = byLang[c.language] || {})[c.tier] = c.last_rank; });
          Object.entries(byLang).forEach(([lang, ranks]) => {
            const list = TIERS.slice(0, 4).map((t) => ranks[t]);
            if (list.every((n) => Number.isFinite(n)) && RARITY_CUTOFFS[lang]) refill(RARITY_CUTOFFS[lang], list);
          });
        }
      }),
      step("rewards", async () => {
        const rows = await table("reward_config");
        const by = Object.fromEntries(rows.map((r) => [r.id, r]));
        if (by.album_complete && typeof ALBUM_COMPLETE_REWARD !== "undefined") Object.assign(ALBUM_COMPLETE_REWARD, { xp: by.album_complete.xp, coins: by.album_complete.coins });
        if (by.album_master && typeof ALBUM_MASTER_REWARD !== "undefined") Object.assign(ALBUM_MASTER_REWARD, { xp: by.album_master.xp, coins: by.album_master.coins });
        if (by.level_up && typeof LEVEL_UP_REWARD !== "undefined") LEVEL_UP_REWARD.coins = by.level_up.coins;
      }),
      step("daily quests", async () => {
        const rows = await table("quest_defs", ["sort"]);
        if (!rows.length || typeof QUEST_DEFS === "undefined") return;
        refill(QUEST_DEFS, rows.map((r) => {
          const q = { id: r.id, title: r.title, event: r.event, target: r.target, xp: r.xp, coins: r.coins };
          if (r.soon) q.soon = true;
          return q;
        }));
      }),
      step("cards", async () => {
        const [albums, stages, themes] = await Promise.all([table("album_defs", ["sort"]), table("evolution_stages", ["stage"]), table("theme_categories")]);
        if (typeof ALBUMS !== "undefined") albums.forEach((a) => { const x = ALBUMS.find((y) => y.id === a.id); if (x) x.name = a.name; });
        if (stages.length) {
          const labels = stages.map((s) => s.label);
          const mins = stages.filter((s) => s.stage >= 1).map((s) => s.min_uses);
          if (typeof STAGE_LABELS !== "undefined") refill(STAGE_LABELS, labels);
          if (typeof STAGE_NAMES !== "undefined") refill(STAGE_NAMES, labels);
          if (typeof EVOLUTION_THRESHOLDS !== "undefined") refill(EVOLUTION_THRESHOLDS, mins);
          if (typeof ALBUM_EVOLUTION_THRESHOLDS !== "undefined") refill(ALBUM_EVOLUTION_THRESHOLDS, mins);
        }
        if (typeof CATEGORY_OF_THEME !== "undefined") themes.forEach((t) => { CATEGORY_OF_THEME[t.theme] = t.category; });
      }),
      step("filler words", async () => {
        const rows = await table("filler_words");
        if (!rows.length || typeof FILLER_WORDS === "undefined") return;
        const by = {};
        rows.forEach((r) => { (by[r.language] = by[r.language] || []).push(r.word); });
        Object.entries(by).forEach(([lang, words]) => { FILLER_WORDS[lang] = new Set(words); });
      }),
      step("profile pictures", async () => {
        const rows = await table("avatar_defs", ["sort"]);
        if (!rows.length || typeof AVATARS === "undefined") return;
        const next = rows.map((r) => AVATARS.find((a) => a.id === r.id) && { id: r.id, label: r.label }).filter(Boolean);
        if (next.length) refill(AVATARS, next); // only pictures that are drawn in avatars.js can be listed
      }),
    ]);
  }

  // Never rejects and never waits longer than TIMEOUT_MS: the page starts either way.
  const ready = Promise.race([
    loadAll().catch((err) => console.warn("App content not loaded:", err)),
    new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS)),
  ]);
  return { ready };
})();