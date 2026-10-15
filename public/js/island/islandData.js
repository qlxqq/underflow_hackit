// The Mystery Island: its size, coastline, three zones, paths, the nine
// locations (one per mini-game level), the nine NPCs and the gates between zones.
// Everything is plain data so names and positions can be tweaked here without
// touching the game code. All numbers are world pixels.
//
// The island is split into three zones by two "gates" (lines across the island).
// Everything left of gate 0 is the Neighbourhood, between the gates is the
// Hawker Centre, right of gate 1 is Public Transport. Each zone fills its whole
// strip of land, so buildings and levels are spread from the north coast to the
// south coast.

const ISLAND_W = 7200;
const ISLAND_H = 4800;

// Coastline, clockwise. The game smooths this into a curve.
const ISLAND_COAST = [
  [1200, 960], [2300, 780], [3500, 720], [4700, 780], [5700, 880], [6300, 1200],
  [6700, 1900], [6760, 2700], [6500, 3400], [5900, 3900], [5000, 4100], [4000, 4170],
  [3000, 4150], [2400, 4090], [1875, 4185], [1350, 4140], [850, 3800], [600, 3200],
  [550, 2400], [650, 1700],
];

// Where the player arrives (the boat dock on the south coast).
const ISLAND_DOCK = { x: 1500, y: 4185, jetty: { x: 1380, y: 4140, w: 160, h: 190 } };
const ISLAND_SPAWN = { x: 1500, y: 4035 };

// `words` is the key used in ZONE_WORDS (js/cards/data/zoneWords.js).
// (cx, cy) is where the mist lifts: the zone is revealed when the player comes
// within `reveal` of it. `label` is where the zone name goes on the map.
const ISLAND_ZONES = [
  { id: "neighbourhood", name: "Neighbourhood", words: "void-deck", cx: 1650, cy: 3000, radius: 1700, reveal: 950, label: { x: 1650, y: 1080 }, ground: "#e1e2da", ground2: "#d3d6cc", pave: true, accent: "#2f9e5b" },
  { id: "hawker", name: "Hawker Centre", words: "hawker-centre", cx: 3800, cy: 2450, radius: 1700, reveal: 1000, label: { x: 3800, y: 940 }, ground: "#f0e6d0", ground2: "#e9dcc0", pave: true, accent: "#e0842a" },
  { id: "transport", name: "Public Transport", words: "marina-bay", cx: 5750, cy: 2450, radius: 1700, reveal: 1000, label: { x: 5750, y: 1130 }, ground: "#dfe7f2", ground2: "#d3dded", pave: true, accent: "#3b6fd0" },
];

// Main routes (drawn as paved roads). Index 1 crosses gate 0 and index 2 crosses
// gate 1. Streets and the short door routes are drawn too.
const ISLAND_PATHS = [
  [[1500, 4200], [1500, 3950], [1560, 3650], [1650, 3300], [1700, 2900], [1750, 2450], [1700, 2000], [1650, 1500], [1600, 1150]],
  [[1750, 2450], [2200, 2450], [2600, 2440], [2900, 2450], [3300, 2430], [3800, 2400], [3800, 2000], [3800, 1500]],
  [[3800, 2400], [4200, 2450], [4700, 2450], [5200, 2450], [5750, 2450], [5750, 2000], [5750, 1500]],
  // zone 1 streets
  [[780, 2450], [1750, 2450]],
  [[800, 1520], [1650, 1500], [2450, 1520]],
  [[800, 3380], [1650, 3300], [2650, 3380]],
  // zone 2
  [[3800, 2400], [3800, 2900], [3800, 3400], [3850, 3850]],
  [[3000, 1560], [3800, 1500], [4600, 1560]],
  [[3200, 3380], [3800, 3400], [4350, 3380]],
  // zone 3
  [[5750, 2450], [5750, 2950], [5700, 3450]],
  [[5100, 1560], [5750, 1500], [6350, 1560]],
  [[5000, 3350], [5700, 3450], [6250, 3350]],
];

