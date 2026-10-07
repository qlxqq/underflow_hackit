// Tests the daily-streak rules. streak.js uses plain global functions, so
// it is loaded with vm, the way the browser loads a <script> tag.
const vm = require("vm");
const fs = require("fs");
const path = require("path");

function load() {
  const ctx = vm.createContext({ console });
  const code = fs.readFileSync(path.join(__dirname, "..", "..", "public", "js", "journey", "streak.js"), "utf8");
  vm.runInContext(code, ctx, { filename: "streak.js" });
  return ctx;
}

describe("daily streak", () => {
  const ctx = load();
  const calc = (input) => vm.runInContext(`calculateStreak(${JSON.stringify(input)})`, ctx);

  test("the very first visit starts a streak of 1", () => {
    const r = calc({ lastActiveDate: null, today: "2026-10-05", currentStreak: 0, longestStreak: 0 });
    expect(r).toMatchObject({ currentStreak: 1, longestStreak: 1, lastActiveDate: "2026-10-05", changed: true });
  });

  test("opening the app again the same day changes nothing", () => {
    const r = calc({ lastActiveDate: "2026-10-05", today: "2026-10-05", currentStreak: 4, longestStreak: 9 });
    expect(r).toMatchObject({ currentStreak: 4, longestStreak: 9, changed: false });
  });

  test("the next day adds one", () => {
    const r = calc({ lastActiveDate: "2026-10-05", today: "2026-10-06", currentStreak: 4, longestStreak: 9 });
    expect(r).toMatchObject({ currentStreak: 5, longestStreak: 9, lastActiveDate: "2026-10-06", changed: true });
  });

  test("missing a day starts again at 1 but keeps the best streak", () => {
    const r = calc({ lastActiveDate: "2026-10-05", today: "2026-10-07", currentStreak: 12, longestStreak: 12 });
    expect(r).toMatchObject({ currentStreak: 1, longestStreak: 12, changed: true });
  });

  test("beating the best streak raises it", () => {
    const r = calc({ lastActiveDate: "2026-10-05", today: "2026-10-06", currentStreak: 9, longestStreak: 9 });
    expect(r.longestStreak).toBe(10);
  });

  test("works across the end of a month and a year", () => {
    expect(calc({ lastActiveDate: "2026-09-30", today: "2026-10-01", currentStreak: 2, longestStreak: 2 }).currentStreak).toBe(3);
    expect(calc({ lastActiveDate: "2026-12-31", today: "2027-01-01", currentStreak: 2, longestStreak: 2 }).currentStreak).toBe(3);
  });

  test("handles a leap day", () => {
    expect(calc({ lastActiveDate: "2028-02-28", today: "2028-02-29", currentStreak: 1, longestStreak: 1 }).currentStreak).toBe(2);
    expect(calc({ lastActiveDate: "2028-02-29", today: "2028-03-01", currentStreak: 2, longestStreak: 2 }).currentStreak).toBe(3);
  });

  test("a clock set backwards does not reset the streak", () => {
    const r = calc({ lastActiveDate: "2026-10-06", today: "2026-10-03", currentStreak: 6, longestStreak: 6 });
    expect(r).toMatchObject({ currentStreak: 6, changed: false });
  });
});

describe("local dates", () => {
  const ctx = load();

  test("formats a date as YYYY-MM-DD with leading zeros", () => {
    expect(vm.runInContext("localDateString(new Date(2026, 0, 5))", ctx)).toBe("2026-01-05");
    expect(vm.runInContext("localDateString(new Date(2026, 11, 25))", ctx)).toBe("2026-12-25");
  });

  test("counts whole days between two dates", () => {
    expect(vm.runInContext('daysBetween("2026-10-05", "2026-10-06")', ctx)).toBe(1);
    expect(vm.runInContext('daysBetween("2026-10-05", "2026-10-05")', ctx)).toBe(0);
    expect(vm.runInContext('daysBetween("2026-10-06", "2026-10-05")', ctx)).toBe(-1);
    expect(vm.runInContext('daysBetween("2026-02-27", "2026-03-02")', ctx)).toBe(3);
  });
});

describe("flame icon", () => {
  const ctx = load();
  test("is orange when there is a streak and grey when there is none", () => {
    expect(vm.runInContext("flameSvg(true)", ctx)).toContain("#f2882e");
    expect(vm.runInContext("flameSvg(false)", ctx)).toContain("#b8c2cf");
  });
});