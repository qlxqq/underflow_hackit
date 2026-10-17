// The ground (sea, beach, grass, paved zones, paths and the jetty) is painted
// in square tiles the first time they come into view, then shown as plain
// images. That keeps it sharp and light on phones: nothing is redrawn per
// frame. Tiles far from the player are thrown away again.

const GROUND_TILE = 1024;
const SEA_COLOUR = "#c3dcea";
const MAX_TILES = 14;

function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// Extra decoration that must look the same in every tile: grass patches and
// little waves. Built once from a fixed seed.
function buildGroundDecor(cfg) {
  const rnd = islandRandom(5);
  const tufts = [];
  cfg.zones.forEach((z) => {
    const count = z.pave ? Math.round(cfg.tufts * 0.3) : cfg.tufts;
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * z.radius;
      tufts.push({ x: z.cx + Math.cos(a) * d, y: z.cy + Math.sin(a) * d, rx: 40 + rnd() * 50, ry: 16 + rnd() * 20, c: z.pave ? "#cfe0c3" : z.ground2 });
    }
  });
  const waves = [];
  const wr = islandRandom(77);
  for (let i = 0; i < 14000 && waves.length < cfg.waves; i++) {
    const x = wr() * (cfg.width + 800) - 400;
    const y = wr() * (cfg.height + 800) - 400;
    if ([[0, 0], [200, 0], [-200, 0], [0, 150], [0, -150]].some(([dx, dy]) => cfg.world.isLand(x + dx, y + dy))) continue;
    waves.push({ x, y });
  }
  return { tufts, waves };
}

// Which tiles exist at all: only those near the island (the rest is plain sea).
function groundTileUseful(tx, ty, cfg) {
  const x0 = tx * GROUND_TILE, y0 = ty * GROUND_TILE;
  const m = 480;
  const b = (cfg.bounds = cfg.bounds || cfg.coast.reduce((o, [x, y]) => ({ x1: Math.min(o.x1, x), x2: Math.max(o.x2, x), y1: Math.min(o.y1, y), y2: Math.max(o.y2, y) }), { x1: 1e9, x2: -1e9, y1: 1e9, y2: -1e9 }));
  return x0 + GROUND_TILE > b.x1 - m && x0 < b.x2 + m && y0 + GROUND_TILE > b.y1 - m && y0 < b.y2 + m;
}

