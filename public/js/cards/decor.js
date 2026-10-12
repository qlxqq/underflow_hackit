// A small Singapore street scene (HDB blocks, a palm, a bus-stop sign and a
// hawker stall) for the top of the capture and words-found screens.
//
//   getStreetStrip(language) - the scene. The sky takes the language's
//     colour, and the stall's sign is written in that language: Chinese,
//     Malay or Tamil.
//
// Colours that change with the language come from the CSS variables
// --tint, --blob, --awning and --board, so they follow the language
// automatically. They match the three stalls on the Journey map.

const STALL_SIGNS = {
  zh: { text: "鸡饭", font: "'Noto Sans SC', 'Noto Sans CJK SC', sans-serif", size: 11 },
  ms: { text: "Satay", font: "'Manrope', sans-serif", size: 10 },
  ta: { text: "தோசை", font: "'Noto Sans Tamil', sans-serif", size: 10 },
};

function getStreetStrip(language = "zh") {
  const sign = STALL_SIGNS[language] || STALL_SIGNS.zh;
  let o = `<svg class="street-svg" viewBox="0 0 390 112" preserveAspectRatio="xMidYMax slice" aria-hidden="true">`;
  o += `<rect width="390" height="112" style="fill: var(--tint)" />`;
  o += `<circle cx="344" cy="26" r="46" style="fill: var(--blob)" opacity="0.8" />`;

  // far HDB blocks, pale
  [[10, 36, 46, 62], [58, 54, 34, 44], [286, 44, 38, 54]].forEach(([x, y, w, h]) => {
    o += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#c9d9e8" /><rect x="${x}" y="${y}" width="${(w * 0.12).toFixed(1)}" height="${h}" fill="#b4c8dc" />`;
    for (let r = 0; r < Math.floor((h - 10) / 11); r++) for (let c = 0; c < Math.floor((w - 10) / 11); c++) o += `<rect x="${x + 7 + c * 11}" y="${y + 6 + r * 11}" width="6" height="6" rx="1.2" fill="#eaf2f9" />`;
  });

  // ground
  o += `<rect y="94" width="390" height="18" fill="#e8e3d5" /><rect y="94" width="390" height="2.5" fill="#1c2541" opacity="0.06" />`;

  // palm
  o += `<path d="M118 100 Q121 76 124 56" fill="none" stroke="#9a7c58" stroke-width="4" stroke-linecap="round" />`;
  [-165, -135, -105, -75, -45, -15, 20, 160].forEach((a, i) => {
    o += `<path transform="translate(124 56) rotate(${a})" d="M0 0 Q9 -6 18 4 Q9 -1 0 0 Z" fill="${i % 2 ? "#3f8f5c" : "#56a870"}" />`;
  });

  // bus-stop sign: a blue plate with a bus on it
  o += `<rect x="190" y="52" width="3" height="46" fill="#6e7d96" /><rect x="178" y="34" width="27" height="25" rx="4" fill="#2f6fd6" />`;
  o += `<rect x="183" y="40" width="17" height="11" rx="2.5" fill="#ffffff" /><rect x="185" y="42" width="5" height="4" rx="1" fill="#2f6fd6" /><rect x="192" y="42" width="5" height="4" rx="1" fill="#2f6fd6" />`;
  o += `<circle cx="187" cy="53" r="1.8" fill="#ffffff" /><circle cx="196" cy="53" r="1.8" fill="#ffffff" />`;

  // hawker stall with a sign in the chosen language
  const x0 = 236, w = 64, top = 60;
  o += `<rect x="${x0}" y="${top}" width="${w}" height="38" fill="#ead2a8" />`;
  for (let i = 0; i < 6; i++) {
    const col = i % 2 ? "fill: #f7ebd2" : "fill: var(--awning)", sx = x0 + i * (w / 6), sw = w / 6;
    o += `<rect x="${sx.toFixed(1)}" y="${top}" width="${sw.toFixed(1)}" height="10" style="${col}" /><path d="M${sx.toFixed(1)} ${top + 10} a${(sw / 2).toFixed(1)} ${(sw / 2).toFixed(1)} 0 0 0 ${sw.toFixed(1)} 0z" style="${col}" />`;
  }
  o += `<rect x="${x0 + 5}" y="${top + 24}" width="${w - 10}" height="7" fill="#f2a93b" opacity="0.85" /><rect x="${x0 + 3}" y="${top + 30}" width="${w - 6}" height="8" fill="#8a5a3c" />`;
  o += `<rect x="${x0 + 4}" y="${top - 14}" width="${w - 8}" height="13" rx="3" style="fill: var(--board)" />`;
  o += `<text x="${x0 + w / 2}" y="${top - 14 + 9.4}" text-anchor="middle" font-family="${sign.font}" font-weight="700" font-size="${sign.size}" fill="#ffe08a">${sign.text}</text>`;

  // a small tree
  o += `<rect x="352" y="80" width="3" height="16" fill="#8a6a4a" /><circle cx="353.5" cy="74" r="11" fill="#4a9565" /><circle cx="353.5" cy="71" r="8.5" fill="#5fae7a" />`;
  return o + `</svg>`;
}