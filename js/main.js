/* Woofdoku — boot: settings, asset loading, then the home screen. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var s = Store.data.settings;
  Snd.setSfx(s.sfx); Snd.setMusic(s.music);
  Fx.init($('fx'), $('app'));
  $('load-msg').textContent = T('loading');
  $('rotate-msg').textContent = T('rotate');

  // audio can only start after a user gesture
  ['pointerdown', 'touchend', 'keydown'].forEach(function (ev) { document.addEventListener(ev, function () { Snd.unlock(); }, { passive: true }); });
  // no pinch / double-tap zoom, no page bounce
  ['gesturestart', 'gesturechange', 'dblclick'].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false }); });
  document.addEventListener('touchmove', function (e) { if (!e.target.closest || !e.target.closest('#map-scroll, .dlg .body')) e.preventDefault(); }, { passive: false });

  var bar = $('load-bar').querySelector('i'), pct = $('load-pct');
  Assets.load(function (p) { bar.style.width = Math.round(p * 100) + '%'; pct.textContent = Math.round(p * 100) + '%'; })
    .then(function () {
      if (!Assets.levels) throw new Error('levels');
      UI.wire();
      Game.init();
      if (Assets.failed.length) console.warn('missing assets', Assets.failed);
      setTimeout(function () { UI.goHome(); }, 250);
    })
    .catch(function (e) {
      console.error(e);
      $('load-msg').textContent = T('load_fail');
    });

  // test hook
  window.__woof = { Store: Store, Game: Game, UI: UI, Puzzle: Puzzle };
})();
