// The player's home island: a small island with a house, an Island Shop, a
// dock for the boat, and spots that fill up with whatever the player buys.
// It reuses the mystery island's art, controls and pop-up sheets.

// Same physics as the mystery island, with the home island's own shape.
const HomeWorld = Object.assign(Object.create(IslandWorld), {
  coast: [], paths: [], rects: [], props: [], gates: [], locked: new Set(),

  build() {
    // Worked out once per visit (see IslandWorld.build). Items the player has
    // placed add their own blocks each time the island opens, so those start fresh.
    if (WORLD_BUILT.has(this)) { this.rects = this.baseRects.map((r) => ({ ...r })); return this; }
    this.coast = islandSmooth(HOME_COAST, true, 12);
    this.paths = HOME_PATHS.map((p) => islandSmooth(p, false, 12));
    this.rects = [];
    this.props = [];
    this.buildMask();
    const add = (p) => { this.props.push(p); if (p.foot) this.addRect(p.x, p.y, p.foot); };
    add({ key: HOME_HOUSE.prop, x: HOME_HOUSE.x, y: HOME_HOUSE.y, foot: HOME_HOUSE.foot });
    add({ key: HOME_SHOP.prop, x: HOME_SHOP.x, y: HOME_SHOP.y, foot: HOME_SHOP.foot });
    // a little scenery, always the same
    const rnd = islandRandom(4242);
    const keepClear = [[HOME_SPAWN.x, HOME_SPAWN.y, 220], [HOME_HOUSE.x, HOME_HOUSE.y, 260], [HOME_SHOP.front.x, HOME_SHOP.front.y, 170],
      ...HOME_ITEMS.flatMap((it) => (it.spots || []).map((s) => [s.x, s.y - ISLAND_ART[it.key][1] * 0.4, Math.max(ISLAND_ART[it.key][0], ISLAND_ART[it.key][1]) * 0.55]))];
    const art = (k) => ISLAND_ART[k] || [40, 40];
    const protect = [
      { x1: HOME_SHOP.front.x - 140, x2: HOME_SHOP.front.x + 140, y1: HOME_SHOP.front.y - 90, y2: HOME_SHOP.front.y + 70 },
      { x1: HOME_SPAWN.x - 200, x2: HOME_SPAWN.x + 200, y1: HOME_SPAWN.y - 220, y2: HOME_SPAWN.y + 120 },
      { x1: HOME_DOCK.jetty.x - 200, x2: HOME_DOCK.jetty.x + 330, y1: HOME_DOCK.jetty.y - 100, y2: HOME_DOCK.jetty.y + HOME_DOCK.jetty.h + 80 },
      ...HOME_ITEMS.flatMap((it) => (it.spots || []).map((s) => ({ x1: s.x - art(it.key)[0] / 2 - 30, x2: s.x + art(it.key)[0] / 2 + 30, y1: s.y - art(it.key)[1] - 30, y2: s.y + 30 }))),
    ];
    this.protect = protect;
    const clearOfUse = (key, x, y) => { const a = art(key); const r = { x1: x - a[0] / 2, x2: x + a[0] / 2, y1: y - a[1], y2: y }; return !protect.some((q) => r.x1 < q.x2 && r.x2 > q.x1 && r.y1 < q.y2 && r.y2 > q.y1); };
    const free = (x, y) => this.isLand(x, y) && this.isLand(x + 70, y) && this.isLand(x - 70, y) && this.isLand(x, y + 70) && this.isLand(x, y - 70) &&
      !this.nearRect(x, y, 70) && this.pathDistance(x, y) > 70 && !keepClear.some(([cx, cy, r]) => Math.hypot(x - cx, y - cy) < r);
    const sizes = { tree: { w: 40, h: 22 }, lamp: { w: 14, h: 10 } };
    [["tree", 8], ["shrub", 6], ["palm", 16], ["lamp", 14]].forEach(([key, count]) => {
      let placed = 0;
      for (let tries = 0; tries < 3000 && placed < count; tries++) {
        const x = Math.round(rnd() * HOME_W);
        const y = Math.round(rnd() * HOME_H);
        if (!free(x, y) || !clearOfUse(key, x, y)) continue;
        if (key === "lamp") { const pd = this.pathDistance(x, y); if (pd < 80 || pd > 130) continue; }
        if (key === "palm" && ![[160, 0], [-160, 0], [0, 160], [0, -160]].some(([dx, dy]) => !this.isLand(x + dx, y + dy))) continue;
        add({ key, x, y, foot: sizes[key] || { w: 30, h: 20 } });
        placed++;
      }
    });
    this.baseRects = this.rects.map((r) => ({ ...r }));
    WORLD_BUILT.add(this);
    return this;
  },

  buildMask() {
    const s = this.MASK_SCALE;
    this.maskW = Math.ceil(HOME_W / s);
    this.maskH = Math.ceil(HOME_H / s);
    const c = document.createElement("canvas");
    c.width = this.maskW; c.height = this.maskH;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#000"; ctx.strokeStyle = "#000";
    ctx.beginPath(); this.coast.forEach(([x, y], i) => (i ? ctx.lineTo(x / s, y / s) : ctx.moveTo(x / s, y / s))); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 56 / s; ctx.stroke();
    const j = HOME_DOCK.jetty;
    ctx.fillRect((j.x - j.w / 2) / s, j.y / s, j.w / s, j.h / s);
    const data = ctx.getImageData(0, 0, this.maskW, this.maskH).data;
    this.mask = new Uint8Array(this.maskW * this.maskH);
    for (let i = 0; i < this.mask.length; i++) this.mask[i] = data[i * 4 + 3] > 110 ? 1 : 0;
  },
});

