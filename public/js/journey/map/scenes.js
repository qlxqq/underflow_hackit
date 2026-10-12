// Short illustrated strips at the top of the login and language screens.
// Gradient ids are prefixed per scene (lg = login, ln = language)

// ---------- shared helpers ----------
function scCloud(x, y, s = 1, opacity = 0.9) {
  return `<g opacity="${opacity}">` +
    `<ellipse cx="${x + 24 * s}" cy="${y + 14 * s}" rx="${34 * s}" ry="${9 * s}" fill="#dcebf6" />` +
    `<circle cx="${x}" cy="${y}" r="${13 * s}" fill="#ffffff" /><circle cx="${x + 17 * s}" cy="${y - 8 * s}" r="${18 * s}" fill="#ffffff" />` +
    `<circle cx="${x + 38 * s}" cy="${y - 1 * s}" r="${14 * s}" fill="#ffffff" /><rect x="${x - 5 * s}" y="${y}" width="${48 * s}" height="${13 * s}" rx="${6.5 * s}" fill="#ffffff" />` +
    `</g>`;
}

function scTree(x, base, s = 1) {
  return `<ellipse cx="${x}" cy="${base + 1}" rx="${15 * s}" ry="${3.6 * s}" fill="#1c2541" opacity="0.1" />` +
    `<rect x="${x - 2 * s}" y="${base - 15 * s}" width="${4 * s}" height="${15 * s}" fill="#8a6a4a" />` +
    `<circle cx="${x}" cy="${base - 25 * s}" r="${13 * s}" fill="#4a9565" />` +
    `<circle cx="${x - 8 * s}" cy="${base - 19 * s}" r="${9 * s}" fill="#4a9565" /><circle cx="${x + 8 * s}" cy="${base - 19 * s}" r="${9 * s}" fill="#4a9565" />` +
    `<circle cx="${x}" cy="${base - 27 * s}" r="${11 * s}" fill="#5fae7a" />` +
    `<circle cx="${x - 7 * s}" cy="${base - 21 * s}" r="${7 * s}" fill="#5fae7a" /><circle cx="${x + 7 * s}" cy="${base - 21 * s}" r="${7 * s}" fill="#5fae7a" />` +
    `<circle cx="${x - 4 * s}" cy="${base - 30 * s}" r="${5 * s}" fill="#7cc794" opacity="0.9" />`;
}

function scPalm(x, base, h, lean = 6) {
  const tx = x + lean, ty = base - h;
  let o = `<ellipse cx="${x}" cy="${base + 1}" rx="10" ry="2.6" fill="#1c2541" opacity="0.1" />`;
  o += `<path d="M${x} ${base} Q${x + lean * 0.2} ${base - h * 0.55} ${tx} ${ty}" fill="none" stroke="#9a7c58" stroke-width="4.5" stroke-linecap="round" />`;
  const L = 22;
  [-165, -135, -105, -75, -45, -15, 20, 160].forEach((a, i) => {
    o += `<path transform="translate(${tx} ${ty}) rotate(${a})" d="M0 0 Q${L * 0.5} ${-L * 0.34} ${L} ${L * 0.22} Q${L * 0.5} ${-L * 0.04} 0 0 Z" fill="${i % 2 ? "#3f8f5c" : "#56a870"}" />`;
  });
  o += `<circle cx="${tx}" cy="${ty + 2}" r="3" fill="#6b4a2e" />`;
  return o;
}

