document.addEventListener("DOMContentLoaded", function () {
    // Mark the current tab in the shared bottom navigation.
    if (typeof renderBottomNav === "function") renderBottomNav();

    // Reuse the shared Supabase client (works with either name).
    const db = window.supabaseClient ||
        (typeof supabase !== "undefined" && supabase.auth ? supabase : null);

    const heroArt = document.getElementById("friendsHeroArt");
    if (heroArt && typeof buildFriendsScene === "function") heroArt.innerHTML = buildFriendsScene();

    const addFriendForm = document.getElementById("addFriendForm");
    const usernameInput = document.getElementById("friendUsername");
    const addFriendButton = document.getElementById("addFriendButton");
    const statusMessage = document.getElementById("statusMessage");

    const requestsSection = document.getElementById("requestsSection");
    const requestsList = document.getElementById("requestsList");
    const requestsCount = document.getElementById("requestsCount");

    const friendsList = document.getElementById("friendsList");
    const friendsCount = document.getElementById("friendsCount");
    const friendsEmpty = document.getElementById("friendsEmpty");

    const searchResults = document.getElementById("searchResults");

    const duelSection = document.getElementById("duelSection");
    const duelList = document.getElementById("duelList");
    const duelCount = document.getElementById("duelCount");

    const DUEL_PAGE = "../duel/duel.html";
    const ZONE_NAMES = { 1: "Neighbourhood", 2: "Hawker centre", 3: "Public transport" };

    // Card gifts (js/friends/gifts.js). Safe if that script is missing: the gift button and section just do not appear.
    const giftsReady = typeof Gifts !== "undefined";

    let busy = false;
    let signedIn = false;
    let searchTimer = null;
    let searchToken = 0;

    // ----------------------------------
    // Status message
    // ----------------------------------

    function showStatus(kind, text) {
        statusMessage.textContent = text;
        statusMessage.className = "status-message status-" + kind;
    }

    function clearStatus() {
        statusMessage.textContent = "";
        statusMessage.className = "status-message";
    }

    // Postgres errors come through as plain sentences; make the common ones friendlier.
    function friendlyError(error) {
        const message = (error && error.message) || "Something went wrong.";

        if (message.indexOf("not signed in") !== -1) {
            return "Please sign in first (open the Island page and sign in).";
        }

        return message.charAt(0).toUpperCase() + message.slice(1) +
            (/[.!?]$/.test(message) ? "" : ".");
    }

    // ----------------------------------
    // Load and render
    // ----------------------------------

    async function loadFriends() {
        if (!db) {
            showStatus("error", "Supabase client not found. Check the script paths in friends.html.");
            addFriendButton.disabled = true;
            return;
        }

        // Only ask the database when someone is signed in (a signed-out request is
        // refused with a 401 error).
        const { data: sessionData } = await db.auth.getSession();

        if (!sessionData || !sessionData.session) {
            showStatus("error", "Please sign in first (open the Island page and sign in).");
            addFriendButton.disabled = true;
            return;
        }

        signedIn = true;

        const { data, error } = await db.rpc("my_friendships");

        if (error) {
            showStatus("error", friendlyError(error));
            return;
        }

        await loadProfiles((data || []).map(function (row) { return row.friend_username; }));
        render(data || []);
        loadDuels();
        if (giftsReady) {
            Gifts.init(db, { makeRow: makeRow, makeButton: makeButton, showStatus: showStatus, clearStatus: clearStatus });
            Gifts.load();
        }
    }

    function render(rows) {
        const incoming = rows.filter(function (row) {
            return row.state === "pending" && row.is_incoming;
        });

        const sent = rows.filter(function (row) {
            return row.state === "pending" && !row.is_incoming;
        });

        const friends = rows.filter(function (row) {
            return row.state === "accepted";
        });

        requestsList.replaceChildren();
        friendsList.replaceChildren();

        incoming.forEach(function (row) {
            requestsList.appendChild(makeRow(row, "Wants to be your friend", [
                makeButton("Accept", "btn btn-primary", function () {
                    respond(row, true);
                }),
                makeButton("Decline", "btn btn-outline", function () {
                    respond(row, false);
                })
            ]));
        });

        sent.forEach(function (row) {
            requestsList.appendChild(makeRow(row, "Request sent", [
                makeButton("Cancel", "btn btn-outline", function () {
                    removeFriend(row, false);
                })
            ]));
        });

        friends.forEach(function (row) {
            friendsList.appendChild(makeRow(row, friendMeta(row), [
                makeButton("⚔ Duel", "btn btn-primary", function () {
                    challengeFriend(row);
                }),
                giftButton(row)
            ].filter(Boolean), function () {
                openProfile(row);
            }));
        });

        const requestTotal = incoming.length + sent.length;

        requestsSection.hidden = requestTotal === 0;
        requestsCount.textContent = requestTotal ? String(requestTotal) : "";

        friendsCount.textContent = friends.length ? String(friends.length) : "";
        friendsEmpty.hidden = friends.length > 0;
    }

    // The small gift button next to a friend (opens the list of spare cards to send).
    function giftButton(row) {
        if (!giftsReady) return null;

        const button = makeButton("Gift", "btn btn-outline", function () {
            Gifts.openSend(row);
        });

        button.setAttribute("aria-label", "Gift a card to " + row.friend_username);
        button.title = "Gift a spare card";

        return button;
    }

    // ----------------------------------
    // Profile picture and account level of the players shown (read from profiles, which everyone may read)
    // ----------------------------------

    const profileCache = {};

    // Same formula as levelFromXp in rewards.js: total XP for level L is 50 * (L - 1)^2.
    function levelOf(xp) {
        return Math.floor(Math.sqrt(Math.max(0, Number(xp) || 0) / 50)) + 1;
    }

    async function loadProfiles(usernames) {
        const wanted = usernames.filter(function (name) { return name && !profileCache[name]; });
        if (!wanted.length) return;

        let res = await db.from("profiles").select("username, avatar, xp, current_streak, last_seen").in("username", wanted);
        // last_seen is added by database/presence.sql; until it is run, everyone just shows as offline
        if (res.error) res = await db.from("profiles").select("username, avatar, xp, current_streak").in("username", wanted);
        const data = res.data;
        if (res.error || !data) return; // fall back to the letter and no level

        data.forEach(function (p) { profileCache[p.username] = p; });
    }

    function friendMeta(row) {
        const p = profileCache[row.friend_username];

        return p ? "Level " + levelOf(p.xp) : "";
    }

    // Online = their page checked in (presence.js) within the last 2 and a half minutes.
    const ONLINE_WINDOW_MS = 150000;

    function isOnline(username) {
        const p = profileCache[username];

        return !!(p && p.last_seen && Date.now() - new Date(p.last_seen).getTime() < ONLINE_WINDOW_MS);
    }

    // Keeps the dots fresh while the page is open.
    function refreshPresence() {
        const names = Array.from(friendsList.querySelectorAll("[data-username]")).map(function (el) {
            return el.dataset.username;
        });
        if (!names.length) return;

        names.forEach(function (name) { delete profileCache[name]; });
        loadProfiles(names).then(function () {
            friendsList.querySelectorAll(".friend-row").forEach(function (item) {
                const online = isOnline(item.dataset.username);

                item.classList.toggle("is-offline", !online);
                const dot = item.querySelector(".presence-dot");
                if (dot) {
                    dot.classList.toggle("is-online", online);
                    dot.title = online ? "Online" : "Offline";
                }
            });
        });
    }

    setInterval(function () {
        if (!document.hidden && signedIn) refreshPresence();
    }, 60000);

    // ----------------------------------
    // Friend profile pop-up (opened by tapping their picture): their details, and the place to remove them
    // ----------------------------------

    function openProfile(row) {
        if (typeof FriendProfile === "undefined") { openBasicProfile(row); return; }

        FriendProfile.open({
            db: db,
            friend: row,
            online: isOnline(row.friend_username),
            cardInfo: giftsReady ? Gifts.cardInfo : null,
            onRemove: function () { removeFriend(row, true); },
            onError: function (error) {
                console.error("Friend profile failed (is database/friend_profile.sql run?):", error);
                openBasicProfile(row); // still lets the player remove the friend
            }
        });
    }

    // The simple pop-up (picture, level, remove). Used only if the full profile can't be loaded.
    function openBasicProfile(row) {
        const p = profileCache[row.friend_username] || {};
        const online = isOnline(row.friend_username);

        const overlay = document.createElement("div");
        overlay.className = "pf-overlay";

        const card = document.createElement("div");
        card.className = "pf-card";
        card.setAttribute("role", "dialog");
        card.setAttribute("aria-modal", "true");
        card.setAttribute("aria-label", row.friend_username + " profile");

        const pic = document.createElement("div");
        pic.className = "pf-pic";
        const picDot = document.createElement("span");
        picDot.className = "presence-dot" + (online ? " is-online" : "");
        if (typeof avatarSvg === "function" && p.avatar) pic.innerHTML = avatarSvg(p.avatar, 96);
        else pic.textContent = (row.friend_username || "?").charAt(0);

        pic.appendChild(picDot);

        const name = document.createElement("h2");
        name.className = "pf-name";
        name.textContent = row.friend_username;

        const status = document.createElement("p");
        status.className = "pf-status" + (online ? " is-online" : "");
        status.textContent = online ? "Online" : "Offline";

        const facts = document.createElement("div");
        facts.className = "pf-facts";
        const level = document.createElement("div");
        level.innerHTML = "<strong></strong><span>Level</span>";
        level.querySelector("strong").textContent = String(levelOf(p.xp));
        const streak = document.createElement("div");
        streak.innerHTML = "<strong></strong><span>Day streak</span>";
        streak.querySelector("strong").textContent = String(Number(p.current_streak) || 0);
        facts.append(level, streak);

        const remove = makeButton("Remove friend", "pf-remove", function () {
            close();
            removeFriend(row, true);
        });
        const closeBtn = makeButton("Close", "btn btn-outline btn-block", function () { close(); });

        card.append(pic, name, status, facts, closeBtn, remove);
        overlay.appendChild(card);
        overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });

        function onKey(e) { if (e.key === "Escape") close(); }
        function close() {
            document.removeEventListener("keydown", onKey);
            overlay.remove();
        }

        document.addEventListener("keydown", onKey);
        document.body.appendChild(overlay);
        closeBtn.focus();
    }

    // ----------------------------------
    // Search players by part of a username
    // ----------------------------------

    function hideSearch() {
        searchToken++; // ignore any search that is still waiting for its answer
        searchResults.hidden = true;
        searchResults.replaceChildren();
    }

    async function runSearch(query) {
        const token = ++searchToken;

        const { data, error } = await db.rpc("search_players", { p_query: query });

        // A newer search started, or the box was cleared: ignore this answer.
        if (token !== searchToken) return;

        if (error) {
            console.error("Player search failed:", error);
            hideSearch();
            return;
        }

        await loadProfiles((data || []).map(function (player) { return player.player_username; }));
        if (token !== searchToken) return;

        searchResults.replaceChildren();

        if (!data || data.length === 0) {
            const empty = document.createElement("li");
            empty.className = "empty-state";
            empty.textContent =
                "No players found. Check the spelling, or ask your friend for their username.";
            searchResults.appendChild(empty);
        } else {
            data.forEach(function (player) {
                searchResults.appendChild(makeRow(
                    { friend_username: player.player_username },
                    "",
                    [
                        makeButton("Add", "btn btn-primary", function () {
                            addPlayer(player.player_username);
                        })
                    ]
                ));
            });
        }

        searchResults.hidden = false;
    }

    // Sends a request to a player picked from the search results.
    function addPlayer(username) {
        runAction(function () {
            return db.rpc("send_friend_request", { p_username: username });
        }, function (result) {
            usernameInput.value = "";
            hideSearch();

            return result === "accepted"
                ? "You and " + username + " are now friends."
                : "Request sent to " + username + ".";
        });
    }

    usernameInput.addEventListener("input", function () {
        clearTimeout(searchTimer);

        const query = usernameInput.value.trim();

        if (!db || !signedIn || query.length < 2) {
            hideSearch();
            return;
        }

        // Wait a moment after the last key press instead of searching on every letter.
        searchTimer = setTimeout(function () {
            runSearch(query);
        }, 250);
    });

    usernameInput.addEventListener("keydown", function (event) {
        if (event.key === "Escape") hideSearch();
    });

    // ----------------------------------
    // Build elements (textContent only, never innerHTML)
    // ----------------------------------

    function makeRow(row, metaText, buttons, onAvatar) {
        const item = document.createElement("li");
        item.className = "friend-row";
        item.dataset.username = row.friend_username || "";

        // With onAvatar (the friends list) the picture is a button that opens their profile.
        const avatar = document.createElement(onAvatar ? "button" : "div");
        avatar.className = "friend-avatar";
        if (onAvatar) {
            avatar.type = "button";
            avatar.setAttribute("aria-label", "View " + row.friend_username + " profile");
            avatar.addEventListener("click", onAvatar);
        } else {
            avatar.setAttribute("aria-hidden", "true");
        }
        const profile = profileCache[row.friend_username];

        if (profile && typeof avatarSvg === "function") {
            // the picture they have equipped (built by avatars.js, never from typed text)
            avatar.classList.add("has-pic");
            avatar.innerHTML = avatarSvg(profile.avatar, 48);
        } else {
            avatar.textContent = (row.friend_username || "?").charAt(0);
        }

        const info = document.createElement("div");
        info.className = "friend-info";

        const name = document.createElement("p");
        name.className = "friend-name";
        name.textContent = row.friend_username;

        info.appendChild(name);

        if (metaText) {
            const meta = document.createElement("p");
            meta.className = "friend-meta";
            meta.textContent = metaText;
            info.appendChild(meta);
        }

        const actions = document.createElement("div");
        actions.className = "friend-actions";
        buttons.forEach(function (button) {
            actions.appendChild(button);
        });

        if (onAvatar) {
            const online = isOnline(row.friend_username);
            const dot = document.createElement("span");
            dot.className = "presence-dot" + (online ? " is-online" : "");
            dot.title = online ? "Online" : "Offline";
            avatar.appendChild(dot);
            item.classList.toggle("is-offline", !online);
        }

        item.append(avatar, info, actions);

        return item;
    }

    function makeButton(label, className, onClick) {
        const button = document.createElement("button");

        button.type = "button";
        button.className = className;
        button.textContent = label;
        button.addEventListener("click", onClick);

        return button;
    }

    // ----------------------------------
    // Confirmation pop-up
    // ----------------------------------

    // Shows the pop-up and resolves to true (confirmed) or false (cancelled).
    // Escape, tapping the dark background, or the cancel button all cancel.
    function confirmDialog(options) {
        return new Promise(function (resolve) {
            const previouslyFocused = document.activeElement;

            const overlay = document.createElement("div");
            overlay.className = "confirm-overlay";

            const card = document.createElement("div");
            card.className = "confirm-card";
            card.setAttribute("role", "alertdialog");
            card.setAttribute("aria-modal", "true");
            card.setAttribute("aria-labelledby", "confirmTitle");
            card.setAttribute("aria-describedby", "confirmText");

            const title = document.createElement("h2");
            title.className = "confirm-title";
            title.id = "confirmTitle";
            title.textContent = options.title;

            const text = document.createElement("p");
            text.className = "confirm-text";
            text.id = "confirmText";
            text.textContent = options.text;

            const actions = document.createElement("div");
            actions.className = "confirm-actions";

            const confirmButton = document.createElement("button");
            confirmButton.type = "button";
            confirmButton.className = options.confirmClass || "btn btn-danger";
            confirmButton.textContent = options.confirmLabel || "Confirm";

            const cancelButton = document.createElement("button");
            cancelButton.type = "button";
            cancelButton.className = "btn btn-outline";
            cancelButton.textContent = options.cancelLabel || "Cancel";

            actions.append(confirmButton, cancelButton);

            if (options.extra) {
                card.append(title, text, options.extra, actions);
            } else {
                card.append(title, text, actions);
            }

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
                    return;
                }

                // Keep Tab inside the pop-up.
                if (event.key === "Tab") {
                    const first = confirmButton;
                    const last = cancelButton;

                    if (event.shiftKey && document.activeElement === first) {
                        event.preventDefault();
                        last.focus();
                    } else if (!event.shiftKey && document.activeElement === last) {
                        event.preventDefault();
                        first.focus();
                    }
                }
            }

            confirmButton.addEventListener("click", function () {
                close(true);
            });

            cancelButton.addEventListener("click", function () {
                close(false);
            });

            overlay.addEventListener("click", function (event) {
                if (event.target === overlay) close(false);
            });

            document.addEventListener("keydown", onKeydown);

            // Start on the safe choice so Enter cannot remove a friend by accident.
            cancelButton.focus();
        });
    }

    // ----------------------------------
    // Actions
    // ----------------------------------

    // Runs one request at a time so a double tap cannot send it twice.
    async function runAction(action, successText) {
        if (busy) return;
        busy = true;
        clearStatus();

        try {
            const { data, error } = await action();

            if (error) {
                showStatus("error", friendlyError(error));
                return;
            }

            await loadFriends();

            if (typeof successText === "function") {
                showStatus("success", successText(data));
            } else if (successText) {
                showStatus("success", successText);
            }
        } finally {
            busy = false;
        }
    }

    function respond(row, accept) {
        runAction(function () {
            return db.rpc("respond_friend_request", {
                p_id: row.friendship_id,
                p_accept: accept
            });
        }, accept
            ? "You and " + row.friend_username + " are now friends."
            : "Request declined.");
    }

    // ----------------------------------
    // Duels (1v1 races with a friend)
    // ----------------------------------

    function zoneName(zone) {
        return ZONE_NAMES[zone] || "Zone " + zone;
    }

    // Open duels: challenges sent to me, challenges I sent, and races in progress.
    // If duels.sql has not been run yet the call fails and the section stays hidden.
    async function loadDuels() {
        if (!db || !signedIn) return;

        const { data, error } = await db.rpc("duel_my_open");

        if (error) {
            duelSection.hidden = true;
            return;
        }

        renderDuels(data || []);
    }

    function renderDuels(rows) {
        duelList.replaceChildren();

        rows.forEach(function (duel) {
            const topic = zoneName(duel.zone);
            const person = { friend_username: duel.other_username };
            const page = DUEL_PAGE + "?id=" + encodeURIComponent(duel.duel_id);

            if (duel.status === "active") {
                duelList.appendChild(makeRow(person, "Duel in progress · " + topic, [
                    makeButton("Rejoin", "btn btn-primary", function () {
                        window.location.href = page;
                    })
                ]));
            } else if (duel.is_incoming) {
                duelList.appendChild(makeRow(person, "Challenged you · " + topic, [
                    makeButton("Accept", "btn btn-primary", function () {
                        answerChallenge(duel, true, page);
                    }),
                    makeButton("Decline", "btn btn-outline", function () {
                        answerChallenge(duel, false, page);
                    })
                ]));
            } else {
                duelList.appendChild(makeRow(person, "Waiting for a reply · " + topic, [
                    makeButton("Open", "btn btn-outline", function () {
                        window.location.href = page;
                    }),
                    makeButton("Cancel", "btn btn-outline btn-danger-text", function () {
                        cancelChallenge(duel);
                    })
                ]));
            }
        });

        duelSection.hidden = rows.length === 0;
        duelCount.textContent = rows.length ? String(rows.length) : "";
    }

    async function answerChallenge(duel, accept, page) {
        if (busy) return;
        busy = true;
        clearStatus();

        try {
            const { error } = await db.rpc("duel_respond", {
                p_duel: duel.duel_id,
                p_accept: accept
            });

            if (error) {
                showStatus("error", friendlyError(error));
                loadDuels();
                return;
            }

            if (accept) {
                window.location.href = page;
                return;
            }

            await loadDuels();
            showStatus("success", "Challenge declined.");
        } finally {
            busy = false;
        }
    }

    async function cancelChallenge(duel) {
        if (busy) return;
        busy = true;
        clearStatus();

        try {
            const { error } = await db.rpc("duel_cancel", { p_duel: duel.duel_id });

            if (error) {
                showStatus("error", friendlyError(error));
            } else {
                showStatus("success", "Challenge cancelled.");
            }

            await loadDuels();
        } finally {
            busy = false;
        }
    }

    function makeSelect(options, selected) {
        const select = document.createElement("select");

        select.className = "field";

        options.forEach(function (option) {
            const item = document.createElement("option");

            item.value = option[0];
            item.textContent = option[1];
            item.selected = option[0] === selected;
            select.appendChild(item);
        });

        return select;
    }

    function pickerField(labelText, select) {
        const wrap = document.createElement("label");
        const label = document.createElement("span");

        label.textContent = labelText;
        wrap.append(label, select);

        return wrap;
    }

    async function challengeFriend(row) {
        if (busy) return;

        const zoneSelect = makeSelect([
            ["1", "Neighbourhood"],
            ["2", "Hawker centre"],
            ["3", "Public transport"]
        ], "1");

        const picker = document.createElement("div");

        picker.className = "duel-pick";
        picker.append(pickerField("Topic", zoneSelect));

        const confirmed = await confirmDialog({
            title: "Duel " + row.friend_username + "?",
            text: "You both race on the same 5 random questions from the topic. A wrong sentence locks you out for 3 seconds.",
            confirmLabel: "Send challenge",
            confirmClass: "btn btn-primary",
            cancelLabel: "Not now",
            extra: picker
        });

        if (!confirmed) return;

        busy = true;
        clearStatus();

        try {
            const { data, error } = await db.rpc("duel_challenge", {
                p_friend_id: row.friend_id,
                p_zone: Number(zoneSelect.value)
            });

            if (error) {
                showStatus("error", friendlyError(error));
                return;
            }

            window.location.href = DUEL_PAGE + "?id=" + encodeURIComponent(data);
        } finally {
            busy = false;
        }
    }

    // Look for new challenges every few seconds while the page is open.
    setInterval(function () {
        if (!document.hidden && signedIn && !busy) {
            loadDuels();
            if (giftsReady) Gifts.load();
        }
    }, 4000);

    async function removeFriend(row, isFriend) {
        if (isFriend) {
            const confirmed = await confirmDialog({
                title: "Remove " + row.friend_username + "?",
                text: "You will no longer see each other's level. You can send a new request later.",
                confirmLabel: "Remove friend",
                cancelLabel: "Keep friend"
            });

            if (!confirmed) return;
        }

        runAction(function () {
            return db.rpc("remove_friend", { p_friend_id: row.friend_id });
        }, isFriend ? "Friend removed." : "Request cancelled.");
    }

    addFriendForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!db) return;

        const username = usernameInput.value.trim();

        if (!username) {
            showStatus("error", "Enter a username first.");
            return;
        }

        addFriendButton.disabled = true;

        await runAction(function () {
            return db.rpc("send_friend_request", { p_username: username });
        }, function (result) {
            usernameInput.value = "";
            hideSearch();

            return result === "accepted"
                ? "You and " + username + " are now friends."
                : "Request sent to " + username + ".";
        });

        addFriendButton.disabled = false;
    });

    loadFriends();
});