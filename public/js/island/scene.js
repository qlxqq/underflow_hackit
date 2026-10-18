// The Mystery Island scene: draws the island, moves the player, lifts the mist
// and finds what the player can interact with. Rules live in world.js, data
// in islandData.js, input in controls.js and pop-ups in ui.js.

const PLAYER_SPEED = 330; // world px per second
const INTERACT_RANGE = 140;
const MIST_PUFFS = 40;

class IslandScene extends Phaser.Scene {
  constructor() {
    super("island");
    this.reset();
  }

  // The scene object is reused each time the player sails back, so every
  // piece of per-visit state is cleared here.
  reset() {
    this.revealed = IslandState.zonesRevealed; // shared with the saved game
    this.zoneFade = {};
    this.zoneItems = {};
    this.mist = {};
    this.waypoint = null;
    this.currentZoneId = null;
    this.nearby = null;
    this.walkClock = 0;
    this.done = IslandState.levelsDone;
    this.gateObjs = {};
    this.levelUi = {};
    this.npcUi = {};
    this.facing = "down";
    this.lastBlockedMsg = -9999;
  }

  init() { this.reset(); }

  // ---------- setup ----------
  create() {
    IslandWorld.build();
    buildIslandTextures(this, mysteryArtKeys());
    this.dpr = this.game.islandDpr || 1;
    this.cameras.main.setBackgroundColor("#c3dcea");

    this.loadSaved();
    this.ground = new IslandGround(this);
    this.makeProps();
    this.makeLevelPlaces();
    this.makeNpcs();
    this.makePlayer();
    this.refreshLocks(true);
    this.makeMist();
    this.setupCamera();

    IslandControls.onAction = () => this.interact();
    Object.assign(window.IslandAPI, {
      completeLevel: (n, ratio, total) => this.completeLevel(n, ratio, total),
      isLevelDone: (n) => this.done.has(n),
      levelsDone: () => [...this.done].sort((a, b) => a - b),
      where: () => "mystery",
      spot: () => ({ x: this.player.x, y: this.player.y }),   // where the player stands (a mini-game remembers it)
    });
    this.updateHud();
    setTimeout(() => buildIslandTexturesLater(this), 1200); // the home island's pictures, while the player plays
    IslandUI.setZone("Mystery Island", "#8190a8");
    IslandUI.onMap = () => this.openMap();
    IslandUI.showMapButton(true);
    IslandUI.setAction(null); // forget the button left over from the other island
    this.sailing = false;
    IslandUI.setHudLeft(true);
    IslandUI.showBoatButton(true);
    IslandUI.onBoat = () => this.sailHome();
    this.events.once("shutdown", () => { IslandUI.showBoatButton(false); IslandUI.onBoat = null; });
    IslandState.setWhere("mystery");
    this.applyPractice();
    this.coinListener = () => this.updateHud();
    IslandState.onChange(this.coinListener);
    this.events.once("shutdown", () => { IslandState.listeners = IslandState.listeners.filter((f) => f !== this.coinListener); });

    // Zone fade starts from the saved state.
    ISLAND_ZONES.forEach((z) => (this.zoneFade[z.id] = this.revealed.has(z.id) ? 1 : 0));
    this.applyZoneAlpha(true);
    this.checkReveal(true);
    const loading = document.getElementById("loading");
    if (loading) loading.remove();
    IslandUI.fadeIn();
  }

  loadSaved() {
    this.dev = new URLSearchParams(location.search).get("dev") === "1";
  }

  save() { IslandState.save(); }

  // ---------- things standing on the island ----------
  addToZone(zoneId, obj) {
    (this.zoneItems[zoneId] = this.zoneItems[zoneId] || []).push(obj);
    return obj;
  }

  makeProps() {
    IslandWorld.props.forEach((p) => {
      const img = this.add.image(p.x, p.y, p.key).setOrigin(0.5, 1).setScale(1 / ART_SCALE).setDepth(p.flat ? -900 + p.y / 10000 : p.y);
      if (p.flip) img.setFlipX(true);
      this.addToZone(p.zone, img);
    });

    // the boat at the dock
    const j = ISLAND_DOCK.jetty;
    this.add.image(j.x + 205, j.y + j.h + 18, "boat").setOrigin(0.5, 1).setScale(1 / ART_SCALE).setDepth(j.y + j.h + 18);
  }