// An HDB block: shaded side, floors of windows, a stair core, a line of
// laundry, a rooftop tank and a void deck at the bottom.
function scHdb(x, base, w, h, body, shade, trim, seed = 0) {
  const top = base - h;
  let o = `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${body}" />`;
  o += `<rect x="${x}" y="${top}" width="${(w * 0.1).toFixed(1)}" height="${h}" fill="${shade}" opacity="0.55" />`;
  o += `<rect x="${x}" y="${top - 5}" width="${w}" height="5" fill="${trim}" /><rect x="${x}" y="${top - 5}" width="${w}" height="1.6" fill="#ffffff" opacity="0.4" />`;
  if (seed % 2 === 0) {
    o += `<rect x="${(x + w * 0.64).toFixed(1)}" y="${top - 13}" width="${(w * 0.2).toFixed(1)}" height="8" rx="2" fill="${shade}" /><rect x="${(x + w * 0.64).toFixed(1)}" y="${top - 14}" width="${(w * 0.2).toFixed(1)}" height="3" rx="1.5" fill="${trim}" />`;
  }
  const floorH = 14, floors = Math.max(1, Math.floor((h - 24) / floorH));
  const cols = Math.max(2, Math.floor((w - 16) / 13));
  const gap = (w - 16) / cols;
  const coreX = x + w * 0.6;
  o += `<rect x="${(coreX - 3).toFixed(1)}" y="${top}" width="7" height="${h - 16}" fill="${shade}" opacity="0.38" />`;
  for (let f = 0; f < floors; f++) {
    const y = top + 8 + f * floorH;
    o += `<rect x="${x}" y="${(y + 10.4).toFixed(1)}" width="${w}" height="1.4" fill="#ffffff" opacity="0.25" />`;
    for (let c = 0; c < cols; c++) {
      const wx = x + 8 + c * gap + (gap - 8) / 2;
      if (Math.abs(wx + 4 - coreX) < 6) continue;
      const curtain = (f * 7 + c * 3 + seed) % 9 === 0;
      o += `<rect x="${wx.toFixed(1)}" y="${y}" width="8" height="9" rx="1.2" fill="${curtain ? "#c9ddee" : "#eaf4fb"}" />`;
      o += `<rect x="${(wx - 1).toFixed(1)}" y="${y + 9}" width="10" height="1.5" fill="${trim}" opacity="0.85" />`;
    }
  }
  // laundry on a bamboo pole - a very HDB detail
  const clothes = ["#e0463a", "#f2a93b", "#4a6cf0", "#ffffff", "#17a596"];
  const f = seed % floors;
  const ly = top + 8 + f * floorH + 3;
  const px = x + 6 + ((seed * 13) % Math.max(10, Math.floor(w - 30)));
  o += `<rect x="${px}" y="${ly}" width="22" height="1.5" fill="#9a7c58" />`;
  for (let i = 0; i < 3; i++) o += `<rect x="${px + 2 + i * 7}" y="${ly + 1.5}" width="5" height="${6 + (i % 2) * 3}" fill="${clothes[(seed + i) % clothes.length]}" opacity="0.92" />`;
  // void deck
  o += `<rect x="${x}" y="${base - 16}" width="${w}" height="16" fill="#52617a" />`;
  const bays = Math.max(2, Math.floor(w / 18));
  for (let b = 0; b < bays; b++) {
    const bx = x + 3 + b * ((w - 6) / bays);
    o += `<rect x="${bx.toFixed(1)}" y="${base - 14}" width="${((w - 6) / bays - 5).toFixed(1)}" height="14" fill="#2f3b52" />`;
    o += `<rect x="${(bx + ((w - 6) / bays - 5)).toFixed(1)}" y="${base - 16}" width="5" height="16" fill="${body}" opacity="0.9" />`;
  }
  return o;
}

