// The Collection screen, made of albums.
//
//  - "Captured Words": every word the player captured in the real world.
//    Sorted into categories automatically, with a filter and a search.
//    Captured cards can be deleted.
//  - Island albums (Neighbourhood, Hawker Centre, Public Transport): fixed sets
//    of words that can ONLY be earned on the island (they cannot be captured)
//    and cannot be deleted. Each album has two kinds of card:
//        ZONE cards  the zone's words, won in the island's mini-games
//                    (they can also drop as a bonus from an NPC challenge)
//        ROLE cards  each NPC's job words (roleCards.js), won only from that
//                    NPC's challenge
//    Collecting every ZONE card finishes the album and earns the badge. Collecting
//    the role cards too earns the shiny Master badge. A filter above the cards
//    shows All / Zone cards / one NPC's cards.
//
// Only the albums for the player's chosen Mother Tongue are shown.
//
// Needs (loaded before this file): zoneWords.js (ZONE_WORDS), roleCards.js
// (ROLE_CARDS, roleCardsFor), cardArt.js (ART, pickTheme), icons.js (icon),
// rarity.js (getRarity) and cards.js (renderCard, escapeHtml, RARITY_LABELS, STAGE_LABELS).
//
// PLACEHOLDER word lists: the albums reuse the Journey zone lists. All still need
// checking by a native speaker (especially Malay and Tamil).

const CAPTURED_ALBUM = { id: "captured", name: "Captured Words", art: "captured" };

// Cover picture for Captured Words (a camera), drawn in the same flat style
// as the card pictures used for the island albums.
const CAPTURED_COVER =
  '<ellipse cx="36" cy="62" rx="24" ry="3.5" fill="#1c2541" opacity="0.1"/>' +
  '<rect x="8" y="22" width="56" height="38" rx="9" fill="#2f6fd6"/>' +
  '<path d="M24 22l4-8h16l4 8z" fill="#4a6cf0"/>' +
  '<circle cx="36" cy="41" r="13" fill="#ffffff"/>' +
  '<circle cx="36" cy="41" r="9" fill="#17a596"/>' +
  '<circle cx="32.5" cy="37.5" r="3" fill="#ffffff" opacity="0.7"/>' +
  '<circle cx="56" cy="30" r="2.5" fill="#ffc94d"/>';

const ALBUMS = [
  { id: "neighbourhood", name: "Neighbourhood", art: "home" },
  { id: "hawker-centre", name: "Hawker Centre", art: "stall" },
  { id: "public-transport", name: "Public Transport", art: "train" },
];

const LANGUAGE_NAMES = { zh: "Chinese", ms: "Malay", ta: "Tamil" };

// Every island album is a Journey zone with its words in zoneWords.js, plus its NPC role cards (roleCards.js).

// ---------- island albums: data ----------
function albumWordKey(word, language) {
  const w = String(word || "").trim();
  return language === "ms" ? w.toLowerCase() : w;
}

// The cards of an album: the zone's words first, then each NPC's role cards.
// kind is "zone" or "role"; role cards also carry roleId and roleLabel.
function getAlbumWords(albumId, language) {
  const zone = (typeof ZONE_WORDS !== "undefined" && ZONE_WORDS[language] && ZONE_WORDS[language][albumId]) || [];
  const zoneSlots = zone.map((w) => ({ word: w.word, romanization: w.romanization || w.pinyin || "", meaning: w.meaning, kind: "zone" }));
  const groups = typeof roleCardsFor === "function" ? roleCardsFor(albumId, language) : [];
  const roleSlots = groups.flatMap((g) =>
    g.words.map((w) => ({ word: w.word, romanization: w.romanization || "", meaning: w.meaning, kind: "role", roleId: g.id, roleLabel: g.label })),
  );
  return [...zoneSlots, ...roleSlots];
}

