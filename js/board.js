/* Woofdoku — board renderer and touch input.
 *
 * Look: a white card with one rounded tile per cell (small gaps, no borders); colour zones are
 * told apart by tile colour only. ✕ marks are big white strokes that draw themselves.
 *
 *   var bv = new BoardView(canvas, handlers)   handlers: onTap(i), onDrag(i, first), onDragEnd()
 *   bv.setLevel({ n, reg, colors, breeds })   colors[g] = palette index, breeds[g] = pup id
 *   bv.resize(cssSize)
 *   bv.setMark(i, v, delay)   v: 0 none, 1 player ✕, 2 certain ✕ (Locate / wrong spot)
 *   bv.placePup(i, opts) / bv.wrongPup(i) / bv.conflict(a, b) / bv.nudge(i) / bv.glowCells(cells, color, life)
 *   bv.hint(spec) / bv.clearHint()        spec: { cells: [], target: i, mark: [] }
 *   bv.winWave() -> Promise
 *   bv.cellCenter(i) -> { x, y } in CSS px relative to the canvas
 *   BoardView.PALETTE, BoardView.assignColors(n, reg, seed), BoardView.drawMini(canvas, spec), BoardView.drawRuleIcon(canvas, kind, size)
 */
(function () {
  'use strict';
  var TAU = Math.PI * 2;

  // one flat colour per zone
  var PALETTE = [
    { base: '#f58aaf', dark: '#b8386a' }, // 0 pink
    { base: '#ffa95f', dark: '#b85d12' }, // 1 orange
    { base: '#f7cd55', dark: '#9c7806' }, // 2 yellow
    { base: '#86d277', dark: '#3a8a2c' }, // 3 green
    { base: '#5db8ec', dark: '#1d6ea8' }, // 4 blue
    { base: '#ab8ff2', dark: '#5a39b5' }, // 5 purple
    { base: '#46c3b6', dark: '#127a6f' }, // 6 teal
    { base: '#f07070', dark: '#a82a2a' }, // 7 red
    { base: '#d7b486', dark: '#7d5a2c' }, // 8 tan
    { base: '#a2b1c8', dark: '#4a5a78' }  // 9 gray
  ];
  // how alike two palette colours look (0 = very different)
  var SIM = {};
  [[0, 7, 3], [1, 8, 2], [1, 2, 2], [3, 6, 2], [4, 6, 2], [4, 9, 2], [5, 9, 2], [0, 5, 1.5], [1, 7, 2], [2, 8, 1.5], [8, 9, 1], [0, 1, 1], [3, 2, 1], [5, 4, 1]]
    .forEach(function (p) { SIM[p[0] + ',' + p[1]] = p[2]; SIM[p[1] + ',' + p[0]] = p[2]; });
  function sim(a, b) { return SIM[a + ',' + b] || 0; }

  function seeded(seed) { var a = seed | 0; return function () { a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // palette index per zone: every zone gets its own colour, neighbours clearly different
  function assignColors(n, reg, seed) {
    var adj = [], g, i;
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
    return best;
  }

  // ------------------------------------------------------------------ shared drawing
  function rr(x, px, py, w, h, r) {
    x.beginPath();
    x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
  }
  // big rounded ✕; k = draw progress 0..1 (first stroke, then the second)
  function drawX(x, cx, cy, s, lw, col, k, shadow) {
    if (k == null) k = 1;
    var k1 = Math.min(1, k * 2), k2 = Math.max(0, k * 2 - 1);
    function strokes() {
      x.beginPath();
      x.moveTo(cx - s, cy - s); x.lineTo(cx - s + 2 * s * k1, cy - s + 2 * s * k1);
      if (k2 > 0) { x.moveTo(cx + s, cy - s); x.lineTo(cx + s - 2 * s * k2, cy - s + 2 * s * k2); }
    }
    x.lineCap = 'round'; x.lineWidth = lw;
    if (shadow) { x.save(); x.translate(0, lw * 0.22); strokes(); x.strokeStyle = shadow; x.stroke(); x.restore(); }
    strokes(); x.strokeStyle = col; x.stroke();
  }

  // grid geometry inside a square canvas of S px
  function geometry(S, n) {
    var m = S * 0.04, G = S - 2 * m, c = G / n, gap = Math.max(2, c * 0.075);
    return { m: m, G: G, c: c, gap: gap, ts: c - gap, tr: (c - gap) * 0.17, R: S * 0.055 };
  }
  // static layer: the white card
  function drawCard(x, S) {
    var R = S * 0.055;
    x.save();
    x.shadowColor = 'rgba(80,50,30,0.22)'; x.shadowBlur = S * 0.025; x.shadowOffsetY = S * 0.01;
    rr(x, S * 0.012, S * 0.008, S * 0.976, S * 0.972, R); x.fillStyle = '#fffdf8'; x.fill();
    x.restore();
    rr(x, S * 0.012, S * 0.008, S * 0.976, S * 0.972, R); x.lineWidth = Math.max(1, S * 0.003); x.strokeStyle = 'rgba(190,150,110,0.35)'; x.stroke();
  }
  function tileRect(g, n, i, scale) {
    var s = scale || 1, ts = g.ts * s, cx = g.m + (i % n + 0.5) * g.c, cy = g.m + (((i / n) | 0) + 0.5) * g.c;
    return { x: cx - ts / 2, y: cy - ts / 2, s: ts, cx: cx, cy: cy, r: g.tr * s };
  }
  function drawTile(x, g, n, i, color, scale) {
    var t = tileRect(g, n, i, scale);
    rr(x, t.x, t.y, t.s, t.s, t.r); x.fillStyle = color.base; x.fill();
    return t;
  }

  // ------------------------------------------------------------------ BoardView
  function BoardView(canvas, h) {
    this.cv = canvas; this.x = canvas.getContext('2d'); this.h = h || {};
    this.size = 300; this.dpr = 1; this.n = 0;
    this.stat = document.createElement('canvas');
    this.running = false; this.hintSpec = null; this.locked = false;
    this.fx = [];
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
    this.n = L.n; this.reg = L.reg; this.colors = L.colors; this.breeds = L.breeds;
    var N = this.n * this.n;
    this.mark = new Uint8Array(N); this.markT = new Float64Array(N).fill(-9);
    this.pup = new Uint8Array(N); this.pupT = new Float64Array(N).fill(-9);
    this.phase = []; for (var i = 0; i < N; i++) this.phase.push(Math.random() * TAU);
    this.blinkAt = new Float64Array(N); this.sad = {}; this.joy = null;
    this.hintSpec = null; this.fx = []; this.locked = false; this.press = -1; this.pressAmt = new Float32Array(N);
    this._buildStatic();
  };
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
    drawCard(sx, S);
    this.geo = geometry(S, this.n);
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
    this.joy = now(); this.locked = true;
    return new Promise(function (res) { setTimeout(res, 1500); });
  };

  // ---- input
  P._pos = function (e) { var r = this.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  P._down = function (e) {
    if (this.pointer || this.locked) return;
    e.preventDefault();
    var p = this._pos(e), i = this.cellAt(p.x, p.y);
    if (i < 0) return;
    try { this.cv.setPointerCapture(e.pointerId); } catch (err) {}
    this.pointer = { id: e.pointerId, start: i, cur: i, drag: false };
    this.press = i;
  };
  P._move = function (e) {
    var pt = this.pointer;
    if (!pt || e.pointerId !== pt.id) return;
    e.preventDefault();
    var p = this._pos(e), i = this.cellAt(p.x, p.y);
    if (i < 0 || i === pt.cur) return;
    if (!pt.drag) { pt.drag = true; if (this.h.onDrag) this.h.onDrag(pt.start, true); }
    // fill in skipped cells along a fast swipe
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
    var x = this.x, S = this.size * this.dpr, g = this.geo, n = this.n, N = n * n, t = now(), i, k, f, ft, self = this;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, S, S);
    x.drawImage(this.stat, 0, 0);
    var c = g.c;
    function cx(i) { return g.m + (i % n + 0.5) * c; }
    function cy(i) { return g.m + (((i / n) | 0) + 0.5) * c; }

    var hs = this.hintSpec, ht = hs ? t - this.hintT : 0, pulse = 0.5 + 0.5 * Math.sin(ht * 5), inv = {};
    if (hs) (hs.cells || []).forEach(function (j) { inv[j] = 1; });
    var joyT = this.joy != null ? t - this.joy : -1;

    // tiles (pressed tiles sink a little; highlighted tiles glow)
    for (i = 0; i < N; i++) {
      var target = this.press === i && !this.locked ? 1 : 0;
      this.pressAmt[i] += (target - this.pressAmt[i]) * 0.35;
      var sc = 1 - 0.07 * this.pressAmt[i];
      if (joyT >= 0) { var dj = joyT - (((i / n) | 0) + i % n) * 0.05; if (dj > 0 && dj < 0.4) sc *= 1 + 0.08 * Math.sin(dj / 0.4 * Math.PI); }
      var col = PALETTE[this.colors[this.reg[i]]];
      if (inv[i]) {
        x.save(); x.shadowColor = 'rgba(255,196,40,' + (0.75 + 0.25 * pulse) + ')'; x.shadowBlur = c * (0.28 + 0.12 * pulse);
        var tr1 = tileRect(g, n, i, sc); rr(x, tr1.x, tr1.y, tr1.s, tr1.s, tr1.r); x.fillStyle = col.base; x.fill();
        x.restore();
      }
      var tr = drawTile(x, g, n, i, col, sc);
      if (inv[i]) { rr(x, tr.x + 1.5, tr.y + 1.5, tr.s - 3, tr.s - 3, tr.r); x.lineWidth = Math.max(2, c * 0.05); x.strokeStyle = 'rgba(255,248,210,' + (0.55 + 0.4 * pulse) + ')'; x.stroke(); }
    }
    if (hs && hs.target != null) {
      var tt = tileRect(g, n, hs.target, 1.02 + 0.03 * pulse);
      rr(x, tt.x - 2, tt.y - 2, tt.s + 4, tt.s + 4, tt.r + 2); x.lineWidth = Math.max(3, c * 0.075); x.strokeStyle = 'rgba(255,190,20,' + (0.7 + 0.3 * pulse) + ')'; x.stroke();
    }

    // transient effects on tiles
    for (k = this.fx.length - 1; k >= 0; k--) {
      f = this.fx[k]; ft = (t - f.t) / f.life;
      if (ft >= 1) { this.fx.splice(k, 1); continue; }
      if (ft < 0) continue;
      if (f.kind === 'red') {
        var rt = tileRect(g, n, f.i); rr(x, rt.x, rt.y, rt.s, rt.s, rt.r); x.fillStyle = 'rgba(255,60,60,' + (0.5 * (1 - ft)) + ')'; x.fill();
      } else if (f.kind === 'conflict') {
        var a = Math.sin(ft * Math.PI * 4) > -0.2 ? (1 - ft) : 0;
        [f.a, f.b].forEach(function (q) { var qt = tileRect(g, n, q); rr(x, qt.x, qt.y, qt.s, qt.s, qt.r); x.fillStyle = 'rgba(255,60,60,' + (0.4 * a) + ')'; x.fill(); });
        x.strokeStyle = 'rgba(220,40,50,' + a + ')'; x.lineWidth = Math.max(2.5, c * 0.07); x.setLineDash([c * 0.12, c * 0.1]); x.lineCap = 'round';
        x.beginPath(); x.moveTo(cx(f.a), cy(f.a)); x.lineTo(cx(f.b), cy(f.b)); x.stroke(); x.setLineDash([]);
      } else if (f.kind === 'glow') {
        x.globalAlpha = 0.6 * Math.sin(ft * Math.PI); x.fillStyle = f.color;
        f.cells.forEach(function (q) { var qt = tileRect(g, n, q); rr(x, qt.x, qt.y, qt.s, qt.s, qt.r); x.fill(); });
        x.globalAlpha = 1;
      }
    }

    // ✕ marks: big white strokes that draw themselves
    var xs = c * 0.21, xw = Math.max(3, c * 0.13);
    for (i = 0; i < N; i++) {
      if (!this.mark[i]) continue;
      var mt = t - this.markT[i];
      if (mt < 0) continue;
      var prog = clamp01(mt / 0.2), msc = 1 - 0.07 * this.pressAmt[i];
      x.globalAlpha = this.mark[i] === 2 ? 0.82 : 1;
      drawX(x, cx(i), cy(i), xs * msc * (this.mark[i] === 2 ? 0.9 : 1), xw * msc, '#ffffff', prog, 'rgba(60,30,10,0.16)');
      x.globalAlpha = 1;
    }
    if (hs && hs.mark) { // tiles the player should cross out (tutorial): ghost ✕
      x.globalAlpha = 0.3 + 0.35 * pulse;
      hs.mark.forEach(function (j) { if (!self.mark[j] && !self.pup[j]) drawX(x, cx(j), cy(j), xs, xw, '#ffffff', 1); });
      x.globalAlpha = 1;
    }

    // pups
    var nudges = {};
    this.fx.forEach(function (f2) { if (f2.kind === 'nudge') nudges[f2.i] = (t - f2.t) / f2.life; });
    var psz = g.ts * 1.3;
    for (i = 0; i < N; i++) {
      var isSad = this.sad[i] != null;
      if (!this.pup[i] && !isSad) continue;
      var breed = this.breeds[this.reg[i]], expr = 'idle', pt2 = t - (isSad ? this.sad[i] : this.pupT[i]);
      if (pt2 < 0) continue;
      var s2 = 1, ox = 0, oy = 0, alpha = 1, rot = 0, sy2 = 1;
      if (isSad) {
        expr = 'sad';
        s2 = pt2 < 0.25 ? easeOutBack(pt2 / 0.25) : 1;
        ox = pt2 < 0.8 ? Math.sin(pt2 * 38) * c * 0.06 * (1 - pt2 / 0.8) : 0;
        if (pt2 > 0.95) { alpha = 1 - clamp01((pt2 - 0.95) / 0.3); s2 = 1 - 0.3 * clamp01((pt2 - 0.95) / 0.3); }
        if (pt2 > 1.25) { delete this.sad[i]; continue; }
      } else {
        s2 = pt2 < 0.42 ? easeOutBack(pt2 / 0.42) : 1;
        sy2 = 1 + 0.025 * Math.sin(t * 2.4 + this.phase[i]);
        if (t > this.blinkAt[i]) { if (t > this.blinkAt[i] + 0.16) this.blinkAt[i] = t + 2.5 + Math.random() * 4; else expr = 'blink'; }
        if (pt2 < 0.6) expr = 'joy';
        if (joyT >= 0) {
          var d = joyT - ((i / n) | 0) * 0.08;
          if (d > 0 && d < 0.5) oy = -Math.sin(d / 0.5 * Math.PI) * c * 0.28;
          if (d > 0) expr = 'joy';
        }
        if (nudges[i] != null) rot = Math.sin(nudges[i] * Math.PI * 5) * 0.18 * (1 - nudges[i]);
        s2 *= 1 - 0.07 * this.pressAmt[i];
      }
      var img = window.Assets && Assets.img('pup/' + breed + '_' + expr);
      if (!img) continue;
      x.save(); x.globalAlpha = alpha; x.translate(cx(i) + ox, cy(i) + oy); x.rotate(rot); x.scale(s2 * (2 - sy2), s2 * sy2);
      x.drawImage(img, -psz / 2, -psz / 2 - c * 0.02, psz, psz);
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
      rr(x, S * 0.012, S * 0.008, S * 0.976, S * 0.972, g.R); x.lineWidth = c * 0.12 * (1 - joyT / 1.6);
      x.strokeStyle = 'rgba(255,205,70,' + (1 - joyT / 1.6) + ')'; x.stroke();
    }
  };

  // static illustration of a small board (how-to-play cards)
  BoardView.drawMini = function (canvas, spec) {
    var dpr = Math.min(window.devicePixelRatio || 1, 3), css = spec.size || 150, S = Math.round(css * dpr);
    canvas.width = S; canvas.height = S; canvas.style.width = css + 'px'; canvas.style.height = css + 'px';
    var x = canvas.getContext('2d'), n = spec.n, reg = spec.reg, g = geometry(S, n), i;
    drawCard(x, S);
    var glow = {}, red = {};
    (spec.glow || []).forEach(function (q) { glow[q] = 1; });
    (spec.red || []).forEach(function (q) { red[q] = 1; });
    for (i = 0; i < n * n; i++) {
      var col = PALETTE[spec.colors[reg[i]]];
      if (glow[i]) { x.save(); x.shadowColor = 'rgba(255,196,40,0.95)'; x.shadowBlur = g.c * 0.3; var t0 = tileRect(g, n, i); rr(x, t0.x, t0.y, t0.s, t0.s, t0.r); x.fillStyle = col.base; x.fill(); x.restore(); }
      var t = drawTile(x, g, n, i, col, 1);
      if (red[i]) { rr(x, t.x, t.y, t.s, t.s, t.r); x.fillStyle = 'rgba(255,70,70,0.45)'; x.fill(); }
    }
    (spec.marks || []).forEach(function (q) { var t = tileRect(g, n, q); drawX(x, t.cx, t.cy, g.c * 0.2, Math.max(2, g.c * 0.12), '#ffffff', 1, 'rgba(60,30,10,0.16)'); });
    (spec.pups || []).forEach(function (p) {
      var img = window.Assets && Assets.img('pup/' + p[1] + '_' + (p[2] || 'idle')), t = tileRect(g, n, p[0]), s = g.ts * 1.3;
      if (img) x.drawImage(img, t.cx - s / 2, t.cy - s / 2, s, s);
    });
    if (spec.lines) {
      x.strokeStyle = 'rgba(220,40,50,0.9)'; x.lineWidth = Math.max(2.5, g.c * 0.07); x.setLineDash([g.c * 0.12, g.c * 0.1]); x.lineCap = 'round';
      spec.lines.forEach(function (l) { var a = tileRect(g, n, l[0]), b = tileRect(g, n, l[1]); x.beginPath(); x.moveTo(a.cx, a.cy); x.lineTo(b.cx, b.cy); x.stroke(); });
      x.setLineDash([]);
    }
  };

  // 3×3 rule icons for the rule cards: 'color' | 'line' | 'touch'
  var RULE_ICONS = {
    color: { zone: [1, 1, 1, 1, 1, 0, 1, 0, 0], x: [0, 1, 2, 3, 6], pup: 4 },
    line: { zone: [0, 0, 0, 0, 0, 0, 0, 0, 0], x: [0, 2, 4, 7], pup: 1 },
    touch: { zone: [0, 0, 0, 0, 0, 0, 0, 0, 0], x: [0, 1, 2, 3, 5, 6, 7, 8], pup: 4 }
  };
  BoardView.drawRuleIcon = function (canvas, kind, css) {
    var dpr = Math.min(window.devicePixelRatio || 1, 3), S = Math.round(css * dpr), spec = RULE_ICONS[kind];
    canvas.width = S; canvas.height = S; canvas.style.width = css + 'px'; canvas.style.height = css + 'px';
    var x = canvas.getContext('2d'), c = S / 3, gap = Math.max(1, c * 0.12), ts = c - gap;
    for (var i = 0; i < 9; i++) {
      var px = (i % 3) * c + gap / 2, py = ((i / 3) | 0) * c + gap / 2;
      rr(x, px, py, ts, ts, ts * 0.18); x.fillStyle = kind === 'color' ? (spec.zone[i] ? '#f0a860' : '#ecd9bf') : '#e3c49a'; x.fill();
      if (spec.x.indexOf(i) >= 0) drawX(x, px + ts / 2, py + ts / 2, ts * 0.26, Math.max(1.5, ts * 0.17), kind === 'color' ? '#ffffff' : '#9a6436', 1);
    }
    var img = window.Assets && Assets.img('pup/corgi_idle');
    if (img) { var q = spec.pup, s = ts * 1.35; x.drawImage(img, (q % 3) * c + c / 2 - s / 2, ((q / 3) | 0) * c + c / 2 - s / 2, s, s); }
  };

  BoardView.PALETTE = PALETTE;
  BoardView.assignColors = assignColors;
  window.BoardView = BoardView;
})();
