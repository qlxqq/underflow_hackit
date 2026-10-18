document.addEventListener("DOMContentLoaded", function () {
    // Mark the current tab in the shared bottom navigation.
    if (typeof renderBottomNav === "function") renderBottomNav();

    // Reuse the shared Supabase client (works with either name).
    const db = window.supabaseClient ||
        (typeof supabase !== "undefined" && supabase.auth ? supabase : null);

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

    let busy = false;

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

        const { data, error } = await db.rpc("my_friendships");

        if (error) {
            showStatus("error", friendlyError(error));
            return;
        }

        render(data || []);
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
                makeButton("Remove", "btn btn-outline btn-danger-text", function () {
                    removeFriend(row, true);
                })
            ]));
        });

        const requestTotal = incoming.length + sent.length;

        requestsSection.hidden = requestTotal === 0;
        requestsCount.textContent = requestTotal ? String(requestTotal) : "";

        friendsCount.textContent = friends.length ? String(friends.length) : "";
        friendsEmpty.hidden = friends.length > 0;
    }

    function friendMeta(row) {
        const streak = Number(row.friend_streak) || 0;
        const xp = Number(row.friend_xp) || 0;

        return "🔥 " + streak + " day" + (streak === 1 ? "" : "s") +
            " · ⚡ " + xp + " XP";
    }

    // ----------------------------------
    // Build elements (textContent only, never innerHTML)
    // ----------------------------------

    function makeRow(row, metaText, buttons) {
        const item = document.createElement("li");
        item.className = "friend-row";

        const avatar = document.createElement("div");
        avatar.className = "friend-avatar";
        avatar.setAttribute("aria-hidden", "true");
        avatar.textContent = (row.friend_username || "?").charAt(0);

        const info = document.createElement("div");
        info.className = "friend-info";

        const name = document.createElement("p");
        name.className = "friend-name";
        name.textContent = row.friend_username;

        const meta = document.createElement("p");
        meta.className = "friend-meta";
        meta.textContent = metaText;

        info.append(name, meta);

        const actions = document.createElement("div");
        actions.className = "friend-actions";
        buttons.forEach(function (button) {
            actions.appendChild(button);
        });

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
            confirmButton.className = "btn btn-danger";
            confirmButton.textContent = options.confirmLabel || "Confirm";

            const cancelButton = document.createElement("button");
            cancelButton.type = "button";
            cancelButton.className = "btn btn-outline";
            cancelButton.textContent = options.cancelLabel || "Cancel";

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

    async function removeFriend(row, isFriend) {
        if (isFriend) {
            const confirmed = await confirmDialog({
                title: "Remove " + row.friend_username + "?",
                text: "You will no longer see each other's streak and XP. You can send a new request later.",
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

            return result === "accepted"
                ? "You and " + username + " are now friends."
                : "Request sent to " + username + ".";
        });

        addFriendButton.disabled = false;
    });

    loadFriends();
});