function paintGroundTile(tx, ty, decor, cfg) {
  const c = document.createElement("canvas");
  c.width = GROUND_TILE;
  c.height = GROUND_TILE;
  const ctx = c.getContext("2d");
  const ox = tx * GROUND_TILE;
  const oy = ty * GROUND_TILE;
  ctx.translate(-ox, -oy);
  ctx.fillStyle = SEA_COLOUR;
  ctx.fillRect(ox, oy, GROUND_TILE, GROUND_TILE);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const coast = cfg.coast;
  const trace = () => {
    ctx.beginPath();
    coast.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  const inTile = (x, y, pad) => x > ox - pad && x < ox + GROUND_TILE + pad && y > oy - pad && y < oy + GROUND_TILE + pad;

  // shallow water around the island
  [[420, "rgba(208, 230, 241, 0.5)"], [300, "rgba(217, 236, 245, 0.6)"], [180, "rgba(227, 242, 248, 0.7)"]].forEach(([w, col]) => {
    trace(); ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke();
  });
  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)"; ctx.lineWidth = 5;
  decor.waves.forEach((w) => {
    if (!inTile(w.x, w.y, 80)) return;
    ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.lineTo(w.x + 34, w.y - 6); ctx.lineTo(w.x + 70, w.y); ctx.stroke();
  });

  // land and the soft colour of each zone
  trace(); ctx.fillStyle = "#d7e8cf"; ctx.fill();
  ctx.save();
  trace(); ctx.clip();
  cfg.zones.forEach((z) => {
    const r = z.radius * 1.2;
    if (!inTile(z.cx, z.cy, r)) return;
    const region = () => {
      ctx.beginPath();
      if (z.region) z.region.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      else ctx.arc(z.cx, z.cy, r, 0, Math.PI * 2);
      ctx.closePath();
    };
    if (z.region) { region(); ctx.fillStyle = hexA(z.ground, 1); ctx.fill(); }
    else {
      const g = ctx.createRadialGradient(z.cx, z.cy, 0, z.cx, z.cy, r);
      g.addColorStop(0, hexA(z.ground, 1)); g.addColorStop(0.62, hexA(z.ground, 1)); g.addColorStop(1, hexA(z.ground, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(z.cx, z.cy, r, 0, Math.PI * 2); ctx.fill();
    }
    if (z.pave) {
      ctx.save();
      region(); ctx.clip();
      ctx.strokeStyle = hexA(z.ground2, 0.9); ctx.lineWidth = 3;
      for (let x = Math.ceil((ox - 90) / 90) * 90; x < ox + GROUND_TILE + 90; x += 90) { ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x, oy + GROUND_TILE); ctx.stroke(); }
      for (let y = Math.ceil((oy - 90) / 90) * 90; y < oy + GROUND_TILE + 90; y += 90) { ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox + GROUND_TILE, y); ctx.stroke(); }
      ctx.restore();
    }
  });
  decor.tufts.forEach((t) => {
    if (!inTile(t.x, t.y, 120)) return;
    ctx.globalAlpha = 0.45; ctx.fillStyle = t.c; ctx.beginPath(); ctx.ellipse(t.x, t.y, t.rx, t.ry, 0, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.restore();

  // beach
  trace(); ctx.lineWidth = 86; ctx.strokeStyle = "#efe3c4"; ctx.stroke();
  trace(); ctx.lineWidth = 14; ctx.strokeStyle = "rgba(255, 255, 255, 0.55)"; ctx.stroke();

  // paths: white edge, then the paving
  [[132, "rgba(255, 255, 255, 0.9)"], [104, "#f3dfc4"]].forEach(([w, col]) => {
    ctx.lineWidth = w; ctx.strokeStyle = col;
    cfg.paths.forEach((line) => {
      ctx.beginPath(); line.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    });
  });

  // jetty
  const j = cfg.jetty;
  ctx.fillStyle = "#b88a64"; ctx.fillRect(j.x - j.w / 2, j.y, j.w, j.h);
  ctx.fillStyle = "#c9996f";
  for (let y = j.y + 8; y < j.y + j.h; y += 24) ctx.fillRect(j.x - j.w / 2 + 4, y, j.w - 8, 18);
  ctx.fillStyle = "#6b5a47";
  for (let y = j.y + 14; y < j.y + j.h; y += 62) { ctx.fillRect(j.x - j.w / 2 - 6, y, 12, 12); ctx.fillRect(j.x + j.w / 2 - 6, y, 12, 12); }
  return c;
}

// The mystery island's ground settings (the home island makes its own).
function islandGroundConfig() {
  return { id: "isl", coast: IslandWorld.coast, paths: IslandWorld.paths, zones: ISLAND_ZONES, jetty: ISLAND_DOCK.jetty, width: ISLAND_W, height: ISLAND_H, world: IslandWorld, tufts: 380, waves: 420 };
}

class IslandGround {
  constructor(scene, cfg) {
    this.scene = scene;
    this.cfg = cfg || islandGroundConfig();
    this.decor = buildGroundDecor(this.cfg);
    this.tiles = new Map(); // key -> { image, used }
    this.frame = 0;
  }

  // Makes sure every tile near the camera exists; drops old ones.
  update() {
    const cam = this.scene.cameras.main;
    const v = cam.worldView;
    const pad = 200;
    const x0 = Math.floor((v.x - pad) / GROUND_TILE);
    const x1 = Math.floor((v.right + pad) / GROUND_TILE);
    const y0 = Math.floor((v.y - pad) / GROUND_TILE);
    const y1 = Math.floor((v.bottom + pad) / GROUND_TILE);
    this.frame++;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!groundTileUseful(tx, ty, this.cfg)) continue;
        const key = `ground_${this.cfg.id}_${tx}_${ty}`;
        let tile = this.tiles.get(key);
        if (!tile) {
          if (!this.scene.textures.exists(key)) this.scene.textures.addCanvas(key, paintGroundTile(tx, ty, this.decor, this.cfg));
          const image = this.scene.add.image(tx * GROUND_TILE, ty * GROUND_TILE, key).setOrigin(0, 0).setDepth(-1000);
          tile = { image };
          this.tiles.set(key, tile);
        }
        tile.used = this.frame;
      }
    }
    if (this.tiles.size > MAX_TILES) {
      [...this.tiles.entries()].sort((a, b) => a[1].used - b[1].used).slice(0, this.tiles.size - MAX_TILES).forEach(([key, tile]) => {
        tile.image.destroy();
        this.scene.textures.remove(key);
        this.tiles.delete(key);
      });
    }
  }
}