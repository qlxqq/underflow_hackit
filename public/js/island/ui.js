// Everything drawn on top of the game: zone name, banner, action button,
// waypoint arrow, and the pop-up sheets (landmark, NPC quiz, map, dock).
//
// IslandHooks is where the rest of the app plugs in. Replace these functions
// (for example from the mini-game code) to change what happens.
const IslandHooks = {
  // Called when the player taps "Start level". `landmark` is the level:
  // { level (1-9), name, zone, ... }. When the mini-game ends successfully call
  // IslandAPI.completeLevel(level.level). Replace this to open the real mini-game.
  // Return true if you handled it; return false to show "coming soon".
  startMiniGame(landmark) { return false; },
  // Called when a level is marked complete (IslandAPI.completeLevel(n)).
  onLevelCompleted(level) {},
  // Called when an NPC challenge finishes: { npcId, zone, kind, score, total }.
  onNpcFinished(result) {},
  // Called each time a player passes an NPC's challenge: { npcId, zone, kind, score, total, cards }.
  // `cards` are the new island cards just saved to the album (done by cards.js). Notification only.
  awardCards(info) { return false; },
  // Called the first time a zone's mist lifts: the zone object.
  onZoneDiscovered(zone) {},
  // Optional: return a level number if a mini-game has this word, so Practise goes there first (otherwise an NPC).
  findMiniGame(word, language) { return null; },
  // Called after a challenge when practice was counted: [{ word, evolved }].
  onPractice(list) {},
  // Called when the player sails: "home" or "mystery". Optional.
  onSail(target) {},
  // Called when the player buys something at the shop: the item.
  onPurchase(item) {},
};

