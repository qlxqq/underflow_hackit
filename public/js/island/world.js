// The island's physical rules: where the land is, what blocks the player, and
// where the scenery goes. No drawing happens here, so it can be tested alone.

// Worlds already built this visit, and the grid of path pieces used by pathDistance.
const WORLD_BUILT = new WeakSet();
const PATH_INDEX = new WeakMap();

function buildPathIndex(paths) {
  const cell = 128;
  const segs = [];
  paths.forEach((line) => {
    for (let i = 0; i < line.length - 1; i++) segs.push([line[i][0], line[i][1], line[i + 1][0], line[i + 1][1]]);
  });
  const idx = { paths, count: paths.length, cell, empty: segs.length === 0, cells: [] };
  if (idx.empty) return idx;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  segs.forEach((s) => {
    minX = Math.min(minX, s[0], s[2]); maxX = Math.max(maxX, s[0], s[2]);
    minY = Math.min(minY, s[1], s[3]); maxY = Math.max(maxY, s[1], s[3]);
  });
  idx.ox = Math.floor(minX / cell);
  idx.oy = Math.floor(minY / cell);
  idx.cols = Math.floor(maxX / cell) - idx.ox + 1;
  idx.rows = Math.floor(maxY / cell) - idx.oy + 1;
  segs.forEach((s) => {
    const x0 = Math.floor(Math.min(s[0], s[2]) / cell) - idx.ox, x1 = Math.floor(Math.max(s[0], s[2]) / cell) - idx.ox;
    const y0 = Math.floor(Math.min(s[1], s[3]) / cell) - idx.oy, y1 = Math.floor(Math.max(s[1], s[3]) / cell) - idx.oy;
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) (idx.cells[j * idx.cols + i] = idx.cells[j * idx.cols + i] || []).push(s);
  });
  return idx;
}

