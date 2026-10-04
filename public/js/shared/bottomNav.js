// Renders the shared bottom navigation into <nav id="bottom-nav" data-active="...">.
// Identical file on both branches. Links assume the merged layout:
//   public/pages/journey/journey.html
//   public/pages/storeVocab/storeVocab.html
// Scenarios and Friends are not built yet, so they render as disabled tabs.
const NAV_LINKS = {
  journey: "../journey/journey.html",
  capture: "../storeVocab/storeVocab.html#capture",
  collection: "../storeVocab/storeVocab.html#collection",
};

function renderBottomNav() {
  const nav = document.getElementById("bottom-nav");
  if (!nav) return;
  nav.className = "bottom-nav";
  nav.setAttribute("aria-label", "Main");

  const link = (key, label, iconName) =>
    `<a class="nav-tab" data-nav="${key}" href="${NAV_LINKS[key]}">${icon(iconName)}<span>${label}</span></a>`;
  const soon = (label, iconName) =>
    `<button class="nav-tab" type="button" disabled title="Coming soon">${icon(iconName)}<span>${label}</span></button>`;

  nav.innerHTML =
    link("journey", "Journey", "route") +
    soon("Scenarios", "chat") +
    `<div class="nav-capture"><a class="nav-capture-btn" data-nav="capture" href="${NAV_LINKS.capture}" aria-label="Capture words">${icon("camera", 26)}</a><span class="nav-capture-label">Capture</span></div>` +
    link("collection", "Collection", "cards") +
    soon("Friends", "friends");

  setBottomNavActive(nav.dataset.active);
}

function setBottomNavActive(key) {
  document.querySelectorAll("#bottom-nav [data-nav]").forEach((el) => {
    if (el.dataset.nav === key) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
}