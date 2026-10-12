// The Collection screen, made of albums.
//
//  - "Captured Words": every word the player captured in the real world.
//    Sorted into categories automatically, with a filter and a search.
//    Captured cards can be deleted.
//  - Island albums (Hawker Centre, Family, ...): fixed sets of words. These
//    cards can ONLY be earned in mini-games on the island (they cannot be
//    captured) and they cannot be deleted. Empty slots show a hint.
//
// Only the albums for the player's chosen Mother Tongue are shown.
//
// Needs (loaded before this file): zoneWords.js (ZONE_WORDS), cardArt.js
// (ART, pickTheme), icons.js (icon), rarity.js (getRarity) and cards.js
// (renderCard, escapeHtml, RARITY_LABELS, STAGE_LABELS).
//
// PLACEHOLDER word lists: the first three island albums reuse the Journey
// zone lists; Family and School are new. All still need checking by a native
// speaker (especially Malay and Tamil).

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
  { id: "family", name: "Family", art: "family" },
  { id: "school", name: "School", art: "book" },
];

const LANGUAGE_NAMES = { zh: "Chinese", ms: "Malay", ta: "Tamil" };

// Albums that are not Journey zones. { word, romanization, meaning } per language.
const ALBUM_EXTRA_WORDS = {
  zh: {
    family: [
      { word: "妈妈", romanization: "māma", meaning: "mother" }, { word: "爸爸", romanization: "bàba", meaning: "father" },
      { word: "哥哥", romanization: "gēge", meaning: "elder brother" }, { word: "姐姐", romanization: "jiějie", meaning: "elder sister" },
      { word: "弟弟", romanization: "dìdi", meaning: "younger brother" }, { word: "妹妹", romanization: "mèimei", meaning: "younger sister" },
      { word: "奶奶", romanization: "nǎinai", meaning: "grandmother" }, { word: "爷爷", romanization: "yéye", meaning: "grandfather" },
      { word: "家人", romanization: "jiārén", meaning: "family members" }, { word: "孩子", romanization: "háizi", meaning: "child" },
      { word: "叔叔", romanization: "shūshu", meaning: "uncle" }, { word: "阿姨", romanization: "āyí", meaning: "aunt" },
    ],
    school: [
      { word: "学校", romanization: "xuéxiào", meaning: "school" }, { word: "老师", romanization: "lǎoshī", meaning: "teacher" },
      { word: "学生", romanization: "xuésheng", meaning: "student" }, { word: "课本", romanization: "kèběn", meaning: "textbook" },
      { word: "铅笔", romanization: "qiānbǐ", meaning: "pencil" }, { word: "教室", romanization: "jiàoshì", meaning: "classroom" },
      { word: "作业", romanization: "zuòyè", meaning: "homework" }, { word: "考试", romanization: "kǎoshì", meaning: "exam" },
      { word: "同学", romanization: "tóngxué", meaning: "classmate" }, { word: "书包", romanization: "shūbāo", meaning: "school bag" },
      { word: "黑板", romanization: "hēibǎn", meaning: "blackboard" }, { word: "下课", romanization: "xiàkè", meaning: "class ends" },
    ],
  },
  ms: {
    family: [
      { word: "ibu", meaning: "mother" }, { word: "ayah", meaning: "father" },
      { word: "abang", meaning: "elder brother" }, { word: "kakak", meaning: "elder sister" },
      { word: "adik", meaning: "younger sibling" }, { word: "nenek", meaning: "grandmother" },
      { word: "datuk", meaning: "grandfather" }, { word: "keluarga", meaning: "family" },
      { word: "anak", meaning: "child" }, { word: "pakcik", meaning: "uncle" },
      { word: "makcik", meaning: "aunt" }, { word: "sepupu", meaning: "cousin" },
    ],
    school: [
      { word: "sekolah", meaning: "school" }, { word: "guru", meaning: "teacher" },
      { word: "murid", meaning: "pupil" }, { word: "buku", meaning: "book" },
      { word: "pensel", meaning: "pencil" }, { word: "kelas", meaning: "class" },
      { word: "peperiksaan", meaning: "exam" }, { word: "kawan", meaning: "friend" },
      { word: "rehat", meaning: "break" }, { word: "pelajaran", meaning: "lesson" },
      { word: "meja", meaning: "desk" }, { word: "kerusi", meaning: "chair" },
    ],
  },
  ta: {
    family: [
      { word: "அம்மா", romanization: "ammaa", meaning: "mother" }, { word: "அப்பா", romanization: "appaa", meaning: "father" },
      { word: "அண்ணன்", romanization: "annan", meaning: "elder brother" }, { word: "அக்கா", romanization: "akkaa", meaning: "elder sister" },
      { word: "தம்பி", romanization: "thambi", meaning: "younger brother" }, { word: "தங்கை", romanization: "thangai", meaning: "younger sister" },
      { word: "பாட்டி", romanization: "paatti", meaning: "grandmother" }, { word: "தாத்தா", romanization: "thaaththaa", meaning: "grandfather" },
      { word: "மாமா", romanization: "maamaa", meaning: "uncle" }, { word: "அத்தை", romanization: "aththai", meaning: "aunt" },
      { word: "குடும்பம்", romanization: "kudumbam", meaning: "family" }, { word: "குழந்தை", romanization: "kuzhanthai", meaning: "baby / child" },
    ],
    school: [
      { word: "பள்ளி", romanization: "palli", meaning: "school" }, { word: "ஆசிரியர்", romanization: "aasiriyar", meaning: "teacher" },
      { word: "மாணவர்", romanization: "maanavar", meaning: "student" }, { word: "புத்தகம்", romanization: "puththagam", meaning: "book" },
      { word: "பென்சில்", romanization: "pencil", meaning: "pencil" }, { word: "வகுப்பு", romanization: "vakuppu", meaning: "class" },
      { word: "பாடம்", romanization: "paadam", meaning: "lesson" }, { word: "தேர்வு", romanization: "thervu", meaning: "exam" },
      { word: "நண்பர்", romanization: "nanbar", meaning: "friend" }, { word: "மேசை", romanization: "mesai", meaning: "desk" },
      { word: "நாற்காலி", romanization: "naarkaali", meaning: "chair" }, { word: "விளையாட்டு", romanization: "vilaiyaattu", meaning: "game / sport" },
    ],
  },
};

