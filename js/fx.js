/* Woofdoku — full-screen effects overlay (particles, confetti, flying icons, floating text).
 * Coordinates are CSS pixels relative to #app.
 *   Fx.init(canvas, appEl)
 *   Fx.burst(x, y, opts)         opts: n, shapes[], colors[], speed, spread, up, gravity, life, size
 *   Fx.confetti(n)               rain from the top
 *   Fx.ring(x, y, color, r)      expanding ring
 *   Fx.fly(imgKey, from, to, opts) -> Promise   icon flying on an arc (coins, boosters, hearts)
 *   Fx.text(x, y, str, opts)     floating text
 *   Fx.center(el)                {x, y} centre of an element relative to #app
 */
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  var cv, x, app, W = 0, H = 0, dpr = 1, parts = [], flies = [], texts = [], rings = [], running = false, last = 0;
  var PAL = ['#ff7fa6', '#ffc93a', '#6fd08c', '#5bb8ff', '#b58cff', '#ff9a3c', '#4fd1c5'];

  function resize() {
    if (!cv) return;
    var r = app.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }

  function shapePath(s, sz) {
    switch (s) {
      case 'heart': Art_heart(sz); break;
      case 'paw': Art_paw(sz); break;
      case 'star': Art_star(sz); break;
      case 'bone': Art_bone(sz); break;
      default: x.beginPath(); x.arc(0, 0, sz, 0, TAU);
    }
  }
  function Art_heart(s) {
    var k = s / 30; x.beginPath();
    x.moveTo(0, 26 * k); x.bezierCurveTo(-10 * k, 18 * k, -30 * k, 6 * k, -30 * k, -10 * k); x.bezierCurveTo(-30 * k, -24 * k, -14 * k, -30 * k, 0, -16 * k);
    x.bezierCurveTo(14 * k, -30 * k, 30 * k, -24 * k, 30 * k, -10 * k); x.bezierCurveTo(30 * k, 6 * k, 10 * k, 18 * k, 0, 26 * k); x.closePath();
  }
  function Art_star(s) { x.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.45 : s; if (!i) x.moveTo(Math.cos(a) * r, Math.sin(a) * r); else x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); }
  function Art_paw(s) {
    var k = s / 20; x.beginPath();
    x.ellipse(0, 6 * k, 9 * k, 7.5 * k, 0, 0, TAU);
    x.moveTo(-5 * k + 3.4 * k, -5 * k); x.ellipse(-5 * k, -5 * k, 3.4 * k, 4.2 * k, -0.2, 0, TAU);
    x.moveTo(5 * k + 3.4 * k, -5 * k); x.ellipse(5 * k, -5 * k, 3.4 * k, 4.2 * k, 0.2, 0, TAU);
    x.moveTo(-11 * k + 2.8 * k, 1 * k); x.ellipse(-11 * k, 1 * k, 2.8 * k, 3.6 * k, -0.5, 0, TAU);
    x.moveTo(11 * k + 2.8 * k, 1 * k); x.ellipse(11 * k, 1 * k, 2.8 * k, 3.6 * k, 0.5, 0, TAU);
  }
  function Art_bone(s) {
    var L = s * 0.7, R = s * 0.34; x.beginPath();
    x.rect(-L, -R * 0.5, L * 2, R);
    x.moveTo(-L + R, -R * 0.55); x.arc(-L, -R * 0.55, R, 0, TAU); x.moveTo(-L + R, R * 0.55); x.arc(-L, R * 0.55, R, 0, TAU);
    x.moveTo(L + R, -R * 0.55); x.arc(L, -R * 0.55, R, 0, TAU); x.moveTo(L + R, R * 0.55); x.arc(L, R * 0.55, R, 0, TAU);
  }

  function start() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, W, H);
    var i, p;
    for (i = rings.length - 1; i >= 0; i--) {
      p = rings[i]; p.t += dt;
      var k = p.t / p.life; if (k >= 1) { rings.splice(i, 1); continue; }
      x.globalAlpha = (1 - k) * 0.9; x.strokeStyle = p.color; x.lineWidth = 6 * (1 - k) + 1;
      x.beginPath(); x.arc(p.x, p.y, p.r * (0.2 + 0.8 * Math.sqrt(k)), 0, TAU); x.stroke();
    }
    for (i = parts.length - 1; i >= 0; i--) {
      p = parts[i]; p.t += dt;
      if (p.t < 0) continue;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      p.vx *= Math.pow(p.drag, dt * 60); p.vy = p.vy * Math.pow(p.drag, dt * 60) + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      var lk = p.t / p.life;
      x.globalAlpha = lk > 0.7 ? (1 - lk) / 0.3 : 1;
      x.save(); x.translate(p.x, p.y); x.rotate(p.rot);
      if (p.shape === 'confetti') {
        var wob = Math.cos(p.t * p.wf + p.ph);
        x.scale(1, wob); x.fillStyle = p.color; x.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
      } else if (p.shape === 'sparkle') {
        var s = p.size * (1 - lk * 0.5) * (0.8 + 0.2 * Math.sin(p.t * 20));
        x.fillStyle = p.color; x.beginPath();
        x.moveTo(0, -s * 1.6); x.quadraticCurveTo(0, 0, s * 1.6, 0); x.quadraticCurveTo(0, 0, 0, s * 1.6); x.quadraticCurveTo(0, 0, -s * 1.6, 0); x.quadraticCurveTo(0, 0, 0, -s * 1.6);
        x.fill();
      } else {
        var sc = lk < 0.15 ? lk / 0.15 : 1;
        shapePath(p.shape, p.size * sc);
        x.fillStyle = p.color; x.fill();
        if (p.shape !== 'dot') { x.lineWidth = 1.5; x.strokeStyle = 'rgba(255,255,255,0.9)'; x.stroke(); }
      }
      x.restore();
    }
    x.globalAlpha = 1;
    for (i = flies.length - 1; i >= 0; i--) {
      p = flies[i]; p.t += dt;
      if (p.t < 0) continue;
      var f = Math.min(1, p.t / p.dur), e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      var bx = (1 - e) * (1 - e) * p.x0 + 2 * (1 - e) * e * p.cx + e * e * p.x1;
      var by = (1 - e) * (1 - e) * p.y0 + 2 * (1 - e) * e * p.cy + e * e * p.y1;
      var sz = p.size * (f < 0.2 ? 0.6 + 2 * f : 1 - (f - 0.2) * p.shrink);
      if (p.img) x.drawImage(p.img, bx - sz / 2, by - sz / 2, sz, sz);
      if (f >= 1) { flies.splice(i, 1); if (p.done) p.done(); }
    }
    for (i = texts.length - 1; i >= 0; i--) {
      p = texts[i]; p.t += dt;
      if (p.t >= p.life) { texts.splice(i, 1); continue; }
      var tk = p.t / p.life, pop = tk < 0.12 ? 0.5 + tk / 0.12 * 0.7 : tk < 0.22 ? 1.2 - (tk - 0.12) / 0.1 * 0.2 : 1;
      x.save(); x.translate(p.x, p.y - tk * p.rise); x.scale(pop, pop);
      x.globalAlpha = tk > 0.75 ? (1 - tk) / 0.25 : 1;
      x.font = '700 ' + p.size + 'px Fredoka, sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
      x.lineWidth = p.size * 0.28; x.strokeStyle = '#ffffff'; x.strokeText(p.str, 0, 0);
      x.lineWidth = p.size * 0.12; x.strokeStyle = p.stroke; x.strokeText(p.str, 0, 0);
      x.fillStyle = p.color; x.fillText(p.str, 0, 0);
      x.restore();
    }
    x.globalAlpha = 1;
    if (parts.length || flies.length || texts.length || rings.length) requestAnimationFrame(frame);
    else { running = false; x.clearRect(0, 0, W, H); }
  }

  var Fx = {
    init: function (canvas, appEl) {
      cv = canvas; app = appEl; x = cv.getContext('2d');
      resize(); window.addEventListener('resize', resize);
    },
    resize: resize,
    center: function (el) {
      var a = app.getBoundingClientRect(), r = el.getBoundingClientRect();
      return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2 };
    },
    burst: function (px, py, o) {
      o = o || {};
      var n = o.n || 14;
      for (var i = 0; i < n; i++) {
        var a = (o.dir == null ? rnd(0, TAU) : o.dir + rnd(-1, 1) * (o.spread || 0.8)), sp = (o.speed || 260) * rnd(0.45, 1);
        parts.push({
          x: px + rnd(-4, 4), y: py + rnd(-4, 4), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0),
          g: o.gravity == null ? 520 : o.gravity, drag: o.drag || 0.94, t: -(o.delay || 0) - Math.random() * (o.stagger || 0),
          life: (o.life || 0.9) * rnd(0.7, 1.2), size: (o.size || 7) * rnd(0.7, 1.25), rot: rnd(0, TAU), vr: rnd(-6, 6),
          shape: pick(o.shapes || ['dot']), color: pick(o.colors || PAL), wf: rnd(6, 12), ph: rnd(0, TAU)
        });
      }
      start();
    },
    confetti: function (n) {
      n = n || 90;
      for (var i = 0; i < n; i++) {
        var fromLeft = i % 2 === 0;
        parts.push({
          x: fromLeft ? -10 : W + 10, y: H * rnd(0.15, 0.55), vx: (fromLeft ? 1 : -1) * rnd(180, 520), vy: -rnd(250, 650),
          g: 620, drag: 0.975, t: -Math.random() * 0.35, life: rnd(1.8, 2.8), size: rnd(4, 7), rot: rnd(0, TAU), vr: rnd(-8, 8),
          shape: pick(['confetti', 'confetti', 'confetti', 'star', 'paw', 'heart']), color: pick(PAL), wf: rnd(6, 14), ph: rnd(0, TAU)
        });
      }
      start();
    },
    ring: function (px, py, color, r, life) { rings.push({ x: px, y: py, color: color || '#ffffff', r: r || 60, t: 0, life: life || 0.5 }); start(); },
    fly: function (key, from, to, o) {
      o = o || {};
      return new Promise(function (res) {
        var img = window.Assets && Assets.img(key);
        var dx = to.x - from.x, dy = to.y - from.y;
        flies.push({
          img: img, x0: from.x, y0: from.y, x1: to.x, y1: to.y,
          cx: (from.x + to.x) / 2 + (o.curve == null ? -dy * 0.25 : o.curve) + rnd(-20, 20), cy: Math.min(from.y, to.y) - Math.abs(dx) * 0.15 - 40 + rnd(-20, 20),
          t: -(o.delay || 0), dur: o.dur || 0.7, size: o.size || 40, shrink: o.shrink == null ? 0.35 : o.shrink,
          done: function () { if (o.onArrive) o.onArrive(); res(); }
        });
        start();
      });
    },
    text: function (px, py, str, o) {
      o = o || {};
      texts.push({ x: px, y: py, str: String(str), t: 0, life: o.life || 1.1, rise: o.rise == null ? 50 : o.rise, size: o.size || 26, color: o.color || '#ff9a3c', stroke: o.stroke || '#6b3f1f' });
      start();
    },
    clear: function () { parts.length = 0; flies.length = 0; texts.length = 0; rings.length = 0; }
  };
  window.Fx = Fx;
})();
