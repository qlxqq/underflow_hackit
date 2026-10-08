// Card pictures (46 of them). Each word shows a small illustration that fits what it
// means (a bus for "bus", a kopi cup for "coffee", an HDB block for "flat").
// They are drawn as inline SVG, so there are no image files or network
// requests, and they can be repeated freely on one page.
//
// Which picture a word gets:
//   1. entry.art_svg, a picture Claude drew for this word (cleaned by
//      sanitizeArt below before it is shown).
//   2. entry.theme, if it is one of THEMES below (chosen by the meaning
//      lookup, the AI call).
//   3. otherwise, a match on the English meaning (WORD_THEMES below).
//   4. otherwise, a general "sign" picture.

const ART = {
  generic:
    `<rect x="33" y="40" width="6" height="24" fill="#7f94b0" /><rect x="10" y="10" width="52" height="34" rx="7" fill="#a9bad0" />` +
    `<rect x="12.5" y="12.5" width="47" height="29" rx="5" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.6" />` +
    `<path d="M20 21h32M20 28h22M20 35h28" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round" />`,

  food:
    `<path d="M30 30 L47 8 M37 31 L55 12" stroke="#8a5a3c" stroke-width="2.6" stroke-linecap="round" />` +
    `<path d="M10 36h52a26 24 0 0 1-52 0z" fill="#d9534a" /><path d="M16 46h40a20 14 0 0 1-40 0z" fill="#c23a30" opacity="0.5" />` +
    `<ellipse cx="36" cy="36" rx="26" ry="6.5" fill="#f7ebd2" />` +
    `<path d="M14 36q4-6 8 0t8 0t8 0t8 0t8 0" fill="none" stroke="#f2c14e" stroke-width="2.6" stroke-linecap="round" />` +
    `<circle cx="27" cy="34" r="4.4" fill="#ffffff" /><circle cx="27" cy="34" r="2.2" fill="#f2a93b" /><circle cx="46" cy="34" r="3" fill="#7cc794" />`,

  drink:
    `<ellipse cx="34" cy="58" rx="25" ry="5.5" fill="#d8cdb8" />` +
    `<path d="M13 28h40v12a20 16 0 0 1-40 0z" fill="#ffffff" stroke="#e1d5bd" stroke-width="2" />` +
    `<ellipse cx="33" cy="28" rx="20" ry="5.5" fill="#6b3f1d" /><ellipse cx="28" cy="27" rx="7" ry="1.8" fill="#a8703d" opacity="0.8" />` +
    `<path d="M53 33a8.5 8.5 0 0 1 0 17" fill="none" stroke="#e1d5bd" stroke-width="5" stroke-linecap="round" />` +
    `<path d="M24 20q-4-6 0-12M34 20q-4-6 0-12M44 20q-4-6 0-12" fill="none" stroke="#c4cedb" stroke-width="3" stroke-linecap="round" />`,

  stall:
    `<rect x="9" y="26" width="54" height="36" fill="#ead2a8" /><rect x="14" y="5" width="44" height="10" rx="2.5" fill="#b8322a" />` +
    `<rect x="17" y="7.5" width="38" height="5" rx="1.5" fill="#ffe08a" opacity="0.85" />` +
    [0, 1, 2, 3, 4, 5].map((i) => `<rect x="${9 + i * 9}" y="15" width="9" height="12" fill="${i % 2 ? "#f7ebd2" : "#d9534a"}" /><path d="M${9 + i * 9} 27a4.5 4.5 0 0 0 9 0z" fill="${i % 2 ? "#f7ebd2" : "#d9534a"}" />`).join("") +
    `<rect x="13" y="38" width="46" height="8" fill="#f2a93b" opacity="0.85" /><rect x="11" y="46" width="50" height="16" fill="#8a5a3c" /><rect x="11" y="45" width="50" height="3" rx="1" fill="#c99a62" />` +
    `<ellipse cx="22" cy="36" rx="3.6" ry="5" fill="#c4742a" /><ellipse cx="32" cy="36" rx="3.6" ry="5" fill="#c4742a" />`,

  bus:
    `<ellipse cx="36" cy="57" rx="30" ry="3.5" fill="#1c2541" opacity="0.12" />` +
    `<rect x="6" y="16" width="60" height="36" rx="7" fill="#f6f6f3" /><rect x="6" y="36" width="60" height="5" fill="#d9402f" /><rect x="6" y="47" width="60" height="5" fill="#e3e3de" />` +
    [0, 1, 2, 3].map((i) => `<rect x="${11 + i * 13}" y="21" width="9" height="10" rx="2" fill="#3b4a63" />`).join("") +
    `<rect x="54" y="21" width="8" height="10" rx="2" fill="#3b4a63" /><rect x="40" y="38" width="10" height="14" rx="1.5" fill="#aeb9c6" />` +
    `<rect x="48" y="11" width="16" height="5" rx="1.5" fill="#1c2541" /><path d="M51 13.5h4M57 13.5h4" stroke="#ffb347" stroke-width="1.6" stroke-linecap="round" />` +
    `<circle cx="20" cy="52" r="6.5" fill="#2f3b52" /><circle cx="20" cy="52" r="2.6" fill="#aeb9c6" /><circle cx="52" cy="52" r="6.5" fill="#2f3b52" /><circle cx="52" cy="52" r="2.6" fill="#aeb9c6" />`,

  taxi:
    `<ellipse cx="36" cy="55" rx="29" ry="3.5" fill="#1c2541" opacity="0.12" />` +
    `<rect x="6" y="34" width="60" height="18" rx="6" fill="#2e6fd8" /><polygon points="17,34 26,18 48,18 57,34" fill="#2e6fd8" />` +
    `<polygon points="21,32 28,21 35,21 35,32" fill="#cfe6fb" /><polygon points="38,32 38,21 46,21 53,32" fill="#cfe6fb" />` +
    `<rect x="28" y="11" width="16" height="7" rx="2" fill="#ffd166" /><path d="M31 14.5h10" stroke="#b8860b" stroke-width="1.6" stroke-linecap="round" />` +
    `<rect x="12" y="41" width="48" height="3" fill="#ffffff" /><circle cx="19" cy="52" r="6.5" fill="#2f3b52" /><circle cx="19" cy="52" r="2.6" fill="#aeb9c6" /><circle cx="53" cy="52" r="6.5" fill="#2f3b52" /><circle cx="53" cy="52" r="2.6" fill="#aeb9c6" />` +
    `<circle cx="65" cy="42" r="2.2" fill="#ffd166" />`,

  train:
    `<rect x="2" y="50" width="68" height="6" fill="#aeb9c6" /><rect x="14" y="56" width="8" height="12" fill="#c3ccd7" /><rect x="50" y="56" width="8" height="12" fill="#c3ccd7" />` +
    `<rect x="5" y="20" width="62" height="30" rx="11" fill="#f2f5f8" stroke="#c9d3de" stroke-width="2" />` +
    `<rect x="7" y="38" width="58" height="5" fill="#d42e12" />` +
    [0, 1, 2, 3].map((i) => `<rect x="${12 + i * 13}" y="25" width="9" height="9" rx="2" fill="#3b4a63" />`).join("") +
    `<circle cx="61" cy="45" r="1.8" fill="#ffd166" />`,

  card:
    `<g transform="rotate(-9 34 38)"><rect x="8" y="20" width="44" height="30" rx="6" fill="#2f6fd6" /><rect x="8" y="27" width="44" height="6" fill="#18233a" opacity="0.35" />` +
    `<rect x="14" y="37" width="10" height="8" rx="1.8" fill="#ffd27a" /><path d="M14 41h10M19 37v8" stroke="#e0a63a" stroke-width="1" /><rect x="32" y="41" width="14" height="3" rx="1.5" fill="#ffffff" opacity="0.6" /></g>` +
    `<path d="M54 22q9 9 0 18M60 16q14 15 0 30" fill="none" stroke="#17a596" stroke-width="3.4" stroke-linecap="round" />`,

  home:
    `<rect x="4" y="60" width="64" height="5" rx="2" fill="#cfe6cf" />` +
    `<rect x="12" y="10" width="40" height="52" fill="#b9cfe2" /><rect x="12" y="10" width="5" height="52" fill="#8faecb" opacity="0.6" /><rect x="12" y="6" width="40" height="5" fill="#8db3d4" />` +
    [0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => `<rect x="${20 + c * 11}" y="${16 + r * 10}" width="7" height="7" rx="1.2" fill="#eaf4fb" />`).join("")).join("") +
    `<rect x="12" y="54" width="40" height="8" fill="#52617a" /><rect x="24" y="23" width="24" height="1.6" fill="#9a7c58" /><rect x="26" y="24.6" width="4" height="7" fill="#e0463a" /><rect x="33" y="24.6" width="4" height="9" fill="#f2a93b" /><rect x="40" y="24.6" width="4" height="6" fill="#4a6cf0" />` +
    `<rect x="54" y="30" width="15" height="32" fill="#ebcdc4" /><rect x="54" y="27" width="15" height="4" fill="#ddb3a9" />` +
    [0, 1, 2].map((r) => `<rect x="58" y="${35 + r * 8}" width="3.6" height="4.6" rx="1" fill="#fbeeea" /><rect x="63.4" y="${35 + r * 8}" width="3.6" height="4.6" rx="1" fill="#fbeeea" />`).join(""),

  lift:
    `<rect x="14" y="12" width="44" height="52" rx="5" fill="#a9bad0" /><rect x="18" y="16" width="16" height="46" fill="#cbd6e3" /><rect x="36" y="16" width="16" height="46" fill="#cbd6e3" />` +
    `<rect x="24" y="4" width="24" height="8" rx="2.5" fill="#18233a" /><polygon points="32,6 36,10 28,10" fill="#ffd166" /><polygon points="40,10 44,6 36,6" fill="#ffd166" opacity="0.5" />` +
    `<rect x="60" y="30" width="8" height="18" rx="3" fill="#7f94b0" /><polygon points="64,34 66.5,38 61.5,38" fill="#ffffff" /><polygon points="64,44 61.5,40 66.5,40" fill="#ffffff" />`,

  park:
    `<ellipse cx="36" cy="63" rx="30" ry="4" fill="#cfe6cf" />` +
    `<rect x="33" y="38" width="6" height="24" rx="2" fill="#8a6a4a" />` +
    `<circle cx="36" cy="26" r="17" fill="#4a9565" /><circle cx="26" cy="32" r="11" fill="#4a9565" /><circle cx="46" cy="32" r="11" fill="#4a9565" />` +
    `<circle cx="36" cy="22" r="13" fill="#5fae7a" /><circle cx="29" cy="28" r="8" fill="#5fae7a" /><circle cx="43" cy="28" r="8" fill="#5fae7a" /><circle cx="30" cy="18" r="6" fill="#7cc794" opacity="0.9" />` +
    `<rect x="46" y="52" width="22" height="3.4" rx="1.5" fill="#b7673f" /><rect x="46" y="46" width="22" height="3" rx="1.5" fill="#b7673f" /><rect x="49" y="55" width="3" height="8" fill="#6e7d96" /><rect x="63" y="55" width="3" height="8" fill="#6e7d96" />`,

  playground:
    `<ellipse cx="38" cy="63" rx="30" ry="4" fill="#cfe6cf" />` +
    `<rect x="10" y="22" width="4" height="40" fill="#6e7d96" /><rect x="32" y="22" width="4" height="40" fill="#6e7d96" />` +
    `<rect x="7" y="19" width="32" height="6" rx="2.5" fill="#f2a93b" /><polygon points="7,19 23,5 39,19" fill="#17a596" />` +
    `<path d="M36 25 Q56 38 62 62 L52 62 Q47 44 36 36 Z" fill="#e0463a" />` +
    `<path d="M12 28 L0 62 M16 28 L4 62" stroke="#2f6fd6" stroke-width="2.6" />` + [36, 44, 52].map((y) => `<path d="M${(12 - (y - 28) * 0.35).toFixed(1)} ${y} h7" stroke="#2f6fd6" stroke-width="2.6" />`).join(""),

  people:
    `<ellipse cx="36" cy="64" rx="30" ry="3.5" fill="#1c2541" opacity="0.1" />` +
    [[18, "#4a6cf0", "#e8b890", 40], [36, "#e0463a", "#d9a679", 34], [54, "#17a596", "#f0c9a0", 40]].map(([x, shirt, skin, top]) =>
      `<rect x="${x - 7}" y="${top + 14}" width="5" height="${62 - top - 14}" rx="2" fill="#3b4a63" /><rect x="${x + 2}" y="${top + 14}" width="5" height="${62 - top - 14}" rx="2" fill="#3b4a63" />` +
      `<rect x="${x - 9}" y="${top - 4}" width="18" height="22" rx="8" fill="${shirt}" /><circle cx="${x}" cy="${top - 11}" r="7.5" fill="${skin}" /><path d="M${x - 7.5} ${top - 12} a7.5 7.5 0 0 1 15 0z" fill="#2b2f3a" />`).join(""),

  chat:
    `<path d="M8 12h36a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H26l-9 8v-8H14a6 6 0 0 1-6-6V18a6 6 0 0 1 6-6z" fill="#a9bad0" />` +
    `<circle cx="19" cy="25" r="2.6" fill="#ffffff" /><circle cx="29" cy="25" r="2.6" fill="#ffffff" /><circle cx="39" cy="25" r="2.6" fill="#ffffff" />` +
    `<path d="M30 34h30a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6h-2v8l-9-8H30a6 6 0 0 1-6-6V40a6 6 0 0 1 6-6z" fill="#17a596" />` +
    `<path d="M33 44h26M33 50h18" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />`,

  shop:
    `<rect x="9" y="26" width="54" height="36" fill="#f3e4c8" /><rect x="14" y="6" width="44" height="9" rx="2.5" fill="#0f7a6f" />` +
    [0, 1, 2, 3, 4, 5].map((i) => `<rect x="${9 + i * 9}" y="15" width="9" height="12" fill="${i % 2 ? "#f7ebd2" : "#17a596"}" /><path d="M${9 + i * 9} 27a4.5 4.5 0 0 0 9 0z" fill="${i % 2 ? "#f7ebd2" : "#17a596"}" />`).join("") +
    `<rect x="14" y="36" width="24" height="18" rx="2" fill="#cfe6fb" /><path d="M16 38l8 0" stroke="#fff" stroke-width="2" /><rect x="43" y="36" width="14" height="26" rx="2" fill="#8a5a3c" /><circle cx="53" cy="49" r="1.4" fill="#ffd27a" />` +
    `<rect x="18" y="45" width="6" height="7" rx="1" fill="#e0463a" /><rect x="26" y="42" width="6" height="10" rx="1" fill="#f2a93b" />`,

  chess:
    `<ellipse cx="36" cy="62" rx="26" ry="4" fill="#1c2541" opacity="0.1" />` +
    `<g transform="rotate(-6 36 44)"><rect x="8" y="26" width="48" height="34" rx="3" fill="#c9b99f" />` +
    [0, 1, 2, 3, 4, 5].map((i) => [0, 1, 2, 3].map((j) => ((i + j) % 2 === 0 ? `<rect x="${8 + i * 8}" y="${26 + j * 8.5}" width="8" height="8.5" fill="#7a6a52" />` : "")).join("")).join("") + `</g>` +
    `<circle cx="38" cy="15" r="6.5" fill="#18233a" /><path d="M31 41 q1-13 7-15 q6 2 7 15z" fill="#18233a" /><rect x="28" y="41" width="20" height="5.5" rx="2.5" fill="#18233a" />`,

  cat:
    `<ellipse cx="36" cy="63" rx="24" ry="3.5" fill="#1c2541" opacity="0.1" />` +
    `<path d="M48 56 q18-2 14-26" fill="none" stroke="#e8923a" stroke-width="7" stroke-linecap="round" />` +
    `<ellipse cx="34" cy="46" rx="18" ry="18" fill="#e8923a" /><circle cx="34" cy="22" r="14" fill="#e8923a" />` +
    `<polygon points="21,16 24,3 33,12" fill="#e8923a" /><polygon points="47,16 44,3 35,12" fill="#e8923a" /><polygon points="24,13 25,7 30,11" fill="#f4b9a0" /><polygon points="44,13 43,7 38,11" fill="#f4b9a0" />` +
    `<path d="M24 36 l6 4 M44 36 l-6 4 M26 50 l7 1.6 M42 50 l-7 1.6" stroke="#c9742a" stroke-width="3" stroke-linecap="round" />` +
    `<circle cx="29" cy="22" r="2.2" fill="#18233a" /><circle cx="39" cy="22" r="2.2" fill="#18233a" /><path d="M32 27 q2 2 4 0" fill="none" stroke="#18233a" stroke-width="1.6" stroke-linecap="round" />`,

  rain:
    `<path d="M36 12V6" stroke="#6e7d96" stroke-width="3" stroke-linecap="round" />` +
    `<path d="M6 36 a30 26 0 0 1 60 0 q-7.5-6-15 0 q-7.5-6-15 0 q-7.5-6-15 0 q-7.5-6-15 0z" fill="#e0463a" />` +
    `<path d="M36 12 a30 26 0 0 0 -16 6 a30 26 0 0 1 16-6z M36 12 a30 26 0 0 1 16 6 a30 26 0 0 0 -16-6z" fill="#c23a30" />` +
    `<path d="M36 36 V56 a5 5 0 0 1 -10 0" fill="none" stroke="#6e7d96" stroke-width="3.4" stroke-linecap="round" />` +
    `<path d="M10 46 l-2 6 M20 52 l-2 6 M52 48 l-2 6 M62 44 l-2 6" stroke="#2f6fd6" stroke-width="3" stroke-linecap="round" />`,

  clock:
    `<ellipse cx="36" cy="64" rx="22" ry="3" fill="#1c2541" opacity="0.1" />` +
    `<circle cx="36" cy="36" r="27" fill="#f2a93b" /><circle cx="36" cy="36" r="22" fill="#ffffff" />` +
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => { const a = (i * Math.PI) / 6, r1 = i % 3 === 0 ? 16 : 18.5; return `<line x1="${(36 + r1 * Math.sin(a)).toFixed(1)}" y1="${(36 - r1 * Math.cos(a)).toFixed(1)}" x2="${(36 + 20 * Math.sin(a)).toFixed(1)}" y2="${(36 - 20 * Math.cos(a)).toFixed(1)}" stroke="#7f94b0" stroke-width="2" stroke-linecap="round" />`; }).join("") +
    `<path d="M36 36V22M36 36l9 5" stroke="#18233a" stroke-width="3.6" stroke-linecap="round" /><circle cx="36" cy="36" r="2.6" fill="#e0463a" />`,

  chilli:
    `<path d="M20 14 q-6-6-12-2 q8 0 8 8" fill="none" stroke="#4a9565" stroke-width="4" stroke-linecap="round" />` +
    `<path d="M20 14 C40 12 64 30 56 56 C54 62 46 62 46 54 C46 40 34 28 18 24 C14 22 14 15 20 14z" fill="#e0463a" />` +
    `<path d="M24 20 C38 20 52 32 52 48" fill="none" stroke="#ff8a7a" stroke-width="3.4" stroke-linecap="round" opacity="0.7" />` +
    `<path d="M16 22 q-4-1-4-6 q5 0 8 4z" fill="#5fae7a" />`,
  // ---- more pictures ----
  family:
    `<ellipse cx="36" cy="64" rx="30" ry="3.5" fill="#1c2541" opacity="0.1" />` +
    [[17, "#e0463a", "#e8b890", 34, 1], [55, "#2f6fd6", "#d9a679", 34, 1], [36, "#f2a93b", "#f0c9a0", 46, 0.8]].map(([x, shirt, skin, top, k]) =>
      `<rect x="${x - 6 * k}" y="${top + 16 * k}" width="${5 * k}" height="${62 - top - 16 * k}" rx="2" fill="#3b4a63" /><rect x="${x + k}" y="${top + 16 * k}" width="${5 * k}" height="${62 - top - 16 * k}" rx="2" fill="#3b4a63" />` +
      `<rect x="${x - 9 * k}" y="${top - 4 * k}" width="${18 * k}" height="${22 * k}" rx="${8 * k}" fill="${shirt}" /><circle cx="${x}" cy="${top - 11 * k}" r="${7.5 * k}" fill="${skin}" /><path d="M${x - 7.5 * k} ${top - 12 * k} a${7.5 * k} ${7.5 * k} 0 0 1 ${15 * k} 0z" fill="#2b2f3a" />`).join("") +
    `<path d="M36 12 C26 4 22 14 36 22 C50 14 46 4 36 12z" fill="#ff6f7d" />`,

  book:
    `<ellipse cx="36" cy="64" rx="30" ry="3" fill="#1c2541" opacity="0.1" />` +
    `<path d="M3 20 V60 Q20 54 36 60 Q52 54 69 60 V20z" fill="#2f6fd6" />` +
    `<path d="M7 14 Q21 10 36 16 V58 Q21 52 7 56z" fill="#ffffff" /><path d="M65 14 Q51 10 36 16 V58 Q51 52 65 56z" fill="#f4f7fa" />` +
    `<path d="M12 22 Q21 20 30 24M12 30 Q21 28 30 32M12 38 Q21 36 30 40M42 24 Q51 20 60 22M42 32 Q51 28 60 30M42 40 Q51 36 60 38" fill="none" stroke="#b4bdcb" stroke-width="2.2" stroke-linecap="round" />` +
    `<path d="M50 12 V28 L54 24 L58 28 V12z" fill="#e0463a" />`,

  pencil:
    `<g transform="rotate(45 36 36)"><rect x="28" y="4" width="16" height="46" rx="2" fill="#f2c14e" /><rect x="28" y="4" width="16" height="8" rx="2" fill="#ee8fa5" />` +
    `<rect x="28" y="11" width="16" height="5" fill="#b4bdcb" /><path d="M33 18V50" stroke="#ffffff" stroke-width="2.4" opacity="0.5" /><path d="M39 18V50" stroke="#d99b1c" stroke-width="2.4" opacity="0.5" />` +
    `<polygon points="28,50 44,50 36,66" fill="#f4dcb4" /><polygon points="32.5,59 39.5,59 36,66" fill="#3b4a63" /></g>` +
    `<path d="M6 62 q6-6 12 0 t12 0" fill="none" stroke="#7f94b0" stroke-width="2.6" stroke-linecap="round" />`,

  sun:
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => { const a = (i * Math.PI) / 5; return `<line x1="${(36 + 22 * Math.sin(a)).toFixed(1)}" y1="${(36 - 22 * Math.cos(a)).toFixed(1)}" x2="${(36 + 31 * Math.sin(a)).toFixed(1)}" y2="${(36 - 31 * Math.cos(a)).toFixed(1)}" stroke="#f2a93b" stroke-width="4.4" stroke-linecap="round" />`; }).join("") +
    `<circle cx="36" cy="36" r="17" fill="#ffc94d" /><circle cx="36" cy="36" r="13" fill="#ffd96e" /><path d="M27 31a11 11 0 0 1 8-6" fill="none" stroke="#fff3c4" stroke-width="3" stroke-linecap="round" />`,

  moon:
    `<path d="M44 8 A28 28 0 1 0 64 48 A22 22 0 0 1 44 8z" fill="#ffd166" /><path d="M44 8 A28 28 0 0 0 20 20" fill="none" stroke="#fff0b8" stroke-width="3" stroke-linecap="round" />` +
    `<circle cx="26" cy="44" r="4" fill="#f0b94a" /><circle cx="36" cy="54" r="2.6" fill="#f0b94a" />` + sparkle(56, 20, 6, "#ffe08a") + sparkle(62, 38, 3.4, "#ffffff") + sparkle(46, 30, 3, "#ffffff"),

  flower:
    `<path d="M36 36 V64" stroke="#4a9565" stroke-width="4" stroke-linecap="round" /><path d="M36 54 q-14-2-16-14 q14 0 16 14z" fill="#5fae7a" /><path d="M36 48 q12-2 15-12 q-13 0-15 12z" fill="#7cc794" />` +
    [0, 1, 2, 3, 4].map((i) => { const a = (i * 2 * Math.PI) / 5; return `<circle cx="${(36 + 13 * Math.sin(a)).toFixed(1)}" cy="${(24 - 13 * Math.cos(a)).toFixed(1)}" r="9" fill="#ff8fa8" />`; }).join("") +
    `<circle cx="36" cy="24" r="7.5" fill="#ffc94d" /><circle cx="33.5" cy="22" r="2.2" fill="#ffe9a0" />`,

  bird:
    `<rect x="4" y="52" width="64" height="5" rx="2.5" fill="#8a6a4a" /><path d="M54 52 q8-4 12-12" fill="none" stroke="#5fae7a" stroke-width="3" stroke-linecap="round" />` +
    `<path d="M10 36 L2 30 L4 42z" fill="#2f86c9" /><ellipse cx="32" cy="38" rx="21" ry="15" fill="#4aa3e0" /><ellipse cx="34" cy="44" rx="14" ry="8" fill="#eaf4fb" />` +
    `<circle cx="48" cy="26" r="11" fill="#4aa3e0" /><polygon points="57,24 67,28 57,31" fill="#f2a93b" /><circle cx="51" cy="24" r="2.4" fill="#18233a" /><circle cx="51.8" cy="23.2" r="0.8" fill="#fff" />` +
    `<path d="M20 34 q10-10 24 0 q-8 12-22 6z" fill="#2f86c9" /><path d="M28 52v6M36 52v6" stroke="#f2a93b" stroke-width="2.6" stroke-linecap="round" />`,

  heart:
    `<path d="M36 62 C6 42 8 12 26 12 C32 12 36 18 36 18 C36 18 40 12 46 12 C64 12 66 42 36 62z" fill="#e8445a" />` +
    `<path d="M16 24 q2-8 10-8" fill="none" stroke="#ff9aa8" stroke-width="3.6" stroke-linecap="round" />`,

  smile:
    `<circle cx="36" cy="36" r="29" fill="#ffc94d" /><circle cx="36" cy="36" r="29" fill="none" stroke="#f0a92a" stroke-width="3" />` +
    `<ellipse cx="26" cy="29" rx="3.4" ry="5" fill="#18233a" /><ellipse cx="46" cy="29" rx="3.4" ry="5" fill="#18233a" />` +
    `<path d="M20 41 q16 20 32 0" fill="#ffffff" stroke="#18233a" stroke-width="3" stroke-linejoin="round" /><circle cx="19" cy="40" r="4.4" fill="#ff9a7a" opacity="0.7" /><circle cx="53" cy="40" r="4.4" fill="#ff9a7a" opacity="0.7" />`,

  phone:
    `<rect x="20" y="4" width="32" height="64" rx="7" fill="#2f3b52" /><rect x="23.5" y="11" width="25" height="46" rx="2.5" fill="#cfe6fb" />` +
    `<rect x="29" y="7" width="14" height="2.4" rx="1.2" fill="#4a5a76" /><circle cx="36" cy="62" r="2.6" fill="#4a5a76" />` +
    `<path d="M27 20h18a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-9l-5 4v-4h-4a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3z" fill="#17a596" />` +
    `<path d="M29 25h12M29 29h8" stroke="#fff" stroke-width="2" stroke-linecap="round" /><rect x="27" y="42" width="18" height="9" rx="2.5" fill="#f2a93b" />`,

  bed:
    `<rect x="6" y="14" width="6" height="48" rx="2" fill="#8a5a3c" /><rect x="6" y="46" width="60" height="9" rx="2" fill="#a8703d" /><rect x="60" y="38" width="6" height="24" rx="2" fill="#8a5a3c" />` +
    `<rect x="12" y="34" width="48" height="14" rx="4" fill="#ffffff" /><rect x="15" y="26" width="18" height="11" rx="5" fill="#f4f7fa" stroke="#d6deea" stroke-width="1.6" />` +
    `<path d="M30 36 H60 V50 H30z" fill="#4a6cf0" /><path d="M30 41 H60" stroke="#7a95f5" stroke-width="2.4" />` +
    `<text x="44" y="22" font-family="Manrope, sans-serif" font-size="11" font-weight="800" fill="#6e7d96">z</text><text x="53" y="14" font-family="Manrope, sans-serif" font-size="8" font-weight="800" fill="#9aa8bd">z</text>`,

  fruit:
    `<ellipse cx="36" cy="64" rx="20" ry="3" fill="#1c2541" opacity="0.1" />` +
    `<path d="M36 22 C22 12 6 22 10 42 C13 58 26 66 36 60 C46 66 59 58 62 42 C66 22 50 12 36 22z" fill="#e0463a" />` +
    `<path d="M16 32 q1-9 9-12" fill="none" stroke="#ff8a7a" stroke-width="3.6" stroke-linecap="round" opacity="0.8" />` +
    `<path d="M36 22 q0-10 6-16" fill="none" stroke="#6b4a2f" stroke-width="3.2" stroke-linecap="round" /><path d="M40 12 q10-8 20 0 q-10 8-20 0z" fill="#5fae7a" />`,

  cake:
    `<ellipse cx="36" cy="64" rx="28" ry="3.4" fill="#1c2541" opacity="0.1" />` +
    `<rect x="9" y="40" width="54" height="22" rx="4" fill="#f4a3b8" /><rect x="15" y="26" width="42" height="16" rx="4" fill="#fff0c8" />` +
    `<path d="M15 32 q5 8 10 0 t10 0 t10 0 t10 0 v-6 H15z" fill="#fff" /><path d="M9 46 q6 7 12 0 t12 0 t12 0 t12 0" fill="#fff" />` +
    `<rect x="34" y="12" width="4" height="14" rx="1.5" fill="#4a6cf0" /><path d="M36 3 q5 5 0 9 q-5-4 0-9z" fill="#ffa534" />` +
    `<circle cx="22" cy="24" r="3.6" fill="#e0463a" /><circle cx="50" cy="24" r="3.6" fill="#e0463a" />`,

  gift:
    `<ellipse cx="36" cy="64" rx="26" ry="3.2" fill="#1c2541" opacity="0.1" />` +
    `<rect x="10" y="28" width="52" height="34" rx="3" fill="#e0463a" /><rect x="6" y="20" width="60" height="12" rx="3" fill="#f06a5c" />` +
    `<rect x="31" y="20" width="10" height="42" fill="#ffd166" />` +
    `<path d="M36 20 C26 6 14 12 22 18 C26 21 33 20 36 20z M36 20 C46 6 58 12 50 18 C46 21 39 20 36 20z" fill="#ffd166" stroke="#e5ae38" stroke-width="1.6" />`,

  key:
    `<g transform="rotate(-40 36 36)"><circle cx="16" cy="36" r="13" fill="#f2c14e" /><circle cx="16" cy="36" r="6" fill="#f4f7fa" />` +
    `<rect x="26" y="32" width="40" height="8" rx="2" fill="#f2c14e" /><rect x="52" y="40" width="6" height="10" rx="1.5" fill="#f2c14e" /><rect x="61" y="40" width="5" height="7" rx="1.5" fill="#f2c14e" />` +
    `<path d="M10 28 q4-4 10-3" fill="none" stroke="#fff3c4" stroke-width="3" stroke-linecap="round" /></g>`,

  car:
    `<ellipse cx="36" cy="57" rx="29" ry="3.5" fill="#1c2541" opacity="0.12" />` +
    `<rect x="5" y="32" width="62" height="20" rx="7" fill="#e0463a" /><path d="M16 32 L25 17 H47 L58 32z" fill="#e0463a" />` +
    `<path d="M21 31 L28 20 H35 V31z M39 31 V20 H46 L53 31z" fill="#cfe6fb" /><rect x="8" y="40" width="56" height="3" fill="#c23a30" />` +
    `<circle cx="64" cy="40" r="2.6" fill="#ffd166" /><circle cx="8" cy="40" r="2.2" fill="#ff8a7a" />` +
    `<circle cx="19" cy="52" r="7" fill="#2f3b52" /><circle cx="19" cy="52" r="2.8" fill="#aeb9c6" /><circle cx="53" cy="52" r="7" fill="#2f3b52" /><circle cx="53" cy="52" r="2.8" fill="#aeb9c6" />`,

  bicycle:
    `<circle cx="16" cy="48" r="12" fill="none" stroke="#2f3b52" stroke-width="3.4" /><circle cx="56" cy="48" r="12" fill="none" stroke="#2f3b52" stroke-width="3.4" />` +
    `<path d="M16 48 L28 28 H46 L56 48 M28 28 L36 48 H16 M46 28 L36 48" fill="none" stroke="#17a596" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round" />` +
    `<path d="M24 24 H34 M46 28 L50 18 H58" fill="none" stroke="#18233a" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" /><circle cx="36" cy="48" r="3.4" fill="#f2a93b" /><circle cx="16" cy="48" r="2" fill="#aeb9c6" /><circle cx="56" cy="48" r="2" fill="#aeb9c6" />`,

  plane:
    `<path d="M8 40 L2 22 H14 L26 36z" fill="#2f6fd6" /><ellipse cx="38" cy="38" rx="31" ry="9.5" fill="#f6f8fb" stroke="#c9d3de" stroke-width="2" />` +
    `<path d="M32 42 L48 42 L30 62 H20z" fill="#3a7fe6" /><path d="M58 34 q5 0 8 4 q-4 1-8 1z" fill="#cfe6fb" />` +
    [0, 1, 2, 3, 4].map((i) => `<circle cx="${22 + i * 7}" cy="35" r="1.9" fill="#3b4a63" />`).join("") + `<path d="M10 40H66" stroke="#2f6fd6" stroke-width="2.4" />` +
    `<path d="M4 54h12M0 60h8" stroke="#c4cedb" stroke-width="3" stroke-linecap="round" />`,

  medical:
    `<path d="M26 20 V14 a4 4 0 0 1 4-4 h12 a4 4 0 0 1 4 4 v6" fill="none" stroke="#6e7d96" stroke-width="4" stroke-linecap="round" />` +
    `<rect x="8" y="20" width="56" height="42" rx="7" fill="#e0463a" /><rect x="8" y="20" width="56" height="9" rx="4" fill="#f06a5c" />` +
    `<rect x="31" y="31" width="10" height="26" rx="2" fill="#ffffff" /><rect x="23" y="39" width="26" height="10" rx="2" fill="#ffffff" />`,

  coin:
    `<ellipse cx="36" cy="62" rx="26" ry="4" fill="#1c2541" opacity="0.1" />` +
    `<path d="M10 46 v10 a26 8 0 0 0 52 0 v-10z" fill="#d99b1c" /><ellipse cx="36" cy="46" rx="26" ry="8" fill="#f2c14e" />` +
    `<path d="M14 30 v10 a22 7 0 0 0 44 0 v-10z" fill="#d99b1c" /><ellipse cx="36" cy="30" rx="22" ry="7" fill="#f6cf6a" />` +
    `<path d="M16 16 v10 a20 6 0 0 0 40 0 v-10z" fill="#d99b1c" /><ellipse cx="36" cy="16" rx="20" ry="6" fill="#ffdc7a" /><ellipse cx="36" cy="16" rx="12" ry="3.2" fill="none" stroke="#e5ae38" stroke-width="1.6" />`,

  shirt:
    `<path d="M24 8 L6 20 L14 34 L22 29 V62 H50 V29 L58 34 L66 20 L48 8 Q36 20 24 8z" fill="#4a6cf0" />` +
    `<path d="M24 8 Q36 20 48 8 Q36 12 24 8z" fill="#2f4fc0" /><path d="M22 29 V62 M50 29 V62" stroke="#3a58d4" stroke-width="2" /><path d="M14 34 L22 29" stroke="#3a58d4" stroke-width="2" />` +
    `<path d="M30 36 H42 M30 42 H38" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.7" />`,

  bag:
    `<ellipse cx="36" cy="65" rx="22" ry="3" fill="#1c2541" opacity="0.1" />` +
    `<path d="M28 14 V9 a8 8 0 0 1 16 0 v5" fill="none" stroke="#a8701c" stroke-width="4" stroke-linecap="round" transform="translate(0 4)" />` +
    `<rect x="10" y="14" width="52" height="50" rx="14" fill="#17a596" /><path d="M10 34 H62" stroke="#0f7a6f" stroke-width="3" />` +
    `<rect x="22" y="42" width="28" height="16" rx="5" fill="#0f8a7d" /><rect x="30" y="38" width="12" height="7" rx="2" fill="#ffd166" />` +
    `<path d="M16 24 q2-6 8-7" fill="none" stroke="#5fd3c4" stroke-width="3" stroke-linecap="round" />`,

  bulb:
    `<path d="M36 4 V0M10 20 l-4-3M62 20 l4-3M4 38 H0M68 38 h4" stroke="#f2a93b" stroke-width="3" stroke-linecap="round" />` +
    `<path d="M36 6 C18 6 10 20 14 32 C16 38 22 42 24 48 H48 C50 42 56 38 58 32 C62 20 54 6 36 6z" fill="#ffd96e" />` +
    `<path d="M20 20 q2-9 12-10" fill="none" stroke="#fff3c4" stroke-width="3.6" stroke-linecap="round" />` +
    `<path d="M30 44 V32 l6 6 l6-6 V44" fill="none" stroke="#e5ae38" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" />` +
    `<rect x="24" y="48" width="24" height="6" rx="2" fill="#aeb9c6" /><rect x="26" y="54" width="20" height="6" rx="2" fill="#8a96a8" /><path d="M31 60 h10 l-2 5 h-6z" fill="#6e7d96" />`,

  star:
    (() => { let p = ""; for (let i = 0; i < 10; i++) { const r = i % 2 ? 13 : 30, a = (i * Math.PI) / 5; p += `${(36 + r * Math.sin(a)).toFixed(1)},${(38 - r * Math.cos(a)).toFixed(1)} `; } return `<polygon points="${p}" fill="#ffc94d" stroke="#f0a92a" stroke-width="3" stroke-linejoin="round" /><polygon points="${p}" fill="none" /><path d="M24 24 q4-6 10-8" fill="none" stroke="#fff3c4" stroke-width="3.4" stroke-linecap="round" />`; })(),

  fish:
    `<path d="M52 38 L68 24 V52z" fill="#f08a2a" /><ellipse cx="32" cy="38" rx="26" ry="16" fill="#ffa534" />` +
    `<path d="M22 24 q10-10 22 0 q-10 4-22 0z" fill="#f08a2a" /><path d="M26 54 q6 8 14 2 q-8 0-14-2z" fill="#f08a2a" />` +
    `<path d="M30 26 q-6 12 0 24M38 24 q-6 14 0 28" fill="none" stroke="#ffd0a0" stroke-width="2.6" stroke-linecap="round" opacity="0.7" />` +
    `<circle cx="14" cy="34" r="4.4" fill="#ffffff" /><circle cx="13" cy="34" r="2.2" fill="#18233a" />` +
    `<circle cx="6" cy="22" r="2.8" fill="none" stroke="#7fb8e6" stroke-width="1.8" /><circle cx="12" cy="12" r="2" fill="none" stroke="#7fb8e6" stroke-width="1.8" />`,

  eye:
    `<path d="M3 36 Q36 4 69 36 Q36 68 3 36z" fill="#ffffff" stroke="#c9d3de" stroke-width="2.4" /><circle cx="36" cy="36" r="15" fill="#4a8fd8" />` +
    `<circle cx="36" cy="36" r="9" fill="#18233a" /><circle cx="31" cy="31" r="4" fill="#ffffff" /><circle cx="41" cy="41" r="1.8" fill="#ffffff" opacity="0.8" />` +
    `<path d="M10 28 Q36 6 62 28" fill="none" stroke="#18233a" stroke-width="3.4" stroke-linecap="round" />`,

  shoe:
    `<ellipse cx="36" cy="62" rx="31" ry="3" fill="#1c2541" opacity="0.1" />` +
    `<path d="M5 56 V30 Q5 24 11 24 H22 Q26 36 38 38 Q58 38 66 48 V56z" fill="#e0463a" />` +
    `<path d="M5 56 H66 V62 Q66 64 62 64 H9 Q5 64 5 60z" fill="#ffffff" stroke="#d6deea" stroke-width="1.6" />` +
    `<path d="M5 56 H66" stroke="#c23a30" stroke-width="2" /><path d="M24 30 l8 6 M30 26 l8 6 M37 24 l6 4" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />` +
    `<path d="M10 28 Q12 26 18 26" fill="none" stroke="#ff8a7a" stroke-width="2.6" stroke-linecap="round" />`,
};

