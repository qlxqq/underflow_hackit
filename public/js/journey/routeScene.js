// The "MRT line" map: levels are stations on a transit-style route. Each
// zone is its own line colour, joined at an interchange board, with
// Singapore scenery beside the line. Pieces are kept separate so a zone's
// scenery can be swapped or enlarged later without touching the route.

const ROUTE_ZONE_H = 240;
const ROUTE_COLOURS = ["#2f9e5a", "#e8872a", "#2f6fd6"]; // green, orange, blue lines

// The line enters at the top (x 64), jogs right past the third station, and
// jogs back to x 64 at the bottom so it joins the next zone's line.
const ROUTE_POINTS = [[64, 0], [64, 134], [104, 174], [104, 200], [64, 240]];

// `via` = how many of ROUTE_POINTS come before this station along the line.
const ROUTE_STATIONS = [
  { x: 64, y: 84, via: 1 },
  { x: 64, y: 134, via: 2 },
  { x: 104, y: 187, via: 3 },
];

// ---------- geometry ----------
function routePointsToPath(points) {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");
}

function routeFullPath() {
  return routePointsToPath(ROUTE_POINTS);
}

// The line from the top of a zone down to the given station (0, 1 or 2).
function routePathTo(stationIndex) {
  const st = ROUTE_STATIONS[stationIndex];
  const pts = ROUTE_POINTS.slice(0, st.via).concat([[st.x, st.y]]);
  const clean = pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
  return routePointsToPath(clean);
}

// states: "done" | "current" | "locked" for every level in the journey.
function routeZoneStatus(zoneIndex, states) {
  const zoneStates = ZONES[zoneIndex].levels.map((n) => states[n - 1]);
  return {
    locked: zoneStates.every((s) => s === "locked"),
    allDone: zoneStates.every((s) => s === "done"),
    currentIndex: zoneStates.indexOf("current"),
  };
}

// ---------- ground ----------
function routeWave(top, amp, width = 430) {
  let d = "";
  for (let x = 0; x <= width; x += 6) {
    d += `${x === 0 ? "M" : "L"}${x} ${(top + amp * Math.sin((x / width) * Math.PI * 6)).toFixed(1)} `;
  }
  return d.trim();
}

const ROUTE_GROUND = [
  { base: "#d4e9d6", def: (id) => `<pattern id="${id}" width="44" height="44" patternUnits="userSpaceOnUse"><rect width="44" height="44" fill="#d4e9d6" /><path d="M6 14l2-6M10 14l1-5M30 36l2-6M34 36l1-5M36 12l2-5" stroke="#c2ddc6" stroke-width="2" stroke-linecap="round" fill="none" /></pattern>` },
  { base: "#f3e4c8", def: (id) => `<pattern id="${id}" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="#f3e4c8" /><path d="M0 .5H28M.5 0V28" stroke="#e8d5ae" stroke-width="1" /></pattern>` },
  { base: "#dbe6ef", def: (id) => `<pattern id="${id}" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="#dbe6ef" /><path d="M0 .5H28M.5 0V28" stroke="#c9d8e5" stroke-width="1" /></pattern>` },
];

function routeGround(z, locked) {
  const id = `rtPat${z}`;
  let s = `<svg class="rt-ground" viewBox="0 0 430 ${ROUTE_ZONE_H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">`;
  s += `<defs>${ROUTE_GROUND[z].def(id)}</defs>`;
  if (z === 0) {
    s += `<rect width="430" height="${ROUTE_ZONE_H}" fill="url(#${id})" />`;
  } else {
    // the previous zone's ground shows above a gentle wave
    s += `<rect width="430" height="16" fill="${ROUTE_GROUND[z - 1].base}" />`;
    s += `<path d="${routeWave(9, 5)} V${ROUTE_ZONE_H} H0 Z" fill="url(#${id})" />`;
    s += `<path d="${routeWave(9, 5)}" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.7" />`;
  }
  if (locked) s += `<rect width="430" height="${ROUTE_ZONE_H}" fill="#f4f7fa" opacity="0.42" />`;
  return s + `</svg>`;
}

// ---------- scenery, one piece per zone ----------
function routeScenery1() {
  let s = "";
  s += scHdb(30, 134, 58, 80, "#b9cfe2", "#8faecb", "#9db9d3", 0);
  s += scHdb(94, 134, 46, 62, "#ebcdc4", "#d6a89e", "#ddb3a9", 1);
  s += scPalm(164, 140, 58, 5);
  s += sgPlayground(30, 200) + sgChess(120, 206) + sgCat(166, 208);
  s += sgBike(70, 232) + scTree(176, 236, 0.8);
  return s;
}

function routeScenery2() {
  let s = "";
  // the roof, with ceiling fans and lanterns hanging from its beam
  s += `<rect x="0" y="0" width="190" height="17" fill="#7f9bb8" />`;
  for (let x = 4; x < 190; x += 8) s += `<path d="M${x} 0 V17" stroke="#6a87a6" stroke-width="2" />`;
  s += `<rect x="0" y="17" width="190" height="5" fill="#5f7794" /><rect x="0" y="22" width="190" height="2" fill="#1c2541" opacity="0.08" />`;
  // (kept to the right: the zone board sits over the left of the roof)
  s += sgFan(134, 36);
  [92, 176].forEach((x) => { s += sgLantern(x, 24); });
  // three stalls: Chinese, Malay and Tamil
  s += sgHawkerStall(4, 136, 58, "#d9534a", "chicken", { bg: "#b8322a", text: "鸡饭", font: SG_FONT_CJK, size: 11, fill: "#ffe08a" });
  s += sgHawkerStall(66, 136, 58, "#17a596", "satay", { bg: "#0f7a6f", text: "Satay", font: SG_FONT_UI, size: 10, fill: "#ffffff" });
  s += sgHawkerStall(128, 136, 58, "#f2a93b", "dosa", { bg: "#8e3b8f", text: "தோசை", font: SG_FONT_TAMIL, size: 10, fill: "#ffffff" });
  // a queue at the first stall
  s += sgPerson(18, 158, "#4a6cf0") + sgPerson(31, 160, "#e0463a", "#d9a679") + sgPerson(44, 158, "#17a596", "#f0c9a0");
  // tables with food and a chope packet, and the tray return
  s += sgChopeTable(66, 204) + sgBowl(57, 187) + sgCup(75, 187);
  s += sgChopeTable(138, 222) + sgBowl(129, 205) + sgCup(147, 205);
  s += sgTrayCart(172, 186);
  s += sgPlanter(178, 240);
  return s;
}

