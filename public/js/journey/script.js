// Wires up the Journey screen: auth forms, a deliberate Mother Tongue
// choice before anything else loads, and a scrollable list of every
// level. Levels still unlock in order, but once reached they stay open
// for replay - nothing gets locked away again just because it's done.
// Clicking a slot marks it complete immediately for now - there's no
// real mini-game yet, this just lets the level-unlock flow be tested
// end to end. Each slot will later link out to its own mini-game, built
// on its own branch.

const authSection = document.getElementById("auth-section");
const languageSelectSection = document.getElementById("language-select-section");
const journeySection = document.getElementById("journey-section");
const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("login-form");
const authStatus = document.getElementById("auth-status");
const signOutButton = document.getElementById("sign-out");
const changeLanguageButton = document.getElementById("change-language");
const levelsContainer = document.getElementById("levels-container");

let currentUser = null;
let currentLanguage = null; // set only once the user deliberately picks one

function showAuthError(message) {
  authStatus.textContent = message;
  authStatus.className = "status-message status-error";
}

function showLanguageChoice() {
  authSection.hidden = true;
  journeySection.hidden = true;
  languageSelectSection.hidden = false;
}

async function startJourneyFor(language) {
  currentLanguage = language;
  languageSelectSection.hidden = true;
  journeySection.hidden = false;
  await refreshJourneyView();
}

// Finds the first incomplete level - everything up to and including this
// one is unlocked; anything after it stays locked until this one's done.
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
  const totalLevels = getTotalLevels(currentLanguage);
  const currentLevel = await findCurrentLevel(totalLevels);

  levelsContainer.innerHTML = "";

  for (const levelNumber of getVisibleLevelNumbers(totalLevels)) {
    const locked = isLevelLocked(levelNumber, currentLevel);
    // Only unlocked levels have a real progress row to read; locked ones
    // are shown as empty placeholders with nothing created in the database
    // until the user actually reaches them.
    const progress = locked
      ? { slot_1_completed: false, slot_2_completed: false, slot_3_completed: false }
      : await ensureProgressRow(currentUser.id, currentLanguage, levelNumber);

    levelsContainer.appendChild(renderLevelBlock(levelNumber, progress, locked));
  }
}

function renderLevelBlock(levelNumber, progress, locked) {
  const block = document.createElement("div");
  block.className = `level-block ${locked ? "level-locked" : ""}`;

  const title = document.createElement("h3");
  title.className = "level-title";
  title.textContent = locked ? `Level ${levelNumber} (locked)` : `Level ${levelNumber}`;
  block.appendChild(title);

  const words = getLevelWords(currentLanguage, levelNumber);

  [1, 2, 3].forEach((slotNumber) => {
    const completed = progress[`slot_${slotNumber}_completed`];

    const button = document.createElement("button");
    button.className = `practice-slot ${completed ? "slot-completed" : ""}`;
    button.textContent = completed ? `Practice ${slotNumber} ✓ (replay)` : `Practice ${slotNumber}`;
    button.disabled = locked; // completed levels stay clickable - only locked ones are blocked

    if (!locked) {
      button.addEventListener("click", async () => {
        // TODO: replace this with actually launching the real mini-game
        // once it exists on its own branch. For now, clicking just marks
        // it done (or re-confirms it, if already done) so the
        // level-unlock flow can be demoed.
        await completeSlot(currentUser.id, currentLanguage, levelNumber, slotNumber);
        await refreshJourneyView();
      });
    }

    const wordPreview = document.createElement("p");
    wordPreview.className = "slot-words-preview";
    wordPreview.textContent = `Words: ${words.join(", ")}`;

    const wrapper = document.createElement("div");
    wrapper.className = "slot-wrapper";
    wrapper.appendChild(button);
    wrapper.appendChild(wordPreview);
    block.appendChild(wrapper);
  });

  return block;
}

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const username = document.getElementById("signup-username").value.trim();

  try {
    await signUp(email, password, username);
    authStatus.textContent = "Account created. Check your email if confirmation is required, then log in.";
    authStatus.className = "status-message status-success";
  } catch (err) {
    console.error("Sign up failed:", err);
    showAuthError(err.message || "Could not sign up.");
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    await signIn(email, password);
    await enterApp();
  } catch (err) {
    console.error("Login failed:", err);
    showAuthError(err.message || "Could not log in.");
  }
});

signOutButton.addEventListener("click", async () => {
  await signOut();
  currentUser = null;
  currentLanguage = null;
  journeySection.hidden = true;
  languageSelectSection.hidden = true;
  authSection.hidden = false;
});

changeLanguageButton.addEventListener("click", showLanguageChoice);

document.querySelectorAll(".language-choice").forEach((button) => {
  button.addEventListener("click", () => startJourneyFor(button.dataset.lang));
});

async function enterApp() {
  currentUser = await getCurrentUser();
  if (!currentUser) return;
  // Every time someone enters the app, they choose (or re-choose) which
  // Mother Tongue this session's levels are shown in.
  showLanguageChoice();
}

// If already logged in from a previous visit, skip straight past the
// login form to the language choice.
enterApp();