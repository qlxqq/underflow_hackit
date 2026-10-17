// Profile page: picture, level, badges and favourite cards. Three views in
// one page: the profile, Choose a picture, and Choose favourite cards.
// Anyone who is not logged in is sent to the Journey page to log in.

const $ = (id) => document.getElementById(id);

const JOURNEY_PAGE = "../auth/login.html"; 
const MAX_FAVOURITES = 3;
const MAX_PICK_LIST = 80; // keeps the picker light; search finds the rest
const RARITY_COLORS = { common: "#8a97ab", uncommon: "#3aa675", rare: "#2f6fd6", epic: "#8a4fd3", legendary: "#f2a93b" };
const RARITY_RANK = { legendary: 4, epic: 3, rare: 2, uncommon: 1, common: 0 };

const appSection = $("app-section");
const views = { profile: $("profile-view"), avatar: $("avatar-view"), favs: $("favs-view") };
const statusMessage = $("status-message");

let currentUser = null;
let profile = null;
let stats = { xp: 0, coins: 0, available: false };
let language = "zh";
let entries = []; // every card the player owns in this language
let entryMap = new Map(); // "v:<id>" (captured) or "a:<id>" (island) -> card
let favKeys = [];
let favsAvailable = true;
let earnedBadges = new Set();
let pending = []; // favourites being picked
let statusTimer = null;

// ---- helpers ----
function showStatus(message, type = "info") {
  clearTimeout(statusTimer);
  statusMessage.textContent = message;
  statusMessage.className = `status-message status-${type}`;
  statusTimer = setTimeout(() => {
    statusMessage.textContent = "";
    statusMessage.className = "status-message";
  }, 5000);
}

function showView(name) {
  Object.entries(views).forEach(([key, el]) => (el.hidden = key !== name));
  window.scrollTo(0, 0);
}

function getMotherTongue(userId) {
  try {
    const code = localStorage.getItem(`journeyLanguage:${userId}`);
    if (code && LANGUAGE_NAMES[code]) return code;
  } catch (err) {
    // storage blocked: fall back to Chinese
  }
  return "zh";
}

// ---- loading ----
async function loadAll() {
  language = getMotherTongue(currentUser.id);

  // Everything is asked for at the same time, instead of one request after another.
  // A failure in one of these only loses that one part of the page.
  const tryTo = async (fn, fallback, message) => {
    try {
      return await fn();
    } catch (err) {
      console.error(message, err);
      return fallback;
    }
  };
  const [loadedProfile, loadedStats, badgeRows, capturedRows, albumRowsLoaded, fav] = await Promise.all([
    tryTo(() => loadProfile(currentUser.id), null, "Could not load profile:")
      .then((loaded) => (loaded ? recordDailyVisit(currentUser.id, loaded).catch(() => loaded) : null)),
    getPlayerStats(currentUser.id).catch(() => ({ xp: 0, coins: 0, available: false })),
    tryTo(() => getBadges(currentUser.id), null, "Could not load badges (is database/badges.sql run?):"),
    tryTo(() => getAllVocabulary(currentUser.id, language), [], "Could not load cards:"),
    tryTo(() => getAlbumCards(currentUser.id, language), [], "Could not load island cards:"),
    tryTo(() => supabase.from("profiles").select("favourite_cards").eq("user_id", currentUser.id).maybeSingle(), { error: new Error("not loaded") }, "Could not load favourite cards:"),
  ]);
  profile = loadedProfile;
  stats = loadedStats;
  earnedBadges = badgeRows ? new Set(badgeRows.map((b) => b.badge_id)) : new Set();

  const captured = capturedRows || [];
  const albumRows = albumRowsLoaded || [];
  entryMap = new Map();
  captured.forEach((row) => entryMap.set(`v:${row.vocab_id}`, row));
  buildIslandAlbums(albumRows, language).forEach((album) =>
    album.slots.filter((s) => s.row).forEach((slot) => entryMap.set(`a:${slot.row.card_id}`, albumCardEntry(album, slot, language))),
  );
  entries = [...entryMap.entries()].map(([key, entry]) => ({ key, entry }));

  if (fav.error) {
    console.error("Could not load favourite cards (is database/profile.sql run?):", fav.error);
    favsAvailable = false;
    favKeys = [];
  } else {
    favsAvailable = true;
    favKeys = Array.isArray(fav.data && fav.data.favourite_cards) ? fav.data.favourite_cards.filter((k) => typeof k === "string").slice(0, MAX_FAVOURITES) : [];
  }
}

// ---- profile view ----
function miniCardHtml(entry) {
  const rarity = RARITY_COLORS[entry.rarity] ? entry.rarity : "common";
  const stage = Math.min(Math.max(entry.evolution_stage || 0, 0), 2);
  const long = [...String(entry.word)].length > 5 ? " long" : "";
  return `
    <div class="pf-card${stage >= 2 ? " is-mastered" : ""}" style="--rc:${RARITY_COLORS[rarity]}">
      <div class="pf-card-art">${getCardArt(entry, stage)}</div>
      <div class="pf-card-word${long}">${escapeHtml(entry.word)}</div>
      <div class="pf-card-sub">${escapeHtml(entry.romanization || "")}</div>
      <div class="pf-card-rar">${RARITY_LABELS[rarity]}</div>
    </div>`;
}

