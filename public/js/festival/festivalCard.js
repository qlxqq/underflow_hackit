// The festival treasure-hunt card: one card for each word found on a hunt. It is NOT a captured card and NOT an island card:
// it has no rarity tier. Instead it carries a label for the festival it came from (for example a purple "Halloween" tag).
// It cannot be gifted or deleted. Used by the Festival page (the reveal) and the Collection (the Festival albums).
//
// FESTIVAL_CARD.info(eventId)     -> { label, color, soft } for that festival
// FESTIVAL_CARD.cardEl(card, opt) -> the card as an element. card = { event_id, word, pinyin, meaning, usage_count, evolution_stage }
//                                    opt.practise = true adds the Practise button
// Needs festivalArt.js (the picture) and festivalCard.css.

const FESTIVAL_CARD = (() => {
  // One colour for each festival. A new festival only needs a line here (it falls back to purple).
  const EVENTS = {
    halloween: { label: "Halloween", color: "#6a35c9", soft: "#efe6fb" },
    cny2027: { label: "Chinese New Year", color: "#c8302b", soft: "#fde8e6" },
    dragonboat2027: { label: "Dragon Boat", color: "#1f8a5b", soft: "#e2f5ec" },
    midautumn2027: { label: "Mid-Autumn", color: "#b8650a", soft: "#fff1d6" },
  };
  const STAGES = ["Caught", "Trained", "Mastered"];
  const USES_FOR_MASTER = 3;   // 1 practice = Trained, 3 = Mastered

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function info(eventId, name) {
    return EVENTS[eventId] || { label: name || "Festival", color: "#6a35c9", soft: "#efe6fb" };
  }
  function stageOf(card) {
    const uses = Number(card.usage_count) || 0;
    return Math.min(Math.max(Number(card.evolution_stage) || 0, uses >= USES_FOR_MASTER ? 2 : uses >= 1 ? 1 : 0), 2);
  }
  function art(word) { return typeof FESTIVAL_ART !== "undefined" ? FESTIVAL_ART.svgFor(word) : ""; }

  function html(card, opt) {
    const o = opt || {};
    const c = info(card.event_id, card.event_name);
    const st = stageOf(card);
    const uses = Number(card.usage_count) || 0;
    const pips = [0, 1, 2].map((i) => `<i class="${st >= i ? "on" : ""}"></i>`).join("");
    return `
    <article class="fcard stage-${st}" data-fest-word="${esc(card.word)}" style="--f:${c.color};--f-soft:${c.soft}">
      <div class="fcard-top"><span class="fcard-tag"><i aria-hidden="true"></i>${esc(c.label)}</span></div>
      <div class="fcard-art">${art(card.word)}</div>
      <div class="fcard-word" lang="zh-Hans">${esc(card.word)}</div>
      <div class="fcard-py">${esc(card.pinyin)}</div>
      <div class="fcard-meaning">${esc(card.meaning)}</div>
      <div class="fcard-progress"><span class="fcard-pips" aria-hidden="true">${pips}</span><span>${STAGES[st]}</span></div>
      <div class="fcard-usage">Used ${uses} time${uses === 1 ? "" : "s"}</div>
      ${o.practise ? `<div class="fcard-actions"><button type="button" class="fcard-practise" data-fest-practise="${esc(card.event_id)}|${esc(card.word)}">Practise</button></div>` : ""}
    </article>`;
  }
  function cardEl(card, opt) {
    const d = document.createElement("div");
    d.innerHTML = html(card, opt).trim();
    return d.firstElementChild;
  }
  // The festival badge: a medal in the festival's colour. Master (every card mastered) is the shiny gold one.
  function medal(eventId, master) {
    const c = info(eventId);
    const ribbonA = c.color, ribbonB = `color-mix(in srgb, ${c.color} 70%, #000)`;
    if (master) {
      return `<svg viewBox="0 0 96 112" aria-hidden="true"><path d="M30 70L20 106L34 98L42 110L52 72z" fill="${ribbonA}"/><path d="M66 70L76 106L62 98L54 110L44 72z" fill="${ribbonB}"/><circle cx="48" cy="46" r="44" fill="#f2a93b"/><circle cx="48" cy="46" r="37" fill="#fff4c2"/><circle cx="48" cy="46" r="33" fill="#ffe28a"/><path d="M48 24l6.5 14 15 1.6-11.2 10 3.2 14.8L48 56l-13.5 8.4 3.2-14.8-11.2-10 15-1.6z" fill="${c.color}"/><circle cx="26" cy="22" r="3" fill="#fff" opacity=".8"/><circle cx="72" cy="30" r="2" fill="#fff" opacity=".8"/></svg>`;
    }
    return `<svg viewBox="0 0 96 112" aria-hidden="true"><path d="M30 70L20 106L34 98L42 110L52 72z" fill="${ribbonA}"/><path d="M66 70L76 106L62 98L54 110L44 72z" fill="${ribbonB}"/><circle cx="48" cy="46" r="42" fill="${c.color}"/><circle cx="48" cy="46" r="36" fill="${c.soft}"/><circle cx="48" cy="46" r="31" fill="#fff"/><path d="M48 24l6.5 14 15 1.6-11.2 10 3.2 14.8L48 56l-13.5 8.4 3.2-14.8-11.2-10 15-1.6z" fill="${c.color}"/></svg>`;
  }
  return { info, html, cardEl, stageOf, medal, STAGES, USES_FOR_MASTER, esc };
})();