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
  // Called the first time a player passes an NPC's challenge: { npcId, zone, kind, cards }.
  // Give the player their card(s) here (see docs/ISLAND.md). Return true when handled.
  awardCards(info) { return false; },
  // Called the first time a zone's mist lifts: the zone object.
  onZoneDiscovered(zone) {},
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
      zonePill: $("zone-pill"), zoneText: $("zone-pill-text"), discover: $("discover"),
      banner: $("banner"), act: $("act-btn"), waypoint: $("waypoint"), waypointArrow: $("waypoint-arrow"),
      waypointLabel: $("waypoint-label"), overlay: $("overlay"), sheet: $("sheet"), mapBtn: $("map-btn"), avatarBtn: $("avatar-btn"), boatBtn: $("boat-btn"),
      coins: $("coin-count"), fade: $("fade"), fadeText: $("fade-text"),
    };
    this.el.mapBtn.addEventListener("click", () => { if (this.onMap) this.onMap(); });
    if (this.el.boatBtn) { this.el.boatBtn.addEventListener("click", () => { if (this.onBoat) this.onBoat(); }); this.el.boatBtn.style.display = "none"; }
    if (this.el.avatarBtn) { this.el.avatarBtn.addEventListener("click", () => { if (this.onAvatar) this.onAvatar(); }); this.el.avatarBtn.style.display = "none"; }
    this.el.overlay.addEventListener("click", (e) => { if (e.target === this.el.overlay) this.close(); });
    this.el.sheet.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) this.close(); });
    window.addEventListener("keydown", (e) => { if (e.key === "Escape" && this.open) this.close(); });
  },

  esc(text) {
    return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  },

  // ---------- heads-up display ----------
  setZone(name, accent) {
    this.el.zoneText.textContent = name;
    this.el.zonePill.style.setProperty("--zone", accent || "#8190a8");
  },
  setDiscovered(n, total, done, levels) {
    this.el.discover.textContent = `${n}/${total} zones · ${done}/${levels} levels`;
  },
  setCoins(n) { if (this.el.coins) this.el.coins.textContent = String(n); },
  setDiscoverText(text) { this.el.discover.textContent = text; },
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
    this.el.sheet.innerHTML = html;
    this.el.overlay.hidden = false;
    this.open = true;
    this.onClose = onClose || null;
    IslandControls.setEnabled(false);
    this.el.sheet.scrollTop = 0;
  },
  close(force) {
    if (!this.open || (this.locked && !force)) return;
    this.locked = false;
    this.open = false;
    this.el.overlay.hidden = true;
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
       <p class="sheet-sub map-help">Tap the shop or the dock to get an arrow pointing there.</p>
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
    // things bought (filled) and spots still free (hollow)
    HOME_ITEMS.forEach((it) => it.spots.forEach((s) => {
      ctx.beginPath(); ctx.arc(s.x * k, (s.y - 40) * k, 7, 0, Math.PI * 2);
      if (info.owns(it.id)) { ctx.fillStyle = "#4f9a8c"; ctx.fill(); } else { ctx.setLineDash([3, 3]); ctx.lineWidth = 2; ctx.strokeStyle = "#9fb0c8"; ctx.stroke(); ctx.setLineDash([]); }
    }));
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
      const hit = info.places.find((p) => p.id !== "house" && Math.hypot(wx - p.x, wy - p.y) < 220);
      if (hit) pick(hit.id);
    });
  },

  // ---------- NPC challenge ----------
  openNpc(npc, onClose, opts = {}) {
    const zone = ISLAND_ZONES.find((z) => z.id === npc.zone);
    const questions = IslandQuiz.make(npc, zone);
    const total = questions.length;
    const kindText = { pinyin: "Pinyin challenge", meaning: "Meaning challenge", listening: "Listening challenge" }[npc.kind] || "Challenge";
    if (!total) {
      this.openSheet(`${this.head(npc.name, zone.accent)}<h2 class="sheet-title">${this.esc(npc.name)}</h2><p class="sheet-sub">I have nothing to ask you yet.</p><button class="btn btn-primary btn-block" data-close type="button">OK</button>`, onClose);
      return;
    }
    let index = 0;
    let score = 0;

    const intro = () => {
      this.openSheet(
        `${this.head(`${npc.role || zone.name}`, zone.accent)}
         <h2 class="sheet-title">${this.esc(npc.name)}</h2>
         <p class="sheet-sub">${this.esc(npc.greeting)}</p>
         <div class="game-card"><div><strong>${kindText}</strong><p>${total} questions. Get ${IslandQuiz.pass} right to earn coins and a card${opts.done ? " (you have already earned this)" : ""}.</p></div></div>
         <button class="btn btn-primary btn-block" id="npc-go" type="button">Let's go</button>`,
        onClose
      );
      document.getElementById("npc-go").addEventListener("click", ask);
    };

    const ask = () => {
      const q = questions[index];
      const listen = q.kind === "listening";
      this.el.sheet.innerHTML =
        `${this.head(`${npc.name} · ${index + 1} of ${total}`, zone.accent)}
         <p class="sheet-sub">${this.esc(q.prompt)}</p>
         ${listen ? `<button class="btn q-play" id="q-play" type="button">${icon("spark", 22)} Play the word</button><p class="sheet-sub" id="q-nosound" hidden>Sound is not available here. Hint: ${this.esc(q.hint)}</p>` : `<div class="q-word" lang="zh">${this.esc(q.big)}</div>`}
         <div class="q-options">${q.options.map((o) => `<button class="q-opt" type="button" ${o.lang ? 'lang="zh"' : ""} data-opt="${this.esc(o.value)}">${this.esc(o.label)}</button>`).join("")}</div>
         <p class="q-feedback" id="q-feedback" role="status"></p>
         <button class="btn btn-primary btn-block" id="q-next" type="button" hidden>${index + 1 < total ? "Next" : "See result"}</button>`;
      if (listen) {
        const play = () => { if (!IslandQuiz.speak(q.speak)) document.getElementById("q-nosound").hidden = false; };
        document.getElementById("q-play").addEventListener("click", play);
        setTimeout(play, 250);
      }
      this.el.sheet.querySelectorAll(".q-opt").forEach((btn) => btn.addEventListener("click", () => {
        const correct = btn.dataset.opt === q.answer;
        if (correct) score++;
        this.el.sheet.querySelectorAll(".q-opt").forEach((b) => {
          b.disabled = true;
          if (b.dataset.opt === q.answer) b.classList.add("is-right");
          else if (b === btn) b.classList.add("is-wrong");
        });
        document.getElementById("q-feedback").textContent = correct ? "Correct!" : `Not quite. It is ${q.reveal}.`;
        const next = document.getElementById("q-next");
        next.hidden = false;
        next.addEventListener("click", () => { index++; if (index < total) ask(); else finish(); });
      }));
    };

    const finish = () => {
      const msg = score === total ? "Perfect! Well done." : score >= IslandQuiz.pass ? "Nice work!" : "Good try. Come back and try again.";
      const reward = (opts.onResult ? opts.onResult(score, total) : null) || { coins: 0, cards: 0 };
      this.el.sheet.innerHTML =
        `${this.head(npc.name, zone.accent)}
         <h2 class="sheet-title">${score} / ${total}</h2>
         <p class="sheet-sub">${msg}</p>
         ${reward.coins || reward.cards ? `<p class="reward-line">${reward.coins ? `+${reward.coins} coins` : ""}${reward.coins && reward.cards ? " · " : ""}${reward.cards ? `+${reward.cards} card` : ""}</p>` : opts.done && score >= IslandQuiz.pass ? '<p class="sheet-sub">You have already earned this reward.</p>' : ""}
         <button class="btn btn-primary btn-block" data-close type="button">Done</button>`;
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