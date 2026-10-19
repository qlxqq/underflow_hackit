// The picture behind the Friends title: the Marina Bay skyline at golden hour, the same view as the
// "Choose language" screen. Self-contained (own copy of the skyline helpers), so it needs no other script.

function fsSupertree(x, base, h, canopy) {
  let o = `<path d="M${x - 4} ${base} L${x - 2.4} ${base - h} L${x + 2.4} ${base - h} L${x + 4} ${base} Z" fill="#8a7664" />`;
  for (let i = -2; i <= 2; i++) o += `<path d="M${x} ${base - h + 4} Q${x + i * canopy * 0.4} ${base - h - 2} ${x + i * canopy * 0.95} ${base - h - 3}" fill="none" stroke="#8a7664" stroke-width="1.4" />`;
  o += `<ellipse cx="${x}" cy="${base - h - 3}" rx="${canopy}" ry="${canopy * 0.36}" fill="#b65c8f" />`;
  o += `<ellipse cx="${x}" cy="${base - h - 6}" rx="${canopy * 0.86}" ry="${canopy * 0.3}" fill="#4f9170" />`;
  for (let i = -3; i <= 3; i++) o += `<circle cx="${x + i * canopy * 0.28}" cy="${base - h - 1}" r="1.1" fill="#ffd9a0" />`;
  return o;
}

function fsFlyer(cx, cy, r) {
  // the legs run all the way down to the water's edge (y 204), so the wheel stands on the ground
  let o = `<polygon points="${cx - 15},206 ${cx},${cy} ${cx + 15},206" fill="none" stroke="#a9bfd6" stroke-width="2.4" />`;
  o += `<line x1="${cx - 11}" y1="${cy + r + 22}" x2="${cx + 11}" y2="${cy + r + 22}" stroke="#a9bfd6" stroke-width="1.4" />`;
  o += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#a9bfd6" stroke-width="2.4" />`;
  for (let a = 0; a < 180; a += 30) {
    const dx = r * Math.cos((a * Math.PI) / 180), dy = r * Math.sin((a * Math.PI) / 180);
    o += `<line x1="${(cx - dx).toFixed(1)}" y1="${(cy - dy).toFixed(1)}" x2="${(cx + dx).toFixed(1)}" y2="${(cy + dy).toFixed(1)}" stroke="#a9bfd6" stroke-width="1.2" />`;
  }
  for (let a = 0; a < 360; a += 30) {
    const px = cx + r * Math.cos((a * Math.PI) / 180), py = cy + r * Math.sin((a * Math.PI) / 180);
    o += `<rect x="${(px - 2.4).toFixed(1)}" y="${(py - 2).toFixed(1)}" width="4.8" height="4" rx="1.4" fill="#f4f8fb" stroke="#a9bfd6" stroke-width="1" />`;
  }
  return o;
}

function fsSkyline() {
  let s = `<g opacity="0.82">`;
  // CBD towers
  [[96, 118, 16, 96], [108, 98, 15, 116], [122, 130, 18, 84], [142, 112, 13, 102]].forEach(([x, y, w, h], i) => {
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${i % 2 ? "#b9a9c4" : "#a99ab8"}" /><rect x="${x}" y="${y}" width="${w * 0.14}" height="${h}" fill="#9486a6" opacity="0.7" />`;
    for (let r = 0; r < Math.floor(h / 8); r++) s += `<rect x="${x + 3}" y="${y + 5 + r * 8}" width="${w - 6}" height="1.6" fill="#e6d9ea" opacity="0.7" />`;
  });
  s += `<polygon points="108,98 123,98 115,88" fill="#a99ab8" />`;
  // Marina Bay Sands: three towers + the SkyPark
  [[172, 18], [193, 18], [214, 18]].forEach(([x, w]) => {
    s += `<polygon points="${x},206 ${x + w},206 ${x + w - 3},104 ${x + 3},104" fill="#c9bccf" /><polygon points="${x + w * 0.55},206 ${x + w},206 ${x + w - 3},104 ${x + w * 0.55 + 1},104" fill="#b3a5bd" />`;
    for (let r = 0; r < 12; r++) s += `<path d="M${x + 3} ${112 + r * 8} h${w - 6}" stroke="#ece3ee" stroke-width="1" opacity="0.7" />`;
  });
  s += `<path d="M160 104 H258 Q266 100 262 96 L168 96 Q156 98 160 104 Z" fill="#d6cad9" />`;
  s += `<rect x="172" y="96" width="82" height="2" fill="#f3ecf4" opacity="0.8" /><rect x="178" y="98" width="30" height="2.5" rx="1.2" fill="#9fd0e6" opacity="0.9" />`;
  // Supertrees
  s += fsSupertree(286, 206, 104, 17) + fsSupertree(316, 206, 134, 21) + fsSupertree(348, 206, 96, 15) + fsSupertree(376, 206, 118, 18);
  // Singapore Flyer
  s += fsFlyer(32, 122, 26);
  s += `</g>`;
  return s;
}

function buildFriendsScene() {
  let s = `<svg class="scene-svg" viewBox="0 74 390 74" preserveAspectRatio="xMidYMid slice" aria-hidden="true">`;
  s += `<defs>` +
    `<linearGradient id="frSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86b8e8" /><stop offset="0.45" stop-color="#f4c4a2" /><stop offset="1" stop-color="#ffe6b8" /></linearGradient>` +
    `<radialGradient id="frSun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff0b8" stop-opacity="1" /><stop offset="1" stop-color="#ffd48a" stop-opacity="0" /></radialGradient>` +
    `<linearGradient id="frWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9b9b8" /><stop offset="1" stop-color="#8fb6d4" /></linearGradient>` +
    `</defs>`;
  s += `<rect y="-34" width="390" height="274" fill="url(#frSky)" />`;
  s += `<circle cx="196" cy="176" r="120" fill="url(#frSun)" /><circle cx="196" cy="176" r="34" fill="#ffe08a" opacity="0.95" />`;
  s += `<g opacity="0.9"><rect x="14" y="70" width="84" height="6" rx="3" fill="#fff0e0" /><rect x="286" y="66" width="92" height="6" rx="3" fill="#fff0e0" /><rect x="304" y="78" width="60" height="5" rx="2.5" fill="#ffd9bd" /></g>`;
  s += fsSkyline();
  s += `<rect y="204" width="390" height="36" fill="url(#frWater)" />`;
  for (let i = 0; i < 8; i++) s += `<rect x="${176 + (i % 2) * 8 - i * 1.5}" y="${207 + i * 3.5}" width="${40 + (i % 3) * 8}" height="1.6" rx="0.8" fill="#fff0c0" opacity="${0.7 - i * 0.05}" />`;
  s += `</svg>`;
  return s;
}