// Every island album for one language, with the slots the player has earned.
//   complete  every ZONE card is owned (earns the album badge)
//   master    every card, zone and role, is owned (earns the shiny badge)
function buildIslandAlbums(albumRows, language) {
  const earned = new Map();
  albumRows.forEach((row) => {
    if (row.language === language) earned.set(`${row.album_id}|${albumWordKey(row.word, language)}`, row);
  });
  return ALBUMS.map((album) => {
    const slots = getAlbumWords(album.id, language).map((w) => ({
      ...w,
      row: earned.get(`${album.id}|${albumWordKey(w.word, language)}`) || null,
    }));
    const zoneSlots = slots.filter((s) => s.kind === "zone");
    const roleSlots = slots.filter((s) => s.kind === "role");
    const have = slots.filter((s) => s.row).length;
    const zoneHave = zoneSlots.filter((s) => s.row).length;
    const roleHave = roleSlots.filter((s) => s.row).length;
    const complete = zoneSlots.length > 0 && zoneHave === zoneSlots.length;
    return {
      ...album, slots, have, total: slots.length,
      zoneHave, zoneTotal: zoneSlots.length, roleHave, roleTotal: roleSlots.length,
      complete, master: complete && roleSlots.length > 0 && roleHave === roleSlots.length,
    };
  }).filter((album) => album.total > 0);
}

// An earned album card, shaped like a captured word so the same card
// design (picture, rarity, level, sound) is used.
function albumCardEntry(album, slot, language) {
  const meaningTheme = pickTheme({ english_meaning: slot.meaning });
  return {
    vocab_id: slot.row.card_id,
    word: slot.word,
    language,
    romanization: slot.romanization,
    english_meaning: slot.meaning,
    rarity: getRarity(slot.word, language) || "common",
    evolution_stage: slot.row.evolution_stage || 0,
    usage_count: slot.row.usage_count || 0,
    created_at: slot.row.earned_at,
    theme: meaningTheme === "generic" ? album.art : meaningTheme,
  };
}

// A card for the pack-opening reveal, built from a freshly awarded row.
function albumCardPreview(albumId, word, language, row) {
  const album = ALBUMS.find((a) => a.id === albumId);
  const slot = buildIslandAlbums(row ? [row] : [], language)
    .filter((a) => a.id === albumId)
    .flatMap((a) => a.slots)
    .find((s) => s.word === word && s.row);
  return slot && album ? albumCardEntry(album, slot, language) : null;
}

// ---------- captured words: categories, filters, sorting ----------
const CATEGORY_OF_THEME = {
  food: "Food & Drink", drink: "Food & Drink", stall: "Food & Drink", fruit: "Food & Drink", cake: "Food & Drink", chilli: "Food & Drink",
  bus: "Getting Around", taxi: "Getting Around", train: "Getting Around", car: "Getting Around", bicycle: "Getting Around", plane: "Getting Around",
  home: "Home & Family", lift: "Home & Family", family: "Home & Family", bed: "Home & Family", key: "Home & Family",
  people: "People & Feelings", chat: "People & Feelings", smile: "People & Feelings", heart: "People & Feelings",
  park: "Nature & Animals", rain: "Nature & Animals", sun: "Nature & Animals", moon: "Nature & Animals", flower: "Nature & Animals",
  bird: "Nature & Animals", cat: "Nature & Animals", fish: "Nature & Animals",
  book: "School & Ideas", pencil: "School & Ideas", bulb: "School & Ideas", clock: "School & Ideas",
  shop: "Shopping & Money", card: "Shopping & Money", coin: "Shopping & Money", shirt: "Shopping & Money", bag: "Shopping & Money", gift: "Shopping & Money", shoe: "Shopping & Money",
  medical: "Health & Body", eye: "Health & Body",
  playground: "Fun & Play", chess: "Fun & Play", star: "Fun & Play", phone: "Fun & Play",
};
const OTHER_CATEGORY = "Other";

function categoryOf(entry) {
  return CATEGORY_OF_THEME[pickTheme(entry)] || OTHER_CATEGORY;
}

const ALBUM_RARITY_ORDER = ["legendary", "epic", "rare", "uncommon", "common"];
const STAGE_NAMES = ["Caught", "Trained", "Mastered"];
const SORTS = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "az", label: "A to Z" },
  { id: "rarity", label: "Rarest first" },
];
const GROUPS = [
  { id: "category", label: "Category" },
  { id: "rarity", label: "Rarity" },
  { id: "level", label: "Level" },
  { id: "none", label: "No groups" },
];

const capUi = {
  search: "",
  category: "all",
  rarities: new Set(),
  stages: new Set(),
  sort: "newest",
  group: "category",
  panelOpen: false,
  collapsed: new Set(),
};

function createdTime(entry) {
  return new Date(entry.created_at || 0).getTime();
}

