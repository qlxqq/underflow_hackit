// Tests the pure progress logic in progress.js. The Supabase read/write
// functions need a live database, so only the plain decision-making
// functions are covered here.
const vm = require("vm");
const fs = require("fs");
const path = require("path");

function load() {
  const context = vm.createContext({ console, supabase: {} }); // stub so the file parses
  const code = fs.readFileSync(
    path.join(__dirname, "..", "..", "public", "js", "journey", "progress.js"),
    "utf8",
  );
  vm.runInContext(code, context, { filename: "progress.js" });
  return context;
}

describe("level completion (one mini-game per level)", () => {
  const ctx = load();
  const run = (code) => vm.runInContext(code, ctx);

  test("a level that was never started is not complete", () => {
    expect(run("isLevelComplete(null)")).toBe(false);
  });

  test("a level is not complete until its mini-game is done", () => {
    expect(run("isLevelComplete({ slot_1_completed: false })")).toBe(false);
  });

  test("a level is complete once its mini-game is done", () => {
    expect(run("isLevelComplete({ slot_1_completed: true })")).toBe(true);
  });

  test("the old slot 2 and 3 columns no longer matter", () => {
    expect(run("isLevelComplete({ slot_1_completed: false, slot_2_completed: true, slot_3_completed: true })")).toBe(false);
  });
});

describe("level advancement", () => {
  const ctx = load();
  const run = (code) => vm.runInContext(code, ctx);
  const done = "{ slot_1_completed: true }";
  const notDone = "{ slot_1_completed: false }";

  test("stays on the same level if it isn't finished", () => {
    expect(run(`nextLevelNumber(2, 9, ${notDone})`)).toBe(2);
  });
  test("advances by one once the level is finished", () => {
    expect(run(`nextLevelNumber(2, 9, ${done})`)).toBe(3);
  });
  test("doesn't advance past the last level", () => {
    expect(run(`nextLevelNumber(9, 9, ${done})`)).toBe(9);
  });
});

describe("level locking", () => {
  const ctx = load();
  const run = (code) => vm.runInContext(code, ctx);

  test("the current level is not locked", () => {
    expect(run("isLevelLocked(2, 2)")).toBe(false);
  });
  test("a past level stays unlocked for replay", () => {
    expect(run("isLevelLocked(1, 3)")).toBe(false);
  });
  test("a future level is locked", () => {
    expect(run("isLevelLocked(4, 2)")).toBe(true);
  });
  test("visible levels run from 1 through the total, in order", () => {
    expect(run("getVisibleLevelNumbers(9)")).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});