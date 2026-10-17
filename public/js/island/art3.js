// Things to buy for the home island: rides, buildings and decorations.
// Same flat style as the rest of the island. Loaded after art2.js.

function paintFerrisWheel(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, 120, 12);
  const cx = w / 2, cy = 168, R = 142;
  ctx.strokeStyle = "#8a97ad"; ctx.lineWidth = 12; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx - 80, h - 14); ctx.lineTo(cx, cy); ctx.lineTo(cx + 80, h - 14); ctx.stroke();
  fillRR(ctx, cx - 100, h - 24, 200, 14, 5, "#c9d3e6");
  ctx.strokeStyle = "#e0848b"; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
  ctx.lineWidth = 4; ctx.strokeStyle = "#f4c5c9"; ctx.beginPath(); ctx.arc(cx, cy, R - 34, 0, 7); ctx.stroke();
  ctx.strokeStyle = "#e0848b"; ctx.lineWidth = 4;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke(); }
  const cols = ["#f2a93b", "#5b7fd0", "#e0584f", "#72c4b8", "#f6d54a", "#ba68c8"];
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; fillRR(ctx, x - 14, y - 4, 28, 26, 7, cols[i % 6]); fillRR(ctx, x - 10, y, 20, 10, 3, "rgba(255,255,255,0.55)"); }
  fillEllipse(ctx, cx, cy, 16, 16, "#f6d54a"); fillEllipse(ctx, cx, cy, 7, 7, "#fff3d0");
}

function paintCarousel(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, 120, 12);
  fillEllipse(ctx, w / 2, h - 30, 118, 30, "#b88a64"); fillEllipse(ctx, w / 2, h - 36, 112, 26, "#d9b07f");
  [[-78, 0], [-30, 14], [30, 14], [78, 0]].forEach(([dx, dy], i) => {
    const x = w / 2 + dx; ctx.strokeStyle = "#f6d54a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, 70 + dy); ctx.lineTo(x, h - 36 + dy * 0.4); ctx.stroke();
    fillEllipse(ctx, x, 130 + dy, 17, 13, ["#fff", "#f6c9d0", "#cfe3f5", "#fff"][i]); fillRR(ctx, x + 6, 112 + dy, 10, 16, 5, ["#fff", "#f6c9d0", "#cfe3f5", "#fff"][i]);
  });
  fillRR(ctx, w / 2 - 12, 50, 24, h - 86, 6, "#e0848b");
  ctx.beginPath(); ctx.moveTo(12, 78); ctx.lineTo(w / 2, 18); ctx.lineTo(w - 12, 78); ctx.quadraticCurveTo(w / 2, 66, 12, 78); ctx.closePath(); ctx.fillStyle = "#e0584f"; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = "#fbf3e2"; for (let i = -4; i < 5; i += 2) { ctx.beginPath(); ctx.moveTo(w / 2, 18); ctx.lineTo(w / 2 + i * 22 - 11, 84); ctx.lineTo(w / 2 + i * 22 + 11, 84); ctx.fill(); } ctx.restore();
  fillEllipse(ctx, w / 2, 14, 7, 7, "#f6d54a");
}

function paintLighthouse(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, 62, 9);
  ctx.beginPath(); ctx.moveTo(w / 2 - 44, h - 12); ctx.lineTo(w / 2 - 28, 90); ctx.lineTo(w / 2 + 28, 90); ctx.lineTo(w / 2 + 44, h - 12); ctx.closePath(); ctx.fillStyle = "#fbf3e2"; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = "#e0584f"; [[130, 40], [200, 40], [270, 40]].forEach(([y, hh]) => ctx.fillRect(0, y, w, hh * 0.9)); ctx.fillStyle = "rgba(40,50,80,0.14)"; ctx.fillRect(w / 2 + 8, 0, 50, h); ctx.restore();
  fillRR(ctx, w / 2 - 40, 80, 80, 14, 4, "#6f7c94");
  fillRR(ctx, w / 2 - 26, 38, 52, 44, 6, "#cfe3f5"); fillEllipse(ctx, w / 2, 62, 12, 14, "#f6d54a");
  ctx.beginPath(); ctx.moveTo(w / 2 - 34, 40); ctx.lineTo(w / 2, 8); ctx.lineTo(w / 2 + 34, 40); ctx.closePath(); ctx.fillStyle = "#e0584f"; ctx.fill();
  fillRR(ctx, w / 2 - 12, h - 62, 24, 50, 4, "#59658a");
}

