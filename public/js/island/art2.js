// More scenery and the characters. Loaded after art.js; it adds to ISLAND_ART.
// Characters are drawn with soft shading, outlines and faces, in four
// directions (front, back, side) with a three-pose walk cycle.

function shade(color, f) {
  let r, g, b;
  const m = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(color);
  if (m) { r = +m[1]; g = +m[2]; b = +m[3]; }
  else { const n = parseInt(color.slice(1), 16); r = n >> 16; g = (n >> 8) & 255; b = n & 255; }
  const t = f < 0 ? 0 : 255, p = Math.abs(f);
  r = Math.round(r + (t - r) * p); g = Math.round(g + (t - g) * p); b = Math.round(b + (t - b) * p);
  return `rgb(${r}, ${g}, ${b})`;
}
const OUTLINE = "rgba(34, 42, 66, 0.34)";

// Fill a rounded rect with a soft vertical shade and a thin outline.
function solidRR(ctx, x, y, w, h, r, color, outline = true) {
  rrPath(ctx, x, y, w, h, r);
  const g = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
  g.addColorStop(0, shade(color, 0.12)); g.addColorStop(1, shade(color, -0.1));
  ctx.fillStyle = g; ctx.fill();
  if (outline) { ctx.lineWidth = 1.2; ctx.strokeStyle = OUTLINE; ctx.stroke(); }
}
function solidEllipse(ctx, x, y, rx, ry, color, outline = true) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(x - rx, y - ry, x + rx * 0.6, y + ry);
  g.addColorStop(0, shade(color, 0.14)); g.addColorStop(1, shade(color, -0.1));
  ctx.fillStyle = g; ctx.fill();
  if (outline) { ctx.lineWidth = 1.2; ctx.strokeStyle = OUTLINE; ctx.stroke(); }
}

const SKIN_TONES = { light: "#f6d3b3", warm: "#eebb91", tan: "#d9a273", deep: "#a8734c" };

// Characters are drawn as young adults: about 7 heads tall, slim, with simple
// faces and real clothes (hoodie, tee, jeans, trainers).
// spec: { female, skin, hair, hairStyle, top, bottom, shoe, sleeve, hat, hatColor, glasses, apron, badge, vest, skirt }
// Realistic young-adult proportions (about 7 heads tall), flat colours with soft shading.
function limb(ctx, x1, y1, x2, y2, wid, col) {
  ctx.lineCap = "round";
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = wid + 1.4; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = wid; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
function shaded(ctx, color, x0, x1) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(color, 0.1)); g.addColorStop(0.6, color); g.addColorStop(1, shade(color, -0.16));
  return g;
}

