// The login page: log in or sign up, then go to the island.
// A player who is already signed in on this device skips straight to the island.
// Needs shared/auth.js (signIn, signUp, getCurrentUser) and island/authScenes.js (the pictures).

const ISLAND_PAGE = "../island/island.html";

const $ = (id) => document.getElementById(id);
const signupForm = $("signup-form");
const loginForm = $("login-form");
const authStatus = $("auth-status");
const tabLogin = $("tab-login");
const tabSignup = $("tab-signup");
const authHeading = $("auth-heading");
const authSubheading = $("auth-subheading");

function showAuthMessage(message, type) {
  authStatus.textContent = message;
  authStatus.className = `status-message status-${type}`;
}

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

function goToIsland() {
  location.replace(ISLAND_PAGE);
}

// ---- sign up and log in ----
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
    goToIsland();
  } catch (err) {
    console.error("Login failed:", err);
    showAuthMessage(err.message || "Could not log in.", "error");
  }
});

// The saved login is read from this device first (no waiting on the network).
async function findSignedInUser() {
  try {
    const { data } = await supabase.auth.getSession();
    if (data && data.session && data.session.user) return data.session.user;
  } catch (err) {
    // fall through to the normal check
  }
  try {
    return await getCurrentUser();
  } catch (err) {
    return null;
  }
}

if (typeof buildLoginScene === "function") {
  $("auth-hero-art").innerHTML = buildLoginScene();
  $("auth-footer-art").innerHTML = buildFooterScene();
}

findSignedInUser().then((user) => {
  if (user) goToIsland();
});