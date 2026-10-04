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
const statusMessage = $("status-message");

const LANGUAGES = {
  zh: { glyph: "中文", name: "Chinese" },
  ms: { glyph: "BM", name: "Malay" },
  ta: { glyph: "தமிழ்", name: "Tamil" },
};

let currentUser = null;
let currentLanguage = null;

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
  changeLanguageButton.innerHTML =
    `<span class="chip-glyph">${lang.glyph}</span><span>${lang.name}</span>${icon("chevDown", 18)}`;
}

// The first incomplete level - everything up to it is open, the rest locked.
async function findCurrentLevel(totalLevels) {
  let level = 1;
  let progress = await ensureProgressRow(currentUser.id, currentLanguage, level);
  while (isLevelComplete(progress) && level < totalLevels) {
    level += 1;
    progress = await ensureProgressRow(currentUser.id, currentLanguage, level);
  }
  return level;
}

async function refreshJourneyView() {
  const totalLevels = getTotalLevels();
  const currentLevel = await findCurrentLevel(totalLevels);
  const currentRow = await getProgress(currentUser.id, currentLanguage, currentLevel);
  const everythingDone = currentLevel === totalLevels && isLevelComplete(currentRow);

  const states = getVisibleLevelNumbers(totalLevels).map((n) => {
    if (n < currentLevel) return "done";
    if (n === currentLevel) return everythingDone ? "done" : "current";
    return "locked";
  });

  mapEl.innerHTML = buildMapHtml(states, currentLevel);

  // Bring the player's current spot into view (or the last level if all done).
  const dones = mapEl.querySelectorAll(".node-done");
  const target = mapEl.querySelector(".node-current") || dones[dones.length - 1];
  if (target && target.scrollIntoView) target.scrollIntoView({ block: "center" });
}

async function startJourneyFor(language) {
  currentLanguage = language;
  renderLanguageChip();
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

mapEl.addEventListener("click", (e) => {
  const node = e.target.closest("[data-level]");
  if (!node) return;
  openLevel(Number(node.dataset.level), node.dataset.state);
});

// ---- auth + language choice ----
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("signup-email").value.trim();
  const password = $("signup-password").value;
  const username = $("signup-username").value.trim();
  try {
    await signUp(email, password, username);
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
  // Every visit starts by choosing which Mother Tongue to practise.
  showScreen("language");
}

renderBottomNav();
enterApp();