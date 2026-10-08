// Journey screen: auth, a deliberate Mother Tongue choice, and the road
// map. Levels unlock in order; once reached, a level stays open for replay.
// This branch is only the layout and structure - the circles are
// placeholders until each mini-game exists (see openLevel below).

const $ = (id) => document.getElementById(id);

const authSection = $("auth-section");
const languageSection = $("language-select-section");
const journeySection = $("journey-section");
const signupForm = $("signup-form");
const loginForm = $("login-form");
const authStatus = $("auth-status");
const signOutButton = $("sign-out");
const changeLanguageButton = $("change-language");
const mapEl = $("map");
const tabLogin = $("tab-login");
const tabSignup = $("tab-signup");
const authHeading = $("auth-heading");
const authSubheading = $("auth-subheading");
const statusMessage = $("status-message");
const streakChip = $("streak-chip");
const openProfileButton = $("open-profile");
const profileSheet = $("profile-sheet");
const profileClose = $("profile-close");
const avatarGrid = $("avatar-grid");

const LANGUAGES = {
  zh: { glyph: "中文", name: "Chinese" },
  ms: { glyph: "BM", name: "Malay" },
  ta: { glyph: "தமிழ்", name: "Tamil" },
};

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
let journeyCurrentLevel = null; // the level to play now; null once everything is finished

function showScreen(name) {
  authSection.hidden = name !== "auth";
  languageSection.hidden = name !== "language";
  journeySection.hidden = name !== "journey";
  const nav = $("bottom-nav");
  if (nav) nav.hidden = name !== "journey";
}

function showAuthMessage(message, type) {
  authStatus.textContent = message;
  authStatus.className = `status-message status-${type}`;
}

function renderLanguageChip() {
  const lang = LANGUAGES[currentLanguage];
  changeLanguageButton.innerHTML = `<span class="chip-glyph">${lang.glyph}</span>${icon("chevDown", 16)}`;
  changeLanguageButton.setAttribute("aria-label", `Switch Mother Tongue. Currently ${lang.name}`);
}

// ---- top bar: streak and profile picture ----
function renderStreak() {
  if (!currentProfile || !currentProfile.hasExtras) {
    streakChip.hidden = true;
    return;
  }
  const n = currentProfile.currentStreak;
  streakChip.innerHTML = `${flameSvg(n > 0)}<span class="streak-num">${n}</span>`;
  streakChip.setAttribute("aria-label", n === 1 ? "1 day streak" : `${n} day streak`);
  streakChip.hidden = false;
}

function renderAvatar() {
  const id = currentProfile ? currentProfile.avatar : DEFAULT_AVATAR;
  openProfileButton.innerHTML = avatarSvg(id, 44);
}

async function loadProfileAndStreak() {
  try {
    const loaded = await loadProfile(currentUser.id);
    currentProfile = await recordDailyVisit(currentUser.id, loaded);
  } catch (err) {
    // The profile is a nice-to-have: never block the journey on it.
    console.error("Could not load profile:", err);
    currentProfile = null;
  }
  renderStreak();
  renderAvatar();
}

// ---- profile sheet: pick a picture, sign out ----
function renderAvatarGrid() {
  const current = currentProfile ? currentProfile.avatar : DEFAULT_AVATAR;
  avatarGrid.innerHTML = AVATARS.map((a) =>
    `<button type="button" class="avatar-option" role="radio" aria-checked="${a.id === current}" aria-label="${a.label}" data-avatar="${a.id}">${avatarSvg(a.id, 72)}</button>`,
  ).join("");
}

function openProfileSheet() {
  const current = currentProfile ? currentProfile.avatar : DEFAULT_AVATAR;
  $("profile-avatar-large").innerHTML = avatarSvg(current, 64);
  $("profile-title").textContent = currentProfile && currentProfile.username ? currentProfile.username : "Your profile";
  const n = currentProfile && currentProfile.hasExtras ? currentProfile.currentStreak : null;
  $("profile-streak-line").textContent = n === null ? "" : n === 1 ? "1 day streak" : `${n} day streak`;
  renderAvatarGrid();
  profileSheet.hidden = false;
  profileClose.focus();
}