  // ---------- the nine locations ----------
  zoneLevels(zoneId) { return ISLAND_LEVELS.filter((l) => l.zone === zoneId); }
  zoneDone(zoneId) { return this.zoneLevels(zoneId).every((l) => this.done.has(l.level)); }
  zoneDoneCount(zoneId) { return this.zoneLevels(zoneId).filter((l) => this.done.has(l.level)).length; }
  hex(c) { return Phaser.Display.Color.HexStringToColor(c).color; }

  // A name board above each building (a play badge, place name, mini-game) and a
  // pulsing ring on the doorstep where the player stands to go in.
  makeLevelPlaces() {
    ISLAND_LEVELS.forEach((l) => {
      const zone = ISLAND_ZONES.find((z) => z.id === l.zone);
      const game = typeof getMiniGameForLevel === "function" ? getMiniGameForLevel(l.level) : { name: "Mini-game" };
      const artH = ISLAND_ART[l.prop][1];
      const nameT = this.add.text(0, 0, l.name, { fontFamily: 'Manrope, "Noto Sans SC", sans-serif', fontSize: "30px", fontStyle: "800", color: "#18233a" }).setResolution(2);
      const gameT = this.add.text(0, 0, game.name, { fontFamily: 'Manrope, "Noto Sans SC", sans-serif', fontSize: "21px", fontStyle: "700", color: "#6a7790" }).setResolution(2);
      const bw = 64 + Math.max(nameT.width, gameT.width) + 26;
      const bh = 74;
      const bg = this.add.graphics();
      bg.fillStyle(0xffffff, 0.96); bg.fillRoundedRect(-bw / 2, -bh, bw, bh, 22);
      bg.lineStyle(3, 0xd9e0ec, 1); bg.strokeRoundedRect(-bw / 2, -bh, bw, bh, 22);
      const badge = this.add.graphics();
      const badgeT = this.add.text(-bw / 2 + 38, -bh / 2, "", { fontFamily: "Manrope, sans-serif", fontSize: "30px", fontStyle: "800", color: "#ffffff" }).setOrigin(0.5).setResolution(2);
      nameT.setPosition(-bw / 2 + 70, -bh + 10); gameT.setPosition(-bw / 2 + 70, -bh + 44);
      const label = this.add.container(l.x, l.y - artH + 24, [bg, badge, badgeT, nameT, gameT]).setDepth(9500);
      const ring = this.add.graphics();
      ring.lineStyle(6, this.hex(zone.accent), 0.95); ring.strokeEllipse(0, 0, 90, 32);
      const ringBox = this.add.container(l.front.x, l.front.y, [ring]).setDepth(l.front.y - 1);
      const pulse = this.tweens.add({ targets: ring, scaleX: 1.6, scaleY: 1.6, alpha: 0, duration: 1500, repeat: -1, ease: "Sine.easeOut", delay: l.level * 130 });
      this.levelUi[l.level] = { label, badge, badgeT, gameT, ringBox, ring, pulse, game, zone };
      this.addToZone(l.zone, label);
      this.addToZone(l.zone, ringBox);
      this.paintLevelState(l.level);
    });
  }

  paintLevelState(n) {
    const u = this.levelUi[n];
    if (!u) return;
    const done = this.done.has(n);
    u.badge.clear();
    u.badge.fillStyle(done ? 0x2f9e5b : this.hex(u.zone.accent), 1);
    const bw = 64 + Math.max(u.label.list[3].width, u.label.list[4].width) + 26;
    u.badge.fillCircle(-bw / 2 + 38, -37, 25);
    u.badgeT.setText(done ? "✓" : "");
    if (!done) { u.badge.fillStyle(0xffffff, 1); u.badge.fillTriangle(-bw / 2 + 31, -49, -bw / 2 + 31, -25, -bw / 2 + 51, -37); }
    u.gameT.setText(done ? "Completed" : u.game.name);
    u.gameT.setColor(done ? "#2f9e5b" : "#6a7790");
    u.ringBox.setVisible(!done);
  }