function paintCharacter(ctx, w, h, dir, frame, s) {
  const cx = w / 2;
  const base = h - 9;
  const pose = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  const bob = pose ? -1 : 0;
  const skin = s.skin || SKIN_TONES.warm;
  const female = !!s.female;
  const shoe = s.shoe || "#e8e5de";
  const hipY = base - 46 + bob, shY = base - 76 + bob, hy = base - 90 + bob;
  const wS = female ? 13 : 15, wW = female ? 10 : 11.5;
  const side = dir === "side";
  const longSleeve = s.sleeve === "long";
  groundShadow(ctx, cx, base + 1, 17, 5);

  // ----- hair behind the head -----
  const hs = s.hairStyle;
  if (hs === "long" && (dir !== "up")) {
    ctx.beginPath();
    if (side) { ctx.moveTo(cx - 3, hy - 12); ctx.quadraticCurveTo(cx - 16, hy - 4, cx - 13, shY + 8); ctx.lineTo(cx - 1, shY + 6); ctx.closePath(); }
    else { ctx.moveTo(cx - 11, hy - 6); ctx.quadraticCurveTo(cx - 15, shY + 4, cx - 11, shY + 14); ctx.lineTo(cx + 11, shY + 14); ctx.quadraticCurveTo(cx + 15, shY + 4, cx + 11, hy - 6); ctx.closePath(); }
    ctx.fillStyle = s.hair; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = OUTLINE; ctx.stroke();
  }
  if (hs === "ponytail" && dir === "side") { limb(ctx, cx - 7, hy - 6, cx - 15 - pose * 2, hy + 20, 6, s.hair); }

  // ----- legs -----
  const footY = base - 3;
  const legs = s.skirt ? skin : s.bottom;
  const swing = pose * 8;
  if (side) {
    limb(ctx, cx, hipY + 2, cx - swing, footY - 4, 10, shade(legs, -0.18));
    ctx.fillStyle = shade(shoe, -0.15); ctx.beginPath(); ctx.ellipse(cx - swing + 3, footY, 8, 4, 0, 0, 7); ctx.fill();
    limb(ctx, cx, hipY + 2, cx + swing, footY - 4, 10, legs);
    solidEllipse(ctx, cx + swing + 3, footY, 8.5, 4.2, shoe);
  } else {
    const lift = (side0) => (pose === side0 ? 3 : 0);
    limb(ctx, cx - 5.5, hipY + 2, cx - 6, footY - 4 - lift(1), 10.5, legs);
    limb(ctx, cx + 5.5, hipY + 2, cx + 6, footY - 4 - lift(-1), 10.5, legs);
    solidEllipse(ctx, cx - 6, footY - lift(1), 6.5, 4.2, shoe); solidEllipse(ctx, cx - 6, footY - lift(1) + 2.6, 6.3, 1.5, shade(shoe, -0.35), false);
    solidEllipse(ctx, cx + 6, footY - lift(-1), 6.5, 4.2, shoe); solidEllipse(ctx, cx + 6, footY - lift(-1) + 2.6, 6.3, 1.5, shade(shoe, -0.35), false);
  }
  if (s.skirt) {
    ctx.beginPath(); ctx.moveTo(cx - 11, hipY - 2); ctx.lineTo(cx + 11, hipY - 2); ctx.quadraticCurveTo(cx + 17, hipY + 12, cx + 17, hipY + 22); ctx.lineTo(cx - 17, hipY + 22); ctx.quadraticCurveTo(cx - 17, hipY + 12, cx - 11, hipY - 2); ctx.closePath();
    ctx.fillStyle = shaded(ctx, s.bottom, cx - 17, cx + 17); ctx.fill(); ctx.lineWidth = 1.1; ctx.strokeStyle = OUTLINE; ctx.stroke();
  }

  // ----- far arm (side view) -----
  const armCol = s.top;
  const handCol = skin;
  const armSwing = pose * 6;
  const sleeveEnd = (x1, y1, x2, y2) => { // upper part in the top colour, forearm bare for short sleeves
    const mx = x1 + (x2 - x1) * 0.45, my = y1 + (y2 - y1) * 0.45;
    if (longSleeve) { limb(ctx, x1, y1, x2, y2, 6, armCol); }
    else { limb(ctx, x1, y1, x2, y2, 4.8, handCol); limb(ctx, x1, y1, mx, my, 6.4, armCol); }
    solidEllipse(ctx, x2, y2 + 1.5, 2.6, 3.2, handCol, false);
  };
  if (side) sleeveEnd(cx + 1, shY + 3, cx + 1 + armSwing * 0.9, shY + 29);

  // ----- torso -----
  ctx.beginPath();
  if (side) {
    ctx.moveTo(cx - 8, shY + 4); ctx.quadraticCurveTo(cx - 8, shY - 1, cx - 3, shY - 1); ctx.lineTo(cx + 3, shY - 1); ctx.quadraticCurveTo(cx + 9, shY - 1, cx + 9, shY + 6);
    ctx.lineTo(cx + 8, hipY + 4); ctx.lineTo(cx - 8, hipY + 4); ctx.closePath();
  } else {
    ctx.moveTo(cx - wS, shY + 5); ctx.quadraticCurveTo(cx - wS, shY - 1, cx - wS + 5, shY - 1); ctx.lineTo(cx + wS - 5, shY - 1); ctx.quadraticCurveTo(cx + wS, shY - 1, cx + wS, shY + 5);
    ctx.quadraticCurveTo(cx + wW - 1.5, shY + 22, cx + wW, hipY + 4); ctx.lineTo(cx - wW, hipY + 4); ctx.quadraticCurveTo(cx - wW + 1.5, shY + 22, cx - wS, shY + 5); ctx.closePath();
  }
  ctx.fillStyle = shaded(ctx, s.top, cx - wS, cx + wS); ctx.fill(); ctx.lineWidth = 1.1; ctx.strokeStyle = OUTLINE; ctx.stroke();
  if (s.vest && dir !== "up") { ctx.fillStyle = s.vest; ctx.fillRect(cx - wS + 3, shY + 3, wS * 2 - 6, hipY - shY); ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.fillRect(cx - wS + 3, shY + 17, wS * 2 - 6, 3); }
  if (s.apron && dir === "down") { ctx.fillStyle = s.apron; rrPath(ctx, cx - 8, shY + 8, 16, hipY - shY - 3, 3); ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.stroke(); }
  if (dir === "down") {
    ctx.strokeStyle = shade(s.top, -0.28); ctx.lineWidth = 1.2;
    if (s.collar) { ctx.fillStyle = shade(s.top, 0.2); ctx.beginPath(); ctx.moveTo(cx - 6, shY - 1); ctx.lineTo(cx, shY + 7); ctx.lineTo(cx + 6, shY - 1); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, shY + 7); ctx.lineTo(cx, hipY); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(cx, shY - 1, 5, 0.15, Math.PI - 0.15); ctx.stroke(); }
    if (s.badge) { ctx.fillStyle = "#f2c14e"; ctx.beginPath(); ctx.arc(cx + 7, shY + 10, 2.4, 0, 7); ctx.fill(); }
    if (s.belt) { ctx.fillStyle = s.belt; ctx.fillRect(cx - wW, hipY - 1, wW * 2, 4); }
  }
  if (dir === "up") { ctx.strokeStyle = shade(s.top, -0.22); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx - 5, shY + 1); ctx.quadraticCurveTo(cx, shY + 4, cx + 5, shY + 1); ctx.stroke(); }

  // ----- near arm(s) -----
  if (side) sleeveEnd(cx - 1, shY + 3, cx - 1 - armSwing * 0.9, shY + 29);
  else {
    sleeveEnd(cx - wS + 1, shY + 5, cx - wS - 0.5 + armSwing * 0.7, shY + 31 - Math.abs(armSwing) * 0.2);
    sleeveEnd(cx + wS - 1, shY + 5, cx + wS + 0.5 - armSwing * 0.7, shY + 31 - Math.abs(armSwing) * 0.2);
  }

  // ----- neck and head -----
  ctx.fillStyle = shade(skin, -0.1); rrPath(ctx, cx - 3.6, hy + 8, 7.2, 12, 3); ctx.fill();
  const headRX = side ? 8.6 : 9.4;
  if (dir === "up") {
    ctx.beginPath(); ctx.ellipse(cx, hy, 10, 12, 0, 0, 7); ctx.fillStyle = s.hair; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = OUTLINE; ctx.stroke();
    if (hs === "long") { ctx.beginPath(); ctx.moveTo(cx - 10, hy); ctx.quadraticCurveTo(cx - 13, shY + 8, cx - 10, shY + 16); ctx.lineTo(cx + 10, shY + 16); ctx.quadraticCurveTo(cx + 13, shY + 8, cx + 10, hy); ctx.closePath(); ctx.fillStyle = s.hair; ctx.fill(); ctx.stroke(); }
    if (hs === "ponytail") { limb(ctx, cx, hy + 3, cx + pose * 2, hy + 26, 6.5, s.hair); solidEllipse(ctx, cx, hy + 3, 3.4, 2.4, "#d9584e", false); }
    if (hs === "bun") solidEllipse(ctx, cx, hy - 13, 6.5, 5.5, s.hair);
    ctx.fillStyle = "rgba(255,255,255,0.14)"; ctx.beginPath(); ctx.ellipse(cx - 3, hy - 6, 5, 3, -0.3, 0, 7); ctx.fill();
    paintHat(ctx, cx, hy, s, "up");
    return;
  }
  const hx = side ? cx + 1 : cx;
  ctx.beginPath(); ctx.ellipse(hx, hy, headRX, 11.4, 0, 0, 7);
  const sg = ctx.createLinearGradient(hx - headRX, hy, hx + headRX, hy); sg.addColorStop(0, shade(skin, 0.08)); sg.addColorStop(1, shade(skin, -0.12));
  ctx.fillStyle = sg; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = OUTLINE; ctx.stroke();
  if (!side) { solidEllipse(ctx, cx - 9.6, hy + 1.5, 1.8, 3, shade(skin, -0.06), false); solidEllipse(ctx, cx + 9.6, hy + 1.5, 1.8, 3, shade(skin, -0.06), false); }
  else solidEllipse(ctx, cx - 3, hy + 1.5, 2.2, 3.2, shade(skin, -0.1), false);

  // face: small features, no cartoon eyes
  const ey = hy + 1;
  const brow = (x, dx) => { ctx.strokeStyle = shade(s.hair, 0.05); ctx.globalAlpha = 0.85; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(x - 2.8, ey - 4.2 + dx); ctx.lineTo(x + 2.8, ey - 4.6 - dx); ctx.stroke(); ctx.globalAlpha = 1; };
  const eye = (x) => { ctx.fillStyle = "#fbfaf7"; ctx.beginPath(); ctx.ellipse(x, ey, 2.5, 1.7, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#2a2430"; ctx.beginPath(); ctx.arc(x + (side ? 0.8 : 0), ey + 0.1, 1.35, 0, 7); ctx.fill(); ctx.strokeStyle = "rgba(30,25,40,0.7)"; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(x, ey, 2.5, 1.7, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); };
  if (side) {
    eye(hx + 4.2); brow(hx + 4.2, 0);
    ctx.strokeStyle = shade(skin, -0.28); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(hx + 8.6, ey + 2.5); ctx.lineTo(hx + 9.4, ey + 4.8); ctx.lineTo(hx + 8, ey + 5.2); ctx.stroke();
    ctx.strokeStyle = female ? "#c4706c" : "#b06a60"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(hx + 5.4, ey + 8.4); ctx.lineTo(hx + 7.4, ey + 8.2); ctx.stroke();
  } else {
    eye(cx - 4); eye(cx + 4); brow(cx - 4, 0.3); brow(cx + 4, -0.3);
    ctx.strokeStyle = shade(skin, -0.25); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(cx, ey + 2); ctx.lineTo(cx - 1.2, ey + 5.4); ctx.lineTo(cx + 1.2, ey + 5.6); ctx.stroke();
    ctx.strokeStyle = female ? "#c4706c" : "#b06a60"; ctx.lineWidth = female ? 1.5 : 1.2; ctx.beginPath(); ctx.moveTo(cx - 2.6, ey + 8.4); ctx.quadraticCurveTo(cx, ey + 9.4, cx + 2.6, ey + 8.4); ctx.stroke();
  }
  if (s.glasses) {
    ctx.strokeStyle = "#35405e"; ctx.lineWidth = 1.2;
    if (side) { ctx.beginPath(); ctx.ellipse(hx + 4.2, ey, 3.8, 3.4, 0, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(hx + 0.4, ey); ctx.lineTo(hx - 6, ey); ctx.stroke(); }
    else { [-4, 4].forEach((x) => { ctx.beginPath(); ctx.ellipse(cx + x, ey, 3.8, 3.4, 0, 0, 7); ctx.stroke(); }); ctx.beginPath(); ctx.moveTo(cx - 0.4, ey); ctx.lineTo(cx + 0.4, ey); ctx.stroke(); }
  }
  // hair on top of the face
  if (hs !== "bald") {
    ctx.beginPath();
    if (side) {
      ctx.moveTo(hx - 9, hy + 2); ctx.quadraticCurveTo(hx - 10, hy - 13, hx + 1, hy - 12.5); ctx.quadraticCurveTo(hx + 9.5, hy - 12, hx + 9, hy - 3.5); ctx.quadraticCurveTo(hx + 4, hy - 8, hx - 1, hy - 5); ctx.lineTo(hx - 4, hy + 5); ctx.closePath();
    } else if (female || hs === "perm") {
      ctx.moveTo(cx - 10, hy + 6); ctx.quadraticCurveTo(cx - 12, hy - 12, cx, hy - 12.5); ctx.quadraticCurveTo(cx + 12, hy - 12, cx + 10, hy + 6);
      ctx.quadraticCurveTo(cx + 9, hy - 3, cx + 2, hy - 7); ctx.quadraticCurveTo(cx - 5, hy - 4, cx - 10, hy + 6); ctx.closePath();
    } else {
      ctx.moveTo(cx - 10, hy + 2); ctx.quadraticCurveTo(cx - 11, hy - 13, cx, hy - 13); ctx.quadraticCurveTo(cx + 11, hy - 13, cx + 10, hy + 2);
      ctx.quadraticCurveTo(cx + 9, hy - 5, cx + 3, hy - 7.5); ctx.quadraticCurveTo(cx - 3, hy - 6.5, cx - 6, hy - 8); ctx.quadraticCurveTo(cx - 9, hy - 4, cx - 10, hy + 2); ctx.closePath();
    }
    ctx.fillStyle = s.hair; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = OUTLINE; ctx.stroke();
    if (hs === "perm") { [-9, -4, 2, 8].forEach((dx, i) => solidEllipse(ctx, cx + dx, hy - 10 + (i % 2) * 2, 4.2, 3.6, s.hair, false)); }
    if (hs === "bun") solidEllipse(ctx, hx + (side ? -4 : 0), hy - 14, 6, 5, s.hair);
    if (hs === "ponytail" && dir === "down") solidEllipse(ctx, cx + 9.5, hy - 5, 2.4, 2, "#d9584e", false);
    ctx.fillStyle = "rgba(255,255,255,0.16)"; ctx.beginPath(); ctx.ellipse(hx - 3, hy - 9, 4.5, 2, -0.3, 0, 7); ctx.fill();
  }
  paintHat(ctx, cx, hy, s, dir);
}

function paintHat(ctx, cx, hy, s, dir) {
  if (!s.hat) return;
  const c = s.hatColor || "#2f3a58";
  if (s.hat === "cap") {
    ctx.beginPath(); ctx.ellipse(cx, hy - 4, 10.8, 9, 0, Math.PI, Math.PI * 2); ctx.closePath();
    ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = OUTLINE; ctx.stroke();
    if (dir === "down") solidRR(ctx, cx - 10, hy - 5, 20, 3.6, 1.8, shade(c, -0.18));
    if (dir === "side") solidRR(ctx, cx + 4, hy - 5, 13, 3.6, 1.8, shade(c, -0.18));
  } else if (s.hat === "chef") {
    solidRR(ctx, cx - 9, hy - 10, 18, 5, 2, c);
    solidEllipse(ctx, cx, hy - 14, 10, 6, c);
  } else if (s.hat === "straw") {
    solidEllipse(ctx, cx, hy - 7, 18, 4.6, c);
    solidEllipse(ctx, cx, hy - 11, 9.5, 6.5, shade(c, 0.06));
    ctx.fillStyle = "#d9584e"; ctx.fillRect(cx - 9.5, hy - 9.5, 19, 2.4);
  }
}

// ---- who looks like what ----
const CHARACTER_LOOKS = {
  teacher: { female: true, hair: "#3b2f2f", hairStyle: "bun", top: "#f4f1ea", bottom: "#4b5a78", skirt: true, glasses: true, collar: true, shoe: "#3a3f58" },
  officer: { hair: "#2a2430", hairStyle: "short", top: "#6f8fd0", bottom: "#2f3a58", sleeve: "long", collar: true, hat: "cap", hatColor: "#2f3a58", badge: true, belt: "#232a40", skin: SKIN_TONES.tan, shoe: "#222838" },
  cook: { hair: "#bfc3cc", hairStyle: "short", top: "#fbf7ee", bottom: "#6c7a96", sleeve: "long", hat: "chef", hatColor: "#ffffff", apron: "#e8e1d0", skin: SKIN_TONES.warm },
  vendor: { hair: "#2a2430", hairStyle: "short", top: "#e8a03b", bottom: "#59658a", hat: "straw", hatColor: "#e8c88e", skin: SKIN_TONES.deep },
  captain: { hair: "#2a2430", hairStyle: "short", top: "#4b78c8", bottom: "#2f3a58", sleeve: "long", collar: true, hat: "cap", hatColor: "#2f3a58", badge: true, skin: SKIN_TONES.warm, shoe: "#222838" },
  driver: { hair: "#4a3a33", hairStyle: "short", top: "#fbf3e2", bottom: "#2f3a58", collar: true, hat: "cap", hatColor: "#e0a23b", skin: SKIN_TONES.tan },
  uncle: { hair: "#c9cdd6", hairStyle: "short", top: "#9bbbe0", bottom: "#6c7a96", collar: true },
  auntie: { female: true, hair: "#5a4540", hairStyle: "perm", top: "#e0948f", bottom: "#515d7a", apron: "#fdf6ec", shoe: "#d8d2c4" },
  staff: { hair: "#2a2430", hairStyle: "short", top: "#fbf3e2", bottom: "#2f3a58", collar: true, vest: "#f1983a", hat: "cap", hatColor: "#2f3a58" },
};
Object.entries(CHARACTER_LOOKS).forEach(([key, spec]) => { ISLAND_ART[key] = [80, 120, (c, w, h) => paintCharacter(c, w, h, "down", 0, spec)]; });

// ---- the player's avatar: boy or girl, with an outfit colour ----
const AVATAR_OUTFITS = [
  { id: "sunny", name: "Mustard", top: "#d9a441", bottom: "#394a6e" },
  { id: "sky", name: "Denim blue", top: "#5f8fc4", bottom: "#33405e" },
  { id: "mint", name: "Sage", top: "#6aa898", bottom: "#3a4663" },
  { id: "rose", name: "Dusty rose", top: "#d4808e", bottom: "#403f5e" },
];
const AVATAR_BODIES = {
  boy: { label: "Male", female: false, hair: "#2b2522", hairStyle: "short", skin: SKIN_TONES.warm, sleeve: "long" },
  girl: { label: "Female", female: true, hair: "#33262a", hairStyle: "long", skin: SKIN_TONES.warm, sleeve: "short" },
};
function avatarSpec(look) {
  const body = AVATAR_BODIES[look.gender] || AVATAR_BODIES.boy;
  const outfit = AVATAR_OUTFITS.find((o) => o.id === look.outfit) || AVATAR_OUTFITS[0];
  return { ...body, top: outfit.top, bottom: outfit.bottom };
}
function avatarKey(look, dir, frame) { return `av_${look.gender}_${look.outfit}_${dir}_${frame}`; }
// Paints the 9 textures (3 directions x 3 poses) for one look, once.
function ensureAvatarTextures(scene, look) {
  const spec = avatarSpec(look);
  ["down", "up", "side"].forEach((dir) => [0, 1, 2].forEach((f) => {
    const key = avatarKey(look, dir, f);
    if (scene.textures.exists(key)) return;
    const { c, ctx } = artCanvas(80, 120);
    paintCharacter(ctx, 80, 120, dir, f, spec);
    scene.textures.addCanvas(key, c);
  }));
}
// A big front-facing preview for the picker (a data URL).
function avatarPreview(look) {
  const { c, ctx } = artCanvas(80, 120);
  paintCharacter(ctx, 80, 120, "down", 0, avatarSpec(look));
  return c.toDataURL();
}

// ================= the neighbourhood =================
function windowsRow(ctx, x, y, n, gap, ww, wh) {
  for (let i = 0; i < n; i++) { fillRR(ctx, x + i * gap, y, ww, wh, 3, PAL.win); fillRR(ctx, x + i * gap + 2, y + 2, ww - 4, wh - 4, 2, "#dbe7f5"); ctx.fillStyle = "#b9c6d8"; ctx.fillRect(x + i * gap + ww / 2 - 1, y + 2, 2, wh - 4); }
}

function paintSchool(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 10, w * 0.47, 13);
  fillRR(ctx, 20, 130, w - 40, h - 146, 6, "#f3e3b8"); fillRR(ctx, w - 70, 130, 50, h - 146, 6, "#dfcb9b");
  fillRR(ctx, 10, 116, w - 20, 22, 5, "#d9776c");                        // roof slab
  // clock tower
  fillRR(ctx, w / 2 - 44, 28, 88, 100, 6, "#ecd9a8"); fillRR(ctx, w / 2 - 52, 18, 104, 18, 5, "#d9776c");
  ctx.beginPath(); ctx.moveTo(w / 2 - 38, 20); ctx.lineTo(w / 2, -2); ctx.lineTo(w / 2 + 38, 20); ctx.closePath(); ctx.fillStyle = "#c9605a"; ctx.fill();
  fillEllipse(ctx, w / 2, 70, 24, 24, "#fffdf7"); ctx.strokeStyle = "#8a6a3a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(w / 2, 70, 24, 0, 7); ctx.stroke();
  ctx.strokeStyle = "#2a3550"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w / 2, 70); ctx.lineTo(w / 2, 54); ctx.moveTo(w / 2, 70); ctx.lineTo(w / 2 + 12, 76); ctx.stroke();
  // classrooms
  for (let r = 0; r < 2; r++) { windowsRow(ctx, 36, 154 + r * 66, 4, 56, 40, 40); windowsRow(ctx, w / 2 + 70, 154 + r * 66, 4, 56, 40, 40); }
  fillRR(ctx, 20, 148 + 52, w - 40, 5, 2, "rgba(255,255,255,0.5)");
  // entrance
  fillRR(ctx, w / 2 - 70, h - 118, 140, 106, 6, "#59658a"); fillRR(ctx, w / 2 - 58, h - 104, 116, 92, 4, "#2f3a58");
  fillRR(ctx, w / 2 - 60, h - 132, 120, 24, 6, "#fffdf7"); artText(ctx, "小学", w / 2, h - 120, 20, "#a8402f", 800);
  ctx.fillStyle = "#c9d3e6"; ctx.fillRect(w / 2 - 2, h - 104, 4, 92);
  fillRR(ctx, w / 2 - 82, h - 24, 164, 12, 3, "#d6d9e2");
  // flag pole and a banner
  fillRR(ctx, 40, 40, 5, 116, 2, "#8d96a8"); ctx.fillStyle = "#e0584f"; ctx.fillRect(45, 44, 36, 14); ctx.fillStyle = "#fff"; ctx.fillRect(45, 51, 36, 7);
  // books and bag
  fillRR(ctx, 28, h - 32, 26, 20, 4, "#6a9fe0"); fillRR(ctx, w - 56, h - 32, 26, 20, 4, "#e0948f");
}

