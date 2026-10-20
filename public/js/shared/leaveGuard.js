// "Leave now?" warning, shared by the three mini-games and the NPC challenges.
// Leaving a round part-way throws the round away: the player starts again next time.
//   LeaveGuard.confirm()  ->  Promise<boolean>  (true = leave, false = keep playing)
// Add <script src="../../js/shared/leaveGuard.js"></script> to every page that uses it. If it is missing the
// games fall back to the browser's own confirm box, so nothing breaks.
const LeaveGuard = (function () {
  const TITLE = "Leave this round?";
  const TEXT = "All your progress will be lost and you will start again.";

  function addStyle() {
    if (document.getElementById("leave-guard-style")) return;
    const s = document.createElement("style");
    s.id = "leave-guard-style";
    s.textContent = `
.lg-overlay { position: fixed; inset: 0; z-index: 200; display: grid; place-items: center; padding: 20px; background: rgba(24, 35, 58, 0.55); animation: lg-fade 0.18s ease-out; }
.lg-card { width: 100%; max-width: 340px; padding: 24px 22px 18px; text-align: center; background: var(--white, var(--surface, #fff)); border: 1px solid var(--line, transparent); border-radius: 22px; animation: lg-pop 0.2s ease-out; box-shadow: 0 20px 50px rgba(24, 35, 58, 0.28); font-family: var(--font-ui, "Manrope", system-ui, sans-serif); }
.lg-card h2 { margin: 0 0 8px; font-size: 20px; font-weight: 800; color: var(--ink, #18233a); }
.lg-card p { margin: 0 0 18px; font-size: 14px; line-height: 1.45; font-weight: 500; color: var(--muted, #5b6783); }
.lg-keep { display: block; width: 100%; min-height: 50px; border: 0; border-radius: 25px; background: var(--amber, #f2a93b); color: var(--ink, #18233a); font: 800 16px var(--font-ui, system-ui); cursor: pointer; }
.lg-leave { display: block; width: 100%; margin-top: 6px; padding: 12px; border: 0; background: none; color: var(--danger, #b3261e); font: 700 14px var(--font-ui, system-ui); cursor: pointer; }
@keyframes lg-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes lg-pop { from { opacity: 0; transform: translateY(10px) scale(0.97); } to { opacity: 1; transform: none; } }`;
    document.head.appendChild(s);
  }

  function confirm(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      addStyle();
      const overlay = document.createElement("div");
      overlay.className = "lg-overlay";
      const card = document.createElement("div");
      card.className = "lg-card";
      card.setAttribute("role", "alertdialog");
      card.setAttribute("aria-modal", "true");
      card.innerHTML = '<h2></h2><p></p><button type="button" class="lg-keep"></button><button type="button" class="lg-leave"></button>';
      card.querySelector("h2").textContent = opts.title || TITLE;
      card.querySelector("p").textContent = opts.text || TEXT;
      const keep = card.querySelector(".lg-keep");
      const leave = card.querySelector(".lg-leave");
      keep.textContent = opts.keepLabel || "Keep playing";
      leave.textContent = opts.leaveLabel || "Leave";
      overlay.appendChild(card);

      function done(answer) {
        document.removeEventListener("keydown", onKey, true);
        overlay.remove();
        resolve(answer);
      }
      function onKey(e) { if (e.key === "Escape") { e.stopPropagation(); done(false); } }
      keep.addEventListener("click", function () { done(false); });
      leave.addEventListener("click", function () { done(true); });
      overlay.addEventListener("click", function (e) { if (e.target === overlay) done(false); });
      document.addEventListener("keydown", onKey, true);
      document.body.appendChild(overlay);
      keep.focus();
    });
  }

  return { confirm };
})();