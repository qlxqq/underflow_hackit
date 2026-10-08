// The one place to set the app's name and tagline.
const BRAND = {
  name: "App name", // TODO: replace with the final app name
  tagline: "Practise your Mother Tongue, one zone at a time.",
};

function applyBranding() {
  document.querySelectorAll("[data-brand-name]").forEach((el) => (el.textContent = BRAND.name));
  document.querySelectorAll("[data-brand-tagline]").forEach((el) => (el.textContent = BRAND.tagline));
  document.title = BRAND.name;
}

applyBranding();