  // ---------- NPCs ----------
  makeNpcs() {
    ISLAND_NPCS.forEach((n) => {
      const sprite = this.add.image(n.x, n.y, n.look).setOrigin(0.5, 0.92).setScale(1 / ART_SCALE).setDepth(n.y);
      const bubble = this.add.image(n.x, n.y - 142, "bubble").setScale(1 / ART_SCALE * 1.4).setDepth(9000);
      this.tweens.add({ targets: bubble, y: bubble.y - 10, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      bubble.setVisible(!IslandCards.finished(n.id));
      const tag = this.add.text(n.x, n.y + 22, n.name, { fontFamily: 'Manrope, "Noto Sans SC", sans-serif', fontSize: "20px", fontStyle: "800", color: "#18233a", backgroundColor: "rgba(255,255,255,0.88)", padding: { x: 10, y: 4 } })
        .setOrigin(0.5, 0).setResolution(2).setDepth(n.y + 1);
      this.npcUi[n.id] = { sprite, bubble, tag };
      this.addToZone(n.zone, sprite);
      this.addToZone(n.zone, bubble);
      this.addToZone(n.zone, tag);
    });
  }

  // Called when an NPC challenge ends. Passing pays coins the first time, and
  // wins up to 2 cards (3 for a perfect score) from the NPC's words until the
  // player has all five. Returns what was won.
  async npcFinished(npc, score, total, right = [], asked = [], missed = []) {
    const info = { npcId: npc.id, zone: npc.zone, kind: npc.kind, score, total };
    try { IslandHooks.onNpcFinished(info); } catch (err) { console.error(err); }
    const practiced = IslandPractice.pending && IslandPractice.pending.npcId === npc.id;
    const practised = await IslandPractice.record(npc.id, asked);
    if (practised.length) { try { IslandHooks.onPractice(practised); } catch (err) { console.error(err); } }
    if (practiced) { IslandPractice.pending = null; this.waypoint = null; }

    // what this attempt is worth (before it is counted, so the first play pays in full)
    const pay = IslandEconomy.npcPayout(npc.id, score, total);
    IslandState.addPlay(`npc:${npc.id}`);
    // words missed come first next time; words now right stop being priority
    const missedSet = new Set(missed);
    IslandState.updateWeak(missed, right.filter((w) => !missedSet.has(w)));
    if (pay.tier !== "fail" && !IslandState.npcDone(npc.id)) IslandState.markNpc(npc.id);

    // failed: coins and XP only. Passed: role cards for the right words, plus bonus zone cards.
    const won = await IslandCards.award(npc.id, pay.tier, right);
    const dupePay = won.dupes.length ? IslandEconomy.duplicatePayout(won.dupes.length) : null;
    const paid = await IslandEconomy.pay({ coins: pay.coins + (dupePay ? dupePay.coins : 0), xp: pay.xp + (dupePay ? dupePay.xp : 0) });
    try { IslandHooks.awardCards({ ...info, cards: won.cards }); } catch (err) { console.error(err); }
    if (this.npcUi[npc.id]) this.npcUi[npc.id].bubble.setVisible(!IslandCards.finished(npc.id));
    return {
      tier: pay.tier, coins: paid.coins, xp: paid.xp, levelUps: paid.levelUps,
      cards: won.cards, dupes: won.dupes, dupePay, album: won.album, zoneDone: won.zoneDone, masterDone: won.masterDone,
      roleLeft: IslandCards.left(npc.id).length, practised,
    };
  }

  makePlayer() {
    this.look = currentAvatarLook();
    ensureAvatarTextures(this, this.look);
    // back from a mini-game: stand where the player was before it
    const back = typeof IslandMiniGames !== "undefined" ? IslandMiniGames.takeReturnSpot("mystery") : null;
    const at = back || ISLAND_SPAWN;
    this.player = this.add.image(at.x, at.y, avatarKey(this.look, "down", 0)).setOrigin(0.5, 0.92).setScale(1 / ART_SCALE);
    this.facingLeft = false;
    this.facing = "down";
  }

  // ---------- mist ----------
  makeMist() {
    const rnd = islandRandom(909);
    ISLAND_ZONES.forEach((z) => {
      if (this.revealed.has(z.id)) return;
      // Puffs sit on a loose grid over the zone's land, away from its gates (so
      // they do not smother the neighbouring zone) and away from the dock.
      const puffs = [];
      for (let gy = 700; gy < ISLAND_H; gy += 330) {
        for (let gx = 450; gx < ISLAND_W; gx += 330) {
          const x = gx + (rnd() - 0.5) * 160;
          const y = gy + (rnd() - 0.5) * 160;
          if (IslandWorld.zoneAt(x, y).id !== z.id) continue;
          if (!IslandWorld.isLand(x, y) && !IslandWorld.isLand(x + 200, y) && !IslandWorld.isLand(x - 200, y) && !IslandWorld.isLand(x, y + 200) && !IslandWorld.isLand(x, y - 200)) continue;
          if (IslandWorld.gateDistance(x, y) < 330) continue;
          if (Math.hypot(x - ISLAND_SPAWN.x, y - ISLAND_SPAWN.y) < 620) continue;
          const size = 560 + rnd() * 300;
          const puff = this.add.image(x, y, "cloud")
            .setDepth(20000)
            .setScale(size / (512 * ART_SCALE))
            .setAlpha(0.96)
            .setTint([0xffffff, 0xf1f6fb, 0xe6eef7][puffs.length % 3]);
          puff.baseX = puff.x; puff.baseY = puff.y; puff.phase = rnd() * Math.PI * 2;
          puffs.push(puff);
        }
      }
      this.mist[z.id] = puffs;
    });
  }

  liftMist(zone) {
    const puffs = this.mist[zone.id] || [];
    delete this.mist[zone.id];
    puffs.forEach((p, i) => {
      const a = Math.atan2(p.y - zone.cy, p.x - zone.cx);
      this.tweens.add({
        targets: p, alpha: 0, scale: p.scale * 1.35, x: p.x + Math.cos(a) * 240, y: p.y + Math.sin(a) * 240,
        duration: 1800 + (i % 5) * 160, ease: "Sine.easeOut", onComplete: () => p.destroy(),
      });
    });
  }

  // ---------- camera ----------
  setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(-400, -400, ISLAND_W + 800, ISLAND_H + 800);
    cam.startFollow(this.player, true, 0.14, 0.14);
    this.applyZoom();
    cam.centerOn(this.player.x, this.player.y);
    cam.preRender();
    this.ground.update();
    const onResize = () => this.applyZoom();
    this.scale.on("resize", onResize);
    this.events.once("shutdown", () => this.scale.off("resize", onResize));
  }

  applyZoom() {
    const w = this.scale.width / this.dpr;
    const h = this.scale.height / this.dpr;
    const css = Math.max(0.45, Math.min(1.25, Math.min(w / 760, h / 640)));
    this.cssZoom = css;
    this.cameras.main.setZoom(css * this.dpr);
  }

  // ---------- frame loop ----------
  update(time, delta) {
    const dt = Math.min(delta, 60) / 1000;
    this.movePlayer(dt);
    this.animateMist(time);
    this.ground.update();
    this.applyZoneAlpha(false, dt);
    this.checkReveal(false);
    this.updateZoneName();
    this.updateNearby();
    this.updateWaypoint();
  }

  movePlayer(dt) {
    const v = IslandControls.vector();
    const p = this.player;
    const moving = v.x !== 0 || v.y !== 0;
    if (moving) {
      const nx = p.x + v.x * PLAYER_SPEED * dt;
      const ny = p.y + v.y * PLAYER_SPEED * dt;
      let blocked = -1;
      if (IslandWorld.canStand(nx, p.y)) p.x = nx; else blocked = Math.max(blocked, IslandWorld.blockedByGate(nx, p.y));
      if (IslandWorld.canStand(p.x, ny)) p.y = ny; else blocked = Math.max(blocked, IslandWorld.blockedByGate(p.x, ny));
      if (blocked >= 0) this.gateBump(blocked);
      // Turn the character to face where it is going (4 directions).
      const ax = Math.abs(v.x);
      const ay = Math.abs(v.y);
      const sideNow = this.facing === "side";
      if (ax > ay * (sideNow ? 0.8 : 1.25)) { this.facing = "side"; this.facingLeft = v.x < 0; }
      else if (ay > 0.05) this.facing = v.y < 0 ? "up" : "down";
      this.walkClock += dt * 9;
    } else {
      this.walkClock = 0;
    }
    const frame = moving ? [0, 1, 0, 2][Math.floor(this.walkClock) % 4] : 0;
    p.setTexture(avatarKey(this.look, this.facing, frame));
    p.setFlipX(this.facing === "side" && this.facingLeft);
    p.y = Math.round(p.y * 10) / 10;
    p.setDepth(p.y);
  }

  animateMist(time) {
    Object.values(this.mist).forEach((puffs) => puffs.forEach((p) => {
      p.x = p.baseX + Math.sin(time / 2600 + p.phase) * 26;
      p.y = p.baseY + Math.cos(time / 3100 + p.phase) * 18;
    }));
  }

  applyZoneAlpha(instant, dt = 0) {
    ISLAND_ZONES.forEach((z) => {
      const target = this.revealed.has(z.id) ? 1 : 0;
      const cur = this.zoneFade[z.id];
      const next = instant ? target : cur + Math.sign(target - cur) * Math.min(Math.abs(target - cur), dt * 1.3);
      if (next === cur && !instant) return;
      this.zoneFade[z.id] = next;
      (this.zoneItems[z.id] || []).forEach((o) => o.setAlpha(next));
    });
  }

  checkReveal(silent) {
    const p = this.player;
    ISLAND_ZONES.forEach((z) => {
      if (this.revealed.has(z.id)) return;
      if (!this.zoneUnlocked(z)) return;
      if (Math.hypot(p.x - z.cx, p.y - z.cy) > z.reveal) return;
      this.revealed.add(z.id);
      this.save();
      this.liftMist(z);
      this.updateHud();
      if (!silent) IslandUI.banner(`${z.name} discovered`, "The mist lifts");
      try { IslandHooks.onZoneDiscovered(z); } catch (err) { console.error(err); }
    });
  }

  updateZoneName() {
    const zone = IslandWorld.zoneAt(this.player.x, this.player.y);
    const inside = zone && this.revealed.has(zone.id);
    const id = inside ? zone.id : null;
    if (id === this.currentZoneId) return;
    this.currentZoneId = id;
    IslandUI.setZone(inside ? zone.name : "Mystery Island", inside ? zone.accent : "#8190a8");
    if (inside) IslandUI.banner(zone.name);
  }

  // ---------- interaction ----------
  interactables() {
    const list = [];
    ISLAND_LEVELS.forEach((l) => this.revealed.has(l.zone) && list.push({ kind: "level", data: l, x: l.front.x, y: l.front.y, label: `Enter ${l.name}` }));
    ISLAND_NPCS.forEach((n) => this.revealed.has(n.zone) && list.push({ kind: "npc", data: n, x: n.x, y: n.y + 30, label: `Talk to ${n.name}` }));
    const j = ISLAND_DOCK.jetty;
    list.push({ kind: "dock", data: ISLAND_DOCK, x: j.x, y: j.y + j.h - 24, label: "Take the boat" });
    return list;
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
    const after = () => { this.nearby = null; };
    if (it.kind === "level") IslandUI.openLandmark(it.data, after, { done: this.done.has(it.data.level), dev: this.dev, onDevDone: () => this.completeLevel(it.data.level) });
    else if (it.kind === "npc") {
      const npc = it.data;
      const d = IslandCards.data(npc.id);
      IslandUI.openNpc(npc, after, {
        done: IslandState.npcDone(npc.id),
        focus: IslandPractice.pending && IslandPractice.pending.npcId === npc.id ? IslandPractice.pending.word : null,
        progress: () => (d ? { label: d.label, roleHave: IslandCards.owned(npc.id), roleTotal: IslandCards.roleList(npc.id).length } : null),
        onResult: (score, total, right, asked, missed) => this.npcFinished(npc, score, total, right, asked, missed),
      });
    } else sailTo("home", this.game); // tapping "Take the boat" sails straight away
  }

  // ---------- map and waypoint ----------
  // The boat button: sails straight home, same as walking to the dock and tapping "Take the boat".
  sailHome() {
    if (IslandUI.open || this.sailing) return;
    this.sailing = true;
    IslandUI.setAction(null);
    sailTo("home", this.game);
  }

  openMap() {
    if (IslandUI.open) return;
    IslandUI.setAction(null);
    IslandUI.openMap({
      revealed: this.revealed,
      done: this.done,
      locked: (zoneId) => !this.zoneUnlocked(ISLAND_ZONES.find((z) => z.id === zoneId)),
      player: { x: this.player.x, y: this.player.y },
      waypoint: this.waypoint,
      onPick: (zoneId) => this.setWaypointToZone(zoneId),
      onPickLevel: (n) => this.setWaypointToLevel(n),
      npcDone: (id) => IslandCards.finished(id),
      onPickNpc: (id) => this.setWaypointToNpc(id),
    }, () => { this.nearby = null; });
  }

  // Runs fn after the zone banner has gone (only if this scene is still showing).
  later(fn) { setTimeout(() => { if (this.scene && this.scene.isActive()) fn(); }, 3800); }

  // Came here from the Collection's Practise button: point at where the word is.
  applyPractice() {
    const p = IslandPractice.pending;
    if (!p || p.shown) return;
    p.shown = true;
    const target = IslandPractice.find(p.word, p.album);
    if (!target) {
      IslandPractice.pending = null;
      this.later(() => IslandUI.banner(`No practice for ${p.word} yet`));
      return;
    }
    if (target.level) {
      this.setWaypointToLevel(target.level);
      this.later(() => IslandUI.banner(`Practise ${p.word}`, "Follow the arrow to the mini-game"));
      return;
    }
    const npc = ISLAND_NPCS.find((n) => n.id === target.npcId);
    p.npcId = npc.id;
    const zone = ISLAND_ZONES.find((z) => z.id === npc.zone);
    if (this.zoneUnlocked(zone)) this.setWaypointToNpc(npc.id); else this.setWaypointToZone(npc.zone);
    this.later(() => IslandUI.banner(`Practise ${p.word}`, this.zoneUnlocked(zone) ? `Talk to ${npc.name}. Follow the arrow.` : `${npc.name} is in ${zone.name}. Finish the zone before it to open the gate.`));
  }

  setWaypointToNpc(id) {
    const n = ISLAND_NPCS.find((x) => x.id === id);
    if (n) this.waypoint = { x: n.x, y: n.y + 30, label: n.name };
  }

  setWaypointToLevel(n) {
    const l = ISLAND_LEVELS.find((x) => x.level === n);
    if (!l) return;
    const zone = ISLAND_ZONES.find((z) => z.id === l.zone);
    if (!this.zoneUnlocked(zone)) { this.setWaypointToZone(l.zone); return; }
    this.waypoint = { x: l.front.x, y: l.front.y, label: l.name };
  }

  setWaypointToZone(zoneId) {
    const zi = ISLAND_ZONES.findIndex((zz) => zz.id === zoneId);
    const z = ISLAND_ZONES[zi];
    if (!this.zoneUnlocked(z)) {
      const g = IslandWorld.gates[zi - 1];
      this.waypoint = { x: g.door.x, y: g.door.y, label: `Gate · finish ${ISLAND_ZONES[zi - 1].name}` };
      return;
    }
    if (!this.revealed.has(zoneId)) { this.waypoint = { x: z.cx, y: z.cy, label: "Hidden zone" }; return; }
    const levels = this.zoneLevels(zoneId);
    const next = levels.find((l) => !this.done.has(l.level)) || levels[levels.length - 1];
    this.waypoint = { x: next.front.x, y: next.front.y, label: next.name };
  }

  updateWaypoint() {
    const wp = this.waypoint;
    if (!wp) { IslandUI.setWaypoint(false); return; }
    const dx = wp.x - this.player.x;
    const dy = wp.y - this.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 220) { this.waypoint = null; IslandUI.setWaypoint(false); return; }
    IslandUI.setWaypoint(true, Math.atan2(dy, dx) + Math.PI / 2, `${wp.label} · ${Math.round(dist / 12)} m`);
  }

