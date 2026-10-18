document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    // Reuse the shared Supabase client (works with either name).
    const db = window.supabaseClient ||
        (typeof supabase !== "undefined" && supabase.auth ? supabase : null);

    const ZONE_NAMES = { 1: "Neighbourhood", 2: "Hawker centre", 3: "Public transport" };
    const FRIENDS_PAGE = "../friends/friends.html";
    const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const duelId = new URLSearchParams(window.location.search).get("id");

    function el(id) { return document.getElementById(id); }

    const screens = {
        loading: el("screenLoading"),
        lobby: el("screenLobby"),
        end: el("screenEnd"),
        arena: el("screenArena")
    };

    const countdownOverlay = el("countdownOverlay");
    const countdownNumber = el("countdownNumber");
    const resultOverlay = el("resultOverlay");

    // ----------------------------------
    // State
    // ----------------------------------

    let myId = null;
    let duel = null;               // latest state from the database
    let clockOffset = 0;           // database clock minus this phone's clock, in ms
    let questions = {};            // question id -> { id, prompt, tiles }
    let questionsReady = null;     // promise, resolves once the questions are loaded

    let myIdx = 0;                 // question I am on (0 = first)
    let shownIdx = -1;             // question currently drawn on screen
    let bank = [];                 // [{ text, used }] for the current question
    let answer = [];               // bank positions picked, in order
    let submitting = false;
    let lockUntil = 0;             // database time (ms) until which I am locked out
    let pendingClear = false;      // clear the wrong sentence once the lock ends
    let raceStarted = false;
    let resultShown = false;
    let finishedForGood = false;

    let lastMyWrong = 0;
    let lastThemWrongAt = null;
    let lastCountdown = null;

    let refreshing = false;
    let dirty = false;
    let channel = null;
    const timers = [];

    let wantPlaced = 0;
    let sentPlaced = 0;
    let sendingProgress = false;

    // ----------------------------------
    // Small helpers
    // ----------------------------------

    function now() { return Date.now() + clockOffset; }

    function parseTime(value) {
        return value ? Date.parse(value) : 0;
    }

    function firstLetter(name) {
        return (name || "?").trim().charAt(0) || "?";
    }

    function formatTime(ms) {
        const seconds = Math.max(0, ms) / 1000;

        if (seconds < 60) return seconds.toFixed(1) + "s";

        const minutes = Math.floor(seconds / 60);
        const rest = (seconds - minutes * 60).toFixed(1);

        return minutes + ":" + (rest < 10 ? "0" : "") + rest;
    }

    function formatCountdown(ms) {
        const total = Math.max(0, Math.ceil(ms / 1000));
        const minutes = Math.floor(total / 60);
        const seconds = total % 60;

        return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
    }

    function showScreen(name) {
        Object.keys(screens).forEach(function (key) {
            screens[key].hidden = key !== name;
        });
    }

    function toast(text) {
        const note = document.createElement("div");
        note.className = "duel-toast";
        note.textContent = text;
        document.querySelector(".duel-app").appendChild(note);
        setTimeout(function () { note.remove(); }, 2600);
    }

    function friendlyError(error) {
        const message = (error && error.message) || "Something went wrong.";

        if (message.indexOf("not signed in") !== -1) {
            return "Please sign in first (open the Island page and sign in).";
        }

        return message.charAt(0).toUpperCase() + message.slice(1) +
            (/[.!?]$/.test(message) ? "" : ".");
    }

    function showEnd(icon, title, text) {
        el("endIcon").textContent = icon;
        el("endTitle").textContent = title;
        el("endText").textContent = text;
        showScreen("end");
        countdownOverlay.hidden = true;
        resultOverlay.hidden = true;
        stopEverything();
    }

    function me() {
        return duel && duel.players.find(function (p) { return p.user_id === myId; });
    }

    function them() {
        return duel && duel.players.find(function (p) { return p.user_id !== myId; });
    }

    function total() {
        return duel ? duel.question_ids.length : 0;
    }

    function raceRunning() {
        const mine = me();

        return !!duel && duel.status === "active" && !!mine && !mine.finished_at &&
            now() >= parseTime(duel.started_at);
    }

    function isLocked() {
        return now() < lockUntil;
    }

    // ----------------------------------
    // Confirmation pop-up (same behaviour as the Friends page)
    // ----------------------------------

    function confirmDialog(options) {
        return new Promise(function (resolve) {
            const previouslyFocused = document.activeElement;

            const overlay = document.createElement("div");
            overlay.className = "confirm-overlay";

            const card = document.createElement("div");
            card.className = "confirm-card";
            card.setAttribute("role", "alertdialog");
            card.setAttribute("aria-modal", "true");

            const title = document.createElement("h2");
            title.className = "confirm-title";
            title.textContent = options.title;

            const text = document.createElement("p");
            text.className = "confirm-text";
            text.textContent = options.text;

            const actions = document.createElement("div");
            actions.className = "confirm-actions";

            const confirmButton = document.createElement("button");
            confirmButton.type = "button";
            confirmButton.className = "btn btn-danger";
            confirmButton.textContent = options.confirmLabel;

            const cancelButton = document.createElement("button");
            cancelButton.type = "button";
            cancelButton.className = "btn btn-outline";
            cancelButton.textContent = options.cancelLabel;

            actions.append(confirmButton, cancelButton);
            card.append(title, text, actions);
            overlay.appendChild(card);
            document.body.appendChild(overlay);

            function close(result) {
                document.removeEventListener("keydown", onKeydown);
                overlay.remove();

                if (previouslyFocused && typeof previouslyFocused.focus === "function") {
                    previouslyFocused.focus();
                }

                resolve(result);
            }

            function onKeydown(event) {
                if (event.key === "Escape") {
                    event.preventDefault();
                    close(false);
                }
            }

            confirmButton.addEventListener("click", function () { close(true); });
            cancelButton.addEventListener("click", function () { close(false); });
            overlay.addEventListener("click", function (event) {
                if (event.target === overlay) close(false);
            });
            document.addEventListener("keydown", onKeydown);

            cancelButton.focus();
        });
    }

    // ----------------------------------
    // Talking to the database
    // ----------------------------------

    // kind "ping" also tells the database "I am here" (every few seconds);
    // "state" only reads. Calls never overlap: a request that arrives while
    // another is running just asks for one more refresh afterwards.
    async function sync(kind) {
        if (finishedForGood) return;

        if (refreshing) {
            dirty = true;
            return;
        }

        refreshing = true;

        try {
            let method = kind === "ping" ? "duel_ping" : "duel_state";

            do {
                dirty = false;

                const { data, error } = await db.rpc(method, { p_duel: duelId });

                method = "duel_state";

                if (error) {
                    handleLoadError(error);
                    return;
                }

                await applyState(data);
            } while (dirty && !finishedForGood);
        } finally {
            refreshing = false;
        }
    }

    function handleLoadError(error) {
        if (!duel) {
            const missing = /not found/i.test(error.message || "");

            showEnd("⚠️", missing ? "Duel not found" : "Could not load the duel",
                missing ? "This duel does not exist, or it belongs to other players."
                    : friendlyError(error));
            return;
        }

        console.error("Duel update failed:", error);
    }

    async function loadQuestions(ids) {
        const { data, error } = await db
            .from("composition_questions")
            .select("id, prompt, tiles")
            .in("id", ids);

        if (error || !data) throw error || new Error("no questions");

        data.forEach(function (row) {
            questions[row.id] = row;
        });
    }

    async function applyState(data) {
        if (!data) return;

        clockOffset = parseTime(data.server_now) - Date.now();
        duel = data;

        const mine = me();

        if (!mine) {
            showEnd("⚠️", "Duel not found", "This duel belongs to other players.");
            return;
        }

        if (!questionsReady) {
            questionsReady = loadQuestions(duel.question_ids);
        }

        try {
            await questionsReady;
        } catch (error) {
            questionsReady = null;
            showEnd("⚠️", "Could not load the questions", friendlyError(error));
            return;
        }

        myIdx = Math.max(myIdx, mine.idx);
        lockUntil = Math.max(lockUntil, parseTime(mine.lock_until));

        render();
    }

    // ----------------------------------
    // Drawing
    // ----------------------------------

    function render() {
        if (!duel) return;

        switch (duel.status) {
            case "pending":
                renderLobby();
                break;

            case "active":
            case "finished":
                renderArena();
                break;

            case "declined":
                showEnd("🙅", duel.challenger_id === myId ? them().username + " declined" : "Challenge declined",
                    duel.challenger_id === myId
                        ? "Maybe next time. You can challenge someone else from the Friends page."
                        : "You turned down this challenge.");
                break;

            case "cancelled":
                showEnd("↩️", "Challenge cancelled",
                    duel.challenger_id === myId
                        ? "You took back your challenge."
                        : them().username + " took back the challenge.");
                break;

            default:
                showEnd("⌛", "This duel has expired",
                    duel.started_at
                        ? "The duel was left unfinished for too long."
                        : "Nobody accepted in time. Challenge again from the Friends page.");
        }
    }

    function renderLobby() {
        const other = them();
        const incoming = duel.opponent_id === myId;

        showScreen("lobby");

        el("lobbyAvatarMe").textContent = firstLetter(me().username);
        el("lobbyNameMe").textContent = me().username || "You";
        el("lobbyAvatarThem").textContent = firstLetter(other.username);
        el("lobbyNameThem").textContent = other.username || "Friend";

        el("lobbyInfo").textContent = (ZONE_NAMES[duel.zone] || "Zone " + duel.zone) +
            " · " + total() + " questions";

        el("lobbyAccept").hidden = !incoming;
        el("lobbyDecline").hidden = !incoming;
        el("lobbyCancel").hidden = incoming;

        if (incoming) {
            el("lobbyTitle").textContent = other.username + " challenged you!";
            el("lobbyText").textContent =
                "You both get the same questions at the same time. First to finish wins. " +
                "A wrong sentence locks you out for 3 seconds.";
        } else {
            el("lobbyTitle").textContent = "Waiting for " + other.username + "...";
            el("lobbyText").textContent =
                "They have 5 minutes to accept. Keep this page open, the race starts as soon as they do.";
        }

        updateLobbyTimer();
    }

    function updateLobbyTimer() {
        const remaining = parseTime(duel.expires_at) - now();

        el("lobbyTimer").textContent = remaining > 0 ? formatCountdown(remaining) : "";
    }

    function renderArena() {
        const mine = me();
        const other = them();
        const count = total();

        showScreen("arena");

        el("meName").textContent = "You";
        el("meAvatar").textContent = firstLetter(mine.username);
        el("themName").textContent = other.username || "Friend";
        el("themAvatar").textContent = firstLetter(other.username);

        renderPips(el("mePips"), mine.idx, count, !mine.finished_at && duel.status === "active");
        renderPips(el("themPips"), other.idx, count, !other.finished_at && duel.status === "active");

        el("meProgressText").textContent = mine.finished_at
            ? "All " + count + " done"
            : "Question " + Math.min(mine.idx + 1, count) + " of " + count;

        el("themProgressText").textContent = other.finished_at
            ? "All " + count + " done"
            : "Question " + Math.min(other.idx + 1, count) + " of " + count;

        setWrongBadge(el("meWrong"), mine.wrong, "me");
        setWrongBadge(el("themWrong"), other.wrong, "them");

        if (duel.status === "finished") {
            countdownOverlay.hidden = true;
            raceStarted = true;
            renderTiles();
            renderThemStatus();
            tick();
            showResult();
            return;
        }

        if (raceRunning() && shownIdx !== myIdx && myIdx < count) {
            loadQuestion();
        }

        if (!raceRunning()) {
            renderTiles();
        }

        renderThemStatus();
        tick();
    }

    function renderPips(container, done, count, active) {
        if (container.childElementCount !== count) {
            container.replaceChildren();

            for (let i = 0; i < count; i++) {
                const pip = document.createElement("span");
                pip.className = "pip";
                container.appendChild(pip);
            }
        }

        Array.prototype.forEach.call(container.children, function (pip, i) {
            pip.className = "pip" + (i < done ? " done" : (i === done && active ? " now" : ""));
        });
    }

    function setWrongBadge(badge, wrong, who) {
        badge.textContent = "✕ " + wrong;

        const previous = who === "me" ? lastMyWrong : (badge.dataset.wrong ? Number(badge.dataset.wrong) : 0);

        if (wrong > previous) {
            badge.classList.remove("bump");
            void badge.offsetWidth; // restart the animation
            badge.classList.add("bump");
        }

        badge.dataset.wrong = String(wrong);

        if (who === "me") lastMyWrong = wrong;
    }

    // The friend's side: what they are doing right now.
    function renderThemStatus() {
        const other = them();
        const box = el("themStatus");
        const tiles = el("themTiles");
        const text = el("themText");

        if (!other) return;

        let mode = "idle";
        let message = "";
        let boxes = 0;

        if (other.finished_at) {
            mode = "done";
            message = duel.winner_id === other.user_id ? "Finished first! 🏁" : "Finished! 🏁";
        } else if (other.lock_until && parseTime(other.lock_until) > now() && other.last_wrong) {
            const seconds = Math.ceil((parseTime(other.lock_until) - now()) / 1000);

            mode = "wrong";
            message = "✕ “" + other.last_wrong + "”  ·  locked " + seconds + "s";
        } else if (duel.status === "finished") {
            message = other.idx + " of " + total() + " done";
        } else if (now() < parseTime(duel.started_at)) {
            message = "Getting ready...";
        } else if (other.placed > 0) {
            boxes = Math.min(other.placed, 14);
            message = "Building a sentence...";
        } else {
            message = "Thinking...";
        }

        box.classList.toggle("is-wrong", mode === "wrong");
        box.classList.toggle("is-done", mode === "done");

        if (text.textContent !== message) text.textContent = message;

        if (tiles.childElementCount !== boxes) {
            tiles.replaceChildren();

            for (let i = 0; i < boxes; i++) {
                const tile = document.createElement("span");
                tile.className = "them-tile";
                tiles.appendChild(tile);
            }
        }

        // shake once for every new wrong sentence from the friend
        if (other.last_wrong_at && other.last_wrong_at !== lastThemWrongAt) {
            const fresh = lastThemWrongAt !== null || now() - parseTime(other.last_wrong_at) < 3000;

            lastThemWrongAt = other.last_wrong_at;

            if (fresh && mode === "wrong") {
                box.classList.remove("shake");
                void box.offsetWidth;
                box.classList.add("shake");
            }
        }
    }

    // ----------------------------------
    // My game
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

    function loadQuestion() {
        const question = questions[duel.question_ids[myIdx]];

        if (!question) return;

        shownIdx = myIdx;
        answer = [];
        pendingClear = false;
        submitting = false;

        const texts = Array.isArray(question.tiles) ? question.tiles : [];

        bank = shuffled(texts, texts).map(function (text) {
            return { text: String(text), used: false };
        });

        el("promptText").textContent = question.prompt;
        el("answerArea").classList.remove("is-wrong");

        wantPlaced = 0;
        sentPlaced = 0;

        renderTiles();
    }

    function canPlay() {
        return raceRunning() && !isLocked() && !submitting && !pendingClear;
    }

    function renderTiles() {
        const bankBox = el("wordBank");
        const answerBox = el("answerArea");
        const placeholder = el("answerPlaceholder");
        const playable = canPlay();

        bankBox.replaceChildren();

        bank.forEach(function (tile, position) {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "tile" + (tile.used ? " is-used" : "");
            button.textContent = tile.text;
            button.disabled = tile.used || !playable;
            button.addEventListener("click", function () { pickTile(position); });

            bankBox.appendChild(button);
        });

        Array.prototype.slice.call(answerBox.querySelectorAll(".tile")).forEach(function (node) {
            node.remove();
        });

        answer.forEach(function (position, slot) {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "tile in-answer";
            button.textContent = bank[position].text;
            button.disabled = !playable;
            button.addEventListener("click", function () { removeTile(slot); });

            answerBox.appendChild(button);
        });

        placeholder.hidden = answer.length > 0;
        el("resetButton").disabled = !playable || answer.length === 0;
    }

    function pickTile(position) {
        if (!canPlay() || bank[position].used) return;

        bank[position].used = true;
        answer.push(position);
        renderTiles();
        reportProgress();

        // the last word went in: check it straight away (it is a race)
        if (answer.length === bank.length) submitAnswer();
    }

    function removeTile(slot) {
        if (!canPlay()) return;

        const position = answer.splice(slot, 1)[0];

        bank[position].used = false;
        renderTiles();
        reportProgress();
    }

    function resetAnswer() {
        if (!canPlay()) return;

        answer = [];
        bank.forEach(function (tile) { tile.used = false; });
        renderTiles();
        reportProgress();
    }

    // Tell the database how many words are in my answer box (only the number,
    // never which words) so the friend can watch me build the sentence.
    function reportProgress() {
        wantPlaced = answer.length;
        pumpProgress();
    }

    async function pumpProgress() {
        if (sendingProgress) return;
        sendingProgress = true;

        try {
            while (wantPlaced !== sentPlaced) {
                sentPlaced = wantPlaced;
                await db.rpc("duel_progress", { p_duel: duelId, p_placed: sentPlaced });
            }
        } catch (error) {
            console.error("Progress update failed:", error);
        } finally {
            sendingProgress = false;
        }
    }

    async function submitAnswer() {
        const sentence = answer.map(function (position) { return bank[position].text; }).join("");
        const askedIdx = myIdx;

        submitting = true;
        renderTiles();

        const { data, error } = await db.rpc("duel_submit", {
            p_duel: duelId,
            p_idx: askedIdx,
            p_answer: sentence
        });

        submitting = false;
        wantPlaced = 0;
        sentPlaced = 0;

        if (error) {
            console.error("Submit failed:", error);
            toast(friendlyError(error));
            resetAnswer();
            sync("state");
            return;
        }

        switch (data.result) {
            case "correct":
                myIdx = data.idx;
                navigator.vibrate && navigator.vibrate(30);

                if (data.finished) {
                    renderTiles();
                } else if (shownIdx !== myIdx) {
                    loadQuestion();
                } else {
                    renderTiles();
                }
                break;

            case "wrong":
            case "locked":
                lockUntil = Math.max(lockUntil, parseTime(data.lock_until));
                pendingClear = true;
                el("answerArea").classList.add("is-wrong");
                navigator.vibrate && navigator.vibrate([80, 40, 80]);
                renderTiles();
                break;

            default:
                // stale / early / over / done: someone else's view of the race is newer
                resetAnswer();
        }

        sync("state");
    }

    // ----------------------------------
    // Clock: runs 10 times a second
    // ----------------------------------

    function tick() {
        if (!duel) return;

        if (duel.status === "pending") {
            updateLobbyTimer();

            if (parseTime(duel.expires_at) - now() <= 0) sync("ping");
            return;
        }

        if (duel.status !== "active" && duel.status !== "finished") return;

        const startAt = parseTime(duel.started_at);
        const timeToStart = startAt - now();

        // 3, 2, 1 before the start
        if (duel.status === "active" && timeToStart > 0) {
            raceStarted = false;
            countdownOverlay.hidden = false;
            countdownOverlay.style.pointerEvents = "auto";
            el("countdownVs").textContent = "You vs " + them().username;

            const number = Math.max(1, Math.ceil(timeToStart / 1000));

            if (lastCountdown !== number) {
                lastCountdown = number;
                countdownNumber.textContent = String(number);
                countdownNumber.classList.remove("tick");
                void countdownNumber.offsetWidth;
                countdownNumber.classList.add("tick");
            }
        } else if (duel.status === "active" && !raceStarted) {
            // GO!
            raceStarted = true;
            lastCountdown = null;
            countdownNumber.textContent = "GO!";
            countdownNumber.classList.remove("tick");
            void countdownNumber.offsetWidth;
            countdownNumber.classList.add("tick");
            countdownOverlay.style.pointerEvents = "none";

            setTimeout(function () { countdownOverlay.hidden = true; }, 650);

            if (myIdx < total()) loadQuestion();
        }

        // race clock
        let elapsed = 0;

        if (duel.status === "finished" && duel.finished_at) {
            elapsed = parseTime(duel.finished_at) - startAt;
        } else if (timeToStart <= 0) {
            elapsed = now() - startAt;
        }

        el("vsTimer").textContent = formatTime(elapsed);

        updateLock();
        renderThemStatus();
    }

    function updateLock() {
        const overlay = el("lockOverlay");
        const locked = isLocked() && duel.status === "active";

        if (locked) {
            const remaining = lockUntil - now();

            overlay.hidden = false;
            el("lockCount").textContent = String(Math.max(1, Math.ceil(remaining / 1000)));
            el("lockBar").style.width = Math.min(100, Math.max(0, remaining / 30)) + "%";
            return;
        }

        if (!overlay.hidden) overlay.hidden = true;

        if (pendingClear && duel.status === "active") {
            pendingClear = false;
            el("answerArea").classList.remove("is-wrong");
            resetAnswerSilently();
        }
    }

    function resetAnswerSilently() {
        answer = [];
        bank.forEach(function (tile) { tile.used = false; });
        renderTiles();
    }

    // ----------------------------------
    // Result
    // ----------------------------------

    function showResult() {
        if (resultShown) return;
        resultShown = true;

        const mine = me();
        const other = them();
        const iWon = duel.winner_id === myId;
        const forfeit = duel.end_reason === "forfeit";
        const startAt = parseTime(duel.started_at);

        el("resultEmoji").textContent = iWon ? "🏆" : "😤";

        const title = el("resultTitle");
        title.textContent = iWon ? "Victory!" : "Defeat";
        title.className = "result-title " + (iWon ? "win" : "lose");

        if (forfeit) {
            el("resultSub").textContent = iWon
                ? other.username + " left the duel, so you win."
                : "You left the duel or were away for too long.";
        } else {
            el("resultSub").textContent = iWon
                ? "You finished first. Nice sentences!"
                : other.username + " finished first. Ask for a rematch!";
        }

        const table = el("resultTable");
        table.replaceChildren();

        [mine, other].sort(function (a, b) {
            return (b.user_id === duel.winner_id) - (a.user_id === duel.winner_id);
        }).forEach(function (player) {
            const row = document.createElement("div");
            row.className = "result-row" + (player.user_id === duel.winner_id ? " is-winner" : "");

            const avatar = document.createElement("div");
            avatar.className = "avatar " + (player.user_id === myId ? "avatar-me" : "avatar-them");
            avatar.textContent = firstLetter(player.username);

            const who = document.createElement("div");
            who.className = "result-who";

            const name = document.createElement("strong");
            name.textContent = player.user_id === myId ? "You" : player.username;

            const detail = document.createElement("span");
            detail.textContent = player.idx + "/" + total() + " done · " + player.wrong +
                " wrong";

            who.append(name, detail);

            const time = document.createElement("div");
            time.className = "result-time";
            time.textContent = player.finished_at
                ? formatTime(parseTime(player.finished_at) - startAt)
                : "—";

            row.append(avatar, who, time);
            table.appendChild(row);
        });

        if (iWon) {
            el("resultXp").textContent = "+30 XP ⚡";
        } else if (!forfeit) {
            el("resultXp").textContent = "+10 XP ⚡ for playing";
        } else {
            el("resultXp").textContent = "";
        }

        resultOverlay.hidden = false;
        launchConfetti(iWon);
        stopEverything();
    }

    function launchConfetti(show) {
        const box = el("confetti");
        const colours = ["#2f6fd6", "#17a596", "#ffd166", "#e8772e", "#d64545"];

        box.replaceChildren();

        if (!show) return;

        for (let i = 0; i < 40; i++) {
            const piece = document.createElement("i");

            piece.style.left = Math.random() * 100 + "%";
            piece.style.background = colours[i % colours.length];
            piece.style.animationDuration = 1.8 + Math.random() * 1.8 + "s";
            piece.style.animationDelay = Math.random() * 0.8 + "s";

            box.appendChild(piece);
        }
    }

    async function rematch() {
        const button = el("rematchButton");
        const status = el("resultStatus");
        const other = them();

        button.disabled = true;
        status.textContent = "";
        status.className = "status-message";

        const { data, error } = await db.rpc("duel_challenge", {
            p_friend_id: other.user_id,
            p_zone: duel.zone
        });

        if (error) {
            status.textContent = friendlyError(error);
            status.className = "status-message status-error";
            button.disabled = false;
            return;
        }

        window.location.href = "duel.html?id=" + encodeURIComponent(data);
    }

    // ----------------------------------
    // Timers and live updates
    // ----------------------------------

    function stopEverything() {
        // Keeps the page quiet once the duel is over (the result stays on screen).
        if (duel && (duel.status === "pending" || duel.status === "active")) return;

        finishedForGood = true;

        timers.splice(0).forEach(function (id) { clearInterval(id); });

        if (channel && db.removeChannel) {
            db.removeChannel(channel);
            channel = null;
        }
    }

    function startLiveUpdates() {
        timers.push(setInterval(tick, 100));
        timers.push(setInterval(function () { sync("state"); }, 2000));
        timers.push(setInterval(function () { sync("ping"); }, 5000));

        // Instant updates when the friend does something. The 2 second refresh above
        // keeps working if this is not available.
        try {
            channel = db.channel("duel-" + duelId)
                .on("postgres_changes",
                    { event: "*", schema: "public", table: "duel_players", filter: "duel_id=eq." + duelId },
                    function () { sync("state"); })
                .on("postgres_changes",
                    { event: "*", schema: "public", table: "duels", filter: "id=eq." + duelId },
                    function () { sync("state"); })
                .subscribe();
        } catch (error) {
            console.warn("Realtime not available, using regular refresh:", error);
        }

        document.addEventListener("visibilitychange", function () {
            if (!document.hidden) sync("ping");
        });
    }

    // ----------------------------------
    // Buttons
    // ----------------------------------

    el("backButton").addEventListener("click", async function () {
        const inRace = duel && duel.status === "active" && !finishedForGood;

        if (inRace) {
            const leave = await confirmDialog({
                title: "Leave the duel?",
                text: "If you leave, " + (them() ? them().username : "your friend") + " wins.",
                confirmLabel: "Leave and lose",
                cancelLabel: "Keep playing"
            });

            if (!leave) return;

            await db.rpc("duel_forfeit", { p_duel: duelId });
        }

        window.location.href = FRIENDS_PAGE;
    });

    el("lobbyAccept").addEventListener("click", async function () {
        el("lobbyAccept").disabled = true;
        el("lobbyDecline").disabled = true;

        const { error } = await db.rpc("duel_respond", { p_duel: duelId, p_accept: true });

        if (error) {
            toast(friendlyError(error));
            el("lobbyAccept").disabled = false;
            el("lobbyDecline").disabled = false;
        }

        sync("state");
    });

    el("lobbyDecline").addEventListener("click", async function () {
        el("lobbyAccept").disabled = true;
        el("lobbyDecline").disabled = true;

        await db.rpc("duel_respond", { p_duel: duelId, p_accept: false });

        window.location.href = FRIENDS_PAGE;
    });

    el("lobbyCancel").addEventListener("click", async function () {
        el("lobbyCancel").disabled = true;

        await db.rpc("duel_cancel", { p_duel: duelId });

        window.location.href = FRIENDS_PAGE;
    });

    el("resetButton").addEventListener("click", resetAnswer);
    el("rematchButton").addEventListener("click", rematch);

    // ----------------------------------
    // Start
    // ----------------------------------

    async function start() {
        if (!db) {
            showEnd("⚠️", "Supabase client not found",
                "Check the script paths in duel.html.");
            return;
        }

        if (!duelId || !UUID_PATTERN.test(duelId)) {
            showEnd("⚠️", "No duel selected", "Open a duel from the Friends page.");
            return;
        }

        const { data: sessionData } = await db.auth.getSession();

        if (!sessionData || !sessionData.session) {
            showEnd("🔒", "Please sign in",
                "Open the Island page and sign in, then come back to your duel.");
            return;
        }

        myId = sessionData.session.user.id;

        await sync("ping");

        if (duel && !finishedForGood) startLiveUpdates();
        else if (duel && duel.status === "finished") stopEverything();
    }

    start();
});