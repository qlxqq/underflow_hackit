// What the player owns and has done, shared by both islands. Saving goes
// through save.js (this browser, plus Supabase when logged in).
//
// Other code (mini-games) can use window.IslandAPI:
//   IslandAPI.getCoins()   IslandAPI.addCoins(n)

// Coins and cards paid out. Levels pay once; NPC challenges pay once each.
const ISLAND_REWARDS = { level: 50, npc: 30, cards: 1 };

const IslandState = {
  coins: 0,
  owned: new Set(),        // shop items bought
  npcsDone: new Set(),     // NPC challenges passed
  levelsDone: new Set(),   // mystery island levels finished (1-9)
  zonesRevealed: new Set(),// zones whose mist has lifted
  avatar: null,            // { gender: "boy"|"girl", outfit } - null until chosen
  where: "home",           // which island the player is on now
  listeners: [],
  inflight: 0,             // coin payments sent to Supabase and not answered yet
  lastServerCoins: null,
  testing: false,          // ?reveal / ?unlock / ?coins / ?dev: nothing is saved

  // Loads the saved game (call after IslandSave.init()).
  async load() {
    const params = new URLSearchParams(location.search);
    if (params.get("reset") === "1") {
      try { Object.keys(localStorage).filter((k) => k.startsWith("island.")).forEach((k) => localStorage.removeItem(k)); } catch (err) { /* ignore */ }
    }
    this.testing = ["reveal", "unlock", "coins", "dev"].some((k) => params.has(k));
    const blob = params.get("reset") === "1" ? null : await IslandSave.load();
    if (blob) {
      this.coins = Math.max(0, Number(blob.coins) || 0);
      this.owned = new Set(blob.owned || []);
      this.npcsDone = new Set(blob.npcs || []);
      this.levelsDone = new Set((blob.levels || []).map(Number));
      this.zonesRevealed = new Set(blob.zones || []);
      this.avatar = blob.avatar && blob.avatar.gender ? blob.avatar : null;
    }
    // Logged in: coins are the profile's coins (the same balance as quests and the rest of the app).
    await this.syncCoins(true);
    // The player always arrives on their home island (?start=mystery is for testing).
    this.where = params.get("start") === "mystery" ? "mystery" : "home";
    if (params.get("reveal") === "all") ISLAND_ZONES.forEach((z) => this.zonesRevealed.add(z.id));
    if (params.get("unlock") === "all") ISLAND_LEVELS.forEach((l) => this.levelsDone.add(l.level));
    const gift = Number(params.get("coins"));
    if (gift > 0) this.coins += gift;
    return this;
  },

  snapshot() {
    return {
      coins: this.coins, owned: [...this.owned], npcs: [...this.npcsDone], levels: [...this.levelsDone],
      zones: [...this.zonesRevealed], avatar: this.avatar,
    };
  },

  save() { if (!this.testing) IslandSave.write(this.snapshot()); },

  onChange(fn) { this.listeners.push(fn); },
  emit() { this.listeners.forEach((fn) => { try { fn(this); } catch (err) { console.error(err); } }); },

  // ---- coins ----
  // Logged in: the balance lives in profiles.coins and changes only through the
  // island_earn / island_spend functions (database/island_coins.sql). The screen
  // updates straight away and the server answer then replaces the number.
  // Guests and ?testing links: local only, as before.
  useServer() { return !this.testing && !!IslandSave.userId && IslandSave.hasCloud(); },

  // Reads the profile's coins. `force` also applies it while a payment is pending.
  async syncCoins(force) {
    if (!this.useServer() || (this.inflight > 0 && !force)) return;
    try {
      const { data, error } = await supabase.from("profiles").select("coins").eq("user_id", IslandSave.userId).maybeSingle();
      if (error || !data) return;
      const coins = Math.max(0, Number(data.coins) || 0);
      if (coins !== this.coins) { this.coins = coins; this.save(); this.emit(); }
    } catch (err) { console.warn("Island: could not read coins, using the saved number.", err && err.message); }
  },

  async pay(fn, n, undo) {
    if (!this.useServer()) return;
    this.inflight++;
    let failed = false;
    try {
      const { data, error } = await supabase.rpc(fn, { p_amount: n });
      if (error) throw error;
      this.lastServerCoins = Number(Array.isArray(data) ? data[0] : data);
    } catch (err) {
      failed = true;
      console.warn(`Island: ${fn} was refused.`, err && err.message);
      if (undo) undo();
    }
    this.inflight--;
    if (this.inflight > 0) return;
    if (failed || !Number.isFinite(this.lastServerCoins)) { await this.syncCoins(true); return; }
    if (this.lastServerCoins !== this.coins) { this.coins = Math.max(0, this.lastServerCoins); this.save(); this.emit(); }
  },

  addCoins(n) {
    n = Math.max(0, Math.round(n));
    if (!n) return this.coins;
    this.coins += n; this.save(); this.emit();
    this.pay("island_earn", n);
    return this.coins;
  },
  spend(n, undo) {
    if (this.coins < n) return false;
    this.coins -= n; this.save(); this.emit();
    this.pay("island_spend", n, undo);
    return true;
  },
  owns(id) { return this.owned.has(id); },
  buy(item) {
    if (this.owned.has(item.id)) return false;
    // if the server refuses the payment the item is taken back
    if (!this.spend(item.price, () => { this.owned.delete(item.id); this.save(); this.emit(); })) return false;
    this.owned.add(item.id); this.save(); this.emit(); return true;
  },
  npcDone(id) { return this.npcsDone.has(id); },
  markNpc(id) { this.npcsDone.add(id); this.save(); },
  setAvatar(look) { this.avatar = { gender: look.gender, outfit: look.outfit }; this.save(); this.emit(); },
  setWhere(w) { this.where = w; },
};

// Public hooks for the rest of the app (the scenes add more to this).
window.IslandAPI = Object.assign(window.IslandAPI || {}, {
  getCoins: () => IslandState.coins,
  addCoins: (n) => IslandState.addCoins(n),
});