function closeProfileSheet() {
  profileSheet.hidden = true;
  openProfileButton.focus();
}

openProfileButton.addEventListener("click", openProfileSheet);
profileClose.addEventListener("click", closeProfileSheet);
profileSheet.addEventListener("click", (e) => {
  if (e.target === profileSheet) closeProfileSheet();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !profileSheet.hidden) closeProfileSheet();
});

avatarGrid.addEventListener("click", async (e) => {
  const option = e.target.closest("[data-avatar]");
  if (!option || !currentProfile) return;
  const chosen = option.dataset.avatar;
  const previous = currentProfile.avatar;
  if (chosen === previous) return;

  // Show the new picture straight away; put the old one back if saving fails.
  currentProfile.avatar = chosen;
  renderAvatar();
  renderAvatarGrid();
  $("profile-avatar-large").innerHTML = avatarSvg(chosen, 64);
  try {
    await saveAvatar(currentUser.id, chosen);
  } catch (err) {
    console.error("Could not save picture:", err);
    currentProfile.avatar = previous;
    renderAvatar();
    renderAvatarGrid();
    $("profile-avatar-large").innerHTML = avatarSvg(previous, 64);
    showToast("Couldn't save your picture. Try again.");
  }
});

// The first incomplete level - everything up to it is open, the rest locked.
async function findCurrentLevel(totalLevels) {
  const user = currentUser;
  const language = currentLanguage;
  let level = 1;
  let progress = await ensureProgressRow(user.id, language, level);
  while (isLevelComplete(progress) && level < totalLevels) {
    level += 1;
    progress = await ensureProgressRow(user.id, language, level);
  }
  return level;
}

async function refreshJourneyView() {
  const user = currentUser;
  const language = currentLanguage;
  const totalLevels = getTotalLevels();
  const currentLevel = await findCurrentLevel(totalLevels);
  const currentRow = await getProgress(user.id, language, currentLevel);
  // The player may have signed out or switched language while this loaded.
  if (currentUser !== user || currentLanguage !== language) return;
  const everythingDone = currentLevel === totalLevels && isLevelComplete(currentRow);

  const states = getVisibleLevelNumbers(totalLevels).map((n) => {
    if (n < currentLevel) return "done";
    if (n === currentLevel) return everythingDone ? "done" : "current";
    return "locked";
  });

  // Show the layout chosen in mapConfig.js ("route" = MRT line, "path" = winding road).
  journeyCurrentLevel = everythingDone ? null : currentLevel;
  mapEl.className = "map map-route";
  mapEl.innerHTML = buildRouteHtml(states);

  // Bring the player's current spot into view (or the last level if all done).
  const dones = mapEl.querySelectorAll(".station.is-done");
  const target = mapEl.querySelector(".station.is-current") || dones[dones.length - 1];
  if (target && target.scrollIntoView) target.scrollIntoView({ block: "center" });
}

async function startJourneyFor(language) {
  currentLanguage = language;
  writeSavedLanguage(getStorage(), currentUser.id, language);
  renderLanguageChip();
  mapEl.className = "map";
  mapEl.innerHTML = `<p class="empty-state">Loading your journey...</p>`;
  showScreen("journey");
  try {
    await refreshJourneyView();
  } catch (err) {
    console.error("Could not load journey:", err);
    mapEl.innerHTML = `<p class="empty-state">Could not load your journey. Check your connection and try again.</p>`;
  }
}

// ---- tapping a level ----
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

// Placeholder. Unlocked circles (the current level and finished ones, which
// can be replayed) call this; locked circles are not clickable.
// TODO: each mini-game branch replaces this to open its own game for
// `level`, e.g. by calling getMiniGameForLevel(level) and navigating.
function openLevel(level, state) {
  const game = getMiniGameForLevel(level);
  showToast(`${game.name} is coming soon.`);
}