  // ---------- progress and gates ----------
  zoneUnlocked(zone) {
    const zi = ISLAND_ZONES.indexOf(zone);
    return zi <= 0 || !IslandWorld.locked.has(zi - 1);
  }

  updateHud() {
    IslandUI.setDiscovered(this.revealed.size, ISLAND_ZONES.length, this.done.size, ISLAND_LEVELS.length);
    IslandUI.setCoins(IslandState.coins);
  }

  // Called when a mini-game is finished (a mini-game calls IslandAPI.completeLevel(n, ratio, total)).
  // ratio (0-1) is how well it went; leave it out for "completed". total = how many questions the game has (longer games pay more). The first clear opens the way
  // on; every play pays coins and XP, a little less each time (economy.js).
  async completeLevel(n, ratio = 1, total) {
    const l = ISLAND_LEVELS.find((x) => x.level === n);
    if (!l) return;
    const first = !this.done.has(n);
    const pay = IslandEconomy.miniPayout(n, ratio, total);
    IslandState.addPlay(`mini:${n}`);
    if (first) {
      this.done.add(n);
      this.save();
      this.paintLevelState(n);
    }
    this.updateHud();
    const paid = await IslandEconomy.pay({ coins: pay.coins, xp: pay.xp });
    const gain = [paid.coins ? `+${paid.coins} coins` : "", paid.xp ? `+${paid.xp} XP` : ""].filter(Boolean).join(" · ");
    try { IslandHooks.onLevelCompleted(l); } catch (err) { console.error(err); }
    const zone = ISLAND_ZONES.find((z) => z.id === l.zone);
    const before = IslandWorld.locked.size;
    this.refreshLocks(false);
    if (first && IslandWorld.locked.size < before) {
      const next = ISLAND_ZONES[ISLAND_ZONES.indexOf(zone) + 1];
      IslandUI.banner(`${zone.name} complete`, `${gain} · the gate to ${next.name} is open`);
    } else if (first) {
      IslandUI.banner(`${l.name} complete`, `${gain} · ${this.zoneDoneCount(l.zone)}/${this.zoneLevels(l.zone).length} in ${zone.name}`);
    } else {
      IslandUI.banner(`${l.name} played again`, gain || "Nice practice!");
    }
  }

