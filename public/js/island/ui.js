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

    const intro = () => {
      const pr = opts.progress ? opts.progress() : null;
      const left = pr ? pr.roleTotal - pr.roleHave : 0;
      // one short line about the cards: how many of this character's cards are still to win
      const cardLine = pr && pr.roleTotal
        ? `<p class="sheet-sub intro-cards">${left > 0 ? `${left} of ${pr.roleTotal} ${this.esc(pr.label)} cards still to win` : `You have all ${pr.roleTotal} ${this.esc(pr.label)} cards`}</p>`
        : "";
      const focusLine = focus ? `<p class="sheet-note">Practising <b lang="${IslandLang.code}">${this.esc(focus)}</b>: it is in this challenge.</p>` : "";
      this.openSheet(
        `${this.head(`${npc.role || zone.name}`, zone.accent)}
         <h2 class="sheet-title">${this.esc(npc.name)}</h2>
         <p class="sheet-sub">${this.esc(npc.greeting)}</p>
         <p class="intro-rule">${total} questions. Get ${pass} right to pass.</p>
         ${cardLine}
         ${focusLine}
         <button class="btn btn-primary btn-block" id="npc-go" type="button">Let's go</button>`,
        onClose
      );
      document.getElementById("npc-go").addEventListener("click", ask);
    };

    const goNext = () => { index++; if (index < total) ask(); else finish(); };
    const nextButton = () => `<button class="btn btn-primary btn-block" id="q-next" type="button" hidden>${index + 1 < total ? "Next" : "See result"}</button>`;
    const header = (q) => `${this.head(`${npc.name} · ${index + 1} of ${total}`, zone.accent)}<p class="q-part">${partText[q.kind] || "Question"}</p>`;

    const ask = () => {
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
         <p class="sheet-sub">${this.esc(q.prompt)}</p>
         ${stem}
         <div class="q-options">${q.options.map((o) => `<button class="q-opt" type="button" ${o.lang ? `lang="${IslandLang.code}"` : ""} data-opt="${this.esc(o.value)}">${this.esc(o.label)}</button>`).join("")}</div>
         <p class="q-feedback" id="q-feedback" role="status"></p>
         ${nextButton()}`;
      if (listen) {
        const play = () => { if (!IslandQuiz.speak(q.speak)) document.getElementById("q-nosound").hidden = false; };
        document.getElementById("q-play").addEventListener("click", play);
        setTimeout(play, 250);
      }
      this.el.sheet.querySelectorAll(".q-opt").forEach((btn) => btn.addEventListener("click", () => {
        const correct = btn.dataset.opt === q.answer;
        if (correct) { score++; if (q.word) right.add(q.word); } else if (q.word) missed.add(q.word);
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
         <p class="sheet-sub">${this.esc(q.prompt)}</p>
         <div class="match-grid">
           <div class="match-col">${pairs.map((p, i) => `<button class="match-opt" type="button" data-side="w" data-i="${i}" lang="${IslandLang.code}"><b>${this.esc(p.word)}</b>${q.side === "pinyin" || !p.pinyin ? "" : `<small>${this.esc(p.pinyin)}</small>`}</button>`).join("")}</div>
           <div class="match-col">${meanings.map((m) => `<button class="match-opt" type="button" data-side="m" data-i="${m.i}">${this.esc(m.text)}</button>`).join("")}</div>
         </div>
         <p class="q-feedback" id="q-feedback" role="status">Tap a word, then its meaning.</p>
         ${nextButton()}`;
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
      const passed = score >= pass;
      this.el.sheet.innerHTML = `${this.head(npc.name, zone.accent)}<h2 class="sheet-title">${score} / ${total}</h2><p class="sheet-sub">Collecting your reward...</p>`;
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
        `${this.head(npc.name, zone.accent)}
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