// =====================================================================
// LOGIN: an HDB estate on a bright morning 
// =====================================================================
function buildLoginScene() {
  let s = `<svg class="scene-svg" viewBox="0 0 390 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">`;
  s += `<defs>` +
    `<linearGradient id="lgSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86c9ee" /><stop offset="0.75" stop-color="#d3ecf9" /><stop offset="1" stop-color="#edf8fd" /></linearGradient>` +
    `<radialGradient id="lgSun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff6c0" stop-opacity="0.9" /><stop offset="1" stop-color="#fff6c0" stop-opacity="0" /></radialGradient>` +
    `<linearGradient id="lgGrass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe0c2" /><stop offset="1" stop-color="#a3d3a6" /></linearGradient>` +
    `</defs>`;
  s += `<rect width="390" height="260" fill="url(#lgSky)" />`;
  s += `<circle cx="344" cy="36" r="66" fill="url(#lgSun)" /><circle cx="344" cy="36" r="17" fill="#ffe27a" />`;
  s += scCloud(8, 128, 0.6, 0.85) + scCloud(300, 126, 0.55, 0.85);

  // faint far skyline
  s += `<g opacity="0.55">`;
  [[0, 160, 26, 72], [26, 146, 24, 86], [150, 168, 24, 64], [264, 156, 28, 76], [352, 150, 38, 82]].forEach(([x, y, w, h]) => {
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#bcd5e8" /><rect x="${x}" y="${y}" width="${w * 0.12}" height="${h}" fill="#a9c6dd" />`;
  });
  s += `</g>`;

  // HDB blocks in soft, muted tones
  s += scHdb(6, 232, 84, 96, "#b9cfe2", "#8faecb", "#9db9d3", 0);
  s += scHdb(94, 232, 58, 72, "#ebcdc4", "#d6a89e", "#ddb3a9", 1);
  s += scHdb(238, 232, 66, 84, "#efe1c3", "#d9c58f", "#e1ce9c", 2);
  s += scHdb(310, 232, 76, 100, "#b9cfe2", "#8faecb", "#9db9d3", 3);

  // ground, palms, trees
  s += `<rect y="232" width="390" height="28" fill="url(#lgGrass)" />`;
  s += `<rect y="232" width="390" height="3" fill="#1c2541" opacity="0.07" />`;
  s += `<path d="M0 252 Q195 244 390 252" fill="none" stroke="#e8e3d5" stroke-width="5" />`;
  s += scPalm(166, 240, 56, 6) + scPalm(222, 240, 50, -6);
  s += scTree(30, 246, 0.9) + scTree(372, 246, 0.85);
  s += `</svg>`;
  return s;
}

// =====================================================================
// LANGUAGE: Singapore's landmark skyline at golden hour 
// =====================================================================
function scSupertree(x, base, h, canopy) {
  let o = `<path d="M${x - 3.6} ${base} L${x - 2.2} ${base - h} L${x + 2.2} ${base - h} L${x + 3.6} ${base} Z" fill="#8a7664" />`;
  for (let i = -2; i <= 2; i++) o += `<path d="M${x} ${base - h + 4} Q${x + i * canopy * 0.4} ${base - h - 2} ${x + i * canopy * 0.95} ${base - h - 3}" fill="none" stroke="#8a7664" stroke-width="1.2" />`;
  o += `<ellipse cx="${x}" cy="${base - h - 3}" rx="${canopy}" ry="${canopy * 0.36}" fill="#b65c8f" />`;
  o += `<ellipse cx="${x}" cy="${base - h - 6}" rx="${canopy * 0.86}" ry="${canopy * 0.3}" fill="#4f9170" />`;
  for (let i = -3; i <= 3; i++) o += `<circle cx="${x + i * canopy * 0.28}" cy="${base - h - 1}" r="1" fill="#ffd9a0" />`;
  return o;
}

function scFlyer(cx, cy, r) {
  let o = `<polygon points="${cx - 10},${cy + r + 24} ${cx},${cy} ${cx + 10},${cy + r + 24}" fill="none" stroke="#a9bfd6" stroke-width="2.2" />`;
  o += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#a9bfd6" stroke-width="2.2" />`;
  for (let a = 0; a < 180; a += 30) {
    const dx = r * Math.cos((a * Math.PI) / 180), dy = r * Math.sin((a * Math.PI) / 180);
    o += `<line x1="${(cx - dx).toFixed(1)}" y1="${(cy - dy).toFixed(1)}" x2="${(cx + dx).toFixed(1)}" y2="${(cy + dy).toFixed(1)}" stroke="#a9bfd6" stroke-width="1.1" />`;
  }
  for (let a = 0; a < 360; a += 30) {
    const px = cx + r * Math.cos((a * Math.PI) / 180), py = cy + r * Math.sin((a * Math.PI) / 180);
    o += `<rect x="${(px - 2.2).toFixed(1)}" y="${(py - 1.8).toFixed(1)}" width="4.4" height="3.6" rx="1.2" fill="#f4f8fb" stroke="#a9bfd6" stroke-width="0.9" />`;
  }
  return o;
}

