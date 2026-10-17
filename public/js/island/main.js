// Starts the island inside the island page's #map: puts the markup in, waits
// for fonts (so painted signs use them), sets up the controls and pop-ups,
// then creates the Phaser game.
//
//   IslandApp.mount(rootElement, {
//     onEvent(type, detail)  // "level" | "npc" | "purchase" | "zone" | "practice": something happened
//     onCoins(n)             // the island's coin balance (shown in the page's top bar)
//     onTap()                // the player touched the island (close any drop-downs)
//   });

const IslandApp = {
  started: false,

  async mount(root, opts = {}) {
    if (this.started) return;
    this.started = true;
    root.classList.add("island-root");
    root.innerHTML = ISLAND_MARKUP;

    const tell = (type, detail) => { try { if (opts.onEvent) opts.onEvent(type, detail || null); } catch (err) { console.error(err); } };
    const wrap = (name, type) => {
      const orig = IslandHooks[name];
      IslandHooks[name] = function (...args) { tell(type, args[0] && typeof args[0] === "object" ? { id: args[0].id || args[0].npcId || null } : { value: args[0] }); return orig.apply(this, args); };
    };
    wrap("onLevelCompleted", "level");
    wrap("onNpcFinished", "npc");
    wrap("onPractice", "practice");
    wrap("onPurchase", "purchase");
    wrap("onZoneDiscovered", "zone");
    if (opts.onTap) root.addEventListener("pointerdown", () => opts.onTap(), true);

    // Painted signs use these fonts. Start loading them now, alongside the saved
    // game below, instead of after it.
    const fontsReady = Promise.race([
      Promise.all([
        document.fonts.load('800 20px "Noto Sans SC"', "岛屿小店鸡饭熟食中心沙爹煎饼烧烤饮料站面杂货店巴刹咖啡店巴士转换站的士站民众俱乐部警察岗亭诊所小学水果售票处"),
        document.fonts.load('800 20px "Manrope"', "Level 1 BLK 88 MRT"),
      ]),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]).catch(() => { /* fall back to system fonts */ });

    await IslandSave.init();   // who is logged in (if anyone)
    // These do not depend on each other, so they are asked for together.
    await Promise.all([
      IslandState.load(),      // their saved game
      IslandCards.load(),      // the island album cards they own
      IslandCaptured.load(),   // their captured words (they join the challenges)
    ]);
    if (opts.onCoins) { const sendCoins = () => opts.onCoins(IslandState.coins); IslandState.onChange(sendCoins); sendCoins(); }
    IslandControls.init();
    IslandUI.init();

    await fontsReady;

    const parent = document.getElementById("game");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = () => ({ w: Math.max(1, Math.round(parent.clientWidth * dpr)), h: Math.max(1, Math.round(parent.clientHeight * dpr)) });
    const first = size();

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: first.w,
      height: first.h,
      backgroundColor: "#c3dcea",
      scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr },
      render: { antialias: true, powerPreference: "high-performance" },
      input: { keyboard: false },
      callbacks: { preBoot: (g) => { g.islandDpr = dpr; } },
      scene: IslandState.where === "home" ? [HomeScene, IslandScene] : [IslandScene, HomeScene],
    });
    window.__island = { game, world: IslandWorld, ui: IslandUI, state: IslandState };

    const resize = () => { if (!game.isBooted || !game.canvas) return; const s = size(); game.scale.resize(s.w, s.h); };
    window.addEventListener("resize", resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(parent);
  },
};