// The nine mini-game levels. They can be done in any order. Each is a real
// Singapore place drawn as a building. (x, y) is the centre of its base;
// `front` is the doorstep. `route: "auto"` joins the door to the nearest road.
// `prop` is the building art, `foot` the area that blocks the player.
// (`level` is just an id: 1-9, matching the Journey page; it is never shown.)
const ISLAND_LEVELS = [
  { level: 1, zone: "neighbourhood", name: "Provision Shop", sub: "The neighbourhood mama shop", prop: "minimart", x: 2100, y: 3720, foot: { w: 340, h: 110 }, front: { x: 2100, y: 3830 }, route: "auto" },
  { level: 2, zone: "neighbourhood", name: "Dragon Playground", sub: "The classic dragon playground", prop: "dragonPlayground", x: 2050, y: 1400, foot: { w: 460, h: 130 }, front: { x: 2050, y: 1510 }, route: "auto" },
  { level: 3, zone: "neighbourhood", name: "Void Deck", sub: "HDB void deck", prop: "voidDeck", x: 1130, y: 2900, foot: { w: 520, h: 120 }, front: { x: 1130, y: 3030 }, route: "auto" },
  { level: 4, zone: "hawker", name: "Wet Market", sub: "Morning wet market", prop: "wetMarket", x: 3420, y: 3290, foot: { w: 560, h: 120 }, front: { x: 3420, y: 3400 }, route: "auto" },
  { level: 5, zone: "hawker", name: "Kopitiam", sub: "Traditional coffee shop", prop: "kopitiam", x: 3250, y: 2020, foot: { w: 420, h: 120 }, front: { x: 3250, y: 2130 }, route: "auto" },
  { level: 6, zone: "hawker", name: "Hawker Centre", sub: "Neighbourhood food court", prop: "hawkerCentre", x: 3800, y: 1330, foot: { w: 690, h: 140 }, front: { x: 3800, y: 1500 }, route: null },
  { level: 7, zone: "transport", name: "Bus Interchange", sub: "Bus interchange", prop: "busInterchange", x: 5330, y: 2300, foot: { w: 580, h: 110 }, front: { x: 5330, y: 2410 }, route: "auto" },
  { level: 8, zone: "transport", name: "Taxi Stand", sub: "Taxi stand", prop: "taxiStand", x: 5400, y: 3700, foot: { w: 380, h: 100 }, front: { x: 5400, y: 3810 }, route: "auto" },
  { level: 9, zone: "transport", name: "MRT Station", sub: "Elevated MRT station", prop: "mrtStation", x: 6030, y: 1400, foot: { w: 700, h: 110 }, front: { x: 6030, y: 1500 }, route: null },
];

// The gates: a barrier across the island between two zones. It stays closed
// until every level in the `from` zone is done. `path` is the index in
// ISLAND_PATHS that crosses it. `at` is a point on the line and `n` the
// direction that points into the next zone.
const ISLAND_GATES = [
  { from: "neighbourhood", to: "hawker", path: 1, at: { x: 2900, y: 2450 }, n: { x: 0.98, y: -0.2 } },
  { from: "hawker", to: "transport", path: 2, at: { x: 4700, y: 2450 }, n: { x: 0.98, y: -0.2 } },
];

