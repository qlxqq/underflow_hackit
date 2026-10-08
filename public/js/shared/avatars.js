// Profile pictures: simple flat icons
// Identical file on both branches.

const MERLION = {
  mane: "#f2a93b",
  maneLight: "#f8c562",
  maneDark: "#dc8a1c",
  face: "#ffe7b3",
  faceShade: "#ffd592",
  muzzle: "#fff3d6",
  ink: "#18233a",
};

function merlionFace() {
  const c = MERLION;
  let o = "";
  // mane: a darker ring behind for depth, then the amber scallops on top
  for (let a = 0; a < 360; a += 30) {
    const x = 90 + 51 * Math.cos((a * Math.PI) / 180);
    const y = 87 + 51 * Math.sin((a * Math.PI) / 180);
    o += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="16" fill="${c.maneDark}" />`;
  }
  o += `<circle cx="90" cy="87" r="53" fill="${c.maneDark}" />`;
  for (let a = 0; a < 360; a += 30) {
    const x = 90 + 50 * Math.cos((a * Math.PI) / 180);
    const y = 84 + 50 * Math.sin((a * Math.PI) / 180);
    o += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="16" fill="${c.mane}" />`;
  }
  o += `<circle cx="90" cy="84" r="52" fill="${c.mane}" />`;
  // light catching the top-left scallops
  [210, 240, 270].forEach((a) => {
    const x = 90 + 50 * Math.cos((a * Math.PI) / 180);
    const y = 84 + 50 * Math.sin((a * Math.PI) / 180);
    o += `<path d="M${(x - 11).toFixed(1)} ${(y + 1).toFixed(1)} q11 -14 22 0" fill="none" stroke="${c.maneLight}" stroke-width="3.2" stroke-linecap="round" />`;
  });
  // ears
  o += `<circle cx="46" cy="40" r="13" fill="${c.maneDark}" /><circle cx="46" cy="40" r="7" fill="#ffb5a0" />`;
  o += `<circle cx="134" cy="40" r="13" fill="${c.maneDark}" /><circle cx="134" cy="40" r="7" fill="#ffb5a0" />`;
  // face with a soft lower shade and a lighter muzzle
  o += `<circle cx="90" cy="88" r="44" fill="${c.face}" />`;
  o += `<path d="M48 98 Q90 150 132 98 Q132 128 90 134 Q48 128 48 98 Z" fill="${c.faceShade}" opacity="0.55" />`;
  o += `<ellipse cx="79" cy="106" rx="15" ry="11" fill="${c.muzzle}" /><ellipse cx="101" cy="106" rx="15" ry="11" fill="${c.muzzle}" />`;
  o += `<ellipse cx="78" cy="62" rx="14" ry="6" fill="#fff6dc" opacity="0.7" />`;
  // brows
  o += `<path d="M58 66 q12 -9 24 -2" fill="none" stroke="${c.maneDark}" stroke-width="3.2" stroke-linecap="round" />`;
  o += `<path d="M98 64 q12 -7 24 2" fill="none" stroke="${c.maneDark}" stroke-width="3.2" stroke-linecap="round" />`;
  // eyes: white, big pupils, two highlights
  o += `<circle cx="72" cy="82" r="14.5" fill="#e9d7ae" /><circle cx="108" cy="82" r="14.5" fill="#e9d7ae" />`;
  o += `<circle cx="72" cy="82" r="13.5" fill="#ffffff" /><circle cx="108" cy="82" r="13.5" fill="#ffffff" />`;
  o += `<circle cx="74.5" cy="84" r="8" fill="${c.ink}" /><circle cx="110.5" cy="84" r="8" fill="${c.ink}" />`;
  o += `<circle cx="77.5" cy="80.5" r="3" fill="#ffffff" /><circle cx="113.5" cy="80.5" r="3" fill="#ffffff" />`;
  o += `<circle cx="72" cy="88" r="1.5" fill="#ffffff" opacity="0.8" /><circle cx="108" cy="88" r="1.5" fill="#ffffff" opacity="0.8" />`;
  // cheeks
  o += `<circle cx="57" cy="104" r="7.5" fill="#ff9d8a" opacity="0.55" /><circle cx="123" cy="104" r="7.5" fill="#ff9d8a" opacity="0.55" />`;
  // nose with a highlight
  o += `<path d="M82 100 Q90 94 98 100 Q96 109 90 111 Q84 109 82 100 Z" fill="#5b3426" />`;
  o += `<ellipse cx="87" cy="99" rx="3" ry="1.6" fill="#a8704f" opacity="0.8" />`;
  // open smile: mouth, tongue, a hint of teeth
  o += `<path d="M73 111 Q90 132 107 111 Q90 118 73 111 Z" fill="#c63d34" />`;
  o += `<path d="M82 119 Q90 126 98 119 Q90 124 82 119 Z" fill="#ff8e8e" />`;
  o += `<path d="M79 113 q4 3 8 1 M93 114 q4 2 8 -1" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />`;
  return o;
}