function paintKindergarten(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, w * 0.46, 11);
  fillRR(ctx, 18, 80, w - 36, h - 92, 12, "#fff0b8"); fillRR(ctx, w - 62, 80, 44, h - 92, 12, "#f4dd96");
  ctx.beginPath(); ctx.moveTo(6, 90); ctx.quadraticCurveTo(w / 2, 14, w - 6, 90); ctx.closePath(); ctx.fillStyle = "#72c4b8"; ctx.fill();
  ctx.fillStyle = "#3f9d90"; ctx.beginPath(); ctx.moveTo(w - 70, 52); ctx.quadraticCurveTo(w - 40, 62, w - 6, 90); ctx.lineTo(w - 70, 90); ctx.fill();
  const blocks = [["A", "#e0584f"], ["B", "#f2a93b"], ["C", "#5b7fd0"]];
  blocks.forEach(([t, c], i) => { fillRR(ctx, w / 2 - 66 + i * 46, 62, 40, 40, 6, c); artText(ctx, t, w / 2 - 46 + i * 46, 83, 24, "#fff", 800); });
  fillRR(ctx, 40, 118, 56, 60, 6, "#fffdf6"); fillRR(ctx, 46, 124, 44, 48, 4, "#9fc2e4");
  fillRR(ctx, w - 96, 118, 56, 60, 6, "#fffdf6"); fillRR(ctx, w - 90, 124, 44, 48, 4, "#9fc2e4");
  fillRR(ctx, w / 2 - 24, h - 88, 48, 78, 8, "#e0848b"); fillRR(ctx, w / 2 - 18, h - 82, 36, 72, 6, "#fbe9ea");
  fillEllipse(ctx, 34, h - 22, 12, 12, "#f2a93b"); fillEllipse(ctx, w - 34, h - 22, 12, 12, "#6a9fe0");
}

