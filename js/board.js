/* Woofdoku — board renderer and touch input.
 *
 *   var bv = new BoardView(canvas, handlers)   handlers: onTap(i), onDrag(i, first), onDragEnd()
 *   bv.setLevel({ n, reg, colors, breeds, patterns })   colors[g] = palette index, breeds[g] = pup id
 *   bv.resize(cssSize)
 *   bv.setMark(i, v, delay)   v: 0 none, 1 player ✕, 2 certain ✕
 *   bv.placePup(i, opts) / bv.wrongPup(i) / bv.conflict(a, b) / bv.nudge(i)
 *   bv.hint(spec) / bv.clearHint()        spec: { units: [], cells: [], target: i, elim: [] }
 *   bv.winWave() -> Promise
 *   bv.cellCenter(i) -> { x, y } in CSS px relative to the canvas
 *   BoardView.PALETTE, BoardView.assignColors(n, reg, seed), BoardView.drawMini(canvas, spec)
 */
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  var INK = '#3d2615';

  // one flat colour per yard (dark = ✕ marks and colour-blind symbols)
  var PALETTE = [
    { base: '#ffb2ca', dark: '#d2416f' }, // 0 pink
    { base: '#ffc795', dark: '#cf6c1c' }, // 1 peach
    { base: '#ffe77e', dark: '#b48607' }, // 2 lemon
    { base: '#b2e79c', dark: '#3f902c' }, // 3 mint
    { base: '#9dd3ff', dark: '#2a78c4' }, // 4 sky
    { base: '#cbb8ff', dark: '#6843cc' }, // 5 lilac
    { base: '#92e2d6', dark: '#178a7e' }, // 6 aqua
    { base: '#ff9a91', dark: '#c23d34' }, // 7 coral
    { base: '#e5cfa6', dark: '#8f6a38' }, // 8 sand
    { base: '#c7d0e4', dark: '#566584' }  // 9 cloud
  ];
  // how alike two palette colours look (0 = very different)
  var SIM = {};
  [[0, 7, 3], [1, 8, 2], [1, 2, 2], [3, 6, 2], [4, 6, 2], [4, 9, 2], [5, 9, 2], [0, 5, 1.5], [1, 7, 2], [2, 8, 1.5], [8, 9, 1], [0, 1, 1], [3, 2, 1], [5, 4, 1]]
    .forEach(function (p) { SIM[p[0] + ',' + p[1]] = p[2]; SIM[p[1] + ',' + p[0]] = p[2]; });
  function sim(a, b) { return SIM[a + ',' + b] || 0; }

  function seeded(seed) { var a = seed | 0; return function () { a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // palette index per yard: neighbouring yards get clearly different colours
  function assignColors(n, reg, seed) {
    var adj = [], g, h, i;
    for (g = 0; g < n; g++) adj.push(new Array(n).fill(0));
    for (i = 0; i < n * n; i++) {
      var r = (i / n) | 0, c = i % n;
      if (c + 1 < n && reg[i] !== reg[i + 1]) { adj[reg[i]][reg[i + 1]] = adj[reg[i + 1]][reg[i]] = 1; }
      if (r + 1 < n && reg[i] !== reg[i + n]) { adj[reg[i]][reg[i + n]] = adj[reg[i + n]][reg[i]] = 1; }
    }
    function cost(p) {
      var s = 0;
      for (var a = 0; a < n; a++) for (var b = a + 1; b < n; b++) s += sim(p[a], p[b]) * (adj[a][b] ? 3 : 0.4);
      return s;
    }
    var rnd = seeded(seed * 7919 + 17), best = null, bestC = 1e9;
    for (var restart = 0; restart < 6; restart++) {
      var p = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (i = 9; i > 0; i--) { var j = (rnd() * (i + 1)) | 0; var t = p[i]; p[i] = p[j]; p[j] = t; }
      var cur = cost(p);
      for (var it = 0; it < 300; it++) {
        var a = (rnd() * n) | 0, b = (rnd() * 10) | 0;
        if (a === b) continue;
        t = p[a]; p[a] = p[b]; p[b] = t;
        var c2 = cost(p);
        if (c2 <= cur) cur = c2; else { t = p[a]; p[a] = p[b]; p[b] = t; }
      }
      if (cur < bestC) { bestC = cur; best = p.slice(0, n); }
    }
    void h;
    return best;
  }

  // ------------------------------------------------------------------ shared drawing
  function rr(x, px, py, w, h, r) {
    x.beginPath();
    x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
  }
  function symbol(x, k, cx, cy, s) {
    x.beginPath();
    switch (k % 10) {
      case 0: x.arc(cx, cy, s, 0, TAU); break;
      case 1: x.moveTo(cx, cy - s); x.lineTo(cx + s, cy + s * 0.8); x.lineTo(cx - s, cy + s * 0.8); x.closePath(); break;
      case 2: x.rect(cx - s * 0.85, cy - s * 0.85, s * 1.7, s * 1.7); break;
      case 3: x.moveTo(cx, cy - s); x.lineTo(cx + s, cy); x.lineTo(cx, cy + s); x.lineTo(cx - s, cy); x.closePath(); break;
      case 4: for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.45 : s * 1.1; if (!i) x.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); else x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); break;
      case 5: x.rect(cx - s, cy - s * 0.3, s * 2, s * 0.6); x.rect(cx - s * 0.3, cy - s, s * 0.6, s * 2); break;
      case 6: for (i = 0; i < 6; i++) { a = i / 6 * TAU; if (!i) x.moveTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s); else x.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s); } x.closePath(); break;
      case 7: x.moveTo(cx, cy + s); x.bezierCurveTo(cx - s * 1.4, cy, cx - s * 0.6, cy - s * 1.2, cx, cy - s * 0.4); x.bezierCurveTo(cx + s * 0.6, cy - s * 1.2, cx + s * 1.4, cy, cx, cy + s); break;
      case 8: x.arc(cx, cy, s, 0, TAU); x.moveTo(cx + s * 0.45, cy); x.arc(cx, cy, s * 0.45, 0, TAU, true); break;
      case 9: x.moveTo(cx - s, cy + s * 0.6); x.lineTo(cx, cy - s); x.lineTo(cx + s, cy + s * 0.6); x.lineTo(cx + s * 0.55, cy + s * 0.6); x.lineTo(cx, cy - s * 0.2); x.lineTo(cx - s * 0.55, cy + s * 0.6); x.closePath(); break;
    }
    x.fill('evenodd');
  }
  function drawX(x, cx, cy, s, col, lw) {
    x.lineCap = 'round';
    x.beginPath(); x.moveTo(cx - s, cy - s); x.lineTo(cx + s, cy + s); x.moveTo(cx + s, cy - s); x.lineTo(cx - s, cy + s);
    x.lineWidth = lw * 1.9; x.strokeStyle = 'rgba(255,255,255,0.75)'; x.stroke();
    x.lineWidth = lw; x.strokeStyle = col; x.stroke();
  }

  // static layer: frame, cells, grid lines, yard borders
  // wooden frame around the grid; returns the grid geometry
  function drawFrame(x, S) {
    var f = S * 0.052, R = S * 0.07, Ri = Math.max(4, S * 0.022), k;
    rr(x, 0, 0, S, S, R); x.fillStyle = '#4a2a12'; x.fill();
    var wg = x.createLinearGradient(0, 0, 0, S);
    wg.addColorStop(0, '#f2b672'); wg.addColorStop(0.5, '#dc9551'); wg.addColorStop(1, '#bf7433');
    rr(x, S * 0.009, S * 0.009, S * 0.982, S * 0.982, R * 0.88); x.fillStyle = wg; x.fill();
    // grain in the frame ring only
    x.save();
    x.beginPath(); x.rect(0, 0, S, S); x.rect(f, f, S - 2 * f, S - 2 * f); x.clip('evenodd');
    x.strokeStyle = 'rgba(120,60,20,0.28)'; x.lineWidth = Math.max(1, S * 0.0035);
    function wave(horizontal, pos, ph) {
      x.beginPath();
      for (var t = 0; t <= S; t += S / 40) {
        var o = Math.sin(t / S * 18 + ph) * S * 0.003;
        if (horizontal) { if (!t) x.moveTo(t, pos + o); else x.lineTo(t, pos + o); } else { if (!t) x.moveTo(pos + o, t); else x.lineTo(pos + o, t); }
      }
      x.stroke();
    }
    [0.36, 0.66].forEach(function (p, j) { wave(true, f * p, j * 2); wave(true, S - f * p, j * 3 + 1); wave(false, f * p, j + 4); wave(false, S - f * p, j * 2 + 5); });
    x.restore();
    rr(x, S * 0.016, S * 0.016, S * 0.968, S * 0.968, R * 0.8); x.lineWidth = Math.max(1.5, S * 0.005); x.strokeStyle = 'rgba(255,235,200,0.55)'; x.stroke();
    // groove + nails
    var gw = S * 0.012;
    rr(x, f - gw, f - gw, S - 2 * f + 2 * gw, S - 2 * f + 2 * gw, Ri + gw); x.fillStyle = '#6a3a17'; x.fill();
    [[f / 2, f / 2], [S - f / 2, f / 2], [f / 2, S - f / 2], [S - f / 2, S - f / 2]].forEach(function (p) {
      x.beginPath(); x.arc(p[0], p[1], S * 0.011, 0, TAU); x.fillStyle = '#7a4518'; x.fill();
      x.beginPath(); x.arc(p[0] - S * 0.003, p[1] - S * 0.003, S * 0.0045, 0, TAU); x.fillStyle = 'rgba(255,236,200,0.85)'; x.fill();
    });
    void k;
    return { m: f, G: S - 2 * f, R: Ri };
  }

  // static layer: frame, flat yard colours, grid lines, yard borders
  function drawStatic(x, S, n, reg, colors, patterns) {
    var fr = drawFrame(x, S), m = fr.m, G = fr.G, c = G / n, R = fr.R, i, r, k;
    x.save();
    rr(x, m, m, G, G, R); x.clip();
    for (i = 0; i < n * n; i++) {
      r = (i / n) | 0; k = i % n;
      var col = PALETTE[colors[reg[i]]];
      x.fillStyle = col.base; x.fillRect(m + k * c - 0.5, m + r * c - 0.5, c + 1, c + 1);
      if (patterns) {
        x.fillStyle = col.dark; x.globalAlpha = 0.35;
        symbol(x, colors[reg[i]], m + k * c + c * 0.2, m + r * c + c * 0.2, c * 0.085);
        x.globalAlpha = 1;
      }
    }
    // thin grid
    x.strokeStyle = 'rgba(70,40,20,0.17)'; x.lineWidth = Math.max(1, S / 380);
    x.beginPath();
    for (k = 1; k < n; k++) { x.moveTo(m + k * c, m); x.lineTo(m + k * c, m + G); x.moveTo(m, m + k * c); x.lineTo(m + G, m + k * c); }
    x.stroke();
    x.restore();
    // yard borders
    var bw = Math.max(2.5, c * 0.085);
    x.strokeStyle = INK; x.lineWidth = bw; x.lineCap = 'round';
    x.beginPath();
    for (i = 0; i < n * n; i++) {
      r = (i / n) | 0; k = i % n;
      if (k + 1 < n && reg[i] !== reg[i + 1]) { x.moveTo(m + (k + 1) * c, m + r * c); x.lineTo(m + (k + 1) * c, m + (r + 1) * c); }
      if (r + 1 < n && reg[i] !== reg[i + n]) { x.moveTo(m + k * c, m + (r + 1) * c); x.lineTo(m + (k + 1) * c, m + (r + 1) * c); }
    }
    x.stroke();
    rr(x, m, m, G, G, R); x.lineWidth = bw * 1.15; x.stroke();
    return { m: m, c: c, G: G, R: R };
  }

  // ------------------------------------------------------------------ BoardView
  function BoardView(canvas, h) {
    this.cv = canvas; this.x = canvas.getContext('2d'); this.h = h || {};
    this.size = 300; this.dpr = 1; this.n = 0;
    this.stat = document.createElement('canvas');
    this.running = false; this.hintSpec = null; this.locked = false;
    this.fx = []; // board-local effects
    this.pointer = null;
    var self = this;
    canvas.addEventListener('pointerdown', function (e) { self._down(e); });
    canvas.addEventListener('pointermove', function (e) { self._move(e); });
    canvas.addEventListener('pointerup', function (e) { self._up(e); });
    canvas.addEventListener('pointercancel', function (e) { self._cancel(e); });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    this._frame = function (t) { self._render(t); };
  }
  var P = BoardView.prototype;

  P.setLevel = function (L) {
    this.n = L.n; this.reg = L.reg; this.colors = L.colors; this.breeds = L.breeds; this.patterns = !!L.patterns;
    var N = this.n * this.n;
    this.mark = new Uint8Array(N); this.markT = new Float64Array(N).fill(-9);
    this.pup = new Uint8Array(N); this.pupT = new Float64Array(N).fill(-9);
    this.phase = []; for (var i = 0; i < N; i++) this.phase.push(Math.random() * TAU);
    this.blinkAt = new Float64Array(N); this.sad = {}; this.joy = null;
    this.hintSpec = null; this.fx = []; this.locked = false; this.press = -1;
    this._buildStatic();
  };
  P.setPatterns = function (on) { this.patterns = !!on; this._buildStatic(); };
  P.resize = function (css) {
    this.size = Math.max(120, Math.floor(css));
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.cv.width = Math.round(this.size * this.dpr); this.cv.height = Math.round(this.size * this.dpr);
    this.cv.style.width = this.size + 'px'; this.cv.style.height = this.size + 'px';
    if (this.n) this._buildStatic();
  };
  P._buildStatic = function () {
    var S = this.size * this.dpr;
    this.stat.width = Math.round(S); this.stat.height = Math.round(S);
    var sx = this.stat.getContext('2d');
    sx.clearRect(0, 0, S, S);
    this.geo = drawStatic(sx, S, this.n, this.reg, this.colors, this.patterns);
  };
  P.cellCenter = function (i) {
    var g = this.geo, d = this.dpr, n = this.n;
    return { x: (g.m + (i % n + 0.5) * g.c) / d, y: (g.m + (((i / n) | 0) + 0.5) * g.c) / d };
  };
  P.cellSize = function () { return this.geo.c / this.dpr; };
  P.cellAt = function (cx, cy) {
    var g = this.geo, d = this.dpr, px = cx * d - g.m, py = cy * d - g.m;
    if (px < 0 || py < 0 || px >= g.G || py >= g.G) return -1;
    return Math.min(this.n - 1, (py / g.c) | 0) * this.n + Math.min(this.n - 1, (px / g.c) | 0);
  };
  P.start = function () { if (!this.running) { this.running = true; requestAnimationFrame(this._frame); } };
  P.stop = function () { this.running = false; };
  function now() { return performance.now() / 1000; }

  // ---- state changes
  P.setMark = function (i, v, delay) { this.mark[i] = v; this.markT[i] = now() + (delay || 0); };
  P.placePup = function (i, o) {
    o = o || {};
    this.pup[i] = 1; this.mark[i] = 0; this.pupT[i] = now() + (o.delay || 0);
    this.blinkAt[i] = now() + 2 + Math.random() * 4;
    this.fx.push({ kind: 'pop', i: i, t: now() + (o.delay || 0), life: 0.5 });
  };
  P.wrongPup = function (i) { this.sad[i] = now(); this.fx.push({ kind: 'red', i: i, t: now(), life: 0.8 }); };
  P.conflict = function (a, b) { this.fx.push({ kind: 'conflict', a: a, b: b, t: now(), life: 1.1 }); this.nudge(b); };
  P.nudge = function (i) { this.fx.push({ kind: 'nudge', i: i, t: now(), life: 0.45 }); };
  P.glowCells = function (cells, color, life) { this.fx.push({ kind: 'glow', cells: cells, color: color || '#fff6b0', t: now(), life: life || 0.9 }); };
  P.hint = function (spec) { this.hintSpec = spec; this.hintT = now(); };
  P.clearHint = function () { this.hintSpec = null; };
  P.winWave = function () {
    var self = this;
    this.joy = now(); this.locked = true;
    return new Promise(function (res) { setTimeout(res, 1500); void self; });
  };
  P.resetJoy = function () { this.joy = null; };

  // ---- input
  P._pos = function (e) { var r = this.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  P._down = function (e) {
    if (this.pointer || this.locked) return;
    e.preventDefault();
    var p = this._pos(e), i = this.cellAt(p.x, p.y);
    if (i < 0) return;
    try { this.cv.setPointerCapture(e.pointerId); } catch (err) {}
    this.pointer = { id: e.pointerId, start: i, cur: i, drag: false };
    this.press = i; this.pressT = now();
    if (this.h.onPress) this.h.onPress(i);
  };
  P._move = function (e) {
    var pt = this.pointer;
    if (!pt || e.pointerId !== pt.id) return;
    e.preventDefault();
    var p = this._pos(e), i = this.cellAt(p.x, p.y);
    if (i < 0 || i === pt.cur) return;
    if (!pt.drag) { pt.drag = true; if (this.h.onDrag) this.h.onDrag(pt.start, true); }
    // fill in skipped cells along a fast swipe (same row/column interpolation)
    var n = this.n, r0 = (pt.cur / n) | 0, c0 = pt.cur % n, r1 = (i / n) | 0, c1 = i % n;
    var steps = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0));
    for (var s = 1; s <= steps; s++) {
      var rr2 = Math.round(r0 + (r1 - r0) * s / steps), cc = Math.round(c0 + (c1 - c0) * s / steps);
      if (this.h.onDrag) this.h.onDrag(rr2 * n + cc, false);
    }
    pt.cur = i; this.press = i;
  };
  P._up = function (e) {
    var pt = this.pointer;
    if (!pt || e.pointerId !== pt.id) return;
    this.pointer = null; this.press = -1;
    if (pt.drag) { if (this.h.onDragEnd) this.h.onDragEnd(); }
    else if (this.h.onTap) this.h.onTap(pt.start);
  };
  P._cancel = function (e) {
    var pt = this.pointer;
    if (!pt || e.pointerId !== pt.id) return;
    this.pointer = null; this.press = -1;
    if (pt.drag && this.h.onDragEnd) this.h.onDragEnd();
  };

  // ---- render
  function easeOutBack(t) { var c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }

  P._render = function () {
    if (!this.running) return;
    requestAnimationFrame(this._frame);
    if (!this.n || document.hidden) return;
    var x = this.x, S = this.size * this.dpr, g = this.geo, n = this.n, t = now(), i, k;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, S, S);
    x.drawImage(this.stat, 0, 0);
    var c = g.c, m = g.m;
    function cx(i) { return m + (i % n + 0.5) * c; }
    function cy(i) { return m + (((i / n) | 0) + 0.5) * c; }

    // hint highlight: a glowing golden outline around the involved cells (yard colours stay untouched)
    var hs = this.hintSpec;
    if (hs) {
      var ht = t - this.hintT, pulse = 0.5 + 0.5 * Math.sin(ht * 5);
      var inv = {};
      (hs.cells || []).forEach(function (j) { inv[j] = 1; });
      x.save();
      x.lineCap = 'round'; x.lineJoin = 'round';
      x.beginPath();
      for (i = 0; i < n * n; i++) {
        if (!inv[i]) continue;
        var r1 = (i / n) | 0, c1 = i % n, px0 = m + c1 * c, py0 = m + r1 * c;
        if (r1 === 0 || !inv[i - n]) { x.moveTo(px0, py0); x.lineTo(px0 + c, py0); }
        if (r1 === n - 1 || !inv[i + n]) { x.moveTo(px0, py0 + c); x.lineTo(px0 + c, py0 + c); }
        if (c1 === 0 || !inv[i - 1]) { x.moveTo(px0, py0); x.lineTo(px0, py0 + c); }
        if (c1 === n - 1 || !inv[i + 1]) { x.moveTo(px0 + c, py0); x.lineTo(px0 + c, py0 + c); }
      }
      x.shadowColor = 'rgba(255,190,30,0.95)'; x.shadowBlur = c * 0.3;
      x.lineWidth = Math.max(4, c * 0.13); x.strokeStyle = 'rgba(255,208,60,' + (0.55 + 0.45 * pulse) + ')'; x.stroke();
      x.shadowBlur = 0; x.lineWidth = Math.max(1.5, c * 0.04); x.strokeStyle = 'rgba(255,255,230,0.9)'; x.stroke();
      x.restore();
      if (hs.mark) { // cells the player should cross out (tutorial)
        x.globalAlpha = 0.35 + 0.35 * pulse;
        var self = this;
        hs.mark.forEach(function (j) { if (!self.mark[j]) drawX(x, cx(j), cy(j), c * 0.15, '#ffffff', Math.max(2, c * 0.08)); });
        x.globalAlpha = 1;
      }
      if (hs.elim) {
        x.lineWidth = Math.max(2, c * 0.06); x.strokeStyle = 'rgba(255,90,90,' + (0.5 + 0.5 * pulse) + ')';
        hs.elim.forEach(function (j) { rr(x, m + (j % n) * c + c * 0.08, m + ((j / n) | 0) * c + c * 0.08, c * 0.84, c * 0.84, c * 0.18); x.stroke(); });
      }
      if (hs.target != null) {
        var j = hs.target;
        x.lineWidth = Math.max(3, c * 0.09); x.strokeStyle = 'rgba(255,196,40,' + (0.6 + 0.4 * pulse) + ')';
        rr(x, m + (j % n) * c + c * 0.06, m + ((j / n) | 0) * c + c * 0.06, c * 0.88, c * 0.88, c * 0.2); x.stroke();
        x.fillStyle = 'rgba(255,240,150,' + (0.25 + 0.25 * pulse) + ')'; x.fill();
      }
    }

    // press feedback
    if (this.press >= 0 && !this.locked) {
      i = this.press;
      x.fillStyle = 'rgba(255,255,255,0.35)';
      rr(x, m + (i % n) * c + 2, m + ((i / n) | 0) * c + 2, c - 4, c - 4, c * 0.18); x.fill();
    }

    // board effects under the pieces
    for (k = this.fx.length - 1; k >= 0; k--) {
      var f = this.fx[k], ft = (t - f.t) / f.life;
      if (ft >= 1) { this.fx.splice(k, 1); continue; }
      if (ft < 0) continue;
      if (f.kind === 'red') {
        x.fillStyle = 'rgba(255,70,70,' + (0.45 * (1 - ft)) + ')';
        rr(x, m + (f.i % n) * c + 1, m + ((f.i / n) | 0) * c + 1, c - 2, c - 2, c * 0.18); x.fill();
      } else if (f.kind === 'conflict') {
        var a = Math.sin(ft * Math.PI * 4) > -0.2 ? (1 - ft) : 0;
        x.fillStyle = 'rgba(255,70,70,' + (0.35 * a) + ')';
        [f.a, f.b].forEach(function (q) { rr(x, m + (q % n) * c + 1, m + ((q / n) | 0) * c + 1, c - 2, c - 2, c * 0.18); x.fill(); });
        x.strokeStyle = 'rgba(230,50,60,' + a + ')'; x.lineWidth = Math.max(2.5, c * 0.07); x.setLineDash([c * 0.12, c * 0.1]); x.lineCap = 'round';
        x.beginPath(); x.moveTo(cx(f.a), cy(f.a)); x.lineTo(cx(f.b), cy(f.b)); x.stroke(); x.setLineDash([]);
      } else if (f.kind === 'glow') {
        x.fillStyle = f.color; x.globalAlpha = 0.55 * Math.sin(ft * Math.PI);
        f.cells.forEach(function (q) { rr(x, m + (q % n) * c + 1, m + ((q / n) | 0) * c + 1, c - 2, c - 2, c * 0.18); x.fill(); });
        x.globalAlpha = 1;
      }
    }

    // marks
    for (i = 0; i < n * n; i++) {
      if (!this.mark[i]) continue;
      var mt = t - this.markT[i];
      if (mt < 0) continue;
      var sc = mt < 0.22 ? easeOutBack(mt / 0.22) : 1;
      var dark = PALETTE[this.colors[this.reg[i]]].dark;
      x.globalAlpha = this.mark[i] === 2 ? 0.55 : 0.92;
      drawX(x, cx(i), cy(i), c * (this.mark[i] === 2 ? 0.13 : 0.155) * sc, dark, Math.max(2, c * (this.mark[i] === 2 ? 0.07 : 0.085)));
      x.globalAlpha = 1;
    }

    // pups
    var nudges = {};
    this.fx.forEach(function (f) { if (f.kind === 'nudge') nudges[f.i] = (t - f.t) / f.life; });
    var joyT = this.joy != null ? t - this.joy : -1;
    for (i = 0; i < n * n; i++) {
      var isSad = this.sad[i] != null;
      if (!this.pup[i] && !isSad) continue;
      var breed = this.breeds[this.reg[i]], expr = 'idle', pt2 = t - (isSad ? this.sad[i] : this.pupT[i]);
      if (pt2 < 0) continue;
      var s2 = 1, ox = 0, oy = 0, alpha = 1, rot = 0;
      if (isSad) {
        expr = 'sad';
        s2 = pt2 < 0.25 ? easeOutBack(pt2 / 0.25) : 1;
        ox = pt2 < 0.8 ? Math.sin(pt2 * 38) * c * 0.06 * (1 - pt2 / 0.8) : 0;
        if (pt2 > 0.95) { alpha = 1 - clamp01((pt2 - 0.95) / 0.3); s2 = 1 - 0.3 * clamp01((pt2 - 0.95) / 0.3); }
        if (pt2 > 1.25) { delete this.sad[i]; continue; }
      } else {
        s2 = pt2 < 0.42 ? easeOutBack(pt2 / 0.42) : 1;
        // idle breathing + blink
        var sy2 = 1 + 0.025 * Math.sin(t * 2.4 + this.phase[i]);
        if (t > this.blinkAt[i]) { if (t > this.blinkAt[i] + 0.16) this.blinkAt[i] = t + 2.5 + Math.random() * 4; else expr = 'blink'; }
        if (pt2 < 0.6) expr = 'joy';
        if (joyT >= 0) {
          var r0 = (i / n) | 0, d = joyT - r0 * 0.08;
          if (d > 0 && d < 0.5) { oy = -Math.sin(d / 0.5 * Math.PI) * c * 0.28; }
          if (d > 0) expr = 'joy';
        }
        if (nudges[i] != null) { rot = Math.sin(nudges[i] * Math.PI * 5) * 0.18 * (1 - nudges[i]); }
        x.save(); x.translate(cx(i), cy(i) + c * 0.38);
        x.fillStyle = 'rgba(90,50,30,0.14)'; x.beginPath(); x.ellipse(0, 0, c * 0.3 * s2, c * 0.08 * s2, 0, 0, TAU); x.fill();
        x.restore();
        var img0 = window.Assets && Assets.img('pup/' + breed + '_' + expr);
        if (img0) {
          var sz0 = c * 1.13;
          x.save(); x.translate(cx(i) + ox, cy(i) + oy + c * 0.02); x.rotate(rot); x.scale(s2 * (2 - sy2), s2 * sy2);
          x.drawImage(img0, -sz0 / 2, -sz0 / 2 - c * 0.02, sz0, sz0);
          x.restore();
        }
        continue;
      }
      var img = window.Assets && Assets.img('pup/' + breed + '_' + expr);
      if (!img) continue;
      var sz = c * 1.13;
      x.save(); x.globalAlpha = alpha; x.translate(cx(i) + ox, cy(i) + oy); x.rotate(rot); x.scale(s2, s2);
      x.drawImage(img, -sz / 2, -sz / 2, sz, sz);
      x.restore();
    }

    // pop rings on top
    for (k = 0; k < this.fx.length; k++) {
      f = this.fx[k]; ft = (t - f.t) / f.life;
      if (f.kind !== 'pop' || ft < 0 || ft >= 1) continue;
      x.strokeStyle = 'rgba(255,255,255,' + (1 - ft) + ')'; x.lineWidth = Math.max(2, c * 0.08 * (1 - ft));
      x.beginPath(); x.arc(cx(f.i), cy(f.i), c * (0.3 + 0.45 * ft), 0, TAU); x.stroke();
    }
    if (joyT >= 0 && joyT < 1.6) {
      x.save(); rr(x, m, m, g.G, g.G, g.R); x.lineWidth = c * 0.12 * (1 - joyT / 1.6);
      x.strokeStyle = 'rgba(255,215,90,' + (1 - joyT / 1.6) + ')'; x.stroke(); x.restore();
    }
  };

  // static illustration of a small board (rules / tutorial cards)
  BoardView.drawMini = function (canvas, spec) {
    var dpr = Math.min(window.devicePixelRatio || 1, 3), css = spec.size || 150, S = Math.round(css * dpr);
    canvas.width = S; canvas.height = S; canvas.style.width = css + 'px'; canvas.style.height = css + 'px';
    var x = canvas.getContext('2d'), n = spec.n, reg = spec.reg;
    var geo = drawStatic(x, S, n, reg, spec.colors, false), m = geo.m, c = geo.c;
    function cx(i) { return m + (i % n + 0.5) * c; }
    function cy(i) { return m + (((i / n) | 0) + 0.5) * c; }
    (spec.glow || []).forEach(function (i) { x.fillStyle = 'rgba(255,245,160,0.7)'; rr(x, m + (i % n) * c + 2, m + ((i / n) | 0) * c + 2, c - 4, c - 4, c * 0.2); x.fill(); });
    (spec.red || []).forEach(function (i) { x.fillStyle = 'rgba(255,120,120,0.55)'; rr(x, m + (i % n) * c + 2, m + ((i / n) | 0) * c + 2, c - 4, c - 4, c * 0.2); x.fill(); });
    (spec.marks || []).forEach(function (i) { drawX(x, cx(i), cy(i), c * 0.15, PALETTE[spec.colors[reg[i]]].dark, Math.max(2, c * 0.085)); });
    (spec.pups || []).forEach(function (p) {
      var img = window.Assets && Assets.img('pup/' + p[1] + '_' + (p[2] || 'idle'));
      if (img) x.drawImage(img, cx(p[0]) - c * 0.565, cy(p[0]) - c * 0.565, c * 1.13, c * 1.13);
    });
    if (spec.lines) {
      x.strokeStyle = 'rgba(230,50,60,0.85)'; x.lineWidth = Math.max(2.5, c * 0.07); x.setLineDash([c * 0.12, c * 0.1]); x.lineCap = 'round';
      spec.lines.forEach(function (l) { x.beginPath(); x.moveTo(cx(l[0]), cy(l[0])); x.lineTo(cx(l[1]), cy(l[1])); x.stroke(); });
      x.setLineDash([]);
    }
  };

  BoardView.PALETTE = PALETTE;
  BoardView.assignColors = assignColors;
  window.BoardView = BoardView;
})();
