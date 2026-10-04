// Builds the road map: an SVG backdrop (landmarks per zone + the road) and
// the HTML overlays (zone pills, level nodes, labels). The scene is drawn
// on a 390 x 1700 canvas; overlays are positioned in percentages of it so
// everything scales together on different phone widths.
const MAP_W = 390;
const MAP_H = 1700;

const NODE_POSITIONS = [
  { x: 150, y: 230 }, { x: 240, y: 350 }, { x: 150, y: 470 },
  { x: 240, y: 760 }, { x: 150, y: 880 }, { x: 240, y: 1000 },
  { x: 150, y: 1350 }, { x: 240, y: 1470 }, { x: 150, y: 1590 },
];

// Road between node n and node n+1 (curves ending at the next node).
const ROAD_START = "M150 180 L150 230";
const ROAD_SEGMENTS = [
  "C150 290 240 290 240 350",
  "C240 410 150 410 150 470",
  "C150 580 240 650 240 760",
  "C240 820 150 820 150 880",
  "C150 940 240 940 240 1000",
  "C240 1110 150 1190 150 1350",
  "C150 1410 240 1410 240 1470",
  "C240 1530 150 1530 150 1590",
];

const ZONE_BOUNDS = [
  { top: 0, height: 560 },
  { top: 560, height: 560 },
  { top: 1120, height: 580 },
];
const ZONE_PILL_TOPS = [14, 574, 1134];

// ---- landmark drawing helpers ----
function mapTree(x, base, s = 1) {
  return (
    `<rect x="${(x - 2 * s).toFixed(1)}" y="${(base - 14 * s).toFixed(1)}" width="${(4 * s).toFixed(1)}" height="${(14 * s).toFixed(1)}" fill="#8A6A4A" />` +
    `<circle cx="${x}" cy="${(base - 24 * s).toFixed(1)}" r="${(14 * s).toFixed(1)}" fill="#6FB383" />` +
    `<circle cx="${(x - 8 * s).toFixed(1)}" cy="${(base - 17 * s).toFixed(1)}" r="${(9 * s).toFixed(1)}" fill="#5FA676" />` +
    `<circle cx="${(x + 8 * s).toFixed(1)}" cy="${(base - 17 * s).toFixed(1)}" r="${(9 * s).toFixed(1)}" fill="#5FA676" />`
  );
}

function mapHdb(x, base, w, h, body, stripe) {
  let out = `<rect x="${x}" y="${base - h}" width="${w}" height="${h}" fill="${body}" />`;
  out += `<rect x="${x}" y="${base - h}" width="${w}" height="8" fill="${stripe}" />`;
  const cols = Math.max(1, Math.floor((w - 12) / 14));
  const rows = Math.max(1, Math.floor((h - 30) / 16));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out += `<rect x="${x + 8 + c * 14}" y="${base - h + 18 + r * 16}" width="8" height="9" rx="1" fill="#E8F1F8" />`;
    }
  }
  out += `<rect x="${(x + w * 0.3).toFixed(1)}" y="${base - 14}" width="${(w * 0.4).toFixed(1)}" height="14" fill="#7C8CA3" />`;
  return out;
}

function mapPavilion(x, y) {
  let out = `<rect x="${x - 38}" y="${y}" width="76" height="8" rx="2" fill="#D9D3C3" />`;
  [-28, -10, 8, 26].forEach((dx) => {
    out += `<rect x="${x + dx}" y="${y - 30}" width="4" height="30" fill="#E8DFC8" />`;
  });
  out += `<polygon points="${x - 40},${y - 30} ${x},${y - 54} ${x + 40},${y - 30}" fill="#4E9C8A" />`;
  out += `<rect x="${x - 40}" y="${y - 32}" width="80" height="4" fill="#3E8574" />`;
  return out;
}

function mapUmbrellaTable(x, base) {
  let out = `<rect x="${x - 1.5}" y="${base - 44}" width="3" height="44" fill="#8A6A4A" />`;
  out += `<path d="M${x - 26} ${base - 44} a26 16 0 0 1 52 0 Z" fill="#D9534A" />`;
  out += `<path d="M${x - 13} ${base - 44} a13 16 0 0 1 26 0 Z" fill="#F7EBD2" opacity="0.85" />`;
  out += `<ellipse cx="${x}" cy="${base - 12}" rx="18" ry="5" fill="#F7EBD2" />`;
  out += `<rect x="${x - 2}" y="${base - 12}" width="4" height="12" fill="#8A6A4A" />`;
  out += `<rect x="${x - 26}" y="${base - 9}" width="8" height="9" rx="2" fill="#B7513A" /><rect x="${x + 18}" y="${base - 9}" width="8" height="9" rx="2" fill="#B7513A" />`;
  return out;
}