function paintCommunityClub(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 10, w * 0.47, 12);
  fillRR(ctx, 22, 100, w - 44, h - 114, 6, "#eadfc8"); fillRR(ctx, w - 68, 100, 46, h - 114, 6, "#d6c8a8");
  // tiled roof
  ctx.beginPath(); ctx.moveTo(4, 112); ctx.lineTo(60, 40); ctx.lineTo(w - 60, 40); ctx.lineTo(w - 4, 112); ctx.closePath(); ctx.fillStyle = "#5fa59c"; ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.14)"; for (let i = 0; i < 6; i++) ctx.fillRect(40 + i * 56, 46, 3, 62);
  ctx.fillStyle = "#3f7f77"; ctx.fillRect(4, 108, w - 8, 10);
  fillRR(ctx, w / 2 - 82, 56, 164, 36, 8, "#fffdf7"); artText(ctx, "民众俱乐部", w / 2, 74, 24, "#2f7a6c", 800);
  windowsRow(ctx, 40, 134, 3, 60, 40, 48); windowsRow(ctx, w - 214, 134, 3, 60, 40, 48);
  fillRR(ctx, w / 2 - 54, h - 108, 108, 96, 6, "#59658a"); fillRR(ctx, w / 2 - 44, h - 98, 88, 86, 4, "#2f3a58");
  ctx.fillStyle = "#c9d3e6"; ctx.fillRect(w / 2 - 2, h - 98, 4, 86);
  [["#e0584f", 52], ["#f2a93b", 90], ["#5b7fd0", w - 90], ["#7dba8a", w - 52]].forEach(([c, x]) => { fillEllipse(ctx, x, h - 40, 10, 10, c); });
  // a banner
  ctx.fillStyle = "#e0584f"; ctx.fillRect(34, 104, 70, 16); ctx.fillStyle = "#fff"; ctx.fillRect(40, 110, 58, 3);
}

