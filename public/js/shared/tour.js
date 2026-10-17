// Guided tour of the whole app, shared by the Journey and Capture pages.
//
// The tour runs Journey -> Capture -> Collection, across both pages.
// - A first-time user is asked "Want a quick tour?" on the Journey page.
//   Yes starts the tour; No thanks ends it. Either answer is remembered
//   (on the account, and in this browser) so it is never asked again.
// - "Skip tour" ends it at any step.
// - The "?" button in the top bar of the Journey, Capture and Collection
//   pages explains only the page the user is on, then closes. The tour
//   through every page is for first-time users only.
//
// Needs: supabase (supabaseClient.js) and getCurrentUser (auth.js).
// It starts itself - no other file needs to call it.

(function () {
  const DONE_KEY = "tour_done_";
  const CONTINUE_KEY = "tour_continue";
  const CAPTURE_PAGE = "../storeVocab/storeVocab.html#capture";

  const STEPS = {
    journey: [
      { target: "#change-language", title: "Your Mother Tongue", text: "This is the language you are practising. Tap it to switch between Chinese, Malay and Tamil." },
      { target: "#streak-chip", title: "Your streak", text: "Practise every day to keep your streak going." },
      { target: "#level-chip", title: "Your level", text: "The ring shows your level and XP. Tap it to drop down today's quests. A yellow ! on it means a reward is waiting for you." },
      { target: "#journey-quests", title: "Daily quests", text: "Small goals that reset every day, like capturing 3 words. Press Claim when one is done to earn XP and coins.", before: openQuests, after: closeQuests },
      { target: "#island-coins", title: "Your coins", text: "You earn coins by finishing mini-game levels and passing challenges on the island. Spend them at the Island Shop." },
      { target: "#map", title: "Your home island", text: "This is your home island. Walk around to explore. The Island Shop sells fun buildings and decorations, and the boat at the jetty takes you to the Mystery Island." },
      { target: "island:#joystick", title: "Move around", text: "Drag the joystick to walk (or use the arrow keys). When you stand next to something, a button appears to use it." },
      { target: "island:#map-btn", title: "Island map", text: "Shows where the shop and the boat are. Tap a place on it and an arrow points you the way." },
      { target: "island:#avatar-btn", title: "Your character", text: "Choose a boy or girl character and an outfit colour." },
      { target: "#map", title: "The Mystery Island", text: "Take the boat to get there. Play the mini-game levels in any order, and talk to the people marked ? on its map to win cards. A boat button there brings you straight back home." },
      { target: ".nav-capture", title: "Capture words", text: "Snap a sign, a menu or a textbook page. Every word it finds can become a collectible card. This is the heart of the app." },
      { target: '[data-nav="collection"]', title: "Your collection", text: "All your cards live here. Practise a word to make its card evolve." },
      { target: "#open-profile", title: "Your profile", text: "Tap your picture to see your level, badges and favourite cards, change your picture, or sign out." },
      { target: ".tour-help", title: "App guide", text: "Tap the ? at the top of any page for a short guide to that page." },
    ],
    capture: [
      { target: ".photo-tile", title: "Take a photo", text: "Point your camera at a sign, menu or page. The words on it are read for you." },
      { target: ".tips-card", title: "Tips for good photos", text: "One paragraph at a time, good light, no glare. A very busy page may be cut off." },
      { target: ".text-card", title: "Or type it in", text: "No camera handy? Type or paste any text and tap Find words." },
      { target: '[data-nav="collection"]', title: "Then collect", text: "Pick the words you want, and they appear as cards in your collection." },
    ],
    collection: [
      { target: "#collection-stats", title: "Your progress", text: "See how many words you have, how many are Mastered, and how many you added this week." },
      { target: "#album-view", title: "Your albums", text: "Captured Words holds every word you capture, sorted into categories for you, with a filter and search. Island albums are filled by winning cards in mini-games on the island. Practising a card levels it up: Caught, Trained, then Mastered with a rainbow foil border." },
    ],
  };

  let layer = null;
  let session = null; // { page, steps, index, active }

  // Opens / closes the daily-quests drop-down for the step that explains it.
  function openQuests() {
    const panel = document.querySelector("#journey-quests"), chip = document.querySelector("#level-chip");
    if (panel && chip && panel.classList.contains("is-collapsed")) chip.click();
  }
  function closeQuests() {
    const panel = document.querySelector("#journey-quests");
    const head = panel && panel.querySelector("[data-qp-toggle]");
    if (head && !panel.classList.contains("is-collapsed")) head.click();
  }

  // ---------- helpers ----------
  // "island:#id" points at something inside the island (it runs in a frame).
  function islandDoc() {
    const f = document.getElementById("island-frame");
    try { return f && f.contentDocument; } catch (err) { return null; }
  }
  const q = (sel) => {
    if (sel.indexOf("island:") === 0) { const d = islandDoc(); return d ? d.querySelector(sel.slice(7)) : null; }
    return document.querySelector(sel);
  };
  // Position of an element on this page, including elements inside the island frame.
  function rectOf(node) {
    const r = node.getBoundingClientRect();
    if (node.ownerDocument === document) return r;
    const f = document.getElementById("island-frame").getBoundingClientRect();
    return { top: r.top + f.top, left: r.left + f.left, width: r.width, height: r.height, bottom: r.bottom + f.top, right: r.right + f.left };
  }

  function isVisible(el) {
    return !!el && el.getClientRects().length > 0 && !el.closest("[hidden]");
  }

  async function getUser() {
    try {
      return await getCurrentUser();
    } catch (err) {
      return null;
    }
  }

  function isDone(user) {
    if (user && user.user_metadata && user.user_metadata.tour_done) return true;
    try {
      return localStorage.getItem(DONE_KEY + user.id) === "1";
    } catch (err) {
      return false;
    }
  }

  async function markDone(user) {
    try { localStorage.setItem(DONE_KEY + user.id, "1"); } catch (err) { /* private mode */ }
    try { await supabase.auth.updateUser({ data: { tour_done: true } }); } catch (err) { /* local flag still works */ }
  }

  function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function removeLayer() {
    if (layer) layer.remove();
    layer = null;
    window.removeEventListener("resize", place);
    window.removeEventListener("scroll", place, true);
    document.removeEventListener("keydown", onKey);
  }

  function onKey(e) {
    if (e.key === "Escape") endTour();
  }

  // ---------- welcome pop-up ----------
  function showWelcome(user) {
    removeLayer();
    layer = el("div", "tour-layer");
    layer.appendChild(el("div", "tour-dim"));
    const card = el("div", "tour-modal-card");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-labelledby", "tour-welcome-title");
    card.innerHTML = `
      <h2 class="tour-title" id="tour-welcome-title">Want a quick tour?</h2>
      <p class="tour-text">See what each part of the app does. It takes about a minute, and you can skip it at any time.</p>
      <div class="tour-actions">
        <button type="button" class="tour-btn" data-yes>Show me around</button>
        <button type="button" class="tour-link" data-no>No thanks</button>
      </div>`;
    layer.appendChild(card);
    document.body.appendChild(layer);
    document.addEventListener("keydown", onKey);

    card.querySelector("[data-yes]").addEventListener("click", () => {
      markDone(user);
      startTour("journey");
    });
    card.querySelector("[data-no]").addEventListener("click", () => {
      markDone(user);
      removeLayer();
    });
    card.querySelector("[data-yes]").focus();
  }

  // ---------- tour steps ----------
  // single = true: just this page (the "?" button); the tour does not move on.
  function startTour(page, { single = false } = {}) {
    removeLayer();
    const steps = STEPS[page].filter((s) => s.before || isVisible(q(s.target)));
    if (steps.length === 0) return;
    session = { page, steps, index: 0, single };

    layer = el("div", "tour-layer");
    layer.appendChild(el("div", "tour-shield"));
    layer.appendChild(el("div", "tour-spot"));
    layer.appendChild(el("div", "tour-card"));
    document.body.appendChild(layer);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("keydown", onKey);
    showStep(0);
  }

  // A step may open something first (the quests drop-down) and close it when we move on.
  function leaveStep() {
    if (session && session.active && session.active.after) { try { session.active.after(); } catch (err) { /* ignore */ } }
    if (session) session.active = null;
  }

  function showStep(index) {
    leaveStep();
    session.index = index;
    const step = session.steps[index];
    if (step.before) {
      try { step.before(); } catch (err) { /* ignore */ }
      session.active = step;
      setTimeout(() => { if (session && session.index === index) renderStep(index); }, 350);
      return;
    }
    renderStep(index);
  }

  function renderStep(index) {
    const step = session.steps[index];
    const target = q(step.target);
    if (!isVisible(target)) return next();

    const last = index === session.steps.length - 1;
    const nextLabel = session.single ? "Done" : { journey: "Next: Capture", capture: "Next: Collection", collection: "Done" }[session.page];
    const primary = last ? nextLabel : "Next";
    const skipLabel = session.single ? "Close" : last && session.page !== "collection" ? "Finish" : "Skip tour";

    const card = layer.querySelector(".tour-card");
    card.setAttribute("role", "dialog");
    card.innerHTML = `
      <div class="tour-step-count">${index + 1} of ${session.steps.length}</div>
      <h2 class="tour-title">${step.title}</h2>
      <p class="tour-text">${step.text}</p>
      <div class="tour-actions">
        <button type="button" class="tour-link" data-skip>${skipLabel}</button>
        <div class="tour-buttons">
          ${index > 0 ? '<button type="button" class="tour-btn secondary" data-back>Back</button>' : ""}
          <button type="button" class="tour-btn" data-next>${primary}</button>
        </div>
      </div>`;

    card.querySelector("[data-skip]").addEventListener("click", endTour);
    const back = card.querySelector("[data-back]");
    if (back) back.addEventListener("click", () => showStep(index - 1));
    card.querySelector("[data-next]").addEventListener("click", () => {
      if (!last) return showStep(index + 1);
      if (session.single) return endTour();
      if (session.page === "journey") {
        try { sessionStorage.setItem(CONTINUE_KEY, "capture"); } catch (err) { /* then the tour just ends */ }
        removeLayer();
        location.href = CAPTURE_PAGE;
      } else if (session.page === "capture") {
        // Switch to the Collection view the same way the nav does, then go on.
        const nav = q('[data-nav="collection"]');
        endTour();
        if (nav) {
          nav.click();
          setTimeout(() => startTour("collection"), 700);
        }
      } else {
        endTour();
      }
    });

    if (target.ownerDocument === document) target.scrollIntoView({ block: "center", behavior: "auto" });
    requestAnimationFrame(() => {
      place();
      card.querySelector("[data-next]").focus({ preventScroll: true });
    });
  }

  function next() {
    if (!session) return;
    if (session.index + 1 < session.steps.length) showStep(session.index + 1);
    else endTour();
  }

  function endTour() {
    leaveStep();
    removeLayer();
    session = null;
  }

  // Puts the spotlight over the target and the card above or below it.
  function place() {
    if (!layer || !session) return;
    const step = session.steps[session.index];
    const target = q(step.target);
    const spot = layer.querySelector(".tour-spot");
    const card = layer.querySelector(".tour-card");
    if (!target || !spot || !card) return;

    const r = rectOf(target);
    const pad = 6;
    spot.style.top = r.top - pad + "px";
    spot.style.left = r.left - pad + "px";
    spot.style.width = r.width + pad * 2 + "px";
    spot.style.height = r.height + pad * 2 + "px";

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const gap = 14;
    let top;
    if (r.height > vh * 0.55) top = vh - ch - 96; // a big area: card sits at the bottom
    else if (vh - r.bottom >= ch + gap + 8) top = r.bottom + gap;
    else if (r.top >= ch + gap + 8) top = r.top - ch - gap;
    else top = vh - ch - 96;
    const left = Math.min(Math.max(r.left + r.width / 2 - cw / 2, 12), vw - cw - 12);
    card.style.top = Math.max(8, top) + "px";
    card.style.left = left + "px";
  }

  // ---------- start-up ----------
  function whenShown(node, callback) {
    if (!node) return;
    if (!node.hidden) return callback();
    const observer = new MutationObserver(() => {
      if (!node.hidden) {
        observer.disconnect();
        callback();
      }
    });
    observer.observe(node, { attributes: true, attributeFilter: ["hidden"] });
  }

  // "?" button in the top bar of the Journey, Capture and Collection pages.
  // It sits just before whatever is already on the right of the bar.
  const HELP_BARS = [
    { page: "journey", bar: "#journey-section .top-bar", trailing: "#open-profile" },
    { page: "capture", bar: "#capture-view .top-bar", trailing: ".lang-select" },
    { page: "collection", bar: "#collection-view .top-bar", trailing: "#sign-out" },
  ];

  function addHelpButtons() {
    HELP_BARS.forEach(({ page, bar: barSelector, trailing: trailingSelector }) => {
      const bar = q(barSelector);
      if (!bar || bar.querySelector(".tour-help")) return;
      const trailing = bar.querySelector(trailingSelector);
      const wrap = el("div", "tour-top-actions");
      const button = el("button", "tour-help", "?");
      button.type = "button";
      button.setAttribute("aria-label", "Guide for this page");
      button.title = "Guide for this page";
      button.addEventListener("click", () => startTour(page, { single: true }));
      wrap.appendChild(button);
      if (trailing) wrap.appendChild(trailing);
      bar.appendChild(wrap);
    });
  }

  async function onJourneyReady() {
    const user = await getUser();
    if (!user) return;
    addHelpButtons();

    if (isDone(user)) return;
    setTimeout(() => showWelcome(user), 900);
  }

  function onCaptureReady() {
    addHelpButtons();
    let carryOn = false;
    try {
      carryOn = sessionStorage.getItem(CONTINUE_KEY) === "capture";
      sessionStorage.removeItem(CONTINUE_KEY);
    } catch (err) { /* ignore */ }
    if (!carryOn) return;
    const view = q("#capture-view");
    whenShown(view, () => setTimeout(() => startTour("capture"), 700));
  }

  function init() {
    const journey = q("#journey-section");
    const app = q("#app-section");
    if (journey) whenShown(journey, onJourneyReady);
    else if (app) whenShown(app, onCaptureReady);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();