/* Dark mode switch for the whole app. Goes in every page's <head>, right after the
   stylesheets (see css/shared/theme.css):
     <link rel="stylesheet" href="../../css/shared/theme.css">
     <script src="../../js/shared/theme.js"></script>

   - Follows the phone/computer's light or dark setting until the player picks one.
   - The player's choice ("system", "light" or "dark") is kept in localStorage "theme".
   - Any <div data-theme-picker></div> on a page becomes the System / Light / Dark switch.
   - Other code can use AppTheme.get(), AppTheme.set("dark"), AppTheme.isDark(). */
(function () {
  var KEY = 'theme';
  var CHOICES = ['light', 'dark'];
  var DARK_BAR = '#182132'; // browser bar colour on phones in dark mode (same as --white)
  var root = document.documentElement;
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  var unsaved = null; // the choice, if storage is blocked (private mode)

  function getChoice() {
    try {
      var saved = localStorage.getItem(KEY);
      if (CHOICES.indexOf(saved) !== -1) return saved;
    } catch (err) { /* storage blocked */ }
    return unsaved || 'system';
  }

  function isDark() {
    var choice = getChoice();
    return choice === 'dark' || (choice === 'system' && !!media && media.matches);
  }

  // Each feature's dark fixes only apply on pages that load that feature's CSS:
  // "css/island/style.css" -> data-css contains "island-style".
  function listStylesheets() {
    var keys = [];
    var links = document.querySelectorAll('link[rel~="stylesheet"]');
    for (var i = 0; i < links.length; i++) {
      var m = (links[i].getAttribute('href') || '').match(/css\/([^\/]+)\/([^\/?#]+)\.css/);
      if (m) keys.push(m[1] + '-' + m[2]);
    }
    root.setAttribute('data-css', keys.join(' '));
  }

  function updateBarColour() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    if (!meta.hasAttribute('data-light')) meta.setAttribute('data-light', meta.getAttribute('content') || '#ffffff');
    meta.setAttribute('content', isDark() ? DARK_BAR : meta.getAttribute('data-light'));
  }

  function apply() {
    root.setAttribute('data-theme', isDark() ? 'dark' : 'light');
    updateBarColour();
    syncPickers();
  }

  function set(choice) {
    if (CHOICES.indexOf(choice) === -1) return;
    unsaved = choice;
    try { localStorage.setItem(KEY, choice); } catch (err) { /* storage blocked: still switch on this page */ }
    // fade the colours this once, not on every page load
    root.classList.add('theme-changing');
    apply();
    setTimeout(function () { root.classList.remove('theme-changing'); }, 300);
  }

  // ---- the System / Light / Dark switch ----
  var ICONS = {
    system: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    dark: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'
  };
  var LABELS = { system: 'Auto', light: 'Light', dark: 'Dark' };

  function buildPicker(box) {
    if (box.getAttribute('data-ready')) return;
    box.setAttribute('data-ready', '1');
    box.className = (box.className ? box.className + ' ' : '') + 'theme-picker';
    box.setAttribute('role', 'radiogroup');
    box.setAttribute('aria-label', 'Appearance');
    CHOICES.forEach(function (choice) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'theme-opt';
      b.setAttribute('role', 'radio');
      b.setAttribute('data-choice', choice);
      b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[choice] + '</svg><span>' + LABELS[choice] + '</span>';
      b.addEventListener('click', function () { set(choice); });
      box.appendChild(b);
    });
    // arrow keys move between the three options
    box.addEventListener('keydown', function (e) {
      var step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      var next = CHOICES[(CHOICES.indexOf(getChoice()) + step + CHOICES.length) % CHOICES.length];
      set(next);
      var btn = box.querySelector('[data-choice="' + next + '"]');
      if (btn) btn.focus();
    });
    var note = document.createElement('p');
    note.className = 'theme-note';
    box.insertAdjacentElement('afterend', note);
    syncPickers();
  }

  function syncPickers() {
    var choice = getChoice();
    var boxes = document.querySelectorAll('[data-theme-picker]');
    for (var i = 0; i < boxes.length; i++) {
      var opts = boxes[i].querySelectorAll('.theme-opt');
      for (var j = 0; j < opts.length; j++) {
        var on = opts[j].getAttribute('data-choice') === (isDark() ? 'dark' : 'light');
        opts[j].setAttribute('aria-checked', on ? 'true' : 'false');
        opts[j].tabIndex = on ? 0 : -1;
      }
      var note = boxes[i].nextElementSibling;
      if (note && note.className === 'theme-note') {
        note.textContent = choice === 'system' ? 'Matches your device (' + (isDark() ? 'dark' : 'light') + ' right now).' : '';
        note.hidden = true;
      }
    }
  }

  function mountPickers() {
    var boxes = document.querySelectorAll('[data-theme-picker]');
    for (var i = 0; i < boxes.length; i++) buildPicker(boxes[i]);
  }

  // ---- start ----
  apply();            // before the page draws, so there's no white flash
  listStylesheets();
  document.addEventListener('DOMContentLoaded', function () {
    listStylesheets(); // again, in case a stylesheet was added further down the page
    updateBarColour();
    mountPickers();
  });
  // device switched between light and dark (e.g. at sunset)
  if (media) {
    var onChange = function () { if (getChoice() === 'system') apply(); };
    if (media.addEventListener) media.addEventListener('change', onChange);
    else if (media.addListener) media.addListener(onChange);
  }
  // changed in another tab
  window.addEventListener('storage', function (e) { if (e.key === KEY) apply(); });
  // coming back with the browser's back button
  window.addEventListener('pageshow', apply);

  window.AppTheme = {
    get: getChoice,
    set: set,
    isDark: isDark,
    mountPickers: mountPickers
  };
})(); 