// The bottom navigation is written in each page's HTML (<nav id="bottom-nav" class="bottom-nav" data-active="...">)
// and styled by css/shared/bottomnav.css. This file only marks which tab is the current page.
// Scenarios and Friends are not built yet, so they are disabled tabs in the HTML.

// Marks the tab named in the nav's data-active (island, capture, collection or none).
function renderBottomNav() {
  const nav = document.getElementById("bottom-nav");
  if (nav) setBottomNavActive(nav.dataset.active);
}

// key = "journey" (the Island tab), "capture" or "collection"
function setBottomNavActive(key) {
  document.querySelectorAll("#bottom-nav [data-nav]").forEach((el) => {
    if (el.dataset.nav === key) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
}