function paintPolicePost(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, w * 0.46, 10);
  fillRR(ctx, 18, 70, w - 36, h - 82, 8, "#f2f5fa"); fillRR(ctx, w - 58, 70, 40, h - 82, 8, "#d9e0ec");
  fillRR(ctx, 8, 52, w - 16, 28, 8, "#3b6fd0"); fillRR(ctx, 8, 52, w - 16, 8, 4, "#5b8be0");
  fillRR(ctx, w / 2 - 22, 22, 44, 36, 8, "#e0584f"); fillEllipse(ctx, w / 2, 40, 12, 12, "#ffd9d6");   // beacon
  fillRR(ctx, w / 2 - 70, 90, 140, 28, 6, "#fffdf7"); artText(ctx, "警察岗亭", w / 2, 104, 20, "#2b4fa8", 800);
  fillRR(ctx, 36, 130, 70, 56, 6, "#9fc2e4"); fillRR(ctx, w - 106, 130, 70, 56, 6, "#9fc2e4");
  ctx.fillStyle = "#fff"; ctx.fillRect(70, 130, 2, 56); ctx.fillRect(w - 72, 130, 2, 56);
  fillRR(ctx, w / 2 - 20, h - 76, 40, 66, 5, "#2f3a58");
  ctx.fillStyle = "#3b6fd0"; ctx.fillRect(18, h - 30, w - 36, 6);
}