// A soft ring where the player tapped, so they can see the tap registered.
function showTapRipple(e) {
  const box = mapEl.getBoundingClientRect();
  const ripple = document.createElement("span");
  ripple.className = "tap-ripple";
  ripple.style.left = `${e.clientX - box.left}px`;
  ripple.style.top = `${e.clientY - box.top}px`;
  mapEl.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
  setTimeout(() => ripple.remove(), 900); // in case animations are switched off
}

// Draw the eye to the dot they should tap.
let nudgeTimer;
function nudgeCurrentStation() {
  const dot = mapEl.querySelector(".station.is-current .station-dot");
  if (!dot) return;
  clearTimeout(nudgeTimer);
  dot.classList.remove("nudge");
  void dot.offsetWidth; // restart the animation if it is already running
  dot.classList.add("nudge");
  nudgeTimer = setTimeout(() => dot.classList.remove("nudge"), 1500);
}

// Tapping a level's dot opens it. Tapping anywhere else shows a highlight
// where they tapped and tells them which level to tap.
mapEl.addEventListener("click", (e) => {
  const dot = e.target.closest("[data-level]");
  if (dot) {
    openLevel(Number(dot.dataset.level), dot.dataset.state);
    return;
  }
  showTapRipple(e);
  const locked = e.target.closest("[data-locked-level]");
  showToast(getTapPrompt(journeyCurrentLevel, locked ? Number(locked.dataset.lockedLevel) : null));
  nudgeCurrentStation();
});

// ---- login / sign up tabs ----
const AUTH_COPY = {
  login: { heading: "Welcome back", sub: "Log in to pick up where you left off." },
  signup: { heading: "Create your account", sub: "It only takes a minute." },
};

function selectAuthTab(which) {
  const signup = which === "signup";
  authHeading.textContent = AUTH_COPY[signup ? "signup" : "login"].heading;
  authSubheading.textContent = AUTH_COPY[signup ? "signup" : "login"].sub;
  tabLogin.setAttribute("aria-selected", String(!signup));
  tabSignup.setAttribute("aria-selected", String(signup));
  loginForm.hidden = signup;
  signupForm.hidden = !signup;
  authStatus.textContent = "";
  authStatus.className = "status-message";
}
tabLogin.addEventListener("click", () => selectAuthTab("login"));
tabSignup.addEventListener("click", () => selectAuthTab("signup"));

// ---- auth + language choice ----
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("signup-email").value.trim();
  const password = $("signup-password").value;
  const username = $("signup-username").value.trim();
  try {
    await signUp(email, password, username);
    selectAuthTab("login");
    showAuthMessage("Account created. If email confirmation is on, confirm it first, then log in.", "success");
  } catch (err) {
    console.error("Sign up failed:", err);
    showAuthMessage(err.message || "Could not sign up.", "error");
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await signIn($("login-email").value.trim(), $("login-password").value);
    await enterApp();
  } catch (err) {
    console.error("Login failed:", err);
    showAuthMessage(err.message || "Could not log in.", "error");
  }
});

signOutButton.addEventListener("click", async () => {
  await signOut();
  currentUser = null;
  currentLanguage = null;
  currentProfile = null;
  profileSheet.hidden = true;
  mapEl.innerHTML = "";
  journeyCurrentLevel = null;
  streakChip.hidden = true;
  openProfileButton.innerHTML = "";
  showScreen("auth");
});

changeLanguageButton.addEventListener("click", () => showScreen("language"));

document.querySelectorAll(".language-choice").forEach((button) => {
  button.addEventListener("click", () => startJourneyFor(button.dataset.lang));
});

async function enterApp() {
  currentUser = await getCurrentUser();
  if (!currentUser) {
    showScreen("auth");
    return;
  }
  await loadProfileAndStreak();
  // Go straight to the map in the language this player last chose; otherwise ask.
  const saved = readSavedLanguage(getStorage(), currentUser.id, Object.keys(LANGUAGES));
  if (saved) await startJourneyFor(saved);
  else showScreen("language");
}

$("auth-hero-art").innerHTML = buildLoginScene();
$("auth-footer-art").innerHTML = buildFooterScene();
$("language-hero-art").innerHTML = buildLanguageScene();
profileClose.innerHTML = icon("close", 20);
renderBottomNav();
enterApp();