// ---------- island albums: data ----------
function albumWordKey(word, language) {
  const w = String(word || "").trim();
  return language === "ms" ? w.toLowerCase() : w;
}

function getAlbumWords(albumId, language) {
  const zone = typeof ZONE_WORDS !== "undefined" && ZONE_WORDS[language] && ZONE_WORDS[language][albumId];
  const list = zone || (ALBUM_EXTRA_WORDS[language] && ALBUM_EXTRA_WORDS[language][albumId]) || [];
  return list.map((w) => ({ word: w.word, romanization: w.romanization || "", meaning: w.meaning }));
}

// Every island album for one language, with the slots the player has earned.
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
    const have = slots.filter((s) => s.row).length;
    return { ...album, slots, have, total: slots.length, complete: slots.length > 0 && have === slots.length };
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
const albumUi = { container: null, handlers: null, data: null, openId: null };

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

    if (open) {
      albumUi.openId = open.dataset.album;
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
      ${a.complete ? '<span class="album-badge">Complete</span>' : ""}
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
    <p class="album-note">Island cards can only be earned by winning mini-games on the island. They can't be captured or deleted.</p>`;
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
  return `
    <div class="album-detail-head">
      <button type="button" class="album-back" data-album-back aria-label="Back to albums">${icon("chevLeft", 22)}</button>
      <h2 class="album-title">${escapeHtml(album.name)}</h2>
    </div>
    ${album.complete ? '<p class="album-done">Album complete! Every card is yours.</p>' : '<p class="album-how">Win these cards in mini-games on the island. They can\'t be captured.</p>'}
    <div class="card-grid album-cards"></div>`;
}

function fillIslandCards(album, language) {
  const grid = albumUi.container.querySelector(".album-cards");
  const dev = albumUi.handlers.onDevAward && new URLSearchParams(location.search).get("dev") === "1";
  album.slots.forEach((slot) => {
    if (slot.row) {
      const card = renderCard(albumCardEntry(album, slot, language), () => {}, albumUi.handlers.onPracticeAlbum);
      const remove = card.querySelector(".card-delete");
      if (remove) remove.remove(); // island cards cannot be deleted
      grid.appendChild(card);
    } else if (dev) {
      grid.insertAdjacentHTML(
        "beforeend",
        `<button type="button" class="slot-card is-missing" data-dev-award="${album.id}" data-word="${escapeHtml(slot.word)}"><span class="slot-q" aria-hidden="true">?</span><span class="slot-hint">${escapeHtml(slot.meaning)}</span><span class="slot-how">Dev: tap to award</span></button>`,
      );
    } else {
      grid.insertAdjacentHTML(
        "beforeend",
        `<div class="slot-card is-missing"><span class="slot-q" aria-hidden="true">?</span><span class="slot-hint">${escapeHtml(slot.meaning)}</span><span class="slot-how">Win it on the island</span></div>`,
      );
    }
  });
}