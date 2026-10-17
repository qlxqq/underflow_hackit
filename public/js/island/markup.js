// The island's on-screen pieces (game canvas, HUD, pop-up sheet, fade, loading
// text). IslandApp.mount() puts this inside the island page's #map.
// Everything is styled under .island-root (css/island/style.css).

const ISLAND_MARKUP = `
<div class="island-stage">
  <div id="game" class="game"></div>

  <div class="hud">
    <div class="hud-top">
      <div class="hud-left">
      </div>
      <div class="hud-right">
      <span id="coin-count" hidden>0</span>
      <button class="hud-btn" id="boat-btn" type="button" aria-label="Sail home" style="display:none">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v11"/><path d="M12 4l6 8h-6"/><path d="M3 16h18l-2.5 4h-13z"/></svg>
      </button>
      <button class="hud-btn" id="avatar-btn" type="button" aria-label="Change your character" style="display:none">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>
      </button>
      <button class="hud-btn" id="map-btn" type="button" aria-label="Open map">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>
      </button>
      </div>
    </div>

    <div class="banner" id="banner" hidden></div>
    <div class="waypoint" id="waypoint" hidden>
      <svg id="waypoint-arrow" width="22" height="22" viewBox="0 0 24 24" fill="#f2a93b" aria-hidden="true"><path d="M12 2l7 18-7-4-7 4z"/></svg>
      <span id="waypoint-label"></span>
    </div>

    <div class="joystick" id="joystick" aria-label="Move"><div class="joy-base"><div class="joy-knob"></div></div></div>
    <div class="keys-hint" id="keys-hint">WASD or arrow keys to move · E to interact</div>
    <button class="act-btn" id="act-btn" type="button" hidden></button>
  </div>

  <div class="overlay" id="overlay" hidden><div class="sheet" id="sheet" role="dialog" aria-modal="true"></div></div>
  <div class="fade" id="fade"><span id="fade-text"></span></div>
  <div class="loading" id="loading">Sailing to the island…</div>
</div>
`;