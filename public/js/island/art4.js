// More things for the home island: extra decorations, pets, and the still parts of the rides
// that have moving pieces (the moving pieces are drawn live by homeLife.js). Loaded after art3.js.

function paintWindmillBase(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, 80, 10);
  ctx.beginPath(); ctx.moveTo(w / 2 - 60, h - 12); ctx.lineTo(w / 2 - 38, 110); ctx.lineTo(w / 2 + 38, 110); ctx.lineTo(w / 2 + 60, h - 12); ctx.closePath(); ctx.fillStyle = "#f3e7cc"; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = "rgba(40,50,80,0.12)"; ctx.fillRect(w / 2 + 6, 0, 80, h); ctx.fillStyle = "#e6d6b4"; for (let y = 130; y < h; y += 36) ctx.fillRect(0, y, w, 4); ctx.restore();
  ctx.beginPath(); ctx.moveTo(w / 2 - 50, 114); ctx.lineTo(w / 2, 52); ctx.lineTo(w / 2 + 50, 114); ctx.closePath(); ctx.fillStyle = "#5fa59c"; ctx.fill();
  fillRR(ctx, w / 2 - 14, h - 76, 28, 64, 12, "#8a5a3a"); fillRR(ctx, w / 2 - 12, 150, 24, 30, 5, "#cfe3f5");
  ctx.save(); ctx.translate(w / 2, 100);
  ctx.restore(); fillEllipse(ctx, w / 2, 100, 9, 9, "#6f4b34");
}

function paintCarouselBase(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, 120, 12);
  fillEllipse(ctx, w / 2, h - 30, 118, 30, "#b88a64"); fillEllipse(ctx, w / 2, h - 36, 112, 26, "#d9b07f");
  fillRR(ctx, w / 2 - 12, 50, 24, h - 86, 6, "#e0848b");
  ctx.beginPath(); ctx.moveTo(12, 78); ctx.lineTo(w / 2, 18); ctx.lineTo(w - 12, 78); ctx.quadraticCurveTo(w / 2, 66, 12, 78); ctx.closePath(); ctx.fillStyle = "#e0584f"; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = "#fbf3e2"; for (let i = -4; i < 5; i += 2) { ctx.beginPath(); ctx.moveTo(w / 2, 18); ctx.lineTo(w / 2 + i * 22 - 11, 84); ctx.lineTo(w / 2 + i * 22 + 11, 84); ctx.fill(); } ctx.restore();
  fillEllipse(ctx, w / 2, 14, 7, 7, "#f6d54a");
}

function paintFerrisBase(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, 120, 12);
  const cx = w / 2, cy = 168;
  ctx.strokeStyle = "#8a97ad"; ctx.lineWidth = 12; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx - 80, h - 14); ctx.lineTo(cx, cy); ctx.lineTo(cx + 80, h - 14); ctx.stroke();
  fillRR(ctx, cx - 100, h - 24, 200, 14, 5, "#c9d3e6");
}


function paintCampfire(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, 46, 8);
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; fillEllipse(ctx, w / 2 + Math.cos(a) * 40, h - 22 + Math.sin(a) * 12, 10, 7, i % 2 ? "#aeb8c8" : "#c9d3e6"); }
  ctx.strokeStyle = "#8d6444"; ctx.lineWidth = 9; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(w / 2 - 30, h - 16); ctx.lineTo(w / 2 + 28, h - 32); ctx.moveTo(w / 2 + 30, h - 16); ctx.lineTo(w / 2 - 28, h - 32); ctx.stroke();
  fillEllipse(ctx, w / 2, h - 36, 14, 22, "#f2a93b"); fillEllipse(ctx, w / 2, h - 32, 8, 14, "#f6d54a");
}

function paintFlowerBed(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, w * 0.46, 8);
  fillRR(ctx, 8, h - 40, w - 16, 30, 12, "#a9774f"); fillRR(ctx, 14, h - 46, w - 28, 24, 10, "#7a5236");
  const cols = ["#e0584f", "#f6d54a", "#ff9ec2", "#fbf3e2", "#b68be0", "#f2a93b"];
  for (let i = 0; i < 9; i++) {
    const x = 26 + i * ((w - 52) / 8), top = 22 + ((i * 17) % 22);
    ctx.strokeStyle = "#5a9c6c"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x, h - 36); ctx.lineTo(x, top + 8); ctx.stroke();
    fillEllipse(ctx, x - 6, h - 44 - (i % 2) * 6, 6, 3.5, "#7dba8a", -0.5);
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; fillEllipse(ctx, x + Math.cos(a) * 6, top + Math.sin(a) * 6, 5, 5, cols[i % 6]); }
    fillEllipse(ctx, x, top, 3.5, 3.5, "#f6d54a");
  }
}

