// Each function returns SVG markup. (x, base) is where the item stands, with
// `base` being the ground line; items are drawn upwards from there.

function sgShadow(cx, cy, rx, ry = 3) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#1c2541" opacity="0.13" />`;
}

// A double-decker public bus, facing right (about 104 wide at scale 1).
function sgBus(x, base, s = 1) {
  let o = sgShadow(52, 2, 52, 4);
  o += `<rect x="0" y="-56" width="104" height="50" rx="7" fill="#f6f6f3" />`;
  o += `<rect x="0" y="-31" width="104" height="5" fill="#d9402f" /><rect x="0" y="-12" width="104" height="6" fill="#e6e6e1" />`;
  for (let i = 0; i < 7; i++) o += `<rect x="${6 + i * 13.5}" y="-50" width="10" height="11" rx="2" fill="#3b4a63" />`;
  for (let i = 0; i < 4; i++) o += `<rect x="${6 + i * 13.5}" y="-24" width="10" height="10" rx="2" fill="#3b4a63" />`;
  o += `<rect x="62" y="-26" width="15" height="20" rx="2" fill="#aeb9c6" /><rect x="64" y="-24" width="5" height="16" fill="#3b4a63" opacity="0.8" /><rect x="70.5" y="-24" width="5" height="16" fill="#3b4a63" opacity="0.8" />`;
  o += `<rect x="84" y="-26" width="16" height="14" rx="2" fill="#3b4a63" />`;
  o += `<rect x="80" y="-55" width="21" height="5" rx="1" fill="#1c2541" /><path d="M83 -52.5 h4 M89 -52.5 h4 M95 -52.5 h3" stroke="#ffb347" stroke-width="1.6" stroke-linecap="round" />`;
  o += `<circle cx="101" cy="-9" r="2.4" fill="#ffd166" />`;
  [22, 82].forEach((wx) => { o += `<circle cx="${wx}" cy="-5" r="7.5" fill="#2f3b52" /><circle cx="${wx}" cy="-5" r="3" fill="#aeb9c6" />`; });
  return `<g transform="translate(${x} ${base}) scale(${s})">${o}</g>`;
}

// A taxi with a roof sign, facing right (about 58 wide).
function sgTaxi(x, base, s = 1) {
  let o = sgShadow(28, 2, 30, 3);
  o += `<rect x="0" y="-15" width="58" height="11" rx="4" fill="#2e6fd8" />`;
  o += `<polygon points="10,-15 18,-25 41,-25 49,-15" fill="#2e6fd8" />`;
  o += `<polygon points="13,-16 19,-23 28,-23 28,-16" fill="#cfe6fb" /><polygon points="31,-16 31,-23 40,-23 46,-16" fill="#cfe6fb" />`;
  o += `<rect x="24" y="-30" width="11" height="5" rx="1.5" fill="#ffd166" /><rect x="8" y="-10" width="42" height="2.2" fill="#ffffff" />`;
  o += `<circle cx="14" cy="-4" r="5" fill="#2f3b52" /><circle cx="45" cy="-4" r="5" fill="#2f3b52" /><circle cx="14" cy="-4" r="2" fill="#aeb9c6" /><circle cx="45" cy="-4" r="2" fill="#aeb9c6" />`;
  o += `<circle cx="57" cy="-10" r="1.8" fill="#ffd166" />`;
  return `<g transform="translate(${x} ${base}) scale(${s})">${o}</g>`;
}

// An MRT train on a raised track. `y` is the top of the train; each car is 72 wide.
function sgTrain(x, y, cars, stripe) {
  let o = `<rect x="${x - 6}" y="${y + 26}" width="${cars * 72 + 12}" height="7" fill="#aeb9c6" />`;
  for (let i = 0; i < cars + 1; i++) o += `<rect x="${x + 22 + i * 72}" y="${y + 33}" width="9" height="30" fill="#c3ccd7" />`;
  for (let i = 0; i < cars; i++) {
    const cx = x + i * 72;
    o += `<rect x="${cx}" y="${y}" width="70" height="26" rx="8" fill="#f2f5f8" stroke="#c9d3de" stroke-width="1.4" />`;
    o += `<rect x="${cx + 2}" y="${y + 16}" width="66" height="4" fill="${stripe}" />`;
    for (let w = 0; w < 5; w++) o += `<rect x="${cx + 8 + w * 12}" y="${y + 5}" width="9" height="8" rx="2" fill="#3b4a63" />`;
  }
  return o;
}

