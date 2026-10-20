// Life on the home island (it extends HomeScene; load it after home.js):
//   - the things the player bought, each placed where the player put it (saved in IslandState.placements)
//   - Decorate mode: drag an item anywhere on the island, flip it left/right
//   - moving parts: the rides turn, the fountain sprays, the campfire flickers...
//   - a visitor for each item (few in total), who walk around it, try it out and look at the sights
//   - pets bought in the shop, who roam the island

const VISITORS_PER_ITEM = 1;   // people visiting each item
const MAX_VISITORS = 8;        // and never more than this many on the whole island
const LIFE_LOOKS = [
  { gender: "boy", outfit: "sunny" }, { gender: "boy", outfit: "sky" }, { gender: "boy", outfit: "mint" }, { gender: "boy", outfit: "rose" },
  { gender: "girl", outfit: "sunny" }, { gender: "girl", outfit: "sky" }, { gender: "girl", outfit: "mint" }, { gender: "girl", outfit: "rose" },
];
// Rides with moving parts are drawn as a still base (HOME_BASE_ART) plus live pieces.
const LIFE_BASE_SPRITE = { windmill: "windmillBase", carousel: "carouselBase", ferrisWheel: "ferrisBase" };
// What a visitor says after trying an item out.
const LIFE_EMOJI = {
  bounceCastle: ["🎉", "😄"], carousel: ["🎠", "😄"], ferrisWheel: ["🎡", "😮"], balloon: ["🎈", "😮"], pool: ["💦", "😄"],
  iceCreamTruck: ["🍦", "😋"], cafe: ["☕", "😋"], arcade: ["🎮", "🕹️"], fountain: ["⛲", "💧"], windmill: ["🌬️", "😮"],
  lighthouse: ["🔭", "😮"], treehouse: ["🌳", "😄"], campfire: ["🔥", "🍡"], stallRed: ["🍗", "😋"], stallTeal: ["🍢", "😋"],
  stallGold: ["🥞", "😋"], koiPond: ["🐟", "😮"], flowerBed: ["🌸", "😊"], playground: ["🛝", "😄"], chessTable: ["♟️", "🤔"],
  bench: ["😌", "☀️"], parasolTable: ["🧃", "😊"], fairyArch: ["✨", "📸"], palm: ["🌴", "😎"], lamp: ["💡", "🙂"],
};
const LIFE_HOP = new Set(["bounceCastle", "playground"]);   // visitors jump around these
const LIFE_RIDE = new Set(["carousel"]);                    // visitors sit on a horse

const lifeEase = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }; // back-out
const lifeOverlap = (a, b) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
const lifeRand = (a, b) => a + Math.random() * (b - a);