function paintTreehouse(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, 90, 11);
  fillRR(ctx, w / 2 - 22, 130, 44, h - 138, 10, "#9a6a46"); fillRR(ctx, w / 2 + 6, 130, 16, h - 138, 8, "#80553a");
  [[w / 2 - 90, 100, 84], [w / 2 + 90, 100, 84], [w / 2, 54, 100], [w / 2 - 60, 150, 66], [w / 2 + 60, 150, 66]].forEach(([x, y, r], i) => { fillEllipse(ctx, x, y, r, r * 0.8, i % 2 ? PAL.leaf : PAL.leafDark); });
  fillEllipse(ctx, w / 2 - 30, 70, 60, 36, PAL.leafLight);
  fillRR(ctx, w / 2 - 62, 108, 124, 14, 4, "#b88a64");
  fillRR(ctx, w / 2 - 50, 62, 100, 50, 6, "#e2b985"); fillRR(ctx, w / 2 + 14, 62, 36, 50, 6, "#caa06e");
  ctx.beginPath(); ctx.moveTo(w / 2 - 60, 66); ctx.lineTo(w / 2, 28); ctx.lineTo(w / 2 + 60, 66); ctx.closePath(); ctx.fillStyle = "#d9776c"; ctx.fill();
  fillRR(ctx, w / 2 - 36, 78, 24, 26, 4, "#cfe3f5"); fillRR(ctx, w / 2 + 6, 82, 22, 30, 4, "#6f4b34");
  ctx.strokeStyle = "#b88a64"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(w / 2 + 44, 118); ctx.lineTo(w / 2 + 70, h - 14); ctx.moveTo(w / 2 + 62, 118); ctx.lineTo(w / 2 + 88, h - 14); ctx.stroke();
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(w / 2 + 48 + i * 7, 130 + i * 30); ctx.lineTo(w / 2 + 68 + i * 7, 130 + i * 30); ctx.stroke(); }
  ctx.strokeStyle = "#f6d54a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w / 2 - 80, 110); ctx.quadraticCurveTo(w / 2 - 40, 140, w / 2, 112); ctx.stroke();
}

function paintWindmill(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, 80, 10);
  ctx.beginPath(); ctx.moveTo(w / 2 - 60, h - 12); ctx.lineTo(w / 2 - 38, 110); ctx.lineTo(w / 2 + 38, 110); ctx.lineTo(w / 2 + 60, h - 12); ctx.closePath(); ctx.fillStyle = "#f3e7cc"; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = "rgba(40,50,80,0.12)"; ctx.fillRect(w / 2 + 6, 0, 80, h); ctx.fillStyle = "#e6d6b4"; for (let y = 130; y < h; y += 36) ctx.fillRect(0, y, w, 4); ctx.restore();
  ctx.beginPath(); ctx.moveTo(w / 2 - 50, 114); ctx.lineTo(w / 2, 52); ctx.lineTo(w / 2 + 50, 114); ctx.closePath(); ctx.fillStyle = "#5fa59c"; ctx.fill();
  fillRR(ctx, w / 2 - 14, h - 76, 28, 64, 12, "#8a5a3a"); fillRR(ctx, w / 2 - 12, 150, 24, 30, 5, "#cfe3f5");
  ctx.save(); ctx.translate(w / 2, 100);
  for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * Math.PI / 2 + 0.35); ctx.fillStyle = "#b88a64"; ctx.fillRect(-3, -112, 6, 112); ctx.fillStyle = "#fbf3e2"; ctx.fillRect(4, -108, 30, 70); ctx.strokeStyle = "#b88a64"; ctx.lineWidth = 2; ctx.strokeRect(4, -108, 30, 70); ctx.restore(); }
  ctx.restore(); fillEllipse(ctx, w / 2, 100, 9, 9, "#6f4b34");
}

