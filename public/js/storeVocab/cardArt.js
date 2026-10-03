// Placeholder card art, until real images/illustrations are decided on.
// Returns a small inline SVG per rarity tier - no image files, no network
// request, so it works offline and costs nothing to swap out later.
// TODO: replace with real artwork once the team picks a direction.

const PLACEHOLDER_ART = {
  common: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <circle cx="30" cy="30" r="24" fill="#bdc3c7" />
  </svg>`,
  uncommon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <polygon points="30,6 54,30 30,54 6,30" fill="#3498db" />
  </svg>`,
  rare: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <polygon points="30,4 37,24 58,24 41,36 47,56 30,44 13,56 19,36 2,24 23,24" fill="#e67e22" />
  </svg>`,
};

function getPlaceholderArt(rarity) {
  return PLACEHOLDER_ART[rarity] || PLACEHOLDER_ART.common;
}