const THEMES = Object.keys(ART);

// English words that suggest a picture. The first line that matches wins,
// so the more specific themes come first.
const WORD_THEMES = [
  ["chilli", /\b(chilli|chili|spicy|sambal|pepper)\b/],
  ["fish", /\b(fish|sea|ocean|swim|swimming|aquarium)\b/],
  ["drink", /\b(drink|beverage|coffee|kopi|tea|milk|juice|water)\b/],
  ["food", /\b(food|meal|dish|eat|rice|noodles?|soup|chicken|fish|egg|bread|prawn|satay|dosai|dosa|laksa|curry|delicious|tasty|hungry|chopsticks?|table|seat|chair)\b/],
  ["stall", /\b(hawker|stall|menu|tray|take ?away|take away|order|canteen)\b/],
  ["card", /\b(card|tap|pay|paid|money|change|coins?|price|cost|cheap|fare|ticket)\b/],
  ["taxi", /\b(taxi|cab)\b/],
  ["bus", /\b(bus|stop|driver|road)\b/],
  ["train", /\b(mrt|subway|train|station|platform|exit|entrance|transfer|route|board)\b/],
  ["lift", /\b(lift|elevator|floor|storey|stairs?)\b/],
  ["playground", /\b(playground|slide|swing)\b/],
  ["chess", /\b(chess|game|play)\b/],
  ["cat", /\b(cat|kitten|pet|animal)\b/],
  ["park", /\b(park|tree|garden|walk|stroll|nature|green)\b/],
  ["people", /\b(queue|crowd|crowded|people|child|children|kid|elderly|senior|passenger|person)\b/],
  ["chat", /\b(chat|talk|say|speak|hello|greet|conversation)\b/],
  ["home", /\b(flat|hdb|house|home|block|neighbou?rs?|neighbou?rhood|community|downstairs)\b/],
  ["shop", /\b(shop|store|market|buy|sell|convenience)\b/],
  ["family", /\b(family|mother|father|mum|mom|mummy|daddy|dad|parents?|grand(ma|pa|mother|father|parents?)|sisters?|brothers?|aunt|auntie|uncle|baby|wife|husband|son|daughter|relatives?)\b/],
  ["book", /\b(book|books|read|reading|study|school|teacher|learn|lesson|class|library|homework|exam|test|student)\b/],
  ["pencil", /\b(write|writing|pen|pencil|draw|drawing|spell|note|notes|paper)\b/],
  ["sun", /\b(sun|sunny|hot|warm|bright|morning|noon|summer|heat)\b/],
  ["moon", /\b(moon|night|evening|dark|midnight|tonight)\b/],
  ["flower", /\b(flower|flowers|bloom|rose|orchid|beautiful|pretty|spring|fragrant|perfume|smell)\b/],
  ["bird", /\b(bird|sparrow|sing|singing|song|feather)\b/],
  ["heart", /\b(love|heart|care|kind|kindness|friends?|friendship|favou?rite|thanks?|thank|grateful|miss|dear|welcome|sorry|please)\b/],
  ["smile", /\b(happy|happiness|smile|joy|glad|laugh|laughing|fun|cheerful|funny|nice|good|great|well|fine|ok|okay|delighted|excited)\b/],
  ["phone", /\b(phone|call|mobile|message|text|app|online|internet|wifi|number|contact|video|screen)\b/],
  ["bed", /\b(sleep|sleeping|bed|rest|tired|nap|room|bedroom|sleepy|dream)\b/],
  ["fruit", /\b(fruit|fruits|apple|orange|banana|mango|durian|grapes?|lemon|sweet|fresh|healthy food)\b/],
  ["cake", /\b(cake|birthday|dessert|sweets?|candy|party|celebrate|celebration|festival|snack|biscuit|cookie|bun|festive)\b/],
  ["gift", /\b(gift|present|surprise|red packet|ang pow|angpao|reward|prize|congratulations?)\b/],
  ["key", /\b(key|lock|unlock|open|close|door|safe|secret|password|answer)\b/],
  ["car", /\b(car|cars|drive|driving|vehicle|traffic|jam|petrol|parking|lorry|van)\b/],
  ["bicycle", /\b(bicycle|bike|cycle|cycling|ride|riding)\b/],
  ["plane", /\b(plane|airplane|aeroplane|flight|airport|travel|trip|holiday|overseas|abroad|fly|flying)\b/],
  ["medical", /\b(doctor|sick|ill|illness|medicine|hospital|clinic|health|pain|fever|cough|nurse|hurt|injury|mask|unwell)\b/],
  ["coin", /\b(dollar|dollars|cash|wealth|rich|salary|bank|save|saving|worth|expensive|poor|wallet|spend)\b/],
  ["shirt", /\b(shirt|clothes|clothing|wear|wearing|dress|uniform|jacket|trousers|skirt|fashion|colou?rs?)\b/],
  ["bag", /\b(bag|bags|backpack|carry|luggage|bring|pack)\b/],
  ["bulb", /\b(idea|think|thinking|thought|know|understand|smart|clever|wise|lamp|electric|remember|mind|light)\b/],
  ["star", /\b(star|stars|famous|excellent|best|shine|special|wish|champion|winner|win|first)\b/],
  ["eye", /\b(eye|eyes|see|look|watch|vision|glasses|find|show|view)\b/],
  ["shoe", /\b(shoe|shoes|run|running|jog|sport|sports|exercise|foot|feet|sneakers?)\b/],
  ["rain", /\b(rain|umbrella|weather|cool|shade|breeze)\b/],
  ["clock", /\b(late|early|time|delay|wait|hour|day)\b/],
];