const IslandUI = {
  el: {},
  onClose: null,
  open: false,

  init() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      banner: $("banner"), act: $("act-btn"), waypoint: $("waypoint"), waypointArrow: $("waypoint-arrow"),
      waypointLabel: $("waypoint-label"), overlay: $("overlay"), sheet: $("sheet"), mapBtn: $("map-btn"), avatarBtn: $("avatar-btn"), boatBtn: $("boat-btn"),
      coins: $("coin-count"), fade: $("fade"), fadeText: $("fade-text"),
    };
    this.injectNpcStyles();
    this.el.mapBtn.addEventListener("click", () => { if (this.onMap) this.onMap(); });
    if (this.el.boatBtn) { this.el.boatBtn.addEventListener("click", () => { if (this.onBoat) this.onBoat(); }); this.el.boatBtn.style.display = "none"; }
    if (this.el.avatarBtn) { this.el.avatarBtn.addEventListener("click", () => { if (this.onAvatar) this.onAvatar(); }); this.el.avatarBtn.style.display = "none"; }
    this.el.overlay.addEventListener("click", (e) => { if (e.target === this.el.overlay) this.requestClose(); });
    this.el.sheet.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) this.requestClose(); });
    window.addEventListener("keydown", (e) => { if (e.key === "Escape" && this.open) this.requestClose(); });
  },

  esc(text) {
    return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  },

  // ---------- heads-up display ----------
  // The zone name is no longer kept on screen; scene.js flashes it with banner() when you walk into a zone.
  setZone() {},
  setDiscovered() {},
  setDiscoverText() {},
  setCoins(n) { if (this.el.coins) this.el.coins.textContent = String(n); },
  setHudLeft(on) { const e = document.querySelector(".hud-left"); if (e) e.style.display = on ? "" : "none"; },
  showMapButton(on) { this.el.mapBtn.hidden = !on; this.el.mapBtn.style.display = on ? "" : "none"; },
  // Fades the screen to a colour with a message, then runs `then`.
  fadeOut(text, then) {
    this.el.fadeText.textContent = text || "";
    this.el.fade.classList.add("is-on");
    setTimeout(() => then && then(), 450);
  },
  fadeIn() { this.el.fade.classList.remove("is-on"); },
  setAction(label) {
    if (!label) { this.el.act.hidden = true; return; }
    this.el.act.textContent = label;
    this.el.act.hidden = false;
  },
  banner(title, sub) {
    const b = this.el.banner;
    b.innerHTML = `<strong>${this.esc(title)}</strong>${sub ? `<span>${this.esc(sub)}</span>` : ""}`;
    b.hidden = false;
    b.classList.remove("is-show");
    void b.offsetWidth; // restart the animation
    b.classList.add("is-show");
    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => { b.hidden = true; }, 3200);
  },
  setWaypoint(show, angle, label) {
    this.el.waypoint.hidden = !show;
    if (!show) return;
    this.el.waypointArrow.style.transform = `rotate(${angle}rad)`;
    this.el.waypointLabel.textContent = label;
  },

  // ---------- pop-up sheet ----------
  locked: false,
  openSheet(html, onClose, locked) {
    this.locked = !!locked; // a locked sheet can only be closed by its own button
    this.el.overlay.classList.remove("npc-full"); // only the NPC challenge takes over the whole screen
    this.el.sheet.innerHTML = html;
    this.el.overlay.hidden = false;
    this.open = true;
    this.onClose = onClose || null;
    IslandControls.setEnabled(false);
    this.el.sheet.scrollTop = 0;
  },
  // Closing from the player's side (back arrow, tapping outside, Escape). In the middle of an NPC challenge it asks first,
  // because leaving throws the challenge away. The game's own code calls close() directly, which never asks.
  leaveGuard: null,   // set by openNpc: () => true while questions are being asked
  async requestClose() {
    if (!this.open) return;
    if (this.leaveGuard && this.leaveGuard()) {
      const leave = await (typeof LeaveGuard !== "undefined" ? LeaveGuard.confirm() : Promise.resolve(window.confirm("Leave this round? All your progress will be lost and you will start again.")));
      if (!leave) return;
    }
    this.close();
  },

  close(force) {
    if (!this.open || (this.locked && !force)) return;
    this.leaveGuard = null;
    this.locked = false;
    this.open = false;
    this.el.overlay.hidden = true;
    this.el.overlay.classList.remove("npc-full");
    this.el.sheet.innerHTML = "";
    IslandControls.setEnabled(true);
    const cb = this.onClose;
    this.onClose = null;
    if (cb) cb();
  },
  head(chip, accent) {
    return `<div class="sheet-head"><span class="chip" style="--zone:${accent}">${this.esc(chip)}</span><button class="icon-btn" data-close type="button" aria-label="Close">${icon("close", 20)}</button></div>`;
  },

  // ---------- landmark ----------
  openLandmark(landmark, onClose, opts = {}) {
    const zone = ISLAND_ZONES.find((z) => z.id === landmark.zone);
    const game = typeof getMiniGameForLevel === "function" ? getMiniGameForLevel(landmark.level) : { name: "Mini-game", icon: "spark", blurb: "" };
    this.openSheet(
      `${this.head(zone.name, zone.accent)}
       <h2 class="sheet-title">${this.esc(landmark.name)}${opts.done ? ' <span class="done-chip">Completed</span>' : ""}</h2>
       <p class="sheet-sub">${this.esc(landmark.sub)}</p>
       <div class="game-card"><span class="game-ic">${icon(game.icon, 26)}</span>
         <div><strong>${this.esc(game.name)}</strong><p>${this.esc(game.blurb)}</p></div></div>
       <p class="sheet-note" id="sheet-note" hidden>This mini-game is coming soon.</p>
       <button class="btn btn-primary btn-block" id="start-level" type="button">${opts.done ? "Play again" : "Start level"}</button>
       ${opts.dev && !opts.done ? '<button class="btn btn-block" id="dev-done" type="button" style="margin-top:10px">Mark as done (testing only)</button>' : ""}`,
      onClose
    );
    document.getElementById("start-level").addEventListener("click", () => {
      let handled = false;
      try { handled = IslandHooks.startMiniGame(landmark) === true; } catch (err) { console.error(err); }
      if (!handled) document.getElementById("sheet-note").hidden = false;
    });
    const dev = document.getElementById("dev-done");
    if (dev) dev.addEventListener("click", () => { this.close(); opts.onDevDone && opts.onDevDone(); });
  },

  // ---------- dock ----------
  openDock(opts, onClose) {
    this.openSheet(
      `${this.head("Dock", "#3b6fd0")}
       <h2 class="sheet-title">${this.esc(opts.title)}</h2>
       <p class="sheet-sub">${this.esc(opts.text)}</p>
       <button class="btn btn-primary btn-block" id="sail" type="button">${this.esc(opts.button)}</button>
       <button class="btn btn-block" data-close type="button" style="margin-top:10px">Stay here</button>`,
      onClose
    );
    document.getElementById("sail").addEventListener("click", () => { this.close(); opts.onGo(); });
  },

  // ---------- home island: shop and character ----------
  openShop(shop, onClose) {
    let cat = "all";
    const render = () => {
      const items = shop.items.filter((it) => cat === "all" || it.cat === cat);
      const rows = items.map((it) => {
        const owned = shop.owns(it.id);
        const need = it.price - shop.coins();
        const state = owned ? '<span class="shop-owned">Placed</span>'
          : need > 0 ? `<button class="shop-buy" type="button" disabled>${it.price} coins<small>need ${need} more</small></button>`
          : `<button class="shop-buy" type="button" data-buy="${this.esc(it.id)}">${it.price} coins</button>`;
        return `<div class="shop-row ${owned ? "is-owned" : ""}"><img class="shop-thumb" alt="" src="${artThumb(it.key)}"><span class="shop-name">${this.esc(it.name)}</span>${state}</div>`;
      }).join("");
      const tabs = (shop.categories || []).map((c) => `<button class="shop-tab ${c.id === cat ? "is-on" : ""}" type="button" data-cat="${c.id}">${this.esc(c.name)}</button>`).join("");
      const sheet = this.el.sheet;
      const keep = sheet.querySelector(".shop-list") ? sheet.querySelector(".shop-list").scrollTop : 0;
      sheet.innerHTML =
        `${this.head("Island Shop", "#4f9a8c")}
         <h2 class="sheet-title">Island Shop</h2>
         <p class="sheet-sub">You have <strong>${shop.coins()} coins</strong>. Earn more by finishing levels and helping the locals on the mystery island.</p>
         <div class="shop-tabs">${tabs}</div>
         <div class="shop-list">${rows}</div>
         <button class="btn btn-block" data-close type="button" style="margin-top:12px">Done</button>`;
      const list = sheet.querySelector(".shop-list");
      if (list) list.scrollTop = keep;
      sheet.querySelectorAll("[data-cat]").forEach((b) => b.addEventListener("click", () => { cat = b.dataset.cat; render(); }));
      sheet.querySelectorAll("[data-buy]").forEach((b) => b.addEventListener("click", () => { shop.buy(b.dataset.buy); render(); }));
    };
    this.openSheet("", onClose);
    render();
  },

  // ---------- character picker ----------
  showBoatButton(on) { if (this.el.boatBtn) this.el.boatBtn.style.display = on ? "" : "none"; },
  // The app's top bar (language, streak, profile) is shown on the home island only.
  showAvatarButton(on) { if (this.el.avatarBtn) this.el.avatarBtn.style.display = on ? "" : "none"; },
  openAvatar(current, opts, onSave) {
    let look = { gender: current.gender, outfit: current.outfit };
    const render = () => {
      const bodies = Object.entries(AVATAR_BODIES).map(([id, b]) => `<button class="av-body ${look.gender === id ? "is-on" : ""}" type="button" data-gender="${id}"><img alt="" src="${avatarPreview({ gender: id, outfit: look.outfit })}"><span>${this.esc(b.label)}</span></button>`).join("");
      const outfits = AVATAR_OUTFITS.map((o) => `<button class="av-swatch ${look.outfit === o.id ? "is-on" : ""}" type="button" data-outfit="${o.id}" aria-label="${this.esc(o.name)}" style="--c:${o.top}"></button>`).join("");
      this.el.sheet.innerHTML =
        `${opts.first ? '<div class="sheet-head"><span class="chip" style="--zone:#c0786a">Welcome</span></div>' : this.head("Your character", "#c0786a")}
         <h2 class="sheet-title">${opts.first ? "Choose your character" : "Change your look"}</h2>
         <p class="sheet-sub">${opts.first ? "This is how you will look on your island. You can change it any time." : "Pick a character and an outfit colour."}</p>
         <div class="av-bodies">${bodies}</div>
         <div class="av-colours"><span>Outfit</span>${outfits}</div>
         <button class="btn btn-primary btn-block" id="av-save" type="button">${opts.first ? "Start" : "Save"}</button>`;
      this.el.sheet.querySelectorAll("[data-gender]").forEach((b) => b.addEventListener("click", () => { look.gender = b.dataset.gender; render(); }));
      this.el.sheet.querySelectorAll("[data-outfit]").forEach((b) => b.addEventListener("click", () => { look.outfit = b.dataset.outfit; render(); }));
      document.getElementById("av-save").addEventListener("click", () => { onSave(look); this.close(true); });
    };
    this.openSheet("", null, opts.first);
    render();
  },

  // ---------- home island map: where the shop is ----------
  openHomeMap(info, onClose) {
    const rows = info.places.filter((p) => p.go).map((p) => `<button class="map-zone" data-place="${p.id}" type="button" style="--zone:${p.color}"><span class="map-dot"></span><span class="map-zone-name">${this.esc(p.name)}</span><span class="map-go">Show me the way</span></button>`).join("");
    this.openSheet(
      `${this.head("Map", "#c0786a")}
       <canvas id="map-canvas" class="map-canvas" width="680" height="476" aria-label="Map of your island"></canvas>
       <p class="sheet-sub map-help">${(info.things || []).length} placed${info.stored ? ` · ${info.stored} in storage` : ""}. Tap the shop, the dock or anything you placed to get an arrow pointing there.</p>
       <div class="map-zones">${rows}</div>`,
      onClose
    );
    const canvas = document.getElementById("map-canvas");
    const k = canvas.width / HOME_W;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#cfe5f0"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const trace = () => { ctx.beginPath(); HomeWorld.coast.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k))); ctx.closePath(); };
    trace(); ctx.lineWidth = 16; ctx.strokeStyle = "#efe2c2"; ctx.stroke(); trace(); ctx.fillStyle = "#dcead2"; ctx.fill();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    HomeWorld.paths.forEach((line) => { ctx.beginPath(); line.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k))); ctx.lineWidth = 9; ctx.strokeStyle = "#f5e6cf"; ctx.stroke(); });
    const j = HOME_DOCK.jetty; ctx.fillStyle = "#b88a64"; ctx.fillRect((j.x - j.w / 2) * k, j.y * k, j.w * k, j.h * k);
    // what you placed, drawn as a small picture of the thing, standing where it really is
    const icon = (key, x, y, maxSide) => {
      const img = info.art ? info.art(key) : null;
      if (img && img.width) {
        const s = maxSide / Math.max(img.width, img.height);
        ctx.drawImage(img, x - (img.width * s) / 2, y - img.height * s, img.width * s, img.height * s);
      } else { ctx.beginPath(); ctx.arc(x, y - 6, 6, 0, Math.PI * 2); ctx.fillStyle = "#4f9a8c"; ctx.fill(); }
    };
    (info.things || []).slice().sort((a, b) => a.y - b.y).forEach((t) => {
      ctx.fillStyle = "rgba(35,48,72,0.16)"; ctx.beginPath(); ctx.ellipse(t.x * k, t.y * k, Math.max(8, t.w * k * 0.35), 4, 0, 0, Math.PI * 2); ctx.fill();
      icon(t.key, t.x * k, t.y * k, Math.max(26, Math.min(56, Math.max(t.w, t.h) * k * 1.15)));
    });
    (info.pets || []).forEach((p) => icon(p.key, p.x * k, p.y * k, 22));
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    info.places.forEach((p) => {
      const x = p.x * k, y = p.y * k;
      ctx.beginPath(); ctx.arc(x, y, p.id === "shop" ? 19 : 14, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = "#fff"; ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = '800 15px "Manrope", sans-serif'; ctx.fillText(p.id === "shop" ? "$" : p.id === "dock" ? "⚓" : "H", x, y + 1);
      ctx.fillStyle = "#18233a"; ctx.font = '800 17px "Manrope", "Noto Sans SC", sans-serif'; ctx.fillText(p.name, x, y + (p.id === "shop" ? 34 : 28));
    });
    if (info.waypoint) { ctx.beginPath(); ctx.arc(info.waypoint.x * k, info.waypoint.y * k, 28, 0, Math.PI * 2); ctx.setLineDash([6, 6]); ctx.lineWidth = 4; ctx.strokeStyle = "#f2a93b"; ctx.stroke(); ctx.setLineDash([]); }
    ctx.beginPath(); ctx.arc(info.player.x * k, info.player.y * k, 17, 0, Math.PI * 2); ctx.fillStyle = "rgba(242,169,59,0.3)"; ctx.fill();
    ctx.beginPath(); ctx.arc(info.player.x * k, info.player.y * k, 10, 0, Math.PI * 2); ctx.fillStyle = "#f2a93b"; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = "#fff"; ctx.stroke();
    const pick = (id) => { info.onPick(id); this.close(); };
    this.el.sheet.querySelectorAll("[data-place]").forEach((b) => b.addEventListener("click", () => pick(b.dataset.place)));
    canvas.addEventListener("click", (e) => {
      const r = canvas.getBoundingClientRect();
      const wx = ((e.clientX - r.left) / r.width) * HOME_W, wy = ((e.clientY - r.top) / r.height) * HOME_H;
      const things = (info.things || []).map((t) => ({ id: "thing:" + t.id, x: t.x, y: t.y - t.h * 0.4 }));
      const spots = [...info.places.filter((p) => p.id !== "house").map((p) => ({ id: p.id, x: p.x, y: p.y })), ...things];
      let hit = null, best = 200;
      spots.forEach((p) => { const d = Math.hypot(wx - p.x, wy - p.y); if (d < best) { best = d; hit = p; } });
      if (hit) pick(hit.id);
    });
  },

  // ---------- full-screen look of the NPC challenge (same as the Pronunciation and Composition games) ----------
  // The challenge fills the screen: top bar with a back button, one progress segment per question and the language
  // chip; a zone pill row; white cards. The styles are added here, so this file is all that has to change.
  injectNpcStyles() {
    if (document.getElementById("npc-full-style")) return;
    const css = `
body:has(#overlay.npc-full) .bottom-nav { display: none !important; }
#overlay.npc-full { z-index: 70 !important; position: fixed !important; inset: 0 !important; display: flex !important; align-items: stretch !important; justify-content: center !important; padding: 0 !important; background: #e8ecf4 !important; }
#overlay.npc-full[hidden] { display: none !important; }
#overlay.npc-full #sheet { width: min(100%, 460px) !important; max-width: 460px !important; height: 100% !important; max-height: none !important; margin: 0 !important; padding: 0 !important; border-radius: 0 !important; box-shadow: none !important; background: var(--bg, #f3f6fb) !important; overflow-y: auto !important; transform: none !important; animation: none !important; }
.npc-top { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: var(--white, #fff); border-bottom: 1px solid var(--line, #e2e8f0); }
.npc-progress { flex: 1; display: flex; gap: 6px; min-width: 0; }
.npc-progress span { flex: 1; height: 8px; border-radius: 999px; background: var(--lock-bg, #e2e8f0); transition: background 0.3s; }
.npc-progress span.is-done { background: #2e9e5b; }
.npc-progress span.is-current { background: var(--amber, #f2a93b); }
.npc-progress span.is-weak { background: var(--amber-bd, #f3d9a4); }
.npc-lang { cursor: default; pointer-events: none; padding: 0 16px; font-family: var(--font-cjk, inherit), var(--font-ui, inherit); }
.npc-main { display: flex; flex-direction: column; gap: 14px; padding: 16px 16px 32px; }
.npc-zone-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.npc-zone-pill { color: #fff; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; padding: 8px 14px; border-radius: 999px; white-space: nowrap; flex-shrink: 0; }
.npc-zone-label { font-size: 14px; font-weight: 700; color: var(--muted, #6b7a90); text-align: right; }
.npc-card { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 24px 20px; text-align: center; background: var(--white, #fff); border: 1px solid var(--line, #e2e8f0); border-radius: var(--radius-lg, 22px); }
.npc-card > * { margin-top: 0; margin-bottom: 0; }
.npc-card .sheet-title { margin: 0; }
.npc-card .q-part { margin: 0; }
.q-bonus { display: inline-block; margin: 0 0 8px; padding: 3px 10px; border-radius: 999px; background: #fff4de; border: 1px solid #f2d9a6; color: #9a5b00; font: 800 11px var(--font-ui, system-ui); letter-spacing: 0.04em; text-transform: uppercase; }
.npc-full .q-options { display: flex; flex-direction: column; gap: 10px; margin: 0; }
.npc-full .q-feedback { margin: 0; text-align: center; }
.npc-full .npc-main > .btn-block { margin-top: 0; }
@media (prefers-reduced-motion: reduce) { .npc-progress span { transition: none; } }`;
    const tag = document.createElement("style");
    tag.id = "npc-full-style";
    tag.textContent = css;
    document.head.appendChild(tag);
  },
  // top bar of the full-screen challenge. marks[i] = "ok" | "weak" for answered questions; current = the question on screen (-1 = none)
  npcBar(total, marks, current) {
    const segs = Array.from({ length: total }, (_, i) => `<span class="${marks[i] === "ok" ? "is-done" : marks[i] === "weak" ? "is-weak" : i === current ? "is-current" : ""}"></span>`).join("");
    const lang = { zh: "中文", ms: "Melayu", ta: "தமிழ்" }[IslandLang.code] || "";
    return `<header class="npc-top"><button class="icon-btn" data-close type="button" aria-label="Leave the challenge"><svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><div class="npc-progress" aria-hidden="true">${segs}</div><span class="chip npc-lang">${lang}</span></header>`;
  },
  npcZoneRow(zone, label) {
    const n = ISLAND_ZONES.findIndex((z) => z.id === zone.id) + 1;
    return `<div class="npc-zone-row"><span class="npc-zone-pill" style="background:${zone.accent}">ZONE ${n}&nbsp;&nbsp;${this.esc(String(zone.name).toUpperCase())}</span><span class="npc-zone-label">${this.esc(label)}</span></div>`;
  },

  // ---------- NPC challenge ----------
  // opts: { done, progress(): {album, have, total, owned, of}, onResult(score, total) -> reward (may be a promise) }
  openNpc(npc, onClose, opts = {}) {
    const zone = ISLAND_ZONES.find((z) => z.id === npc.zone);
    const focus = opts.focus || null;
    const steps = IslandQuiz.make(npc, zone, { focus });
    const right = new Set(); // words answered correctly (for cards)
    const asked = new Set(); // every word that came up (for practice)
    const missed = new Set(); // words answered wrong (they come first next time)
    const total = steps.length;
    const pass = IslandQuiz.passMark(total);
    const partText = { pinyin: "Quick check", meaning: "Quick check", reverse: "Quick check", listening: "Listening", hearMeaning: "Listening", cloze: "Fill the gap", translate: "Sentence", match: "Matching" };
    if (!total) {
      this.openSheet(`${this.head(npc.name, zone.accent)}<h2 class="sheet-title">${this.esc(npc.name)}</h2><p class="sheet-sub">I have nothing to ask you yet.</p><button class="btn btn-primary btn-block" data-close type="button">OK</button>`, onClose);
      return;
    }
    let index = 0;
    let score = 0;
    const marks = [];   // "ok" = right, "weak" = wrong, per question (the progress bar)
    let running = false;   // true from the first question until the result: leaving then needs a confirm
    this.leaveGuard = () => running;

    const intro = () => {
      const pr = opts.progress ? opts.progress() : null;
      const left = pr ? pr.roleTotal - pr.roleHave : 0;
      // one short line about the cards: how many of this character's cards are still to win
      const cardLine = pr && pr.roleTotal
        ? `<p class="sheet-sub intro-cards">${left > 0 ? `${left} of ${pr.roleTotal} ${this.esc(pr.label)} cards still to win` : `You have all ${pr.roleTotal} ${this.esc(pr.label)} cards`}</p>`
        : "";
      const focusLine = focus ? `<p class="sheet-note">Practising <b lang="${IslandLang.code}">${this.esc(focus)}</b>: it is in this challenge.</p>` : "";
      this.openSheet(
        `${this.npcBar(total, marks, -1)}
         <div class="npc-main">
           ${this.npcZoneRow(zone, npc.role || "Challenge")}
           <section class="npc-card">
             <h2 class="sheet-title">${this.esc(npc.name)}</h2>
             <p class="sheet-sub">${this.esc(npc.greeting)}</p>
             <p class="intro-rule">${total} questions. Get ${pass} right to pass.</p>
             ${cardLine}
             ${focusLine}
           </section>
           <button class="btn btn-primary btn-block" id="npc-go" type="button">Let's go</button>
         </div>`,
        onClose
      );
      this.el.overlay.classList.add("npc-full");
      document.getElementById("npc-go").addEventListener("click", ask);
    };

    const goNext = () => { index++; if (index < total) ask(); else finish(); };
    const nextButton = () => `<button class="btn btn-primary btn-block" id="q-next" type="button" hidden>${index + 1 < total ? "Next" : "See result"}</button>`;
    const header = (q) => `${this.npcBar(total, marks, index)}<div class="npc-main">${this.npcZoneRow(zone, `${npc.name} · ${index + 1} of ${total}`)}`;
    // A question that uses one of the player's own captured words gets a "Bonus" tag
    const tag = (q) => `${q.bonus ? `<span class="q-bonus">Bonus \u00b7 your own word</span>` : ""}<p class="q-part">${partText[q.kind] || "Question"}</p>`;

    const ask = () => {
      running = true;
      const q = steps[index];
      if (q.word) asked.add(q.word);
      if (q.kind === "match") { q.words.forEach((w) => asked.add(w)); return askMatch(q); }
      const listen = !!q.speak;
      const cloze = q.kind === "cloze";
      const sentence = !!q.sentence;
      const stem = listen
        ? `<button class="btn q-play" id="q-play" type="button">${icon("spark", 22)} Play the word</button><p class="sheet-sub" id="q-nosound" hidden>Sound is not available here. Hint: ${this.esc(q.hint)}</p>`
        : sentence
          ? `<p class="q-sentence" id="q-sentence" lang="${IslandLang.code}">${this.esc(q.sentence).replace("＿＿", '<span class="q-gap" id="q-gap">＿＿</span>')}</p><p class="q-translation" id="q-translation" hidden></p>`
          : `<div class="q-word${q.bigIsEnglish ? " is-english" : ""}" ${q.bigIsEnglish ? "" : `lang="${IslandLang.code}"`}>${this.esc(q.big)}</div>`;
      this.el.sheet.innerHTML =
        `${header(q)}
           <section class="npc-card">
             ${tag(q)}
             <p class="sheet-sub">${this.esc(q.prompt)}</p>
             ${stem}
           </section>
           <div class="q-options">${q.options.map((o) => `<button class="q-opt" type="button" ${o.lang ? `lang="${IslandLang.code}"` : ""} data-opt="${this.esc(o.value)}">${this.esc(o.label)}</button>`).join("")}</div>
           <p class="q-feedback" id="q-feedback" role="status"></p>
           ${nextButton()}
         </div>`;
      this.el.sheet.scrollTop = 0;
      if (listen) {
        const play = () => { if (!IslandQuiz.speak(q.speak)) document.getElementById("q-nosound").hidden = false; };
        document.getElementById("q-play").addEventListener("click", play);
        setTimeout(play, 250);
      }
      this.el.sheet.querySelectorAll(".q-opt").forEach((btn) => btn.addEventListener("click", () => {
        const correct = btn.dataset.opt === q.answer;
        if (correct) { score++; if (q.word) right.add(q.word); } else if (q.word) missed.add(q.word);
        marks[index] = correct ? "ok" : "weak";
        const seg = this.el.sheet.querySelectorAll(".npc-progress span")[index];
        if (seg) seg.className = correct ? "is-done" : "is-weak";
        this.el.sheet.querySelectorAll(".q-opt").forEach((b) => {
          b.disabled = true;
          if (b.dataset.opt === q.answer) b.classList.add("is-right");
          else if (b === btn) b.classList.add("is-wrong");
        });
        if (sentence) {
          const gap = document.getElementById("q-gap");
          if (gap) { gap.textContent = q.answer; gap.classList.add("is-filled"); }
          const tr = document.getElementById("q-translation");
          tr.innerHTML = `${q.py ? `${this.esc(q.py)}<br>` : ""}${this.esc(q.en)}`; tr.hidden = false;
        }
        document.getElementById("q-feedback").textContent = correct ? "Correct!" : `Not quite. It is ${q.reveal}.`;
        const next = document.getElementById("q-next");
        next.hidden = false;
        next.addEventListener("click", goNext);
      }));
    };

    // Matching round: tap a word, then its meaning.
    const askMatch = (q) => {
      const pairs = q.pairs;
      const meanings = IslandQuiz.shuffle(pairs.map((p, i) => ({ i, text: p.target })));
      let picked = null;      // { side: "w" | "m", i }
      let mistakes = 0;
      let matched = 0;
      this.el.sheet.innerHTML =
        `${header(q)}
         <section class="npc-card">
           ${tag(q)}
           <p class="sheet-sub">${this.esc(q.prompt)}</p>
         </section>
         <div class="match-grid">
           <div class="match-col">${pairs.map((p, i) => `<button class="match-opt" type="button" data-side="w" data-i="${i}" lang="${IslandLang.code}"><b>${this.esc(p.word)}</b>${q.side === "pinyin" || !p.pinyin ? "" : `<small>${this.esc(p.pinyin)}</small>`}</button>`).join("")}</div>
           <div class="match-col">${meanings.map((m) => `<button class="match-opt" type="button" data-side="m" data-i="${m.i}">${this.esc(m.text)}</button>`).join("")}</div>
         </div>
         <p class="q-feedback" id="q-feedback" role="status">Tap a word, then its meaning.</p>
         ${nextButton()}
         </div>`;
      this.el.sheet.scrollTop = 0;
      const sheet = this.el.sheet;
      const btn = (side, i) => sheet.querySelector(`.match-opt[data-side="${side}"][data-i="${i}"]`);
      sheet.querySelectorAll(".match-opt").forEach((b) => b.addEventListener("click", () => {
        if (b.disabled) return;
        const side = b.dataset.side, i = Number(b.dataset.i);
        if (!picked || picked.side === side) {
          if (picked) btn(picked.side, picked.i).classList.remove("is-picked");
          picked = { side, i }; b.classList.add("is-picked");
          return;
        }
        const a = btn(picked.side, picked.i);
        if (picked.i === i) {
          [a, b].forEach((x) => { x.classList.remove("is-picked"); x.classList.add("is-right"); x.disabled = true; });
          matched++;
          picked = null;
          if (matched === pairs.length) {
            const good = mistakes <= q.allowedMistakes;
            if (good) { score++; q.words.forEach((w) => right.add(w)); }
            marks[index] = good ? "ok" : "weak";
            const seg = sheet.querySelectorAll(".npc-progress span")[index];
            if (seg) seg.className = good ? "is-done" : "is-weak";
            document.getElementById("q-feedback").textContent = mistakes === 0 ? "All matched with no mistakes!" : good ? `All matched (${mistakes} mistake${mistakes > 1 ? "s" : ""}).` : `All matched, but with ${mistakes} mistakes.`;
            const next = document.getElementById("q-next");
            next.hidden = false;
            next.addEventListener("click", goNext);
          }
        } else {
          mistakes++;
          const wordBtn = picked.side === "w" ? a : b;
          if (pairs[Number(wordBtn.dataset.i)]) missed.add(pairs[Number(wordBtn.dataset.i)].word);
          a.classList.remove("is-picked");
          [a, b].forEach((x) => x.classList.add("is-wrong"));
          picked = null;
          setTimeout(() => [a, b].forEach((x) => x.classList.remove("is-wrong")), 500);
        }
      }));
    };

    const finish = async () => {
      running = false;
      const passed = score >= pass;
      this.el.sheet.innerHTML = `${this.npcBar(total, marks, -1)}<div class="npc-main"><section class="npc-card"><h2 class="sheet-title">${score} / ${total}</h2><p class="sheet-sub">Collecting your reward...</p></section></div>`;
      let reward = null;
      try { reward = opts.onResult ? await opts.onResult(score, total, [...right], [...asked], [...missed]) : null; } catch (err) { console.error(err); }
      reward = reward || { coins: 0, xp: 0, cards: [], dupes: [] };
      const cards = reward.cards || [];
      const dupes = reward.dupes || [];
      // new cards arrive in a pack the player opens; the result sheet follows
      if ((cards.length || dupes.length) && typeof IslandPack !== "undefined") {
        const packLines = [reward.coins ? `+${reward.coins} coins` : "", reward.xp ? `+${reward.xp} XP` : "",
          dupes.length && reward.dupePay ? `${dupes.length} duplicate${dupes.length > 1 ? "s" : ""} turned into coins and XP` : ""].filter(Boolean);
        await IslandPack.show(cards, packLines, dupes);
      }
      const msg = score === total ? "Perfect! Well done." : passed ? "Nice work!" : `Good try. You need ${pass} right to pass. Come back and try again.`;
      const cardsHtml = cards.length
        ? `<div class="won-cards">${cards.map((c) => `<div class="won-card${c.kind === "zone" ? " is-zone" : ""}" lang="${IslandLang.code}"><b>${this.esc(c.word)}</b><small>${c.pinyin ? `${this.esc(c.pinyin)} · ` : ""}${this.esc(c.meaning)}</small><em>${c.kind === "role" ? `${this.esc(c.role || "Role")} card` : "Bonus zone card"}</em></div>`).join("")}</div>`
        : "";
      const albumHtml = reward.album && reward.album.total
        ? `<p class="sheet-sub">${this.esc(reward.album.name)} album: ${reward.album.have} / ${reward.album.total} cards</p>` : "";
      const earned = [reward.coins ? `+${reward.coins} coins` : "", reward.xp ? `+${reward.xp} XP` : "", cards.length ? `+${cards.length} card${cards.length > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ");
      const dupeHtml = dupes.length && reward.dupePay
        ? `<p class="sheet-sub">${dupes.length === 1 ? "A card you already own" : `${dupes.length} cards you already own`} turned into +${reward.dupePay.coins} coins and +${reward.dupePay.xp} XP.</p>` : "";
      const noRole = passed && !cards.some((c) => c.kind === "role")
        ? `<p class="sheet-sub">${reward.roleLeft > 0 ? "No new role cards this time. Get the words you have not won yet right to win them." : "You already have every role card here."}</p>` : "";
      this.el.sheet.innerHTML =
        `${this.npcBar(total, marks, -1)}
         <div class="npc-main">
           ${this.npcZoneRow(zone, npc.name)}
           <section class="npc-card">
             <h2 class="sheet-title">${score} / ${total}</h2>
             <p class="sheet-sub">${msg}</p>
             ${earned ? `<p class="reward-line">${earned}</p>` : ""}
             ${reward.levelUps ? '<p class="album-done">Level up! Check your profile.</p>' : ""}
             ${cardsHtml}
             ${dupeHtml}
             ${noRole}
             ${passed ? albumHtml : ""}
             ${(reward.practised || []).length ? `<p class="sheet-sub">Practised: ${reward.practised.map((p) => `<b lang="${IslandLang.code}">${this.esc(p.word)}</b>${p.evolved ? " (evolved!)" : ""}`).join(", ")}</p>` : ""}
             ${reward.masterDone ? '<p class="album-done">Every card in this album is yours! Open Collection for the shiny badge.</p>' : reward.zoneDone ? '<p class="album-done">All zone cards collected! Open Collection to claim your badge.</p>' : ""}
           </section>
           <button class="btn btn-primary btn-block" data-close type="button">Done</button>
         </div>`;
      this.el.sheet.scrollTop = 0;
    };

    intro();
  },

  // ---------- map ----------
  openMap(state, onClose) {
    const rows = ISLAND_ZONES.map((z) => {
      const seen = state.revealed.has(z.id);
      const locked = state.locked(z.id);
      const lv = ISLAND_LEVELS.filter((l) => l.zone === z.id);
      const doneN = lv.filter((l) => state.done.has(l.level)).length;
      const name = locked ? this.esc(z.name) : seen ? this.esc(z.name) : "Hidden in mist";
      const go = locked ? "Locked" : seen ? `${doneN}/${lv.length} done` : "Find it";
      return `<button class="map-zone ${seen && !locked ? "" : "is-hidden"}" data-zone="${z.id}" type="button" style="--zone:${z.accent}">
        <span class="map-dot"></span><span class="map-zone-name">${name}</span>
        <span class="map-go">${go}</span></button>`;
    }).join("");
    this.openSheet(
      `${this.head("Map", "#8190a8")}
       <canvas id="map-canvas" class="map-canvas" width="680" height="454" aria-label="Map of the island"></canvas>
       <p class="sheet-sub map-help">Tap a zone or a place to get an arrow pointing there. A <b class="q-mark">?</b> is someone to talk to.</p>
       <div class="map-zones">${rows}</div>`,
      onClose
    );
    const canvas = document.getElementById("map-canvas");
    this.drawMap(canvas, state);
    const pick = (zoneId) => { state.onPick(zoneId); this.close(); };
    this.el.sheet.querySelectorAll("[data-zone]").forEach((b) => b.addEventListener("click", () => pick(b.dataset.zone)));
    canvas.addEventListener("click", (e) => {
      const r = canvas.getBoundingClientRect();
      const wx = ((e.clientX - r.left) / r.width) * ISLAND_W;
      const wy = ((e.clientY - r.top) / r.height) * ISLAND_H;
      const npcPin = ISLAND_NPCS.find((n) => state.revealed.has(n.zone) && !state.locked(n.zone) && Math.hypot(wx - n.x, wy - n.y) < 130);
      if (npcPin && state.onPickNpc) { state.onPickNpc(npcPin.id); this.close(); return; }
      const pin = ISLAND_LEVELS.find((l) => state.revealed.has(l.zone) && Math.hypot(wx - l.front.x, wy - l.front.y) < 150);
      if (pin && state.onPickLevel) { state.onPickLevel(pin.level); this.close(); return; }
      const hit = IslandWorld.zoneAt(wx, wy);
      if (hit) pick(hit.id);
    });
  },

  drawMap(canvas, state) {
    const ctx = canvas.getContext("2d");
    const k = canvas.width / ISLAND_W;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#cfe5f0"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const trace = () => { ctx.beginPath(); IslandWorld.coast.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k))); ctx.closePath(); };
    trace(); ctx.lineWidth = 16; ctx.strokeStyle = "#efe2c2"; ctx.stroke();
    trace(); ctx.fillStyle = "#dcead2"; ctx.fill();
    ctx.save(); trace(); ctx.clip();
    ISLAND_ZONES.forEach((z) => {
      const seen = state.revealed.has(z.id);
      ctx.fillStyle = seen ? z.ground : "#dde6ef";
      ctx.beginPath(); z.region.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k))); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
    // paths
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    IslandWorld.paths.forEach((line) => {
      ctx.beginPath(); line.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)));
      ctx.lineWidth = 9; ctx.strokeStyle = "#f5e6cf"; ctx.stroke();
    });
    // zone labels and landmark pins
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ISLAND_ZONES.forEach((z) => {
      const seen = state.revealed.has(z.id) && !state.locked(z.id);
      ctx.font = '800 22px "Manrope", "Noto Sans SC", sans-serif';
      ctx.fillStyle = seen ? "#18233a" : "#8190a8";
      ctx.fillText(seen ? z.name : "?", z.label.x * k, z.label.y * k);
    });
    // closed gates
    IslandWorld.gates.forEach((g) => {
      if (!IslandWorld.locked.has(g.index) || g.ends.length < 2) return;
      ctx.beginPath(); ctx.moveTo(g.ends[0].x * k, g.ends[0].y * k); ctx.lineTo(g.ends[1].x * k, g.ends[1].y * k);
      ctx.setLineDash([7, 6]); ctx.lineWidth = 5; ctx.strokeStyle = "#d94a3b"; ctx.stroke(); ctx.setLineDash([]);
    });
    // one pin per mini-game level (only in zones the player has found)
    ISLAND_LEVELS.forEach((l) => {
      if (!state.revealed.has(l.zone)) return;
      const z = ISLAND_ZONES.find((zz) => zz.id === l.zone);
      const r = 15;
      const isDone = state.done.has(l.level);
      ctx.beginPath(); ctx.arc(l.front.x * k, l.front.y * k, r, 0, Math.PI * 2); ctx.fillStyle = isDone ? "#2f9e5b" : z.accent; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = "#fff"; ctx.stroke();
      if (isDone) { ctx.fillStyle = "#fff"; ctx.font = '800 17px "Manrope", sans-serif'; ctx.fillText("✓", l.front.x * k, l.front.y * k + 1); }
      else { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(l.front.x * k - 4, l.front.y * k - 6); ctx.lineTo(l.front.x * k + 7, l.front.y * k); ctx.lineTo(l.front.x * k - 4, l.front.y * k + 6); ctx.closePath(); ctx.fill(); }
      // which mini-game it is, written under the pin (stays after the level is done)
      const gameName = typeof getMiniGameForLevel === "function" ? (getMiniGameForLevel(l.level) || {}).name : "";
      if (gameName) {
        ctx.font = '800 16px "Manrope", sans-serif';
        ctx.lineJoin = "round"; ctx.lineWidth = 5; ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.strokeText(gameName, l.front.x * k, l.front.y * k + r + 14);
        ctx.fillStyle = isDone ? "#1f7a44" : "#18233a";
        ctx.fillText(gameName, l.front.x * k, l.front.y * k + r + 14);
      }
    });
    // one "?" per NPC (only in zones the player has found); green tick once their challenge is passed
    ISLAND_NPCS.forEach((n) => {
      if (!state.revealed.has(n.zone) || state.locked(n.zone)) return;
      const isDone = state.npcDone && state.npcDone(n.id);
      ctx.beginPath(); ctx.arc(n.x * k, n.y * k, 14, 0, Math.PI * 2); ctx.fillStyle = isDone ? "#2f9e5b" : "#7a5cc4"; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = "#fff"; ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = '800 18px "Manrope", sans-serif'; ctx.fillText(isDone ? "✓" : "?", n.x * k, n.y * k + 1);
    });
    // dock
    ctx.fillStyle = "#3b6fd0"; ctx.beginPath(); ctx.arc(ISLAND_DOCK.x * k, (ISLAND_DOCK.y + 90) * k, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#18233a"; ctx.font = '700 17px "Manrope", sans-serif'; ctx.fillText("Dock", ISLAND_DOCK.x * k, (ISLAND_DOCK.y + 90) * k + 26);
    // waypoint
    if (state.waypoint) {
      ctx.beginPath(); ctx.arc(state.waypoint.x * k, state.waypoint.y * k, 22, 0, Math.PI * 2);
      ctx.setLineDash([6, 6]); ctx.lineWidth = 4; ctx.strokeStyle = "#f2a93b"; ctx.stroke(); ctx.setLineDash([]);
    }
    // player
    ctx.beginPath(); ctx.arc(state.player.x * k, state.player.y * k, 17, 0, Math.PI * 2); ctx.fillStyle = "rgba(242,169,59,0.3)"; ctx.fill();
    ctx.beginPath(); ctx.arc(state.player.x * k, state.player.y * k, 10, 0, Math.PI * 2); ctx.fillStyle = "#f2a93b"; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = "#fff"; ctx.stroke();
  },
};