function renderHero() {
  $("pf-avatar").innerHTML = avatarSvg(profile ? profile.avatar : DEFAULT_AVATAR, 100);
  $("pf-name").textContent = profile && profile.username ? profile.username : "Your profile";
}

function renderStats() {
  const lv = levelFromXp(stats.xp);
  const streak = profile && profile.hasExtras ? profile.currentStreak : 0;
  $("pf-stats").innerHTML = `
    <div class="pf-stat">
      <div class="pf-stat-top">${levelBadgeSvg(stats.xp, 46)}</div>
      <strong>${stats.xp} XP</strong>
      <span>Level</span>
    </div>
    <div class="pf-stat">
      <div class="pf-stat-top">${coinSvg(34)}</div>
      <strong>${stats.coins}</strong>
      <span>Coins</span>
    </div>
    <div class="pf-stat">
      <div class="pf-stat-top">${flameSvg(streak > 0, 34)}</div>
      <strong>${streak}</strong>
      <span>Day streak</span>
    </div>
    <div class="pf-xp" style="grid-column: 1 / -1">
      <span class="pf-xp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${lv.span}" aria-valuenow="${lv.into}"><i style="width:${Math.round((lv.into / lv.span) * 100)}%"></i></span>
      <p class="pf-xp-text">${lv.into} / ${lv.span} XP to level ${lv.level + 1}</p>
    </div>`;
}

function renderBadges() {
  const albums = buildIslandAlbums([], language);
  const earned = albums.filter((a) => earnedBadges.has(`album:${a.id}:${language}`));
  $("pf-badge-count").textContent = `${LANGUAGE_NAMES[language]} · ${earned.length} of ${albums.length}`;
  const html = albums
    .map((album) => {
      const got = earnedBadges.has(`album:${album.id}:${language}`);
      return `<div class="pf-badge${got ? "" : " is-locked"}" title="${escapeHtml(album.name)}${got ? "" : " (not earned yet)"}">${albumBadgeSvg(album, earnedBadges.has(`album-master:${album.id}:${language}`))}<span>${escapeHtml(album.name)}</span></div>`;
    })
    .join("");
  $("pf-badges").innerHTML =
    (earned.length === 0 ? '<p class="pf-empty">Complete an island album to earn your first badge.</p>' : "") + html;
}

function renderFavs() {
  const box = $("pf-favs");
  $("pf-edit-favs").hidden = entries.length === 0 || !favsAvailable;
  if (!favsAvailable) {
    box.innerHTML = '<p class="pf-empty">Favourite cards are not set up yet. Run database/profile.sql in Supabase.</p>';
    return;
  }
  if (entries.length === 0) {
    box.innerHTML = '<p class="pf-empty">Capture some words and your cards will appear here to pick from.</p>';
    return;
  }
  const slots = [];
  for (let i = 0; i < MAX_FAVOURITES; i++) {
    const entry = favKeys[i] ? entryMap.get(favKeys[i]) : null;
    slots.push(
      entry
        ? `<button type="button" class="pf-card-btn" data-open-favs aria-label="Change favourite cards. ${escapeHtml(entry.word)}">${miniCardHtml(entry)}</button>`
        : `<button type="button" class="pf-slot-empty" data-open-favs><span><b>+</b>Add a card</span></button>`,
    );
  }
  box.innerHTML = slots.join("");
}

function renderProfile() {
  renderHero();
  renderStats();
  renderBadges();
  renderFavs();
}

// ---- choose a picture ----
function renderAvatarView() {
  const current = profile ? profile.avatar : DEFAULT_AVATAR;
  $("av-preview").innerHTML = `<div>${avatarSvg(current, 120)}</div>`;
  $("av-grid").innerHTML = AVATARS.map(
    (a) => `<button type="button" class="av-option" role="radio" aria-checked="${a.id === current}" aria-label="${a.label}" data-avatar="${a.id}"><span>${avatarSvg(a.id, 80)}</span><span class="av-check" aria-hidden="true">&#10003;</span></button>`,
  ).join("");
}

function openAvatarView() {
  renderAvatarView();
  showView("avatar");
}

$("av-grid").addEventListener("click", async (e) => {
  const option = e.target.closest("[data-avatar]");
  if (!option || !profile) return;
  const chosen = option.dataset.avatar;
  const previous = profile.avatar;
  if (chosen === previous) return;
  profile.avatar = chosen; // show it straight away; put the old one back if saving fails
  renderAvatarView();
  try {
    await saveAvatar(currentUser.id, chosen);
  } catch (err) {
    console.error("Could not save picture:", err);
    profile.avatar = previous;
    renderAvatarView();
    showStatus("Couldn't save your picture. Try again.", "error");
  }
});

