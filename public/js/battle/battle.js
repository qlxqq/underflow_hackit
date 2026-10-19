document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    // Reuse the shared Supabase client (works with either name).
    const db = window.supabaseClient ||
        (typeof supabase !== "undefined" && supabase.auth ? supabase : null);

    // Display info for the three bosses (the numbers live in the database; these are only labels).
    const BOSSES = {
        1: { emoji: "🛗", name: "Lift Gremlin",     zone: "Neighbourhood",    hp: 60,  attack: 8 },
        2: { emoji: "🐦", name: "Hawker Pigeon",    zone: "Hawker centre",    hp: 80,  attack: 10 },
        3: { emoji: "🚇", name: "Rush Hour Crowd",  zone: "Public transport", hp: 100, attack: 12 }
    };

    const MIN_CARDS = 3;
    const CONFETTI_COLOURS = ["#2f6fd6", "#17a596", "#ffd166", "#e8772e", "#d64545", "#7a4fd6"];

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

    let shownQuestion = null;      // question id currently drawn on screen
    let bank = [];                 // [{ text, used }]
    let answer = [];               // bank positions picked, in order
    let busy = false;              // a request is in flight
    let holdingResult = false;     // the round result is on screen
    let tickTimer = null;

    // ----------------------------------
    // Small helpers
    // ----------------------------------

    function now() { return Date.now() + clockOffset; }

    function make(tag, className, text) {
        const node = document.createElement(tag);

        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = text;

        return node;
    }

    function stageClass(stage) {
        const n = Math.max(0, Math.min(3, Number(stage) || 0));
        return "stage-" + n;
    }

    function bossInfo(zone) {
        return BOSSES[zone] || { emoji: "👾", name: "Boss", zone: "", hp: 0, attack: 0 };
    }

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

        // Postgres messages are already written for people; trim any prefix noise.
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

    // ----------------------------------
    // Menu: pick a boss, see the deck
    // ----------------------------------

    function miniCard(card) {
        const box = make("div", "mini-card " + stageClass(card.stage));

        box.appendChild(make("div", "mini-word", card.word));
        box.appendChild(make("div", "mini-power", "⚔ " + card.power));
        box.title = (card.meaning || "") + (card.stage_label ? " · " + card.stage_label : "");

        return box;
    }

    function renderMenu() {
        const enough = deck.length >= MIN_CARDS;
        const list = el("bossList");
        const strip = el("deckStrip");

        list.replaceChildren();

        [1, 2, 3].forEach(function (zone) {
            const boss = bossInfo(zone);
            const button = make("button", "boss-card");

            button.type = "button";
            button.disabled = !enough;

            button.appendChild(make("span", "boss-face", boss.emoji));

            const text = make("span", "boss-text");
            text.appendChild(make("p", "boss-title", boss.name));
            text.appendChild(make("p", "boss-zone", boss.zone));

            const stats = make("span", "boss-stats");
            stats.appendChild(make("span", "stat", "❤ " + boss.hp));
            stats.appendChild(make("span", "stat", "⚔ " + boss.attack));
            text.appendChild(stats);

            button.appendChild(text);
            button.appendChild(make("span", "go", "›"));

            button.addEventListener("click", function () { startBattle(zone); });

            list.appendChild(button);
        });

        strip.replaceChildren();
        deck.forEach(function (card) { strip.appendChild(miniCard(card)); });

        el("deckCount").textContent = deck.length + (deck.length === 1 ? " card" : " cards");
        el("deckEmpty").hidden = enough;
        strip.hidden = deck.length === 0;

        show("menu");
    }

    async function loadMenu() {
        const { data, error } = await rpc("battle_deck");

        if (error) {
            showMessage(errorText(error));
            return;
        }

        deck = Array.isArray(data) ? data : [];
        renderMenu();
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
        enterBattle(loaded.data);
    }

    // ----------------------------------
    // Battle: bars and header
    // ----------------------------------

    function setBar(fill, hp, max) {
        const percent = max > 0 ? Math.max(0, Math.min(100, (hp / max) * 100)) : 0;
        fill.style.width = percent + "%";
        return percent;
    }

    function renderHud() {
        const boss = state.boss;
        const me = state.player;
        const info = bossInfo(state.zone);

        el("bossEmoji").textContent = info.emoji;
        el("bossName").textContent = boss.name;
        el("roundChip").textContent = "Round " + state.round;

        setBar(el("bossHpFill"), boss.hp, boss.max);
        el("bossHpText").textContent = boss.hp + " / " + boss.max;

        const percent = setBar(el("meHpFill"), me.hp, me.max);
        const meFill = el("meHpFill");

        meFill.classList.toggle("is-low", percent <= 50 && percent > 25);
        meFill.classList.toggle("is-critical", percent <= 25);
        el("meHpText").textContent = me.hp + " / " + me.max;

        renderCombo();
    }

    function renderCombo() {
        const badge = el("comboBadge");
        const combo = state.combo || 0;

        if (combo < 1) {
            badge.hidden = true;
            return;
        }

        const wasHidden = badge.hidden;

        badge.textContent = "🔥 Combo " + combo + " · +" + Math.min(combo, 5) * 10 + "%";
        badge.hidden = false;

        if (!wasHidden) {
            badge.style.animation = "none";
            void badge.offsetWidth;
            badge.style.animation = "";
        }
    }

    function replay(node, className) {
        node.classList.remove(className);
        void node.offsetWidth;
        node.classList.add(className);
    }

    function floatNumber(anchor, text, className) {
        const rect = anchor.getBoundingClientRect();
        const node = make("div", "float-num " + className, text);

        node.style.left = rect.left + rect.width / 2 - 20 + "px";
        node.style.top = rect.top + rect.height / 2 - 20 + "px";

        document.body.appendChild(node);
        setTimeout(function () { node.remove(); }, 1200);
    }

    // ----------------------------------
    // Battle: routing between the phases
    // ----------------------------------

    function enterBattle(data) {
        applyState(data);
        holdingResult = false;
        shownQuestion = null;

        el("bossEmoji").className = "boss-emoji";
        el("battleStatus").textContent = "";

        show("battle");
        route();
    }

    function applyState(data) {
        state = data;

        if (data.server_now) clockOffset = Date.parse(data.server_now) - Date.now();

        renderHud();
    }

    function hideAllPanels() {
        el("pickPanel").hidden = true;
        el("answerPanel").hidden = true;
        el("resultPanel").hidden = true;
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

    function handCard(card) {
        const button = make("button", "card " + stageClass(card.stage));

        button.type = "button";
        button.appendChild(make("span", "card-stage", card.stage_label || "Stage " + card.stage));
        button.appendChild(make("span", "card-word", card.word));
        button.appendChild(make("span", "card-pinyin", card.romanization || ""));
        button.appendChild(make("span", "card-meaning", card.meaning || ""));
        button.appendChild(make("span", "card-power", "⚔ " + card.power));
        button.appendChild(make("span", "card-uses", card.uses ? "Used " + card.uses + "x" : "New"));

        button.addEventListener("click", function () { playCard(card, button); });

        return button;
    }

    function showPickPhase() {
        const hand = el("hand");

        // the next question may be the same one again: always start it with a fresh word bank
        shownQuestion = null;
        const combo = state.combo || 0;

        hand.replaceChildren();
        (state.hand || []).forEach(function (card) { hand.appendChild(handCard(card)); });

        el("pickSub").textContent = combo > 0
            ? "🔥 Keep your combo going: a first-try hit adds +10% damage."
            : "Use the word in a correct sentence to hit.";

        el("battleStatus").textContent = "";
        el("pickPanel").hidden = false;
    }

    async function playCard(card, button) {
        if (busy) return;

        busy = true;
        Array.prototype.forEach.call(el("hand").querySelectorAll(".card"), function (node) {
            node.disabled = true;
        });
        button.style.opacity = "1";

        const { data, error } = await rpc("battle_play", { p_battle: state.id, p_card_id: card.card_id });

        busy = false;

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

        // the card being played
        const playing = el("playingCard");
        playing.replaceChildren();

        const box = make("div", "playing-card " + stageClass(card.stage));
        box.appendChild(make("span", "pc-word", card.word));

        const text = make("span", "pc-text");
        text.appendChild(make("p", "pc-pinyin", card.romanization || ""));
        text.appendChild(make("p", "pc-meaning", card.meaning || ""));
        box.appendChild(text);
        box.appendChild(make("span", "pc-power", "⚔ " + card.power));
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
            label = "⚡ x1.25";
        } else if (elapsed <= 20) {
            left = 1 - (elapsed - 10) / 10;
            label = "⚡ x1.1";
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

            el("answerArea").classList.add("is-wrong");
            el("answerMessage").textContent = "Not quite. One try left, but a second-try hit does less damage.";
            renderTiles();

            setTimeout(function () {
                if (state && state.phase === "answer") {
                    bank.forEach(function (tile) { tile.used = false; });
                    answer = [];
                    renderTiles();
                }
            }, 900);

            return;
        }

        resolveRound(data);
    }

    // ----------------------------------
    // Round result
    // ----------------------------------

    function addChip(box, text, kind) {
        box.appendChild(make("span", "mult" + (kind ? " " + kind : ""), text));
    }

    function resolveRound(data) {
        const previous = state;
        const event = data.last_event || {};
        const hit = event.result === "hit";
        const mult = event.mult || {};
        const won = data.status === "won";

        stopTick();
        holdingResult = true;
        applyState(data);

        el("answerPanel").hidden = true;
        el("pickPanel").hidden = true;

        // animations on the arena
        const bossEmoji = el("bossEmoji");
        const damage = event.damage || 0;
        const bossDamage = event.boss_damage || 0;

        bossEmoji.className = "boss-emoji";

        if (damage > 0) {
            replay(bossEmoji, "is-hit");
            floatNumber(bossEmoji, "-" + damage, event.perfect && (mult.speed || 1) > 1 ? "boss-dmg crit" : "boss-dmg");
        } else {
            floatNumber(bossEmoji, "Miss", "miss");
        }

        if (won) {
            setTimeout(function () { replay(bossEmoji, "is-dead"); }, 450);
        } else if (bossDamage > 0) {
            setTimeout(function () {
                replay(bossEmoji, "is-attack");
                replay(el("meBox"), "is-hit");
                floatNumber(el("meHpFill"), "-" + bossDamage, "me-dmg");
            }, 600);
        }

        // result panel
        const panel = el("resultPanel");

        panel.classList.toggle("is-hit", hit);
        panel.classList.toggle("is-miss", !hit);

        el("resultTitle").textContent = hit
            ? (event.perfect ? "Direct hit!" : "Hit!")
            : "Missed!";
        el("resultDamage").textContent = hit ? "-" + damage : "0";

        const chips = el("resultChips");
        chips.replaceChildren();

        if (hit) {
            addChip(chips, "Card power " + event.power);
            if ((mult.speed || 1) > 1) addChip(chips, "⚡ Speed " + formatMult(mult.speed), "up");
            if ((mult.combo || 1) > 1) addChip(chips, "🔥 Combo " + formatMult(mult.combo), "up");
            if ((mult.retry || 1) < 1) addChip(chips, "🔁 Second try " + formatMult(mult.retry), "down");
            if ((mult.theme || 1) < 1) addChip(chips, "🎯 Off-topic " + formatMult(mult.theme), "down");
        } else {
            addChip(chips, "Both tries wrong", "down");
            if ((previous.combo || 0) > 0) addChip(chips, "Combo lost", "down");
        }

        let line;

        if (won) {
            line = data.boss.name + " is defeated!";
        } else if (data.status === "lost") {
            line = data.boss.name + " hits you for " + bossDamage + " and you are out of HP.";
        } else if (bossDamage > 0) {
            line = hit && event.perfect
                ? data.boss.name + " staggers and only hits you for " + bossDamage + "."
                : data.boss.name + " hits you for " + bossDamage + ".";
        } else {
            line = "";
        }

        el("resultBoss").textContent = line;
        el("resultBoss").hidden = line === "";

        // the sentence
        el("resultSentenceLabel").textContent = hit ? "Your sentence" : "A correct sentence";
        el("resultSentence").textContent = hit ? (event.sentence || event.answer || "") : (event.answer || "");
        el("resultNote").textContent = event.explanation || "";

        // evolution
        const evolve = el("resultEvolve");

        if (event.evolved) {
            evolve.textContent = "✨ " + event.evolved.word + " evolved to " + event.evolved.label + "!";
            evolve.hidden = false;
        } else {
            evolve.hidden = true;
        }

        el("nextButton").textContent = data.status === "active" ? "Next round" : "Continue";
        panel.hidden = false;
        panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    function nextRound() {
        holdingResult = false;
        el("resultPanel").hidden = true;
        el("bossEmoji").className = "boss-emoji";
        route();
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

    function showEnd() {
        const overlay = el("endOverlay");
        const won = state.status === "won";
        const info = bossInfo(state.zone);

        overlay.classList.toggle("is-won", won);
        overlay.classList.toggle("is-lost", !won);

        el("endEmoji").textContent = won ? "🏆" : (state.status === "lost" ? "💫" : "🏳️");
        el("endTitle").textContent = won ? "Victory!" : (state.status === "lost" ? "Defeated" : "Battle over");

        if (won) {
            const rounds = roundsPlayed();
            el("endSub").textContent = "You beat " + state.boss.name + " " + info.emoji + " in " +
                rounds + (rounds === 1 ? " round." : " rounds.");
        } else if (state.status === "lost") {
            el("endSub").textContent = state.boss.name + " wore you down. Try again with a fresh hand.";
        } else {
            el("endSub").textContent = "This battle was ended.";
        }

        el("endXp").textContent = state.xp_gained > 0 ? "+" + state.xp_gained + " XP" : "";

        const evolutions = el("endEvolutions");
        evolutions.replaceChildren();

        (state.evolutions || []).forEach(function (evo) {
            evolutions.appendChild(make("div", "evo", "✨ " + evo.word + " evolved to " + evo.label));
        });

        if (won) launchConfetti();
        else el("confetti").replaceChildren();

        el("againButton").disabled = false;
        el("againButton").textContent = "Battle again";
        overlay.hidden = false;
    }

    function roundsPlayed() {
        const event = state.last_event || {};
        return Number(event.round) || Number(state.round) || 1;
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
        enterBattle(loaded.data);
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
            window.location.href = "../island/island.html";
        });

        quit.addEventListener("click", async function () {
            quit.disabled = true;

            await rpc("battle_forfeit", { p_battle: state.id });
            window.location.href = "../island/island.html";
        });
    }

    function onBackClick(event) {
        const inFight = state && state.status === "active" && !screens.battle.hidden;

        if (!inFight) return;

        event.preventDefault();
        leaveDialog();
    }

    // ----------------------------------
    // Start
    // ----------------------------------

    async function start() {
        if (!db) {
            showMessage("Could not reach the server. Check the script paths in battle.html.");
            return;
        }

        el("attackButton").addEventListener("click", attack);
        el("resetButton").addEventListener("click", resetAnswer);
        el("nextButton").addEventListener("click", nextRound);
        el("againButton").addEventListener("click", battleAgain);
        document.querySelector(".back-button").addEventListener("click", onBackClick);

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
                enterBattle(loaded.data);
                return;
            }
        }

        loadMenu();
    }

    start();
});