// ---------- moving parts, drawn live over the item (art coordinates; o.P maps them to the world) ----------
// sprite(t) squashes / bobs / tilts the picture itself; draw(g, o, t) paints extra pieces on top.
const ITEM_FX = {
  bounceCastle: { sprite: (t) => ({ sy: 1 + 0.045 * Math.sin(t * 5), sx: 1 - 0.028 * Math.sin(t * 5) }) },
  balloon: { sprite: (t) => ({ dy: -12 * Math.sin(t * 1.3), rot: 0.035 * Math.sin(t * 1.1) }) },
  iceCreamTruck: { sprite: (t) => ({ dy: -1.6 * Math.abs(Math.sin(t * 3.2)), rot: 0.004 * Math.sin(t * 6) }) },
  treehouse: { sprite: (t) => ({ rot: 0.012 * Math.sin(t * 1.7) }) },
  flowerBed: { sprite: (t) => ({ rot: 0.018 * Math.sin(t * 2.1), sx: 1 + 0.01 * Math.sin(t * 2.1) }) },
  palm: { sprite: (t) => ({ rot: 0.03 * Math.sin(t * 1.4) }) },

  windmill: {
    draw(g, o, t) {
      const hub = o.P(o.W / 2, 100), a0 = t * 0.9;
      const at = (a, px, py) => ({ x: hub.x + (Math.cos(a) * px - Math.sin(a) * py) * o.dir, y: hub.y + Math.sin(a) * px + Math.cos(a) * py });
      for (let i = 0; i < 4; i++) {
        const a = a0 + i * Math.PI / 2 + 0.35;
        g.fillStyle(0xb88a64, 1); g.fillPoints([at(a, -3, -112), at(a, 3, -112), at(a, 3, 0), at(a, -3, 0)], true);
        g.fillStyle(0xfbf3e2, 1); g.fillPoints([at(a, 4, -108), at(a, 34, -108), at(a, 34, -38), at(a, 4, -38)], true);
        g.lineStyle(2, 0xb88a64, 1); g.strokePoints([at(a, 4, -108), at(a, 34, -108), at(a, 34, -38), at(a, 4, -38)], true);
      }
      g.fillStyle(0x6f4b34, 1); g.fillCircle(hub.x, hub.y, 9);
    },
  },

  ferrisWheel: {
    draw(g, o, t) {
      const c = o.P(o.W / 2, 168), R = 142, a0 = t * 0.22;
      g.lineStyle(4, 0xe0848b, 1);
      for (let i = 0; i < 12; i++) { const a = a0 + (i / 12) * Math.PI * 2; g.lineBetween(c.x, c.y, c.x + Math.cos(a) * R, c.y + Math.sin(a) * R); }
      g.lineStyle(8, 0xe0848b, 1); g.strokeCircle(c.x, c.y, R);
      g.lineStyle(4, 0xf4c5c9, 1); g.strokeCircle(c.x, c.y, R - 34);
      const cols = [0xf2a93b, 0x5b7fd0, 0xe0584f, 0x72c4b8, 0xf6d54a, 0xba68c8];
      for (let i = 0; i < 12; i++) {   // the cabins stay upright as the wheel turns
        const a = a0 + (i / 12) * Math.PI * 2, x = c.x + Math.cos(a) * R, y = c.y + Math.sin(a) * R;
        g.fillStyle(cols[i % 6], 1); g.fillRoundedRect(x - 14, y - 4, 28, 26, 7);
        g.fillStyle(0xffffff, 0.55); g.fillRoundedRect(x - 10, y, 20, 10, 3);
      }
      g.fillStyle(0xf6d54a, 1); g.fillCircle(c.x, c.y, 16); g.fillStyle(0xfff3d0, 1); g.fillCircle(c.x, c.y, 7);
    },
  },

  carousel: {
    draw(g, o, t) {
      [[-78, 0], [-30, 14], [30, 14], [78, 0]].forEach(([dx, dy], i) => {
        const x = o.W / 2 + dx, bob = 8 * Math.sin(t * 2 + i * 1.6);
        const top = o.P(x, 70 + dy), bottom = o.P(x, o.H - 36 + dy * 0.4), body = o.P(x, 130 + dy + bob);
        g.lineStyle(5, 0xf6d54a, 1); g.lineBetween(top.x, top.y, bottom.x, bottom.y);
        const col = [0xffffff, 0xf6c9d0, 0xcfe3f5, 0xffffff][i];
        g.fillStyle(col, 1); g.fillEllipse(body.x, body.y, 34, 26);
        g.fillRoundedRect(body.x + (o.dir > 0 ? 6 : -16), body.y - 18, 10, 16, 5);
      });
    },
  },

  lighthouse: {
    draw(g, o, t) {
      const lamp = o.P(o.W / 2, 62), a = t * 1.1, len = 360, half = 0.22;
      g.fillStyle(0xfff3b0, 0.22 + 0.1 * Math.sin(t * 3));
      g.fillTriangle(lamp.x, lamp.y, lamp.x + Math.cos(a - half) * len, lamp.y + Math.sin(a - half) * len * 0.55, lamp.x + Math.cos(a + half) * len, lamp.y + Math.sin(a + half) * len * 0.55);
      g.fillStyle(0xfff3b0, 0.35 + 0.2 * Math.sin(t * 3)); g.fillCircle(lamp.x, lamp.y, 26);
    },
  },

  fountain: {
    draw(g, o, t) {
      const s = o.P(o.W / 2, 38);
      for (let i = 0; i < 18; i++) {
        const ph = (t * 0.85 + i / 18) % 1, vx = ((i % 6) - 2.5) * 20;
        const x = s.x + vx * ph * o.dir, y = s.y - 62 * ph + 122 * ph * ph;
        g.fillStyle(0xaee3f5, 0.95 - ph * 0.3); g.fillCircle(x, y, 3.4 - ph);
      }
      const r = o.P(o.W / 2, o.H - 42), k = (t * 0.7) % 1;
      g.lineStyle(2, 0xffffff, 0.5 * (1 - k)); g.strokeEllipse(r.x, r.y, 60 + 90 * k, 16 + 24 * k);
    },
  },

  pool: {
    draw(g, o, t) {
      for (let i = 0; i < 7; i++) {
        const p = o.P(50 + ((i * 53) % (o.W - 100)), 40 + ((i * 37) % 120)), a = Math.max(0, Math.sin(t * 2 + i * 1.7));
        g.fillStyle(0xffffff, a * 0.9); g.fillRect(p.x - 1.5, p.y - 6, 3, 12); g.fillRect(p.x - 6, p.y - 1.5, 12, 3);
      }
      const r = o.P(o.W - 90, 80), k = (t * 0.6) % 1;
      g.lineStyle(2, 0xffffff, 0.7 * (1 - k)); g.strokeEllipse(r.x, r.y, 30 + 40 * k, 16 + 20 * k);
    },
  },

  cafe: {
    draw(g, o, t) {
      const cup = o.P(40, o.H - 44);
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.5 + i / 3) % 1;
        g.fillStyle(0xffffff, 0.75 * (1 - ph)); g.fillCircle(cup.x + Math.sin(ph * 7 + i) * 6 * o.dir, cup.y - ph * 52, 4 + ph * 6);
      }
    },
  },

  arcade: {
    draw(g, o, t) {
      [[0xff7ad9, 40], [0x7ff0ff, 80], [0xf6d54a, o.W - 80], [0x8bf09c, o.W - 40]].forEach(([col, x], i) => {
        const p = o.P(x, 66), on = Math.sin(t * 5 + i * 1.6) > 0;
        g.fillStyle(col, on ? 0.55 : 0.12); g.fillCircle(p.x, p.y, on ? 12 : 8);
        g.fillStyle(col, 1); g.fillCircle(p.x, p.y, 6);
      });
      const s = o.P(o.W / 2, 28);
      g.lineStyle(3, 0x7ff0ff, 0.25 + 0.25 * Math.sin(t * 7)); g.strokeRoundedRect(s.x - (o.W - 68) / 2, s.y - 18, o.W - 68, 36, 10);
    },
  },

  fairyArch: {
    draw(g, o, t) {
      const cols = [0xf6d54a, 0xff7ad9, 0x7ff0ff, 0x8bf09c, 0xf2a93b];
      for (let i = 0; i < 16; i++) {
        const tt = i / 15, x = 34 + tt * (o.W - 68), y = 100 - Math.sin(tt * Math.PI) * 108 + (tt < 0.1 || tt > 0.9 ? 40 : 0);
        const p = o.P(x, y + 6), a = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.3);
        g.fillStyle(cols[i % 5], 0.15 + 0.35 * a); g.fillCircle(p.x, p.y, 13);
        g.fillStyle(0xffffff, 0.3 + 0.6 * a); g.fillCircle(p.x, p.y, 3);
      }
    },
  },

  campfire: {
    draw(g, o, t) {
      const b = o.P(o.W / 2, o.H - 34);
      const flick = (k) => Math.sin(t * k) * 0.5 + Math.sin(t * k * 2.3) * 0.5;
      g.fillStyle(0xe0584f, 0.95); g.fillEllipse(b.x, b.y - 22, 34 + 5 * flick(9), 52 + 12 * flick(7));
      g.fillStyle(0xf2a93b, 1); g.fillEllipse(b.x, b.y - 18, 24 + 4 * flick(11), 40 + 10 * flick(8));
      g.fillStyle(0xf6d54a, 1); g.fillEllipse(b.x, b.y - 12, 13 + 3 * flick(13), 24 + 7 * flick(10));
      for (let i = 0; i < 5; i++) {
        const ph = (t * 0.6 + i / 5) % 1;
        g.fillStyle(0xf6b04a, 1 - ph); g.fillCircle(b.x + Math.sin(ph * 6 + i * 2) * 14, b.y - 30 - ph * 70, 2.4 * (1 - ph) + 0.6);
      }
    },
  },

  koiPond: {
    draw(g, o, t) {
      const c = o.P(o.W / 2, o.H / 2 + 2);
      for (let i = 0; i < 2; i++) {
        const k = (t * 0.45 + i * 0.5) % 1;
        g.lineStyle(2, 0xffffff, 0.55 * (1 - k)); g.strokeEllipse(c.x + (i ? 40 : -30) * o.dir, c.y + (i ? 6 : -4), 20 + 90 * k, 8 + 34 * k);
      }
    },
  },
};

