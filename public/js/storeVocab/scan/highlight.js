// The "Pick your words" screen that opens after a photo is taken.
//
// The photo is shown and the player drags a box round the words they want.
// Up to six boxes can be drawn; tap a box to remove it. The page then reads
// only the boxed parts.
//
// This file only handles choosing. Reading the text lives in scan/ocr.js;
// script.js connects the two.
//
// Boxes are kept in canvas pixels (the size of the photo that OCR reads) and
// drawn as percentages, so they follow the photo at any screen size.

const HL_MAX_BOXES = 6;
const HL_MIN_BOX_PX = 14;       // on screen, so a stray tap does not make a box
const HL_TAP_SLOP_PX = 8;       // on screen, movement still counted as a tap

function createPhotoHighlighter(els, handlers) {
  const { stage, hint, clearBtn, findBtn, wholeBtn } = els;

  let canvas = null;
  let overlay = null;
  let liveEl = null;
  let boxes = [];                 // [{ x0, y0, x1, y1 }] in canvas pixels
  let busy = false;
  let gesture = null;

  // ---- geometry ----
  function toCanvas(event) {
    const r = overlay.getBoundingClientRect();
    return {
      x: Math.min(canvas.width, Math.max(0, (event.clientX - r.left) * (canvas.width / r.width))),
      y: Math.min(canvas.height, Math.max(0, (event.clientY - r.top) * (canvas.height / r.height))),
      scale: canvas.width / r.width,   // canvas pixels per screen pixel
    };
  }

  function placeEl(el, r) {
    el.style.left = `${(r.x0 / canvas.width) * 100}%`;
    el.style.top = `${(r.y0 / canvas.height) * 100}%`;
    el.style.width = `${((r.x1 - r.x0) / canvas.width) * 100}%`;
    el.style.height = `${((r.y1 - r.y0) / canvas.height) * 100}%`;
  }

  function normalise(a, b) {
    return { x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) };
  }

  function boxAt(x, y) {
    for (let i = boxes.length - 1; i >= 0; i--) {
      const r = boxes[i];
      if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) return i;
    }
    return -1;
  }

  // ---- rendering ----
  function renderBoxes() {
    overlay.querySelectorAll(".hl-rect:not(.is-live)").forEach((el) => el.remove());
    boxes.forEach((r) => {
      const el = document.createElement("div");
      el.className = "hl-rect";
      placeEl(el, r);
      overlay.appendChild(el);
    });
  }

  function refresh() {
    const n = boxes.length;
    findBtn.disabled = n === 0 || busy;
    findBtn.textContent = busy ? "Reading..." : n === 0 ? "Draw a box round some words" : `Find words in ${n} box${n === 1 ? "" : "es"}`;
    clearBtn.hidden = n === 0;
    clearBtn.disabled = busy;
    wholeBtn.disabled = busy;
    hint.textContent = n === 0
      ? "Drag a box round the words you want. Keep to one line or one short paragraph."
      : "Add more boxes if you like. Tap a box to remove it.";
  }

  // ---- gestures ----
  function onDown(event) {
    if (busy || !canvas) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    overlay.setPointerCapture(event.pointerId);
    const p = toCanvas(event);
    gesture = { start: p, startClient: { x: event.clientX, y: event.clientY }, moved: false };
  }

  function onMove(event) {
    if (!gesture) return;
    if (Math.hypot(event.clientX - gesture.startClient.x, event.clientY - gesture.startClient.y) > HL_TAP_SLOP_PX) gesture.moved = true;
    if (!gesture.moved) return;
    if (!liveEl) {
      liveEl = document.createElement("div");
      liveEl.className = "hl-rect is-live";
      overlay.appendChild(liveEl);
    }
    placeEl(liveEl, normalise(gesture.start, toCanvas(event)));
  }

  function onUp(event) {
    if (!gesture) return;
    const g = gesture;
    gesture = null;
    if (liveEl) { liveEl.remove(); liveEl = null; }

    const p = toCanvas(event);
    if (!g.moved) {
      // A tap: remove the box under the finger, if there is one.
      const hit = boxAt(p.x, p.y);
      if (hit >= 0) {
        boxes.splice(hit, 1);
        renderBoxes();
        refresh();
      }
      return;
    }
    const rect = normalise(g.start, p);
    const minPx = HL_MIN_BOX_PX * p.scale;
    if (rect.x1 - rect.x0 < minPx || rect.y1 - rect.y0 < minPx) return;
    if (boxes.length >= HL_MAX_BOXES) {
      if (handlers.onMessage) handlers.onMessage(`Up to ${HL_MAX_BOXES} boxes at a time. Tap a box to remove it first.`);
      return;
    }
    boxes.push(rect);
    renderBoxes();
    refresh();
  }

  function onCancel() {
    gesture = null;
    if (liveEl) { liveEl.remove(); liveEl = null; }
  }

  // ---- public ----
  function open(photoCanvas) {
    canvas = photoCanvas;
    boxes = [];
    busy = false;
    gesture = null;

    stage.innerHTML = "";
    const frame = document.createElement("div");
    frame.className = "hl-frame";
    canvas.className = "hl-photo";
    overlay = document.createElement("div");
    overlay.className = "hl-overlay";
    overlay.addEventListener("pointerdown", onDown);
    overlay.addEventListener("pointermove", onMove);
    overlay.addEventListener("pointerup", onUp);
    overlay.addEventListener("pointercancel", onCancel);
    frame.append(canvas, overlay);
    stage.appendChild(frame);
    refresh();
  }

  function setBusy(value) {
    busy = value;
    refresh();
  }

  function clearAll() {
    boxes = [];
    if (overlay) renderBoxes();
    refresh();
  }

  function close() {
    canvas = null;
    overlay = null;
    boxes = [];
    stage.innerHTML = "";
  }

  clearBtn.addEventListener("click", clearAll);
  findBtn.addEventListener("click", () => {
    if (boxes.length > 0 && handlers.onFind) handlers.onFind(boxes.map((r) => ({ ...r })).sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1)));
  });
  wholeBtn.addEventListener("click", () => handlers.onWhole && handlers.onWhole());

  return { open, setBusy, close, clearAll, get isOpen() { return canvas !== null; } };
}