function sortEntries(list, sort) {
  const copy = [...list];
  if (sort === "oldest") copy.sort((a, b) => createdTime(a) - createdTime(b));
  else if (sort === "az") copy.sort((a, b) => String(a.word).localeCompare(String(b.word)));
  else if (sort === "rarity") {
    copy.sort((a, b) => ALBUM_RARITY_ORDER.indexOf(a.rarity) - ALBUM_RARITY_ORDER.indexOf(b.rarity) || createdTime(b) - createdTime(a));
  } else copy.sort((a, b) => createdTime(b) - createdTime(a));
  return copy;
}

// Search ignores tone marks and spaces, so "xuexiao" and "xue xiao" both
// find 学校 (xuéxiào).
function searchKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "");
}

// Cards after the search, rarity and level filters (not the category chip).
function filterBase(entries) {
  const term = searchKey(capUi.search);
  return entries.filter((e) => {
    if (capUi.rarities.size && !capUi.rarities.has(e.rarity)) return false;
    if (capUi.stages.size && !capUi.stages.has(Math.min(e.evolution_stage || 0, 2))) return false;
    if (!term) return true;
    return [e.word, e.romanization, e.english_meaning].some((v) => searchKey(v).includes(term));
  });
}

// Category chips are built from the cards the player actually has, so a new
// category appears by itself the first time a card needs it.
function categoryCounts(entries) {
  const counts = new Map();
  entries.forEach((e) => {
    const name = categoryOf(e);
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => {
    if (a[0] === OTHER_CATEGORY) return 1;
    if (b[0] === OTHER_CATEGORY) return -1;
    return b[1] - a[1] || a[0].localeCompare(b[0]);
  });
}

function groupEntries(list) {
  if (capUi.group === "none") return [{ key: "all", title: "", items: list }];
  const buckets = new Map();
  list.forEach((e) => {
    let key;
    if (capUi.group === "rarity") key = RARITY_LABELS[e.rarity] ? e.rarity : "common";
    else if (capUi.group === "level") key = String(Math.min(e.evolution_stage || 0, 2));
    else key = categoryOf(e);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(e);
  });
  let keys = [...buckets.keys()];
  if (capUi.group === "rarity") keys.sort((a, b) => ALBUM_RARITY_ORDER.indexOf(a) - ALBUM_RARITY_ORDER.indexOf(b));
  else if (capUi.group === "level") keys.sort((a, b) => Number(b) - Number(a));
  else {
    const order = categoryCounts(list).map(([name]) => name);
    keys.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }
  const title = (key) => (capUi.group === "rarity" ? RARITY_LABELS[key] : capUi.group === "level" ? STAGE_NAMES[Number(key)] : key);
  return keys.map((key) => ({ key, title: title(key), items: buckets.get(key) }));
}

function activeFilterCount() {
  return capUi.rarities.size + capUi.stages.size + (capUi.sort !== "newest" ? 1 : 0) + (capUi.group !== "category" ? 1 : 0);
}

// ---------- screen state ----------
const albumUi = { container: null, handlers: null, data: null, openId: null, filter: "all", search: "" };

function initAlbums(container, handlers) {
  albumUi.container = container;
  albumUi.handlers = handlers;

  container.addEventListener("click", (e) => {
    const t = e.target;
    const open = t.closest("[data-album]");
    const rarity = t.closest("[data-cap-rarity]");
    const stage = t.closest("[data-cap-stage]");
    const sort = t.closest("[data-cap-sort]");
    const group = t.closest("[data-cap-group-by]");
    const category = t.closest("[data-cap-category]");
    const head = t.closest("[data-cap-toggle]");
    const dev = t.closest("[data-dev-award]");
    const albumFilter = t.closest("[data-album-filter]");

    if (albumFilter) {
      albumUi.filter = albumFilter.dataset.albumFilter;
      renderAlbums(albumUi.data);
    } else if (open) {
      albumUi.openId = open.dataset.album;
      albumUi.filter = "all";
      albumUi.search = "";
      renderAlbums(albumUi.data);
      window.scrollTo(0, 0);
    } else if (t.closest("[data-album-back]")) {
      albumUi.openId = null;
      renderAlbums(albumUi.data);
    } else if (t.closest("[data-album-capture]")) {
      albumUi.handlers.onCapture();
    } else if (t.closest("[data-cap-filter]")) {
      capUi.panelOpen = !capUi.panelOpen;
      updateCaptured();
    } else if (t.closest("[data-cap-reset]")) {
      capUi.rarities.clear();
      capUi.stages.clear();
      capUi.sort = "newest";
      capUi.group = "category";
      capUi.category = "all";
      updateCaptured();
    } else if (rarity) {
      toggleIn(capUi.rarities, rarity.dataset.capRarity);
      updateCaptured();
    } else if (stage) {
      toggleIn(capUi.stages, Number(stage.dataset.capStage));
      updateCaptured();
    } else if (sort) {
      capUi.sort = sort.dataset.capSort;
      updateCaptured();
    } else if (group) {
      capUi.group = group.dataset.capGroupBy;
      updateCaptured();
    } else if (category) {
      capUi.category = category.dataset.capCategory;
      updateCaptured();
    } else if (head) {
      toggleIn(capUi.collapsed, head.dataset.capToggle);
      updateCaptured();
    } else if (dev && albumUi.handlers.onDevAward) {
      albumUi.handlers.onDevAward(dev.dataset.devAward, dev.dataset.word);
    }
  });

  container.addEventListener("input", (e) => {
    if (e.target.matches("[data-album-search]")) {   // search inside an island album: only the cards are redrawn, so the box keeps focus
      albumUi.search = e.target.value;
      refreshIslandCards();
      return;
    }
    if (!e.target.matches("[data-cap-search]")) return;
    capUi.search = e.target.value;
    updateCaptured(true);
  });
}

function toggleIn(set, value) {
  if (set.has(value)) set.delete(value);
  else set.add(value);
}

// data = { captured: [vocabulary rows], albumRows: [album_cards rows], language }
function renderAlbums(data) {
  const box = albumUi.container;
  if (!box) return;
  albumUi.data = data;
  const albums = buildIslandAlbums(data.albumRows, data.language);

  // Coming from a gift ("Show me in collection"): open that album once, with the card searched for, so it is right there.
  if (!albumUi.deepLinked) {
    albumUi.deepLinked = true;
    try {
      const q = new URLSearchParams(location.search);
      const want = q.get("album");
      if (want && albums.some((a) => a.id === want)) { albumUi.openId = want; albumUi.filter = "all"; albumUi.search = q.get("find") || ""; }
    } catch (err) { /* no link: the shelf as usual */ }
  }

  if (albumUi.openId === CAPTURED_ALBUM.id) {
    box.innerHTML = capturedSkeleton(data);
    updateCaptured();
    return;
  }
  const open = albums.find((a) => a.id === albumUi.openId);
  if (open) {
    box.innerHTML = islandDetailSkeleton(open);
    fillIslandCards(open, data.language);
    return;
  }
  albumUi.openId = null;
  box.innerHTML = shelfHtml(data, albums);
}

// ---------- the shelf (all albums) ----------
function albumCover(art, big) {
  const markup = art === CAPTURED_ALBUM.art ? CAPTURED_COVER : typeof ART !== "undefined" && ART[art] ? ART[art] : "";
  return `<span class="album-cover${big ? " big" : ""}"><svg viewBox="0 0 72 72" aria-hidden="true">${markup}</svg></span>`;
}

function albumBar(have, total) {
  const pct = total ? Math.round((have / total) * 100) : 0;
  return `<span class="album-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${have}"><i style="width:${pct}%"></i></span>`;
}

function shelfHtml(data, albums) {
  const finished = albums.filter((a) => a.complete).length;
  const capturedCount = data.captured.length;
  const tiles = albums
    .map(
      (a) => `
    <button type="button" class="album-tile${a.complete ? " is-complete" : ""}" data-album="${a.id}">
      ${albumCover(a.art)}
      <span class="album-info">
        <strong class="album-name">${escapeHtml(a.name)}</strong>
        <span class="album-count">${a.have} / ${a.total} cards</span>
        ${albumBar(a.have, a.total)}
      </span>
      ${a.master ? '<span class="album-badge">Master</span>' : a.complete ? '<span class="album-badge">Complete</span>' : ""}
    </button>`,
    )
    .join("");
  return `
    <div class="album-list">
      <button type="button" class="album-tile" data-album="${CAPTURED_ALBUM.id}">
        ${albumCover(CAPTURED_ALBUM.art)}
        <span class="album-info">
          <strong class="album-name">${CAPTURED_ALBUM.name}</strong>
          <span class="album-count">${capturedCount} ${capturedCount === 1 ? "card" : "cards"}</span>
        </span>
      </button>
    </div>
    <h2 class="album-section">Island albums <span>${finished} of ${albums.length} complete</span></h2>
    <div class="album-list">${tiles}</div>
    <p class="album-note">Island cards can only be won on the island: zone cards in mini-games, and role cards from NPC challenges. They can't be captured or deleted.</p>`;
}

// ---------- Captured Words album ----------
function capturedSkeleton(data) {
  return `
    <div class="album-detail-head">
      <button type="button" class="album-back" data-album-back aria-label="Back to albums">${icon("chevLeft", 22)}</button>
      <h2 class="album-title">${CAPTURED_ALBUM.name}</h2>
    </div>
    ${data.captured.length === 0 ? "" : `
    <div class="cap-toolbar">
      <label class="cap-search"><span class="visually-hidden">Search cards</span>
        <input type="search" data-cap-search placeholder="Search words, pinyin or meanings" value="${escapeHtml(capUi.search)}" autocomplete="off" />
      </label>
      <button type="button" class="cap-filter-btn" data-cap-filter aria-expanded="false">Filter<span class="cap-badge" hidden></span></button>
    </div>
    <div class="cap-panel" hidden></div>
    <div class="cap-chips" role="group" aria-label="Categories"></div>
    <p class="cap-summary" role="status" aria-live="polite"></p>`}
    <div class="cap-results"></div>`;
}

function chip(label, attr, value, pressed, count) {
  return `<button type="button" class="cap-chip" ${attr}="${escapeHtml(String(value))}" aria-pressed="${pressed}">${escapeHtml(label)}${count === undefined ? "" : ` <span>${count}</span>`}</button>`;
}

function panelHtml() {
  const rarities = ALBUM_RARITY_ORDER.map((r) => chip(RARITY_LABELS[r], "data-cap-rarity", r, capUi.rarities.has(r))).join("");
  const stages = STAGE_NAMES.map((s, i) => chip(s, "data-cap-stage", i, capUi.stages.has(i))).join("");
  const sorts = SORTS.map((s) => chip(s.label, "data-cap-sort", s.id, capUi.sort === s.id)).join("");
  const groups = GROUPS.map((g) => chip(g.label, "data-cap-group-by", g.id, capUi.group === g.id)).join("");
  return `
    <div class="cap-row"><span class="cap-label">Rarity</span><div class="cap-options">${rarities}</div></div>
    <div class="cap-row"><span class="cap-label">Level</span><div class="cap-options">${stages}</div></div>
    <div class="cap-row"><span class="cap-label">Sort by</span><div class="cap-options">${sorts}</div></div>
    <div class="cap-row"><span class="cap-label">Group by</span><div class="cap-options">${groups}</div></div>
    <button type="button" class="cap-reset" data-cap-reset>Reset filters</button>`;
}

// Redraws the Captured Words album. `onlyResults` is used while typing in the
// search box, so the box keeps focus.
function updateCaptured(onlyResults) {
  const box = albumUi.container;
  const data = albumUi.data;
  if (!box || !data || albumUi.openId !== CAPTURED_ALBUM.id) return;
  const all = data.captured;
  const results = box.querySelector(".cap-results");

  if (all.length === 0) {
    results.innerHTML = `
      <div class="empty-card">
        <div class="empty-art" aria-hidden="true">${["home", "food", "bus"].map((t) => `<span>${getCardArt({ theme: t }, 0)}</span>`).join("")}</div>
        <h2 class="empty-title">No words caught yet</h2>
        <p class="empty-text">Capture a sign, a menu or a sentence, and every word becomes a card here.</p>
        <button type="button" class="btn btn-primary btn-sm" data-album-capture>Capture a word</button>
      </div>`;
    return;
  }

  const base = filterBase(all);
  const counts = categoryCounts(base);
  if (capUi.category !== "all" && !counts.some(([name]) => name === capUi.category)) capUi.category = "all";
  const shown = sortEntries(capUi.category === "all" ? base : base.filter((e) => categoryOf(e) === capUi.category), capUi.sort);

  if (!onlyResults) {
    const panel = box.querySelector(".cap-panel");
    panel.hidden = !capUi.panelOpen;
    if (capUi.panelOpen) panel.innerHTML = panelHtml();
    const button = box.querySelector("[data-cap-filter]");
    button.setAttribute("aria-expanded", String(capUi.panelOpen));
    const n = activeFilterCount();
    const badge = button.querySelector(".cap-badge");
    badge.hidden = n === 0;
    badge.textContent = n;
  }
  box.querySelector(".cap-chips").innerHTML =
    chip("All", "data-cap-category", "all", capUi.category === "all", base.length) +
    counts.map(([name, n]) => chip(name, "data-cap-category", name, capUi.category === name, n)).join("");
  box.querySelector(".cap-summary").textContent = `Showing ${shown.length} of ${all.length} cards`;

  results.innerHTML = "";
  if (shown.length === 0) {
    results.innerHTML = `<p class="empty-state cap-none">No cards match. <button type="button" class="cap-reset-link" data-cap-reset>Clear filters</button></p>`;
    return;
  }
  groupEntries(shown).forEach((group) => {
    const section = document.createElement("section");
    section.className = "cap-group";
    const collapsed = group.title && capUi.collapsed.has(group.key);
    if (group.title) {
      section.insertAdjacentHTML(
        "beforeend",
        `<button type="button" class="cap-group-head" data-cap-toggle="${escapeHtml(group.key)}" aria-expanded="${!collapsed}">
          <span class="cap-group-title">${escapeHtml(group.title)}</span><span class="cap-group-count">${group.items.length}</span><span class="cap-caret" aria-hidden="true"></span>
        </button>`,
      );
    }
    if (!collapsed) {
      const grid = document.createElement("div");
      grid.className = "card-grid";
      group.items.forEach((entry) => grid.appendChild(renderCard(entry, albumUi.handlers.onDelete, albumUi.handlers.onPractice)));
      section.appendChild(grid);
    }
    results.appendChild(section);
  });
}

// ---------- island album ----------
function islandDetailSkeleton(album) {
  const roles = [];
  album.slots.filter((s) => s.kind === "role").forEach((s) => {
    let r = roles.find((x) => x.id === s.roleId);
    if (!r) { r = { id: s.roleId, label: s.roleLabel, have: 0, total: 0 }; roles.push(r); }
    r.total++;
    if (s.row) r.have++;
  });
  if (albumUi.filter !== "all" && albumUi.filter !== "zone" && !roles.some((r) => r.id === albumUi.filter)) albumUi.filter = "all";
  const chipHtml = (value, label, count) =>
    `<button type="button" class="cap-chip" data-album-filter="${escapeHtml(value)}" aria-pressed="${albumUi.filter === value}">${escapeHtml(label)} <span>${count}</span></button>`;
  const chips =
    chipHtml("all", "All", `${album.have}/${album.total}`) +
    chipHtml("zone", "Zone cards", `${album.zoneHave}/${album.zoneTotal}`) +
    roles.map((r) => chipHtml(r.id, r.label, `${r.have}/${r.total}`)).join("");
  const status = album.master
    ? "Master! Every card in this album is yours."
    : album.complete
      ? "Zone cards complete! Win the role cards too for the shiny Master badge."
      : "Win the zone cards to finish the album.";
  return `
    <div class="album-detail-head">
      <button type="button" class="album-back" data-album-back aria-label="Back to albums">${icon("chevLeft", 22)}</button>
      <h2 class="album-title">${escapeHtml(album.name)}</h2>
    </div>
    ${album.complete ? `<p class="album-done">${status}</p>` : `<p class="album-how">${status}</p>`}
    <p class="album-how">Win zone cards in mini-games and role cards from the ? characters. They can't be captured.</p>
    <label class="cap-search album-search" style="display:block;margin:14px 0 12px"><span class="visually-hidden">Search this album</span>
      <input type="search" data-album-search placeholder="Search words, pinyin or meanings" value="${escapeHtml(albumUi.search)}" autocomplete="off" />
    </label>
    <div class="cap-chips album-filters" role="group" aria-label="Filter cards">${chips}</div>
    <div class="card-grid album-cards"></div>`;
}

// Redraws just the cards of the open island album (used while typing in the search box).
function refreshIslandCards() {
  const album = buildIslandAlbums(albumUi.data.albumRows, albumUi.data.language).find((a) => a.id === albumUi.openId);
  if (album) fillIslandCards(album, albumUi.data.language);
}

// A search matches an owned card by its word, pinyin or meaning (tones and spaces ignored: "xuexiao" finds 学校).
// A card still to win only shows its meaning, so only the meaning is searched: the word and pinyin stay hidden.
function slotMatches(slot, term) {
  if (!term) return true;
  const fields = slot.row ? [slot.word, slot.romanization, slot.meaning] : [slot.meaning];
  return fields.some((v) => searchKey(v).includes(term));
}

function fillIslandCards(album, language) {
  const grid = albumUi.container.querySelector(".album-cards");
  grid.innerHTML = "";
  const term = searchKey(albumUi.search);
  const dev = albumUi.handlers.onDevAward && new URLSearchParams(location.search).get("dev") === "1";
  const heading = (title, have, total) =>
    `<h3 class="album-section" style="grid-column: 1 / -1; margin: 10px 0 0">${escapeHtml(title)} <span>${have} of ${total}</span></h3>`;
  const addSlot = (slot) => {
    if (slot.row) {
      const card = renderCard(albumCardEntry(album, slot, language), () => {}, albumUi.handlers.onPracticeAlbum);
      const remove = card.querySelector(".card-delete");
      if (remove) remove.remove(); // island cards cannot be deleted
      // a spare copy (from a duplicate) can be gifted to a friend: shown as a small tag on the card
      if (slot.row.spares > 0) {
        if (!card.style.position) card.style.position = "relative";
        card.insertAdjacentHTML("beforeend", `<span class="spare-tag" title="Gift it to a friend from the Friends page" style="position:absolute;top:8px;left:8px;z-index:2;background:#0f7a6f;color:#fff;font:800 11px/1 Manrope,sans-serif;padding:5px 8px;border-radius:999px;">🎁 ×${slot.row.spares}</span>`);
      }
      grid.appendChild(card);
      return;
    }
    const how = slot.kind === "role" ? `NPC challenge: ${escapeHtml(slot.roleLabel)}` : "Win it in a mini-game";
    if (dev) {
      grid.insertAdjacentHTML(
        "beforeend",
        `<button type="button" class="slot-card is-missing" data-dev-award="${album.id}" data-word="${escapeHtml(slot.word)}"><span class="slot-q" aria-hidden="true">?</span><span class="slot-hint">${escapeHtml(slot.meaning)}</span><span class="slot-how">${how} (dev: tap to award)</span></button>`,
      );
    } else {
      grid.insertAdjacentHTML(
        "beforeend",
        `<div class="slot-card is-missing"><span class="slot-q" aria-hidden="true">?</span><span class="slot-hint">${escapeHtml(slot.meaning)}</span><span class="slot-how">${how}</span></div>`,
      );
    }
  };
  const filter = albumUi.filter;
  const zone = album.slots.filter((s) => s.kind === "zone");
  const roles = [];
  album.slots.filter((s) => s.kind === "role").forEach((s) => {
    let r = roles.find((x) => x.id === s.roleId);
    if (!r) { r = { id: s.roleId, label: s.roleLabel, slots: [] }; roles.push(r); }
    r.slots.push(s);
  });
  if (term) {
    // searching: one flat list, no section headings
    const pool = filter === "zone" ? zone : filter !== "all" ? (roles.find((r) => r.id === filter) || { slots: [] }).slots : album.slots;
    const found = pool.filter((s) => slotMatches(s, term));
    if (!found.length) grid.insertAdjacentHTML("beforeend", `<p class="empty-state cap-none" style="grid-column: 1 / -1">No cards match.</p>`);
    found.forEach(addSlot);
  } else if (filter === "zone") zone.forEach(addSlot);
  else if (filter !== "all") (roles.find((r) => r.id === filter) || { slots: [] }).slots.forEach(addSlot);
  else {
    grid.insertAdjacentHTML("beforeend", heading("Zone cards", album.zoneHave, album.zoneTotal));
    zone.forEach(addSlot);
    roles.forEach((r) => {
      grid.insertAdjacentHTML("beforeend", heading(r.label, r.slots.filter((s) => s.row).length, r.slots.length));
      r.slots.forEach(addSlot);
    });
  }
}