function mapHawkerCentre() {
  const base = 700;
  let out = `<rect x="24" y="${base - 60}" width="342" height="60" fill="#EAD2A8" />`;
  out += `<polygon points="12,${base - 60} 56,${base - 104} 334,${base - 104} 378,${base - 60}" fill="#B7513A" />`;
  out += `<text x="195" y="${base - 76}" text-anchor="middle" font-family="'Noto Sans SC', sans-serif" font-weight="700" font-size="17" fill="#FFF6E5">小贩中心</text>`;
  const sw = 342 / 6;
  for (let i = 0; i < 6; i++) {
    const col = i % 2 === 0 ? "#D9534A" : "#F7EBD2";
    const x = 24 + i * sw;
    out += `<rect x="${x.toFixed(1)}" y="${base - 60}" width="${sw.toFixed(1)}" height="14" fill="${col}" />`;
    out += `<path d="M${x.toFixed(1)} ${base - 46} a${(sw / 2).toFixed(1)} ${(sw / 2).toFixed(1)} 0 0 0 ${sw.toFixed(1)} 0 Z" fill="${col}" />`;
    out += `<rect x="${(x + 6).toFixed(1)}" y="${base - 28}" width="${(sw - 12).toFixed(1)}" height="28" fill="#8A5A3C" />`;
  }
  out += `<path d="M14 ${base - 112} Q195 ${base - 86} 376 ${base - 112}" fill="none" stroke="#9AA6B8" stroke-width="1.5" />`;
  [[44, -102], [92, -95], [146, -91], [195, -90], [244, -91], [298, -95], [346, -102]].forEach(([lx, dy]) => {
    const ly = base + dy;
    out += `<rect x="${lx - 1}" y="${ly}" width="2" height="5" fill="#9AA6B8" /><ellipse cx="${lx}" cy="${ly + 11}" rx="6" ry="7.5" fill="#E0463A" />`;
  });
  return out;
}

function mapMbs(base) {
  let out = "";
  [262, 292, 322].forEach((x) => {
    out += `<rect x="${x}" y="${base - 108}" width="20" height="108" fill="#DCE5EE" />`;
    out += `<rect x="${x + 8}" y="${base - 108}" width="4" height="108" fill="#C5D2DF" />`;
  });
  out += `<path d="M246 ${base - 122} H372 V${base - 114} H340 Q330 ${base - 110} 320 ${base - 114} H246 Z" fill="#B9C8D6" />`;
  out += `<rect x="246" y="${base - 122}" width="126" height="3" fill="#CFDBE6" />`;
  return out;
}

function mapSupertree(x, base, h, canopy) {
  let out = `<polygon points="${x - 5},${base} ${x + 5},${base} ${x + 2},${base - h} ${x - 2},${base - h}" fill="#7B6A58" />`;
  out += `<ellipse cx="${x}" cy="${base - h}" rx="${canopy}" ry="${(canopy * 0.38).toFixed(1)}" fill="#B65C8F" />`;
  out += `<ellipse cx="${x}" cy="${base - h - 3}" rx="${(canopy * 0.8).toFixed(1)}" ry="${(canopy * 0.3).toFixed(1)}" fill="#4F9170" />`;
  return out;
}

function mapFlyer(cx, cy, r) {
  let out = `<polygon points="${cx - 14},${cy + r + 30} ${cx},${cy} ${cx + 14},${cy + r + 30}" fill="none" stroke="#8FA3B8" stroke-width="3" />`;
  out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#8FA3B8" stroke-width="3" />`;
  for (let a = 0; a < 180; a += 45) {
    const dx = r * Math.cos((a * Math.PI) / 180);
    const dy = r * Math.sin((a * Math.PI) / 180);
    out += `<line x1="${(cx - dx).toFixed(1)}" y1="${(cy - dy).toFixed(1)}" x2="${(cx + dx).toFixed(1)}" y2="${(cy + dy).toFixed(1)}" stroke="#8FA3B8" stroke-width="2" />`;
  }
  for (let a = 0; a < 360; a += 45) {
    const px = cx + r * Math.cos((a * Math.PI) / 180);
    const py = cy + r * Math.sin((a * Math.PI) / 180);
    out += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.5" fill="#F7FAFC" stroke="#8FA3B8" stroke-width="1.5" />`;
  }
  return out;
}

function mapRipples(points) {
  return points
    .map(([x, y]) => `<path d="M${x} ${y} q8 -5 16 0 t16 0 t16 0" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity="0.7" />`)
    .join("");
}