function paintClinic(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, w * 0.46, 10);
  fillRR(ctx, 18, 56, w - 36, h - 68, 8, "#fbfcfe"); fillRR(ctx, w - 58, 56, 40, h - 68, 8, "#e1e8f0");
  fillRR(ctx, 8, 40, w - 16, 22, 6, "#72c4b8");
  fillRR(ctx, w / 2 - 70, 70, 140, 34, 8, "#ffffff"); artText(ctx, "诊所", w / 2 + 14, 87, 24, "#2f7a6c", 800);
  fillRR(ctx, w / 2 - 64, 76, 22, 22, 4, "#4caf7d"); ctx.fillStyle = "#fff"; ctx.fillRect(w / 2 - 56, 79, 6, 16); ctx.fillRect(w / 2 - 61, 84, 16, 6);
  windowsRow(ctx, 34, 120, 2, 60, 44, 40); windowsRow(ctx, w - 138, 120, 2, 60, 44, 40);
  fillRR(ctx, w / 2 - 28, h - 80, 56, 70, 6, "#9fc2e4"); ctx.fillStyle = "#fff"; ctx.fillRect(w / 2 - 1, h - 80, 2, 70);
  fillRR(ctx, 22, h - 36, 46, 22, 6, "#7dba8a"); fillEllipse(ctx, 45, h - 40, 20, 12, PAL.leaf);
}

