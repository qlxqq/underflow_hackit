// The island page: the Mother Tongue choice, the top bar (language, streak,
// level + daily quests, coins, profile) and the island itself. This page replaces
// the old Journey page; nothing here depends on the MRT map files.
// Log in and sign up live on their own page (pages/auth/login.html, js/auth/login.js):
// a player who is not signed in is sent there.

const $ = (id) => document.getElementById(id);

const languageSection = $("language-select-section");
const journeySection = $("journey-section");
const changeLanguageButton = $("change-language");
const mapEl = $("map");
const statusMessage = $("status-message");
const streakChip = $("streak-chip");
const openProfileButton = $("open-profile");
const questsPanel = $("journey-quests");
const levelChip = $("level-chip");
const coinsChip = $("island-coins");

const LANGUAGES = {
  zh: { glyph: "中文", name: "Chinese" },
  ms: { glyph: "BM", name: "Malay" },
  ta: { glyph: "தமிழ்", name: "Tamil" },
};
const ISLAND_LANGUAGES = ["zh", "ms", "ta"]; // the languages the island is built in

// Reading localStorage can throw if the browser blocks it, so go through here.
function getStorage() {
  try {
    return window.localStorage;
  } catch (err) {
    return null;
  }
}

let currentUser = null;
let currentLanguage = null;
let currentProfile = null;

const LOGIN_PAGE = "../auth/login.html";

function showScreen(name) {
  languageSection.hidden = name !== "language";
  journeySection.hidden = name !== "journey";
  const nav = $("bottom-nav");
  if (nav) nav.hidden = name !== "journey";
}

function renderLanguageChip() {
  const lang = LANGUAGES[currentLanguage];
  changeLanguageButton.querySelector(".chip-glyph").textContent = lang.glyph;
  changeLanguageButton.setAttribute("aria-label", `Switch Mother Tongue. Currently ${lang.name}`);
}

// ---- top bar: streak and profile picture ----
// The streak grows once a day, when the player does something: finishes a level
// or an NPC challenge here, or captures a word (the Capture page). Just opening
// the app does not count. A streak that was not kept up yesterday shows as 0.
function shownStreak(profile) {
  const last = profile.lastActiveDate;
  if (!last || typeof daysBetween !== "function") return profile.currentStreak;
  return daysBetween(last, localDateString()) > 1 ? 0 : profile.currentStreak;
}

async function countStreak() {
  if (!currentUser || typeof recordStreakActivity !== "function") return;
  try {
    const result = await recordStreakActivity(currentUser.id);
    if (!result || !currentProfile) return;
    currentProfile = { ...currentProfile, currentStreak: result.currentStreak, longestStreak: result.longestStreak, lastActiveDate: result.lastActiveDate };
    renderStreak();
    if (result.changed) showToast(result.currentStreak === 1 ? "Day 1 of your streak!" : `${result.currentStreak} day streak!`);
  } catch (err) {
    console.error("Could not update the streak:", err);
  }
}

function renderStreak() {
  if (!currentProfile || !currentProfile.hasExtras) {
    streakChip.hidden = true;
    return;
  }
  const n = shownStreak(currentProfile);
  streakChip.querySelector(".streak-num").textContent = String(n);
  streakChip.classList.toggle("is-active", n > 0);
  streakChip.setAttribute("aria-label", n === 1 ? "1 day streak" : `${n} day streak`);
  streakChip.hidden = false;
}

function renderAvatar() {
  const id = currentProfile ? currentProfile.avatar : DEFAULT_AVATAR;
  setSvg(openProfileButton, avatarSvg(id, 44));
}

function refreshQuests() {
  if (typeof refreshJourneyRewards === "function") refreshJourneyRewards(() => (currentUser ? currentUser.id : null));
}

async function loadProfileAndStreak() {
  try {
    currentProfile = await loadProfile(currentUser.id); // opening the app no longer counts: see countStreak()
  } catch (err) {
    // The profile is a nice-to-have: never block the island on it.
    console.error("Could not load profile:", err);
    currentProfile = null;
  }
  renderStreak();
  renderAvatar();
  refreshQuests();
}

// ---- profile: the picture button opens the Profile page ----
const PROFILE_PAGE = "../profile/profile.html";
openProfileButton.addEventListener("click", () => {
  location.href = PROFILE_PAGE;
});

// ---- daily quests drop down from the level badge ----
// quests.js draws the panel; here it only has to open under the bar, close
// again, and show a yellow ! on the badge while a reward is waiting.
const questsOpen = () => !questsPanel.hidden && !questsPanel.classList.contains("is-collapsed");
function closeQuests() {
  const head = questsPanel.querySelector("[data-qp-toggle]");
  if (questsOpen() && head) head.click();
}
// Tapping the level badge again closes the list (quests.js only opens it).
levelChip.addEventListener("click", (e) => {
  if (questsOpen()) { e.stopImmediatePropagation(); closeQuests(); }
}, true);
// Touching anywhere else closes it too (the island swallows click events, so use pointerdown).
document.addEventListener("pointerdown", (e) => {
  // composedPath, because the badge and panel redraw themselves while the touch is handled
  const path = e.composedPath ? e.composedPath() : [];
  const inTour = path.some((n) => n.classList && n.classList.contains("tour-layer")); // the tour opens it on purpose
  if (questsOpen() && !inTour && !path.includes(questsPanel) && !path.includes(levelChip)) closeQuests();
}, true);
if (window.MutationObserver) {
  new MutationObserver(() => levelChip.classList.toggle("has-ready", questsPanel.classList.contains("has-ready")))
    .observe(questsPanel, { attributes: true, attributeFilter: ["class"] });
}