function homeGroundConfig() {
  const zone = { id: "home", cx: 2000, cy: 1500, radius: 1500, reveal: 0, ground: "#d6e8cf", ground2: "#c4dfbf", pave: false };
  return { id: "home", coast: HomeWorld.coast, paths: HomeWorld.paths, zones: [zone], jetty: HOME_DOCK.jetty, width: HOME_W, height: HOME_H, world: HomeWorld, tufts: 150, waves: 160 };
}

class HomeScene extends Phaser.Scene {
  constructor() { super("home"); }

  init() {
    this.facing = "down";
    this.facingLeft = false;
    this.walkClock = 0;
    this.nearby = null;
    this.placed = {};
  }

  create() {
    HomeWorld.build();
    // Paint only what this island shows now; the rest is painted in the
    // background while the player plays (see buildIslandTexturesLater).
    buildIslandTextures(this, homeArtKeys());
    this.dpr = this.game.islandDpr || 1;
    this.cameras.main.setBackgroundColor("#c3dcea");
    this.ground = new IslandGround(this, homeGroundConfig());

    HomeWorld.props.forEach((p) => {
      this.add.image(p.x, p.y, p.key).setOrigin(0.5, 1).setScale(1 / ART_SCALE).setDepth(p.y);
    });
    const j = HOME_DOCK.jetty;
    this.add.image(j.x + 205, j.y + j.h + 18, "boat").setOrigin(0.5, 1).setScale(1 / ART_SCALE).setDepth(j.y + j.h + 18);
    this.add.text(HOME_SHOP.x, HOME_SHOP.y - ISLAND_ART[HOME_SHOP.prop][1] - 6, HOME_SHOP.name, {
      fontFamily: 'Manrope, "Noto Sans SC", sans-serif', fontSize: "30px", fontStyle: "800", color: "#18233a",
      backgroundColor: "#ffffff", padding: { x: 16, y: 7 },
    }).setOrigin(0.5, 1).setDepth(9500).setResolution(2);
    const ring = this.add.graphics();
    ring.lineStyle(6, 0xf2a93b, 0.95); ring.strokeEllipse(0, 0, 90, 32);
    this.add.container(HOME_SHOP.front.x, HOME_SHOP.front.y, [ring]).setDepth(HOME_SHOP.front.y - 1);
    this.tweens.add({ targets: ring, scaleX: 1.6, scaleY: 1.6, alpha: 0, duration: 1500, repeat: -1, ease: "Sine.easeOut" });

    this.makeItems();
    setTimeout(() => buildIslandTexturesLater(this), 250); // the Mystery Island's pictures, while the player plays

    this.look = currentAvatarLook();
    ensureAvatarTextures(this, this.look);
    // back from another page (Collection, a mini-game...): stand where the player was
    const back = typeof IslandMiniGames !== "undefined" ? IslandMiniGames.takeReturnSpot("home") : null;
    const at = back || HOME_SPAWN;
    this.player = this.add.image(at.x, at.y, avatarKey(this.look, "up", 0)).setOrigin(0.5, 0.92).setScale(1 / ART_SCALE);
    this.facing = "up";

    const cam = this.cameras.main;
    cam.setBounds(-400, -400, HOME_W + 800, HOME_H + 800);
    cam.startFollow(this.player, true, 0.14, 0.14);
    this.applyZoom();
    cam.centerOn(this.player.x, this.player.y);
    cam.preRender();
    this.ground.update();
    const onResize = () => this.applyZoom();
    this.scale.on("resize", onResize);
    this.events.once("shutdown", () => this.scale.off("resize", onResize));

    IslandControls.onAction = () => this.interact();
    this.waypoint = null;
    IslandUI.onMap = () => this.openMap();
    IslandUI.showMapButton(true);
    IslandUI.setAction(null); // forget the button left over from the other island
    IslandUI.setHudLeft(false); // no "Home Island" pill or "things placed" counter
    this.updateHud();
    IslandState.setWhere("home");
    this.coinListener = () => this.updateHud();
    IslandState.onChange(this.coinListener);
    this.events.once("shutdown", () => { IslandState.listeners = IslandState.listeners.filter((f) => f !== this.coinListener); });
    window.IslandAPI.where = () => "home";
    window.IslandAPI.spot = () => ({ x: this.player.x, y: this.player.y });
    IslandUI.showAvatarButton(true);
    IslandUI.onAvatar = () => this.pickAvatar(false);
    this.events.once("shutdown", () => { IslandUI.showAvatarButton(false); IslandUI.onAvatar = null; IslandUI.setWaypoint(false); });
    if (!IslandState.avatar) {
      // When the Journey page is showing its "quick tour" pop-up, let that finish first.
      const tourOpen = () => { try { return !!document.querySelector(".tour-layer"); } catch (err) { return false; } };
      const ask = (tries) => { if (IslandUI.open || IslandState.avatar) return; if (tourOpen() && tries < 240) return setTimeout(() => ask(tries + 1), 500); this.pickAvatar(true); };
      setTimeout(() => ask(0), 1800);
    }
    const loading = document.getElementById("loading");
    if (loading) loading.remove();
    IslandUI.fadeIn();
  }

