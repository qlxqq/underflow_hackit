// Tests the pure progress logic in progress.js - the Supabase read/write
// functions (getProgress, ensureProgressRow, completeSlot) aren't tested
// here, since they need a live database; only the plain decision-making
// functions below are covered.
const vm = require("vm");
const fs = require("fs");
const path = require("path");

function loadProgressLogic() {
  const context = vm.createContext({ console, supabase: {} }); // stub so the file parses without a real client
  const code = fs.readFileSync(
    path.join(__dirname, "..", "..", "public", "js", "journey", "progress.js"),
    "utf8",
  );
  vm.runInContext(code, context, { filename: "progress.js" });
  return context;
}

describe("level completion", () => {
  let context;
  beforeEach(() => {
    context = loadProgressLogic();
  });

  function isLevelComplete(row) {
    return vm.runInContext(`isLevelComplete(${JSON.stringify(row)})`, context);
  }

  test("a level that was never started is not complete", () => {
    expect(isLevelComplete(null)).toBe(false);
  });

  test("a level with only some slots done is not complete", () => {
    expect(
      isLevelComplete({ slot_1_completed: true, slot_2_completed: false, slot_3_completed: false }),
    ).toBe(false);
  });

  test("a level with all three slots done is complete", () => {
    expect(
      isLevelComplete({ slot_1_completed: true, slot_2_completed: true, slot_3_completed: true }),
    ).toBe(true);
  });
});

describe("level advancement", () => {
  let context;
  beforeEach(() => {
    context = loadProgressLogic();
  });

  function nextLevelNumber(current, total, row) {
    return vm.runInContext(
      `nextLevelNumber(${current}, ${total}, ${JSON.stringify(row)})`,
      context,
    );
  }

  const complete = { slot_1_completed: true, slot_2_completed: true, slot_3_completed: true };
  const partial = { slot_1_completed: true, slot_2_completed: false, slot_3_completed: false };

  test("stays on the same level if it isn't finished yet", () => {
    expect(nextLevelNumber(2, 4, partial)).toBe(2);
  });

  test("advances by one once the level is finished", () => {
    expect(nextLevelNumber(2, 4, complete)).toBe(3);
  });

  test("doesn't advance past the last level", () => {
    expect(nextLevelNumber(4, 4, complete)).toBe(4);
  });
});

describe("level locking", () => {
  let context;
  beforeEach(() => {
    context = loadProgressLogic();
  });

  function isLevelLocked(level, current) {
    return vm.runInContext(`isLevelLocked(${level}, ${current})`, context);
  }

  function getVisibleLevelNumbers(total) {
    return vm.runInContext(`getVisibleLevelNumbers(${total})`, context);
  }

  test("the current level is not locked", () => {
    expect(isLevelLocked(2, 2)).toBe(false);
  });

  test("a past level stays unlocked for replay", () => {
    expect(isLevelLocked(1, 3)).toBe(false);
  });

  test("a future level is locked", () => {
    expect(isLevelLocked(4, 2)).toBe(true);
  });

  test("visible levels run from 1 through the total, in order", () => {
    expect(getVisibleLevelNumbers(4)).toEqual([1, 2, 3, 4]);
  });
});