/* Woofdoku — asset loader.
 * Reads assets/manifest.json, preloads every image, decodes every sound and loads the level data,
 * reporting progress.
 *   Assets.load(onProgress) -> Promise
 *   Assets.img(key)   -> HTMLImageElement (e.g. 'pup/corgi_idle')
 *   Assets.levels     -> { levels: [...], daily: [...] } from assets/data/levels.json
 *   Assets.url(key)   -> URL string for <img src>
 *   Assets.sfx[id]    -> { buffer: AudioBuffer, offset }
 *   Assets.music[key] -> { buffer: AudioBuffer, loopStart, loopEnd }
 */
(function () {
  'use strict';
  var BASE = 'assets/';
  var TIMEOUT = 20000; // a stalled download is skipped instead of blocking the loading screen
  var Assets = { manifest: null, images: {}, sfx: {}, music: {}, levels: null, version: '', failed: [] };

  function withVersion(file) { return BASE + file + (Assets.version ? '?v=' + encodeURIComponent(Assets.version) : ''); }

  Assets.url = function (key) {
    var m = Assets.manifest && Assets.manifest.images[key];
    return m ? withVersion(m.file) : '';
  };
  Assets.img = function (key) { return Assets.images[key] || null; };

  function once(fn) { var called = false; return function () { if (!called) { called = true; fn(); } }; }
  function loadImage(key, meta, done) {
    var im = new Image(), fin = once(done);
    var timer = setTimeout(function () { Assets.failed.push(meta.file); fin(); }, TIMEOUT);
    im.onload = function () { clearTimeout(timer); Assets.images[key] = im; fin(); };
    im.onerror = function () { clearTimeout(timer); Assets.failed.push(meta.file); fin(); };
    im.src = withVersion(meta.file);
  }

  // decode with an offline context so no AudioContext is created before the first tap
  var decoder = null;
  function decode(buf) {
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return Promise.reject(new Error('no web audio'));
    if (!decoder) decoder = new OAC(2, 1, 44100);
    return new Promise(function (res, rej) {
      var p = decoder.decodeAudioData(buf, res, rej);
      if (p && p.then) p.then(res, rej);
    });
  }
  function loadSound(file, done, onBuffer) {
    var fin = once(done), ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); Assets.failed.push(file); fin(); }, TIMEOUT);
    fetch(withVersion(file), ctrl ? { signal: ctrl.signal } : undefined).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.arrayBuffer();
    }).then(decode).then(function (b) { clearTimeout(timer); onBuffer(b); fin(); })
      .catch(function () { clearTimeout(timer); if (Assets.failed.indexOf(file) < 0) Assets.failed.push(file); fin(); });
  }

  Assets.load = function (onProgress) {
    return fetch(BASE + 'manifest.json?t=' + Date.now()).then(function (r) {
      if (!r.ok) throw new Error('manifest ' + r.status);
      return r.json();
    }).then(function (man) {
      Assets.manifest = man;
      Assets.version = man.version || '';
      // every image is also a CSS variable (absolute URL): ui/btn_green -> --ui-btn_green
      var rootStyle = document.documentElement.style;
      Object.keys(man.images).forEach(function (k) {
        try { rootStyle.setProperty('--' + k.replace(/\//g, '-'), 'url("' + new URL(withVersion(man.images[k].file), location.href).href + '")'); } catch (e) {}
      });
      var jobs = [], total = 0, loaded = 0;
      function add(meta, run) { var w = meta.bytes || 20000; total += w; jobs.push({ w: w, run: run }); }
      add({ bytes: 30000 }, function (done) {
        fetch(withVersion('data/levels.json')).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
          .then(function (d) { Assets.levels = d; done(); })
          .catch(function () { Assets.failed.push('data/levels.json'); done(); });
      });
      add({ bytes: 30000 }, function (done) {
        // web font (Latin); Chinese text falls back to the system font
        try {
          if (!document.fonts || !document.fonts.load) return done();
          var t = setTimeout(done, 4000);
          Promise.all([document.fonts.load('700 20px Fredoka'), document.fonts.load('600 20px Fredoka'), document.fonts.load('500 20px Fredoka')])
            .then(function () { clearTimeout(t); done(); }, function () { clearTimeout(t); done(); });
        } catch (e) { done(); }
      });
      Object.keys(man.images).forEach(function (k) {
        add(man.images[k], function (done) { loadImage(k, man.images[k], done); });
      });
      Object.keys(man.sfx).forEach(function (id) {
        var m = man.sfx[id];
        add(m, function (done) { loadSound(m.file, done, function (b) { Assets.sfx[id] = { buffer: b, offset: m.offset || 0 }; }); });
      });
      Object.keys(man.music).forEach(function (k) {
        var m = man.music[k];
        add(m, function (done) { loadSound(m.file, done, function (b) { Assets.music[k] = { buffer: b, loopStart: m.loopStart || 0, loopEnd: m.loopEnd || b.duration }; }); });
      });
      return new Promise(function (res) {
        var left = jobs.length;
        if (!left) res();
        jobs.forEach(function (j) {
          j.run(function () {
            loaded += j.w;
            if (onProgress) onProgress(Math.min(1, loaded / total));
            if (--left === 0) res();
          });
        });
      });
    }).then(function () {
      if (Assets.failed.length) console.warn('assets failed to load:', Assets.failed);
      return Assets;
    });
  };

  window.Assets = Assets;
})();