// lockedZones: array of booleans, one per zone. currentLevel drives how
// much of the road is shown as completed.
function buildMapSvg(lockedZones, currentLevel) {
  let s = `<svg class="map-svg" viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="xMidYMin slice" aria-hidden="true">`;
  s += `<rect x="0" y="0" width="390" height="560" fill="#D4E9D6" />`;
  s += `<rect x="0" y="560" width="390" height="560" fill="#F3E4C8" />`;
  s += `<rect x="0" y="1120" width="390" height="580" fill="#BFE1F2" />`;

  // Zone 1: Void Deck
  s += `<rect x="0" y="160" width="390" height="18" fill="#C3DEC7" />`;
  s += mapHdb(14, 160, 74, 104, "#9DBFDF", "#7FA6CA") + mapHdb(94, 160, 56, 80, "#EBB9B0", "#D99C92");
  s += mapHdb(236, 160, 66, 96, "#F3E0B0", "#E0C98A") + mapHdb(308, 160, 70, 112, "#9DBFDF", "#7FA6CA");
  s += mapTree(172, 164, 0.9) + mapTree(206, 164, 0.8);
  s += mapPavilion(332, 360) + mapTree(52, 262, 1) + mapTree(46, 480, 1.1) + mapTree(84, 506, 0.9) + mapTree(340, 470, 1);

  // Zone 2: Hawker Centre
  s += `<rect x="0" y="700" width="390" height="18" fill="#E6D3AE" />`;
  s += mapHawkerCentre();
  s += mapUmbrellaTable(330, 790) + mapUmbrellaTable(60, 910) + mapUmbrellaTable(332, 1030);

  // Zone 3: Marina Bay
  s += `<rect x="0" y="1260" width="390" height="18" fill="#A9D3EA" />`;
  s += mapMbs(1260) + mapSupertree(44, 1260, 84, 26) + mapSupertree(94, 1260, 108, 32);
  s += mapRipples([[30, 1400], [300, 1380], [300, 1540], [190, 1650], [40, 1470]]) + mapFlyer(66, 1560, 32);

  // Fade zones the player has not reached yet.
  lockedZones.forEach((locked, i) => {
    if (locked) s += `<rect x="0" y="${ZONE_BOUNDS[i].top}" width="390" height="${ZONE_BOUNDS[i].height}" fill="#F4F7FA" opacity="0.45" />`;
  });

  // Road: kerb, asphalt, centre dashes, then the completed stretch in amber.
  const roadD = ROAD_START + " " + ROAD_SEGMENTS.join(" ");
  s += `<path d="${roadD}" fill="none" stroke="#EEF2F6" stroke-width="50" stroke-linecap="round" stroke-linejoin="round" />`;
  s += `<path d="${roadD}" fill="none" stroke="#434B5C" stroke-width="44" stroke-linecap="round" stroke-linejoin="round" />`;
  s += `<path d="${roadD}" fill="none" stroke="#F4F1E6" stroke-width="3" stroke-dasharray="10 12" />`;
  const completedSegments = Math.max(0, Math.min(currentLevel - 1, ROAD_SEGMENTS.length));
  if (completedSegments > 0) {
    const doneD = ROAD_START + " " + ROAD_SEGMENTS.slice(0, completedSegments).join(" ");
    s += `<path d="${doneD}" fill="none" stroke="#F2A93B" stroke-width="4" stroke-linecap="round" />`;
  }
  s += `</svg>`;
  return s;
}

function pct(value, total) {
  return ((value / total) * 100).toFixed(3) + "%";
}

function buildZonePills(lockedZones) {
  return ZONES.map((zone, i) => {
    const locked = lockedZones[i];
    return `<div class="zone-pill${locked ? " is-locked" : ""}" style="top:${pct(ZONE_PILL_TOPS[i], MAP_H)}"><span class="zone-num">ZONE ${i + 1}</span><span class="zone-name">${zone.name}</span>${locked ? icon("lock", 14) : ""}</div>`;
  }).join("");
}

function buildNodes(states) {
  return NODE_POSITIONS.map((pos, i) => {
    const level = i + 1;
    const state = states[i];
    const game = getMiniGameForLevel(level);
    const side = pos.x < 200 ? "right" : "left";
    const radius = state === "current" ? 36 : 30;
    const label = `<span class="node-label ${side}"><span class="node-label-level">Level ${level}</span><span class="node-label-game">${game.name}</span></span>`;
    let node;
    if (state === "locked") {
      node = `<span class="node node-locked" role="img" aria-label="Level ${level}, ${game.name}, locked">${icon("lock", 24)}</span>`;
    } else if (state === "done") {
      node = `<button type="button" class="node node-done" data-level="${level}" data-state="done" aria-label="Level ${level}, ${game.name}, completed. Replay">${icon("check", 28)}</button>`;
    } else {
      node = `<button type="button" class="node node-current" data-level="${level}" data-state="current" aria-label="Level ${level}, ${game.name}. Start">${icon(game.icon, 32)}</button>`;
    }
    return `<div class="node-wrap" style="left:${pct(pos.x, MAP_W)};top:${pct(pos.y, MAP_H)};--r:${radius}px">${node}${label}</div>`;
  }).join("");
}

// states: array of "done" | "current" | "locked", one per level.
function buildMapHtml(states, currentLevel) {
  const lockedZones = ZONES.map((zone) => zone.levels.every((n) => states[n - 1] === "locked"));
  return buildMapSvg(lockedZones, currentLevel) + buildZonePills(lockedZones) + buildNodes(states);
}