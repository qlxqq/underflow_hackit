// Shared inline icons (stroke icons, colored via currentColor).
// Identical file on both branches.
const ICON_PATHS = {
  route: '<path d="M5 21V4M5 4h11l-2 4 2 4H5" />',
  chat: '<path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4 4v-4H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />',
  cards: '<rect x="4" y="6" width="12" height="15" rx="2" /><path d="M8 3h11a1 1 0 0 1 1 1v14" />',
  friends: '<circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><circle cx="17.5" cy="9" r="2.5" /><path d="M17 14.5c2.6 0 4.2 1.4 4.8 4.5" />',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" />',
  person: '<circle cx="12" cy="8" r="4" /><path d="M4 21c.8-4.3 4-6.5 8-6.5s7.2 2.2 8 6.5" />',
  chevDown: '<path d="M7 10l5 5 5-5" />',
  chevRight: '<path d="M9 5l7 7-7 7" />',
  chevLeft: '<path d="M15 5l-7 7 7 7" />',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5" />',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />',
  pen: '<path d="M4 20l4-1 11-11-3-3L5 16z" /><path d="M14 6l3 3" />',
  bookmark: '<path d="M7 4h10v16l-5-3.5L7 20z" />',
  close: '<path d="M6 6l12 12M18 6L6 18" />',
  info: '<circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" />',
  spark: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />',
  logout: '<path d="M10 4H5v16h5M15 8l4 4-4 4M9 12h10" />',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" />',
  volume: '<path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16 8a5 5 0 0 1 0 8" />',
};

function icon(name, size = 24) {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ""}</svg>`;
}

// Puts an SVG string (such as an avatar picture) into an element without using innerHTML.
function setSvg(el, svgText) {
  const doc = new DOMParser().parseFromString(svgText, "text/html");
  el.replaceChildren(document.importNode(doc.body.firstElementChild, true));
}