const AVATAR_ART = {
  merlion: () => `<svg width="SIZE" height="SIZE" viewBox="6 0 168 168" aria-hidden="true"><rect x="6" y="0" width="168" height="168" fill="#e6f7f4" />${merlionFace()}</svg>`,

  "chicken-rice": (body) => body(
    "#fff1c9",
    `<ellipse cx="32" cy="42" rx="25" ry="10" fill="#ffffff" stroke="#e3dccb" stroke-width="1.5" />` +
    `<path d="M11 40 a13 12 0 0 1 26 0 Z" fill="#fffdf2" stroke="#efe6cf" stroke-width="1.2" />` +
    `<rect x="34" y="28" width="20" height="9" rx="4.5" fill="#e7b97a" transform="rotate(-12 44 32)" />` +
    `<rect x="35" y="33" width="20" height="9" rx="4.5" fill="#f1c98e" transform="rotate(-4 45 37)" />` +
    `<path d="M36 33 q8 -4 18 -1" stroke="#fff3da" stroke-width="2" fill="none" stroke-linecap="round" />` +
    `<circle cx="16" cy="30" r="4.2" fill="#8fc76b" /><circle cx="16" cy="30" r="2" fill="#cfe9a8" />` +
    `<circle cx="24" cy="25" r="4.2" fill="#8fc76b" /><circle cx="24" cy="25" r="2" fill="#cfe9a8" />` +
    `<ellipse cx="44" cy="48" rx="6" ry="2.6" fill="#d9402f" />`
  ),

  laksa: (body) => body(
    "#ffe4da",
    `<path d="M8 32 h48 a24 21 0 0 1 -48 0 Z" fill="#fff6e9" stroke="#e8d7bd" stroke-width="1.5" />` +
    `<path d="M8 32 h48 v3 h-48 Z" fill="#d9534a" />` +
    `<ellipse cx="32" cy="32" rx="24" ry="6.5" fill="#f08a2c" />` +
    `<path d="M16 32 q4 -5 8 0 t8 0 t8 0 t8 0" fill="none" stroke="#fff3d6" stroke-width="2.2" stroke-linecap="round" />` +
    `<path d="M18 29 q3 -4 7 -1" fill="none" stroke="#fff3d6" stroke-width="2" stroke-linecap="round" />` +
    `<path d="M38 28 a6 5 0 0 1 11 2 q-5 1 -11 -2 Z" fill="#ff9b8a" />` +
    `<path d="M24 27 a5 4 0 0 1 9 1.5 q-4 1 -9 -1.5 Z" fill="#ff9b8a" />` +
    `<ellipse cx="44" cy="31" rx="3" ry="1.6" fill="#7bbf5a" transform="rotate(-20 44 31)" />` +
    `<path d="M24 20 q-4 -5 0 -9 M32 21 q-4 -5 0 -9 M40 20 q-4 -5 0 -9" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity="0.9" />`
  ),

  kopi: (body) => body(
    "#ffe8c2",
    `<ellipse cx="30" cy="48" rx="21" ry="5" fill="#e8ddcb" />` +
    `<path d="M14 24 h30 v14 a15 12 0 0 1 -30 0 Z" fill="#ffffff" stroke="#e8ddcb" stroke-width="1.5" />` +
    `<ellipse cx="29" cy="24" rx="15" ry="4.5" fill="#6b3f1d" />` +
    `<ellipse cx="25" cy="23" rx="5" ry="1.4" fill="#a8703d" opacity="0.8" />` +
    `<path d="M44 28 a7 7 0 0 1 0 14" fill="none" stroke="#e8ddcb" stroke-width="4" stroke-linecap="round" />` +
    `<path d="M22 17 q-4 -5 0 -9 M30 18 q-4 -5 0 -9 M38 17 q-4 -5 0 -9" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" />`
  ),

  hdb: (body) => body(
    "#cfe9f7",
    `<circle cx="50" cy="16" r="7" fill="#fbd566" />` +
    `<rect x="0" y="48" width="64" height="16" fill="#8fd0a0" />` +
    `<rect x="9" y="14" width="30" height="36" fill="#9dbfdf" /><rect x="9" y="14" width="30" height="5" fill="#7fa6ca" />` +
    [0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${14 + c * 9}" y="${23 + r * 9}" width="5" height="5" rx="1" fill="#e8f1f8" />`).join("")).join("") +
    `<rect x="20" y="42" width="10" height="8" fill="#7c8ca3" />` +
    `<rect x="39" y="26" width="18" height="24" fill="#ebb9b0" /><rect x="39" y="26" width="18" height="4" fill="#d99c92" />` +
    [0, 1].map((r) => [0, 1].map((c) => `<rect x="${43 + c * 8}" y="${33 + r * 8}" width="4" height="4" rx="1" fill="#fbeeea" />`).join("")).join("")
  ),

  durian: (body) => {
    let spikes = "";
    for (let a = 0; a < 360; a += 24) {
      const x = 32 + 16 * Math.cos((a * Math.PI) / 180), y = 36 + 18 * Math.sin((a * Math.PI) / 180);
      const x2 = 32 + 23 * Math.cos((a * Math.PI) / 180), y2 = 36 + 25 * Math.sin((a * Math.PI) / 180);
      const px = -Math.sin((a * Math.PI) / 180) * 3.6, py = Math.cos((a * Math.PI) / 180) * 3.6;
      spikes += `<polygon points="${(x + px).toFixed(1)},${(y + py).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${(x - px).toFixed(1)},${(y - py).toFixed(1)}" fill="#8aa13a" />`;
    }
    return body(
      "#e4f1e6",
      spikes +
      `<ellipse cx="32" cy="36" rx="17" ry="19" fill="#b5c95a" />` +
      `<path d="M22 29 q4 -7 10 -8 M42 33 q-2 9 -9 12" fill="none" stroke="#9db447" stroke-width="2.4" stroke-linecap="round" />` +
      `<circle cx="27" cy="38" r="1.8" fill="#8aa13a" /><circle cx="37" cy="29" r="1.8" fill="#8aa13a" /><circle cx="35" cy="41" r="1.8" fill="#8aa13a" />` +
      `<rect x="30" y="9" width="4" height="8" rx="2" fill="#7a5a3a" />` +
      `<path d="M34 13 q10 -6 14 2 q-8 4 -14 -2 Z" fill="#5fae7a" />`
    );
  },

  orchid: (body) => body(
    "#ede3f7",
    `<path d="M30 56 C28 44 34 36 32 28" fill="none" stroke="#5fae7a" stroke-width="3" stroke-linecap="round" />` +
    `<path d="M30 50 q-10 -4 -14 -12 q10 0 14 8 Z" fill="#7bc496" />` +
    `<ellipse cx="22" cy="26" rx="9" ry="13" fill="#c45fa0" transform="rotate(-38 22 26)" />` +
    `<ellipse cx="42" cy="26" rx="9" ry="13" fill="#d172b0" transform="rotate(38 42 26)" />` +
    `<ellipse cx="32" cy="15" rx="8" ry="11" fill="#d98abf" />` +
    `<ellipse cx="24" cy="38" rx="7" ry="9" fill="#e6a3cf" transform="rotate(28 24 38)" />` +
    `<ellipse cx="40" cy="38" rx="7" ry="9" fill="#e6a3cf" transform="rotate(-28 40 38)" />` +
    `<path d="M32 26 q-7 8 0 16 q7 -8 0 -16 Z" fill="#8e2f78" />` +
    `<circle cx="32" cy="27" r="3.2" fill="#fbd566" />`
  ),

  mrt: (body) => body(
    "#dce6ef",
    `<rect x="0" y="50" width="64" height="14" fill="#aeb9c6" />` +
    `<path d="M10 52 h44 M10 58 h44" stroke="#8e9bab" stroke-width="2" />` +
    `<rect x="13" y="10" width="38" height="38" rx="9" fill="#f2f5f8" stroke="#c9d3de" stroke-width="1.5" />` +
    `<rect x="17" y="15" width="30" height="16" rx="5" fill="#3b4a63" />` +
    `<rect x="13" y="35" width="38" height="5" fill="#d9402f" />` +
    `<circle cx="21" cy="43" r="3" fill="#fbd566" /><circle cx="43" cy="43" r="3" fill="#fbd566" />` +
    `<path d="M26 11 h12" stroke="#c9d3de" stroke-width="2.4" stroke-linecap="round" />`
  ),
};

const AVATARS = [
  { id: "merlion", label: "Merlion" },
  { id: "chicken-rice", label: "Chicken rice" },
  { id: "laksa", label: "Laksa" },
  { id: "kopi", label: "Kopi" },
  { id: "hdb", label: "HDB flats" },
  { id: "durian", label: "Durian" },
  { id: "orchid", label: "Orchid" },
  { id: "mrt", label: "MRT train" },
];

const DEFAULT_AVATAR = "merlion";

function isValidAvatar(id) {
  return AVATARS.some((a) => a.id === id);
}

// Returns an <svg> for the avatar. Unknown ids fall back to the Merlion.
function avatarSvg(id, size = 44) {
  const key = isValidAvatar(id) ? id : DEFAULT_AVATAR;
  const wrap = (bg, art) => `<svg width="SIZE" height="SIZE" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="${bg}" />${art}</svg>`;
  return AVATAR_ART[key](wrap).split("SIZE").join(String(size));
}