  // Closes the gates for zones that are not finished, and builds or removes the barriers.
  refreshLocks(instant) {
    ISLAND_GATES.forEach((def, index) => {
      const from = ISLAND_ZONES.find((z) => z.id === def.from);
      const open = this.zoneDone(def.from) && !IslandWorld.locked.has(index - 1);
      const wasLocked = IslandWorld.locked.has(index);
      if (open) {
        IslandWorld.locked.delete(index);
        if (wasLocked || this.gateObjs[index]) this.removeGate(index, instant);
      } else {
        IslandWorld.locked.add(index);
        if (!this.gateObjs[index]) this.buildGate(index);
        this.updateGateLabel(index);
      }
    });
  }

  buildGate(index) {
    const g = IslandWorld.gates[index];
    const objs = [];
    g.points.forEach((pt) => {
      if (Math.hypot(pt.x - g.door.x, pt.y - g.door.y) < 120) return;
      const post = this.add.image(pt.x, pt.y, "barricade").setOrigin(0.5, 1).setScale(1 / ART_SCALE).setDepth(pt.y);
      objs.push(post);
    });
    const gate = this.add.image(g.door.x, g.door.y + 30, "gate").setOrigin(0.5, 1).setScale(1 / ART_SCALE).setDepth(g.door.y + 30);
    const text = this.add.text(g.door.x, g.door.y - 120, "", {
      fontFamily: 'Manrope, "Noto Sans SC", sans-serif', fontSize: "26px", fontStyle: "800", color: "#18233a",
      backgroundColor: "#ffffff", padding: { x: 14, y: 7 }, align: "center",
    }).setOrigin(0.5, 1).setDepth(9400).setResolution(2);
    objs.push(gate, text);
    this.gateObjs[index] = { objs, text };
  }

