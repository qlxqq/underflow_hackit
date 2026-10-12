// Daily-login streak. Opening the app on a new day while logged in counts as a visit
// Dates are the player's local calendar date ("YYYY-MM-DD")

function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Whole days from one "YYYY-MM-DD" to another
function daysBetween(from, to) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

function calculateStreak({ lastActiveDate, today, currentStreak = 0, longestStreak = 0 }) {
  if (!lastActiveDate) {
    return { currentStreak: 1, longestStreak: Math.max(longestStreak, 1), lastActiveDate: today, changed: true };
  }
  const gap = daysBetween(lastActiveDate, today);
  // Same day, or the clock went backwards: leave everything as it is.
  if (gap <= 0) return { currentStreak, longestStreak, lastActiveDate, changed: false };

  const next = gap === 1 ? currentStreak + 1 : 1;
  return { currentStreak: next, longestStreak: Math.max(longestStreak, next), lastActiveDate: today, changed: true };
}

// A filled flame for the streak chip; grey when there is no streak yet.
function flameSvg(active, size = 20) {
  const outer = active ? "#f2882e" : "#b8c2cf";
  const inner = active ? "#ffd166" : "#dde3ea";
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">` +
    `<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4.5 3-7 .6 1.8 1.6 2.4 2.4 2.6C11.2 7.6 11.2 4.6 12 2z" fill="${outer}" />` +
    `<path d="M12 22a3.6 3.6 0 0 1-3.6-3.6c0-2 1.6-3 2.4-4.8.8 1.2 1.2 1.6 1.8 1.8 0-1 .2-1.8.6-2.6 1.4 1.6 2.4 2.6 2.4 5.6A3.6 3.6 0 0 1 12 22z" fill="${inner}" />` +
    `</svg>`;
}