function paintCafe(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, w * 0.46, 11);
  fillRR(ctx, 18, 60, w - 36, h - 72, 8, "#f6e6d6"); fillRR(ctx, w - 54, 60, 36, h - 72, 8, "#e8d2bb");
  fillRR(ctx, 8, 44, w - 16, 24, 8, "#8a5a3a");
  fillRR(ctx, w / 2 - 62, 8, 124, 40, 12, "#fffdf7"); artText(ctx, sg("咖啡馆"), w / 2, 28, 26, "#6f4b34", 800, (124) - 14);
  ctx.fillStyle = "#e0848b"; ctx.fillRect(14, 96, w - 28, 22); for (let k = 0; k < 8; k++) fillEllipse(ctx, 14 + (k + 0.5) * ((w - 28) / 8), 118, (w - 28) / 16, 10, k % 2 ? "#fbf3e2" : "#e0848b");
  for (let k = 0; k < 8; k += 2) fillRR(ctx, 14 + k * ((w - 28) / 8), 96, (w - 28) / 8, 22, 0, "#fbf3e2");
  fillRR(ctx, 34, 128, w - 68, h - 150, 6, "#59658a"); fillRR(ctx, 40, 134, w - 80, h - 162, 4, "#9fc2e4");
  fillRR(ctx, 50, 160, w - 100, 8, 3, "#b88a64"); fillEllipse(ctx, 80, 150, 12, 9, "#fff"); fillEllipse(ctx, w / 2, 150, 12, 9, "#fff"); fillEllipse(ctx, w - 80, 150, 12, 9, "#fff");
  fillRR(ctx, w / 2 - 20, h - 58, 40, 46, 5, "#6f4b34");
  fillEllipse(ctx, 40, h - 24, 18, 6, "rgba(40,50,80,0.12)"); fillRR(ctx, 28, h - 48, 24, 24, 5, "#e0a23b"); artText(ctx, sg("☕"), 40, h - 36, 14, "#fff", 800, (24) - 14);
}

function paintArcade(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, w * 0.46, 11);
  fillRR(ctx, 16, 56, w - 32, h - 68, 8, "#4b4f8a"); fillRR(ctx, w - 56, 56, 40, h - 68, 8, "#3b3f72");
  fillRR(ctx, 8, 40, w - 16, 22, 8, "#2f3260");
  fillRR(ctx, 30, 6, w - 60, 44, 12, "#1f2246"); artText(ctx, sg("游戏厅"), w / 2, 29, 28, "#7ff0ff", 800, (w - 60) - 14);
  ctx.strokeStyle = "#ff7ad9"; ctx.lineWidth = 3; rrPath(ctx, 34, 10, w - 68, 36, 10); ctx.stroke();
  [["#ff7ad9", 40], ["#7ff0ff", 80], ["#f6d54a", w - 80], ["#8bf09c", w - 40]].forEach(([c, x]) => fillEllipse(ctx, x, 66, 6, 6, c));
  for (let i = 0; i < 3; i++) { const x = 40 + i * 78; fillRR(ctx, x, 100, 64, 70, 6, "#232650"); fillRR(ctx, x + 6, 106, 52, 36, 4, ["#7ff0ff", "#ff7ad9", "#f6d54a"][i]); fillEllipse(ctx, x + 22, 156, 6, 6, "#ff5a5a"); fillEllipse(ctx, x + 42, 156, 6, 6, "#5ab0ff"); }
  fillRR(ctx, w / 2 - 28, h - 70, 56, 58, 6, "#7ff0ff"); fillRR(ctx, w / 2 - 22, h - 64, 44, 52, 4, "#232650");
}

function paintBounce(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, w * 0.46, 10);
  fillRR(ctx, 18, 78, w - 36, h - 92, 24, "#f6a5c0"); fillRR(ctx, w - 60, 78, 42, h - 92, 20, "#e68aab");
  [[28], [w - 28]].forEach(([x]) => { fillRR(ctx, x - 24, 28, 48, 100, 22, "#f6d54a"); fillRR(ctx, x + 6, 28, 18, 100, 14, "#e0bb2e"); ctx.beginPath(); ctx.moveTo(x - 24, 40); ctx.lineTo(x, 6); ctx.lineTo(x + 24, 40); ctx.closePath(); ctx.fillStyle = "#e0584f"; ctx.fill(); });
  fillRR(ctx, 62, 40, w - 124, 44, 10, "#9fd6f0"); [0, 1, 2].forEach((i) => fillRR(ctx, 72 + i * ((w - 144) / 3 + 4), 48, (w - 144) / 3 - 8, 28, 6, ["#f6d54a", "#f6a5c0", "#8bd7a0"][i]));
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(w / 2, h - 66, 32, Math.PI, 0); ctx.fill(); fillRR(ctx, w / 2 - 32, h - 66, 64, 54, 4, "#e68aab"); ctx.beginPath(); ctx.arc(w / 2, h - 66, 26, Math.PI, 0); ctx.fillStyle = "#b9528a"; ctx.fill(); fillRR(ctx, w / 2 - 26, h - 66, 52, 54, 2, "#b9528a");
}

