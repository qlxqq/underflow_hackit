// Tests the profile pictures. They are plain global functions (no
// exports), so avatars.js is loaded with vm like a <script> tag.
const vm = require("vm");
const fs = require("fs");
const path = require("path");

function load() {
  const ctx = vm.createContext({ console });
  const code = fs.readFileSync(path.join(__dirname, "..", "..", "public", "js", "shared", "avatars.js"), "utf8");
  vm.runInContext(code, ctx, { filename: "avatars.js" });
  return ctx;
}

describe("profile pictures", () => {
  const ctx = load();
  const run = (code) => vm.runInContext(code, ctx);

  test("there are eight Singapore pictures, each with a label", () => {
    expect(run("AVATARS.length")).toBe(8);
    expect(run("AVATARS.every((a) => a.id && a.label)")).toBe(true);
  });

  test("the Merlion is the default picture", () => {
    expect(run("DEFAULT_AVATAR")).toBe("merlion");
    expect(run("isValidAvatar('merlion')")).toBe(true);
  });

  test("unknown picture ids are rejected", () => {
    expect(run("isValidAvatar('pizza')")).toBe(false);
    expect(run("isValidAvatar(undefined)")).toBe(false);
  });

  test("every picture draws a complete square SVG at the requested size", () => {
    const ids = run("AVATARS.map((a) => a.id)");
    ids.forEach((id) => {
      const svg = run(`avatarSvg(${JSON.stringify(id)}, 72)`);
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg.endsWith("</svg>")).toBe(true);
      expect(svg).toContain('width="72"');
      expect(svg).not.toContain("SIZE");
      expect(svg).not.toMatch(/NaN|undefined/);
    });
  });

  test("the Merlion picture draws the lion's face", () => {
    const svg = run("avatarSvg('merlion', 44)");
    expect(svg).toContain("#f2a93b"); // mane
    expect(svg).toContain("#5b3426"); // nose
  });

  test("the Merlion's face is centred in its frame, so it never looks slanted or cropped", () => {
    const svg = run("avatarSvg('merlion', 44)");
    const [x, y, w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(" ").map(Number);
    expect(w).toBe(h); // a square frame
    expect(x + w / 2).toBe(90); // the face is drawn around (90, 84)
    expect(y + h / 2).toBe(84);
    expect(x).toBeLessThanOrEqual(90 - 70); // the whole mane fits inside the frame
    expect(x + w).toBeGreaterThanOrEqual(90 + 70);
    expect(y).toBeLessThanOrEqual(84 - 70);
    expect(y + h).toBeGreaterThanOrEqual(84 + 70);
  });

  test("pictures use no gradient ids, so they are safe to repeat on one page", () => {
    run("AVATARS.map((a) => a.id)").forEach((id) => {
      expect(run(`avatarSvg(${JSON.stringify(id)}, 44)`)).not.toMatch(/\bid="/);
    });
  });

  test("an unknown id falls back to the Merlion instead of failing", () => {
    expect(run("avatarSvg('nope', 44)")).toBe(run("avatarSvg('merlion', 44)"));
  });
});