// Marina Bay Sands: three towers with the SkyPark across the top.
function scMbs(x0, base, top) {
  let o = "";
  [0, 21, 42].forEach((dx) => {
    const x = x0 + dx, w = 16;
    o += `<polygon points="${x},${base} ${x + w},${base} ${x + w - 3},${top} ${x + 3},${top}" fill="#c9bccf" /><polygon points="${x + w * 0.55},${base} ${x + w},${base} ${x + w - 3},${top} ${x + w * 0.55 + 1},${top}" fill="#b3a5bd" />`;
    for (let r = 0; r < Math.floor((base - top) / 8); r++) o += `<path d="M${x + 3} ${top + 8 + r * 8} h${w - 6}" stroke="#ece3ee" stroke-width="1" opacity="0.7" />`;
  });
  o += `<path d="M${x0 - 12} ${top} H${x0 + 82} Q${x0 + 92} ${top - 4} ${x0 + 88} ${top - 8} L${x0 - 6} ${top - 8} Q${x0 - 16} ${top - 6} ${x0 - 12} ${top} Z" fill="#d6cad9" />`;
  o += `<rect x="${x0 - 4}" y="${top - 8}" width="86" height="2" fill="#f3ecf4" opacity="0.8" /><rect x="${x0 + 2}" y="${top - 6}" width="28" height="2.4" rx="1.2" fill="#9fd0e6" opacity="0.9" />`;
  return o;
}

// ArtScience Museum: a lotus of pale curved fingers.
function scLotus(cx, base) {
  let o = "";
  [[-18, 22], [-9, 28], [0, 32], [9, 28], [18, 22]].forEach(([dx, h]) => {
    o += `<path d="M${cx + dx * 0.3 - 3} ${base} Q${cx + dx * 1.2 - 2} ${base - h * 0.6} ${cx + dx * 1.7} ${base - h} Q${cx + dx * 0.9 + 3} ${base - h * 0.5} ${cx + dx * 0.3 + 6} ${base} Z" fill="#d9cde0" />`;
  });
  o += `<ellipse cx="${cx}" cy="${base}" rx="16" ry="3" fill="#cbbfd1" />`;
  return o;
}

// Esplanade: two domes covered in a diamond lattice.
function scEsplanade(x, base) {
  let o = "";
  [[x, 17, 13], [x + 26, 15, 10]].forEach(([cx, rx, ry]) => {
    o += `<path d="M${cx - rx} ${base} A${rx} ${ry * 1.7} 0 0 1 ${cx + rx} ${base} Z" fill="#c4b5cc" />`;
    o += `<path d="M${cx - rx} ${base} A${rx} ${ry * 1.7} 0 0 1 ${cx + rx} ${base} Z" fill="none" stroke="#e6dcea" stroke-width="1" opacity="0.75" />`;
    for (let i = -2; i <= 2; i++) o += `<path d="M${cx + i * rx * 0.4} ${base} L${cx} ${base - ry * 1.5}" stroke="#e6dcea" stroke-width="0.8" opacity="0.7" />`;
  });
  return o;
}