// ---- coins in the top bar: the profile's coins (shared with quests), spent at the Island Shop ----
// Quests can pay coins too, so re-read the balance when the quests list redraws
// and when the player comes back to this tab.
let coinSyncTimer = null;
const syncCoinsSoon = () => {
  clearTimeout(coinSyncTimer);
  coinSyncTimer = setTimeout(() => { if (typeof IslandState !== "undefined") IslandState.syncCoins(); }, 800);
};
if (window.MutationObserver) new MutationObserver(syncCoinsSoon).observe(questsPanel, { childList: true, subtree: true });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncCoinsSoon(); });
function showIslandCoins(n) {
  coinsChip.querySelector(".coin-num").textContent = String(n);
  coinsChip.setAttribute("aria-label", `${n} coins`);
  coinsChip.hidden = false;
}

// ---- the island ----
let islandSoon = null;

async function mountIsland(language) {
  const playable = ISLAND_LANGUAGES.includes(language);
  if (islandSoon) { islandSoon.remove(); islandSoon = null; }
  if (playable) {
    await IslandContent.ready; // the island's words and text, from Supabase (falls back to the built-in lists)
    await IslandApp.mount(mapEl, {
      language,
      // Finished a level, an NPC challenge, bought something...: refresh the quests above the island.
      onEvent: (type) => {
        if (["level", "npc", "purchase", "practice"].includes(type)) refreshQuests();
        if (["level", "npc", "practice"].includes(type)) countStreak(); // a mini-game or NPC challenge was played
      },
      onCoins: showIslandCoins,
    });
  }
  const stage = mapEl.querySelector(".island-stage");
  if (stage) stage.hidden = !playable;
  if (!playable) {
    const lang = LANGUAGES[language];
    islandSoon = document.createElement("div");
    islandSoon.className = "island-soon";
    islandSoon.innerHTML = `<h2>${lang.name} island is coming soon</h2><p>The Chinese island is ready to explore now.</p><button type="button" class="btn btn-primary">Switch to Chinese</button>`;
    islandSoon.querySelector("button").addEventListener("click", () => startIslandFor("zh"));
    mapEl.appendChild(islandSoon);
  }
}

async function startIslandFor(language) {
  // The island is built for one language at a time, so changing language starts the page again.
  // The choice is saved first, and the page opens straight into the new island.
  if (IslandApp.started && IslandApp.language && IslandApp.language !== language) {
    writeSavedLanguage(getStorage(), currentUser.id, language);
    window.location.reload();
    return;
  }
  currentLanguage = language;
  writeSavedLanguage(getStorage(), currentUser.id, language);
  renderLanguageChip();
  showScreen("journey");
  try {
    await mountIsland(language);
  } catch (err) {
    console.error("Could not start the island:", err);
    showToast("Could not load your island. Check your connection and try again.");
  }
}

// Small message at the bottom of the screen.
let toastTimer = null;
function showToast(message) {
  clearTimeout(toastTimer);
  statusMessage.textContent = message;
  statusMessage.className = "status-message status-info toast";
  toastTimer = setTimeout(() => {
    statusMessage.textContent = "";
    statusMessage.className = "status-message toast";
  }, 2500);
}

// ---- language choice ----
changeLanguageButton.addEventListener("click", () => showScreen("language"));

document.querySelectorAll(".language-choice").forEach((button) => {
  button.addEventListener("click", () => startIslandFor(button.dataset.lang));
});

// The saved login is read from this device first (no waiting on the
// network), so a returning player goes straight to the island instead of seeing
// the login screen for a moment. Every screen starts hidden (see the HTML).
async function findSignedInUser() {
  try {
    const { data } = await supabase.auth.getSession();
    if (data && data.session && data.session.user) return data.session.user;
  } catch (err) {
    // fall through to the normal check
  }
  return getCurrentUser();
}

async function enterApp() {
  currentUser = await findSignedInUser();
  if (!currentUser) {
    location.replace(LOGIN_PAGE); // not signed in: log in on the login page
    return;
  }
  // Open the island straight away in the language this player last chose
  // (otherwise ask), and load the profile and streak alongside it.
  const saved = readSavedLanguage(getStorage(), currentUser.id, Object.keys(LANGUAGES));
  const profileLoading = loadProfileAndStreak();
  if (saved) {
    await Promise.all([startIslandFor(saved), profileLoading]);
  } else {
    await profileLoading;
    showScreen("language");
  }
}


if (typeof buildLanguageScene === "function") {
  $("language-hero-art").innerHTML = buildLanguageScene();
}
renderBottomNav();
enterApp();