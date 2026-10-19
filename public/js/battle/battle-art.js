/* Card Battle artwork: the three boss characters and their battle scenes,
   drawn as inline SVG so there are no image files to host. Loaded before
   battle.js. Everything here is original artwork. */
(function () {
    "use strict";

    // Labels and flavour text for each boss (the real HP / attack numbers live in the database).
    const BOSSES = {
        1: {
            name: "Lift Gremlin", zone: "Neighbourhood", level: 8, hp: 60, attack: 8,
            move: "Door Slam",
            intro: "A Lift Gremlin rattles out of the void deck!",
            taunt: "Aiyo, lift spoilt again!",
            defeat: "Lift Gremlin is under maintenance!",
            glow: "#8fd16f"
        },
        2: {
            name: "Hawker Pigeon", zone: "Hawker centre", level: 12, hp: 80, attack: 10,
            move: "Wok Hei Blast",
            intro: "A Hawker Pigeon swoops in, wok sizzling!",
            taunt: "Eh, chope first, can or not?",
            defeat: "Hawker Pigeon flew off with the last chicken rice!",
            glow: "#ffb347"
        },
        3: {
            name: "Rush Hour Crowd", zone: "Public transport", level: 16, hp: 100, attack: 12,
            move: "Rush Hour Shove",
            intro: "The Rush Hour Crowd squeezes on board!",
            taunt: "Move in lah, move in!",
            defeat: "The Rush Hour Crowd spilled out at the next stop!",
            glow: "#4a7bd6"
        }
    };

    // ------------------------------------------------------------
    // Boss sprites (viewBox 200 x 220, feet on y = 200)
    // Shapes with class "o" get the shared ink outline from battle.css.
    // ------------------------------------------------------------

    const SPRITES = {};

    SPRITES[1] = `
<svg class="bs bs-lift" viewBox="0 0 200 220" aria-hidden="true">
  <ellipse class="bs-shadow" cx="100" cy="208" rx="54" ry="8"/>
  <g class="bs-body">
    <g class="bs-leg bs-leg-l">
      <rect class="o" x="66" y="156" width="16" height="34" rx="6" fill="#8d99ad"/>
      <path class="o" d="M56 198 q0 -11 12 -11 h14 q9 0 9 11 z" fill="#ffffff"/>
    </g>
    <g class="bs-leg bs-leg-r">
      <rect class="o" x="118" y="156" width="16" height="34" rx="6" fill="#8d99ad"/>
      <path class="o" d="M108 198 q0 -11 12 -11 h14 q9 0 9 11 z" fill="#ffffff"/>
    </g>
    <path class="o" d="M100 40 V22" fill="none"/>
    <circle class="o bs-bulb" cx="100" cy="14" r="8" fill="#ffd34d"/>
    <path class="o bs-ear" d="M50 66 L20 34 L46 94 Z" fill="#8fd16f"/>
    <path class="o bs-ear" d="M150 66 L180 34 L154 94 Z" fill="#8fd16f"/>
    <rect class="o" x="46" y="38" width="108" height="126" rx="14" fill="#cfd8e6"/>
    <rect class="o" x="70" y="46" width="60" height="20" rx="5" fill="#1c2433"/>
    <text class="bs-floor" x="100" y="61.5" text-anchor="middle" font-size="14" font-weight="700" fill="#ff9d2e" font-family="monospace">13</text>
    <rect class="o" x="56" y="74" width="42" height="84" rx="4" fill="#eef2f8"/>
    <rect class="o" x="102" y="74" width="42" height="84" rx="4" fill="#eef2f8"/>
    <g class="bs-eye"><circle class="o" cx="77" cy="100" r="14" fill="#ffffff"/><circle class="bs-pupil" cx="79" cy="102" r="6.5" fill="#1c2433"/><circle cx="81.5" cy="99" r="2" fill="#ffffff"/></g>
    <g class="bs-eye"><circle class="o" cx="123" cy="100" r="14" fill="#ffffff"/><circle class="bs-pupil" cx="121" cy="102" r="6.5" fill="#1c2433"/><circle cx="123.5" cy="99" r="2" fill="#ffffff"/></g>
    <g class="bs-brows"><path d="M60 84 L92 93" stroke="#1c2433" stroke-width="5" stroke-linecap="round"/><path d="M140 84 L108 93" stroke="#1c2433" stroke-width="5" stroke-linecap="round"/></g>
    <g class="bs-mouth">
      <rect class="o" x="76" y="126" width="48" height="22" rx="7" fill="#2a1530"/>
      <path d="M82 127 l6 11 6 -11 z M106 127 l6 11 6 -11 z" fill="#ffffff" stroke="#1c2433" stroke-width="2" stroke-linejoin="round"/>
    </g>
    <g class="bs-arm bs-arm-l">
      <path d="M48 104 Q22 108 18 132" fill="none" stroke="#1c2433" stroke-width="9" stroke-linecap="round"/>
      <circle class="o" cx="18" cy="134" r="10" fill="#ffffff"/>
    </g>
    <g class="bs-arm bs-arm-r">
      <path d="M152 104 Q178 108 182 132" fill="none" stroke="#1c2433" stroke-width="9" stroke-linecap="round"/>
      <circle class="o" cx="182" cy="134" r="10" fill="#ffffff"/>
    </g>
  </g>
</svg>`;

    SPRITES[2] = `
<svg class="bs bs-pigeon" viewBox="0 0 200 220" aria-hidden="true">
  <ellipse class="bs-shadow" cx="100" cy="208" rx="54" ry="8"/>
  <g class="bs-body">
    <path class="o" d="M150 152 L192 178 L184 148 L198 128 L154 126 Z" fill="#7d8aa0"/>
    <g class="bs-leg bs-leg-l"><path d="M84 184 V200 M74 201 H94" stroke="#ff9d2e" stroke-width="6" stroke-linecap="round" fill="none"/></g>
    <g class="bs-leg bs-leg-r"><path d="M116 184 V200 M106 201 H126" stroke="#ff9d2e" stroke-width="6" stroke-linecap="round" fill="none"/></g>
    <ellipse class="o" cx="100" cy="138" rx="58" ry="52" fill="#a7b3c6"/>
    <path d="M64 110 Q100 132 136 110 Q132 130 100 134 Q68 130 64 110 Z" fill="#6fd1b2"/>
    <path class="o" d="M72 130 H128 V176 Q100 190 72 176 Z" fill="#ffffff"/>
    <path d="M72 150 H128" stroke="#e0554d" stroke-width="9"/>
    <circle class="o" cx="100" cy="76" r="34" fill="#a7b3c6"/>
    <path class="o bs-beak" d="M90 82 L110 82 L100 102 Z" fill="#ffb347"/>
    <g class="bs-eye"><circle class="o" cx="86" cy="70" r="10" fill="#ffb347"/><circle class="bs-pupil" cx="87" cy="71" r="5" fill="#1c2433"/></g>
    <g class="bs-eye"><circle class="o" cx="114" cy="70" r="10" fill="#ffb347"/><circle class="bs-pupil" cx="113" cy="71" r="5" fill="#1c2433"/></g>
    <g class="bs-brows"><path d="M74 56 L94 63" stroke="#1c2433" stroke-width="5" stroke-linecap="round"/><path d="M126 56 L106 63" stroke="#1c2433" stroke-width="5" stroke-linecap="round"/></g>
    <circle class="o" cx="84" cy="36" r="13" fill="#ffffff"/>
    <circle class="o" cx="100" cy="29" r="15" fill="#ffffff"/>
    <circle class="o" cx="116" cy="36" r="13" fill="#ffffff"/>
    <ellipse cx="100" cy="42" rx="24" ry="11" fill="#ffffff"/>
    <rect class="o" x="72" y="44" width="56" height="12" rx="3" fill="#ffffff"/>
    <g class="bs-arm bs-arm-l">
      <path class="o" d="M54 106 Q16 112 12 152 Q38 154 60 142 Z" fill="#8995ab"/>
    </g>
    <g class="bs-arm bs-arm-r">
      <path class="o" d="M146 106 Q184 112 188 152 Q162 154 140 142 Z" fill="#8995ab"/>
      <path d="M170 162 L146 174" stroke="#1c2433" stroke-width="6" stroke-linecap="round"/>
      <ellipse class="o" cx="180" cy="160" rx="21" ry="7" fill="#3a4256"/>
      <path class="bs-steam" d="M174 150 q-7 -9 0 -17 q7 -8 0 -16" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none"/>
      <path class="bs-steam bs-steam-2" d="M188 150 q-7 -9 0 -17 q7 -8 0 -16" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none"/>
    </g>
  </g>
</svg>`;

    SPRITES[3] = `
<svg class="bs bs-crowd" viewBox="0 0 200 220" aria-hidden="true">
  <ellipse class="bs-shadow" cx="100" cy="208" rx="64" ry="8"/>
  <g class="bs-body">
    <rect class="o" x="6" y="20" width="188" height="8" rx="4" fill="#cbd5e1"/>
    <path class="o" d="M48 28 V58" fill="none"/><circle class="o" cx="48" cy="64" r="7" fill="#ffd34d"/>
    <path class="o" d="M152 28 V56" fill="none"/><circle class="o" cx="152" cy="62" r="7" fill="#ffd34d"/>

    <g class="bs-p bs-p1">
      <path d="M32 150 Q22 104 46 70" fill="none" stroke="#1c2433" stroke-width="15" stroke-linecap="round"/>
      <path d="M32 150 Q22 104 46 70" fill="none" stroke="#e0554d" stroke-width="9" stroke-linecap="round"/>
      <path class="o" d="M14 200 V158 Q14 128 44 128 Q74 128 74 158 V200 Z" fill="#e0554d"/>
      <circle class="o" cx="44" cy="108" r="21" fill="#f0c49c"/>
      <path class="o" d="M23 106 Q44 76 65 106" fill="none" stroke-width="6"/>
      <rect class="o" x="17" y="100" width="9" height="16" rx="4" fill="#1c2433"/>
      <rect class="o" x="62" y="100" width="9" height="16" rx="4" fill="#1c2433"/>
      <path class="bs-sleep" d="M35 111 q4 4 8 0 M50 111 q4 4 8 0" stroke="#1c2433" stroke-width="3" stroke-linecap="round" fill="none"/>
      <text class="bs-zzz" x="62" y="84" font-size="15" font-weight="800" fill="#ffffff" stroke="#1c2433" stroke-width="1" font-family="sans-serif">z</text>
    </g>

    <g class="bs-p bs-p3">
      <path d="M170 152 Q184 106 156 68" fill="none" stroke="#1c2433" stroke-width="15" stroke-linecap="round"/>
      <path d="M170 152 Q184 106 156 68" fill="none" stroke="#3fae8c" stroke-width="9" stroke-linecap="round"/>
      <path class="o" d="M124 200 V160 Q124 130 154 130 Q186 130 186 160 V200 Z" fill="#3fae8c"/>
      <path d="M140 134 L146 200 M168 134 L162 200" stroke="#1c2433" stroke-width="5" fill="none"/>
      <circle class="o" cx="154" cy="108" r="22" fill="#d9a77a"/>
      <path class="o" d="M132 104 Q134 82 156 84 Q176 84 176 104 Q164 96 154 98 Q142 96 132 104 Z" fill="#2b2233"/>
      <circle class="bs-pupil" cx="146" cy="112" r="3.5" fill="#1c2433"/><circle class="bs-pupil" cx="162" cy="112" r="3.5" fill="#1c2433"/>
      <path d="M140 103 L151 107 M168 103 L157 107" stroke="#1c2433" stroke-width="3" stroke-linecap="round"/>
      <path d="M147 125 q7 -4 14 0" stroke="#1c2433" stroke-width="3" stroke-linecap="round" fill="none"/>
    </g>

    <g class="bs-p bs-p2">
      <path class="o" d="M60 204 V164 Q60 132 100 132 Q140 132 140 164 V204 Z" fill="#4a7bd6"/>
      <path d="M92 134 L100 160 L108 134" stroke="#ff9d2e" stroke-width="4" fill="none" stroke-linejoin="round"/>
      <rect class="o" x="94" y="158" width="12" height="9" rx="2" fill="#ffffff"/>
      <circle class="o" cx="100" cy="102" r="26" fill="#f6d2ae"/>
      <path class="o" d="M74 98 Q74 70 100 72 Q126 70 126 98 Q112 86 100 90 Q88 86 74 98 Z" fill="#2b2233"/>
      <g class="bs-eye"><circle cx="90" cy="107" r="3.8" fill="#1c2433"/><circle cx="110" cy="107" r="3.8" fill="#1c2433"/></g>
      <path d="M82 97 L96 103 M118 97 L104 103" stroke="#1c2433" stroke-width="3.5" stroke-linecap="round"/>
      <path class="bs-mouth" d="M92 121 H108" stroke="#1c2433" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <path class="bs-sweat" d="M129 90 q5 8 0 12 q-5 -4 0 -12 z" fill="#9ad8ff" stroke="#1c2433" stroke-width="1.6"/>
      <rect class="o" x="86" y="146" width="28" height="36" rx="5" fill="#9ad8ff"/>
      <rect x="90" y="151" width="20" height="3" rx="1.5" fill="#ffffff" opacity="0.8"/>
      <circle class="o" cx="84" cy="176" r="8" fill="#f6d2ae"/><circle class="o" cx="116" cy="176" r="8" fill="#f6d2ae"/>
    </g>
  </g>
</svg>`;

    // ------------------------------------------------------------
    // Scenes (viewBox 400 x 300, anchored to the bottom, cropped to fit)
    // ------------------------------------------------------------

    // Small repeatable "random": the same scene is drawn every time.
    function rng(seed) {
        let s = seed;
        return function () {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }

    function windows(x, y, w, h, cols, rows, seed, lit, dim, litChance) {
        const rand = rng(seed);
        const cw = w / cols;
        const rh = h / rows;
        let out = "";

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const on = rand() < litChance;
                out += '<rect x="' + (x + c * cw + cw * 0.22).toFixed(1) + '" y="' + (y + r * rh + rh * 0.2).toFixed(1) +
                    '" width="' + (cw * 0.52).toFixed(1) + '" height="' + (rh * 0.5).toFixed(1) +
                    '" rx="1" fill="' + (on ? lit : dim) + '"' + (on ? "" : ' opacity="0.55"') + "/>";
            }
        }

        return out;
    }

    function floorLines(vanishY, color, alpha) {
        let out = '<g stroke="' + color + '" stroke-opacity="' + alpha + '" stroke-width="1.4" fill="none">';

        for (let x = -360; x <= 760; x += 90) out += '<path d="M200 ' + vanishY + " L" + x + ' 300"/>';
        [vanishY + 9, vanishY + 24, vanishY + 46, vanishY + 76].forEach(function (y) {
            out += '<path d="M0 ' + y + " H400\"/>";
        });

        return out + "</g>";
    }

    const SCENES = {};

    // The Singapore flag, kept very simple.
    function flag(x, y, w, delay) {
        const h = w * 2 / 3;
        const cx = x + w * 0.22;
        const cy = y + h * 0.25;
        let stars = "";

        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
            stars += '<circle cx="' + (x + w * 0.4 + Math.cos(angle) * h * 0.11).toFixed(1) + '" cy="' +
                (cy + Math.sin(angle) * h * 0.11).toFixed(1) + '" r="0.9" fill="#ffffff"/>';
        }

        return '<g class="flag" style="transform-origin:' + x + "px " + y + 'px;animation-delay:' + (delay || 0) + 's">' +
            '<path d="M' + x + " " + (y - 2) + " V" + (y + h * 2.2).toFixed(1) + '" stroke="#8a6a3f" stroke-width="1.8"/>' +
            '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + (h / 2).toFixed(1) + '" fill="#ef3340"/>' +
            '<rect x="' + x + '" y="' + (y + h / 2).toFixed(1) + '" width="' + w + '" height="' + (h / 2).toFixed(1) + '" fill="#ffffff"/>' +
            '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (h * 0.15).toFixed(1) + '" fill="#ffffff"/>' +
            '<circle cx="' + (cx + h * 0.07).toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (h * 0.13).toFixed(1) + '" fill="#ef3340"/>' +
            stars + "</g>";
    }

    // A hanging line of washing on a bamboo pole: a very HDB sight.
    function laundry(x1, y1, x2, y2, seed) {
        const rand = rng(seed);
        const colours = ["#e0554d", "#4a7bd6", "#ffffff", "#f2a93b", "#3fae8c", "#f3b9b0"];
        let out = '<path d="M' + x1 + " " + y1 + " L" + x2 + " " + y2 + '" stroke="#8a6a3f" stroke-width="2.6" stroke-linecap="round"/>';

        for (let i = 1; i <= 4; i++) {
            const t = i / 5;
            const px = x1 + (x2 - x1) * t;
            const py = y1 + (y2 - y1) * t;
            const w = 6 + Math.floor(rand() * 4);
            const h = 10 + Math.floor(rand() * 9);

            out += '<g class="laundry" style="transform-origin:' + px.toFixed(1) + "px " + py.toFixed(1) + "px;animation-delay:" + (i * 0.4).toFixed(1) + 's">' +
                '<rect x="' + (px - w / 2).toFixed(1) + '" y="' + py.toFixed(1) + '" width="' + w + '" height="' + h +
                '" rx="1.5" fill="' + colours[Math.floor(rand() * colours.length)] + '" stroke="#18233a" stroke-opacity="0.25"/></g>';
        }

        return out;
    }

    // 1: HDB estate, late afternoon
    SCENES[1] = (function () {
        const rand = rng(5);
        let skyline = "";

        for (let x = -10; x < 400; x += 17) {
            const h = 18 + Math.floor(rand() * 42);
            skyline += '<rect x="' + x + '" y="' + (152 - h) + '" width="13" height="' + h + '" fill="#b3c6e2"/>';
        }

        // three towers with a long deck on top, and a big observation wheel
        const landmarks = `
          <g fill="#a3b9dc">
            <path d="M232 152 L236 76 L247 76 L249 152Z"/><path d="M253 152 L255 76 L266 76 L268 152Z"/><path d="M272 152 L274 76 L285 76 L287 152Z"/>
            <path d="M224 71 Q258 62 296 71 L293 78 Q258 71 227 78Z"/>
          </g>
          <g fill="none" stroke="#a3b9dc" stroke-width="1.6"><circle cx="168" cy="104" r="30"/><path d="M168 74 V134 M138 104 H198 M147 83 L189 125 M189 83 L147 125"/><path d="M168 104 L154 152 M168 104 L182 152"/></g>`;

        return `
<svg class="scene-svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <linearGradient id="s1sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6db8ec"/><stop offset="0.6" stop-color="#bfe3f7"/><stop offset="1" stop-color="#ffe9bd"/></linearGradient>
    <linearGradient id="s1floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eddcc8"/><stop offset="1" stop-color="#cdb7a2"/></linearGradient>
    <radialGradient id="s1sun"><stop offset="0" stop-color="#fffbe6"/><stop offset="1" stop-color="#fffbe6" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="400" height="300" fill="url(#s1sky)"/>
  <circle cx="214" cy="76" r="54" fill="url(#s1sun)"/><circle cx="214" cy="76" r="20" fill="#fff6cf"/>
  <g class="cloud cloud-a" fill="#ffffff" opacity="0.85"><ellipse cx="70" cy="48" rx="34" ry="9"/><ellipse cx="94" cy="41" rx="22" ry="8"/></g>
  <g class="cloud cloud-b" fill="#ffffff" opacity="0.7"><ellipse cx="310" cy="34" rx="30" ry="8"/><ellipse cx="332" cy="28" rx="18" ry="7"/></g>
  ${skyline}${landmarks}
  <rect x="112" y="108" width="176" height="100" fill="#f4ebd6"/>
  <rect x="112" y="108" width="176" height="7" fill="#c9b48a"/>
  ${windows(118, 118, 164, 84, 9, 5, 31, "#9cc7e6", "#6f94b3", 0.5)}
  <rect x="-6" y="62" width="134" height="150" fill="#f6d97a"/>
  <rect x="-6" y="62" width="134" height="9" fill="#c9a24a"/>
  <rect x="-6" y="104" width="134" height="5" fill="#c9a24a" opacity="0.7"/><rect x="-6" y="148" width="134" height="5" fill="#c9a24a" opacity="0.7"/>
  <rect x="54" y="71" width="18" height="141" fill="#fbe9a8"/>
  ${windows(2, 74, 50, 132, 3, 9, 7, "#9cc7e6", "#6f94b3", 0.55)}
  ${windows(74, 74, 50, 132, 3, 9, 17, "#9cc7e6", "#6f94b3", 0.55)}
  <rect x="280" y="80" width="132" height="132" fill="#a9d0ea"/>
  <rect x="280" y="80" width="132" height="9" fill="#5f8fb3"/>
  <rect x="280" y="124" width="132" height="5" fill="#5f8fb3" opacity="0.7"/><rect x="280" y="166" width="132" height="5" fill="#5f8fb3" opacity="0.7"/>
  <rect x="332" y="89" width="18" height="123" fill="#c6e1f3"/>
  ${windows(284, 92, 46, 116, 3, 8, 23, "#fff4c4", "#6f94b3", 0.5)}
  ${windows(352, 92, 56, 116, 3, 8, 29, "#fff4c4", "#6f94b3", 0.5)}
  ${laundry(126, 122, 168, 104, 3)}${laundry(126, 160, 172, 144, 9)}${laundry(282, 138, 240, 120, 12)}
  ${flag(134, 66, 22, 0)}${flag(262, 84, 22, 0.6)}
  <rect x="381" y="150" width="9" height="58" fill="#6b4a2b"/>
  <ellipse cx="386" cy="132" rx="46" ry="26" fill="#3f8f5c"/><ellipse cx="372" cy="140" rx="30" ry="16" fill="#2f6e46" opacity="0.7"/>
  <rect x="0" y="204" width="400" height="96" fill="url(#s1floor)"/>
  <rect x="0" y="200" width="400" height="8" fill="#a8927f"/>
  ${floorLines(204, "#8a7566", 0.45)}
  <g fill="#b08d74" opacity="0.5"><circle cx="40" cy="230" r="2"/><circle cx="96" cy="262" r="2"/><circle cx="170" cy="240" r="2"/><circle cx="262" cy="270" r="2"/><circle cx="330" cy="236" r="2"/><circle cx="372" cy="262" r="2"/><circle cx="210" cy="284" r="2"/></g>
</svg>`;
    })();

    // 2: hawker centre in the evening
    SCENES[2] = (function () {
        let bulbs = "";

        for (let i = 0; i <= 16; i++) {
            const t = i / 16;
            const x = t * 400;
            const y = 24 + Math.sin(t * Math.PI) * 26;
            bulbs += '<circle class="bulb" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4" fill="#ffd34d" style="animation-delay:' + ((i % 4) * 0.35).toFixed(2) + 's"/>';
        }

        const stalls = [
            { x: 6, c: "#d8443a", t: "CHICKEN RICE", food: "#e8b26a" },
            { x: 104, c: "#f2a93b", t: "KOPI & TEH", food: "#7a4a2b" },
            { x: 202, c: "#2f9a6a", t: "SATAY", food: "#c9703a" },
            { x: 300, c: "#3a77c9", t: "NOODLES", food: "#f1d27a" }
        ];
        let stallSvg = "";

        stalls.forEach(function (st, i) {
            stallSvg += '<rect x="' + st.x + '" y="150" width="94" height="56" fill="#4a2230"/>';
            stallSvg += '<rect x="' + (st.x + 6) + '" y="158" width="82" height="30" rx="3" fill="#ffe2b0"/>';
            stallSvg += '<ellipse cx="' + (st.x + 24) + '" cy="176" rx="13" ry="7" fill="' + st.food + '"/><ellipse cx="' + (st.x + 50) + '" cy="177" rx="12" ry="6" fill="' + st.food + '" opacity="0.85"/><ellipse cx="' + (st.x + 72) + '" cy="176" rx="9" ry="6" fill="' + st.food + '" opacity="0.7"/>';
            stallSvg += '<rect x="' + st.x + '" y="124" width="94" height="24" rx="3" fill="' + st.c + '" stroke="#18233a" stroke-opacity="0.4"/>';
            stallSvg += '<text x="' + (st.x + 47) + '" y="140" text-anchor="middle" font-size="10" font-weight="800" fill="#ffffff" font-family="Manrope, Arial, sans-serif" letter-spacing="0.3">' + st.t + "</text>";
            stallSvg += '<rect x="' + st.x + '" y="146" width="94" height="6" fill="' + (i % 2 ? "#ffffff" : "#18233a") + '" opacity="0.18"/>';
        });

        let tables = "";

        [[64, "#f08a3c"], [196, "#3a77c9"], [338, "#f08a3c"]].forEach(function (tb, i) {
            const x = tb[0];

            tables += '<rect x="' + (x - 4) + '" y="206" width="8" height="16" fill="#9a8f84"/>';
            tables += '<ellipse cx="' + x + '" cy="204" rx="30" ry="8" fill="#efe9de" stroke="#9a8f84" stroke-width="1.4"/>';
            tables += '<rect x="' + (x - 22) + '" y="212" width="12" height="10" rx="3" fill="' + tb[1] + '"/><rect x="' + (x + 10) + '" y="212" width="12" height="10" rx="3" fill="' + tb[1] + '"/>';
            tables += '<rect x="' + (x - 8) + '" y="196" width="9" height="5" rx="1" fill="#ffffff" transform="rotate(-8 ' + x + ' 198)"/>';
            tables += '<rect x="' + (x + 10) + '" y="192" width="6" height="10" rx="1.5" fill="#ffb347"/><path d="M' + (x + 13) + " 192 V185" + '" stroke="#18233a" stroke-width="1.4"/>';
        });

        return `
<svg class="scene-svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <linearGradient id="s2sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d2140"/><stop offset="0.55" stop-color="#a8453a"/><stop offset="1" stop-color="#f4a04a"/></linearGradient>
    <linearGradient id="s2floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4864a"/><stop offset="1" stop-color="#9a5530"/></linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#s2sky)"/>
  <g stroke="#2a1426" stroke-width="3" opacity="0.7"><path d="M0 18 H400 M0 44 H400"/><path d="M60 18 L100 44 M160 18 L200 44 M260 18 L300 44 M360 18 L400 44" stroke-width="2"/></g>
  <g fill="#f5f1e6"><rect x="30" y="46" width="64" height="5" rx="2.5"/><rect x="150" y="46" width="64" height="5" rx="2.5"/><rect x="290" y="46" width="64" height="5" rx="2.5"/></g>
  <path d="M100 18 V32 M300 18 V32" stroke="#cfd6e4" stroke-width="2"/>
  <g class="fan" style="transform-origin:100px 33px"><ellipse cx="100" cy="33" rx="30" ry="3.2" fill="#d6dce8"/><ellipse cx="100" cy="33" rx="30" ry="3.2" fill="#d6dce8" transform="rotate(60 100 33)"/><ellipse cx="100" cy="33" rx="30" ry="3.2" fill="#d6dce8" transform="rotate(120 100 33)"/></g>
  <g class="fan fan-2" style="transform-origin:300px 33px"><ellipse cx="300" cy="33" rx="30" ry="3.2" fill="#d6dce8"/><ellipse cx="300" cy="33" rx="30" ry="3.2" fill="#d6dce8" transform="rotate(60 300 33)"/><ellipse cx="300" cy="33" rx="30" ry="3.2" fill="#d6dce8" transform="rotate(120 300 33)"/></g>
  <rect x="0" y="112" width="400" height="94" fill="#5a2c3a" opacity="0.55"/>
  ${stallSvg}
  <path d="M0 24 Q200 78 400 24" stroke="#ffd9a8" stroke-width="2" fill="none" opacity="0.85"/>
  ${bulbs}
  <g class="lantern" style="transform-origin:34px 52px"><path d="M34 52 V74" stroke="#ffd9a8" stroke-width="2"/><circle cx="34" cy="88" r="14" fill="#e0443a"/><rect x="28" y="72" width="12" height="5" fill="#ffd34d"/><rect x="28" y="99" width="12" height="5" fill="#ffd34d"/></g>
  <g class="lantern lantern-2" style="transform-origin:366px 52px"><path d="M366 52 V74" stroke="#ffd9a8" stroke-width="2"/><circle cx="366" cy="88" r="14" fill="#e0443a"/><rect x="360" y="72" width="12" height="5" fill="#ffd34d"/><rect x="360" y="99" width="12" height="5" fill="#ffd34d"/></g>
  <rect x="0" y="206" width="400" height="94" fill="url(#s2floor)"/>
  <rect x="0" y="203" width="400" height="6" fill="#6e3a22"/>
  ${floorLines(208, "#5c2f1a", 0.45)}
  ${tables}
  <g opacity="0.3"><path class="steam" d="M60 150 q-8 -14 0 -26 q8 -12 0 -24" stroke="#ffffff" stroke-width="6" stroke-linecap="round" fill="none"/><path class="steam steam-2" d="M340 150 q-8 -14 0 -26 q8 -12 0 -24" stroke="#ffffff" stroke-width="6" stroke-linecap="round" fill="none"/></g>
</svg>`;
    })();

    // 3: elevated MRT platform at sunset
    SCENES[3] = (function () {
        const rand = rng(11);
        let skyline = "";
        let wins = "";
        let tactile = "";
        let posts = "";
        let strip = '<rect x="0" y="88" width="400" height="14" fill="#f4f7fa"/><path d="M16 95 H384" stroke="#e0554d" stroke-width="3.4" stroke-linecap="round"/>';

        for (let x = -10; x < 400; x += 15) {
            const h = 14 + Math.floor(rand() * 40);
            skyline += '<rect x="' + x + '" y="' + (136 - h) + '" width="12" height="' + h + '" fill="#8fa5c8"/>';
        }

        for (let i = -2; i < 10; i++) {
            const x = i * 54 + 10;
            wins += '<rect x="' + x + '" y="124" width="34" height="30" rx="5" fill="#9ad8ff"/>';
            if (i % 2 === 0) wins += '<rect x="' + (x + 38) + '" y="120" width="12" height="52" rx="2" fill="#aab8c8"/>';
        }

        for (let x = 6; x < 400; x += 16) tactile += '<circle cx="' + x + '" cy="203" r="2.6" fill="#3b3320"/>';
        for (let i = 0; i <= 7; i++) posts += '<rect x="' + (i * 54 + 6) + '" y="104" width="4" height="80" fill="#cfd8e6"/>';
        for (let i = 0; i < 7; i++) strip += '<circle cx="' + (30 + i * 56) + '" cy="95" r="4.2" fill="#ffffff" stroke="#e0554d" stroke-width="2"/>';

        return `
<svg class="scene-svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <linearGradient id="s3sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6db4e8"/><stop offset="0.6" stop-color="#cfe6f6"/><stop offset="1" stop-color="#ffdca8"/></linearGradient>
    <linearGradient id="s3floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8996a8"/><stop offset="1" stop-color="#55627a"/></linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#s3sky)"/>
  <circle cx="86" cy="74" r="22" fill="#fff3c8" opacity="0.9"/>
  <g class="cloud cloud-b" fill="#ffffff" opacity="0.8"><ellipse cx="300" cy="58" rx="32" ry="8"/><ellipse cx="322" cy="52" rx="20" ry="7"/></g>
  ${skyline}
  <g fill="#7f97bd">
    <path d="M262 140 L266 70 L277 70 L279 140Z"/><path d="M283 140 L285 70 L296 70 L298 140Z"/><path d="M302 140 L304 70 L315 70 L317 140Z"/>
    <path d="M254 65 Q288 56 326 65 L323 72 Q288 65 257 72Z"/>
  </g>
  <g fill="none" stroke="#7f97bd" stroke-width="1.6"><circle cx="190" cy="92" r="30"/><path d="M190 62 V122 M160 92 H220 M169 71 L211 113 M211 71 L169 113"/><path d="M190 92 L176 140 M190 92 L204 140"/></g>
  <g class="train-roll"><g>
    <rect x="-60" y="112" width="560" height="74" rx="10" fill="#e3eaf2"/>
    <rect x="-60" y="164" width="560" height="9" fill="#e0554d"/>
    ${wins}
  </g></g>
  <rect x="0" y="104" width="400" height="80" fill="#cfe9ff" opacity="0.16"/>
  ${posts}
  <rect x="0" y="100" width="400" height="6" fill="#aab8c8"/>
  ${strip}
  <rect x="0" y="0" width="400" height="26" fill="#2e4a66"/>
  <rect x="0" y="22" width="400" height="5" fill="#e0554d"/>
  <rect x="148" y="27" width="104" height="22" rx="4" fill="#111826"/>
  <text class="led" x="200" y="42" text-anchor="middle" font-size="12" font-weight="700" fill="#ffb347" font-family="monospace">NEXT  2 min</text>
  <path d="M170 26 V27 M230 26 V27" stroke="#cfd8e6" stroke-width="3"/>
  <rect x="0" y="184" width="400" height="116" fill="url(#s3floor)"/>
  <rect x="0" y="182" width="400" height="6" fill="#3b4558"/>
  ${floorLines(190, "#2f3a4c", 0.4)}
  <rect x="0" y="194" width="400" height="7" fill="#ffd34d"/>
  ${tactile}
  <g class="chev"><path d="M170 250 l12 -8 12 8 M170 264 l12 -8 12 8 M214 250 l12 -8 12 8 M214 264 l12 -8 12 8" stroke="#ffd34d" stroke-width="4" fill="none" stroke-linecap="round"/></g>
</svg>`;
    })();

    window.BattleArt = {
        bosses: BOSSES,
        boss: function (zone) { return BOSSES[zone] || BOSSES[1]; },
        sprite: function (zone) { return SPRITES[zone] || SPRITES[1]; },
        scene: function (zone) { return SCENES[zone] || SCENES[1]; }
    };
})();