const HomeLife = {
  // ======================= setup =======================
  lifeInit() {
    const L = this.life = { t: 0, items: {}, pets: [], visitors: [], editing: false, selected: null, drag: null, pan: null, fresh: [], texts: [] };
    Object.entries(HOME_BASE_ART).forEach(([key, [w, h, paint]]) => {
      if (this.textures.exists(key)) return;
      const { c, ctx } = artCanvas(w, h);
      paint(ctx, w, h);
      this.textures.addCanvas(key, c);
    });
    L.hl = this.add.graphics().setDepth(9000);
    HOME_ITEMS.forEach((it) => {
      if (it.pet || !IslandState.owns(it.id) || IslandState.isStored(it.id)) return;   // stored things are not on the island
      const pl = IslandState.placementOf(it.id);
      if (pl && HomeWorld.isLand(pl.x, pl.y)) this.lifeSpawnItem(it); else IslandState.setStored(it.id);   // a spot that is no longer on the island: back to storage
    });
    HOME_ITEMS.forEach((it) => { if (it.pet && IslandState.owns(it.id)) this.lifeSpawnPet(it); });
    this.lifeBuildUi();
    this.input.on("pointerdown", this.lifePointerDown, this);
    this.input.on("pointermove", this.lifePointerMove, this);
    this.input.on("pointerup", this.lifePointerUp, this);
    this.input.on("pointerupoutside", this.lifePointerUp, this);
    this.events.once("shutdown", () => this.lifeShutdown());
    // new things waiting in storage: say so once
    const waiting = this.lifeStoredItems().length;
    let seen = 0;
    try { seen = Number(localStorage.getItem("island.storageSeen")) || 0; localStorage.setItem("island.storageSeen", String(waiting)); } catch (err) { /* ignore */ }
    if (waiting > seen) IslandUI.banner(waiting === 1 ? "1 item in storage" : `${waiting} items in storage`, "Tap the brush, then Storage, to place them");
  },

  lifeShutdown() {
    const L = this.life;
    if (!L) return;
    if (L.btn) L.btn.remove();
    if (L.bar) L.bar.remove();
    if (L.store) L.store.remove();
    const stage = document.querySelector(".island-stage");
    if (stage) stage.classList.remove("is-decorating");
    IslandControls.setEnabled(true);
    this.input.off("pointerdown", this.lifePointerDown, this);
    this.input.off("pointermove", this.lifePointerMove, this);
    this.input.off("pointerup", this.lifePointerUp, this);
    this.input.off("pointerupoutside", this.lifePointerUp, this);
    this.life = null;
  },

  // ======================= placing =======================
  lifeNoGo() {
    const j = HOME_DOCK.jetty, f = HOME_SHOP.front;
    return [
      { x1: f.x - 150, x2: f.x + 150, y1: f.y - 100, y2: f.y + 80 },                                  // in front of the shop
      { x1: HOME_SPAWN.x - 200, x2: HOME_SPAWN.x + 200, y1: HOME_SPAWN.y - 230, y2: HOME_SPAWN.y + 100 }, // where you arrive
      { x1: j.x - 200, x2: j.x + 200, y1: j.y - 110, y2: j.y + j.h + 60 },                              // the dock
    ];
  },

  // Can this item stand with its base at (x, y)? Only on the island, clear of the house, shop, dock and everything else.
  lifeCanPlace(it, x, y, ownRect) {
    const f = it.foot || { w: 60, h: 24 };
    const r = { x1: x - f.w / 2, x2: x + f.w / 2, y1: y - f.h, y2: y };
    const pad = 24;
    const pts = [[r.x1 - pad, r.y2 + pad], [r.x2 + pad, r.y2 + pad], [r.x1 - pad, r.y1 - pad], [r.x2 + pad, r.y1 - pad], [x, y], [x, r.y1]];
    if (!pts.every(([px, py]) => HomeWorld.isLand(px, py))) return false;
    if (this.lifeNoGo().some((q) => lifeOverlap(r, q))) return false;
    const grown = { x1: r.x1 - 10, x2: r.x2 + 10, y1: r.y1 - 10, y2: r.y2 + 10 };
    for (const b of HomeWorld.rects) { if (b !== ownRect && lifeOverlap(grown, b)) return false; }
    const p = this.player;
    if (p && lifeOverlap({ x1: p.x - 26, x2: p.x + 26, y1: p.y - 26, y2: p.y + 10 }, r)) return false;
    return true;
  },

  lifeDefaultSpot(it, near) {
    const cands = [], cx = near ? near.x : 2000, cy = near ? near.y : 1500;
    for (let r = 0; r <= 1500; r += 90) {
      const n = Math.max(1, Math.round(r / 60));
      for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + r * 0.01; cands.push({ x: Math.round(cx + Math.cos(a) * r * 1.2), y: Math.round(cy + Math.sin(a) * r * 0.9) }); }
    }
    return cands.find((c) => this.lifeCanPlace(it, c.x, c.y, null)) || { x: cx, y: cy };
  },

  lifeSpawnItem(it, near) {
    const L = this.life, [W, H] = ISLAND_ART[it.key];
    let pl = IslandState.placementOf(it.id), fresh = false;
    if (!pl || !HomeWorld.isLand(pl.x, pl.y)) {     // just bought, taken out of storage (or the saved spot is no longer on the island)
      const d = this.lifeDefaultSpot(it, near);
      pl = { x: d.x, y: d.y, flip: false };
      IslandState.setPlacement(it.id, pl);
      fresh = true;
    }
    const spriteKey = LIFE_BASE_SPRITE[it.key] || it.key;
    const sprite = this.add.image(pl.x, pl.y, spriteKey).setOrigin(0.5, 1).setScale(1 / ART_SCALE).setDepth(pl.y).setFlipX(pl.flip);
    const g = this.add.graphics().setDepth(pl.y + 0.5);
    const f = it.foot;
    const rect = f ? { x1: pl.x - f.w / 2, x2: pl.x + f.w / 2, y1: pl.y - f.h, y2: pl.y } : null;
    if (rect) HomeWorld.rects.push(rect);
    const o = { it, W, H, sprite, g, rect, spriteKey, x: pl.x, y: pl.y, flip: pl.flip, dir: pl.flip ? -1 : 1, t0: Math.random() * 20, born: fresh ? 0 : -10, hidden: false, invalid: false, riders: {} };
    o.P = (ax, ay) => ({ x: o.x + (ax - o.W / 2) * o.dir, y: o.y - o.H + ay });
    L.items[it.id] = o;
    if (fresh) L.fresh.push(it);
    for (let i = 0; i < VISITORS_PER_ITEM && L.visitors.length < MAX_VISITORS; i++) this.lifeSpawnVisitor(o, i);
    return o;
  },

  lifeMoveItem(o, x, y) {
    o.x = x; o.y = y;
    o.sprite.setPosition(x, y).setDepth(y);
    o.g.setDepth(y + 0.5);
    if (o.rect) { const f = o.it.foot; o.rect.x1 = x - f.w / 2; o.rect.x2 = x + f.w / 2; o.rect.y1 = y - f.h; o.rect.y2 = y; }
  },

  // ======================= Decorate mode =======================
  lifeBuildUi() {
    const L = this.life;
    const stage = document.querySelector(".island-stage");
    const right = document.querySelector(".island-stage .hud-right");
    if (!stage || !right) return;
    const btn = document.createElement("button");
    btn.type = "button"; btn.id = "decor-btn"; btn.className = "hud-btn";
    btn.setAttribute("aria-label", "Decorate your island");
    btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18.4 2.6a2 2 0 0 1 2.9 2.9L12 14.8 9.2 12z"/><path d="M9.2 12C6.6 12 5 13.7 5 16c0 1.3-.7 2.3-2 3 3.4 1 7-.3 7.8-3.2.3-1 .2-2.8-1.6-3.8z"/></svg>';
    right.insertBefore(btn, document.getElementById("map-btn"));
    btn.addEventListener("click", () => { if (!IslandUI.open) this.lifeSetEditing(!L.editing); });
    const bar = document.createElement("div");
    bar.className = "decor-bar"; bar.hidden = true;
    bar.innerHTML = '<div class="decor-info"><strong id="decor-title">Decorate</strong><span id="decor-hint">Tap an item, then drag it where you want it.</span></div>' +
      '<div class="decor-actions"><button type="button" class="decor-act" id="decor-flip" disabled>Flip</button>' +
      '<button type="button" class="decor-act" id="decor-keep" disabled>Store</button>' +
      '<button type="button" class="decor-act" id="decor-storage">Storage <span id="decor-count">0</span></button>' +
      '<button type="button" class="decor-done" id="decor-done">Done</button></div>';
    stage.appendChild(bar);
    bar.querySelector("#decor-flip").addEventListener("click", () => this.lifeFlipSelected());
    bar.querySelector("#decor-keep").addEventListener("click", () => this.lifeStoreSelected());
    bar.querySelector("#decor-storage").addEventListener("click", () => this.lifeToggleStorage());
    bar.querySelector("#decor-done").addEventListener("click", () => this.lifeSetEditing(false));
    const store = document.createElement("div");
    store.className = "decor-store"; store.hidden = true;
    stage.appendChild(store);
    L.store = store;
    L.btn = btn; L.bar = bar;
  },

  lifeSetEditing(on) {
    const L = this.life;
    if (!L || L.editing === on) return;
    L.editing = on;
    IslandControls.setEnabled(!on);
    IslandUI.setAction(null);
    const stage = document.querySelector(".island-stage");
    if (stage) stage.classList.toggle("is-decorating", on);
    if (L.btn) L.btn.classList.toggle("is-on", on);
    if (L.bar) L.bar.hidden = !on;
    if (!on) this.lifeCloseStorage();
    else this.lifeUpdateStorageCount();
    const cam = this.cameras.main;
    if (on) cam.stopFollow(); else { this.lifeSelect(null); cam.startFollow(this.player, true, 0.14, 0.14); }
    this.nearby = null;
  },

  lifeSelect(o) {
    const L = this.life;
    L.selected = o;
    const title = document.getElementById("decor-title"), hint = document.getElementById("decor-hint"), flip = document.getElementById("decor-flip");
    if (title) title.textContent = o ? o.it.name : "Decorate";
    if (hint) hint.textContent = o ? "Drag to move it. Tap Flip to turn it around." : "Tap an item, then drag it where you want it.";
    if (flip) flip.disabled = !o;
    const keep = document.getElementById("decor-keep");
    if (keep) keep.disabled = !o;
  },

  lifeFlipSelected() {
    const o = this.life && this.life.selected;
    if (!o) return;
    o.flip = !o.flip; o.dir = o.flip ? -1 : 1;
    o.sprite.setFlipX(o.flip);
    IslandState.setPlacement(o.it.id, { x: o.x, y: o.y, flip: o.flip });
  },

  // ======================= storage =======================
  // Bought but not on the island. The player can store a placed item and place it again any time.
  lifeStoredItems() { return HOME_ITEMS.filter((it) => !it.pet && IslandState.owns(it.id) && IslandState.isStored(it.id)); },

  lifeUpdateStorageCount() {
    const c = document.getElementById("decor-count");
    if (c) c.textContent = String(this.lifeStoredItems().length);
  },

  // Take the selected item off the island and keep it in storage.
  lifeStoreSelected() {
    const L = this.life, o = L.selected;
    if (!o) return;
    this.lifeSelect(null);
    L.visitors = L.visitors.filter((v) => { if (v.o !== o) return true; v.sprite.destroy(); return false; });
    if (o.rect) { const i = HomeWorld.rects.indexOf(o.rect); if (i >= 0) HomeWorld.rects.splice(i, 1); }
    o.sprite.destroy(); o.g.destroy();
    delete L.items[o.it.id];
    IslandState.setStored(o.it.id);
    this.lifeUpdateStorageCount();
    if (typeof IslandUI !== "undefined") IslandUI.banner(`${o.it.name} stored`, "Open Storage to place it again, anywhere you like");
  },

  // Put a stored item back on the island, near the middle of the screen, ready to drag.
  lifePlaceFromStorage(it) {
    const L = this.life, c = this.cameras.main;
    const near = { x: c.worldView.centerX, y: c.worldView.centerY };
    const o = this.lifeSpawnItem(it, near);
    this.lifeSelect(o);
    this.lifeUpdateStorageCount();
    this.lifeRenderStorage();
    if (!this.lifeStoredItems().length) this.lifeCloseStorage();
  },

  lifeToggleStorage() {
    const L = this.life;
    if (!L.store) return;
    if (!L.store.hidden) return this.lifeCloseStorage();
    this.lifeRenderStorage();
    L.store.hidden = false;
  },
  lifeCloseStorage() { const L = this.life; if (L && L.store) L.store.hidden = true; },

  lifeRenderStorage() {
    const L = this.life, list = this.lifeStoredItems();
    const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
    L.store.innerHTML = '<div class="decor-store-head"><strong>Storage</strong><button type="button" class="decor-store-x" aria-label="Close">×</button></div>' +
      (list.length ? '<div class="decor-store-list">' + list.map((it) =>
        `<div class="decor-store-row"><img alt="" src="${artThumb(it.key)}"><span>${esc(it.name)}</span><button type="button" class="decor-act" data-place="${esc(it.id)}">Place</button></div>`).join("") + "</div>"
        : '<p class="decor-store-empty">Nothing in storage. Tap an item on your island, then Store, to keep it here.</p>');
    L.store.querySelector(".decor-store-x").addEventListener("click", () => this.lifeCloseStorage());
    L.store.querySelectorAll("[data-place]").forEach((b) => b.addEventListener("click", () => {
      const it = HOME_ITEMS.find((x) => x.id === b.dataset.place);
      if (it) this.lifePlaceFromStorage(it);
    }));
  },

  // The item under this world point (pixel-exact where it can be, otherwise the nearest picture box).
  lifeHit(wx, wy) {
    const list = Object.values(this.life.items).filter((o) => {
      const lx = (wx - o.x) * o.dir + o.W / 2, ly = wy - (o.y - o.H);
      return lx >= 0 && lx <= o.W && ly >= 0 && ly <= o.H;
    }).sort((a, b) => b.y - a.y);
    for (const o of list) {
      const lx = (wx - o.x) * o.dir + o.W / 2, ly = wy - (o.y - o.H);
      try {
        const a = this.textures.getPixelAlpha(Math.floor(lx * ART_SCALE), Math.floor(ly * ART_SCALE), o.spriteKey);
        if (a === null || a > 24) return o;
      } catch (err) { return o; }
    }
    return list[0] || null;
  },

  lifePointerDown(p) {
    const L = this.life;
    if (!L || !L.editing || IslandUI.open) return;
    const o = this.lifeHit(p.worldX, p.worldY);
    if (o) {
      this.lifeSelect(o);
      L.drag = { o, offx: o.x - p.worldX, offy: o.y - p.worldY, sx: p.x, sy: p.y, ox: o.x, oy: o.y, moved: false };
    } else L.pan = { lx: p.x, ly: p.y, sx: p.x, sy: p.y, moved: false };
  },

  lifePointerMove(p) {
    const L = this.life;
    if (!L || !L.editing || !p.isDown) return;
    if (L.drag) {
      const d = L.drag;
      if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) < 8) return;
      d.moved = true;
      const x = Math.round(p.worldX + d.offx), y = Math.round(p.worldY + d.offy);
      this.lifeMoveItem(d.o, x, y);
      d.o.invalid = !this.lifeCanPlace(d.o.it, x, y, d.o.rect);
      d.o.sprite.setTint(d.o.invalid ? 0xff9a9a : 0xffffff);
      if (!d.o.invalid) d.o.sprite.clearTint();
    } else if (L.pan) {
      const cam = this.cameras.main;
      cam.scrollX -= (p.x - L.pan.lx) / cam.zoom;
      cam.scrollY -= (p.y - L.pan.ly) / cam.zoom;
      if (Math.hypot(p.x - L.pan.sx, p.y - L.pan.sy) > 8) L.pan.moved = true;
      L.pan.lx = p.x; L.pan.ly = p.y;
    }
  },

  lifePointerUp() {
    const L = this.life;
    if (!L) return;
    if (L.drag) {
      const d = L.drag, o = d.o;
      if (d.moved) {
        if (o.invalid) { this.lifeMoveItem(o, d.ox, d.oy); o.invalid = false; o.sprite.clearTint(); }   // not allowed there: back to where it was
        else { IslandState.setPlacement(o.it.id, { x: o.x, y: o.y, flip: o.flip }); this.lifeSettleAfterMove(o); }
      }
      L.drag = null;
    } else if (L.pan) {
      if (!L.pan.moved) this.lifeSelect(null);
      L.pan = null;
    }
  },

  // After an item moved: visitors and pets that now stand inside something go and stand somewhere free.
  lifeSettleAfterMove(o) {
    const L = this.life;
    L.visitors.forEach((v) => { if (v.o === o || !HomeWorld.canStand(v.x, v.y, 18)) { const p = this.lifeHangPoint(v.o); v.x = p.x; v.y = p.y; v.state = "idle"; v.wait = lifeRand(0.5, 2); } });
    L.pets.forEach((pet) => { if (!HomeWorld.canStand(pet.x, pet.y, 14)) { const p = this.lifeFreePoint(pet.x, pet.y, 600, 14); pet.x = p.x; pet.y = p.y; pet.state = "idle"; } });
  },

  // ======================= visitors =======================
  // A free spot to stand in front of (or beside) an item.
  lifeHangPoint(o, near) {
    const f = o.it.foot || { w: o.W * 0.4, h: 30 };
    for (let tries = 0; tries < 14; tries++) {
      const a = Math.random() < 0.8 ? Math.PI * lifeRand(0.1, 0.9) : Math.PI * lifeRand(-0.2, 1.2);
      const rx = f.w / 2 + 45 + Math.random() * 70, ry = f.h + 30 + Math.random() * 50;
      const x = Math.round(o.x + Math.cos(a) * rx), y = Math.round(o.y + 14 + Math.sin(a) * ry);
      if (HomeWorld.canStand(x, y, 18)) return { x, y };
    }
    return this.lifeFreePoint(o.x, o.y + 60, 300, 18);
  },

  // A free spot to stand near (x, y).
  lifeFreePoint(x, y, radius, r) {
    for (let tries = 0; tries < 40; tries++) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * radius;
      const px = Math.round(x + Math.cos(a) * d), py = Math.round(y + Math.sin(a) * d);
      if (HomeWorld.canStand(px, py, r)) return { x: px, y: py };
    }
    return { x: HOME_SPAWN.x, y: HOME_SPAWN.y - 80 };
  },

  lifeSpawnVisitor(o, i) {
    const look = LIFE_LOOKS[Math.floor(Math.random() * LIFE_LOOKS.length)];
    ensureAvatarTextures(this, look);
    const p = this.lifeHangPoint(o);
    const sprite = this.add.image(p.x, p.y, avatarKey(look, "down", 0)).setOrigin(0.5, 0.92).setScale(1 / ART_SCALE).setDepth(p.y);
    this.life.visitors.push({ o, i, look, sprite, x: p.x, y: p.y, facing: "down", left: false, state: "idle", wait: lifeRand(0.3, 3), clock: 0, timer: 0, kind: "", hop: 0, blocked: 0, tx: p.x, ty: p.y, slot: -1 });
  },

  lifeVisitorGoal(v) {
    const L = this.life, key = v.o.it.key, r = Math.random();
    if (LIFE_RIDE.has(key) && r < 0.3) {                      // sit on a carousel horse
      const used = L.visitors.filter((w) => w.o === v.o && w.state === "ride").map((w) => w.slot);
      const free = [0, 1, 2, 3].filter((s) => !used.includes(s));
      if (free.length) { v.slot = free[Math.floor(Math.random() * free.length)]; const p = this.lifeHangPoint(v.o); return this.lifeGo(v, p.x, p.y, "ride"); }
    }
    if (r < 0.6) { const p = this.lifeHangPoint(v.o); return this.lifeGo(v, p.x, p.y, LIFE_HOP.has(key) && Math.random() < 0.6 ? "hop" : "look"); }
    if (r < 0.8) {                                            // go and see another item
      const others = Object.values(L.items).filter((x) => x !== v.o);
      if (others.length) { const o2 = others[Math.floor(Math.random() * others.length)]; const p = this.lifeHangPoint(o2); return this.lifeGo(v, p.x, p.y, "look2"); }
    }
    const p = this.lifeFreePoint(v.x, v.y, 380, 18);          // just wander
    return this.lifeGo(v, p.x, p.y, "wander");
  },

  lifeGo(v, x, y, kind) { v.tx = x; v.ty = y; v.kind = kind; v.state = "walk"; v.blocked = 0; },

  lifeBubble(x, y, text) {
    const L = this.life;
    const t = this.add.text(x, y, text, { fontSize: "30px", fontFamily: "system-ui, sans-serif" }).setOrigin(0.5, 1).setDepth(9500).setResolution(2);
    L.texts.push({ t, age: 0, y0: y });
  },

  lifeUpdateVisitor(v, dt) {
    const L = this.life;
    let hop = 0, frame = 0;
    if (v.state === "idle") {
      v.wait -= dt;
      if (v.wait <= 0) this.lifeVisitorGoal(v);
    } else if (v.state === "walk") {
      const dx = v.tx - v.x, dy = v.ty - v.y, d = Math.hypot(dx, dy);
      if (d < 6) {
        v.state = v.kind === "ride" ? "ride" : "do";
        v.timer = v.kind === "ride" ? lifeRand(6, 10) : v.kind === "wander" ? 0.1 : lifeRand(2, 4.5);
        if (v.kind !== "wander" && v.kind !== "ride") {       // face the item
          const dy2 = v.o.y - v.y, dx2 = v.o.x - v.x;
          if (Math.abs(dx2) > Math.abs(dy2) * 1.4) { v.facing = "side"; v.left = dx2 < 0; } else v.facing = dy2 < 0 ? "up" : "down";
        }
      } else {
        const step = 74 * dt, nx = v.x + (dx / d) * step, ny = v.y + (dy / d) * step;
        if (HomeWorld.canStand(nx, ny, 18)) { v.x = nx; v.y = ny; v.blocked = 0; }
        else if (HomeWorld.canStand(nx, v.y, 18)) { v.x = nx; v.blocked += dt * 0.5; }
        else if (HomeWorld.canStand(v.x, ny, 18)) { v.y = ny; v.blocked += dt * 0.5; }
        else v.blocked += dt;
        if (v.blocked > 0.7) { v.state = "idle"; v.wait = lifeRand(0.3, 1.5); }
        if (Math.abs(dx) > Math.abs(dy) * 1.25) { v.facing = "side"; v.left = dx < 0; } else v.facing = dy < 0 ? "up" : "down";
        v.clock += dt * 9;
        frame = [0, 1, 0, 2][Math.floor(v.clock) % 4];
      }
    } else if (v.state === "do") {
      v.timer -= dt;
      if (v.kind === "hop") { hop = Math.abs(Math.sin(v.timer * 8)) * 20; v.facing = "down"; }
      if (v.timer <= 0) {
        if (v.kind === "look" || v.kind === "hop" || v.kind === "look2") { const e = LIFE_EMOJI[v.o.it.key]; if (e && Math.random() < 0.7) this.lifeBubble(v.x, v.y - 118, e[Math.floor(Math.random() * e.length)]); }
        v.state = "idle"; v.wait = lifeRand(0.6, 2.6);
      }
    } else if (v.state === "ride") {
      v.timer -= dt;
      const o = v.o, x = o.W / 2 + [-78, -30, 30, 78][v.slot], dy = [0, 14, 14, 0][v.slot];
      const bob = 8 * Math.sin((L.t + o.t0) * 2 + v.slot * 1.6);
      const p = o.P(x, 126 + dy + bob);
      v.rx = p.x; v.ry = p.y; v.facing = "down";
      if (v.timer <= 0) { v.state = "idle"; v.wait = lifeRand(1, 3); v.rx = undefined; const e = LIFE_EMOJI.carousel; this.lifeBubble(v.x, v.y - 118, e[0]); }
    }
    const riding = v.state === "ride";
    const px = riding ? v.rx : v.x, py = riding ? v.ry : v.y;
    v.sprite.setTexture(avatarKey(v.look, v.facing, frame));
    v.sprite.setFlipX(v.facing === "side" && v.left);
    v.sprite.setPosition(px, py - hop);
    v.sprite.setDepth(riding ? v.o.y + 1 : py);
  },

  // ======================= pets =======================
  lifeSpawnPet(it) {
    const p = this.lifeFreePoint(HOME_SPAWN.x, HOME_SPAWN.y - 120, 500, 16);
    const sprite = this.add.image(p.x, p.y, it.key).setOrigin(0.5, 1).setScale(1 / ART_SCALE).setDepth(p.y);
    this.life.pets.push({ it, sprite, x: p.x, y: p.y, state: "idle", wait: lifeRand(0.5, 3), tx: p.x, ty: p.y, left: false, clock: Math.random() * 6, speed: it.speed || 70, blocked: 0 });
  },

  lifeUpdatePet(pet, dt) {
    const L = this.life;
    let bob = 0, sway = 0, sy = 1;
    if (pet.state === "idle") {
      pet.wait -= dt;
      sy = 1 + 0.025 * Math.sin(L.t * 3 + pet.clock);
      if (pet.wait <= 0) {
        const pl = this.player, near = pl && Math.hypot(pl.x - pet.x, pl.y - pet.y) < 900;
        let g;
        if (near && Math.random() < 0.35) g = this.lifeFreePoint(pl.x, pl.y, 190, 14);   // come and see the player
        else g = this.lifeFreePoint(pet.x, pet.y, 380, 14);
        pet.tx = g.x; pet.ty = g.y; pet.state = "walk"; pet.blocked = 0;
      }
    } else {
      const dx = pet.tx - pet.x, dy = pet.ty - pet.y, d = Math.hypot(dx, dy);
      if (d < 6) {
        pet.state = "idle"; pet.wait = lifeRand(1.5, 5);
        const pl = this.player;
        if (pl && Math.hypot(pl.x - pet.x, pl.y - pet.y) < 200 && Math.random() < 0.5) this.lifeBubble(pet.x, pet.y - 62, "❤️");
      } else {
        const step = pet.speed * dt, nx = pet.x + (dx / d) * step, ny = pet.y + (dy / d) * step;
        if (HomeWorld.canStand(nx, ny, 14)) { pet.x = nx; pet.y = ny; pet.blocked = 0; }
        else if (HomeWorld.canStand(nx, pet.y, 14)) { pet.x = nx; pet.blocked += dt * 0.5; }
        else if (HomeWorld.canStand(pet.x, ny, 14)) { pet.y = ny; pet.blocked += dt * 0.5; }
        else pet.blocked += dt;
        if (pet.blocked > 0.7) { pet.state = "idle"; pet.wait = lifeRand(0.3, 1.2); }
        if (Math.abs(dx) > 3) pet.left = dx < 0;
        pet.clock += dt * (4 + pet.speed / 12);
        const hopH = pet.speed > 60 ? 6 : 2.5;
        bob = Math.abs(Math.sin(pet.clock)) * hopH;
        sway = 0.06 * Math.sin(pet.clock);
      }
    }
    pet.sprite.setPosition(pet.x, pet.y - bob).setFlipX(pet.left).setRotation(sway).setScale(1 / ART_SCALE, sy / ART_SCALE).setDepth(pet.y);
  },

  // ======================= every frame =======================
  lifeUpdate(time, dt) {
    const L = this.life;
    if (!L) return;
    L.t += dt;
    const view = this.cameras.main.worldView;
    const inView = (x, y, m) => x > view.x - m && x < view.right + m && y > view.y - m && y < view.bottom + m;

    Object.values(L.items).forEach((o) => {
      const t = L.t + o.t0, fx = ITEM_FX[o.it.key];
      const near = inView(o.x, o.y - o.H / 2, o.W + 200);
      let sx = 1, sy = 1, dy = 0, rot = 0;
      if (fx && fx.sprite && near) ({ sx = 1, sy = 1, dy = 0, rot = 0 } = fx.sprite(t));
      const age = L.t - o.born;
      const pop = age < 0.45 ? Math.max(0.2, lifeEase(Math.max(0, age) / 0.45)) : 1;
      o.sprite.setScale((sx * pop) / ART_SCALE, (sy * pop) / ART_SCALE).setRotation(rot).setY(o.y + dy);
      o.g.clear();
      if (fx && fx.draw && near) fx.draw(o.g, o, t);
    });

    if (L.editing) { this.lifeDrawSelection(); } else {
      L.hl.clear();
      L.visitors.forEach((v) => { if (inView(v.x, v.y, 400)) this.lifeUpdateVisitor(v, dt); });
    }
    L.pets.forEach((p) => this.lifeUpdatePet(p, dt));

    for (let i = L.texts.length - 1; i >= 0; i--) {   // little speech bubbles float up and fade
      const b = L.texts[i];
      b.age += dt;
      b.t.setY(b.y0 - b.age * 22).setAlpha(Math.max(0, Math.min(1, (1.8 - b.age) / 0.5)));
      if (b.age > 1.8) { b.t.destroy(); L.texts.splice(i, 1); }
    }
  },

  lifeDrawSelection() {
    const L = this.life, g = L.hl, o = L.selected;
    g.clear();
    if (!o) return;
    const col = o.invalid ? 0xe0584f : 0xf2a93b;
    const f = o.it.foot || { w: 60, h: 24 };
    g.fillStyle(col, 0.18); g.fillRoundedRect(o.x - f.w / 2, o.y - f.h, f.w, f.h, 8);
    g.lineStyle(4, col, 1); g.strokeRoundedRect(o.x - o.W / 2 - 6, o.y - o.H - 6, o.W + 12, o.H + 12, 16);
  },
};

Object.assign(HomeScene.prototype, HomeLife);