function sgBusStop(x, base) {
  return sgShadow(x, base + 1, 6, 2) +
    `<rect x="${x - 1.5}" y="${base - 44}" width="3" height="44" fill="#6e7d96" />` +
    `<rect x="${x - 11}" y="${base - 56}" width="22" height="16" rx="3" fill="#2f6fd6" />` +
    `<rect x="${x - 7}" y="${base - 52}" width="14" height="5" rx="1" fill="#ffffff" />` +
    `<rect x="${x - 7}" y="${base - 45}" width="9" height="2.4" rx="1" fill="#ffffff" opacity="0.8" />`;
}

function sgStool(x, base, colour = "#e0463a") {
  return `<rect x="${x - 5}" y="${base - 9}" width="10" height="9" rx="2.5" fill="${colour}" />`;
}

// A hawker-centre table with plastic stools and a "chope" tissue packet on it.
function sgChopeTable(x, base) {
  let o = sgShadow(x, base + 1, 22, 4);
  o += `<rect x="${x - 2}" y="${base - 16}" width="4" height="16" fill="#8a6a4a" />`;
  o += `<ellipse cx="${x}" cy="${base - 16}" rx="20" ry="6" fill="#f7ebd2" stroke="#d8c39a" stroke-width="1.2" />`;
  o += sgStool(x - 22, base, "#e0463a") + sgStool(x + 22, base, "#2f6fd6");
  o += `<g transform="rotate(-8 ${x} ${base - 20})"><rect x="${x - 4}" y="${base - 23}" width="9" height="7" rx="1.5" fill="#bfe0f5" /><rect x="${x - 4}" y="${base - 21}" width="9" height="2" fill="#ffffff" /></g>`;
  return o;
}

// A void-deck chess table with two stone stools.
function sgChess(x, base) {
  let o = sgShadow(x, base + 1, 22, 4);
  o += `<rect x="${x - 15}" y="${base - 15}" width="30" height="6" rx="1.5" fill="#c9b99f" />`;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2 === 0) o += `<rect x="${x - 15 + i * 7.5}" y="${base - 15 + j * 3}" width="7.5" height="3" fill="#8a7a62" />`;
  o += `<rect x="${x - 3}" y="${base - 9}" width="6" height="9" fill="#a89a82" />` + sgStool(x - 22, base, "#a89a82") + sgStool(x + 22, base, "#a89a82");
  return o;
}

// A community cat, sitting.
function sgCat(x, base) {
  return sgShadow(x, base + 1, 11, 2.4) +
    `<path d="M${x + 8} ${base - 4} q10 -2 8 -12" fill="none" stroke="#e8923a" stroke-width="3.4" stroke-linecap="round" />` +
    `<ellipse cx="${x}" cy="${base - 9}" rx="8.5" ry="9" fill="#e8923a" /><circle cx="${x}" cy="${base - 21}" r="6.6" fill="#e8923a" />` +
    `<polygon points="${x - 6},${base - 25} ${x - 3},${base - 31} ${x},${base - 26}" fill="#e8923a" /><polygon points="${x + 6},${base - 25} ${x + 3},${base - 31} ${x},${base - 26}" fill="#e8923a" />` +
    `<path d="M${x - 5} ${base - 13} l3 2 M${x + 5} ${base - 13} l-3 2 M${x - 3} ${base - 7} h6" stroke="#c9742a" stroke-width="1.6" stroke-linecap="round" />` +
    `<circle cx="${x - 2.4}" cy="${base - 21.5}" r="1" fill="#18233a" /><circle cx="${x + 2.4}" cy="${base - 21.5}" r="1" fill="#18233a" />`;
}