function buildLanguageScene() {
  let s = `<svg class="scene-svg" viewBox="0 0 390 170" preserveAspectRatio="xMidYMax slice" aria-hidden="true">`;
  s += `<defs>` +
    `<linearGradient id="lnSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8bbdeb" /><stop offset="0.55" stop-color="#f3c7a6" /><stop offset="1" stop-color="#ffe7bd" /></linearGradient>` +
    `<radialGradient id="lnSun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff0b8" stop-opacity="1" /><stop offset="1" stop-color="#ffd48a" stop-opacity="0" /></radialGradient>` +
    `<linearGradient id="lnWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3c4b2" /><stop offset="1" stop-color="#8eb5d3" /></linearGradient>` +
    `</defs>`;
  s += `<rect width="390" height="170" fill="url(#lnSky)" />`;
  s += `<circle cx="206" cy="112" r="96" fill="url(#lnSun)" /><circle cx="206" cy="116" r="24" fill="#ffe08a" opacity="0.95" />`;
  s += `<g opacity="0.9"><rect x="14" y="40" width="70" height="5" rx="2.5" fill="#fff0e0" /><rect x="36" y="50" width="50" height="4" rx="2" fill="#ffd9bd" /><rect x="296" y="34" width="76" height="5" rx="2.5" fill="#fff0e0" /><rect x="312" y="44" width="50" height="4" rx="2" fill="#ffd9bd" /></g>`;

  // the landmarks, in a soft haze
  s += `<g opacity="0.9">`;
  [[84, 70, 14, 68], [96, 56, 13, 82], [109, 80, 16, 58], [125, 66, 12, 72]].forEach(([x, y, w, h], i) => {
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${i % 2 ? "#b9a9c4" : "#a99ab8"}" /><rect x="${x}" y="${y}" width="${w * 0.14}" height="${h}" fill="#9486a6" opacity="0.7" />`;
    for (let r = 0; r < Math.floor(h / 8); r++) s += `<rect x="${x + 3}" y="${y + 5 + r * 8}" width="${w - 6}" height="1.5" fill="#e6d9ea" opacity="0.7" />`;
  });
  s += scFlyer(40, 92, 24);
  s += scMbs(172, 140, 60);
  s += scLotus(262, 140);
  s += scEsplanade(298, 140);
  s += scSupertree(344, 140, 66, 14) + scSupertree(364, 140, 88, 17) + scSupertree(382, 140, 58, 12);
  s += `</g>`;

  // Marina Bay with a gold reflection
  s += `<rect y="138" width="390" height="32" fill="url(#lnWater)" />`;
  for (let i = 0; i < 7; i++) s += `<rect x="${186 + (i % 2) * 8 - i}" y="${142 + i * 3.6}" width="${36 + (i % 3) * 8}" height="1.5" rx="0.8" fill="#fff0c0" opacity="${0.7 - i * 0.07}" />`;
  s += `<path d="M0 150 q12 -3 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.3" />`;
  s += `</svg>`;
  return s;
}

// =====================================================================
// LOGIN FOOTER: a quiet silhouette of the same estate
// Pale tints only, no gradients, so it sits calmly at the bottom of the page.
// =====================================================================
function buildFooterScene() {
  const far = "#dde8f2", near = "#cbdae8", win = "#eef4fa";
  let s = `<svg class="scene-svg" viewBox="0 0 390 84" preserveAspectRatio="xMidYMax slice" aria-hidden="true">`;
  const block = (x, w, h, tone, cols) => {
    let o = `<rect x="${x}" y="${84 - h}" width="${w}" height="${h}" fill="${tone}" />`;
    o += `<rect x="${x}" y="${84 - h}" width="${(w * 0.1).toFixed(1)}" height="${h}" fill="#1c2541" opacity="0.05" />`;
    for (let r = 0; r < Math.floor((h - 14) / 11); r++) {
      for (let c = 0; c < cols; c++) {
        const wx = x + 7 + c * ((w - 14) / cols) + ((w - 14) / cols - 5) / 2;
        o += `<rect x="${wx.toFixed(1)}" y="${84 - h + 6 + r * 11}" width="5" height="6" rx="1" fill="${win}" />`;
      }
    }
    return o;
  };
  // far row, then a nearer row
  [[10, 44, 44], [74, 36, 52], [120, 40, 38], [248, 38, 48], [300, 44, 40], [350, 40, 54]].forEach(([x, w, h]) => { s += block(x, w, h, far, 3); });
  [[-6, 56, 54], [52, 40, 40], [96, 48, 62], [268, 54, 58], [326, 40, 44], [364, 34, 66]].forEach(([x, w, h]) => { s += block(x, w, h, near, 3); });
  // two palms in the same tint
  [[176, 50, 5], [214, 44, -5]].forEach(([x, h, lean]) => {
    const tx = x + lean, ty = 84 - h;
    s += `<path d="M${x} 84 Q${x + lean * 0.2} ${84 - h * 0.55} ${tx} ${ty}" fill="none" stroke="${near}" stroke-width="4" stroke-linecap="round" />`;
    [-160, -125, -90, -55, -20, 20].forEach((a) => {
      s += `<path transform="translate(${tx} ${ty}) rotate(${a})" d="M0 0 Q11 -8 22 5 Q11 -1 0 0 Z" fill="${near}" />`;
    });
  });
  s += `<rect y="82" width="390" height="2" fill="${near}" />`;
  s += `</svg>`;
  return s;
}