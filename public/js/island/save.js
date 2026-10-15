// Saving the island. Progress is written to this browser straight away (so
// nothing is lost if the network drops) and to Supabase a moment later.
//
//   - Logged in:   rows live in the `island_progress` table (one per player),
//                  and the browser copy is kept per user.
//   - Not logged in (or no Supabase on the page): the browser copy only.
//
// It uses the app's shared `supabase` client and `getCurrentUser()` when they
// are on the page; if they are missing it quietly stays local.

const ISLAND_SAVE_VERSION = 2;

const IslandSave = {
  userId: null,
  ready: false,
  timer: null,
  pending: null,
  status: "local", // local | saving | synced | offline

  hasCloud() { return typeof supabase !== "undefined" && supabase && typeof supabase.from === "function"; },

  async init() {
    if (this.ready) return;
    try {
      if (this.hasCloud() && typeof getCurrentUser === "function") {
        const user = await getCurrentUser();
        this.userId = user ? user.id : null;
      }
    } catch (err) { this.userId = null; }
    this.ready = true;
    window.addEventListener("pagehide", () => this.flush());
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") this.flush(); });
  },

  localKey() { return `island.save.v${ISLAND_SAVE_VERSION}.${this.userId || "guest"}`; },

  readLocal() {
    try { return JSON.parse(localStorage.getItem(this.localKey())) || null; } catch (err) { return null; }
  },
  writeLocal(blob) {
    try { localStorage.setItem(this.localKey(), JSON.stringify(blob)); } catch (err) { /* private browsing */ }
  },

  fromRow(row) {
    return {
      coins: row.coins || 0, owned: row.owned || [], npcs: row.npcs_done || [], levels: row.levels_done || [],
      zones: row.zones_revealed || [], avatar: row.avatar && row.avatar.gender ? row.avatar : null,
      savedAt: Date.parse(row.updated_at) || 0,
    };
  },
  toRow(blob) {
    return {
      user_id: this.userId, coins: Math.max(0, Math.round(blob.coins)), owned: blob.owned, npcs_done: blob.npcs,
      levels_done: blob.levels, zones_revealed: blob.zones, avatar: blob.avatar || {},
    };
  },

  // Returns the best saved copy (or null for a brand new player).
  async load() {
    let local = this.readLocal();
    if (!local && this.userId) { try { local = JSON.parse(localStorage.getItem(`island.save.v${ISLAND_SAVE_VERSION}.guest`)); } catch (err) { local = null; } }
    if (!this.userId) return local;
    let remote = null;
    try {
      const { data, error } = await supabase.from("island_progress").select("*").eq("user_id", this.userId).maybeSingle();
      if (error) throw error;
      remote = data ? this.fromRow(data) : null;
      this.status = "synced";
    } catch (err) {
      console.warn("Island: could not load from Supabase, using this device's copy.", err && err.message);
      this.status = "offline";
      return local;
    }
    if (!remote) return local; // first time on this account: keep what was played as a guest here
    if (!local) return remote;
    // Both exist: the newer one wins for coins and look; the lists are joined so nothing earned is lost.
    const newer = (local.savedAt || 0) > remote.savedAt ? local : remote;
    const union = (a, b) => [...new Set([...(a || []), ...(b || [])])];
    return { ...newer, owned: union(local.owned, remote.owned), npcs: union(local.npcs, remote.npcs), levels: union(local.levels, remote.levels), zones: union(local.zones, remote.zones), avatar: newer.avatar || local.avatar || remote.avatar };
  },

  // Called every time something changes.
  write(blob) {
    blob.savedAt = Date.now();
    this.writeLocal(blob);
    if (!this.userId || !this.hasCloud()) return;
    this.pending = blob;
    this.status = "saving";
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 1500);
  },

  async flush() {
    clearTimeout(this.timer);
    const blob = this.pending;
    if (!blob || !this.userId || !this.hasCloud()) return;
    this.pending = null;
    try {
      const { error } = await supabase.from("island_progress").upsert(this.toRow(blob), { onConflict: "user_id" });
      if (error) throw error;
      this.status = "synced";
    } catch (err) {
      console.warn("Island: could not save to Supabase (will retry on the next change).", err && err.message);
      this.pending = this.pending || blob;
      this.status = "offline";
    }
  },
};