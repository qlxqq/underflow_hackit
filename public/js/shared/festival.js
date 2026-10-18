// Festival treasure hunts: reads the events from the database (festival_events, festival_words,
// festival_finds) and talks to the festival-verify Edge Function, which checks the photo, then the player's answer, then pays the points. Used by the Island (the event icon) and the Festival page.
// Needs: supabase (supabaseClient.js).

const Festival = (() => {
  // Singapore's date as YYYY-MM-DD, because events run on Singapore days (the database uses the same).
  function today() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(new Date());
  }
  function daysBetween(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }

  async function events(language) {
    const { data, error } = await supabase.from("festival_events").select("*")
      .eq("language", language).order("starts_on", { ascending: true });
    if (error) throw error;
    const t = today();
    return (data || []).map((e) => ({
      ...e,
      live: t >= e.starts_on && t <= e.ends_on,
      upcoming: t < e.starts_on,
      daysToStart: daysBetween(t, e.starts_on),
      daysLeft: daysBetween(t, e.ends_on) + 1,
    })).filter((e) => e.live || e.upcoming);
  }

  async function words(eventId) {
    const { data, error } = await supabase.from("festival_words").select("*")
      .eq("event_id", eventId).order("sort", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function finds(userId, eventId) {
    const { data, error } = await supabase.from("festival_finds").select("word, points")
      .eq("user_id", userId).eq("event_id", eventId);
    if (error) throw error;
    return data || [];
  }

  // Words whose photo passed the check but that the player has not named yet.
  async function spotted(userId, eventId) {
    const { data, error } = await supabase.from("festival_spotted").select("word")
      .eq("user_id", userId).eq("event_id", eventId);
    if (error) throw error;
    return (data || []).map((r) => r.word);
  }

  async function call(body) {
    const { data, error } = await supabase.functions.invoke("festival-verify", { body });
    if (error) throw error;
    if (data && data.error) throw new Error(data.error);
    return data;
  }

  // Step 1: send the photo. Claude checks that the event's words are really there (a physical decoration,
  // not a drawing or a screen). Returns { spotted: [word], already: [word], rejected: [{ word, why }] }.
  function verify(eventId, canvas) {
    const image = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
    return call({ image, mediaType: "image/jpeg", eventId });
  }

  // Step 2: the player names the spotted word in Chinese (characters or pinyin). The server checks it and,
  // when right, pays it. Returns { correct, claim: { found, points, bonus, total_found, total_words } }.
  function answer(eventId, word, text) {
    return call({ mode: "answer", eventId, word, answer: text });
  }

  // The player's own photo is shown as the banner of a found word. A small copy is kept on this phone
  // (localStorage), so on another device the banner falls back to the word itself.
  function photoKey(userId, eventId, word) { return `festival:photo:${userId}:${eventId}:${word}`; }
  function makeThumb(canvas) {
    const scale = Math.min(1, 360 / canvas.width);
    const c = document.createElement("canvas");
    c.width = Math.round(canvas.width * scale); c.height = Math.round(canvas.height * scale);
    c.getContext("2d").drawImage(canvas, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.6);
  }
  function savePhoto(userId, eventId, word, dataUrl) {
    try { localStorage.setItem(photoKey(userId, eventId, word), dataUrl); } catch (e) { /* storage full or blocked: the banner falls back */ }
  }
  function loadPhoto(userId, eventId, word) {
    try { return localStorage.getItem(photoKey(userId, eventId, word)) || ""; } catch (e) { return ""; }
  }

  // Small pictures for the event icon. Plain shapes, drawn here once.
  const ICONS = {
    pumpkin: '<ellipse cx="12" cy="14" rx="9" ry="7.5" fill="#f28c28"/><ellipse cx="8.6" cy="14" rx="3.4" ry="7.3" fill="#e57412"/><ellipse cx="15.4" cy="14" rx="3.4" ry="7.3" fill="#e57412"/><rect x="11" y="4" width="2.4" height="4" rx="1" fill="#4c8a3c"/><path d="M8 13l2 2-3 0zM16 13l-2 2 3 0zM9 18c2 1.4 4 1.4 6 0" fill="#3b2410" stroke="#3b2410" stroke-width="1" stroke-linejoin="round"/>',
    lantern: '<rect x="10.8" y="2" width="2.4" height="3" fill="#a52a1e"/><ellipse cx="12" cy="12" rx="8" ry="7" fill="#e0463a"/><ellipse cx="12" cy="12" rx="4" ry="7" fill="#c23a30"/><rect x="9.6" y="18.5" width="4.8" height="2" fill="#f2a93b"/><path d="M12 20.5v2.5" stroke="#f2a93b" stroke-width="1.6"/>',
    boat: '<path d="M2 14h20c-1 4-4 6-10 6S3 18 2 14z" fill="#17a596"/><path d="M12 3v11M12 4c4 1 6 4 6 9h-6z" fill="#ffd166" stroke="#c98a14" stroke-width="1"/><path d="M2 14c-.5-2 .5-3 2-3" stroke="#0e7a6e" stroke-width="1.6" fill="none"/>',
    moon: '<circle cx="12" cy="12" r="9" fill="#ffd166"/><circle cx="9" cy="10" r="2" fill="#f2c24f"/><circle cx="15" cy="15" r="2.4" fill="#f2c24f"/><circle cx="14.5" cy="8" r="1.3" fill="#f2c24f"/>',
  };
  function iconSvg(name, size = 28) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("width", size); svg.setAttribute("height", size);
    svg.setAttribute("aria-hidden", "true");
    const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${ICONS[name] || ICONS.moon}</svg>`, "image/svg+xml");
    [...doc.documentElement.childNodes].forEach((n) => svg.appendChild(document.importNode(n, true)));
    return svg;
  }

  return { today, events, words, finds, spotted, verify, answer, makeThumb, savePhoto, loadPhoto, iconSvg };
})();