function paintBalloon(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, 36, 8);
  ctx.beginPath(); ctx.moveTo(w / 2 - 24, 190); ctx.bezierCurveTo(w / 2 - 110, 150, w / 2 - 100, 8, w / 2, 8); ctx.bezierCurveTo(w / 2 + 100, 8, w / 2 + 110, 150, w / 2 + 24, 190); ctx.closePath(); ctx.fillStyle = "#e0584f"; ctx.fill();
  ctx.save(); ctx.clip();
  [[-70, "#f6d54a"], [-24, "#5b7fd0"], [22, "#f6d54a"], [68, "#5b7fd0"]].forEach(([dx, c]) => { ctx.beginPath(); ctx.moveTo(w / 2 + dx, 0); ctx.quadraticCurveTo(w / 2 + dx * 1.6, 100, w / 2 + dx * 0.3, 200); ctx.lineTo(w / 2 + dx + 26, 200); ctx.quadraticCurveTo(w / 2 + dx * 1.6 + 30, 100, w / 2 + dx + 26, 0); ctx.fillStyle = c; ctx.fill(); });
  ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.beginPath(); ctx.ellipse(w / 2 - 30, 60, 22, 46, 0.4, 0, 7); ctx.fill(); ctx.restore();
  ctx.strokeStyle = "#6f4b34"; ctx.lineWidth = 2.5; [[-20, -14], [20, 14], [-8, -6], [8, 6]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(w / 2 + a, 190); ctx.lineTo(w / 2 + b, h - 52); ctx.stroke(); });
  fillRR(ctx, w / 2 - 22, h - 54, 44, 38, 6, "#b88a64"); fillRR(ctx, w / 2 - 22, h - 54, 44, 10, 4, "#d4a679");
  ctx.strokeStyle = "#8a97ad"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w / 2, h - 16); ctx.lineTo(w / 2 + 28, h - 8); ctx.stroke();
}

function paintPool(ctx, w, h) {
  fillRR(ctx, 4, 10, w - 8, h - 20, 30, "#e8dcc2"); fillRR(ctx, 14, 20, w - 28, h - 40, 24, "#7fd0e8");
  fillRR(ctx, 22, 28, w - 44, 26, 14, "#a8e4f4"); ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(50 + i * 70, 90 + (i % 2) * 22); ctx.quadraticCurveTo(66 + i * 70, 80 + (i % 2) * 22, 82 + i * 70, 90 + (i % 2) * 22); ctx.stroke(); }
  fillEllipse(ctx, w - 90, 80, 24, 14, "#f6d54a"); fillEllipse(ctx, w - 90, 80, 10, 6, "#7fd0e8"); fillEllipse(ctx, 90, 110, 26, 14, "#f6a5c0"); fillEllipse(ctx, 90, 110, 11, 6, "#7fd0e8");
  ctx.strokeStyle = "#c9d3e6"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(w - 40, 14); ctx.lineTo(w - 40, 40); ctx.moveTo(w - 54, 14); ctx.lineTo(w - 54, 40); ctx.stroke();
}

function paintFountain(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, 100, 12);
  fillEllipse(ctx, w / 2, h - 36, 110, 34, "#b9a98a"); fillEllipse(ctx, w / 2, h - 40, 102, 28, "#c9b99a"); fillEllipse(ctx, w / 2, h - 42, 92, 22, "#8fd0e8");
  fillRR(ctx, w / 2 - 12, 76, 24, h - 110, 6, "#c9b99a"); fillEllipse(ctx, w / 2, 100, 52, 16, "#c9b99a"); fillEllipse(ctx, w / 2, 98, 44, 11, "#8fd0e8");
  fillRR(ctx, w / 2 - 7, 40, 14, 40, 5, "#c9b99a"); fillEllipse(ctx, w / 2, 40, 26, 8, "#c9b99a");
  ctx.strokeStyle = "rgba(170,225,245,0.9)"; ctx.lineWidth = 4; ctx.lineCap = "round";
  [[-34, -22], [-16, -12], [0, 0], [16, 12], [34, 22]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.moveTo(w / 2, 38); ctx.quadraticCurveTo(w / 2 + dx * 0.6, 4 + Math.abs(dx) * 0.2, w / 2 + dx, 96 + Math.abs(dy)); ctx.stroke(); });
  fillEllipse(ctx, w / 2, 20, 6, 8, "rgba(210,240,250,0.9)");
}

