// Screens for the reward system: the Daily quests card and screen, the
// level bar and the celebration pop-up.
//
// Needs rewards.js. Quests are used on the Journey page; album badges on the
// Collection (needs albums.js for buildIslandAlbums and cardArt.js for ART).

function questEscape(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- little pictures ----------
function coinSvg(size = 16) {
  return `<svg class="coin-ic" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#f2a93b"/><circle cx="12" cy="12" r="7.2" fill="#ffd166"/><path d="M12 7.5v9M9.6 10c0-1 1-1.6 2.4-1.6s2.4.6 2.4 1.6-1 1.4-2.4 1.8-2.4.8-2.4 1.8 1 1.6 2.4 1.6 2.4-.6 2.4-1.6" fill="none" stroke="#c98a14" stroke-width="1.3" stroke-linecap="round"/></svg>`;
}

// A medal with the album's picture on it.
// The album badge. `master` draws the shiny version: a silver-and-violet ring with sparkles,
// earned by collecting every card of the album (zone and role cards).
const ALBUM_MASTER_REWARD = { xp: 100, coins: 60 };

function albumBadgeSvg(album, master) {
  const art = typeof ART !== "undefined" && ART[album.art] ? ART[album.art] : "";
  if (master) {
    const id = `mb${Math.random().toString(36).slice(2, 7)}`;
    return `<svg viewBox="0 0 96 112" aria-hidden="true">
    <defs>
      <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c5cff"/><stop offset="0.5" stop-color="#2fd0c0"/><stop offset="1" stop-color="#ff8ad8"/></linearGradient>
      <linearGradient id="${id}f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e9e4ff"/></linearGradient>
    </defs>
    <path d="M30 70 L20 106 L34 98 L42 110 L52 72z" fill="#7c5cff"/>
    <path d="M66 70 L76 106 L62 98 L54 110 L44 72z" fill="#5a3fd6"/>
    <circle cx="48" cy="46" r="44" fill="url(#${id}r)"/>
    <circle cx="48" cy="46" r="37" fill="#fff"/>
    <circle cx="48" cy="46" r="33" fill="url(#${id}f)"/>
    <g transform="translate(20 18) scale(0.78)">${art}</g>
    <path d="M84 12l2.4 6.2 6.2 2.4-6.2 2.4L84 29l-2.4-6-6.2-2.4 6.2-2.4z" fill="#ffd166"/>
    <path d="M10 70l1.8 4.4 4.4 1.8-4.4 1.8L10 82.4l-1.8-4.4L3.8 76.2l4.4-1.8z" fill="#fff" stroke="#2fd0c0" stroke-width="1"/>
    <path d="M12 14l1.6 3.8 3.8 1.6-3.8 1.6L12 24.8l-1.6-3.8L6.6 19.4l3.8-1.6z" fill="#ff8ad8"/>
  </svg>`;
  }
  return `<svg viewBox="0 0 96 112" aria-hidden="true">
    <path d="M30 70 L20 106 L34 98 L42 110 L52 72z" fill="#e0463a"/>
    <path d="M66 70 L76 106 L62 98 L54 110 L44 72z" fill="#c23a30"/>
    <circle cx="48" cy="46" r="42" fill="#f2a93b"/>
    <circle cx="48" cy="46" r="36" fill="#ffd166"/>
    <circle cx="48" cy="46" r="31" fill="#fff4de"/>
    <g transform="translate(20 18) scale(0.78)">${art}</g>
  </svg>`;
}

// ---------- celebration pop-up ----------
// Used for finished quests and completed albums. Resolves when the player closes it.
function showCelebration({ title, text, badgeHtml, lines = [] }) {
  return new Promise((resolve) => {
    const previousFocus = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "cele-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "cele-title");
    const confetti = Array.from({ length: 22 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${(i % 7) * 0.18}s;--c:${["#f2a93b", "#17a596", "#e0463a", "#2f6fd6", "#8a4fd3"][i % 5]}"></i>`).join("");
    overlay.innerHTML = `
      <div class="cele-confetti" aria-hidden="true">${confetti}</div>
      <div class="cele-card">
        <div class="cele-badge">${badgeHtml || ""}</div>
        <h2 class="cele-title" id="cele-title">${questEscape(title)}</h2>
        <p class="cele-text">${questEscape(text)}</p>
        <ul class="cele-lines">${lines.map((l) => `<li>${l}</li>`).join("")}</ul>
        <button type="button" class="btn btn-primary btn-block cele-ok">Nice!</button>
      </div>`;
    document.body.appendChild(overlay);
    const ok = overlay.querySelector(".cele-ok");
    const close = () => {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      if (previousFocus && previousFocus.focus) previousFocus.focus();
      resolve();
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    ok.addEventListener("click", close);
    ok.focus();
  });
}

// ---------- level badge ----------
// A ring that fills as XP grows, with the level in the middle. The colour
// changes with the level: teal, then blue, purple and gold.
function levelTier(level) {
  if (level >= 20) return { a: "#f2a93b", b: "#e0463a", name: "Gold" };
  if (level >= 10) return { a: "#8a4fd3", b: "#c05fd0", name: "Purple" };
  if (level >= 5) return { a: "#2f6fd6", b: "#4aa3e8", name: "Blue" };
  return { a: "#17a596", b: "#3cc7a0", name: "Teal" };
}

function levelBadgeSvg(xp, size = 64) {
  const lv = levelFromXp(xp);
  const tier = levelTier(lv.level);
  const pct = lv.span > 0 ? lv.into / lv.span : 0;
  const r = 27;
  const circ = 2 * Math.PI * r;
  const id = `lg${Math.random().toString(36).slice(2, 7)}`;
  const digits = String(lv.level).length;
  const fontSize = digits >= 3 ? 20 : digits === 2 ? 26 : 32;
  return `<svg class="lvl-ring" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="Level ${lv.level}, ${lv.into} of ${lv.span} XP">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${tier.a}"/><stop offset="1" stop-color="${tier.b}"/></linearGradient></defs>
    <circle cx="32" cy="32" r="${r}" fill="#fff" stroke="#e3e8ef" stroke-width="5"/>
    <circle cx="32" cy="32" r="${r}" fill="none" stroke="url(#${id})" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(circ * pct).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 32 32)"/>
    <circle cx="32" cy="32" r="20" fill="url(#${id})"/>
    <text x="32" y="${32 + fontSize * 0.36}" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="800" font-size="${fontSize * 0.78}" fill="#fff">${lv.level}</text>
  </svg>`;
}

// The level badge in the top bar is already in the page's HTML (css/shared/topbar.css colours it);
// this only sets the level number, the ring's fill and the colour tier.
function updateLevelChip(chip, xp) {
  const lv = levelFromXp(xp);
  const pct = lv.span > 0 ? lv.into / lv.span : 0;
  const circ = 2 * Math.PI * 27;
  const digits = String(lv.level).length;
  const fontSize = digits >= 3 ? 20 : digits === 2 ? 26 : 32;
  chip.classList.remove("tier-teal", "tier-blue", "tier-purple", "tier-gold");
  chip.classList.add(`tier-${levelTier(lv.level).name.toLowerCase()}`);
  const svg = chip.querySelector(".lvl-ring");
  if (!svg) return; // a page whose chip is not in the shared markup (the old Journey page)
  svg.setAttribute("aria-label", `Level ${lv.level}, ${lv.into} of ${lv.span} XP`);
  chip.querySelector("#level-arc").setAttribute("stroke-dasharray", `${(circ * pct).toFixed(1)} ${circ.toFixed(1)}`);
  const num = chip.querySelector("#level-num");
  num.textContent = String(lv.level);
  num.setAttribute("y", String(32 + fontSize * 0.36));
  num.setAttribute("font-size", String(fontSize * 0.78));
}

// Gives a badge, coins and XP for every island album whose ZONE cards are all collected, and a shiny
// Master badge (with a smaller bonus) when the role cards are all collected too. Each is paid once.
// Safe to call every time the Collection loads.
let albumBadgeCheckBusy = false;

async function checkAlbumBadges(userId, albumRows, language) {
  if (albumBadgeCheckBusy) return;
  albumBadgeCheckBusy = true;
  try {
    const finished = buildIslandAlbums(albumRows, language).filter((a) => a.complete);
    if (finished.length === 0) return;
    const have = new Set((await getBadges(userId)).map((b) => b.badge_id));
    for (const album of finished) {
      const steps = [
        { id: `album:${album.id}:${language}`, due: true, master: false, reward: ALBUM_COMPLETE_REWARD,
          title: "Album complete!", text: `You collected every zone card in the ${album.name} album.`, extra: "New badge for your profile" },
        { id: `album-master:${album.id}:${language}`, due: album.master, master: true, reward: ALBUM_MASTER_REWARD,
          title: "Master collector!", text: `You collected every card in the ${album.name} album, role cards too.`, extra: "New shiny badge for your profile" },
      ];
      for (const step of steps) {
        if (!step.due || have.has(step.id)) continue;
        const { isNew } = await awardBadge(userId, step.id);
        if (!isNew) continue;
        const reward = await grantRewards(userId, step.reward);
        const lines = [`+${step.reward.xp} XP`, `+${step.reward.coins} ${coinSvg(14)} coins`, step.extra];
        if (reward.levelUps > 0) lines.push(`Level up! You are now level ${reward.level} (+${reward.levelUps * LEVEL_UP_COINS} bonus coins)`);
        await showCelebration({ title: step.title, text: step.text, badgeHtml: albumBadgeSvg(album, step.master), lines });
      }
    }
  } catch (err) {
    console.error("Could not check album rewards (are the rewards tables created?):", err);
  } finally {
    albumBadgeCheckBusy = false;
  }
}

// ---------- Daily quests panel (Journey page) ----------
// Shows the player's level, coins and today's quests. Claim buttons carry data-claim; the header toggles collapse.
function renderQuestsPanel(el, quests, stats, collapsed = false) {
  const real = quests.filter((qt) => !qt.soon);
  const doneCount = real.filter((qt) => qt.done).length;
  const ready = real.some((qt) => qt.done && !qt.claimed);
  const lv = levelFromXp(stats.xp);
  const pct = Math.round((lv.into / lv.span) * 100);

  const rows = real
    .map((qt) => {
      const qpct = Math.round((qt.progress / qt.target) * 100);
      let action;
      if (qt.claimed) action = '<span class="qp-state is-claimed">Claimed</span>';
      else if (qt.done) action = `<button type="button" class="btn btn-primary btn-sm" data-claim="${qt.id}">Claim</button>`;
      else action = `<span class="qp-state">${qt.progress} / ${qt.target}</span>`;
      return `
      <li class="qp-row${qt.claimed ? " is-claimed" : ""}">
        <div class="qp-main">
          <div class="qp-line"><strong class="qp-name">${questEscape(qt.title)}</strong><span class="qp-reward">+${qt.xp} XP · +${qt.coins}${coinSvg(12)}</span></div>
          <span class="qp-bar"><i style="width:${qpct}%"></i></span>
        </div>
        <div class="qp-action">${action}</div>
      </li>`;
    })
    .join("");

  el.classList.toggle("has-ready", ready);
  el.classList.toggle("is-collapsed", collapsed);
  el.innerHTML = `
    <button type="button" class="qp-head" data-qp-toggle aria-expanded="${!collapsed}">
      <span class="qp-badge">${levelBadgeSvg(stats.xp, 40)}</span>
      <span class="qp-head-text">
        <strong>Daily quests</strong>
        <span>${ready ? "Reward ready to claim!" : `Level ${lv.level} · ${lv.into} / ${lv.span} XP`}</span>
      </span>
      <span class="qp-count">${doneCount}/${real.length}</span>
    </button>
    <div class="qp-body">
      <span class="qp-xpbar" aria-hidden="true"><i style="width:${pct}%"></i></span>
      <ul class="qp-list">${rows}</ul>
      <p class="qp-foot">Quests reset every day. They are a bonus for extra XP and coins.</p>
    </div>`;
}

// ---------- Journey page wiring ----------
// A level badge in the top bar and the quests panel under it. Collapsed by
// default (just the header); the player's choice is remembered.
function setupJourneyQuests(getUserId) {
  const chip = document.getElementById("level-chip");
  const panel = document.getElementById("journey-quests");
  if (!panel) return;
  let collapsed = true;
  try {
    const saved = localStorage.getItem("questsCollapsed");
    if (saved !== null) collapsed = saved === "1";
  } catch (err) { /* storage blocked: stays collapsed */ }
  let latest = null;

  function draw() {
    if (!latest) return;
    renderQuestsPanel(panel, latest.quests, latest.stats, collapsed);
    panel.hidden = false;
    if (chip) {
      updateLevelChip(chip, latest.stats.xp);
      chip.setAttribute("aria-label", `Level ${levelFromXp(latest.stats.xp).level}. Show daily quests`);
      chip.hidden = false;
    }
    const coinChip = document.getElementById("coin-chip");
    if (coinChip) {
      coinChip.innerHTML = `${coinSvg(20)}<span class="coin-num">${latest.stats.coins}</span>`;
      coinChip.setAttribute("aria-label", `${latest.stats.coins} coins`);
      coinChip.hidden = false;
    }
  }

  async function load() {
    const userId = getUserId();
    if (!userId) return;
    try {
      const [quests, stats] = await Promise.all([getTodayQuests(userId), getPlayerStats(userId)]);
      if (!stats.available) return;
      latest = { quests, stats };
      draw();
    } catch (err) {
      console.error("Could not load quests (is database/rewards.sql run?):", err);
    }
  }

  function toggle(open) {
    collapsed = open === undefined ? !collapsed : !open;
    try { localStorage.setItem("questsCollapsed", collapsed ? "1" : "0"); } catch (err) { /* ignore */ }
    draw();
  }

  if (chip) {
    chip.addEventListener("click", () => {
      toggle(true);
      panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  panel.addEventListener("click", async (e) => {
    if (e.target.closest("[data-qp-toggle]")) return toggle();
    const button = e.target.closest("[data-claim]");
    if (!button || button.disabled) return;
    button.disabled = true;
    const userId = getUserId();
    try {
      const reward = await claimQuest(userId, button.dataset.claim);
      const quest = QUEST_DEFS.find((qt) => qt.id === button.dataset.claim);
      const lines = [`+${quest.xp} XP`, `+${quest.coins} ${coinSvg(14)} coins`];
      if (reward.levelUps > 0) lines.push(`Level up! You are now level ${reward.level} (+${reward.levelUps * LEVEL_UP_COINS} bonus coins)`);
      await showCelebration({ title: "Quest complete!", text: quest.title, badgeHtml: coinSvg(96), lines });
    } catch (err) {
      console.error("Could not claim that quest:", err);
      if (typeof showToast === "function") showToast("Could not claim that reward. Try again.");
    }
    load();
  });

  window.addEventListener("pageshow", load);
  return { refresh: load };
}

// Called once the player is known.
let journeyQuests = null;
function refreshJourneyRewards(getUserId) {
  if (!journeyQuests) journeyQuests = setupJourneyQuests(getUserId);
  if (journeyQuests) journeyQuests.refresh();
}