function paintSwings(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, w * 0.42, 9);
  ctx.strokeStyle = "#e0584f"; ctx.lineWidth = 9; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(30, h - 14); ctx.lineTo(70, 24); ctx.lineTo(110, h - 14); ctx.moveTo(110, h - 14); ctx.lineTo(150, 24); ctx.lineTo(190, h - 14); ctx.stroke();
  ctx.strokeStyle = "#8a97ad"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(70, 24); ctx.lineTo(150, 24); ctx.stroke();
  ctx.strokeStyle = "#6b7488"; ctx.lineWidth = 2.5;
  [[92, "#f2a93b"], [128, "#5b7fd0"]].forEach(([x, c]) => { ctx.beginPath(); ctx.moveTo(x, 24); ctx.lineTo(x, h - 58); ctx.stroke(); fillRR(ctx, x - 14, h - 60, 28, 8, 4, c); });
  fillRR(ctx, 150, h - 38, 60, 8, 3, "#33a38f"); fillEllipse(ctx, 180, h - 24, 7, 7, "#8a97ad");   // seesaw
}

function paintPavilion(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, w * 0.44, 10);
  [[34, 0], [w - 46, 0]].forEach(([x]) => fillRR(ctx, x, 62, 12, h - 72, 3, "#bd7a55"));
  fillRR(ctx, 28, h - 44, w - 56, 8, 3, "#b88a64"); fillRR(ctx, 40, h - 36, 8, 28, 2, "#8d6444"); fillRR(ctx, w - 48, h - 36, 8, 28, 2, "#8d6444");
  ctx.beginPath(); ctx.moveTo(6, 74); ctx.lineTo(w / 2, 10); ctx.lineTo(w - 6, 74); ctx.quadraticCurveTo(w / 2, 62, 6, 74); ctx.closePath(); ctx.fillStyle = "#d9776c"; ctx.fill();
  ctx.fillStyle = "#b85a52"; ctx.beginPath(); ctx.moveTo(w / 2, 10); ctx.lineTo(w - 6, 74); ctx.lineTo(w / 2 + 20, 70); ctx.closePath(); ctx.fill();
  fillEllipse(ctx, w / 2, h - 18, 22, 6, "rgba(40,50,80,0.14)");
}

function paintFitness(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, w * 0.44, 9);
  fillRR(ctx, 6, h - 22, w - 12, 12, 4, "#c9d3e6");
  ctx.strokeStyle = "#3b6fd0"; ctx.lineWidth = 7; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(30, h - 20); ctx.lineTo(30, 40); ctx.lineTo(80, 40); ctx.lineTo(80, h - 20); ctx.stroke();           // pull-up bar
  ctx.strokeStyle = "#e0848b"; ctx.beginPath(); ctx.moveTo(110, h - 20); ctx.lineTo(110, 60); ctx.moveTo(150, h - 20); ctx.lineTo(150, 60); ctx.moveTo(110, 80); ctx.lineTo(150, 80); ctx.stroke();
  fillEllipse(ctx, 190, 60, 22, 22, "#f2a93b"); fillEllipse(ctx, 190, 60, 8, 8, "#fff3d0"); fillRR(ctx, 186, 80, 8, h - 100, 3, "#8a97ad");  // cycle wheel
}