  // Bought decorations, the people visiting them and the pets are handled in homeLife.js.
  makeItems() { this.lifeInit(); }

  // The character picker (first visit: must choose; later: can change).
  pickAvatar(first) {
    if (IslandUI.open) return;
    IslandUI.openAvatar(currentAvatarLook(), { first }, (look) => { IslandState.setAvatar(look); this.setLook(look); });
  }

  // Switch to a newly chosen look.
  setLook(look) {
    this.look = look;
    ensureAvatarTextures(this, look);
    this.player.setTexture(avatarKey(look, this.facing, 0));
  }

  applyZoom() {
    const w = this.scale.width / this.dpr;
    const h = this.scale.height / this.dpr;
    this.cssZoom = Math.max(0.45, Math.min(1.25, Math.min(w / 760, h / 640)));
    this.cameras.main.setZoom(this.cssZoom * this.dpr);
  }

  updateHud() {
    IslandUI.setCoins(IslandState.coins);
  }

  update(time, delta) {
    const dt = Math.min(delta, 60) / 1000;
    const v = IslandControls.vector();
    const p = this.player;
    const moving = v.x !== 0 || v.y !== 0;
    if (moving) {
      const nx = p.x + v.x * PLAYER_SPEED * dt;
      const ny = p.y + v.y * PLAYER_SPEED * dt;
      if (HomeWorld.canStand(nx, p.y)) p.x = nx;
      if (HomeWorld.canStand(p.x, ny)) p.y = ny;
      const ax = Math.abs(v.x);
      const ay = Math.abs(v.y);
      if (ax > ay * (this.facing === "side" ? 0.8 : 1.25)) { this.facing = "side"; this.facingLeft = v.x < 0; }
      else if (ay > 0.05) this.facing = v.y < 0 ? "up" : "down";
      this.walkClock += dt * 9;
    } else this.walkClock = 0;
    const frame = moving ? [0, 1, 0, 2][Math.floor(this.walkClock) % 4] : 0;
    p.setTexture(avatarKey(this.look, this.facing, frame));
    p.setFlipX(this.facing === "side" && this.facingLeft);
    p.y = Math.round(p.y * 10) / 10;
    p.setDepth(p.y);
    this.ground.update();
    this.updateNearby();
    this.updateWaypoint();
    this.lifeUpdate(time, dt);
  }

