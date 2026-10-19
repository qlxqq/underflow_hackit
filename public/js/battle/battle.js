document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    // Reuse the shared Supabase client (works with either name).
    const db = window.supabaseClient ||
        (typeof supabase !== "undefined" && supabase.auth ? supabase : null);

    const Art = window.BattleArt;

    const DEFAULT_MIN_CARDS = 20;      // the database has the final say (battle_requirements)
    const GUIDE_KEY = "battleGuideSeen";
    const CONFETTI_COLOURS = ["#f2a93b", "#17a596", "#2f6fd6", "#ffd166", "#e0554d", "#18233a"];
    const REDUCED = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const HOME_PAGE = "../island/island.html";

    function el(id) { return document.getElementById(id); }

    const screens = {
        loading: el("screenLoading"),
        menu: el("screenMenu"),
        battle: el("screenBattle")
    };

    // ----------------------------------
    // State
    // ----------------------------------

    let state = null;              // latest battle from the database
    let clockOffset = 0;           // database clock minus this phone's clock, in ms
    let deck = [];                 // my cards (for the menu)
    let minCards = DEFAULT_MIN_CARDS;   // cards needed to unlock battles
    let haveCards = 0;             // word cards I have caught
    let totalWords = 0;            // words that exist to be found

    let shownQuestion = null;      // question id currently drawn on screen
    let bank = [];                 // [{ text, used }]
    let answer = [];               // bank positions picked, in order
    let busy = false;              // a request is in flight
    let holdingResult = false;     // the round result is on screen
    let tickTimer = null;
    let fxToken = 0;               // bumped to cancel a running effects sequence
    let playedCard = null;         // the card used in the round being answered

    // ----------------------------------
    // Small helpers
    // ----------------------------------

    function now() { return Date.now() + clockOffset; }

    function wait(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, REDUCED ? Math.min(ms, 60) : ms); });
    }

    function make(tag, className, text) {
        const node = document.createElement(tag);

        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = text;

        return node;
    }

    function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }

    function stageClass(stage) { return "stage-" + clamp(Number(stage) || 0, 0, 3); }

    function show(name) {
        Object.keys(screens).forEach(function (key) {
            screens[key].hidden = key !== name;
        });
    }

    function showMessage(text) {
        el("loadingText").textContent = text;
        document.querySelector("#screenLoading .spinner").hidden = true;
        show("loading");
    }

    function errorText(error) {
        const message = error && error.message ? String(error.message) : "";

        if (!message) return "Something went wrong. Please try again.";

        return message.charAt(0).toUpperCase() + message.slice(1);
    }

    async function rpc(name, args) {
        try {
            const result = await db.rpc(name, args || {});
            return { data: result.data, error: result.error };
        } catch (error) {
            return { data: null, error: error };
        }
    }

    function formatMult(value) {
        return "x" + (Math.round(Number(value) * 100) / 100);
    }

    function replay(node, className, ms) {
        node.classList.remove(className);
        void node.offsetWidth;
        node.classList.add(className);

        if (ms) setTimeout(function () { node.classList.remove(className); }, ms);
    }

    // ----------------------------------
    // Sound and buzz (tiny synthesised sounds, nothing to download)
    // ----------------------------------

    const sfx = (function () {
        let ctx = null;
        let on = true;

        try { on = localStorage.getItem("battleSound") !== "off"; } catch (e) { on = true; }

        function audio() {
            if (!on) return null;

            if (!ctx) {
                try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
            }

            if (ctx.state === "suspended") ctx.resume();

            return ctx;
        }

        function tone(freq, dur, type, vol, when, slideTo) {
            const c = audio();

            if (!c) return;

            const t = c.currentTime + (when || 0);
            const osc = c.createOscillator();
            const gain = c.createGain();

            osc.type = type || "square";
            osc.frequency.setValueAtTime(freq, t);
            if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);

            gain.gain.setValueAtTime(vol || 0.05, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(t);
            osc.stop(t + dur + 0.03);
        }

        function noise(dur, vol, when) {
            const c = audio();

            if (!c) return;

            const t = c.currentTime + (when || 0);
            const buffer = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);

            const source = c.createBufferSource();
            const gain = c.createGain();

            source.buffer = buffer;
            gain.gain.setValueAtTime(vol || 0.08, t);
            source.connect(gain);
            gain.connect(c.destination);
            source.start(t);
        }

        const sounds = {
            tap: function () { tone(720, 0.05, "square", 0.025); },
            pick: function () { tone(520, 0.08, "square", 0.045); tone(780, 0.1, "square", 0.045, 0.07); },
            hit: function () { noise(0.16, 0.1); tone(190, 0.18, "sawtooth", 0.07, 0, 60); },
            crit: function () {
                noise(0.2, 0.12); tone(220, 0.2, "sawtooth", 0.08, 0, 60);
                [660, 880, 1320].forEach(function (f, i) { tone(f, 0.09, "square", 0.04, 0.08 + i * 0.07); });
            },
            miss: function () { tone(320, 0.3, "triangle", 0.07, 0, 110); },
            hurt: function () { noise(0.12, 0.08); tone(150, 0.26, "sawtooth", 0.07, 0, 60); },
            wrong: function () { tone(210, 0.16, "square", 0.045); tone(150, 0.22, "square", 0.045, 0.12); },
            win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.17, "square", 0.05, i * 0.12); }); },
            lose: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0.22, "triangle", 0.07, i * 0.17); }); },
            evolve: function () { [523, 659, 784, 1047, 1319, 1568].forEach(function (f, i) { tone(f, 0.15, "sine", 0.07, i * 0.09); }); },
            intro: function () { tone(220, 0.12, "square", 0.045); tone(330, 0.12, "square", 0.045, 0.1); tone(440, 0.22, "square", 0.045, 0.2); }
        };

        return {
            play: function (name) { try { if (on && sounds[name]) sounds[name](); } catch (e) { /* sound is optional */ } },
            buzz: function (ms) { try { if (on && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* optional */ } },
            isOn: function () { return on; },
            toggle: function () {
                on = !on;
                try { localStorage.setItem("battleSound", on ? "on" : "off"); } catch (e) { /* optional */ }
                if (on) sounds.tap();
                return on;
            }
        };
    })();

    function paintSoundButton() {
        const button = el("soundButton");
        const on = sfx.isOn();

        button.textContent = on ? "🔊" : "🔇";
        button.setAttribute("aria-pressed", on ? "true" : "false");
        button.setAttribute("aria-label", on ? "Sound on" : "Sound off");
    }

    // ----------------------------------
    // Text box (types out one letter at a time)
    // ----------------------------------

    let typeTimer = null;
    let typeResolve = null;
    let typeFull = "";

    function finishTyping() {
        if (typeTimer) {
            clearInterval(typeTimer);
            typeTimer = null;
        }

        if (typeResolve) {
            el("dialogText").textContent = typeFull;
            el("dialog").classList.add("is-done");

            const done = typeResolve;
            typeResolve = null;
            done();
        }
    }

    function say(text) {
        finishTyping();

        return new Promise(function (resolve) {
            const box = el("dialogText");
            const chars = Array.from(text);

            typeFull = text;
            el("srLine").textContent = text;
            el("dialog").classList.remove("is-done");

            if (REDUCED || chars.length === 0) {
                box.textContent = text;
                el("dialog").classList.add("is-done");
                resolve();
                return;
            }

            let shown = 0;

            box.textContent = "";
            typeResolve = resolve;

            typeTimer = setInterval(function () {
                shown += 1;
                box.textContent = chars.slice(0, shown).join("");
                if (shown >= chars.length) finishTyping();
            }, 20);
        });
    }

    // ----------------------------------
    // Trading cards
    // ----------------------------------

    function buildCard(card, options) {
        const mini = !!(options && options.mini);
        const node = make(mini ? "div" : "button", "tcg " + stageClass(card.stage) + (mini ? " mini" : ""));
        const face = make("span", "tcg-face");
        const head = make("span", "tcg-head");
        const power = make("span", "tcg-power", String(card.power));
        const art = make("span", "tcg-art");
        const foot = make("span", "tcg-foot");
        const stars = clamp(Number(card.stage) || 0, 0, 3);

        if (!mini) node.type = "button";

        power.insertBefore(make("small", "", "\u2694\uFE0E"), power.firstChild);

        head.appendChild(make("span", "tcg-stage", card.stage_label || "Stage " + card.stage));
        head.appendChild(power);

        art.appendChild(make("span", "tcg-word", card.word));

        foot.appendChild(make("span", "", "★".repeat(stars) + "☆".repeat(3 - stars)));
        foot.appendChild(make("span", "", card.uses ? card.uses + " uses" : "new"));

        face.appendChild(head);
        face.appendChild(art);
        face.appendChild(make("span", "tcg-pinyin", card.romanization || ""));
        face.appendChild(make("span", "tcg-text", card.meaning || ""));
        face.appendChild(foot);

        node.appendChild(face);
        node.appendChild(make("span", "tcg-foil"));
        node.appendChild(make("span", "tcg-glare"));

        node.setAttribute("aria-label", card.word + ", " + (card.meaning || "") + ", attack " + card.power);

        if (!mini) addTilt(node);

        return node;
    }

    // the card leans towards your finger and the foil catches the light
    function addTilt(node) {
        function move(event) {
            const rect = node.getBoundingClientRect();
            const px = clamp((event.clientX - rect.left) / rect.width, 0, 1);
            const py = clamp((event.clientY - rect.top) / rect.height, 0, 1);

            node.classList.add("is-tilting");
            node.style.setProperty("--ry", (px - 0.5) * 26 + "deg");
            node.style.setProperty("--rx", (0.5 - py) * 26 + "deg");
            node.style.setProperty("--mx", px * 100 + "%");
            node.style.setProperty("--my", py * 100 + "%");
        }

        function rest() {
            node.classList.remove("is-tilting");
            node.style.removeProperty("--ry");
            node.style.removeProperty("--rx");
            node.style.removeProperty("--mx");
            node.style.removeProperty("--my");
        }

        node.addEventListener("pointermove", move);
        node.addEventListener("pointerdown", move);
        node.addEventListener("pointerleave", rest);
        node.addEventListener("pointercancel", rest);
        node.addEventListener("pointerup", function () { setTimeout(rest, 120); });
    }

    // ----------------------------------
    // Menu: pick a boss, see the deck
    // ----------------------------------

    function renderMenu() {
        const enough = haveCards >= minCards;
        const list = el("bossList");
        const strip = el("deckStrip");

        list.replaceChildren();

        [1, 2, 3].forEach(function (zone) {
            const boss = Art.boss(zone);
            const button = make("button", "boss-card" + (enough ? "" : " is-locked"));
            const face = make("span", "boss-face zone-" + zone);
            const sprite = make("span", "mini-sprite");

            button.type = "button";
            button.disabled = !enough;

            sprite.innerHTML = Art.sprite(zone);     // our own drawing, not user data
            face.appendChild(sprite);
            button.appendChild(face);

            const text = make("span", "boss-text");
            text.appendChild(make("p", "boss-title", boss.name));
            text.appendChild(make("p", "boss-zone", boss.zone));

            const stats = make("span", "boss-stats");
            stats.appendChild(make("span", "stat", "Lv " + boss.level));
            stats.appendChild(make("span", "stat", "HP " + boss.hp));
            stats.appendChild(make("span", "stat", "ATK " + boss.attack));
            text.appendChild(stats);

            button.appendChild(text);
            button.appendChild(make("span", "go", enough ? "›" : "🔒"));

            button.addEventListener("click", function () { sfx.play("tap"); startBattle(zone); });

            list.appendChild(button);
        });

        strip.replaceChildren();
        deck.forEach(function (card) { strip.appendChild(buildCard(card, { mini: true })); });

        el("deckCount").textContent = deck.length + (deck.length === 1 ? " card" : " cards");
        el("deckEmpty").hidden = deck.length > 0;
        strip.hidden = deck.length === 0;

        renderLock(enough);

        show("menu");
    }

    function renderLock(enough) {
        const panel = el("lockPanel");
        const missing = Math.max(0, minCards - haveCards);
        const left = Math.max(0, totalWords - haveCards);
        const line = el("collectLine");

        panel.hidden = enough;
        el("menuIntro").textContent = enough
            ? "Play a word card, then use that word in a correct sentence to land the hit."
            : "The bosses are locked for now. Catch more word cards first.";

        if (!enough) {
            const percent = Math.min(100, Math.round((haveCards / minCards) * 100));

            el("lockTitle").textContent = "Battles unlock at " + minCards + " word cards";
            el("lockFill").style.width = percent + "%";
            el("lockCount").textContent = haveCards + " / " + minCards + " cards";
            el("lockBar").setAttribute("aria-valuemax", String(minCards));
            el("lockBar").setAttribute("aria-valuenow", String(Math.min(haveCards, minCards)));
            el("lockText").textContent = "Win " + missing + " more word card" + (missing === 1 ? "" : "s") +
                " in the island mini-games to unlock the bosses." +
                (left > 0 ? " There are still " + left + " words out there to discover." : "");
        }

        line.hidden = !(enough && totalWords > 0);

        if (!line.hidden) {
            line.textContent = left > 0
                ? "Words caught: " + haveCards + " of " + totalWords + ". Keep playing the island mini-games to find the other " + left + "."
                : "You have caught every word on the island. Nice!";
        }
    }

    async function loadMenu() {
        const [deckResult, reqResult] = await Promise.all([rpc("battle_deck"), rpc("battle_requirements")]);

        if (deckResult.error) {
            showMessage(errorText(deckResult.error));
            return;
        }

        deck = Array.isArray(deckResult.data) ? deckResult.data : [];

        // If battle.sql was not re-run yet, fall back to counting the deck.
        const req = !reqResult.error && reqResult.data ? reqResult.data : null;

        minCards = req && Number(req.min_cards) > 0 ? Number(req.min_cards) : DEFAULT_MIN_CARDS;
        haveCards = req && req.have !== undefined ? Number(req.have) : deck.length;
        totalWords = req && req.total_words !== undefined ? Number(req.total_words) : 0;

        renderMenu();
        maybeShowGuide();
    }

    async function startBattle(zone) {
        if (busy) return;

        busy = true;
        el("menuStatus").textContent = "";
        el("menuStatus").classList.remove("is-error");

        const { data, error } = await rpc("battle_start", { p_zone: zone });

        if (error || !data) {
            busy = false;
            el("menuStatus").textContent = errorText(error);
            el("menuStatus").classList.add("is-error");
            return;
        }

        const loaded = await rpc("battle_state", { p_battle: data });

        busy = false;

        if (loaded.error || !loaded.data) {
            el("menuStatus").textContent = errorText(loaded.error);
            el("menuStatus").classList.add("is-error");
            return;
        }

        el("endOverlay").hidden = true;
        enterBattle(loaded.data, true);
    }

    // ----------------------------------
    // Stage: scene, boss, plates, bars
    // ----------------------------------

    function stageSetup(zone) {
        const boss = Art.boss(zone);

        el("scene").innerHTML = Art.scene(zone);          // our own drawings, not user data
        el("bossSprite").innerHTML = Art.sprite(zone);
        el("spriteWrap").className = "sprite-wrap";
        el("bannerName").textContent = boss.name;
        el("bannerZone").textContent = boss.zone + " boss";
        el("bossLv").textContent = "Lv " + boss.level;
    }

    function paintBar(fillId, ghostId, hp, max, instant) {
        const fill = el(fillId);
        const ghost = el(ghostId);
        const percent = max > 0 ? clamp((hp / max) * 100, 0, 100) : 0;

        if (instant) {
            ghost.style.transition = "none";
            fill.style.transition = "none";
        }

        fill.style.width = percent + "%";
        ghost.style.width = percent + "%";

        fill.classList.toggle("is-mid", percent <= 50 && percent > 25);
        fill.classList.toggle("is-low", percent <= 25);

        if (instant) {
            void fill.offsetWidth;
            ghost.style.transition = "";
            fill.style.transition = "";
        }
    }

    function paintBoss(hp, instant) {
        const boss = state.boss;

        paintBar("bossHpFill", "bossHpGhost", hp, boss.max, instant);
        el("bossHpText").textContent = hp + " / " + boss.max;
        el("spriteWrap").classList.toggle("is-angry", hp > 0 && hp / boss.max <= 0.4);
    }

    function paintMe(hp, instant) {
        paintBar("meHpFill", "meHpGhost", hp, state.player.max, instant);
        el("meHpText").textContent = hp + " / " + state.player.max;
    }

    function paintCombo() {
        const badge = el("comboBadge");
        const combo = state.combo || 0;

        if (combo < 1) {
            badge.hidden = true;
            return;
        }

        const wasHidden = badge.hidden;

        badge.textContent = "Combo " + combo + " +" + Math.min(combo, 5) * 10 + "%";
        badge.hidden = false;

        if (!wasHidden) replay(badge, "combo-badge");
    }

    function renderHud(instant) {
        el("bossName").textContent = state.boss.name;
        el("roundChip").textContent = "Round " + state.round;

        paintBoss(state.boss.hp, instant);
        paintMe(state.player.hp, instant);
        paintCombo();
    }

    // position of an element's centre inside the stage
    function inStage(node) {
        const a = node.getBoundingClientRect();
        const s = el("stage").getBoundingClientRect();

        return { x: a.left - s.left + a.width / 2, y: a.top - s.top + a.height / 2 };
    }

    function layer(node) {
        el("fx").appendChild(node);
        setTimeout(function () { node.remove(); }, 1700);
    }

    function floatText(point, text, className) {
        const node = make("div", "dmg " + (className || ""), text);

        node.style.left = point.x + "px";
        node.style.top = point.y + "px";
        layer(node);
    }

    function burst(point, colours, count) {
        for (let i = 0; i < count; i++) {
            const spark = make("i", "spark");
            const angle = Math.random() * Math.PI * 2;
            const distance = 40 + Math.random() * 80;

            spark.style.left = point.x + "px";
            spark.style.top = point.y + "px";
            spark.style.setProperty("--c", colours[i % colours.length]);
            spark.style.setProperty("--dx", Math.cos(angle) * distance + "px");
            spark.style.setProperty("--dy", Math.sin(angle) * distance + "px");
            spark.style.setProperty("--rot", Math.random() * 360 + "deg");
            layer(spark);
        }
    }

    function ring(point, colour) {
        const node = make("i", "ring");

        node.style.left = point.x + "px";
        node.style.top = point.y + "px";
        node.style.setProperty("--c", colour);
        layer(node);
    }

    function slash(point) {
        [-38, 32].forEach(function (rotation, i) {
            const node = make("i", "slash");

            node.style.left = point.x + (i ? 10 : -6) + "px";
            node.style.top = point.y + (i ? 12 : -8) + "px";
            node.style.setProperty("--rot", rotation + "deg");
            node.style.animationDelay = i * 0.07 + "s";
            layer(node);
        });
    }

    function flash() { replay(el("flash"), "is-on", 320); }
    function redFlash() { replay(el("vignette"), "is-on", 720); }
    function shake(crit) { replay(el("stage"), crit ? "is-crit" : "is-shake", 520); }

    function bossReact(name, ms) { replay(el("spriteWrap"), name, ms); }

    // the card that flies from your hand to the boss
    function launchCard(fromRect, card) {
        return new Promise(function (resolve) {
            if (!fromRect || REDUCED) {
                resolve();
                return;
            }

            const target = el("spriteWrap").getBoundingClientRect();
            const shot = make("div", "shot", card.word);
            const w = 54;
            const h = 72;
            const startX = fromRect.left + fromRect.width / 2 - w / 2;
            const startY = fromRect.top + fromRect.height / 2 - h / 2;
            const dx = target.left + target.width / 2 - w / 2 - startX;
            const dy = target.top + target.height / 2 - h / 2 - startY;

            shot.style.left = startX + "px";
            shot.style.top = startY + "px";
            shot.style.width = w + "px";
            shot.style.height = h + "px";
            document.body.appendChild(shot);
            void shot.offsetWidth;

            shot.style.transform = "translate(" + dx + "px, " + dy + "px) rotate(540deg) scale(0.35)";
            shot.style.opacity = "0.9";

            setTimeout(function () { shot.remove(); resolve(); }, 440);
        });
    }

    // ----------------------------------
    // Battle: entering and routing
    // ----------------------------------

    function setStageMode(mode) {
        const battle = el("screenBattle");

        battle.classList.toggle("is-compact", mode === "answer" || mode === "result");
        battle.classList.toggle("is-answering", mode === "answer");
    }

    function hideAllPanels() {
        el("pickPanel").hidden = true;
        el("answerPanel").hidden = true;
        el("answerPanel").classList.remove("is-sent");
        el("resultPanel").hidden = true;
    }

    async function enterBattle(data, withIntro) {
        const token = ++fxToken;

        state = data;
        if (data.server_now) clockOffset = Date.parse(data.server_now) - Date.now();

        holdingResult = false;
        shownQuestion = null;
        stopTick();
        hideAllPanels();
        finishTyping();

        el("battleStatus").textContent = "";
        el("endOverlay").hidden = true;
        el("evolveOverlay").hidden = true;

        stageSetup(data.zone);
        setStageMode("pick");
        renderHud(true);
        show("battle");

        if (!withIntro || data.status !== "active") {
            route();
            return;
        }

        const boss = Art.boss(data.zone);

        replay(el("spriteWrap"), "is-enter", 1000);
        replay(el("banner"), "is-on", 1950);
        sfx.play("intro");
        say(boss.intro);

        await wait(1700);

        if (token === fxToken) route();
    }

    function route() {
        stopTick();
        hideAllPanels();

        if (state.status !== "active") {
            showEnd();
            return;
        }

        if (state.phase === "answer" && state.question) {
            showAnswerPhase();
        } else {
            showPickPhase();
        }
    }

    // ----------------------------------
    // Phase 1: choose a card
    // ----------------------------------

    function showPickPhase() {
        const hand = el("hand");
        const combo = state.combo || 0;

        // the next question may be the same one again: always start it with a fresh word bank
        shownQuestion = null;

        setStageMode("pick");
        hand.replaceChildren();

        (state.hand || []).forEach(function (card) {
            const node = buildCard(card);

            node.addEventListener("click", function () { playCard(card, node); });
            hand.appendChild(node);
        });

        el("pickSub").textContent = combo > 0
            ? "Combo " + combo + ": a first-try hit adds +10% damage."
            : "Use its word in a correct sentence to hit.";

        el("battleStatus").textContent = "";
        el("pickPanel").hidden = false;

        say(combo > 1
            ? "Combo x" + combo + "! Choose a card."
            : "Round " + state.round + ". Choose a card!");
    }

    async function playCard(card, node) {
        if (busy) return;

        busy = true;
        sfx.play("pick");
        sfx.buzz(12);

        Array.prototype.forEach.call(el("hand").querySelectorAll(".tcg"), function (other) {
            other.disabled = true;
            other.classList.add(other === node ? "is-picked" : "is-dim");
        });

        const [result] = await Promise.all([
            rpc("battle_play", { p_battle: state.id, p_card_id: card.card_id }),
            wait(420)
        ]);

        busy = false;

        const { data, error } = result;

        if (error || !data) {
            el("battleStatus").textContent = errorText(error);
            el("battleStatus").classList.add("is-error");
            await resync();
            return;
        }

        el("battleStatus").classList.remove("is-error");
        applyState(data);
        route();
    }

    function applyState(data) {
        state = data;

        if (data.server_now) clockOffset = Date.parse(data.server_now) - Date.now();

        renderHud(false);
    }

    async function resync() {
        const { data } = await rpc("battle_state", { p_battle: state.id });

        if (data) {
            applyState(data);
            shownQuestion = null;
            route();
        }
    }

    // ----------------------------------
    // Phase 2: build the sentence
    // ----------------------------------

    function shuffled(list, avoidOrder) {
        const copy = list.slice();

        for (let attempt = 0; attempt < 6; attempt++) {
            for (let i = copy.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const swap = copy[i];
                copy[i] = copy[j];
                copy[j] = swap;
            }

            if (copy.length < 2 || copy.join("\u0000") !== avoidOrder.join("\u0000")) break;
        }

        return copy;
    }

    function showAnswerPhase() {
        const card = state.card;
        const question = state.question;

        setStageMode("answer");

        // the card being played
        const playing = el("playingCard");
        playing.replaceChildren();

        const box = make("div", "playing-card " + stageClass(card.stage));
        box.appendChild(make("span", "pc-word", card.word));

        const text = make("span", "pc-text");
        text.appendChild(make("p", "pc-pinyin", card.romanization || ""));
        text.appendChild(make("p", "pc-meaning", card.meaning || ""));
        box.appendChild(text);
        box.appendChild(make("span", "pc-power", "\u2694\uFE0E " + card.power));
        playing.appendChild(box);

        el("offTheme").hidden = state.on_theme !== false;
        el("promptText").textContent = question.prompt;

        // a new question gets a new, shuffled word bank
        if (shownQuestion !== question.id) {
            const texts = Array.isArray(question.tiles) ? question.tiles.map(String) : [];

            shownQuestion = question.id;
            bank = shuffled(texts, texts).map(function (t) { return { text: t, used: false }; });
            answer = [];
        }

        el("answerArea").classList.remove("is-wrong");
        el("answerMessage").textContent = "";

        renderTries();
        renderTiles();

        el("answerPanel").hidden = false;
        startTick();

        say(card.word + " is ready! Build a sentence with it.");
    }

    function renderTries() {
        const box = el("tries");
        const spent = state.tries || 0;

        box.replaceChildren();

        for (let i = 0; i < 2; i++) {
            box.appendChild(make("span", "try-pip" + (i < spent ? " is-spent" : "")));
        }

        box.setAttribute("aria-label", (2 - spent) + (2 - spent === 1 ? " try left" : " tries left"));
    }

    function canPlay() {
        return !busy && state && state.status === "active" && state.phase === "answer";
    }

    function renderTiles() {
        const bankBox = el("wordBank");
        const answerBox = el("answerArea");
        const playable = canPlay();

        bankBox.replaceChildren();

        bank.forEach(function (tile, position) {
            const button = make("button", "tile" + (tile.used ? " is-used" : ""), tile.text);

            button.type = "button";
            button.disabled = tile.used || !playable;
            button.addEventListener("click", function () { pickTile(position); });

            bankBox.appendChild(button);
        });

        Array.prototype.slice.call(answerBox.querySelectorAll(".tile")).forEach(function (node) {
            node.remove();
        });

        answer.forEach(function (position, slot) {
            const button = make("button", "tile in-answer", bank[position].text);

            button.type = "button";
            button.disabled = !playable;
            button.addEventListener("click", function () { removeTile(slot); });

            answerBox.appendChild(button);
        });

        el("answerPlaceholder").hidden = answer.length > 0;
        el("resetButton").disabled = !playable || answer.length === 0;
        el("attackButton").disabled = !playable || answer.length === 0;
    }

    function pickTile(position) {
        if (!canPlay() || bank[position].used) return;

        sfx.play("tap");
        bank[position].used = true;
        answer.push(position);
        el("answerArea").classList.remove("is-wrong");
        el("answerMessage").textContent = "";
        renderTiles();
    }

    function removeTile(slot) {
        if (!canPlay()) return;

        const position = answer.splice(slot, 1)[0];
        bank[position].used = false;
        renderTiles();
    }

    function resetAnswer() {
        if (!canPlay()) return;

        bank.forEach(function (tile) { tile.used = false; });
        answer = [];
        el("answerArea").classList.remove("is-wrong");
        el("answerMessage").textContent = "";
        renderTiles();
    }

    // speed bonus bar: x1.25 for 10s, x1.1 until 20s, then x1.0
    function startTick() {
        stopTick();
        tick();
        tickTimer = setInterval(tick, 100);
    }

    function stopTick() {
        if (tickTimer) clearInterval(tickTimer);
        tickTimer = null;
    }

    function tick() {
        if (!state || !state.question_started_at) return;

        const elapsed = Math.max(0, (now() - Date.parse(state.question_started_at)) / 1000);
        const speed = el("speedFill").closest(".speed");
        let left;
        let label;

        if (elapsed <= 10) {
            left = 1 - elapsed / 10;
            label = "x1.25";
        } else if (elapsed <= 20) {
            left = 1 - (elapsed - 10) / 10;
            label = "x1.1";
        } else {
            left = 0;
            label = "x1.0";
        }

        el("speedFill").style.width = Math.max(0, left * 100) + "%";
        el("speedLabel").textContent = label;
        speed.classList.toggle("is-slow", elapsed > 20);
    }

    async function attack() {
        if (!canPlay() || answer.length === 0) return;

        const sentence = answer.map(function (position) { return bank[position].text; }).join("");
        const startRect = el("playingCard").firstElementChild
            ? el("playingCard").firstElementChild.getBoundingClientRect()
            : null;

        playedCard = state.card;
        busy = true;
        renderTiles();
        el("attackButton").disabled = true;
        el("answerMessage").textContent = "";

        const { data, error } = await rpc("battle_answer", { p_battle: state.id, p_answer: sentence });

        busy = false;

        if (error || !data) {
            el("answerMessage").textContent = errorText(error);
            await resync();
            return;
        }

        const event = data.last_event || {};

        // wrong, but there is a second try
        if (data.status === "active" && data.phase === "answer" && event.result === "wrong") {
            applyState(data);
            renderTries();

            sfx.play("wrong");
            sfx.buzz(40);
            el("answerArea").classList.add("is-wrong");
            el("answerMessage").textContent = "Not quite. One try left, but a second-try hit does less damage.";
            renderTiles();
            say("Not quite... one more try!");
            bossReact("is-taunt", 700);

            setTimeout(function () {
                if (state && state.phase === "answer") {
                    bank.forEach(function (tile) { tile.used = false; });
                    answer = [];
                    renderTiles();
                }
            }, 900);

            return;
        }

        resolveRound(data, startRect);
    }

    // ----------------------------------
    // Round result and the fight animation
    // ----------------------------------

    function addChip(box, text, kind) {
        box.appendChild(make("span", "mult" + (kind ? " " + kind : ""), text));
    }

    function buildResult(previous, data) {
        const event = data.last_event || {};
        const hit = event.result === "hit";
        const mult = event.mult || {};
        const panel = el("resultPanel");

        panel.classList.toggle("is-hit", hit);
        panel.classList.toggle("is-miss", !hit);

        el("resultTitle").textContent = hit ? (event.perfect ? "Direct hit!" : "Hit!") : "Missed!";
        el("resultDamage").textContent = hit ? "-" + (event.damage || 0) : "0";

        const chips = el("resultChips");
        chips.replaceChildren();

        if (hit) {
            addChip(chips, "Card power " + event.power);
            if ((mult.speed || 1) > 1) addChip(chips, "Speed " + formatMult(mult.speed), "up");
            if ((mult.combo || 1) > 1) addChip(chips, "Combo " + formatMult(mult.combo), "up");
            if ((mult.retry || 1) < 1) addChip(chips, "Second try " + formatMult(mult.retry), "down");
            if ((mult.theme || 1) < 1) addChip(chips, "Off-topic " + formatMult(mult.theme), "down");
        } else {
            addChip(chips, "Both tries wrong", "down");
            if ((previous.combo || 0) > 0) addChip(chips, "Combo lost", "down");
        }

        el("resultSentenceLabel").textContent = hit ? "Your sentence" : "A correct sentence";
        el("resultSentence").textContent = hit ? (event.sentence || event.answer || "") : (event.answer || "");
        el("resultNote").textContent = event.explanation || "";

        el("nextButton").textContent = data.status === "active" ? "Next round" : "Continue";
    }

    async function resolveRound(data, startRect) {
        const previous = state;
        const event = data.last_event || {};
        const hit = event.result === "hit";
        const mult = event.mult || {};
        const damage = event.damage || 0;
        const bossDamage = event.boss_damage || 0;
        const info = Art.boss(data.zone);
        const token = ++fxToken;
        const live = function () { return token === fxToken; };
        const crit = hit && event.perfect && (mult.speed || 1) > 1;

        stopTick();
        holdingResult = true;

        // keep the new numbers for later, but leave the bars where they were until the hit lands
        state = data;
        if (data.server_now) clockOffset = Date.parse(data.server_now) - Date.now();

        buildResult(previous, data);

        // 1. the card flies at the boss
        el("answerPanel").classList.add("is-sent");
        await launchCard(startRect, { word: event.word || (playedCard && playedCard.word) || "" });
        if (!live()) return;

        // 2. impact (the result panel shows up now)
        el("answerPanel").hidden = true;
        el("answerPanel").classList.remove("is-sent");
        setStageMode("result");
        el("resultPanel").hidden = false;
        el("resultPanel").scrollIntoView({ block: "nearest", behavior: "smooth" });

        const bossPoint = inStage(el("spriteWrap"));

        if (hit) {
            sfx.play(crit ? "crit" : "hit");
            sfx.buzz(crit ? 60 : 30);
            flash();
            slash(bossPoint);
            ring(bossPoint, "#ffffff");
            burst(bossPoint, ["#ffffff", "#ffd34d", "#ffb347", "#7cf0d4"], 16);
            shake(crit);
            bossReact("is-hit", 600);
            floatText(bossPoint, "-" + damage, crit ? "crit" : "");

            if (crit) floatText({ x: bossPoint.x, y: bossPoint.y + 42 }, "QUICK!", "tag");
            else if ((mult.combo || 1) > 1) floatText({ x: bossPoint.x, y: bossPoint.y + 42 }, "COMBO x" + event.combo_after, "tag");

            paintBoss(data.boss.hp, false);
            say(event.word + " hit " + info.name + " for " + damage + "!" + (crit ? " Lightning fast!" : ""));
        } else {
            sfx.play("miss");
            floatText(bossPoint, "Miss", "miss");
            bossReact("is-taunt", 1100);
            say("The sentence fell apart... " + info.taunt);
        }

        await wait(1300);
        if (!live()) return;

        // 3. the boss reacts
        if (data.status === "won") {
            sfx.play("win");
            bossReact("is-dead");
            burst(bossPoint, ["#ffffff", "#ffd34d", "#7cf0d4", "#ff8fb3"], 26);
            ring(bossPoint, "#ffd34d");
            await say(info.defeat);
        } else if (bossDamage > 0) {
            await say(info.name + " used " + info.move + "!");
            if (!live()) return;

            bossReact("is-attack", 750);
            await wait(380);
            if (!live()) return;

            sfx.play("hurt");
            sfx.buzz(70);
            redFlash();
            shake(false);
            replay(el("mePlate"), "is-hit", 500);
            floatText(inStage(el("mePlate")), "-" + bossDamage, "hurt");
            paintMe(data.player.hp, false);
            say("You lost " + bossDamage + " HP.");

            if (data.status === "lost") {
                await wait(1100);
                if (!live()) return;

                sfx.play("lose");
                bossReact("is-taunt", 1400);
                await say("You are out of HP...");
            }
        }

        // 4. a card grew
        if (event.evolved && live()) {
            await wait(500);
            if (!live()) return;
            await showEvolve(event.evolved);
        }
    }

    function nextRound() {
        // cancel any effects that are still running and show the true state
        fxToken += 1;
        finishTyping();
        holdingResult = false;

        el("resultPanel").hidden = true;
        el("spriteWrap").classList.remove("is-hit", "is-attack", "is-taunt", "is-enter");
        renderHud(true);
        route();
    }

    // ----------------------------------
    // Card evolution
    // ----------------------------------

    function showEvolve(evo) {
        return new Promise(function (resolve) {
            const overlay = el("evolveOverlay");
            const holder = el("evolveCard");
            const old = playedCard || { word: evo.word, stage: evo.stage - 1, stage_label: "", uses: 0, power: 0, romanization: "", meaning: "" };
            const oldStage = Math.max(0, evo.stage - 1);
            const uses = (old.uses || 0) + 1;
            const gained = 4 * (evo.stage - old.stage) +
                (Math.floor(Math.min(uses, 30) / 3) - Math.floor(Math.min(uses - 1, 30) / 3));

            const before = Object.assign({}, old, { uses: uses, stage: Math.min(old.stage, oldStage) });
            const after = Object.assign({}, old, {
                stage: evo.stage,
                stage_label: evo.label,
                uses: uses,
                power: (old.power || 0) + gained
            });

            holder.classList.remove("is-done");
            holder.replaceChildren(buildCard(before, { mini: true }));
            el("evolveTitle").textContent = "What? " + evo.word + " is evolving!";
            el("evolveSub").textContent = "";
            el("evolveButton").hidden = true;
            overlay.hidden = false;
            sfx.play("evolve");

            setTimeout(function () {
                holder.replaceChildren(buildCard(after, { mini: true }));
                holder.classList.add("is-done");

                for (let i = 0; i < 18; i++) {
                    const spark = make("i", "evolve-spark");
                    const angle = (i / 18) * Math.PI * 2;
                    const distance = 90 + Math.random() * 60;

                    spark.style.setProperty("--dx", Math.cos(angle) * distance + "px");
                    spark.style.setProperty("--dy", Math.sin(angle) * distance + "px");
                    spark.style.setProperty("--rot", Math.random() * 360 + "deg");
                    holder.appendChild(spark);
                }

                el("evolveTitle").textContent = "Congratulations!";
                el("evolveSub").textContent = evo.word + " evolved into " + evo.label + "!";
                sfx.buzz(80);

                const button = el("evolveButton");
                button.hidden = false;
                button.focus();

                button.onclick = function () {
                    overlay.hidden = true;
                    resolve();
                };
            }, REDUCED ? 100 : 1500);
        });
    }

    // ----------------------------------
    // Victory / defeat
    // ----------------------------------

    function launchConfetti() {
        const box = el("confetti");

        box.replaceChildren();

        for (let i = 0; i < 46; i++) {
            const piece = document.createElement("i");

            piece.style.left = Math.random() * 100 + "%";
            piece.style.background = CONFETTI_COLOURS[i % CONFETTI_COLOURS.length];
            piece.style.animationDuration = 1.8 + Math.random() * 1.8 + "s";
            piece.style.animationDelay = Math.random() * 0.8 + "s";

            box.appendChild(piece);
        }
    }

    function roundsPlayed() {
        const event = state.last_event || {};
        return Number(event.round) || Number(state.round) || 1;
    }

    function showEnd() {
        const overlay = el("endOverlay");
        const won = state.status === "won";
        const info = Art.boss(state.zone);

        overlay.classList.toggle("is-won", won);
        overlay.classList.toggle("is-lost", !won);

        el("endEmoji").textContent = won ? "🏆" : (state.status === "lost" ? "💫" : "🏳️");
        el("endTitle").textContent = won ? "Victory!" : (state.status === "lost" ? "Defeated" : "Battle over");

        if (won) {
            const rounds = roundsPlayed();
            el("endSub").textContent = "You beat " + info.name + " in " + rounds + (rounds === 1 ? " round." : " rounds.");
        } else if (state.status === "lost") {
            el("endSub").textContent = info.name + " wore you down. Try again with a fresh hand.";
        } else {
            el("endSub").textContent = "This battle was ended.";
        }

        el("endXp").textContent = state.xp_gained > 0 ? "+" + state.xp_gained + " XP" : "";

        const evolutions = el("endEvolutions");
        evolutions.replaceChildren();

        (state.evolutions || []).forEach(function (evo) {
            evolutions.appendChild(make("div", "evo", evo.word + " evolved to " + evo.label));
        });

        if (won) launchConfetti();
        else el("confetti").replaceChildren();

        el("againButton").disabled = false;
        el("againButton").textContent = "Battle again";
        overlay.hidden = false;
    }

    async function battleAgain() {
        if (busy || !state) return;

        const zone = state.zone;
        const button = el("againButton");

        busy = true;
        button.disabled = true;

        const started = await rpc("battle_start", { p_zone: zone });

        if (started.error || !started.data) {
            busy = false;
            button.disabled = false;
            el("endSub").textContent = errorText(started.error);
            return;
        }

        const loaded = await rpc("battle_state", { p_battle: started.data });

        busy = false;

        if (loaded.error || !loaded.data) {
            button.disabled = false;
            el("endSub").textContent = errorText(loaded.error);
            return;
        }

        el("endOverlay").hidden = true;
        enterBattle(loaded.data, true);
    }

    // ----------------------------------
    // Leaving a battle
    // ----------------------------------

    function leaveDialog() {
        const overlay = make("div", "end-overlay");
        const card = make("div", "end-card");

        card.setAttribute("role", "dialog");
        card.setAttribute("aria-modal", "true");
        card.appendChild(make("div", "end-emoji", "🚪"));
        card.appendChild(make("h2", "end-title", "Leave the battle?"));
        card.appendChild(make("p", "end-sub",
            "Leave for now and you can pick up where you stopped. Give up and the battle ends with no XP."));

        const actions = make("div", "end-actions");
        const stay = make("button", "btn btn-primary", "Keep fighting");
        const pause = make("button", "btn btn-outline", "Leave for now");
        const quit = make("button", "btn btn-outline", "Give up");

        [stay, pause, quit].forEach(function (b) { b.type = "button"; actions.appendChild(b); });
        card.appendChild(actions);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        stay.focus();

        stay.addEventListener("click", function () { overlay.remove(); });

        pause.addEventListener("click", function () {
            window.location.href = HOME_PAGE;
        });

        quit.addEventListener("click", async function () {
            quit.disabled = true;

            await rpc("battle_forfeit", { p_battle: state.id });
            window.location.href = HOME_PAGE;
        });
    }

    function onBackClick(event) {
        const inFight = state && state.status === "active" && !screens.battle.hidden;

        if (!inFight) return;

        event.preventDefault();
        leaveDialog();
    }

    // ----------------------------------
    // How to play (first visit, and the ? button)
    // ----------------------------------

    const SAMPLE_CARDS = [
        { word: "电梯", romanization: "diàn tī", meaning: "lift", power: 12, stage: 0, stage_label: "Basic", uses: 0 },
        { word: "米饭", romanization: "mǐ fàn", meaning: "rice", power: 21, stage: 1, stage_label: "Grown", uses: 4 },
        { word: "地铁", romanization: "dì tiě", meaning: "MRT", power: 33, stage: 2, stage_label: "Elite", uses: 11 }
    ];

    const GUIDE = [
        {
            title: "Welcome to Card Battle",
            art: "boss",
            body: [
                "Street bosses are blocking the way around the island. Beat them with the word cards you have caught.",
                "Win to earn XP. You need " + DEFAULT_MIN_CARDS + " word cards to unlock battles."
            ]
        },
        {
            title: "1. Play a card",
            art: "cards",
            body: [
                "Each round you get 3 cards from your deck. Pick one.",
                "Higher stage cards hit harder. The word on the card is the word you have to use."
            ]
        },
        {
            title: "2. Build the sentence",
            art: "tiles",
            body: [
                "Tap the words in the right order to make a correct sentence that uses your card's word, then press Attack.",
                "You get 2 tries. Answering fast gives a speed bonus, and the clock keeps running even if you open this guide.",
                "If no question uses your card's word, the hit is only half strength."
            ]
        },
        {
            title: "3. Watch your HP",
            art: "hearts",
            body: [
                "You have 100 HP. If the boss survives your hit, it hits back: a little if you got it right first time, more on the second try, and a lot if you miss.",
                "Chain right answers for a combo bonus. Run out of HP and you lose the fight."
            ]
        },
        {
            title: "4. Evolve your cards",
            art: "evolve",
            body: [
                "Every hit gives the card +1 use. Use a card enough and it evolves into a stronger stage.",
                "A win gives 30 to 40 XP, a loss still gives 5 XP, and you always keep your cards."
            ]
        }
    ];

    let guideIndex = 0;
    let guideReturnFocus = null;

    function guideSeen() {
        try { return localStorage.getItem(GUIDE_KEY) === "1"; } catch (e) { return false; }
    }

    function markGuideSeen() {
        try { localStorage.setItem(GUIDE_KEY, "1"); } catch (e) { /* optional */ }
    }

    function guideArt(kind) {
        const holder = el("guideArt");

        holder.replaceChildren();
        holder.className = "guide-art art-" + kind;

        if (kind === "boss") {
            const face = make("span", "boss-face zone-1");
            const sprite = make("span", "mini-sprite");

            sprite.innerHTML = Art.sprite(1);        // our own drawing
            face.appendChild(sprite);
            holder.appendChild(face);
        } else if (kind === "cards") {
            SAMPLE_CARDS.forEach(function (card) { holder.appendChild(buildCard(card, { mini: true })); });
        } else if (kind === "evolve") {
            holder.appendChild(buildCard(SAMPLE_CARDS[1], { mini: true }));
            holder.appendChild(make("span", "guide-arrow", "➜"));
            holder.appendChild(buildCard(SAMPLE_CARDS[2], { mini: true }));
        } else if (kind === "tiles") {
            const row = make("div", "guide-tiles");

            ["我", "坐", "电梯"].forEach(function (text) { row.appendChild(make("span", "tile in-answer", text)); });

            const speed = make("div", "speed");
            const bar = make("div", "speed-bar");

            bar.appendChild(document.createElement("span"));
            speed.appendChild(make("span", "speed-ico", "⚡"));
            speed.appendChild(bar);
            speed.appendChild(make("span", "speed-label", "x1.25"));

            holder.appendChild(row);
            holder.appendChild(speed);
        } else if (kind === "hearts") {
            const row = make("div", "guide-hp");

            [["You", 100, ""], ["Boss", 60, "is-mid"]].forEach(function (item) {
                const line = make("div", "guide-hp-line");
                const track = make("div", "hp");
                const fill = make("i", "hp-fill " + item[2]);

                fill.style.width = item[1] + "%";
                track.appendChild(fill);
                line.appendChild(make("span", "guide-hp-name", item[0]));
                line.appendChild(track);
                row.appendChild(line);
            });

            holder.appendChild(row);
        }
    }

    function paintGuide() {
        const slide = GUIDE[guideIndex];
        const last = guideIndex === GUIDE.length - 1;
        const body = el("guideBody");
        const dots = el("guideDots");

        el("guideTitle").textContent = slide.title;
        guideArt(slide.art);

        body.replaceChildren();
        slide.body.forEach(function (line) { body.appendChild(make("p", "", line)); });

        dots.replaceChildren();
        GUIDE.forEach(function (item, index) {
            dots.appendChild(make("i", index === guideIndex ? "is-on" : ""));
        });

        el("guideBack").disabled = guideIndex === 0;
        el("guideNext").textContent = last ? "Got it!" : "Next";
        el("guideSkip").hidden = last;
    }

    function openGuide() {
        const overlay = el("guideOverlay");

        guideIndex = 0;
        guideReturnFocus = document.activeElement;
        paintGuide();
        overlay.hidden = false;
        el("guideNext").focus();
    }

    function closeGuide() {
        el("guideOverlay").hidden = true;
        markGuideSeen();

        if (guideReturnFocus && typeof guideReturnFocus.focus === "function") guideReturnFocus.focus();
    }

    function guideStep(delta) {
        if (delta > 0 && guideIndex === GUIDE.length - 1) {
            closeGuide();
            return;
        }

        guideIndex = clamp(guideIndex + delta, 0, GUIDE.length - 1);
        sfx.play("tap");
        paintGuide();
    }

    function onGuideKey(event) {
        if (el("guideOverlay").hidden) return;

        if (event.key === "Escape") {
            event.preventDefault();
            closeGuide();
        } else if (event.key === "ArrowRight") {
            guideStep(1);
        } else if (event.key === "ArrowLeft" && guideIndex > 0) {
            guideStep(-1);
        } else if (event.key === "Tab") {
            // keep focus inside the dialog
            const items = Array.prototype.filter.call(
                el("guideOverlay").querySelectorAll("button"),
                function (button) { return !button.disabled && !button.hidden; }
            );

            if (!items.length) return;

            const first = items[0];
            const lastItem = items[items.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                lastItem.focus();
            } else if (!event.shiftKey && document.activeElement === lastItem) {
                event.preventDefault();
                first.focus();
            }
        }
    }

    // first visit only, and only on the menu (never in the middle of a fight)
    function maybeShowGuide() {
        if (!guideSeen() && !screens.menu.hidden) openGuide();
    }

    // ----------------------------------
    // Start
    // ----------------------------------

    async function start() {
        if (!db || !Art) {
            showMessage("Could not load the page. Check the script paths in battle.html.");
            return;
        }

        el("attackButton").addEventListener("click", attack);
        el("resetButton").addEventListener("click", resetAnswer);
        el("nextButton").addEventListener("click", nextRound);
        el("againButton").addEventListener("click", battleAgain);
        el("dialog").addEventListener("click", finishTyping);
        el("soundButton").addEventListener("click", function () { sfx.toggle(); paintSoundButton(); });
        el("infoButton").addEventListener("click", openGuide);
        el("guideNext").addEventListener("click", function () { guideStep(1); });
        el("guideBack").addEventListener("click", function () { guideStep(-1); });
        el("guideSkip").addEventListener("click", closeGuide);
        el("guideOverlay").addEventListener("click", function (event) { if (event.target === el("guideOverlay")) closeGuide(); });
        document.addEventListener("keydown", onGuideKey);
        document.querySelector(".back-button").addEventListener("click", onBackClick);

        paintSoundButton();

        const { data: sessionData } = await db.auth.getSession();

        if (!sessionData || !sessionData.session) {
            showMessage("Please sign in on the Island page, then come back to battle.");
            return;
        }

        // pick up a battle that was left unfinished
        const active = await rpc("battle_my_active");

        if (active.error) {
            showMessage(errorText(active.error));
            return;
        }

        if (active.data) {
            const loaded = await rpc("battle_state", { p_battle: active.data });

            if (loaded.data) {
                enterBattle(loaded.data, false);
                return;
            }
        }

        loadMenu();
    }

    start();
});