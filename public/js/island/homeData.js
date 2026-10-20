// The player's home island: a bigger island with a decorative house, an
// Island Shop and a dock. Everything bought at the shop is placed on a spot
// here. All numbers are world pixels.

const HOME_W = 4000;
const HOME_H = 2800;

const HOME_COAST = [
  [900, 700], [1700, 520], [2500, 500], [3200, 700], [3550, 1200], [3500, 1800],
  [3200, 2250], [2600, 2480], [2000, 2540], [1400, 2480], [900, 2150], [600, 1600], [650, 1100],
];
const HOME_DOCK = { x: 2000, y: 2540, jetty: { x: 2000, y: 2505, w: 160, h: 190 } };
const HOME_SPAWN = { x: 2000, y: 2400 };

const HOME_PATHS = [
  [[2000, 2560], [2000, 2300], [2000, 1900], [2000, 1500], [2000, 1150], [2000, 930]],
  [[1050, 1730], [2000, 1730], [2900, 1730]],
];

// The house is only for decoration (the player cannot go in yet).
const HOME_HOUSE = { name: "Your house", prop: "homeHouse", x: 2000, y: 950, foot: { w: 340, h: 110 } };
const HOME_SHOP = { name: "Island Shop", prop: "islandShop", x: 2600, y: 1620, foot: { w: 240, h: 90 }, front: { x: 2600, y: 1730 } };

// Things the player can buy. The first ones have a starting spot where they appear once bought;
// the player can then move and flip them (Decorate button on the island). `cat` groups them in the shop.
// `foot` is the area that blocks the player (leave it out to walk through).
const HOME_CATEGORIES = [
  { id: "all", name: "All" },
  { id: "fun", name: "Rides & fun" },
  { id: "building", name: "Buildings" },
  { id: "decor", name: "Decor" },
  { id: "pets", name: "Pets" },
];
const HOME_ITEMS = [
  { id: "bounce", name: "Bouncy castle", cat: "fun", price: 40, key: "bounceCastle", foot: { w: 210, h: 60 }, spots: [{ x: 1400, y: 1050 }] },
  { id: "arch", name: "Fairy-light arch", cat: "decor", price: 30, key: "fairyArch", foot: null, spots: [{ x: 2000, y: 2050 }] },
  { id: "icecream", name: "Ice-cream truck", cat: "decor", price: 50, key: "iceCreamTruck", foot: { w: 210, h: 60 }, spots: [{ x: 1400, y: 1660 }] },
  { id: "fountain", name: "Fountain", cat: "decor", price: 60, key: "fountain", foot: { w: 190, h: 60 }, spots: [{ x: 1650, y: 1400 }] },
  { id: "windmill", name: "Windmill", cat: "building", price: 70, key: "windmill", foot: { w: 110, h: 50 }, spots: [{ x: 1250, y: 2100 }] },
  { id: "treehouse", name: "Treehouse", cat: "building", price: 80, key: "treehouse", foot: { w: 90, h: 50 }, spots: [{ x: 900, y: 1700 }] },
  { id: "pool", name: "Swimming pool", cat: "fun", price: 80, key: "pool", foot: { w: 300, h: 70 }, spots: [{ x: 3120, y: 1900 }] },
  { id: "lighthouse", name: "Lighthouse", cat: "building", price: 90, key: "lighthouse", foot: { w: 80, h: 40 }, spots: [{ x: 3250, y: 2150 }] },
  { id: "cafe", name: "Café", cat: "building", price: 90, key: "cafe", foot: { w: 250, h: 80 }, spots: [{ x: 1500, y: 2050 }] },
  { id: "carousel", name: "Carousel", cat: "fun", price: 100, key: "carousel", foot: { w: 210, h: 60 }, spots: [{ x: 1250, y: 1300 }] },
  { id: "arcade", name: "Game arcade", cat: "building", price: 100, key: "arcade", foot: { w: 260, h: 80 }, spots: [{ x: 2550, y: 2200 }] },
  { id: "balloon", name: "Hot-air balloon", cat: "fun", price: 120, key: "balloon", foot: { w: 60, h: 30 }, spots: [{ x: 2900, y: 1000 }] },
  { id: "ferris", name: "Ferris wheel", cat: "fun", price: 150, key: "ferrisWheel", foot: { w: 260, h: 70 }, spots: [{ x: 3000, y: 1420 }] },
  // more to decorate with: no fixed spot, they appear near the middle and the player moves them (Decorate button)
  { shared: true, id: "playground", name: "Playground", cat: "fun", price: 90, key: "playground", foot: { w: 200, h: 50 } },
  { shared: true, id: "koi", name: "Koi pond", cat: "decor", price: 75, key: "koiPond", foot: { w: 230, h: 60 } },
  { shared: true, id: "stallchicken", name: "Chicken-rice stall", cat: "building", price: 70, key: "stallRed", foot: { w: 170, h: 50 } },
  { shared: true, id: "stallsatay", name: "Satay stall", cat: "building", price: 70, key: "stallTeal", foot: { w: 170, h: 50 } },
  { shared: true, id: "stallpancake", name: "Pancake stall", cat: "building", price: 70, key: "stallGold", foot: { w: 170, h: 50 } },
  { shared: true, id: "parasol", name: "Parasol table", cat: "decor", price: 45, key: "parasolTable", foot: { w: 120, h: 40 } },
  { id: "campfire", name: "Campfire", cat: "decor", price: 35, key: "campfire", foot: { w: 60, h: 24 } },
  { shared: true, id: "chess", name: "Chess table", cat: "fun", price: 40, key: "chessTable", foot: { w: 80, h: 30 } },
  { id: "flowers", name: "Flower bed", cat: "decor", price: 25, key: "flowerBed", foot: { w: 150, h: 30 } },
  { shared: true, id: "bench", name: "Park bench", cat: "decor", price: 25, key: "bench", foot: { w: 100, h: 26 } },
  { shared: true, id: "palm", name: "Palm tree", cat: "decor", price: 20, key: "palm", foot: { w: 36, h: 20 } },
  { shared: true, id: "lamp", name: "Street lamp", cat: "decor", price: 15, key: "lamp", foot: { w: 14, h: 10 } },
  // pets roam the island on their own (`pet: true`)
  { id: "pet-duck", name: "Duckling", cat: "pets", price: 50, key: "pet_duck", pet: true, speed: 55 },
  { id: "pet-turtle", name: "Turtle", cat: "pets", price: 60, key: "pet_turtle", pet: true, speed: 26 },
  { id: "pet-bunny", name: "Bunny", cat: "pets", price: 70, key: "pet_bunny", pet: true, speed: 85 },
  { id: "pet-cat", name: "Kitten", cat: "pets", price: 90, key: "pet_cat", pet: true, speed: 80 },
  { id: "pet-dog", name: "Puppy", cat: "pets", price: 90, key: "pet_dog", pet: true, speed: 95 },
];