// Nine NPCs, three per zone, each standing at a building that fits what they do.
// `kind` is how they test the player (see IslandQuiz in quiz.js):
//   pinyin    - pick the pinyin for a word
//   meaning   - pick the English meaning of a word
//   listening - hear a word, pick the character
// The first time a player gets 2 or more right they earn coins and a card.
// How NPC challenges work can change later: edit quiz.js, not this list.
const ISLAND_NPCS = [
  { id: "teacher", zone: "neighbourhood", name: "Ms Chen", role: "Primary school teacher", look: "teacher", kind: "pinyin", x: 1150, y: 1560, greeting: "Class is in session! Read these words for me." },
  { id: "ccAuntie", zone: "neighbourhood", name: "Auntie Mei", role: "Community club volunteer", look: "auntie", kind: "meaning", x: 2430, y: 2120, greeting: "Welcome to the club! Do you know what these words mean?" },
  { id: "officer", zone: "neighbourhood", name: "Officer Lim", role: "Neighbourhood police", look: "officer", kind: "listening", x: 2280, y: 2900, greeting: "Listen carefully. Which word did you hear?" },
  { id: "stallUncle", zone: "hawker", name: "Uncle Ah Huat", role: "Chicken rice seller", look: "cook", kind: "pinyin", x: 3150, y: 1830, greeting: "Order up! First, read the menu to me." },
  { id: "tehAuntie", zone: "hawker", name: "Auntie Teh", role: "Drinks stall", look: "auntie", kind: "meaning", x: 4400, y: 1500, greeting: "Thirsty? Tell me what these words mean." },
  { id: "fruitSeller", zone: "hawker", name: "Fruit Seller", role: "Fruit stall", look: "vendor", kind: "listening", x: 4250, y: 3310, greeting: "Fresh and sweet! Which word do you hear?" },
  { id: "stationMaster", zone: "transport", name: "Station Master", role: "MRT ticket office", look: "staff", kind: "pinyin", x: 6160, y: 1860, greeting: "Before you board, a quick check of your Chinese." },
  { id: "busCaptain", zone: "transport", name: "Bus Captain", role: "Bus driver", look: "captain", kind: "meaning", x: 5090, y: 3120, greeting: "All aboard! What do these words mean?" },
  { id: "taxiDriver", zone: "transport", name: "Taxi Uncle", role: "Taxi driver", look: "driver", kind: "listening", x: 6030, y: 3150, greeting: "Where to? First, listen to this word." },
];

