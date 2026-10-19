// Card gifts on the Friends page: send a spare copy of an island card to a friend, and see the gifts waiting.
//
// A spare comes from a duplicate card (js/island/cards.js banks one). Sending uses one spare, so the sender keeps
// the card. The friend opens the gift on pages/gift/gift.html (type it, say it, write a sentence) and only then
// does it join their collection. All rules (friends only, 3 a day, expiry...) are in database/gifts.sql.
//
// friends.js calls:  Gifts.init(db, { makeRow, makeButton, showStatus, clearStatus })   once
//                    Gifts.load()                      to draw the "Gifts" section (also while the page is open)
//                    Gifts.openSend(friendRow)         from the gift button next to a friend
//
// Needs (loaded before this file): zoneWords.js (ZONE_WORDS) and roleCards.js (roleCardsFor) to look up the meaning of a card.

const Gifts = (() => {
  const GIFT_PAGE = "../gift/gift.html";
  const ALBUM_NAMES = { neighbourhood: "Neighbourhood", "hawker-centre": "Hawker Centre", "public-transport": "Public Transport" };
  const LANGUAGE_NAMES = { zh: "Chinese", ms: "Malay", ta: "Tamil" };

  let db = null;
  let hooks = {};
  let sending = false;

  const section = () => document.getElementById("giftSection");
  const list = () => document.getElementById("giftList");
  const count = () => document.getElementById("giftCount");

  function init(client, h) { db = client; hooks = h || {}; }

  async function myId() {
    const { data } = await db.auth.getSession();
    return data && data.session ? data.session.user.id : null;
  }

  // The English meaning and romanization of a card, from the same lists the albums use.
  function cardInfo(album, language, word) {
    const key = (w) => (language === "ms" ? String(w).trim().toLowerCase() : String(w).trim());
    let found = null;
    try {
      const zone = (typeof ZONE_WORDS !== "undefined" && ZONE_WORDS[language] && ZONE_WORDS[language][album]) || [];
      found = zone.find((w) => key(w.word) === key(word)) || null;
      if (!found && typeof roleCardsFor === "function") {
        roleCardsFor(album, language).forEach((g) => { (g.words || []).forEach((w) => { if (!found && key(w.word) === key(word)) found = w; }); });
      }
    } catch (err) { /* no lookup: the card is sent with just its word */ }
    return { meaning: (found && found.meaning) || "", romanization: (found && (found.romanization || found.pinyin)) || "" };
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function friendly(error) {
    const message = (error && error.message) || "Something went wrong.";
    return message.charAt(0).toUpperCase() + message.slice(1) + (/[.!?]$/.test(message) ? "" : ".");
  }

  // ---------- sending ----------
  async function openSend(friend) {
    if (!db || sending) return;
    sending = true;
    hooks.clearStatus && hooks.clearStatus();
    try {
      const uid = await myId();
      const { data, error } = await db.from("album_cards").select("album_id, language, word, spares")
        .eq("user_id", uid).gt("spares", 0).order("earned_at", { ascending: false });
      if (error) throw error;
      const spares = data || [];

      const overlay = el("div", "confirm-overlay");
      const card = el("div", "confirm-card gift-card");
      card.setAttribute("role", "dialog");
      card.setAttribute("aria-modal", "true");
      card.append(el("h2", "confirm-title", "Gift a card to " + friend.friend_username));

      const close = () => { document.removeEventListener("keydown", onKey); overlay.remove(); };
      const onKey = (e) => { if (e.key === "Escape") close(); };

      if (!spares.length) {
        card.append(el("p", "confirm-text", "You have no spare cards yet. When you win a card you already own, you keep a spare copy to gift. Keep playing the island mini-games!"));
      } else {
        card.append(el("p", "confirm-text", "Your friend keeps the card locked until they type it, say it and write a sentence with it. You keep your own copy."));
        const pick = el("ul", "gift-pick");
        spares.forEach((row) => {
          const info = cardInfo(row.album_id, row.language, row.word);
          const item = el("li", "gift-pick-row");
          const text = el("div", "gift-pick-text");
          const word = el("b", "gift-pick-word", row.word);
          word.lang = row.language === "zh" ? "zh-Hans" : row.language;
          text.append(word, el("small", "", [info.romanization, info.meaning].filter(Boolean).join(" · ") || (ALBUM_NAMES[row.album_id] || row.album_id)));
          const spare = el("span", "gift-spare", "×" + row.spares + " spare");
          const send = el("button", "btn btn-primary", "Send");
          send.type = "button";
          send.addEventListener("click", async () => {
            send.disabled = true;
            const { error: sendError } = await db.rpc("gift_send", {
              p_friend_id: friend.friend_id, p_album: row.album_id, p_language: row.language, p_word: row.word,
              p_meaning: info.meaning, p_roman: info.romanization,
            });
            close();
            if (sendError) { hooks.showStatus && hooks.showStatus("error", friendly(sendError)); return; }
            hooks.showStatus && hooks.showStatus("success", "Gift sent to " + friend.friend_username + ". It opens for them once they type, say and write the word.");
            load();
          });
          item.append(text, spare, send);
          pick.append(item);
        });
        card.append(pick);
      }

      const actions = el("div", "confirm-actions");
      const done = el("button", "btn btn-outline", spares.length ? "Not now" : "OK");
      done.type = "button";
      done.addEventListener("click", close);
      actions.append(done);
      card.append(actions);
      overlay.append(card);
      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
      document.addEventListener("keydown", onKey);
      document.body.appendChild(overlay);
    } catch (err) {
      console.error("Gifts: could not list spare cards.", err);
      hooks.showStatus && hooks.showStatus("error", "Could not load your spare cards. Has database/gifts.sql been run?");
    } finally {
      sending = false;
    }
  }

  // ---------- waiting gifts ----------
  function daysLeft(iso) {
    const ms = new Date(iso).getTime() - Date.now();
    const days = Math.ceil(ms / 86400000);
    return days <= 1 ? "less than a day left" : days + " days left";
  }

  async function act(fn, success) {
    const { error } = await fn();
    if (error) { hooks.showStatus && hooks.showStatus("error", friendly(error)); }
    else if (success) { hooks.showStatus && hooks.showStatus("success", success); }
    load();
  }

  async function load() {
    if (!db || !section()) return;
    const { data, error } = await db.rpc("gift_my_open");
    if (error) { section().hidden = true; return; }   // gifts.sql not run yet: the section stays hidden
    const rows = data || [];
    list().replaceChildren();
    rows.forEach((gift) => {
      const person = { friend_username: gift.other_username || "?" };
      if (gift.is_incoming) {
        list().appendChild(hooks.makeRow(person, "🎁 A mystery card for you · " + daysLeft(gift.expires_at), [
          hooks.makeButton("Unlock", "btn btn-primary", () => { window.location.href = GIFT_PAGE + "?id=" + encodeURIComponent(gift.gift_id); }),
          hooks.makeButton("No thanks", "btn btn-outline", () => act(() => db.rpc("gift_decline", { p_gift: gift.gift_id }), "Gift declined.")),
        ]));
      } else {
        const word = gift.word + (gift.meaning ? " (" + gift.meaning + ")" : "");
        list().appendChild(hooks.makeRow(person, "Sent " + word + " · waiting to be opened", [
          hooks.makeButton("Cancel", "btn btn-outline btn-danger-text", () => act(() => db.rpc("gift_cancel", { p_gift: gift.gift_id }), "Gift cancelled. The spare is back.")),
        ]));
      }
    });
    section().hidden = rows.length === 0;
    count().textContent = rows.length ? String(rows.length) : "";
  }

  return { init, load, openSend, cardInfo };
})();