function paintFruitStall(ctx, w, h) {
  paintStall(ctx, w, h, "#7dba8a", "#5a9c6c", "水果");
  [["#e0584f", 40], ["#f2a93b", 72], ["#f6d54a", 104], ["#8bc34a", 136], ["#e0584f", 168]].forEach(([c, x]) => fillEllipse(ctx, x, h - 44, 12, 11, c));
}

function paintTicketBooth(ctx, w, h) {
  groundShadow(ctx, w / 2, h - 8, w * 0.44, 10);
  fillRR(ctx, 24, 70, w - 48, h - 82, 8, "#f6f8fc"); fillRR(ctx, w - 62, 70, 38, h - 82, 8, "#dde4f0");
  ctx.beginPath(); ctx.moveTo(8, 78); ctx.lineTo(24, 40); ctx.lineTo(w - 24, 40); ctx.lineTo(w - 8, 78); ctx.closePath(); ctx.fillStyle = "#e0842a"; ctx.fill();
  fillRR(ctx, w / 2 - 56, 86, 112, 26, 6, "#fffdf7"); artText(ctx, "售票处", w / 2, 99, 20, "#b65a14", 800);
  fillRR(ctx, 44, 124, w - 88, 48, 6, "#9fc2e4"); fillRR(ctx, 44, 160, w - 88, 8, 3, "#b88a64");
  fillRR(ctx, 50, h - 36, 40, 24, 4, "#59658a"); fillRR(ctx, w - 90, h - 36, 40, 24, 4, "#59658a");
}

// ---- flat ground pieces (can be walked on) ----
function paintBasketball(ctx, w, h) {
  fillRR(ctx, 4, 8, w - 8, h - 16, 18, "#c9d3e6");
  fillRR(ctx, 14, 18, w - 28, h - 36, 12, "#6f9fd0");
  ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 3;
  ctx.strokeRect(24, 28, w - 48, h - 56); ctx.beginPath(); ctx.moveTo(w / 2, 28); ctx.lineTo(w / 2, h - 28); ctx.stroke();
  ctx.beginPath(); ctx.arc(w / 2, h / 2, 26, 0, 7); ctx.stroke(); ctx.strokeRect(24, h / 2 - 36, 56, 72); ctx.strokeRect(w - 80, h / 2 - 36, 56, 72);
  [[30], [w - 30]].forEach(([x]) => { fillRR(ctx, x - 3, h / 2 - 22, 6, 44, 2, "#8a97ad"); ctx.strokeStyle = "#e0584f"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x + (x < w / 2 ? 12 : -12), h / 2, 9, 0, 7); ctx.stroke(); });
}
function paintCarpark(ctx, w, h) {
  fillRR(ctx, 0, 0, w, h, 16, "#aab2c0");
  ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 3;
  for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(30 + i * 52, 14); ctx.lineTo(30 + i * 52, 84); ctx.moveTo(30 + i * 52, h - 84); ctx.lineTo(30 + i * 52, h - 14); ctx.stroke(); }
  [[3, 24, "#e0584f"], [5, h - 80, "#5b7fd0"], [1, h - 80, "#f2a93b"]].forEach(([i, y, c]) => { fillRR(ctx, 36 + i * 52, y + 10, 40, 56, 10, c); fillRR(ctx, 42 + i * 52, y + 20, 28, 18, 5, "#cfe3f5"); });
}
function paintLawn(ctx, w, h) {
  fillEllipse(ctx, w / 2, h / 2, w * 0.48, h * 0.46, "#bddbb0");
  fillEllipse(ctx, w / 2 - 10, h / 2 - 6, w * 0.4, h * 0.36, "#cbe5bd");
  const r = islandRandom(31);
  for (let i = 0; i < 22; i++) { const x = 40 + r() * (w - 80), y = 30 + r() * (h - 60); fillEllipse(ctx, x, y, 4, 3.4, ["#fff", "#f6c9d0", "#f6dc7a"][i % 3]); }
}

// ================= register =================
Object.assign(ISLAND_ART, {
  school: [560, 400, paintSchool],
  kindergarten: [300, 250, paintKindergarten],
  communityClub: [420, 330, paintCommunityClub],
  policePost: [290, 250, paintPolicePost],
  clinic: [320, 250, paintClinic],
  hdbMint: [380, 520, (c, w, h) => paintHdb(c, w, h, "#b5dccb", "#93c4ae")],
  hdbPeach: [380, 520, (c, w, h) => paintHdb(c, w, h, "#f1cfae", "#e2b58c")],
  swings: [220, 170, paintSwings],
  pavilion: [240, 190, paintPavilion],
  fitnessCorner: [240, 170, paintFitness],
  fruitStall: [210, 200, paintFruitStall],
  ticketBooth: [200, 200, paintTicketBooth],
  basketballCourt: [420, 240, paintBasketball],
  carpark: [380, 200, paintCarpark],
  lawn: [440, 260, paintLawn],
});

function currentAvatarLook() {
  return (typeof IslandState !== "undefined" && IslandState.avatar) || { gender: "boy", outfit: "sunny" };
}