// Hand-placed scenery. `foot` is the blocked area at the base (centred on x).
// `flat: true` means it lies on the ground and can be walked over.
// Trees, plants and lamps are scattered by the game.
const ISLAND_SET_PIECES = [
  // ---- Neighbourhood: a busy HDB town with schools, a club, a police post ----
  { key: "school", x: 1050, y: 1420, foot: { w: 520, h: 110 } },
  { key: "kindergarten", x: 2480, y: 1380, foot: { w: 300, h: 90 } },
  { key: "hdbBlue", x: 900, y: 2380, foot: { w: 330, h: 90 } },
  { key: "hdbCream", x: 1380, y: 2380, foot: { w: 330, h: 90 } },
  { key: "hdbPink", x: 850, y: 1950, foot: { w: 330, h: 90 } },
  { key: "hdbMint", x: 1400, y: 1960, foot: { w: 330, h: 90 } },
  { key: "communityClub", x: 2400, y: 2060, foot: { w: 380, h: 100 } },
  { key: "policePost", x: 2280, y: 2800, foot: { w: 260, h: 80 } },
  { key: "basketballCourt", x: 2350, y: 3180, flat: true },
  { key: "swings", x: 1960, y: 1860, foot: { w: 200, h: 50 } },
  { key: "pavilion", x: 2080, y: 2300, foot: { w: 200, h: 60 } },
  { key: "clinic", x: 720, y: 2900, foot: { w: 300, h: 90 } },
  { key: "hdbPeach", x: 840, y: 3720, foot: { w: 330, h: 90 } },
  { key: "fitnessCorner", x: 1650, y: 3640, foot: { w: 220, h: 50 } },
  { key: "carpark", x: 1560, y: 4000, flat: true },
  { key: "lawn", x: 1900, y: 2750, flat: true },
  { key: "lawn", x: 1330, y: 3380, flat: true },
  { key: "chessTable", x: 1490, y: 3180, foot: { w: 90, h: 40 } },
  { key: "chessTable", x: 1330, y: 3150, foot: { w: 90, h: 40 } },
  { key: "busStop", x: 1920, y: 3260, foot: { w: 40, h: 30 } },
  { key: "bench", x: 2150, y: 2560, foot: { w: 100, h: 30 } },
  { key: "bench", x: 1380, y: 2570, foot: { w: 100, h: 30 } },
  { key: "bench", x: 1790, y: 3640, foot: { w: 100, h: 30 } },
  { key: "bench", x: 2250, y: 1640, foot: { w: 100, h: 30 } },
  { key: "bench", x: 1420, y: 1670, foot: { w: 100, h: 30 } },
  // ---- Hawker Centre ----
  { key: "stallRed", x: 3150, y: 1740, foot: { w: 180, h: 70 } },
  { key: "stallTeal", x: 4400, y: 1400, foot: { w: 180, h: 70 } },
  { key: "fruitStall", x: 4250, y: 3220, foot: { w: 190, h: 70 } },
  { key: "stallGold", x: 3400, y: 2700, foot: { w: 180, h: 70 } },
  { key: "stallRed", x: 4250, y: 2650, foot: { w: 180, h: 70 } },
  { key: "stallTeal", x: 3350, y: 1000, foot: { w: 180, h: 70 } },
  { key: "stallGold", x: 4300, y: 1050, foot: { w: 180, h: 70 } },
  { key: "table", x: 3500, y: 1650, foot: { w: 110, h: 50 } },
  { key: "table", x: 4100, y: 1700, foot: { w: 110, h: 50 } },
  { key: "table", x: 3900, y: 1790, foot: { w: 110, h: 50 } },
  { key: "table", x: 3600, y: 1800, foot: { w: 110, h: 50 } },
  { key: "table", x: 3500, y: 2900, foot: { w: 110, h: 50 } },
  { key: "table", x: 4100, y: 2900, foot: { w: 110, h: 50 } },
  { key: "table", x: 4050, y: 3000, foot: { w: 110, h: 50 } },
  { key: "bench", x: 4300, y: 2200, foot: { w: 100, h: 30 } },
  { key: "bench", x: 3300, y: 3780, foot: { w: 100, h: 30 } },
  // ---- Public Transport ----
  { key: "ticketBooth", x: 6160, y: 1780, foot: { w: 180, h: 60 } },
  { key: "busStop", x: 5020, y: 3060, foot: { w: 40, h: 30 } },
  { key: "bus", x: 5500, y: 2900, foot: { w: 280, h: 90 } },
  { key: "taxi", x: 6000, y: 3060, foot: { w: 150, h: 60 } },
  { key: "taxi", x: 6200, y: 3060, foot: { w: 150, h: 60 } },
  { key: "bus", x: 5200, y: 1960, foot: { w: 280, h: 90 } },
  { key: "busStop", x: 5000, y: 1590, foot: { w: 40, h: 30 } },
  { key: "busStop", x: 6400, y: 2600, foot: { w: 40, h: 30 } },
  { key: "bench", x: 5880, y: 2100, foot: { w: 100, h: 30 } },
  { key: "bench", x: 5300, y: 2620, foot: { w: 100, h: 30 } },
  { key: "bench", x: 6000, y: 3700, foot: { w: 100, h: 30 } },
  { key: "bench", x: 5100, y: 3760, foot: { w: 100, h: 30 } },
];

// Words are not shown when the player has not been there yet. A seeded random
// generator keeps scatter the same every time the island loads.
function islandRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth closed curve through the points (Catmull-Rom), as [x, y] pairs.
function islandSmooth(points, closed, steps = 10) {
  const n = points.length;
  const out = [];
  const count = closed ? n : n - 1;
  for (let i = 0; i < count; i++) {
    const p0 = closed ? points[(i - 1 + n) % n] : points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = closed ? points[(i + 2) % n] : points[Math.min(i + 2, n - 1)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  if (!closed) out.push(points[n - 1]);
  return out;
}