// ---- choose favourite cards ----
// The cards already chosen, always at the top with a Remove button, so a
// card never has to be found in the long list again to take it off.
function renderChosen() {
  const box = $("favs-chosen");
  if (pending.length === 0) {
    box.innerHTML = "";
    return;
  }
  box.innerHTML = `
    <h3 class="fv-chosen-title">Chosen (${pending.length} / ${MAX_FAVOURITES})</h3>
    <div class="fv-chosen-row">
      ${pending
        .map((key) => {
          const entry = entryMap.get(key);
          return entry ? `<div class="fv-chosen-item">${miniCardHtml(entry)}<button type="button" class="fv-remove" data-remove="${key}" aria-label="Remove ${escapeHtml(entry.word)} from favourites">Remove</button></div>` : "";
        })
        .join("")}
    </div>`;
}

function renderPicker() {
  renderChosen();
  const term = searchKey($("favs-search").value);
  const matching = entries
    .filter(({ entry }) => !term || [entry.word, entry.romanization, entry.english_meaning].some((v) => searchKey(v).includes(term)))
    .sort((a, b) => (RARITY_RANK[b.entry.rarity] || 0) - (RARITY_RANK[a.entry.rarity] || 0) || new Date(b.entry.created_at) - new Date(a.entry.created_at));
  const shown = matching.slice(0, MAX_PICK_LIST);
  const full = pending.length >= MAX_FAVOURITES;
  $("favs-grid").innerHTML =
    shown.length === 0
      ? '<p class="pf-empty">No cards found.</p>'
      : shown
          .map(({ key, entry }) => {
            const on = pending.includes(key);
            return `<button type="button" class="fv-pick" data-key="${key}" aria-pressed="${on}" ${!on && full ? "disabled" : ""}><span class="fv-tick" aria-hidden="true">&#10003;</span>${miniCardHtml(entry)}</button>`;
          })
          .join("") + (matching.length > shown.length ? `<p class="pf-empty" style="grid-column:1/-1">Showing the first ${MAX_PICK_LIST}. Search to find others.</p>` : "");
  $("favs-save").textContent = `Save (${pending.length} / ${MAX_FAVOURITES})`;
}

function openFavsView() {
  pending = favKeys.filter((k) => entryMap.has(k));
  $("favs-search").value = "";
  renderPicker();
  showView("favs");
}

$("favs-chosen").addEventListener("click", (e) => {
  const remove = e.target.closest("[data-remove]");
  if (!remove) return;
  pending = pending.filter((k) => k !== remove.dataset.remove);
  renderPicker();
});

$("favs-grid").addEventListener("click", (e) => {
  const pick = e.target.closest("[data-key]");
  if (!pick || pick.disabled) return;
  const key = pick.dataset.key;
  pending = pending.includes(key) ? pending.filter((k) => k !== key) : pending.length < MAX_FAVOURITES ? [...pending, key] : pending;
  renderPicker();
});
$("favs-search").addEventListener("input", renderPicker);

$("favs-save").addEventListener("click", async () => {
  const button = $("favs-save");
  button.disabled = true;
  const { error } = await supabase.from("profiles").update({ favourite_cards: pending }).eq("user_id", currentUser.id);
  button.disabled = false;
  if (error) {
    console.error("Could not save favourite cards:", error);
    showView("profile");
    showStatus("Couldn't save your favourite cards. Try again.", "error");
    return;
  }
  favKeys = [...pending];
  renderFavs();
  showView("profile");
});

// ---- wiring ----
$("pf-avatar-btn").addEventListener("click", openAvatarView);
$("pf-change-pic").addEventListener("click", openAvatarView);
$("avatar-back").addEventListener("click", () => {
  renderHero();
  showView("profile");
});
$("avatar-done").addEventListener("click", () => {
  renderHero();
  showView("profile");
});
$("pf-edit-favs").addEventListener("click", openFavsView);
$("pf-favs").addEventListener("click", (e) => {
  if (e.target.closest("[data-open-favs]")) openFavsView();
});
$("favs-back").addEventListener("click", () => showView("profile"));
$("pf-signout").addEventListener("click", async () => {
  try {
    await signOut();
  } catch (err) {
    console.error("Sign out failed:", err);
  }
  location.href = JOURNEY_PAGE;
});

async function enterApp() {
  currentUser = await getCurrentUser();
  if (!currentUser) {
    location.replace(JOURNEY_PAGE);
    return;
  }
  appSection.hidden = false;
  showView("profile");
  try {
    await loadAll();
  } catch (err) {
    console.error("Could not load the profile page:", err);
    showStatus("Could not load everything. Check your connection and try again.", "error");
  }
  renderProfile();
}

$("pf-edit-icon").innerHTML = icon("pen", 15);
renderBottomNav();
enterApp();