// A picture drawn by Claude is rebuilt from scratch before it is shown:
// only simple shapes survive, and every value must look like a plain number,
// colour or path. Scripts, links, styles and text are dropped. This is the
// same rule set the Edge Function applies (keep the two in step).
const ART_TAGS = ["g", "path", "circle", "ellipse", "rect", "line", "polygon", "polyline"];
const ART_NUMBER = /^-?[\d.]+(e-?\d+)?%?$/i;
const ART_COLOR = /^(none|#[0-9a-f]{3,8}|[a-z]{3,20}|rgba?\([\d\s.,%]+\))$/i;
const ART_ATTRS = {
  fill: ART_COLOR, stroke: ART_COLOR,
  "stroke-width": ART_NUMBER, opacity: ART_NUMBER,
  "stroke-linecap": /^(butt|round|square)$/, "stroke-linejoin": /^(miter|round|bevel)$/,
  d: /^[MmLlHhVvCcSsQqTtAaZz\d\s.,+eE-]+$/, points: /^[\d\s.,+eE-]+$/,
  cx: ART_NUMBER, cy: ART_NUMBER, r: ART_NUMBER, rx: ART_NUMBER, ry: ART_NUMBER,
  x: ART_NUMBER, y: ART_NUMBER, width: ART_NUMBER, height: ART_NUMBER,
  x1: ART_NUMBER, y1: ART_NUMBER, x2: ART_NUMBER, y2: ART_NUMBER,
  transform: /^[a-zA-Z\d\s.,()+eE-]+$/,
};

function sanitizeArt(raw) {
  if (typeof raw !== "string" || raw.length > 20000) return "";
  const markup = raw.replace(/```[a-z]*/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  const tags = markup.match(/<\/?[a-zA-Z][^>]*>/g) || [];
  let out = "";
  let depth = 0;
  let shapes = 0;
  for (const tag of tags) {
    const found = tag.match(/^<\/?([a-zA-Z][\w-]*)/);
    const name = found && found[1].toLowerCase();
    if (!name || !ART_TAGS.includes(name)) continue;
    if (tag.startsWith("</")) {
      if (name === "g" && depth > 0) { out += "</g>"; depth--; }
      continue;
    }
    if (++shapes > 80) return "";
    let attrs = "";
    for (const m of tag.matchAll(/([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      const key = m[1].toLowerCase();
      const value = (m[2] ?? m[3] ?? "").trim();
      if (ART_ATTRS[key] && ART_ATTRS[key].test(value) && !/url|javascript/i.test(value)) attrs += ` ${key}="${value}"`;
    }
    if (name === "g") { out += `<g${attrs}>`; depth++; } else out += `<${name}${attrs}/>`;
  }
  out += "</g>".repeat(depth);
  return out.length > 12 && out.length <= 9000 ? out : "";
}

function pickTheme(entry) {
  if (entry && THEMES.includes(entry.theme)) return entry.theme;
  const meaning = String((entry && entry.english_meaning) || "").toLowerCase();
  const hit = WORD_THEMES.find(([, pattern]) => pattern.test(meaning));
  return hit ? hit[0] : "generic";
}

function sparkle(x, y, r, fill) {
  const k = r * 0.28;
  return `<path d="M${x} ${y - r} L${x + k} ${y - k} L${x + r} ${y} L${x + k} ${y + k} L${x} ${y + r} L${x - k} ${y + k} L${x - r} ${y} L${x - k} ${y - k} Z" fill="${fill}" />`;
}

// A glowing halo with slowly turning rays, drawn behind the picture once a
// word is Mastered. It takes the card's rarity colour (--r-border), so a
// Mastered legendary card glows gold and a Mastered common card glows slate.
function halo() {
  let rays = "";
  for (let i = 0; i < 12; i++) {
    const a0 = ((i * 30 - 7) * Math.PI) / 180, a1 = ((i * 30 + 7) * Math.PI) / 180;
    rays += `<polygon points="36,36 ${(36 + 48 * Math.cos(a0)).toFixed(1)},${(36 + 48 * Math.sin(a0)).toFixed(1)} ${(36 + 48 * Math.cos(a1)).toFixed(1)},${(36 + 48 * Math.sin(a1)).toFixed(1)}" />`;
  }
  return `<g class="halo"><g class="rays" style="fill: var(--r-border, #f2a93b)" opacity="0.3">${rays}</g>` +
    `<circle cx="36" cy="36" r="33" style="fill: var(--r-border, #f2a93b)" opacity="0.2" />` +
    `<circle cx="36" cy="36" r="26" fill="#ffffff" opacity="0.6" /></g>`;
}

// The picture for a word. As it evolves it changes:
//   stage 0 (Caught)   the plain picture
//   stage 1 (Trained)  one sparkle
//   stage 2 (Mastered) a glowing halo behind it, a soft shadow under it
//                      (see .art-main in the stylesheet) and four sparkles
function getCardArt(entry, stage = 0) {
  let o = `<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`;
  if (stage >= 2) o += halo();
  const drawn = entry && entry.art_svg ? sanitizeArt(entry.art_svg) : "";
  o += `<g class="art-main">${drawn || ART[pickTheme(entry)]}</g>`;
  if (stage >= 1) o += sparkle(62, 10, 6.5, "#ffc94d");
  if (stage >= 2) o += sparkle(9, 15, 4.5, "#ffc94d") + sparkle(65, 58, 4, "#ffffff") + sparkle(8, 58, 3, "#ffffff");
  return o + `</svg>`;
}