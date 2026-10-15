// Player input: an on-screen joystick for phones, WASD / arrow keys for
// keyboards, and one "interact" action (button, E, Space or Enter).
// The game asks for the current direction with IslandControls.vector().

const IslandControls = {
  enabled: true, // turned off while a pop-up is open
  keys: new Set(),
  joy: { x: 0, y: 0 },
  onAction: null,

  MOVE_KEYS: {
    ArrowUp: "up", w: "up", W: "up",
    ArrowDown: "down", s: "down", S: "down",
    ArrowLeft: "left", a: "left", A: "left",
    ArrowRight: "right", d: "right", D: "right",
  },
  ACTION_KEYS: ["e", "E", " ", "Enter"],

  init() {
    window.addEventListener("keydown", (e) => {
      if (!this.enabled) return;
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const dir = this.MOVE_KEYS[e.key];
      if (dir) {
        this.keys.add(dir);
        e.preventDefault();
      } else if (this.ACTION_KEYS.includes(e.key)) {
        if (!e.repeat && this.onAction) this.onAction();
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => {
      const dir = this.MOVE_KEYS[e.key];
      if (dir) this.keys.delete(dir);
    });
    window.addEventListener("blur", () => this.keys.clear());

    this.setupJoystick();
    const act = document.getElementById("act-btn");
    if (act) act.addEventListener("click", () => this.enabled && this.onAction && this.onAction());
  },

  setupJoystick() {
    const root = document.getElementById("joystick");
    if (!root) return;
    const knob = root.querySelector(".joy-knob");
    const max = 46; // how far the knob can travel (px)
    let activeId = null;
    let origin = null;

    const move = (e) => {
      if (e.pointerId !== activeId) return;
      let dx = e.clientX - origin.x;
      let dy = e.clientY - origin.y;
      const len = Math.hypot(dx, dy);
      if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const strength = Math.min(1, len / max);
      const dead = 0.18;
      if (strength < dead) this.joy = { x: 0, y: 0 };
      else this.joy = { x: (dx / max) * 1, y: (dy / max) * 1 };
    };
    const end = (e) => {
      if (e.pointerId !== activeId) return;
      activeId = null;
      this.joy = { x: 0, y: 0 };
      knob.style.transform = "translate(0, 0)";
      root.classList.remove("is-active");
    };
    root.addEventListener("pointerdown", (e) => {
      if (!this.enabled) return;
      activeId = e.pointerId;
      const rect = root.getBoundingClientRect();
      origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      root.setPointerCapture(e.pointerId);
      root.classList.add("is-active");
      move(e);
      e.preventDefault();
    });
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerup", end);
    root.addEventListener("pointercancel", end);
  },

  // Current direction as { x, y }, length 0 to 1.
  vector() {
    if (!this.enabled) return { x: 0, y: 0 };
    let x = this.joy.x;
    let y = this.joy.y;
    if (this.keys.has("left")) x -= 1;
    if (this.keys.has("right")) x += 1;
    if (this.keys.has("up")) y -= 1;
    if (this.keys.has("down")) y += 1;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  },

  setEnabled(on) {
    this.enabled = on;
    if (!on) {
      this.keys.clear();
      this.joy = { x: 0, y: 0 };
      const knob = document.querySelector("#joystick .joy-knob");
      if (knob) knob.style.transform = "translate(0, 0)";
    }
  },
};