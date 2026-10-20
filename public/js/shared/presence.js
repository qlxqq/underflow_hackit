// "Online" for friends: while a page is open and visible, it stamps profiles.last_seen every minute.
// The Friends page treats someone as online if the stamp is under 2.5 minutes old.
// Add <script src="../../js/shared/presence.js"></script> (after supabaseClient.js) to every page.
// Needs the last_seen column from database/presence.sql. Quietly does nothing if it is not there.
(function () {
  const db = window.supabaseClient || (typeof supabase !== "undefined" && supabase.auth ? supabase : null);
  if (!db || window.__presenceOn) return;
  window.__presenceOn = true;

  let userId = null;
  let broken = false;

  async function beat() {
    if (broken || document.hidden) return;
    try {
      if (!userId) {
        const { data } = await db.auth.getSession();
        userId = data && data.session ? data.session.user.id : null;
        if (!userId) return;
      }
      const { error } = await db.from("profiles").update({ last_seen: new Date().toISOString() }).eq("user_id", userId);
      if (error) broken = true; // column missing: stop trying
    } catch (err) { /* offline: try again next time */ }
  }

  beat();
  setInterval(beat, 60000);
  document.addEventListener("visibilitychange", beat);
})();