const IslandWorld = {
  coast: [],
  paths: [],
  rects: [],
  props: [],
  gates: [],
  locked: new Set(),
  mask: null,
  maskW: 0,
  maskH: 0,
  MASK_SCALE: 8,

  build() {
    // The island never changes, so it is worked out once per visit to the page.
    // Sailing back and forth only resets which gates are locked.
    if (WORLD_BUILT.has(this)) { this.locked = new Set(); return this; }
    this.locked = new Set();
    this.coast = islandSmooth(ISLAND_COAST, true, 12);
    this.paths = ISLAND_PATHS.map((p) => islandSmooth(p, false, 12));
    // the short routes from the main path to each location's door
    this.buildMask();
    ISLAND_LEVELS.forEach((l) => {
      const route = l.route === "auto" ? this.autoRoute(l.front, l) : l.route;
      if (route) this.paths.push(islandSmooth(route, false, 6));
    });
    this.buildGates();
    this.buildGateRuns();
    this.buildProps();
    WORLD_BUILT.add(this);
    return this;
  },

  // A short route from a doorstep to the nearest main road that does not cut
  // through the building itself (it goes round the side if the road is behind it).
  autoRoute(front, level) {
    const r = { x1: level.x - level.foot.w / 2 - 100, x2: level.x + level.foot.w / 2 + 100, y1: level.y - level.foot.h - 100, y2: level.y + 100 };
    const crosses = (px, py, qx, qy) => {
      for (let t = 0; t <= 1; t += 0.04) { const x = px + (qx - px) * t, y = py + (qy - py) * t; if (x > r.x1 && x < r.x2 && y > r.y1 && y < r.y2) return true; }
      return false;
    };
    const roads = this.paths.slice(0, ISLAND_PATHS.length);
    const nearest = (sx, sy, test) => {
      let best = null, bestD = Infinity;
      roads.forEach((line) => {
        for (let i = 0; i < line.length - 1; i++) {
          const [ax, ay] = line[i], [bx, by] = line[i + 1];
          for (let t = 0; t <= 1; t += 0.1) {
            const x = ax + (bx - ax) * t, y = ay + (by - ay) * t, d = Math.hypot(sx - x, sy - y);
            if (d < bestD && !(x > r.x1 && x < r.x2 && y > r.y1 && y < r.y2) && test(x, y)) { bestD = d; best = [Math.round(x), Math.round(y)]; }
          }
        }
      });
      return { best, bestD };
    };
    const direct = nearest(front.x, front.y, (x, y) => !crosses(front.x, front.y, x, y));
    if (direct.bestD < 40) return null;
    if (direct.best) return [direct.best, [front.x, front.y]];
    // go round whichever side is closer to a road
    const sideX = level.x + (front.x >= level.x ? 1 : -1) * (level.foot.w / 2 + 110);
    const via = [sideX, front.y];
    const out = nearest(via[0], via[1], (x, y) => !crosses(via[0], via[1], x, y));
    return out.best ? [out.best, via, [front.x, front.y]] : [[front.x, front.y]];
  },

  // Land mask at 1/8 size: the island, a strip of beach, and the dock jetty.
  buildMask() {
    const s = this.MASK_SCALE;
    this.maskW = Math.ceil(ISLAND_W / s);
    this.maskH = Math.ceil(ISLAND_H / s);
    let ctx;
    if (typeof document !== "undefined") {
      const c = document.createElement("canvas");
      c.width = this.maskW;
      c.height = this.maskH;
      ctx = c.getContext("2d", { willReadFrequently: true });
    }
    ctx.fillStyle = "#000";
    ctx.beginPath();
    this.coast.forEach(([x, y], i) => (i ? ctx.lineTo(x / s, y / s) : ctx.moveTo(x / s, y / s)));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 56 / s; // walkable beach just outside the grass
    ctx.stroke();
    const j = ISLAND_DOCK.jetty;
    ctx.fillRect((j.x - j.w / 2) / s, j.y / s, j.w / s, j.h / s);
    const data = ctx.getImageData(0, 0, this.maskW, this.maskH).data;
    this.mask = new Uint8Array(this.maskW * this.maskH);
    for (let i = 0; i < this.mask.length; i++) this.mask[i] = data[i * 4 + 3] > 110 ? 1 : 0;
  },

  // A gate is a line across the island halfway between two zones.
  // `side(g, x, y)` is how far a point is past the line (positive = next zone).
  buildGates() {
    this.gates = ISLAND_GATES.map((def, index) => {
      const mid = { ...def.at };
      const len = Math.hypot(def.n.x, def.n.y);
      const n = { x: def.n.x / len, y: def.n.y / len };
      const g = { ...def, index, mid, n, dir: { x: -n.y, y: n.x }, door: { ...mid }, runs: [] };
      // where the main path crosses the line: that is the gate itself
      const line = this.paths[def.path];
      for (let i = 0; i < line.length - 1; i++) {
        const s0 = this.side(g, line[i][0], line[i][1]);
        const s1 = this.side(g, line[i + 1][0], line[i + 1][1]);
        if (s0 <= 0 && s1 > 0) {
          const t = s0 / (s0 - s1);
          g.door = { x: line[i][0] + (line[i + 1][0] - line[i][0]) * t, y: line[i][1] + (line[i + 1][1] - line[i][1]) * t };
          break;
        }
      }
      return g;
    });
    // each zone as a big polygon bounded by the gate lines (for painting)
    const far = (g, t) => [g.mid.x + g.dir.x * t, g.mid.y + g.dir.y * t];
    const G = this.gates;
    ISLAND_ZONES.forEach((z, i) => {
      const left = i > 0 ? G[i - 1] : null;
      const right = i < G.length ? G[i] : null;
      const pts = [];
      if (right) { pts.push(far(right, -6000), far(right, 6000)); } else { pts.push([14000, -6000], [14000, 11000]); }
      if (left) { pts.push(far(left, 6000), far(left, -6000)); } else { pts.push([-6000, 11000], [-6000, -6000]); }
      z.region = pts;
    });
    // land stretches along each line (needs the mask, so done after it)
    this.gatesNeedRuns = true;
  },

  side(g, x, y) { return (x - g.mid.x) * g.n.x + (y - g.mid.y) * g.n.y; },

  // Points along each gate line that are on land, as [{x, y, t}] (for fences and the map).
  buildGateRuns() {
    this.gates.forEach((g) => {
      g.points = [];
      let first = null;
      let last = null;
      for (let t = -4200; t <= 4200; t += 30) {
        const x = g.mid.x + g.dir.x * t;
        const y = g.mid.y + g.dir.y * t;
        if (this.isLand(x, y)) { if (!first) first = { x, y, t }; last = { x, y, t }; }
      }
      g.ends = first ? [first, last] : [];
      if (first) for (let t = first.t; t <= last.t; t += 64) g.points.push({ x: g.mid.x + g.dir.x * t, y: g.mid.y + g.dir.y * t, t });
    });
  },

  gateDistance(x, y) {
    let best = Infinity;
    this.gates.forEach((g) => { best = Math.min(best, Math.abs(this.side(g, x, y))); });
    return best;
  },

  isLand(x, y) {
    const s = this.MASK_SCALE;
    const mx = Math.floor(x / s);
    const my = Math.floor(y / s);
    if (mx < 0 || my < 0 || mx >= this.maskW || my >= this.maskH) return false;
    return this.mask[my * this.maskW + mx] === 1;
  },

  // Distance from a point to the nearest path. The path pieces are sorted into
  // a grid, so only the pieces near the point are measured (the answer is the
  // same as measuring every piece; it is just much quicker, and scenery
  // placement asks this thousands of times).
  pathDistance(x, y) {
    let idx = PATH_INDEX.get(this);
    if (!idx || idx.paths !== this.paths || idx.count !== this.paths.length) {
      idx = buildPathIndex(this.paths);
      PATH_INDEX.set(this, idx);
    }
    if (idx.empty) return Infinity;
    const { cell, cols, rows, cells } = idx;
    const qx = Math.floor(x / cell) - idx.ox;
    const qy = Math.floor(y / cell) - idx.oy;
    const maxK = Math.max(Math.abs(qx), Math.abs(qx - cols), Math.abs(qy), Math.abs(qy - rows)) + 1;
    let best = Infinity;
    const scan = (i, j) => {
      if (i < 0 || j < 0 || i >= cols || j >= rows) return;
      const list = cells[j * cols + i];
      if (!list) return;
      for (let n = 0; n < list.length; n++) {
        const s = list[n];
        const dx = s[2] - s[0];
        const dy = s[3] - s[1];
        const len2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((x - s[0]) * dx + (y - s[1]) * dy) / len2));
        const d = Math.hypot(x - (s[0] + t * dx), y - (s[1] + t * dy));
        if (d < best) best = d;
      }
    };
    for (let k = 0; k <= maxK; k++) {
      if (k === 0) scan(qx, qy);
      else {
        for (let i = qx - k; i <= qx + k; i++) { scan(i, qy - k); scan(i, qy + k); }
        for (let j = qy - k + 1; j <= qy + k - 1; j++) { scan(qx - k, j); scan(qx + k, j); }
      }
      // anything not looked at yet is at least k cells away
      if (best <= k * cell) break;
    }
    return best;
  },

  nearRect(x, y, pad) {
    return this.rects.some((r) => x > r.x1 - pad && x < r.x2 + pad && y > r.y1 - pad && y < r.y2 + pad);
  },

  // Can a player (a circle of radius r with its feet at x, y) stand here?
  canStand(x, y, r = 22) {
    const dirs = [[0, 0], [r, 0], [-r, 0], [0, r * 0.6], [0, -r * 0.6]];
    for (const [dx, dy] of dirs) if (!this.isLand(x + dx, y + dy)) return false;
    if (this.blockedByGate(x, y) >= 0) return false;
    const rad = r * 0.8;
    for (const b of this.rects) {
      const cx = Math.max(b.x1, Math.min(x, b.x2));
      const cy = Math.max(b.y1, Math.min(y, b.y2));
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < rad * rad) return false;
    }
    return true;
  },

  // Index of a closed gate the point is past, or -1.
  blockedByGate(x, y) {
    for (const g of this.gates) if (this.locked.has(g.index) && this.side(g, x, y) > -14) return g.index;
    return -1;
  },

  // Which zone a point is in: one more for every gate line it is past.
  zoneAt(x, y) {
    let i = 0;
    this.gates.forEach((g) => { if (this.side(g, x, y) > 0) i++; });
    return ISLAND_ZONES[i];
  },
  zoneOf(x, y) {
    const zone = this.zoneAt(x, y);
    return { zone, dist: Math.hypot(x - zone.cx, y - zone.cy) };
  },

  addRect(x, y, foot) {
    this.rects.push({ x1: x - foot.w / 2, x2: x + foot.w / 2, y1: y - foot.h, y2: y });
  },

  buildProps() {
    this.rects = [];
    this.props = [];
    const rnd = islandRandom(20241013);
    const add = (p) => {
      p.zone = p.zone || this.zoneAt(p.x, p.y).id;
      this.props.push(p);
      if (p.foot) this.addRect(p.x, p.y, p.foot);
    };

    // Rectangles that must stay clear so nothing hides or blocks something the
    // player uses: each doorstep ring, each NPC (with label), the spawn and dock.
    const j = ISLAND_DOCK.jetty;
    const protect = [
      ...ISLAND_LEVELS.map((l) => ({ x1: l.front.x - 130, x2: l.front.x + 130, y1: l.front.y - 80, y2: l.front.y + 60 })),
      ...ISLAND_NPCS.map((n) => ({ x1: n.x - 100, x2: n.x + 100, y1: n.y - 20, y2: n.y + 80 })),
      { x1: ISLAND_SPAWN.x - 200, x2: ISLAND_SPAWN.x + 200, y1: ISLAND_SPAWN.y - 220, y2: ISLAND_SPAWN.y + 120 },
      { x1: j.x - 200, x2: j.x + 330, y1: j.y - 100, y2: j.y + j.h + 80 },
    ];
    this.protect = protect;
    const artSize = (key) => { const a = ISLAND_ART[key]; return a ? { w: a[0], h: a[1] } : { w: 40, h: 40 }; };
    const hitsProtect = (p) => {
      const a = artSize(p.key);
      const r = { x1: p.x - a.w / 2, x2: p.x + a.w / 2, y1: p.y - a.h, y2: p.y };
      return protect.some((q) => r.x1 < q.x2 && r.x2 > q.x1 && r.y1 < q.y2 && r.y2 > q.y1);
    };
    // Is any part of the piece's footprint on a road or path?
    const onRoad = (p) => {
      const a = artSize(p.key);
      const f = p.flat ? { w: a.w * 0.9, h: a.h * 0.8 } : p.foot || { w: 20, h: 10 };
      for (let sx = p.x - f.w / 2; sx <= p.x + f.w / 2 + 1; sx += Math.max(20, f.w / 6)) {
        for (let sy = p.y - f.h; sy <= p.y + 1; sy += Math.max(15, f.h / 3)) if (this.pathDistance(sx, sy) < 74) return true;
      }
      return false;
    };
    this.pieceOk = (p) => !hitsProtect(p) && !onRoad(p);
    const nearNpc = (p) => ISLAND_NPCS.some((n) => Math.hypot(p.x - n.x, p.y - n.y) < 240);
    // Hand-placed pieces: kept as authored next to an NPC (their workplace); every
    // other piece that would sit on a road or block something is nudged aside, or dropped.
    ISLAND_SET_PIECES.forEach((def) => {
      const p = { ...def };
      if (!nearNpc(p) && !this.pieceOk(p)) {
        let moved = false;
        for (let r = 50; r <= 420 && !moved; r += 50) {
          for (let k = 0; k < 16 && !moved; k++) {
            const q = { ...p, x: Math.round(p.x + Math.cos((k / 16) * Math.PI * 2) * r), y: Math.round(p.y + Math.sin((k / 16) * Math.PI * 2) * r) };
            if (this.isLand(q.x, q.y) && this.isLand(q.x - 60, q.y) && this.isLand(q.x + 60, q.y) && this.pieceOk(q) && !this.nearRect(q.x, q.y, 20)) { p.x = q.x; p.y = q.y; moved = true; }
          }
        }
        if (!moved) return;
      }
      add(p);
    });
    ISLAND_LEVELS.forEach((l) => add({ key: l.prop, x: l.x, y: l.y, foot: l.foot, zone: l.zone, level: l.level }));

    const keepClear = [
      [ISLAND_SPAWN.x, ISLAND_SPAWN.y, 220],
      ...ISLAND_LEVELS.map((l) => [l.front.x, l.front.y, 170]),
      ...ISLAND_NPCS.map((n) => [n.x, n.y, 110]),
    ];
    const free = (x, y, margin, pathMin) =>
      this.isLand(x, y) &&
      this.isLand(x + 70, y) && this.isLand(x - 70, y) && this.isLand(x, y + 70) && this.isLand(x, y - 70) &&
      !this.nearRect(x, y, margin) &&
      this.gateDistance(x, y) > 130 &&
      this.pathDistance(x, y) > pathMin &&
      !keepClear.some(([cx, cy, r]) => Math.hypot(x - cx, y - cy) < r);
    const clearOfUse = (key, x, y) => !hitsProtect({ key, x, y });

    const recipe = {
      neighbourhood: { tree: 16, shrub: 14, pot: 16, lamp: 34 },
      hawker: { tree: 18, shrub: 14, pot: 24, lamp: 30 },
      transport: { tree: 20, shrub: 16, pot: 10, lamp: 30 },
    };
    const sizes = { tree: { w: 40, h: 22 }, lamp: { w: 14, h: 10 } };

    ISLAND_ZONES.forEach((z) => {
      Object.entries(recipe[z.id]).forEach(([key, count]) => {
        let placed = 0;
        for (let tries = 0; tries < 4000 && placed < count; tries++) {
          const x = Math.round(rnd() * ISLAND_W);
          const y = Math.round(rnd() * ISLAND_H);
          if (this.zoneAt(x, y).id !== z.id) continue;
          const pd = this.pathDistance(x, y);
          if (key === "lamp") { if (pd < 80 || pd > 120) continue; }
          if (!free(x, y, 70, key === "lamp" ? 0 : 120) || !clearOfUse(key, x, y)) continue;
          add({ key, x, y, zone: z.id, foot: sizes[key] });
          placed++;
        }
      });
    });

    // Palm trees along the beach.
    let palms = 0;
    for (let tries = 0; tries < 8000 && palms < 90; tries++) {
      const x = Math.round(rnd() * ISLAND_W);
      const y = Math.round(rnd() * ISLAND_H);
      if (!free(x, y, 90, 130) || !clearOfUse("palm", x, y)) continue;
      const nearWater = [[160, 0], [-160, 0], [0, 160], [0, -160], [115, 115], [-115, -115], [115, -115], [-115, 115]].some(([dx, dy]) => !this.isLand(x + dx, y + dy));
      if (!nearWater) continue;
      add({ key: "palm", x, y, foot: { w: 30, h: 20 } });
      palms++;
    }
  },
};