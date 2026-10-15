// Scenery art, drawn in code in the same flat, muted style as the Journey map.
// Each painter draws one prop on a small canvas; the game turns every canvas
// into a texture once. Sizes are in world pixels; canvases are drawn at 2x so
// the art stays sharp on phones (sprites are shown at scale 0.5).

const ART_SCALE = 2;

const PAL = {
  ink: "#2a3550", shadow: "rgba(35, 48, 72, 0.16)",
  blue: "#aebfd9", blueDark: "#8ea3c4", pink: "#e8b8ae", pinkDark: "#d49e93", cream: "#ebd9ae", creamDark: "#d6c08c",
  win: "#f6f8fc", winDark: "#6f819f", roof: "#8392ad", concrete: "#c0c9d6", concreteDark: "#9aa6b8",
  red: "#e0948f", redDeep: "#cf5f58", teal: "#72c4b8", tealDeep: "#3f9d90", gold: "#f1c673", goldDeep: "#e0a23b",
  wood: "#b88a64", woodDark: "#8d6444", leaf: "#7dba8a", leafDark: "#5a9c6c", leafLight: "#a3d4ac",
  skin: "#f0c6a0", pot: "#d38a6a",
};

function artCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.ceil(w * ART_SCALE);
  c.height = Math.ceil(h * ART_SCALE);
  const ctx = c.getContext("2d");
  ctx.scale(ART_SCALE, ART_SCALE);
  return { c, ctx };
}

function rrPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}
function fillRR(ctx, x, y, w, h, r, color) {
  rrPath(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}
function fillEllipse(ctx, x, y, rx, ry, color, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}
function groundShadow(ctx, cx, y, rx, ry) {
  fillEllipse(ctx, cx, y, rx, ry, PAL.shadow);
}
function artText(ctx, text, x, y, size, color, weight = 800) {
  ctx.font = `${weight} ${size}px "Noto Sans SC", "Manrope", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

// ---------- housing ----------
function paintHdb(ctx, w, h, wall, wallDark) {
  groundShadow(ctx, w / 2, h - 12, w * 0.46, 14);
  fillRR(ctx, 14, 36, w - 28, h - 56, 6, wall);
  fillRR(ctx, w - 62, 36, 48, h - 56, 6, wallDark); // shaded side
  fillRR(ctx, 8, 22, w - 16, 22, 5, PAL.roof); // roof slab
  fillRR(ctx, 40, 8, 70, 18, 4, PAL.roof); // water tank
  const rows = 8;
  for (let r = 0; r < rows; r++) {
    const y = 66 + r * ((h - 150) / (rows - 1));
    fillRR(ctx, 14, y + 34, w - 28, 5, 2, "rgba(255,255,255,0.35)"); // corridor line
    for (let c = 0; c < 5; c++) {
      const x = 70 + c * 56;
      fillRR(ctx, x, y, 38, 30, 4, PAL.win);
      fillRR(ctx, x + 2, y + 2, 34, 26, 3, "#e3ebf6");
    }
    if (r % 3 === 1) { // laundry pole
      ctx.fillStyle = PAL.woodDark;
      ctx.fillRect(100 + (r % 2) * 90, y - 10, 70, 2);
      ["#e57373", "#64b5f6", "#ffd54f", "#81c784"].forEach((col, i) => fillRR(ctx, 104 + (r % 2) * 90 + i * 16, y - 8, 10, 18, 2, col));
    }
  }
  fillRR(ctx, 14, h - 64, w - 28, 46, 4, "#59658a"); // ground floor
  fillRR(ctx, w / 2 - 34, h - 58, 68, 40, 4, "#2f3a58"); // entrance
  fillRR(ctx, 24, 50, 44, h - 90, 4, "rgba(60,80,120,0.18)"); // lift core
}

// ---------- landmark: void deck ----------
function paintVoidDeck(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 10, w * 0.47, 14);
  fillRR(ctx, 16, 40, w - 32, 340, 6, PAL.blue);
  fillRR(ctx, w - 64, 40, 48, 340, 6, PAL.blueDark);
  fillRR(ctx, 8, 24, w - 16, 22, 5, PAL.roof);
  for (let r = 0; r < 6; r++) {
    const y = 66 + r * 52;
    fillRR(ctx, 16, y + 33, w - 32, 4, 2, "rgba(255,255,255,0.35)");
    for (let c = 0; c < 8; c++) {
      const x = 44 + c * 58;
      fillRR(ctx, x, y, 36, 28, 4, PAL.win);
      fillRR(ctx, x + 2, y + 2, 32, 24, 3, "#e3ebf6");
    }
    if (r === 1 || r === 3) {
      ctx.fillStyle = PAL.woodDark; ctx.fillRect(120 + r * 40, y - 10, 90, 2);
      ["#e57373", "#ffd54f", "#64b5f6", "#81c784", "#e57373"].forEach((col, i) => fillRR(ctx, 124 + r * 40 + i * 17, y - 8, 11, 18, 2, col));
    }
  }
  // open void deck: dark interior with pillars
  fillRR(ctx, 16, 380, w - 32, 120, 4, "#4a5675");
  fillRR(ctx, 16, 380, w - 32, 14, 3, "#38425f");
  ctx.fillStyle = "#d5dae6"; ctx.fillRect(16, 470, w - 32, 30); // floor
  [30, 210, 350, w - 64].forEach((x) => { fillRR(ctx, x, 380, 34, 120, 4, PAL.blue); fillRR(ctx, x + 22, 380, 12, 120, 3, PAL.blueDark); });
  // things in the void deck
  fillRR(ctx, 100, 410, 70, 44, 3, "#f4ecd8"); // notice board
  fillRR(ctx, 106, 416, 28, 18, 2, "#e0948f"); fillRR(ctx, 138, 416, 26, 18, 2, "#72c4b8");
  fillEllipse(ctx, 270, 468, 36, 12, "#e8dcc2"); ctx.fillStyle = PAL.woodDark; ctx.fillRect(266, 468, 8, 20); // table
  fillRR(ctx, 238, 474, 18, 14, 3, "#e0948f"); fillRR(ctx, 288, 474, 18, 14, 3, "#6a9fe0");
  fillEllipse(ctx, 420, 480, 18, 8, PAL.shadow);
  fillRR(ctx, 412, 440, 16, 38, 6, PAL.pot);
  fillEllipse(ctx, 420, 436, 22, 16, PAL.leaf); fillEllipse(ctx, 430, 430, 14, 12, PAL.leafLight);
  // block sign
  fillRR(ctx, w / 2 - 56, 345, 112, 28, 6, "#fffdf7"); artText(ctx, "BLK 88", w / 2, 360, 17, PAL.ink, 800);
}

// ---------- landmark: hawker centre ----------
function paintHawkerCentre(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 10, w * 0.47, 14);
  fillRR(ctx, 20, 120, w - 40, h - 130, 6, "#f3ead7"); // back wall
  ctx.fillStyle = "rgba(120,100,70,0.08)"; for (let x = 40; x < w - 40; x += 60) ctx.fillRect(x, 126, 2, h - 140);
  // big roof
  ctx.beginPath(); ctx.moveTo(0, 126); ctx.lineTo(60, 28); ctx.lineTo(w - 60, 28); ctx.lineTo(w, 126); ctx.closePath();
  ctx.fillStyle = "#8592ad"; ctx.fill();
  ctx.beginPath(); ctx.moveTo(18, 126); ctx.lineTo(70, 44); ctx.lineTo(w - 70, 44); ctx.lineTo(w - 18, 126); ctx.closePath();
  ctx.fillStyle = "#a3b0c9"; ctx.fill();
  for (let x = 90; x < w - 80; x += 52) { ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(x, 48, 3, 74); }
  fillRR(ctx, 0, 120, w, 14, 4, "#6b7897");
  // hanging fans
  [w * 0.28, w * 0.5, w * 0.72].forEach((x) => { ctx.fillStyle = "#7a879f"; ctx.fillRect(x - 1, 134, 2, 18); fillEllipse(ctx, x, 154, 34, 5, "rgba(122,135,159,0.75)"); });
  // lanterns
  [70, 200, w - 200, w - 70].forEach((x) => { ctx.fillStyle = "#b5513f"; ctx.fillRect(x - 1, 134, 2, 14); fillEllipse(ctx, x, 162, 12, 16, "#e57373"); fillEllipse(ctx, x - 4, 157, 4, 6, "rgba(255,255,255,0.4)"); ctx.fillStyle = "#e0a23b"; ctx.fillRect(x - 1, 178, 2, 10); });
  // stalls
  const stalls = [
    { t: "鸡饭", a: PAL.red, s: "#d96b64" }, { t: "面", a: PAL.teal, s: "#3f9d90" },
    { t: "烧烤", a: PAL.gold, s: "#e0a23b" }, { t: "饮料", a: PAL.red, s: "#d96b64" },
  ];
  const sw = (w - 80) / stalls.length;
  stalls.forEach((st, i) => {
    const x = 40 + i * sw;
    fillRR(ctx, x + 8, 200, sw - 16, 28, 6, "#fffdf6");
    fillRR(ctx, x + 8, 200, sw - 16, 28, 6, "rgba(0,0,0,0.0)");
    artText(ctx, st.t, x + sw / 2, 215, 19, st.s, 800);
    // scalloped awning
    ctx.fillStyle = st.a; ctx.fillRect(x + 4, 232, sw - 8, 20);
    for (let k = 0; k < 5; k++) { fillEllipse(ctx, x + 4 + (k + 0.5) * ((sw - 8) / 5), 252, (sw - 8) / 10, 12, k % 2 ? "#fbf3e2" : st.a); }
    // counter
    fillRR(ctx, x + 10, 290, sw - 20, 90, 4, "#d9c19c");
    fillRR(ctx, x + 10, 290, sw - 20, 16, 4, "#b8895f");
    fillRR(ctx, x + sw / 2 - 18, 322, 36, 12, 4, "#6f5b45");
    if (i % 2 === 0) { fillEllipse(ctx, x + sw / 2, 276, 26, 10, "#e8c88e"); fillEllipse(ctx, x + sw / 2 - 40, 272, 12, 8, "#c98e4c"); }
    else { fillRR(ctx, x + sw / 2 - 22, 262, 44, 24, 5, "#cfd6e2"); }
  });
  // floor strip + steps
  fillRR(ctx, 10, h - 56, w - 20, 46, 4, "#ddd0b6");
  ctx.fillStyle = "rgba(120,100,70,0.12)"; for (let x = 20; x < w - 20; x += 60) ctx.fillRect(x, h - 56, 2, 46);
  // sign board
  fillRR(ctx, w / 2 - 150, 60, 300, 44, 10, "#fffdf6");
  artText(ctx, "熟食中心", w / 2, 82, 28, "#8a4a1f", 800);
}

// ---------- landmark: MRT station ----------
function paintMrtStation(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 10, w * 0.46, 14);
  [90, 360, 630].forEach((x) => { fillRR(ctx, x, 190, 44, h - 205, 6, PAL.concrete); fillRR(ctx, x + 30, 190, 14, h - 205, 5, PAL.concreteDark); });
  fillRR(ctx, 10, 150, w - 20, 50, 8, PAL.concrete); // viaduct
  fillRR(ctx, 10, 188, w - 20, 12, 5, PAL.concreteDark);
  // station canopy
  ctx.beginPath(); ctx.moveTo(190, 70); ctx.quadraticCurveTo(380, 0, 570, 70); ctx.lineTo(570, 150); ctx.lineTo(190, 150); ctx.closePath();
  ctx.fillStyle = "#cfe0ee"; ctx.fill();
  ctx.strokeStyle = "#8fa6c0"; ctx.lineWidth = 4; ctx.stroke();
  for (let x = 230; x < 570; x += 48) { ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.fillRect(x, 66, 3, 84); }
  // train (red line stripe, as on the Journey map)
  const car = (x, cw) => { fillRR(ctx, x, 96, cw, 56, 14, "#f7f9fc"); fillRR(ctx, x, 128, cw, 8, 0, "#d94a3b"); for (let k = 0; k < Math.floor((cw - 30) / 40); k++) fillRR(ctx, x + 16 + k * 40, 106, 28, 18, 5, "#5b6c8c"); };
  car(22, 210); car(240, 280); car(530, 208);
  // ground-level entrance
  fillRR(ctx, 250, 300, 260, h - 312, 8, "#e9edf4");
  fillRR(ctx, 250, 300, 260, 22, 6, "#c0c9d6");
  fillRR(ctx, 276, 336, 208, h - 352, 6, "#5d7396");
  fillRR(ctx, 286, 346, 90, h - 372, 4, "#9fc2e4"); fillRR(ctx, 384, 346, 90, h - 372, 4, "#9fc2e4");
  fillEllipse(ctx, 380, 322, 24, 24, "#d94a3b"); fillRR(ctx, 354, 316, 52, 12, 3, "#ffffff");
  artText(ctx, "MRT", 380, 322, 11, "#d94a3b", 800);
  // escalator stairs
  ctx.fillStyle = "#b9c3d2"; for (let i = 0; i < 5; i++) ctx.fillRect(250 + 4 * i, h - 40 + i * 6, 260 - 8 * i, 5);
}

// ---------- vehicles & street ----------
function paintBus(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, w * 0.46, 9);
  fillRR(ctx, 4, 6, w - 8, h - 30, 14, "#f6f8fb");
  fillRR(ctx, 4, 60, w - 8, 12, 0, "#d94a3b");
  fillRR(ctx, 4, h - 44, w - 8, 14, 4, "#d94a3b");
  for (let k = 0; k < 6; k++) { fillRR(ctx, 20 + k * 44, 18, 32, 24, 4, "#4c5d7d"); fillRR(ctx, 20 + k * 44, 80, 32, 22, 4, "#4c5d7d"); }
  fillRR(ctx, w - 50, 80, 38, 38, 6, "#3a4766");
  fillRR(ctx, w - 90, 0, 56, 12, 3, "#2f3a58"); artText(ctx, "174", w - 62, 6, 9, "#ffd166", 800);
  [60, w - 70].forEach((x) => { fillEllipse(ctx, x, h - 22, 17, 17, "#2a3550"); fillEllipse(ctx, x, h - 22, 8, 8, "#aab4c6"); });
}
function paintTaxi(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 6, w * 0.45, 7);
  fillRR(ctx, 4, h - 52, w - 8, 36, 12, "#5b8fdc");
  fillRR(ctx, 34, h - 78, w - 70, 34, 12, "#6fa0e8");
  fillRR(ctx, 44, h - 72, 42, 24, 5, "#dfeaf8"); fillRR(ctx, 92, h - 72, 42, 24, 5, "#dfeaf8");
  fillRR(ctx, w / 2 - 20, h - 90, 40, 12, 4, "#ffd166");
  [36, w - 36].forEach((x) => { fillEllipse(ctx, x, h - 18, 14, 14, "#2a3550"); fillEllipse(ctx, x, h - 18, 6, 6, "#aab4c6"); });
}
function paintBusStop(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 6, 28, 7);
  fillRR(ctx, w / 2 - 3, 36, 6, h - 44, 2, "#9aa6b8");
  fillRR(ctx, 8, 6, w - 16, 44, 8, "#3b6fd0");
  fillRR(ctx, 14, 12, w - 28, 18, 4, "#e9f0fb"); artText(ctx, "站", w / 2, 21, 13, "#3b6fd0", 800);
  ctx.fillStyle = "#fff"; ctx.fillRect(18, 36, w - 36, 3);
}

// ---------- hawker extras ----------
function paintStall(ctx, w, h, awning, deep, label) {
  groundShadow(ctx, w / 2, h - 8, w * 0.45, 10);
  fillRR(ctx, 12, 54, w - 24, h - 66, 5, "#e9d8b7");
  fillRR(ctx, 12, 100, w - 24, h - 112, 4, "#d9c19c");
  fillRR(ctx, 12, 100, w - 24, 14, 4, "#b8895f");
  fillRR(ctx, 24, 12, w - 48, 30, 8, "#fffdf6"); artText(ctx, label, w / 2, 27, 18, deep, 800);
  ctx.fillStyle = awning; ctx.fillRect(8, 46, w - 16, 18);
  for (let k = 0; k < 6; k++) fillEllipse(ctx, 8 + (k + 0.5) * ((w - 16) / 6), 64, (w - 16) / 12, 11, k % 2 ? "#fbf3e2" : awning);
  fillEllipse(ctx, w / 2 - 30, 92, 18, 8, "#e8c88e"); fillRR(ctx, w / 2 + 6, 80, 38, 22, 5, "#cfd6e2");
}
function paintTable(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, 62, 12);
  fillRR(ctx, w / 2 - 5, 52, 10, h - 62, 3, "#8c7a63");
  fillEllipse(ctx, w / 2, 52, 56, 18, "#efe3c8"); fillEllipse(ctx, w / 2, 48, 56, 16, "#f7efdc");
  fillRR(ctx, 6, h - 46, 28, 22, 6, "#e0948f"); fillRR(ctx, w - 34, h - 46, 28, 22, 6, "#6a9fe0");
  fillEllipse(ctx, w / 2 - 14, 42, 14, 6, "#e8c88e"); fillRR(ctx, w / 2 + 8, 26, 12, 20, 3, "#f4d27a");
  ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w / 2 - 20, 38); ctx.quadraticCurveTo(w / 2 - 16, 26, w / 2 - 20, 16); ctx.stroke();
}

// ---------- neighbourhood extras ----------
function paintPlayground(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 10, w * 0.42, 12);
  fillRR(ctx, 150, 56, 12, h - 70, 3, "#8aa0c4"); fillRR(ctx, 214, 56, 12, h - 70, 3, "#8aa0c4");
  ctx.beginPath(); ctx.moveTo(130, 60); ctx.lineTo(188, 6); ctx.lineTo(246, 60); ctx.closePath(); ctx.fillStyle = "#33a38f"; ctx.fill();
  fillRR(ctx, 150, 96, 76, 8, 2, "#e0a23b");
  ctx.strokeStyle = "#e0584f"; ctx.lineWidth = 18; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(228, 100); ctx.quadraticCurveTo(262, 130, 250, h - 22); ctx.stroke();
  ctx.strokeStyle = "#5b7fd0"; ctx.lineWidth = 4; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(110 + i * 8, 100 + i * 22); ctx.lineTo(150, 100 + i * 22); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(110, 100); ctx.lineTo(96, h - 18); ctx.moveTo(150, 100); ctx.lineTo(160, h - 18); ctx.stroke();
}
function paintChessTable(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, 40, 8);
  fillRR(ctx, w / 2 - 4, 30, 8, h - 40, 2, "#8c7a63");
  fillEllipse(ctx, w / 2, 28, 36, 12, "#d9d4c6");
  ctx.fillStyle = "#8f9bb2"; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2 === 0) ctx.fillRect(w / 2 - 20 + i * 10, 22 + j * 5, 10, 5);
  fillRR(ctx, 6, h - 30, 18, 16, 4, "#9aa6b8"); fillRR(ctx, w - 24, h - 30, 18, 16, 4, "#9aa6b8");
}
function paintBench(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 5, w * 0.44, 6);
  fillRR(ctx, 6, 8, w - 12, 12, 4, "#b88a64");
  fillRR(ctx, 6, 26, w - 12, 12, 4, "#c9996f");
  fillRR(ctx, 12, 38, 8, 22, 2, "#6b5a47"); fillRR(ctx, w - 20, 38, 8, 22, 2, "#6b5a47");
}

// ---------- plants & lamps ----------
function paintTree(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 6, w * 0.34, 8);
  fillRR(ctx, w / 2 - 8, h * 0.52, 16, h * 0.46, 4, "#8d6a4a");
  fillEllipse(ctx, w / 2 - 22, h * 0.42, 34, 30, PAL.leafDark);
  fillEllipse(ctx, w / 2 + 22, h * 0.42, 34, 30, PAL.leafDark);
  fillEllipse(ctx, w / 2, h * 0.3, 44, 38, PAL.leaf);
  fillEllipse(ctx, w / 2 - 10, h * 0.24, 20, 16, PAL.leafLight);
}
function paintPalm(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 6, 26, 7);
  ctx.strokeStyle = "#a07a55"; ctx.lineWidth = 13; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(w / 2 - 4, h - 8); ctx.quadraticCurveTo(w / 2 + 18, h * 0.58, w / 2 + 6, 82); ctx.stroke();
  const cx = w / 2 + 6, cy = 82;
  [-2.7, -2.1, -1.5, -0.9, -0.3, 0.3].forEach((a, i) => {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a + 0.2);
    fillEllipse(ctx, 0, -40, 15, 48, i % 2 ? PAL.leafDark : PAL.leaf, 0);
    ctx.restore();
  });
  fillEllipse(ctx, cx, cy + 4, 8, 8, "#8d6a4a");
}
function paintShrub(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 5, w * 0.4, 6);
  fillEllipse(ctx, w * 0.34, h - 20, 26, 20, PAL.leafDark); fillEllipse(ctx, w * 0.66, h - 20, 26, 20, PAL.leafDark);
  fillEllipse(ctx, w / 2, h - 28, 30, 24, PAL.leaf); fillEllipse(ctx, w / 2 - 6, h - 34, 12, 9, PAL.leafLight);
}
function paintPot(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 5, 24, 6);
  fillRR(ctx, w / 2 - 16, h - 34, 32, 30, 6, PAL.pot);
  [-0.5, 0, 0.5].forEach((a) => { ctx.save(); ctx.translate(w / 2, h - 32); ctx.rotate(a); fillEllipse(ctx, 0, -18, 8, 20, PAL.leaf); ctx.restore(); });
}
function paintLamp(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 5, 14, 5);
  fillRR(ctx, w / 2 - 3, 20, 6, h - 26, 2, "#9aa6b8");
  fillRR(ctx, w / 2 - 3, 14, 26, 6, 3, "#9aa6b8");
  fillRR(ctx, w / 2 + 8, 18, 18, 8, 3, "#f6dd8c");
}

// ---------- boat ----------
function paintBoat(ctx, w, h) {
  fillEllipse(ctx, w / 2, h - 12, w * 0.46, 13, "rgba(255,255,255,0.55)");
  fillEllipse(ctx, w / 2, h - 10, w * 0.42, 9, "rgba(40,70,100,0.22)");
  // hull
  ctx.beginPath(); ctx.moveTo(10, h - 92); ctx.lineTo(w - 4, h - 92); ctx.quadraticCurveTo(w - 26, h - 18, w - 80, h - 18); ctx.lineTo(70, h - 18); ctx.quadraticCurveTo(30, h - 28, 10, h - 92); ctx.closePath();
  ctx.fillStyle = "#f6f3ec"; ctx.fill();
  ctx.beginPath(); ctx.moveTo(10, h - 92); ctx.lineTo(w - 4, h - 92); ctx.lineTo(w - 9, h - 74); ctx.lineTo(16, h - 74); ctx.closePath();
  ctx.fillStyle = "#3b6fd0"; ctx.fill();
  // cabin
  fillRR(ctx, w / 2 - 66, h - 148, 112, 60, 8, "#eadcc0");
  fillRR(ctx, w / 2 - 54, h - 136, 34, 26, 4, "#9fc2e4"); fillRR(ctx, w / 2 - 12, h - 136, 34, 26, 4, "#9fc2e4");
  fillRR(ctx, w / 2 - 74, h - 158, 128, 12, 5, "#d94a3b");
  ctx.fillStyle = "#6b5a47"; ctx.fillRect(w / 2 + 80, h - 168, 3, 78);
  ctx.beginPath(); ctx.moveTo(w / 2 + 83, h - 168); ctx.lineTo(w / 2 + 112, h - 158); ctx.lineTo(w / 2 + 83, h - 148); ctx.closePath(); ctx.fillStyle = "#f2a93b"; ctx.fill();
}

// ---------- people (front view, two walking frames) ----------
function paintPerson(ctx, w, h, look, frame) {
  const colours = {
    player: { shirt: "#f2a93b", pants: "#33415f", hair: "#2a2430", extra: null },
    uncle: { shirt: "#9bbbe0", pants: "#6c7a96", hair: "#c9cdd6", extra: "cap" },
    auntie: { shirt: "#e0948f", pants: "#515d7a", hair: "#4a3a33", extra: "perm" },
    staff: { shirt: "#f1983a", pants: "#2f3a58", hair: "#2a2430", extra: "cap2" },
  }[look];
  const step = frame === 0 ? 0 : 5;
  fillEllipse(ctx, w / 2, h - 8, 22, 6, PAL.shadow);
  // legs
  fillRR(ctx, w / 2 - 14, h - 38 + step * 0.0, 12, 28 - step, 4, colours.pants);
  fillRR(ctx, w / 2 + 2, h - 38, 12, 22 + step, 4, colours.pants);
  fillRR(ctx, w / 2 - 15, h - 14 - step, 14, 6, 3, "#252d44");
  fillRR(ctx, w / 2 + 1, h - 14 + step * 0.0, 14, 6, 3, "#252d44");
  // torso
  fillRR(ctx, w / 2 - 20, h - 74, 40, 42, 12, colours.shirt);
  if (look === "auntie") fillRR(ctx, w / 2 - 15, h - 62, 30, 28, 8, "#fdf6ec");
  if (look === "staff") { fillRR(ctx, w / 2 - 20, h - 74, 40, 42, 12, "#f1983a"); fillRR(ctx, w / 2 - 4, h - 74, 8, 42, 2, "#ffe2b0"); }
  // arms
  fillRR(ctx, w / 2 - 26, h - 70, 9, 30 - step * 0.6, 4, colours.shirt);
  fillRR(ctx, w / 2 + 17, h - 70, 9, 24 + step * 0.6, 4, colours.shirt);
  // head
  fillEllipse(ctx, w / 2, h - 86, 15, 16, PAL.skin);
  fillEllipse(ctx, w / 2, h - 94, 16, 10, colours.hair);
  if (colours.extra === "perm") { fillEllipse(ctx, w / 2 - 9, h - 90, 8, 8, colours.hair); fillEllipse(ctx, w / 2 + 9, h - 90, 8, 8, colours.hair); }
  if (colours.extra === "cap") { fillRR(ctx, w / 2 - 17, h - 104, 34, 9, 4, "#8a97ad"); fillRR(ctx, w / 2 - 4, h - 98, 24, 5, 2, "#6f7c94"); }
  if (colours.extra === "cap2") { fillRR(ctx, w / 2 - 17, h - 105, 34, 10, 4, "#2f3a58"); fillRR(ctx, w / 2 - 6, h - 100, 26, 4, 2, "#222b45"); }
  fillEllipse(ctx, w / 2 - 5, h - 85, 1.8, 2.2, "#2a2430"); fillEllipse(ctx, w / 2 + 5, h - 85, 1.8, 2.2, "#2a2430");
}


// ---------- the nine locations (new) ----------
function paintMinimart(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 10, w * 0.46, 12);
  fillRR(ctx, 20, 30, w - 40, h - 44, 6, PAL.cream);               // upper flats
  fillRR(ctx, w - 70, 30, 50, h - 44, 6, PAL.creamDark);
  fillRR(ctx, 12, 20, w - 24, 18, 5, PAL.roof);
  for (let c = 0; c < 4; c++) { fillRR(ctx, 44 + c * 72, 54, 44, 52, 4, PAL.win); fillRR(ctx, 46 + c * 72, 56, 40, 48, 3, "#e3ebf6"); ctx.fillStyle = "#b9c3d2"; ctx.fillRect(66 + c * 72, 56, 2, 48); }
  fillRR(ctx, 250, 118, 54, 26, 4, "#d6dde8"); ctx.fillStyle = "#9aa6b8"; for (let i = 0; i < 4; i++) ctx.fillRect(256 + i * 11, 124, 5, 14); // air-con unit
  ctx.fillStyle = PAL.woodDark; ctx.fillRect(60, 40, 150, 2); ["#e57373", "#64b5f6", "#ffd54f", "#81c784"].forEach((col, i) => fillRR(ctx, 66 + i * 34, 42, 14, 24, 2, col));
  // shop front
  fillRR(ctx, 20, 150, w - 40, h - 164, 4, "#59658a");
  fillRR(ctx, 40, 156, w - 80, 36, 8, "#fffdf6"); artText(ctx, "杂货店", w / 2, 174, 26, "#a8402f", 800);
  ctx.fillStyle = "#d94a3b"; ctx.fillRect(28, 196, w - 56, 22);
  for (let k = 0; k < 8; k++) { fillRR(ctx, 28 + k * ((w - 56) / 8), 196, (w - 56) / 16, 22, 0, "#fbf3e2"); }
  for (let k = 0; k < 8; k++) fillEllipse(ctx, 28 + (k + 0.5) * ((w - 56) / 8), 218, (w - 56) / 16, 9, k % 2 ? "#d94a3b" : "#fbf3e2");
  fillRR(ctx, 40, 232, w - 80, h - 256, 4, "#2f3a58");
  // shelves with goods
  [0, 1].forEach((r) => { fillRR(ctx, 50, 244 + r * 44, w - 100, 5, 2, "#b8895f"); for (let i = 0; i < 9; i++) fillRR(ctx, 56 + i * 28, 226 + r * 44, 18, 18, 3, ["#e57373", "#ffd54f", "#64b5f6", "#81c784", "#ffb74d"][(i + r) % 5]); });
  // crates of fruit and a drinks fridge outside
  fillRR(ctx, 22, h - 56, 64, 36, 4, "#b88a64"); [0, 1, 2].forEach((i) => fillEllipse(ctx, 40 + i * 18, h - 58, 10, 9, ["#e0584f", "#f2a93b", "#7dba8a"][i]));
  fillRR(ctx, w - 86, h - 96, 58, 80, 4, "#dfeaf8"); fillRR(ctx, w - 82, h - 92, 50, 70, 3, "#9fc2e4"); ctx.fillStyle = "#fff"; ctx.fillRect(w - 58, h - 92, 2, 70);
}

function paintDragon(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 10, w * 0.48, 16);
  fillEllipse(ctx, w / 2, h - 26, w * 0.46, 22, "#e8dcc0");                    // sand pit
  // body arches (the classic mosaic dragon)
  const body = "#e0847b", mosaic = ["#fbf3e2", "#7fb7d6", "#f1c673", "#72c4b8"];
  const arch = (cx, rx, ry) => { ctx.beginPath(); ctx.ellipse(cx, h - 40, rx, ry, 0, Math.PI, 0); ctx.lineTo(cx + rx - 26, h - 40); ctx.ellipse(cx, h - 40, rx - 26, ry - 26, 0, 0, Math.PI, true); ctx.closePath(); ctx.fillStyle = body; ctx.fill(); };
  arch(w * 0.5, 80, 118); arch(w * 0.5 + 150, 70, 88); arch(w * 0.5 - 150, 66, 72);
  // slide down the back
  ctx.strokeStyle = "#e0a23b"; ctx.lineWidth = 26; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(w * 0.5 + 70, h - 140); ctx.quadraticCurveTo(w * 0.5 + 250, h - 150, w - 34, h - 42); ctx.stroke();
  ctx.strokeStyle = "#f4cf86"; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(w * 0.5 + 70, h - 140); ctx.quadraticCurveTo(w * 0.5 + 250, h - 150, w - 34, h - 42); ctx.stroke();
  // mosaic spots
  for (let i = 0; i < 26; i++) { const a = Math.PI + (i / 25) * Math.PI; fillRR(ctx, w * 0.5 + Math.cos(a) * 67 - 5, h - 40 + Math.sin(a) * 105 - 5, 10, 10, 2, mosaic[i % 4]); }
  // spines
  ctx.fillStyle = "#cf5f58"; for (let i = 0; i < 7; i++) { const x = w * 0.5 - 60 + i * 22; ctx.beginPath(); ctx.moveTo(x - 9, h - 150 + Math.abs(i - 3) * 10); ctx.lineTo(x, h - 176 + Math.abs(i - 3) * 10); ctx.lineTo(x + 9, h - 150 + Math.abs(i - 3) * 10); ctx.fill(); }
  // head (left) with horns, eye, mouth you can climb into
  fillRR(ctx, 20, h - 150, 120, 108, 40, body);
  fillRR(ctx, 6, h - 98, 78, 48, 18, "#cf5f58");
  fillRR(ctx, 22, h - 84, 46, 22, 8, "#3a2630");
  ctx.fillStyle = "#fbf3e2"; [30, 44, 58].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, h - 84); ctx.lineTo(x + 5, h - 74); ctx.lineTo(x + 10, h - 84); ctx.fill(); });
  fillEllipse(ctx, 92, h - 118, 14, 14, "#fbf3e2"); fillEllipse(ctx, 94, h - 118, 7, 9, "#2a3550");
  ctx.fillStyle = "#f1c673"; ctx.beginPath(); ctx.moveTo(100, h - 150); ctx.lineTo(120, h - 196); ctx.lineTo(128, h - 146); ctx.fill(); ctx.beginPath(); ctx.moveTo(70, h - 150); ctx.lineTo(70, h - 192); ctx.lineTo(92, h - 150); ctx.fill();
  // tail
  ctx.strokeStyle = body; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(w - 150, h - 46); ctx.quadraticCurveTo(w - 90, h - 40, w - 70, h - 90); ctx.stroke();
  // fence gate + sign
  fillRR(ctx, w / 2 - 90, h - 24, 180, 6, 3, "#8aa0c4");
}

function paintWetMarket(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 10, w * 0.47, 14);
  fillRR(ctx, 20, 110, w - 40, h - 124, 6, "#e7dfd0");                          // back wall
  ctx.beginPath(); ctx.moveTo(0, 124); ctx.lineTo(26, 40); ctx.lineTo(w - 26, 40); ctx.lineTo(w, 124); ctx.closePath(); ctx.fillStyle = "#7c9c8c"; ctx.fill();
  ctx.beginPath(); ctx.moveTo(18, 124); ctx.lineTo(42, 56); ctx.lineTo(w - 42, 56); ctx.lineTo(w - 18, 124); ctx.closePath(); ctx.fillStyle = "#9cb9aa"; ctx.fill();
  for (let x = 80; x < w - 70; x += 54) { ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(x, 60, 3, 62); }
  fillRR(ctx, 0, 118, w, 14, 4, "#5f7d6f");
  fillRR(ctx, w / 2 - 130, 66, 260, 40, 10, "#fffdf6"); artText(ctx, "巴刹", w / 2, 86, 28, "#2f6d58", 800);
  // pillars
  [30, w / 3, (2 * w) / 3, w - 54].forEach((x) => fillRR(ctx, x, 132, 24, h - 152, 4, "#d2c9b8"));
  // produce stalls
  const stalls = [{ a: "#e0848b", g: ["#e0584f", "#f2a93b"] }, { a: "#72c4b8", g: ["#7dba8a", "#a3d4ac"] }, { a: "#f1c673", g: ["#f2a93b", "#d38a6a"] }, { a: "#8fb2e6", g: ["#cfd6e2", "#9fc2e4"] }];
  const sw = (w - 90) / stalls.length;
  stalls.forEach((s, i) => {
    const x = 46 + i * sw;
    ctx.fillStyle = s.a; ctx.fillRect(x, 150, sw - 14, 22);
    for (let k = 0; k < 5; k++) fillEllipse(ctx, x + (k + 0.5) * ((sw - 14) / 5), 172, (sw - 14) / 10, 10, k % 2 ? "#fbf3e2" : s.a);
    fillRR(ctx, x + 4, 190, sw - 22, h - 230, 4, "#d9c19c"); fillRR(ctx, x + 4, 190, sw - 22, 14, 4, "#b8895f");
    for (let k = 0; k < 6; k++) fillEllipse(ctx, x + 22 + k * ((sw - 60) / 5), 186, 11, 8, s.g[k % 2]);
    fillRR(ctx, x + 10, 226, sw - 34, 30, 4, "#cfd6e2");
  });
  fillRR(ctx, 10, h - 46, w - 20, 36, 4, "#cfc9bb");
}

function paintKopitiam(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 10, w * 0.47, 12);
  fillRR(ctx, 16, 26, w - 32, h - 40, 6, "#f0e3c6");                              // shophouse
  fillRR(ctx, w - 66, 26, 50, h - 40, 6, "#dccdA6");
  ctx.beginPath(); ctx.moveTo(6, 40); ctx.lineTo(w / 2, 4); ctx.lineTo(w - 6, 40); ctx.closePath(); ctx.fillStyle = "#c98a6c"; ctx.fill();
  for (let c = 0; c < 3; c++) { const x = 46 + c * 118; fillRR(ctx, x, 70, 64, 90, 30, "#5b8c7a"); fillRR(ctx, x + 6, 78, 52, 80, 24, "#e3ebf6"); ctx.fillStyle = "#5b8c7a"; for (let i = 0; i < 4; i++) ctx.fillRect(x + 10 + i * 13, 82, 3, 74); }
  fillRR(ctx, 24, 172, w - 48, 22, 4, "#4f9a8c");                                  // peranakan tile strip
  for (let i = 0; i < 12; i++) fillRR(ctx, 30 + i * ((w - 60) / 12), 177, 12, 12, 2, i % 2 ? "#f1c673" : "#e0848b");
  fillRR(ctx, 50, 196, w - 100, 40, 8, "#fffdf6"); artText(ctx, "咖啡店", w / 2, 216, 28, "#7a3f23", 800);
  fillRR(ctx, 24, 244, w - 48, h - 262, 4, "#59658a");                             // open frontage
  // marble tables and stools
  [90, 210, 330].forEach((x) => { fillEllipse(ctx, x, h - 70, 34, 12, "#efe7d4"); fillRR(ctx, x - 3, h - 70, 6, 34, 2, "#8c7a63"); fillEllipse(ctx, x - 40, h - 32, 11, 6, "#b88a64"); fillEllipse(ctx, x + 40, h - 32, 11, 6, "#b88a64"); });
  fillRR(ctx, w - 80, 262, 40, 60, 3, "#e8dcc2"); fillRR(ctx, w - 74, 268, 28, 20, 2, "#f1c673");   // drinks board
}

function paintBusInterchange(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, w * 0.47, 12);
  // long canopy on posts
  ctx.beginPath(); ctx.moveTo(0, 96); ctx.lineTo(30, 26); ctx.lineTo(w - 30, 26); ctx.lineTo(w, 96); ctx.closePath(); ctx.fillStyle = "#6f86ad"; ctx.fill();
  ctx.beginPath(); ctx.moveTo(16, 96); ctx.lineTo(40, 42); ctx.lineTo(w - 40, 42); ctx.lineTo(w - 16, 96); ctx.closePath(); ctx.fillStyle = "#93a9cc"; ctx.fill();
  for (let x = 70; x < w - 60; x += 56) { ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(x, 46, 3, 48); }
  fillRR(ctx, 0, 92, w, 12, 4, "#4f6188");
  fillRR(ctx, w / 2 - 150, 50, 300, 34, 8, "#fffdf6"); artText(ctx, "巴士转换站", w / 2, 67, 22, "#2c4f97", 800);
  [20, w / 3, (2 * w) / 3, w - 44].forEach((x) => fillRR(ctx, x, 104, 22, h - 124, 4, "#aab4c6"));
  // bays and two buses
  fillRR(ctx, 8, h - 34, w - 16, 26, 4, "#cfd6e2"); ctx.fillStyle = "#fff"; for (let x = 40; x < w - 40; x += 70) ctx.fillRect(x, h - 24, 34, 5);
  const bus = (x, col) => { fillRR(ctx, x, h - 118, 200, 78, 14, "#f6f8fb"); fillRR(ctx, x, h - 82, 200, 9, 0, col); for (let k = 0; k < 5; k++) fillRR(ctx, x + 12 + k * 36, h - 108, 26, 20, 4, "#4c5d7d"); fillRR(ctx, x + 160, h - 74, 30, 34, 5, "#3a4766"); [x + 40, x + 160].forEach((cx) => { fillEllipse(ctx, cx, h - 42, 14, 14, "#2a3550"); fillEllipse(ctx, cx, h - 42, 6, 6, "#aab4c6"); }); };
  bus(46, "#d94a3b"); bus(w - 250, "#3b6fd0");
  // waiting benches and bay signs
  [120, w - 120].forEach((x) => { fillRR(ctx, x, 114, 8, 40, 2, "#9aa6b8"); fillRR(ctx, x - 20, 108, 48, 24, 6, "#3b6fd0"); artText(ctx, "A", x + 4, 120, 14, "#ffffff", 800); });
}

function paintTaxiStand(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, w * 0.46, 11);
  // shelter
  fillRR(ctx, 10, 26, w - 20, 22, 8, "#f1c673"); fillRR(ctx, 10, 42, w - 20, 8, 3, "#d9a63f");
  [24, w - 40].forEach((x) => fillRR(ctx, x, 48, 14, 96, 3, "#9aa6b8"));
  fillRR(ctx, 40, 54, w - 80, 70, 4, "rgba(159,194,228,0.45)");
  fillRR(ctx, w / 2 - 70, 60, 140, 30, 6, "#fffdf6"); artText(ctx, "的士站", w / 2, 75, 22, "#a86a12", 800);
  fillRR(ctx, 56, 110, w - 112, 10, 3, "#b88a64");
  // sign pole
  fillRR(ctx, w - 18, 90, 5, 88, 2, "#8c96aa"); fillRR(ctx, w - 40, 78, 44, 22, 5, "#3b6fd0"); artText(ctx, "TAXI", w - 18, 89, 11, "#fff", 800);
  // two taxis
  const taxi = (x, y, col, col2) => { fillRR(ctx, x, y + 26, 150, 34, 12, col); fillRR(ctx, x + 28, y, 94, 34, 12, col2); fillRR(ctx, x + 38, y + 6, 34, 22, 5, "#dfeaf8"); fillRR(ctx, x + 78, y + 6, 34, 22, 5, "#dfeaf8"); fillRR(ctx, x + 56, y - 10, 38, 12, 4, "#ffd166"); artText(ctx, "TAXI", x + 75, y - 4, 8, "#7a4a00", 800); [x + 32, x + 120].forEach((cx) => { fillEllipse(ctx, cx, y + 60, 13, 13, "#2a3550"); fillEllipse(ctx, cx, y + 60, 6, 6, "#aab4c6"); }); };
  taxi(30, h - 96, "#5b8fdc", "#6fa0e8"); taxi(w - 190, h - 90, "#e0a23b", "#efb85a");
}


// ---------- home island ----------
function paintHomeHouse(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 10, w * 0.46, 14);
  fillRR(ctx, 24, 120, w - 48, h - 134, 8, "#f1e6cf");                          // walls
  fillRR(ctx, w - 90, 120, 66, h - 134, 8, "#dccdA6");
  ctx.beginPath(); ctx.moveTo(4, 128); ctx.lineTo(w / 2, 14); ctx.lineTo(w - 4, 128); ctx.closePath(); ctx.fillStyle = "#c0786a"; ctx.fill();   // roof
  ctx.beginPath(); ctx.moveTo(26, 128); ctx.lineTo(w / 2, 36); ctx.lineTo(w - 26, 128); ctx.closePath(); ctx.fillStyle = "#d08c7c"; ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)"; for (let i = 0; i < 6; i++) ctx.fillRect(60 + i * 52, 60 + Math.abs(i - 2.5) * 18, 3, 56 - Math.abs(i - 2.5) * 10);
  fillRR(ctx, 0, 124, w, 12, 4, "#a8645a");
  fillRR(ctx, w / 2 - 22, 64, 44, 36, 18, "#fff8e8"); fillRR(ctx, w / 2 - 14, 72, 28, 24, 12, "#9fc2e4");   // attic window
  [50, w - 130].forEach((x) => { fillRR(ctx, x, 160, 80, 70, 6, "#fff"); fillRR(ctx, x + 6, 166, 68, 58, 4, "#9fc2e4"); ctx.fillStyle = "#fff"; ctx.fillRect(x + 38, 166, 4, 58); ctx.fillRect(x + 6, 194, 68, 4); fillRR(ctx, x - 6, 232, 92, 12, 3, "#b88a64"); });
  fillRR(ctx, w / 2 - 36, 170, 72, h - 184, 8, "#8d6a4a"); fillRR(ctx, w / 2 - 28, 180, 56, 90, 5, "#a37e5c"); fillEllipse(ctx, w / 2 + 18, 234, 4, 4, "#f1c673");   // door
  fillRR(ctx, w / 2 - 70, h - 26, 140, 10, 3, "#d9d4c6");                                                                // step
  [[56, h - 26], [w - 70, h - 26]].forEach(([x, y]) => { fillRR(ctx, x - 14, y - 22, 28, 22, 5, PAL.pot); fillEllipse(ctx, x, y - 26, 20, 14, PAL.leaf); });
}

function paintIslandShop(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, w * 0.46, 11);
  fillRR(ctx, 16, 70, w - 32, h - 82, 6, "#f3e7cc");
  fillRR(ctx, w - 56, 70, 40, h - 82, 6, "#e0d2ac");
  fillRR(ctx, 6, 40, w - 12, 26, 6, "#4f9a8c");
  fillRR(ctx, 40, 6, w - 80, 40, 10, "#fffdf6"); artText(ctx, "岛屿小店", w / 2, 26, 24, "#2f7a6c", 800);
  ctx.fillStyle = "#4f9a8c"; ctx.fillRect(10, 66, w - 20, 22);
  for (let k = 0; k < 7; k++) fillEllipse(ctx, 10 + (k + 0.5) * ((w - 20) / 7), 88, (w - 20) / 14, 12, k % 2 ? "#fbf3e2" : "#4f9a8c");
  fillRR(ctx, 28, 104, w - 56, h - 130, 4, "#59658a");
  [0, 1].forEach((r) => { fillRR(ctx, 36, 150 + r * 52, w - 72, 5, 2, "#b8895f"); for (let i = 0; i < 7; i++) fillRR(ctx, 42 + i * 30, 126 + r * 52, 20, 24, 4, ["#e57373", "#ffd54f", "#64b5f6", "#81c784", "#ffb74d", "#ba68c8", "#4db6ac"][(i + r * 3) % 7]); });
  fillRR(ctx, 28, h - 40, w - 56, 26, 4, "#b8895f"); fillRR(ctx, 28, h - 40, w - 56, 8, 3, "#d4a679");
  fillEllipse(ctx, 70, h - 46, 14, 8, "#f1c673"); fillEllipse(ctx, 100, h - 46, 10, 7, "#e0584f");
  fillEllipse(ctx, w - 70, h - 78, 16, 16, "#f1c673"); artText(ctx, "$", w - 70, h - 78, 16, "#8a5a10", 800);
}

function paintParasolTable(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, 70, 11);
  fillRR(ctx, w / 2 - 4, 60, 8, h - 70, 2, "#8c7a63");
  fillEllipse(ctx, w / 2, h - 52, 50, 15, "#efe3c8"); fillRR(ctx, w / 2 - 4, h - 52, 8, 40, 2, "#8c7a63");
  fillRR(ctx, 10, h - 40, 26, 20, 6, "#e0948f"); fillRR(ctx, w - 36, h - 40, 26, 20, 6, "#6a9fe0");
  ctx.beginPath(); ctx.moveTo(w / 2 - 78, 82); ctx.quadraticCurveTo(w / 2, 6, w / 2 + 78, 82); ctx.closePath(); ctx.fillStyle = "#fbf3e2"; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = "#e0848b"; for (let i = -3; i < 4; i += 2) { ctx.beginPath(); ctx.moveTo(w / 2, 6); ctx.lineTo(w / 2 + i * 26 - 13, 90); ctx.lineTo(w / 2 + i * 26 + 13, 90); ctx.fill(); } ctx.restore();
  fillEllipse(ctx, w / 2 - 14, h - 62, 12, 5, "#e8c88e"); fillRR(ctx, w / 2 + 6, h - 76, 11, 18, 3, "#f4d27a");
}

function paintKoiPond(ctx, w, h) {
  fillEllipse(ctx, w / 2, h / 2 + 6, w * 0.48, h * 0.44, "#b9a98a");                // stone rim
  fillEllipse(ctx, w / 2, h / 2, w * 0.45, h * 0.4, "#c9b99a");
  fillEllipse(ctx, w / 2, h / 2 + 2, w * 0.41, h * 0.35, "#7fb7d6");
  fillEllipse(ctx, w / 2 - 20, h / 2 - 10, w * 0.26, h * 0.16, "rgba(255,255,255,0.22)");
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; fillEllipse(ctx, w / 2 + Math.cos(a) * w * 0.455, h / 2 + 4 + Math.sin(a) * h * 0.4, 14, 9, i % 2 ? "#a99a7c" : "#bdae8e"); }
  const koi = (x, y, rot, c) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); fillEllipse(ctx, 0, 0, 20, 8, c); fillEllipse(ctx, -22, 0, 8, 6, c); fillEllipse(ctx, 8, -1, 5, 3, "rgba(255,255,255,0.7)"); ctx.restore(); };
  koi(w / 2 - 40, h / 2 + 4, 0.3, "#f2a05a"); koi(w / 2 + 50, h / 2 - 10, 2.6, "#fbf3e2"); koi(w / 2 + 6, h / 2 + 24, -0.4, "#e0584f");
  [[w / 2 + 74, h / 2 + 18], [w / 2 - 78, h / 2 - 14]].forEach(([x, y]) => { fillEllipse(ctx, x, y, 17, 9, "#7dba8a"); fillEllipse(ctx, x + 3, y - 2, 5, 3, "#f6c9d0"); });
}

// ---------- gate and fences ----------
function paintBarricade(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 5, w * 0.4, 6);
  fillRR(ctx, 8, h - 40, 8, 36, 2, "#8d96a8"); fillRR(ctx, w - 16, h - 40, 8, 36, 2, "#8d96a8");
  fillRR(ctx, 2, 10, w - 4, 26, 5, "#fbf3e2");
  ctx.save(); rrPath(ctx, 2, 10, w - 4, 26, 5); ctx.clip();
  ctx.fillStyle = "#e0842a"; for (let x = -20; x < w + 20; x += 28) { ctx.beginPath(); ctx.moveTo(x, 36); ctx.lineTo(x + 14, 36); ctx.lineTo(x + 34, 10); ctx.lineTo(x + 20, 10); ctx.fill(); }
  ctx.restore();
}
function paintGate(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 5, w * 0.42, 7);
  fillRR(ctx, 10, 30, 16, h - 36, 3, "#6f7c94"); fillRR(ctx, w - 26, 30, 16, h - 36, 3, "#6f7c94");
  fillRR(ctx, 20, 46, w - 40, 22, 6, "#fbf3e2");
  ctx.save(); rrPath(ctx, 20, 46, w - 40, 22, 6); ctx.clip();
  ctx.fillStyle = "#d94a3b"; for (let x = 0; x < w + 30; x += 34) { ctx.beginPath(); ctx.moveTo(x, 68); ctx.lineTo(x + 17, 68); ctx.lineTo(x + 37, 46); ctx.lineTo(x + 20, 46); ctx.fill(); }
  ctx.restore();
  // padlock sign
  fillRR(ctx, w / 2 - 28, 70, 56, 48, 8, "#fffdf6"); fillRR(ctx, w / 2 - 14, 92, 28, 20, 4, "#e0a23b");
  ctx.strokeStyle = "#6f7c94"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(w / 2, 90, 9, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = "#6f7c94"; ctx.fillRect(w / 2 - 1, 98, 2, 6);
}

// ---------- the player, seen from four directions ----------
function paintPlayer(ctx, w, h, dir, frame) {
  const shirt = "#f2a93b", pants = "#33415f", hair = "#2a2430", shoe = "#252d44";
  const sw = frame === 0 ? 0 : 6;
  fillEllipse(ctx, w / 2, h - 8, 22, 6, PAL.shadow);
  if (dir === "side") {
    // legs swing front/back
    fillRR(ctx, w / 2 - 7 - sw, h - 38, 13, 28 - Math.abs(sw) * 0.3, 4, "#2a3552");
    fillRR(ctx, w / 2 - 6 + sw, h - 38, 13, 28, 4, pants);
    fillRR(ctx, w / 2 - 6 + sw, h - 14, 18, 6, 3, shoe);
    fillRR(ctx, w / 2 - 8 - sw, h - 14, 18, 6, 3, shoe);
    fillRR(ctx, w / 2 - 14, h - 74, 28, 42, 12, shirt);
    fillRR(ctx, w / 2 - 6 - sw * 0.8, h - 70, 10, 30, 4, "#e09a30");          // arm swing
    fillEllipse(ctx, w / 2 + 1, h - 86, 14, 16, PAL.skin);
    fillEllipse(ctx, w / 2 - 3, h - 92, 14, 12, hair);
    fillRR(ctx, w / 2 - 14, h - 94, 14, 18, 6, hair);
    fillEllipse(ctx, w / 2 + 12, h - 84, 3, 3.5, PAL.skin);                       // nose
    fillEllipse(ctx, w / 2 + 7, h - 86, 1.8, 2.2, "#2a2430");
    return;
  }
  // front / back share a body
  fillRR(ctx, w / 2 - 14, h - 38, 12, 28 - sw, 4, pants);
  fillRR(ctx, w / 2 + 2, h - 38, 12, 22 + sw, 4, pants);
  fillRR(ctx, w / 2 - 15, h - 14 - sw, 14, 6, 3, shoe);
  fillRR(ctx, w / 2 + 1, h - 14, 14, 6, 3, shoe);
  fillRR(ctx, w / 2 - 20, h - 74, 40, 42, 12, shirt);
  fillRR(ctx, w / 2 - 26, h - 70, 9, 30 - sw * 0.6, 4, shirt);
  fillRR(ctx, w / 2 + 17, h - 70, 9, 24 + sw * 0.6, 4, shirt);
  if (dir === "up") {
    fillRR(ctx, w / 2 - 14, h - 70, 28, 6, 3, "#e09a30");                          // collar line
    fillEllipse(ctx, w / 2, h - 86, 15, 16, hair);                                  // back of head
    fillEllipse(ctx, w / 2, h - 80, 11, 9, "#1f1a26");
  } else {
    fillEllipse(ctx, w / 2, h - 86, 15, 16, PAL.skin);
    fillEllipse(ctx, w / 2, h - 94, 16, 10, hair);
    fillEllipse(ctx, w / 2 - 5, h - 85, 1.8, 2.2, "#2a2430"); fillEllipse(ctx, w / 2 + 5, h - 85, 1.8, 2.2, "#2a2430");
  }
}

// ---------- effects & markers ----------
function paintCloud(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, "rgba(246,250,254,1)");
  g.addColorStop(0.55, "rgba(238,245,252,0.95)");
  g.addColorStop(1, "rgba(232,241,250,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}
function paintBubble(ctx, w, h) {
  fillEllipse(ctx, w / 2, h / 2 - 2, 15, 15, "#f2a93b");
  ctx.beginPath(); ctx.moveTo(w / 2 - 5, h / 2 + 10); ctx.lineTo(w / 2, h - 2); ctx.lineTo(w / 2 + 5, h / 2 + 10); ctx.fillStyle = "#f2a93b"; ctx.fill();
  artText(ctx, "!", w / 2, h / 2 - 2, 20, "#ffffff", 800);
}
function paintShadowDot(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, "rgba(35,48,72,0.28)"); g.addColorStop(1, "rgba(35,48,72,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

// key -> [width, height, painter]. `ART_BASE` marks where the sprite's base
// (its feet) is, which is always the bottom-centre.
const ISLAND_ART = {
  hdbBlue: [380, 520, (c, w, h) => paintHdb(c, w, h, PAL.blue, PAL.blueDark)],
  hdbPink: [380, 520, (c, w, h) => paintHdb(c, w, h, PAL.pink, PAL.pinkDark)],
  hdbCream: [380, 520, (c, w, h) => paintHdb(c, w, h, PAL.cream, PAL.creamDark)],
  voidDeck: [560, 520, paintVoidDeck],
  hawkerCentre: [740, 440, paintHawkerCentre],
  mrtStation: [760, 520, paintMrtStation],
  bus: [300, 150, paintBus],
  taxi: [170, 90, paintTaxi],
  busStop: [70, 180, paintBusStop],
  stallRed: [210, 200, (c, w, h) => paintStall(c, w, h, PAL.red, "#d96b64", "鸡饭")],
  stallTeal: [210, 200, (c, w, h) => paintStall(c, w, h, PAL.teal, "#3f9d90", "沙爹")],
  stallGold: [210, 200, (c, w, h) => paintStall(c, w, h, PAL.gold, "#c78420", "煎饼")],
  table: [150, 120, paintTable],
  playground: [270, 230, paintPlayground],
  chessTable: [100, 90, paintChessTable],
  bench: [120, 64, paintBench],
  tree: [150, 190, paintTree],
  palm: [170, 250, paintPalm],
  shrub: [90, 60, paintShrub],
  pot: [60, 80, paintPot],
  lamp: [40, 170, paintLamp],
  boat: [360, 190, paintBoat],
  cloud: [512, 512, paintCloud],
  bubble: [48, 56, paintBubble],
  shadowDot: [128, 64, paintShadowDot],
  minimart: [380, 300, paintMinimart],
  dragonPlayground: [560, 330, paintDragon],
  wetMarket: [640, 330, paintWetMarket],
  kopitiam: [440, 340, paintKopitiam],
  busInterchange: [640, 290, paintBusInterchange],
  taxiStand: [440, 250, paintTaxiStand],
  homeHouse: [420, 330, paintHomeHouse],
  islandShop: [300, 260, paintIslandShop],
  parasolTable: [190, 170, paintParasolTable],
  koiPond: [310, 170, paintKoiPond],
  barricade: [92, 64, paintBarricade],
  gate: [220, 130, paintGate],
  player_down_0: [80, 120, (c, w, h) => paintPlayer(c, w, h, "down", 0)],
  player_down_1: [80, 120, (c, w, h) => paintPlayer(c, w, h, "down", 1)],
  player_up_0: [80, 120, (c, w, h) => paintPlayer(c, w, h, "up", 0)],
  player_up_1: [80, 120, (c, w, h) => paintPlayer(c, w, h, "up", 1)],
  player_side_0: [80, 120, (c, w, h) => paintPlayer(c, w, h, "side", 0)],
  player_side_1: [80, 120, (c, w, h) => paintPlayer(c, w, h, "side", 1)],
  uncle: [80, 120, (c, w, h) => paintPerson(c, w, h, "uncle", 0)],
  auntie: [80, 120, (c, w, h) => paintPerson(c, w, h, "auntie", 0)],
  staff: [80, 120, (c, w, h) => paintPerson(c, w, h, "staff", 0)],
};

// Registers every painted prop as a Phaser texture.
function buildIslandTextures(scene) {
  Object.entries(ISLAND_ART).forEach(([key, [w, h, paint]]) => {
    if (scene.textures.exists(key)) return;
    const { c, ctx } = artCanvas(w, h);
    paint(ctx, w, h);
    scene.textures.addCanvas(key, c);
  });
}