// ---------- pets (they face right; the island flips them) ----------
function petEye(ctx, x, y) { fillEllipse(ctx, x, y, 1.9, 2.2, "#2a3550"); }
function paintPetDog(ctx, w, h) {
  groundShadow(ctx, 36, h - 4, 24, 4);
  ctx.strokeStyle = "#a8703f"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(15, 30); ctx.quadraticCurveTo(6, 26, 8, 16); ctx.stroke();
  [[20, "#a8703f"], [30, "#b98048"], [42, "#a8703f"], [51, "#b98048"]].forEach(([x, c]) => fillRR(ctx, x - 3, 38, 7, 15, 3, c));
  fillEllipse(ctx, 34, 36, 21, 13, "#c98f55"); fillEllipse(ctx, 32, 42, 14, 6, "#e0b684");
  fillEllipse(ctx, 52, 24, 12, 11, "#d9a064"); fillEllipse(ctx, 45, 20, 4.5, 9, "#8a5a30", 0.4);
  fillEllipse(ctx, 60, 29, 7, 5, "#f1d3a8"); fillEllipse(ctx, 65, 27, 2.6, 2.2, "#2a3550"); petEye(ctx, 55, 21);
  fillEllipse(ctx, 61, 35, 4, 2.6, "#e0848b");
}
function paintPetCat(ctx, w, h) {
  groundShadow(ctx, 36, h - 4, 22, 4);
  ctx.strokeStyle = "#e8a15a"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(16, 34); ctx.quadraticCurveTo(2, 30, 6, 12); ctx.stroke();
  [[22, "#d98d44"], [31, "#e8a15a"], [41, "#d98d44"], [50, "#e8a15a"]].forEach(([x, c]) => fillRR(ctx, x - 3, 40, 6, 13, 3, c));
  fillEllipse(ctx, 34, 36, 19, 12, "#e8a15a"); ctx.strokeStyle = "#d98d44"; ctx.lineWidth = 3; [26, 33, 40].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, 26); ctx.lineTo(x + 2, 34); ctx.stroke(); });
  ctx.fillStyle = "#e8a15a"; ctx.beginPath(); ctx.moveTo(44, 19); ctx.lineTo(47, 5); ctx.lineTo(54, 16); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(54, 16); ctx.lineTo(60, 5); ctx.lineTo(62, 20); ctx.closePath(); ctx.fill();
  fillEllipse(ctx, 53, 26, 11, 10, "#f0b070"); petEye(ctx, 57, 23); petEye(ctx, 49, 23); fillEllipse(ctx, 56, 29, 2, 1.5, "#e0848b");
  ctx.strokeStyle = "rgba(42,53,80,0.5)"; ctx.lineWidth = 1; [[0, -2], [0, 2]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(58, 29); ctx.lineTo(68, 28 + a * 3 + b); ctx.stroke(); });
}
function paintPetBunny(ctx, w, h) {
  groundShadow(ctx, 36, h - 4, 22, 4);
  fillEllipse(ctx, 14, 37, 6, 6, "#fffaf2");
  [[24, "#e9e2d6"], [46, "#e9e2d6"]].forEach(([x, c]) => fillRR(ctx, x - 4, 42, 9, 11, 4, c));
  fillEllipse(ctx, 33, 37, 18, 12, "#f4efe8");
  fillEllipse(ctx, 49, 28, 10.5, 9.5, "#f8f4ee");
  fillEllipse(ctx, 46, 10, 3.8, 11, "#f4efe8", -0.15); fillEllipse(ctx, 46, 10, 1.8, 8, "#f6c9d0", -0.15);
  fillEllipse(ctx, 54, 9, 3.8, 11, "#f4efe8", 0.2); fillEllipse(ctx, 54, 9, 1.8, 8, "#f6c9d0", 0.2);
  petEye(ctx, 54, 26); fillEllipse(ctx, 59, 30, 2.2, 1.7, "#e0848b");
}
function paintPetDuck(ctx, w, h) {
  groundShadow(ctx, 36, h - 4, 20, 4);
  fillRR(ctx, 28, 46, 3, 8, 1.5, "#f2a93b"); fillRR(ctx, 40, 46, 3, 8, 1.5, "#f2a93b");
  ctx.fillStyle = "#f2a93b"; ctx.fillRect(25, 52, 9, 3); ctx.fillRect(37, 52, 9, 3);
  fillEllipse(ctx, 33, 36, 18, 13, "#f6d54a"); fillEllipse(ctx, 29, 37, 10, 6.5, "#e8bd2c", 0.3);
  fillEllipse(ctx, 18, 31, 5, 3, "#f6d54a", -0.5);
  fillEllipse(ctx, 47, 21, 10, 10, "#f8de5c"); fillEllipse(ctx, 57, 24, 6.5, 3.2, "#f2a93b"); petEye(ctx, 50, 18);
}
function paintPetTurtle(ctx, w, h) {
  groundShadow(ctx, 36, h - 4, 24, 4);
  [[22], [46]].forEach(([x]) => fillRR(ctx, x - 5, 42, 10, 11, 4, "#9bc58a"));
  fillEllipse(ctx, 14, 44, 5, 3, "#9bc58a"); fillEllipse(ctx, 57, 36, 9, 6.5, "#9bc58a"); petEye(ctx, 60, 34);
  fillEllipse(ctx, 34, 38, 23, 15, "#4f9060"); fillEllipse(ctx, 34, 36, 21, 12, "#5a9c6c");
  ctx.strokeStyle = "#3f7d50"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(22, 36); ctx.lineTo(46, 36); ctx.moveTo(34, 25); ctx.lineTo(34, 47); ctx.moveTo(26, 28); ctx.lineTo(24, 46); ctx.moveTo(42, 28); ctx.lineTo(44, 46); ctx.stroke();
}

Object.assign(ISLAND_ART, {
  campfire: [110, 120, paintCampfire],
  flowerBed: [200, 90, paintFlowerBed],
  pet_dog: [72, 56, paintPetDog],
  pet_cat: [72, 56, paintPetCat],
  pet_bunny: [72, 56, paintPetBunny],
  pet_duck: [72, 56, paintPetDuck],
  pet_turtle: [72, 56, paintPetTurtle],
});

// Still parts of the rides whose moving pieces are drawn live (painted by homeLife.js, not part of the shop list).
const HOME_BASE_ART = {
  windmillBase: [260, 340, paintWindmillBase],
  carouselBase: [280, 250, paintCarouselBase],
  ferrisBase: [380, 430, paintFerrisBase],
};