  updateGateLabel(index) {
    const o = this.gateObjs[index];
    if (!o) return;
    const def = ISLAND_GATES[index];
    const zone = ISLAND_ZONES.find((z) => z.id === def.from);
    o.text.setText(`Finish ${zone.name}\n${this.zoneDoneCount(def.from)}/${this.zoneLevels(def.from).length} levels done`);
  }

  removeGate(index, instant) {
    const o = this.gateObjs[index];
    delete this.gateObjs[index];
    if (!o) return;
    if (instant) { o.objs.forEach((x) => x.destroy()); return; }
    o.objs.forEach((x, i) => this.tweens.add({ targets: x, alpha: 0, y: x.y - 30, duration: 700, delay: (i % 12) * 40, ease: "Sine.easeIn", onComplete: () => x.destroy() }));
  }

  // The player pushed against a closed gate.
  gateBump(index) {
    const now = this.time.now;
    if (now - this.lastBlockedMsg < 2600) return;
    this.lastBlockedMsg = now;
    const def = ISLAND_GATES[index];
    const zone = ISLAND_ZONES.find((z) => z.id === def.from);
    IslandUI.banner("The way is closed", `Finish all ${zone.name} levels first (${this.zoneDoneCount(def.from)}/${this.zoneLevels(def.from).length})`);
  }
}