// A small playground: a slide, a ladder and a roof.
function sgPlayground(x, base) {
  let o = sgShadow(x + 22, base + 1, 30, 3);
  o += `<rect x="${x}" y="${base - 36}" width="3" height="36" fill="#6e7d96" /><rect x="${x + 22}" y="${base - 36}" width="3" height="36" fill="#6e7d96" />`;
  o += `<rect x="${x - 2}" y="${base - 38}" width="29" height="5" rx="2" fill="#f2a93b" />`;
  o += `<path d="M${x + 25} ${base - 33} Q${x + 46} ${base - 22} ${x + 52} ${base - 1} L${x + 44} ${base - 1} Q${x + 40} ${base - 16} ${x + 25} ${base - 26} Z" fill="#e0463a" />`;
  o += `<path d="M${x + 3} ${base - 30} L${x - 12} ${base} M${x + 6} ${base - 30} L${x - 8} ${base}" stroke="#2f6fd6" stroke-width="2" />`;
  [8, 16, 24].forEach((h) => { o += `<path d="M${(x - 11 + h * 0.18).toFixed(1)} ${base - h} h8" stroke="#2f6fd6" stroke-width="2" />`; });
  o += `<polygon points="${x - 4},${base - 38} ${x + 12},${base - 52} ${x + 29},${base - 38}" fill="#17a596" />`;
  return o;
}


function sgLantern(x, y) {
  return `<rect x="${x - 1}" y="${y}" width="2" height="6" fill="#9aa6b8" /><ellipse cx="${x}" cy="${y + 14}" rx="6" ry="8" fill="#e0463a" /><ellipse cx="${x - 1.6}" cy="${y + 12}" rx="1.6" ry="3.6" fill="#ff8a7a" opacity="0.7" /><rect x="${x - 1}" y="${y + 22}" width="2" height="5" fill="#f2a93b" />`;
}

function sgLamp(x, base) {
  return sgShadow(x, base + 1, 8, 3) +
    `<rect x="${x - 1.5}" y="${base - 56}" width="3" height="56" fill="#6e7d96" />` +
    `<path d="M${x - 1.5} ${base - 56} h14" stroke="#6e7d96" stroke-width="3" stroke-linecap="round" fill="none" />` +
    `<rect x="${x + 9}" y="${base - 56}" width="9" height="5" rx="2" fill="#f2c94c" />`;
}

function sgPlanter(x, base, s = 1) {
  return sgShadow(x, base + 1, 14 * s, 3) +
    `<path d="M${x - 9 * s} ${base - 12 * s} h${18 * s} l-${2 * s} ${12 * s} h-${14 * s} Z" fill="#b7673f" />` +
    `<ellipse cx="${x - 6 * s}" cy="${base - 17 * s}" rx="${5 * s}" ry="${9 * s}" fill="#4f9a6a" transform="rotate(-25 ${x - 6 * s} ${base - 14 * s})" />` +
    `<ellipse cx="${x + 6 * s}" cy="${base - 17 * s}" rx="${5 * s}" ry="${9 * s}" fill="#5fae7a" transform="rotate(25 ${x + 6 * s} ${base - 14 * s})" />` +
    `<ellipse cx="${x}" cy="${base - 20 * s}" rx="${5 * s}" ry="${10 * s}" fill="#6fbf8b" />`;
}

function sgBike(x, base) {
  return `<circle cx="${x - 9}" cy="${base - 7}" r="7" fill="none" stroke="#434b5c" stroke-width="2" />` +
    `<circle cx="${x + 9}" cy="${base - 7}" r="7" fill="none" stroke="#434b5c" stroke-width="2" />` +
    `<path d="M${x - 9} ${base - 7} L${x - 2} ${base - 17} L${x + 6} ${base - 17} L${x + 9} ${base - 7} M${x - 2} ${base - 17} L${x + 2} ${base - 7} L${x - 9} ${base - 7} M${x + 6} ${base - 17} L${x + 4} ${base - 21} h4" fill="none" stroke="#e0463a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`;
}

// ---------------------------------------------------------------------
// Hawker centre pieces
// ---------------------------------------------------------------------
const SG_FONT_CJK = "'Noto Sans SC', 'Noto Sans CJK SC', sans-serif";
const SG_FONT_TAMIL = "'Noto Sans Tamil', sans-serif";
const SG_FONT_UI = "'Manrope', sans-serif";

function sgSignboard(x, y, w, h, bg, text, font, size, fill = "#ffffff") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${bg}" />` +
    `<rect x="${x + 1.5}" y="${y + 1.5}" width="${w - 3}" height="${h - 3}" rx="2" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1" />` +
    `<text x="${x + w / 2}" y="${(y + h / 2 + size * 0.36).toFixed(1)}" text-anchor="middle" font-family="${font}" font-weight="700" font-size="${size}" fill="${fill}">${text}</text>`;
}

