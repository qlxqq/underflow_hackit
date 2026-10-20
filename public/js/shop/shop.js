// The Island Shop page (it used to be a pop-up on the home island).
// Same shop as before: category tabs, a row per item with its picture, a buy button, "Placed" once bought.
// Coins and purchases go through IslandState, so the balance is the same one the island and quests use.
// The home island reads what you own when it loads, so bought items appear when you go back.

const ISLAND_PAGE = "../island/island.html";

const shopEl = {
  sub: document.getElementById("shop-sub"),
  tabs: document.getElementById("shop-tabs"),
  list: document.getElementById("shop-list"),
  coins: document.getElementById("shop-coins"),
  banner: document.getElementById("shop-banner"),
};

let shopCat = "all";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function banner(title, sub) {
  const b = shopEl.banner;
  b.innerHTML = `<strong>${esc(title)}</strong>${sub ? `<span>${esc(sub)}</span>` : ""}`;
  b.hidden = false;
  b.classList.remove("is-show");
  void b.offsetWidth; // restart the animation
  b.classList.add("is-show");
}

function renderShop() {
  const coins = IslandState.coins;
  shopEl.sub.innerHTML = `You have <strong>${coins} coins</strong>. Earn more by finishing levels and helping the locals on the mystery island.`;
  shopEl.coins.querySelector(".coin-num").textContent = String(coins);
  shopEl.coins.setAttribute("aria-label", `${coins} coins`);

  shopEl.tabs.innerHTML = HOME_CATEGORIES.map((c) =>
    `<button class="shop-tab ${c.id === shopCat ? "is-on" : ""}" type="button" data-cat="${c.id}">${esc(c.name)}</button>`).join("");

  const items = HOME_ITEMS.filter((it) => shopCat === "all" || it.cat === shopCat);
  shopEl.list.innerHTML = items.map((it) => {
    const owned = IslandState.owns(it.id);
    const need = it.price - coins;
    const stored = owned && !it.pet && IslandState.isStored(it.id);
    const state = owned
      ? `<span class="shop-owned">${it.pet ? "Adopted" : stored ? "In storage" : "Placed"}</span>`
      : need > 0 ? `<button class="shop-buy" type="button" disabled>${it.price} coins<small>need ${need} more</small></button>`
      : `<button class="shop-buy" type="button" data-buy="${esc(it.id)}">${it.price} coins</button>`;
    return `<div class="shop-row ${owned ? "is-owned" : ""}"><img class="shop-thumb" alt="" src="${artThumb(it.key)}"><span class="shop-name">${esc(it.name)}</span>${state}</div>`;
  }).join("");
}

function buy(id) {
  const item = HOME_ITEMS.find((x) => x.id === id);
  if (!item || !IslandState.buy(item)) return;
  renderShop();
  banner(item.pet ? `${item.name} adopted` : `${item.name} bought`, item.pet ? "It will roam around your island" : "It is in your storage. Place it on your island with the brush button");
}

function leave() {
  // Back to the island; it opens where the player was standing.
  location.href = ISLAND_PAGE;
}

shopEl.tabs.addEventListener("click", (e) => {
  const b = e.target.closest("[data-cat]");
  if (b) { shopCat = b.dataset.cat; renderShop(); }
});
shopEl.list.addEventListener("click", (e) => {
  const b = e.target.closest("[data-buy]");
  if (b) buy(b.dataset.buy);
});
document.getElementById("shop-back").addEventListener("click", leave);
document.getElementById("shop-done").addEventListener("click", leave);

(async function startShop() {
  try {
    await IslandSave.init();   // who is logged in
    await IslandState.load();  // what they own and their coins
  } catch (err) {
    console.error("Could not load the shop:", err);
  }
  IslandState.onChange(renderShop); // coins can change when a payment is confirmed
  renderShop();
  IslandState.syncCoins();
})();