  // ---------- map: where the shop and dock are ----------
  places() {
    const j = HOME_DOCK.jetty;
    return [
      { id: "shop", name: "Island Shop", x: HOME_SHOP.x, y: HOME_SHOP.y - 40, go: HOME_SHOP.front, color: "#4f9a8c" },
      { id: "dock", name: "Dock", x: j.x, y: j.y + 60, go: { x: j.x, y: j.y + j.h - 24 }, color: "#3b6fd0" },
      { id: "house", name: "Your house", x: HOME_HOUSE.x, y: HOME_HOUSE.y - 60, go: null, color: "#c0786a" },
    ];
  }

  openMap() {
    if (IslandUI.open) return;
    IslandUI.setAction(null);
    // what is on the island right now (placed decorations and the pets), so the map shows it
    const L = this.life || { items: {}, pets: [] };
    const things = Object.values(L.items).map((o) => ({ id: o.it.id, name: o.it.name, x: o.x, y: o.y, w: o.W, h: o.H, key: o.it.key }));
    const pets = L.pets.map((p) => ({ id: p.it.id, name: p.it.name, x: p.x, y: p.y, key: p.it.key }));
    const stored = typeof this.lifeStoredItems === "function" ? this.lifeStoredItems().length : 0;
    const art = (key) => { try { return this.textures.exists(key) ? this.textures.get(key).getSourceImage() : null; } catch (err) { return null; } };
    IslandUI.openHomeMap({
      places: this.places(), things, pets, stored, art, owns: (id) => IslandState.owns(id), player: { x: this.player.x, y: this.player.y }, waypoint: this.waypoint,
      onPick: (id) => {
        const t = things.find((x) => "thing:" + x.id === id);
        if (t) { this.waypoint = { x: t.x, y: t.y + 40, label: t.name }; return; }
        const p = this.places().find((x) => x.id === id);
        if (p && p.go) this.waypoint = { x: p.go.x, y: p.go.y, label: p.name };
      },
    }, () => { this.nearby = null; });
  }

  updateWaypoint() {
    const wp = this.waypoint;
    if (!wp) { IslandUI.setWaypoint(false); return; }
    const dx = wp.x - this.player.x, dy = wp.y - this.player.y, dist = Math.hypot(dx, dy);
    if (dist < 160) { this.waypoint = null; IslandUI.setWaypoint(false); return; }
    IslandUI.setWaypoint(true, Math.atan2(dy, dx) + Math.PI / 2, `${wp.label} · ${Math.round(dist / 12)} m`);
  }

  interactables() {
    const j = HOME_DOCK.jetty;
    return [
      { kind: "shop", x: HOME_SHOP.front.x, y: HOME_SHOP.front.y, label: "Open the Island Shop" },
      { kind: "dock", x: j.x, y: j.y + j.h - 24, label: "Take the boat" },
    ];
  }

  updateNearby() {
    let best = null;
    let bestD = INTERACT_RANGE;
    if (!IslandUI.open) {
      this.interactables().forEach((it) => {
        const d = Math.hypot(this.player.x - it.x, this.player.y - it.y);
        if (d < bestD) { bestD = d; best = it; }
      });
    }
    const changed = (best && best.label) !== (this.nearby && this.nearby.label);
    this.nearby = best;
    if (changed) IslandUI.setAction(best ? best.label : null);
  }

  interact() {
    if (!this.nearby || IslandUI.open) return;
    const it = this.nearby;
    IslandUI.setAction(null);
    if (it.kind === "shop") {
      // The shop is its own page now. Remember where the player stands so the island opens there again.
      if (typeof IslandMiniGames !== "undefined") IslandMiniGames.saveReturnSpot();
      window.location.href = "../shop/shop.html";
    } else {
      sailTo("mystery", this.game); // tapping "Take the boat" sails straight away
    }
  }
}

// Fades out, then switches islands.
function sailTo(target, game) {
  try { IslandHooks.onSail(target); } catch (err) { console.error(err); }
  IslandControls.setEnabled(false);
  IslandUI.fadeOut(target === "home" ? "Sailing home…" : "Sailing to the Mystery Island…", () => {
    IslandControls.setEnabled(true);
    game.scene.stop(target === "home" ? "island" : "home");
    game.scene.start(target === "home" ? "home" : "island");
  });
}