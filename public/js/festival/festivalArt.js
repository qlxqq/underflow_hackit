// Cartoon pictures for the festival words: a found word shows its picture on a Halloween night scene.
// Flat shapes in the same style as the island art. Each picture is drawn in a 240 x 130 box.
// To add a word: add a line to FESTIVAL_ART with the word and a function that returns the shapes.

const FESTIVAL_ART = (() => {
  const INK = "#18233a", ORANGE = "#f2893b", ORANGE_D = "#d9691f", GOLD = "#ffd35c", PURPLE = "#7a5cc4", NIGHT_A = "#3a2c78", NIGHT_B = "#1d1745";

  // the night sky every picture stands on
  const scene = (inner, id) => `
<svg viewBox="0 0 240 130" xmlns="http://www.w3.org/2000/svg" role="img" preserveAspectRatio="xMidYMid slice">
  <defs><linearGradient id="fa-sky-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${NIGHT_A}"/><stop offset="1" stop-color="${NIGHT_B}"/></linearGradient></defs>
  <rect width="240" height="130" fill="url(#fa-sky-${id})"/>
  <g fill="#fff6c9" opacity="0.9"><circle cx="22" cy="20" r="1.6"/><circle cx="52" cy="40" r="1.2"/><circle cx="84" cy="14" r="1.4"/><circle cx="176" cy="22" r="1.3"/><circle cx="214" cy="60" r="1.5"/><circle cx="30" cy="84" r="1.2"/><circle cx="206" cy="104" r="1.2"/></g>
  <circle cx="204" cy="30" r="17" fill="#ffe9a8"/><circle cx="198" cy="26" r="3.4" fill="#f0d27e"/><circle cx="210" cy="36" r="2.4" fill="#f0d27e"/>
  <ellipse cx="120" cy="122" rx="96" ry="10" fill="#120e30"/>
  ${inner}
</svg>`;

  const pumpkinShapes = (cx, cy, k = 1) => `
  <g transform="translate(${cx} ${cy}) scale(${k})">
    <ellipse cx="0" cy="8" rx="46" ry="35" fill="${ORANGE}"/>
    <path d="M-16 -26 C-34 -4 -34 22 -14 42 M16 -26 C34 -4 34 22 14 42" fill="none" stroke="${ORANGE_D}" stroke-width="4" stroke-linecap="round"/>
    <path d="M0 -27 C-3 41 -3 41 0 43" fill="none" stroke="${ORANGE_D}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
    <rect x="-5" y="-38" width="10" height="14" rx="3" fill="#4a9565"/><path d="M5 -33 q14 -2 16 8" fill="none" stroke="#4a9565" stroke-width="3" stroke-linecap="round"/>
    <path d="M-28 4 l10 -14 l10 14z M8 4 l10 -14 l10 14z" fill="${INK}"/>
    <path d="M-5 14 l5 -8 l5 8z" fill="${INK}"/>
    <path d="M-26 24 l8 8 l8 -6 l8 8 l8 -8 l8 6 l8 -8 l4 -2 c-4 16 -48 16 -52 2z" fill="${INK}"/>
    <path d="M-20 24 l5 5 l5 -4 l5 5 l5 -5 l5 4 l5 -5 l4 1 c-3 9 -29 9 -34 -1z" fill="${GOLD}"/>
    <path d="M-28 4 l10 -14 l10 14z M8 4 l10 -14 l10 14z" fill="${GOLD}" opacity="0.55" transform="scale(0.55) translate(-10 6)"/>
  </g>`;

  const ART = {
    // pumpkin
    "南瓜": () => scene(pumpkinShapes(120, 66), "pumpkin"),
    // Halloween: a lit pumpkin with a bat
    "万圣节": () => scene(`${pumpkinShapes(112, 70, 0.9)}
      <g transform="translate(176 38) scale(0.55)" fill="#2a1f55"><path d="M0 8 C-14 -8 -34 -8 -46 4 C-38 4 -34 10 -32 16 C-26 12 -20 14 -16 22 C-10 16 -6 18 0 26 C6 18 10 16 16 22 C20 14 26 12 32 16 C34 10 38 4 46 4 C34 -8 14 -8 0 8z"/></g>`, "halloween"),
    // ghost
    "鬼": () => scene(`
      <path d="M80 104 V62 a40 40 0 0 1 80 0 V104 q-10 -9 -20 0 q-10 9 -20 0 q-10 -9 -20 0 q-10 9 -20 0z" fill="#ffffff"/>
      <path d="M140 38 a40 40 0 0 1 20 24 V104 q-10 -9 -20 0z" fill="#dfe6f2"/>
      <ellipse cx="105" cy="62" rx="7" ry="10" fill="${INK}"/><ellipse cx="135" cy="62" rx="7" ry="10" fill="${INK}"/>
      <ellipse cx="120" cy="82" rx="7" ry="9" fill="${INK}"/><circle cx="94" cy="76" r="5" fill="#f6a5c0" opacity="0.8"/><circle cx="146" cy="76" r="5" fill="#f6a5c0" opacity="0.8"/>
      <circle cx="106" cy="58" r="2.4" fill="#fff"/><circle cx="136" cy="58" r="2.4" fill="#fff"/>`, "ghost"),
    // candy
    "糖果": () => scene(`
      <polygon points="92,72 62,52 62,92" fill="#ffd35c"/><polygon points="148,72 178,52 178,92" fill="#ffd35c"/>
      <polygon points="92,72 62,60 62,84" fill="#f2b92f"/><polygon points="148,72 178,60 178,84" fill="#f2b92f"/>
      <ellipse cx="120" cy="72" rx="34" ry="24" fill="#f6a5c0"/>
      <path d="M100 52 q-6 20 0 40 M120 48 q-5 24 0 48 M140 52 q6 20 0 40" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.9"/>
      <ellipse cx="108" cy="62" rx="9" ry="4" fill="#fff" opacity="0.55" transform="rotate(-20 108 62)"/>`, "candy"),
    // bat
    "蝙蝠": () => scene(`
      <path d="M120 72 C102 40 70 40 46 62 C60 60 68 66 72 76 C80 70 90 72 96 82 C104 74 112 78 120 90z" fill="#4a3a8a"/>
      <path d="M120 72 C138 40 170 40 194 62 C180 60 172 66 168 76 C160 70 150 72 144 82 C136 74 128 78 120 90z" fill="#4a3a8a"/>
      <path d="M72 76 C84 62 98 62 108 72 M168 76 C156 62 142 62 132 72" fill="none" stroke="#7a68c4" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="120" cy="76" rx="15" ry="19" fill="#2a1f55" stroke="#7a68c4" stroke-width="1.6"/><circle cx="120" cy="58" r="14" fill="#2a1f55" stroke="#7a68c4" stroke-width="1.6"/>
      <polygon points="108,50 104,34 116,46" fill="#2a1f55" stroke="#7a68c4" stroke-width="1.4"/><polygon points="132,50 136,34 124,46" fill="#2a1f55" stroke="#7a68c4" stroke-width="1.4"/>
      <circle cx="114" cy="57" r="4" fill="${GOLD}"/><circle cx="126" cy="57" r="4" fill="${GOLD}"/><circle cx="114" cy="57" r="1.6" fill="${INK}"/><circle cx="126" cy="57" r="1.6" fill="${INK}"/>
      <polygon points="115,66 118,73 121,66" fill="#fff"/><polygon points="120,66 123,73 126,66" fill="#fff"/>`, "bat"),
    // spider
    "蜘蛛": () => scene(`
      <line x1="120" y1="0" x2="120" y2="50" stroke="#e8e4ff" stroke-width="2"/>
      <g fill="none" stroke="#6a56b0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M104 70 L80 56 L64 74"/><path d="M103 76 L74 80 L62 98"/><path d="M104 82 L82 102 L72 114"/><path d="M107 88 L98 108 L96 118"/>
        <path d="M136 70 L160 56 L176 74"/><path d="M137 76 L166 80 L178 98"/><path d="M136 82 L158 102 L168 114"/><path d="M133 88 L142 108 L144 118"/>
      </g>
      <ellipse cx="120" cy="82" rx="24" ry="26" fill="#2a1f55" stroke="#8470c9" stroke-width="2"/><circle cx="120" cy="58" r="15" fill="#3a2c78" stroke="#8470c9" stroke-width="2"/>
      <path d="M114 78 l6 8 l6 -8 l-6 -8z" fill="#e0463a"/>
      <circle cx="113" cy="56" r="5.5" fill="#fff"/><circle cx="127" cy="56" r="5.5" fill="#fff"/><circle cx="114" cy="57" r="2.6" fill="${INK}"/><circle cx="126" cy="57" r="2.6" fill="${INK}"/>`, "spider"),
    // witch
    "女巫": () => scene(`
      <path d="M92 50 C90 76 88 92 90 104 C106 114 134 114 150 104 C152 92 150 76 148 50z" fill="#8fd18a" opacity="0"/>
      <circle cx="120" cy="86" r="27" fill="#8fd18a"/>
      <path d="M92 80 q-10 14 -4 30 M148 80 q10 14 4 30" fill="none" stroke="${ORANGE}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="110" cy="84" r="3.6" fill="${INK}"/><circle cx="130" cy="84" r="3.6" fill="${INK}"/>
      <path d="M118 90 q-3 8 3 8" fill="none" stroke="#5fae7a" stroke-width="3" stroke-linecap="round"/>
      <path d="M106 99 q14 10 28 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      <path d="M86 64 L112 10 Q118 4 124 12 L156 64z" fill="${PURPLE}"/><path d="M130 14 L156 64 L134 64z" fill="#5f45a8"/>
      <ellipse cx="120" cy="64" rx="46" ry="10" fill="#4a2f7a"/><rect x="100" y="46" width="40" height="9" fill="#2a1f55"/><rect x="113" y="45" width="14" height="11" rx="2" fill="${GOLD}"/><rect x="117" y="48" width="6" height="5" fill="#2a1f55"/>`, "witch"),
    // skeleton (a skull on crossed bones)
    "骷髅": () => scene(`
      <g stroke="#f4ecd8" stroke-width="9" stroke-linecap="round"><line x1="76" y1="108" x2="164" y2="76"/><line x1="76" y1="76" x2="164" y2="108"/></g>
      <g fill="#f4ecd8"><circle cx="74" cy="108" r="6"/><circle cx="80" cy="112" r="6"/><circle cx="166" cy="108" r="6"/><circle cx="160" cy="112" r="6"/><circle cx="74" cy="76" r="6"/><circle cx="80" cy="72" r="6"/><circle cx="166" cy="76" r="6"/><circle cx="160" cy="72" r="6"/></g>
      <circle cx="120" cy="54" r="32" fill="#fbf5e6"/><rect x="100" y="72" width="40" height="26" rx="8" fill="#fbf5e6"/>
      <ellipse cx="108" cy="54" rx="9" ry="11" fill="${INK}"/><ellipse cx="132" cy="54" rx="9" ry="11" fill="${INK}"/>
      <path d="M120 64 l-5 10 h10z" fill="${INK}"/>
      <path d="M108 86 v10 M116 86 v11 M124 86 v11 M132 86 v10" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M144 38 a32 32 0 0 1 4 24" fill="none" stroke="#e1d6bb" stroke-width="5" stroke-linecap="round"/>`, "skull"),
    // mask
    "面具": () => scene(`
      <path d="M50 64 Q120 28 190 64 Q184 104 150 98 Q132 96 120 84 Q108 96 90 98 Q56 104 50 64z" fill="${PURPLE}"/>
      <path d="M50 64 Q120 28 190 64" fill="none" stroke="${GOLD}" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="90" cy="70" rx="17" ry="11" fill="${INK}" transform="rotate(12 90 70)"/><ellipse cx="150" cy="70" rx="17" ry="11" fill="${INK}" transform="rotate(-12 150 70)"/>
      <path d="M70 52 q8 -8 18 -4 M170 52 q-8 -8 -18 -4 M112 50 q8 -6 16 0" fill="none" stroke="${GOLD}" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="120" cy="64" r="4" fill="${GOLD}"/>
      <path d="M50 64 q-14 10 -16 30 M190 64 q14 10 16 30" fill="none" stroke="#e0463a" stroke-width="4" stroke-linecap="round"/>`, "mask"),
    // broom
    "扫帚": () => scene(`
      <g transform="translate(6 -12) rotate(-28 120 74)">
        <rect x="52" y="70" width="150" height="8" rx="4" fill="#8a5a3c"/><rect x="52" y="70" width="150" height="3" rx="2" fill="#a8774f"/>
        <polygon points="56,60 22,50 10,74 22,98 56,88" fill="#e0b04a"/>
        <path d="M18 56 L56 66 M14 68 L56 74 M14 80 L56 80 M18 92 L56 86" stroke="#b8862b" stroke-width="2.6" stroke-linecap="round"/>
        <rect x="52" y="60" width="9" height="28" rx="3" fill="#8a5a3c"/>
      </g>`, "broom"),
    // candle
    "蜡烛": () => scene(`
      <circle cx="120" cy="38" r="26" fill="${GOLD}" opacity="0.22"/>
      <ellipse cx="120" cy="108" rx="34" ry="7" fill="#59658a"/>
      <rect x="102" y="56" width="36" height="52" rx="6" fill="#fbf3e2"/><rect x="126" y="56" width="12" height="52" rx="5" fill="#e8dcc2"/>
      <path d="M102 62 q4 18 9 0 M118 62 q3 24 8 0" fill="#fbf3e2" stroke="#fbf3e2" stroke-width="3" stroke-linecap="round"/>
      <path d="M120 20 C110 36 106 46 120 56 C134 46 130 36 120 20z" fill="${ORANGE}"/><path d="M120 32 C114 42 113 48 120 54 C127 48 126 42 120 32z" fill="${GOLD}"/>
      <line x1="120" y1="54" x2="120" y2="60" stroke="${INK}" stroke-width="2.5"/>`, "candle"),
    // vampire
    "吸血鬼": () => scene(`
      <polygon points="80,126 90,96 120,86 150,96 160,126" fill="#2a1f55"/><polygon points="90,96 120,112 118,126 80,126" fill="#e0463a"/><polygon points="150,96 120,112 122,126 160,126" fill="#c23a30"/>
      <circle cx="120" cy="64" r="30" fill="#f1e6ee"/>
      <path d="M90 58 C92 30 148 30 150 58 C140 52 130 48 120 58 C110 48 100 52 90 58z" fill="${INK}"/>
      <circle cx="108" cy="66" r="4.4" fill="#e0463a"/><circle cx="132" cy="66" r="4.4" fill="#e0463a"/><circle cx="108" cy="66" r="1.6" fill="${INK}"/><circle cx="132" cy="66" r="1.6" fill="${INK}"/>
      <path d="M100 58 l10 4 M140 58 l-10 4" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      <path d="M106 80 q14 9 28 0" fill="#7a1f2b" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
      <polygon points="110,82 114,92 118,83" fill="#fff"/><polygon points="122,83 126,92 130,82" fill="#fff"/>
      <circle cx="98" cy="76" r="4.5" fill="#f6a5c0" opacity="0.7"/><circle cx="142" cy="76" r="4.5" fill="#f6a5c0" opacity="0.7"/>`, "vampire"),
  };

  // The picture for a word. A word with no picture of its own gets a lit pumpkin.
  function svgFor(word) { return (ART[word] || ART["南瓜"])(); }
  return { svgFor, has: (word) => !!ART[word], words: () => Object.keys(ART) };
})();