function paintIceCream(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, 108, 10);
  fillRR(ctx, 16, 56, w - 32, h - 76, 14, "#fbf3e2"); fillRR(ctx, w - 70, 56, 54, h - 76, 14, "#e8dcc2");
  fillRR(ctx, 16, 56, w - 32, 22, 10, "#f6a5c0");
  fillRR(ctx, 34, 86, 94, 52, 8, "#9fc2e4"); fillRR(ctx, 34, 128, 94, 10, 3, "#e0848b");
  ctx.fillStyle = "#e0848b"; ctx.fillRect(30, 80, 102, 10); for (let k = 0; k < 6; k++) fillEllipse(ctx, 34 + k * 19.5, 90, 10, 8, k % 2 ? "#fbf3e2" : "#e0848b");
  fillRR(ctx, 144, 86, 60, 46, 8, "#cfe3f5");
  ctx.beginPath(); ctx.moveTo(w / 2 - 22, 52); ctx.lineTo(w / 2 + 22, 52); ctx.lineTo(w / 2, 10); ctx.closePath(); ctx.fillStyle = "#e2b985"; ctx.fill();
  fillEllipse(ctx, w / 2, 44, 24, 14, "#f6a5c0"); fillEllipse(ctx, w / 2, 30, 18, 12, "#fbf3e2"); fillEllipse(ctx, w / 2, 18, 8, 6, "#e0584f");
  [[52], [w - 58]].forEach(([x]) => { fillEllipse(ctx, x, h - 24, 20, 20, "#3a4666"); fillEllipse(ctx, x, h - 24, 9, 9, "#b0bacb"); });
}

function paintFairyArch(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, 90, 8);
  ctx.strokeStyle = "#b88a64"; ctx.lineWidth = 12; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(34, h - 12); ctx.lineTo(34, 100); ctx.quadraticCurveTo(w / 2, -30, w - 34, 100); ctx.lineTo(w - 34, h - 12); ctx.stroke();
  const cols = ["#f6d54a", "#ff7ad9", "#7ff0ff", "#8bf09c", "#f2a93b"];
  for (let i = 0; i < 16; i++) { const t = i / 15; const x = 34 + t * (w - 68); const y = 100 - Math.sin(t * Math.PI) * 108 + (t < 0.1 || t > 0.9 ? 40 : 0); fillEllipse(ctx, x, y + 6, 6, 6, cols[i % 5]); fillEllipse(ctx, x, y + 6, 11, 11, "rgba(255,240,170,0.28)"); }
  for (let i = 0; i < 7; i++) { const y = 116 + i * 20; fillEllipse(ctx, 34, y, 5, 5, cols[(i + 1) % 5]); fillEllipse(ctx, w - 34, y, 5, 5, cols[(i + 3) % 5]); }
}

Object.assign(ISLAND_ART, {
  ferrisWheel: [380, 430, paintFerrisWheel],
  carousel: [280, 250, paintCarousel],
  lighthouse: [150, 340, paintLighthouse],
  treehouse: [320, 330, paintTreehouse],
  windmill: [260, 340, paintWindmill],
  cafe: [300, 270, paintCafe],
  arcade: [300, 250, paintArcade],
  bounceCastle: [260, 210, paintBounce],
  balloon: [220, 330, paintBalloon],
  pool: [340, 200, paintPool],
  fountain: [260, 220, paintFountain],
  iceCreamTruck: [270, 170, paintIceCream],
  fairyArch: [240, 260, paintFairyArch],
});

// A small picture of any prop, for the shop list (a data URL, cached).
const ART_THUMBS = {};
function artThumb(key) {
  if (ART_THUMBS[key]) return ART_THUMBS[key];
  const [w, h, paint] = ISLAND_ART[key];
  const { c, ctx } = artCanvas(w, h);
  paint(ctx, w, h);
  return (ART_THUMBS[key] = c.toDataURL());
}