// A person standing in a queue (about 30 tall).
function sgPerson(x, base, shirt, skin = "#e8b890", pants = "#3b4a63") {
  return sgShadow(x, base + 1, 6, 1.8) +
    `<rect x="${x - 4}" y="${base - 10}" width="3.6" height="10" rx="1.6" fill="${pants}" /><rect x="${x + 0.4}" y="${base - 10}" width="3.6" height="10" rx="1.6" fill="${pants}" />` +
    `<rect x="${x - 5.5}" y="${base - 24}" width="11" height="15" rx="4.5" fill="${shirt}" />` +
    `<circle cx="${x}" cy="${base - 29}" r="4.8" fill="${skin}" /><path d="M${x - 4.8} ${base - 30} a4.8 4.8 0 0 1 9.6 0 Z" fill="#2b2f3a" />`;
}

// A ceiling fan hanging from the roof beam, seen from the side.
function sgFan(x, y) {
  return `<rect x="${x - 0.8}" y="${y - 14}" width="1.6" height="11" fill="#6a7a90" />` +
    `<rect x="${x - 4}" y="${y - 4}" width="8" height="5" rx="2" fill="#8794a8" />` +
    `<ellipse cx="${x - 15}" cy="${y - 1}" rx="14" ry="2.4" fill="#b4bfcd" /><ellipse cx="${x + 15}" cy="${y - 1}" rx="14" ry="2.4" fill="#b4bfcd" />`;
}

function sgBowl(x, y) {
  return `<path d="M${x - 6} ${y - 4} h12 a6 5.5 0 0 1 -12 0 Z" fill="#f6efe2" stroke="#d6c7a8" stroke-width="0.8" />` +
    `<ellipse cx="${x}" cy="${y - 4}" rx="6" ry="1.8" fill="#e8b45c" />` +
    `<path d="M${x - 2} ${y - 7} q-2 -3 0 -6 M${x + 2} ${y - 7} q-2 -3 0 -6" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity="0.9" />`;
}

function sgCup(x, y) {
  return `<path d="M${x - 4} ${y - 9} h8 l-1 9 h-6 Z" fill="#f4d6a0" stroke="#d9b878" stroke-width="0.8" />` +
    `<rect x="${x - 3.6}" y="${y - 8}" width="7.2" height="2.4" fill="#ffffff" opacity="0.7" />` +
    `<path d="M${x + 1} ${y - 9} l2 -6" stroke="#e0463a" stroke-width="1.4" stroke-linecap="round" />`;
}

// The cart where people return their trays.
function sgTrayCart(x, base) {
  let o = sgShadow(x, base + 1, 13, 2.6);
  o += `<rect x="${x - 11}" y="${base - 26}" width="2.4" height="24" fill="#6e7d96" /><rect x="${x + 8.6}" y="${base - 26}" width="2.4" height="24" fill="#6e7d96" />`;
  [[-24, "#2f6fd6"], [-16, "#e8872a"], [-8, "#2f6fd6"]].forEach(([dy, c]) => {
    o += `<rect x="${x - 12}" y="${base + dy}" width="24" height="3" rx="1" fill="${c}" /><rect x="${x - 9}" y="${base + dy - 3}" width="9" height="3" rx="1" fill="#f7ebd2" /><rect x="${x + 2}" y="${base + dy - 3}" width="7" height="3" rx="1" fill="#f7ebd2" />`;
  });
  o += `<circle cx="${x - 8}" cy="${base - 1}" r="2.2" fill="#2f3b52" /><circle cx="${x + 8}" cy="${base - 1}" r="2.2" fill="#2f3b52" />`;
  return o;
}

