// A friend's small profile, opened by tapping their picture on the Friends page.
// A smaller version of profile.html: level and XP, day streak, badges earned and favourite cards.
// The data comes from the friend_profile() function (database/friend_profile.sql), which only answers for friends.
//
//   FriendProfile.open({ db, friend, online, cardInfo, onRemove })
//     friend   = the friend's row ({ friend_id, friend_username })
//     cardInfo = (album, language, word) => { meaning, romanization }  for island cards
//     onRemove = called when the player taps "Remove friend" (the page asks to confirm)
const FriendProfile = (function () {
  const RARITY_COLORS = { common: "#8a97ab", uncommon: "#3aa675", rare: "#2f6fd6", epic: "#8a4fd3", legendary: "#f2a93b" };
  const RARITY_NAMES = { common: "Common", uncommon: "Uncommon", rare: "Rare", epic: "Epic", legendary: "Legendary" };
  const ALBUM_NAMES = { neighbourhood: "Neighbourhood", "hawker-centre": "Hawker centre", "public-transport": "Public transport" };
  const LANG_NAMES = { zh: "Chinese", ms: "Malay", ta: "Tamil" };

  // Same level rule as rewards.js: total XP for level L is 50 * (L - 1)^2.
  function levelFromXp(xp) {
    const safe = Math.max(0, Number(xp) || 0);
    const level = Math.floor(Math.sqrt(safe / 50)) + 1;
    const floor = 50 * (level - 1) * (level - 1);
    const next = 50 * level * level;
    return { level, into: safe - floor, span: next - floor };
  }

  function tier(level) {
    if (level >= 20) return ["#f2a93b", "#e0463a"];
    if (level >= 10) return ["#8a4fd3", "#c05fd0"];
    if (level >= 5) return ["#2f6fd6", "#4aa3e8"];
    return ["#17a596", "#3cc7a0"];
  }

  function levelRing(xp, size) {
    const lv = levelFromXp(xp), t = tier(lv.level);
    const r = 27, circ = 2 * Math.PI * r, pct = lv.span ? lv.into / lv.span : 0;
    const id = "fl" + Math.random().toString(36).slice(2, 7);
    const fs = String(lv.level).length >= 3 ? 16 : String(lv.level).length === 2 ? 20 : 25;
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t[0]}"/><stop offset="1" stop-color="${t[1]}"/></linearGradient></defs>
      <circle cx="32" cy="32" r="${r}" fill="#fff" stroke="#e3e8ef" stroke-width="5"/>
      <circle cx="32" cy="32" r="${r}" fill="none" stroke="url(#${id})" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(circ * pct).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 32 32)"/>
      <circle cx="32" cy="32" r="20" fill="url(#${id})"/>
      <text x="32" y="${32 + fs * 0.36}" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="800" font-size="${fs}" fill="#fff">${lv.level}</text>
    </svg>`;
  }

  function flame(lit, size) {
    const a = lit ? "#f2a93b" : "#c5ccd8", b = lit ? "#e0463a" : "#aab3c2";
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-7 1-10z" fill="${b}"/><path d="M12 11c.6 2 2.5 2.6 2.5 4.6a2.5 2.5 0 0 1-5 0c0-1.2.8-1.8 1.4-2.6.2.6.6 1 1.1 1 0-1.2-.4-2 0-3z" fill="${a}"/></svg>`;
  }

  // A medal for an album badge (the shiny violet one is for collecting every card of the album).
  function medal(master) {
    if (master) {
      return `<svg viewBox="0 0 96 112" aria-hidden="true"><path d="M30 70L20 106L34 98L42 110L52 72z" fill="#7c5cff"/><path d="M66 70L76 106L62 98L54 110L44 72z" fill="#5a3fd6"/><circle cx="48" cy="46" r="44" fill="#9b7cff"/><circle cx="48" cy="46" r="37" fill="#fff"/><circle cx="48" cy="46" r="33" fill="#efeaff"/><path d="M48 24l6.5 14 15 1.6-11.2 10 3.2 14.8L48 56l-13.5 8.4 3.2-14.8-11.2-10 15-1.6z" fill="#7c5cff"/></svg>`;
    }
    return `<svg viewBox="0 0 96 112" aria-hidden="true"><path d="M30 70L20 106L34 98L42 110L52 72z" fill="#e0463a"/><path d="M66 70L76 106L62 98L54 110L44 72z" fill="#c23a30"/><circle cx="48" cy="46" r="42" fill="#f2a93b"/><circle cx="48" cy="46" r="36" fill="#ffd166"/><circle cx="48" cy="46" r="31" fill="#fff4de"/><path d="M48 24l6.5 14 15 1.6-11.2 10 3.2 14.8L48 56l-13.5 8.4 3.2-14.8-11.2-10 15-1.6z" fill="#f2a93b"/></svg>`;
  }

  function badgeInfo(id) {
    const m = /^(album|album-master):(.+):([a-z]{2})$/.exec(String(id));
    if (!m) return null;
    const name = ALBUM_NAMES[m[2]] || m[2].replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
    return { master: m[1] === "album-master", name, lang: LANG_NAMES[m[3]] || m[3] };
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function miniCard(card, cardInfo) {
    let meaning = card.meaning || "", roman = card.romanization || "", rarity = card.rarity;
    if (card.kind === "island") {
      const info = cardInfo ? cardInfo(card.album, card.language, card.word) : {};
      meaning = info.meaning || ""; roman = info.romanization || "";
      try { rarity = typeof getRarity === "function" ? getRarity(card.word, card.language) : null; } catch (err) { rarity = null; }
    }
    const color = RARITY_COLORS[rarity] || "#8a97ab";
    const box = el("div", "fp-card");
    box.style.setProperty("--rc", color);
    box.append(el("div", "fp-card-word" + ([...card.word].length > 5 ? " long" : ""), card.word));
    if (roman) box.append(el("div", "fp-card-sub", roman));
    if (meaning) box.append(el("div", "fp-card-meaning", meaning));
    box.append(el("div", "fp-card-rar", RARITY_NAMES[rarity] || ""));
    // how far the card has evolved from practising it: Caught -> Trained -> Mastered
    const stage = Math.min(Math.max(Number(card.stage) || 0, 0), 2);
    box.classList.add("stage-" + stage);
    const pips = el("div", "fp-card-stage");
    pips.innerHTML = `<i class="on"></i><i class="${stage >= 1 ? "on" : ""}"></i><i class="${stage >= 2 ? "on" : ""}"></i>`;
    pips.append(el("span", "", ["Caught", "Trained", "Mastered"][stage]));
    box.append(pips);
    return box;
  }

  async function open(opts) {
    const friend = opts.friend;
    const { data, error } = await opts.db.rpc("friend_profile", { p_friend_id: friend.friend_id });
    if (error || !data) { if (opts.onError) opts.onError(error); return; }

    const lv = levelFromXp(data.xp);
    const streak = Number(data.streak) || 0;

    const overlay = el("div", "pf-overlay");
    const card = el("div", "pf-card fp");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-label", data.username + " profile");

    // top: picture, name, status
    const pic = el("div", "pf-pic");
    if (typeof avatarSvg === "function") pic.innerHTML = avatarSvg(data.avatar, 96); else pic.textContent = data.username.charAt(0);
    pic.append(el("span", "presence-dot" + (opts.online ? " is-online" : "")));
    card.append(pic, el("h2", "pf-name", data.username), el("p", "pf-status" + (opts.online ? " is-online" : ""), opts.online ? "Online" : "Offline"));

    // level, streak and XP bar
    const stats = el("div", "fp-stats");
    const sLevel = el("div", "fp-stat"); sLevel.innerHTML = `<div class="fp-stat-art">${levelRing(data.xp, 46)}</div><strong></strong><span>Level</span>`;
    sLevel.querySelector("strong").textContent = data.xp + " XP";
    const sStreak = el("div", "fp-stat"); sStreak.innerHTML = `<div class="fp-stat-art">${flame(streak > 0, 40)}</div><strong></strong><span>Day streak</span>`;
    sStreak.querySelector("strong").textContent = String(streak);
    stats.append(sLevel, sStreak);
    const bar = el("div", "fp-xp");
    bar.innerHTML = `<span class="fp-xp-bar"><i style="width:${Math.round((lv.into / lv.span) * 100)}%"></i></span>`;
    bar.append(el("p", "fp-xp-text", lv.into + " / " + lv.span + " XP to level " + (lv.level + 1)));
    card.append(stats, bar);

    // badges (only the ones they have earned)
    const badges = (data.badges || []).map(badgeInfo).filter(Boolean);
    const bHead = el("h3", "fp-title", "Badges");
    bHead.append(el("span", "fp-count", badges.length ? String(badges.length) : ""));
    const bBox = el("div", "fp-badges");
    if (!badges.length) bBox.append(el("p", "fp-empty", "No badges yet."));
    badges.forEach((b) => {
      const item = el("div", "fp-badge");
      item.title = b.name + " · " + b.lang + (b.master ? " (all cards)" : "");
      item.innerHTML = medal(b.master);
      item.append(el("span", "", b.name));
      bBox.append(item);
    });
    card.append(bHead, bBox);

    // favourite cards
    const fHead = el("h3", "fp-title", "Favourite cards");
    const fBox = el("div", "fp-favs");
    const favs = data.favourites || [];
    if (!favs.length) fBox.append(el("p", "fp-empty", "No favourite cards picked yet."));
    favs.forEach((c) => fBox.append(miniCard(c, opts.cardInfo)));
    card.append(fHead, fBox);

    // actions
    const closeBtn = el("button", "btn btn-outline btn-block", "Close");
    closeBtn.type = "button";
    const removeBtn = el("button", "pf-remove", "Remove friend");
    removeBtn.type = "button";
    card.append(closeBtn, removeBtn);

    function onKey(e) { if (e.key === "Escape") close(); }
    function close() { document.removeEventListener("keydown", onKey); overlay.remove(); }
    closeBtn.addEventListener("click", close);
    removeBtn.addEventListener("click", () => { close(); if (opts.onRemove) opts.onRemove(); });
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", onKey);

    overlay.append(card);
    document.body.append(overlay);
    closeBtn.focus();
  }

  return { open, levelFromXp };
})();