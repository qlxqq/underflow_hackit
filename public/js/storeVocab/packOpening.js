// Pack-opening reveal: new cards arrive face down, one at a time. Tap a card
// to flip it and see its rarity; Next moves on; Skip jumps to the summary.
//
//   await openPack(cards, { summaryLines: ["+35 XP"] });
//
// `cards` are shaped like vocabulary rows (what renderCard expects). It
// resolves once the player closes the summary. Used after capturing words now,
// and for cards won in mini-games on the island later.
//
// Needs cards.js (renderCard, RARITY_LABELS) and escapeHtml.

const PACK_COLORS = { common: "#8a97ab", uncommon: "#3aa675", rare: "#2f6fd6", epic: "#8a4fd3", legendary: "#f2a93b" };
const PACK_RARITY_ORDER = ["legendary", "epic", "rare", "uncommon", "common"];

function packRarity(entry) {
  return RARITY_LABELS[entry.rarity] ? entry.rarity : "common";
}

// Higher rarity takes more taps to open.
const PACK_TAPS = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };

// sealed: true shows a sealed pack first. Tap it and it reacts; swipe across
// it to tear it open. Then the cards come one by one, face down.
function openPack(cards, { summaryLines = [], sealed = true } = {}) {
  return new Promise((resolve) => {
    if (!cards || cards.length === 0) return resolve();

    let index = 0;
    let flipped = false;
    const previousFocus = document.activeElement;

    const overlay = document.createElement("div");
    overlay.className = "pack-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "New cards");
    overlay.innerHTML = `
      <div class="pack-glow"></div>
      <button type="button" class="pack-skip" data-pack-skip>Skip</button>
      <div class="pack-body"></div>`;
    document.body.appendChild(overlay);
    document.body.classList.add("pack-open");
    const body = overlay.querySelector(".pack-body");
    const glow = overlay.querySelector(".pack-glow");

    function close() {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      document.body.classList.remove("pack-open");
      if (previousFocus && previousFocus.focus) previousFocus.focus();
      resolve();
    }

    function onKey(e) {
      if (e.key === "Escape") showSummary();
    }
    document.addEventListener("keydown", onKey);

    // ---- the sealed pack ----
    function zigzag(teeth, depth, bottom) {
      const pts = [];
      for (let i = 0; i <= teeth; i++) {
        const x = ((i * 100) / teeth).toFixed(2);
        const y = i % 2 ? 0 : depth;
        pts.push(bottom ? `${x}% calc(100% - ${y}px)` : `${x}% ${y}px`);
      }
      return bottom ? `polygon(0 0, 100% 0, ${pts.reverse().join(", ")})` : `polygon(${pts.join(", ")}, 100% 100%, 0 100%)`;
    }

    function showSealed() {
      glow.className = "pack-glow";
      glow.style.setProperty("--pack-color", "#ffffff");
      body.innerHTML = `
        <p class="pack-count">${cards.length} new ${cards.length === 1 ? "card" : "cards"}</p>
        <div class="pack-sealed" role="button" tabindex="0" aria-label="Sealed pack. Swipe across it to open, or press Enter twice">
          <div class="pack-foil pack-bottom"><span class="pack-label">WORD<br>PACK</span><span class="pack-num">${cards.length} cards</span></div>
          <div class="pack-foil pack-top"><span class="pack-seam"></span></div>
        </div>
        <p class="pack-hint">Tap the pack</p>`;
      const pack = body.querySelector(".pack-sealed");
      const top = body.querySelector(".pack-top");
      const bottom = body.querySelector(".pack-bottom");
      const hint = body.querySelector(".pack-hint");
      top.style.clipPath = zigzag(14, 7, false);
      bottom.style.clipPath = zigzag(14, 7, true);

      let primed = false;
      let startX = null;
      let dx = 0;
      let torn = false;

      function prime() {
        primed = true;
        hint.textContent = "Now swipe across the pack to tear it open";
        pack.classList.remove("is-poked");
        void pack.offsetWidth; // restart the animation
        pack.classList.add("is-poked");
      }

      function tear(direction) {
        if (torn) return;
        torn = true;
        hint.textContent = "";
        pack.classList.add("is-torn");
        top.style.transform = `translate(${direction * 260}px, -140px) rotate(${direction * 38}deg)`;
        top.style.opacity = "0";
        glow.style.opacity = "0.9";
        setTimeout(() => {
          glow.style.opacity = "";
          showCard();
        }, 650);
      }

      pack.addEventListener("pointerdown", (e) => {
        if (torn) return;
        startX = e.clientX;
        dx = 0;
        pack.setPointerCapture(e.pointerId);
        pack.classList.add("is-dragging");
      });
      pack.addEventListener("pointermove", (e) => {
        if (startX === null || torn) return;
        dx = e.clientX - startX;
        top.style.transform = `translate(${dx * 0.9}px, ${-Math.min(Math.abs(dx) * 0.12, 18)}px) rotate(${dx / 14}deg)`;
        pack.style.setProperty("--tear", String(Math.min(Math.abs(dx) / (pack.offsetWidth * 0.55), 1)));
      });
      const release = () => {
        if (startX === null || torn) return;
        pack.classList.remove("is-dragging");
        const moved = Math.abs(dx);
        startX = null;
        if (moved < 8) {
          dx = 0;
          prime(); // a tap: the pack reacts and says what to do
        } else if (moved >= pack.offsetWidth * 0.55) {
          tear(dx > 0 ? 1 : -1);
        } else {
          dx = 0;
          top.style.transform = "";
          pack.style.setProperty("--tear", "0");
          if (!primed) prime();
        }
      };
      pack.addEventListener("pointerup", release);
      pack.addEventListener("pointercancel", release);
      // keyboard: Enter or Space pokes the pack, then opens it
      pack.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          if (!primed && e.key !== "ArrowRight" && e.key !== "ArrowLeft") prime();
          else tear(e.key === "ArrowLeft" ? -1 : 1);
        }
      });
      pack.focus();
    }

    function showCard() {
      flipped = false;
      const entry = cards[index];
      const rarity = packRarity(entry);
      glow.className = "pack-glow";
      glow.style.setProperty("--pack-color", PACK_COLORS[rarity]);
      body.innerHTML = `
        <p class="pack-count">Card ${index + 1} of ${cards.length}</p>
        <button type="button" class="pack-card" aria-label="Tap to reveal the card">
          <span class="pack-flip">
            <span class="pack-face pack-back"><span class="pack-back-mark">?</span><span class="pack-back-text">Tap to open</span></span>
            <span class="pack-face pack-front"></span>
          </span>
        </button>
        <p class="pack-rarity" aria-live="polite">&nbsp;</p>
        <button type="button" class="pack-next" hidden></button>`;

      const front = body.querySelector(".pack-front");
      const cardEl = renderCard(entry, () => {}, () => {});
      const actions = cardEl.querySelector(".card-actions");
      if (actions) actions.remove();
      front.appendChild(cardEl);

      const cardButton = body.querySelector(".pack-card");
      const next = body.querySelector(".pack-next");
      let taps = 0;
      const tapsNeeded = PACK_TAPS[rarity] || 1;
      const hint = body.querySelector(".pack-back-text");
      cardButton.addEventListener("click", (e) => {
        if (flipped || e.target.closest(".card-play-audio")) return;
        taps++;
        if (taps < tapsNeeded) {
          // not open yet: shake harder and glow brighter with every tap
          const power = taps / tapsNeeded;
          hint.textContent = taps === tapsNeeded - 1 ? "Almost there..." : "Keep tapping!";
          glow.style.setProperty("--pack-color", "#ffffff");
          glow.style.opacity = String(0.2 + power * 0.5);
          cardButton.style.setProperty("--shake", `${2 + power * 6}px`);
          cardButton.classList.remove("is-shaking");
          void cardButton.offsetWidth; // restart the animation
          cardButton.classList.add("is-shaking");
          return;
        }
        glow.style.opacity = "";
        glow.style.setProperty("--pack-color", PACK_COLORS[rarity]);
        flipped = true;
        cardButton.classList.add("is-flipped");
        cardButton.setAttribute("aria-label", `${RARITY_LABELS[rarity]} card: ${entry.word}`);
        glow.classList.add("flash");
        if (rarity === "epic" || rarity === "legendary") overlay.classList.add("is-big");
        const label = body.querySelector(".pack-rarity");
        label.textContent = RARITY_LABELS[rarity];
        label.style.color = PACK_COLORS[rarity];
        if (rarity === "legendary") burst(body.querySelector(".pack-card"));
        next.hidden = false;
        next.textContent = index === cards.length - 1 ? "See summary" : "Next card";
        next.focus();
      });
      next.addEventListener("click", () => {
        overlay.classList.remove("is-big");
        if (index === cards.length - 1) showSummary();
        else {
          index++;
          showCard();
        }
      });
      cardButton.focus();
    }

    function showSummary() {
      overlay.classList.remove("is-big");
      overlay.querySelector("[data-pack-skip]").hidden = true;
      glow.className = "pack-glow";
      glow.style.setProperty("--pack-color", "#17a596");
      const counts = {};
      cards.forEach((c) => {
        const r = packRarity(c);
        counts[r] = (counts[r] || 0) + 1;
      });
      const chips = PACK_RARITY_ORDER.filter((r) => counts[r])
        .map((r) => `<span class="pack-chip" style="--chip:${PACK_COLORS[r]}">${counts[r]} ${RARITY_LABELS[r]}</span>`)
        .join("");
      const lines = summaryLines.map((l) => `<li>${escapeHtml(l)}</li>`).join("");
      body.innerHTML = `
        <div class="pack-summary">
          <h2 class="pack-summary-title">${cards.length} new ${cards.length === 1 ? "card" : "cards"}!</h2>
          <div class="pack-chips">${chips}</div>
          ${lines ? `<ul class="pack-lines">${lines}</ul>` : ""}
          <button type="button" class="btn btn-primary btn-block pack-done">Done</button>
        </div>`;
      const done = body.querySelector(".pack-done");
      done.addEventListener("click", close);
      done.focus();
    }

    overlay.querySelector("[data-pack-skip]").addEventListener("click", showSummary);
    if (sealed) showSealed();
    else showCard();
  });
}

// A few sparkles for a legendary reveal.
function burst(anchor) {
  for (let i = 0; i < 14; i++) {
    const spark = document.createElement("i");
    spark.className = "pack-spark";
    const angle = (Math.PI * 2 * i) / 14;
    spark.style.setProperty("--dx", `${Math.cos(angle) * 130}px`);
    spark.style.setProperty("--dy", `${Math.sin(angle) * 130}px`);
    anchor.appendChild(spark);
    setTimeout(() => spark.remove(), 900);
  }
}