function routeScenery3() {
  let s = sgTrain(-30, 48, 3, "#d42e12");
  s += `<rect x="0" y="112" width="190" height="12" fill="#c9d2dc" />`;
  s += `<rect x="0" y="124" width="190" height="88" fill="#4a5163" /><rect x="0" y="124" width="190" height="3" fill="#6a7285" /><rect x="0" y="209" width="190" height="3" fill="#6a7285" />`;
  s += `<path d="M0 168 H190" stroke="#f4f1e6" stroke-width="2.4" stroke-dasharray="12 10" />`;
  s += sgBusStop(40, 118) + sgBus(52, 162, 0.9) + sgTaxi(122, 204, 1);
  s += sgLamp(176, 238) + sgPlanter(120, 238, 0.9);
  return s;
}

const ROUTE_SCENERY = [routeScenery1, routeScenery2, routeScenery3];

// ---------- the line, drawn left of the stations ----------
function routeLineSvg(z, status) {
  const c = ROUTE_COLOURS[z];
  let s = `<svg class="rt-line" viewBox="0 0 150 ${ROUTE_ZONE_H}" aria-hidden="true">`;
  // small things along the left edge
  if (z === 0) s += scPalm(24, 120, 52, 3) + scTree(26, 228, 0.8);
  if (z === 1) s += sgLamp(26, 124) + sgPlanter(26, 228);
  if (z === 2) s += sgLamp(26, 124) + scTree(26, 230, 0.8);
  if (status.locked) s += `<rect width="150" height="${ROUTE_ZONE_H}" fill="#f4f7fa" opacity="0.42" />`;

  const full = routeFullPath();
  s += `<path d="${full}" fill="none" stroke="#ffffff" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" />`;
  s += `<path d="${full}" fill="none" stroke="${c}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity="0.3" />`;
  let travelled = null;
  if (status.allDone) travelled = full;
  else if (status.currentIndex >= 0) travelled = routePathTo(status.currentIndex);
  if (travelled) s += `<path d="${travelled}" fill="none" stroke="${c}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />`;

  // the interchange where this zone's line begins
  s += `<circle cx="64" cy="31" r="13" fill="#ffffff" /><circle cx="64" cy="31" r="9" fill="#ffffff" stroke="${c}" stroke-width="4" /><circle cx="64" cy="31" r="3" fill="${c}" />`;
  return s + `</svg>`;
}

// ---------- stations ----------
// A station is a dot on the line plus a label. Only the dot can be tapped:
// it is a button for open and finished levels, and a plain dot when locked.
function routeStation(level, k, state) {
  const pos = ROUTE_STATIONS[k];
  const game = getMiniGameForLevel(level);
  const style = `left:${pos.x - 22}px;top:${pos.y - 22}px`;
  const label = (hidden) => `<span class="station-label"${hidden ? ' aria-hidden="true"' : ""}><span class="station-level">Level ${level}</span><span class="station-game">${game.name}</span></span>`;
  if (state === "locked") {
    return `<div class="station is-locked" style="${style}" data-locked-level="${level}" role="img" aria-label="Level ${level}, ${game.name}, locked"><span class="station-dot"></span>${label(false)}</div>`;
  }
  const aria = state === "done" ? `Level ${level}, ${game.name}, completed. Replay` : `Level ${level}, ${game.name}. Start`;
  const dot = `<button type="button" class="station-dot" data-level="${level}" data-state="${state}" aria-label="${aria}">${state === "done" ? icon("check", 14) : ""}</button>`;
  return `<div class="station is-${state}" style="${style}">${dot}${label(true)}</div>`;
}

// states: array of "done" | "current" | "locked", one per level.
function buildRouteHtml(states) {
  let html = "";
  ZONES.forEach((zone, z) => {
    const status = routeZoneStatus(z, states);
    html += `<section class="route-zone${status.locked ? " is-locked" : ""}" style="--zone:${ROUTE_COLOURS[z]}" aria-label="${zone.name}">`;
    html += routeGround(z, status.locked);
    html += `<svg class="rt-scenery" viewBox="0 0 190 ${ROUTE_ZONE_H}" aria-hidden="true">${ROUTE_SCENERY[z]()}${status.locked ? `<rect width="190" height="${ROUTE_ZONE_H}" fill="#f4f7fa" opacity="0.42" />` : ""}</svg>`;
    html += routeLineSvg(z, status);
    html += `<h2 class="zone-board"><span class="zone-board-num">Zone ${z + 1}</span><span class="zone-board-name">${zone.name}</span>${status.locked ? icon("lock", 14) : ""}</h2>`;
    zone.levels.forEach((n, k) => { html += routeStation(n, k, states[n - 1]); });
    html += `</section>`;
  });
  return html;
}