// A hawker stall with a signboard and its own speciality:
//   kind "chicken" - roast chicken hanging at the counter
//   kind "satay"   - a grill with skewers and smoke
//   kind "dosa"    - a griddle with a dosa and chutney
function sgHawkerStall(x, base, w, awning, kind, sign) {
  let o = sgShadow(x + w / 2, base + 1, w / 2 + 3, 3);
  o += `<rect x="${x}" y="${base - 46}" width="${w}" height="46" fill="#ead2a8" />`;
  o += `<rect x="${x}" y="${base - 46}" width="${w}" height="46" fill="#1c2541" opacity="0.04" />`;
  // what the stall is known for, behind the counter
  if (kind === "chicken") {
    [x + 16, x + 36].forEach((cx) => {
      o += `<path d="M${cx} ${base - 34} v4" stroke="#6b4a2e" stroke-width="1.2" />` +
        `<ellipse cx="${cx}" cy="${base - 23}" rx="5.4" ry="7.4" fill="#c4742a" /><ellipse cx="${cx - 1.6}" cy="${base - 25}" rx="1.6" ry="3.6" fill="#e6a45a" />`;
    });
  } else if (kind === "satay") {
    o += `<rect x="${x + 6}" y="${base - 22}" width="${w - 12}" height="6" rx="2" fill="#3b2a22" />`;
    for (let i = 0; i < 5; i++) {
      const sx = x + 10 + i * 8;
      o += `<path d="M${sx} ${base - 22} l4 -9" stroke="#d9b98a" stroke-width="1.3" stroke-linecap="round" /><rect x="${sx + 1.2}" y="${base - 30}" width="4.4" height="5" rx="1.4" fill="#8a4a24" transform="rotate(24 ${sx + 3} ${base - 28})" />`;
      o += `<circle cx="${sx + 1.5}" cy="${base - 19}" r="1.1" fill="#ff7a3d" />`;
    }
  } else {
    o += `<ellipse cx="${x + w / 2 - 6}" cy="${base - 20}" rx="16" ry="3.8" fill="#2b2f3a" /><ellipse cx="${x + w / 2 - 6}" cy="${base - 21.5}" rx="12.5" ry="3" fill="#e8b45c" /><ellipse cx="${x + w / 2 - 8}" cy="${base - 22}" rx="5" ry="1.2" fill="#f3cf84" />`;
    o += `<circle cx="${x + w - 11}" cy="${base - 21}" r="3.4" fill="#f6efe2" /><circle cx="${x + w - 11}" cy="${base - 21.6}" r="2.2" fill="#6bbf59" />`;
  }
  // striped, scalloped awning
  const n = Math.max(3, Math.round(w / 12)), sw = w / n;
  for (let i = 0; i < n; i++) {
    const col = i % 2 === 0 ? awning : "#f7ebd2";
    o += `<rect x="${(x + i * sw).toFixed(1)}" y="${base - 46}" width="${sw.toFixed(1)}" height="11" fill="${col}" /><path d="M${(x + i * sw).toFixed(1)} ${base - 35} a${(sw / 2).toFixed(1)} ${(sw / 2).toFixed(1)} 0 0 0 ${sw.toFixed(1)} 0 Z" fill="${col}" />`;
  }
  // counter
  o += `<rect x="${x + 3}" y="${base - 17}" width="${w - 6}" height="17" fill="#8a5a3c" />`;
  o += `<rect x="${x + 2}" y="${base - 18.5}" width="${w - 4}" height="3" rx="1" fill="#c99a62" />`;
  if (kind === "chicken") o += `<ellipse cx="${x + w - 13}" cy="${base - 20}" rx="6.4" ry="2" fill="#ffffff" /><ellipse cx="${x + w - 15}" cy="${base - 22}" rx="3" ry="2" fill="#fffdf2" /><rect x="${x + w - 13}" y="${base - 24}" width="6" height="3" rx="1.2" fill="#e7b97a" />`;
  o += `<rect x="${x + w / 2 - 8}" y="${base - 12}" width="16" height="8" rx="1.5" fill="#3b2a22" /><rect x="${x + w / 2 - 5}" y="${base - 9.5}" width="10" height="1.4" fill="#f7ebd2" />`;
  // the signboard on top
  o += sgSignboard(x + 3, base - 64, w - 6, 15, sign.bg, sign.text, sign.font, sign.size, sign.fill);
  if (kind === "satay") o += `<path d="M${x + w - 9} ${base - 32} q-6 -8 0 -16 q6 -8 0 -16" fill="none" stroke="#c9d2dc" stroke-width="3" stroke-linecap="round" opacity="0.6" /><path d="M${x + w - 15} ${base - 34} q-5 -6 0 -12" fill="none" stroke="#c9d2dc" stroke-width="2.2" stroke-linecap="round" opacity="0.5" />`;
  return o;
}