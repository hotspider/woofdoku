/* Woofdoku — screens (loading, home, level map, puzzle), dialogs and the reward loops
 * (daily gift, lucky wheel, treat box, pup album, rewarded-ad offers).
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var C = Store.CFG;
  var screen = 'loading', stack = [], toastTimer = 0, speechTimer = 0, giftShown = false;

  function url(k) { return Assets.url(k); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function vib(p) { try { if (Store.data.settings.vibrate && navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
  function chapterOf(levelIndex) { return Math.min(C.CHAPTERS.length - 1, Math.floor(levelIndex / C.CHAPTER_SIZE)); }
  function breedName(id) { return I18n.breed(id); }
  function itemsHtml(items) {
    return items.map(function (it, k) {
      var ic = it.coins ? 'icon/coin' : 'icon/' + it.booster;
      return '<span class="prize" style="animation-delay:' + (k * 0.12) + 's"><img src="' + url(ic) + '" alt=""><span class="st">' + (it.coins ? it.coins : '×' + (it.n || 1)) + '</span></span>';
    }).join('');
  }
  // button content: optional icon + stroked label
  function bh(icon, label) { return '<span class="row">' + (icon ? '<img class="ico" alt="" src="' + url(icon) + '">' : '') + (label ? '<span class="st">' + esc(label) + '</span>' : '') + '</span>'; }
  function itemText(it) { return it.coins ? T('coins_n', { n: it.coins }) : T('booster_n', { n: it.n || 1, name: T(it.booster) }); }

  // ------------------------------------------------------------------ screens
  function show(name, enter) {
    var cover = $('cover');
    function swap() {
      ['loading', 'home', 'map', 'game'].forEach(function (s) { $('screen-' + s).classList.toggle('on', s === name); });
      var el = $('screen-' + name);
      el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter');
      if (screen === 'game' && name !== 'game') Game.leave();
      screen = name;
      Snd.music(name === 'game' ? 'game' : name === 'loading' ? null : 'home');
      if (enter) enter();
      var bg = el.querySelector('.bg');
      if (bg && bg.style.backgroundImage) document.getElementById('backdrop').style.backgroundImage = bg.style.backgroundImage;
    }
    if (screen === 'loading') { swap(); return; }
    Snd.play('whoosh');
    cover.classList.add('on');
    setTimeout(function () { swap(); setTimeout(function () { cover.classList.remove('on'); }, 40); }, 220);
  }

  // ------------------------------------------------------------------ toast
  function toast(text, ms) {
    var el = $('toast');
    el.textContent = text;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('on'); }, ms || 1600);
  }

  // ------------------------------------------------------------------ coins pill
  var shownCoins = null;
  function refreshCoins(animate) {
    var target = Store.data.coins;
    var els = document.querySelectorAll('.coinbar.coins .val');
    if (!animate || shownCoins == null) { shownCoins = target; els.forEach(function (e) { e.textContent = target; }); return; }
    var from = shownCoins, t0 = performance.now();
    shownCoins = target;
    (function step(now) {
      var k = Math.min(1, (now - t0) / 600), v = Math.round(from + (target - from) * k);
      els.forEach(function (e) { e.textContent = v; });
      if (k < 1) requestAnimationFrame(step);
    })(t0);
    document.querySelectorAll('.coinbar.coins').forEach(function (p) { p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); });
  }
  // coins fly from a point to the visible coin pill, then the counter rolls up
  function flyCoins(from, amount) {
    var pill = document.querySelector('.screen.on .coinbar.coins');
    if (!pill || !from) { refreshCoins(true); return; }
    var to = Fx.center(pill), n = Math.min(10, 3 + Math.floor(amount / 20));
    Snd.play('coins');
    for (var k = 0; k < n; k++) Fx.fly('icon/coin', { x: from.x + (Math.random() - 0.5) * 40, y: from.y + (Math.random() - 0.5) * 20 }, to, { size: 34, delay: k * 0.06, dur: 0.65, onArrive: k === n - 1 ? function () { refreshCoins(true); Snd.play('coin'); } : function () { Snd.play('coin'); } });
  }

  // ------------------------------------------------------------------ modal stack
  function modal(o) {
    var root = $('modal');
    stack.forEach(function (m) { m.el.style.display = 'none'; });
    var el = document.createElement('div');
    el.className = 'dlg ' + (o.cls || '');
    el.innerHTML = (o.title ? '<div class="ribbon ' + (o.color || 'pink') + '"><span class="st">' + esc(o.title) + '</span></div>' : '') +
      (o.close !== false ? '<button class="x rnd red" aria-label="' + T('close') + '"><img alt="" src="' + url('icon/close') + '"></button>' : '') +
      '<div class="body"></div><div class="btns"></div>';
    var body = el.querySelector('.body');
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    var h = { el: el, body: body, closed: false, onClose: o.onClose };
    h.close = function (silent) {
      if (h.closed) return;
      h.closed = true;
      if (!silent) Snd.play('close');
      el.classList.add('out');
      setTimeout(function () {
        el.remove();
        var i = stack.indexOf(h); if (i >= 0) stack.splice(i, 1);
        if (stack.length) stack[stack.length - 1].el.style.display = '';
        else root.classList.remove('on');
        if (h.onClose) h.onClose();
      }, 170);
    };
    var bt = el.querySelector('.btns');
    (o.buttons || []).forEach(function (b) {
      var btn = document.createElement('button');
      btn.className = 'btn ' + (b.cls || 'green');
      btn.innerHTML = b.html || '<span class="st">' + esc(b.label) + '</span>';
      btn.addEventListener('click', function () { Snd.unlock(); Snd.play('tap'); b.onClick(h, btn); });
      bt.appendChild(btn);
    });
    if (!bt.children.length) bt.remove();
    var x = el.querySelector('.x');
    if (x) x.addEventListener('click', function () { Snd.play('tap'); if (o.onX) o.onX(h); else h.close(); });
    root.appendChild(el);
    root.classList.add('on');
    stack.push(h);
    Snd.play('popup');
    return h;
  }
  function closeAll() { stack.slice().forEach(function (m) { m.onClose = null; m.close(true); }); }
  function confirmBox(text, yes) {
    modal({ title: T('reset'), color: 'pink', body: '<p>' + esc(text) + '</p>', buttons: [
      { label: T('no'), cls: 'gray', onClick: function (h) { h.close(); } },
      { label: T('yes'), cls: 'pink', onClick: function (h) { h.close(); yes(); } }
    ] });
  }

  // ------------------------------------------------------------------ home
  function speech(text) {
    var el = $('h-speech');
    var lines = I18n.list('speech');
    el.textContent = text || lines[(Math.random() * lines.length) | 0];
    el.classList.add('on');
    clearTimeout(speechTimer);
    speechTimer = setTimeout(function () { el.classList.remove('on'); }, 3800);
  }
  function giftReady() { return Store.data.gift.last !== Store.today(); }
  function wheelFree() { return Store.data.wheel.date !== Store.today() || !Store.data.wheel.free; }
  function dailyDone() { return Store.data.challenge.date === Store.today(); }
  function freeReadyIn() { return Math.max(0, Store.data.freeCoinsAt - Date.now()); }
  function fmtMs(ms) { var s = Math.ceil(ms / 1000), m = Math.floor(s / 60); return m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }

  function renderHome() {
    var d = Store.data, L = Math.min(C.LEVELS, d.level);
    $('h-bg').style.backgroundImage = 'url(' + url('bg/home') + ')';
    $('h-tag').textContent = T('tagline');
    $('h-play').querySelector('.t1').textContent = T('play');
    $('h-play').querySelector('.t2').textContent = d.level > C.LEVELS ? '★ ' + Store.totalStars() + ' / ' + C.LEVELS * 3 : T('level', { n: L });
    function feat(id, icon, label, badge) {
      var b = $(id);
      b.querySelector('img').src = url(icon);
      b.querySelector('.lbl').textContent = label;
      var bd = b.querySelector('.badge');
      bd.textContent = badge === true ? '!' : badge || '';
      bd.classList.toggle('on', !!badge);
    }
    feat('f-gift', 'icon/calendar', T('gift'), giftReady());
    feat('f-wheel', 'icon/wheel', T('wheel'), wheelFree());
    var fr = freeReadyIn();
    feat('f-free', 'icon/ad', fr > 0 ? fmtMs(fr) : T('free_coins'), fr <= 0 ? '+' + C.FREE_COINS : '');
    feat('f-daily', 'icon/trophy', T('daily_puzzle'), !dailyDone());
    feat('f-album', 'icon/album', T('album'), d.newPups.length || '');
    feat('f-levels', 'icon/star', T('levels'), '');
    var box = $('h-box'), p = Math.min(C.BOX_STARS, d.box);
    box.querySelector('img').src = url('icon/gift');
    box.querySelector('.bar i').style.width = (p / C.BOX_STARS * 100) + '%';
    box.querySelector('.bar span').textContent = T('treat_box') + '  ★ ' + T('box_progress', { a: p, b: C.BOX_STARS });
    box.querySelector('.go').textContent = T('open');
    box.classList.toggle('ready', d.box >= C.BOX_STARS);
    refreshCoins();
  }
  function goHome() {
    show('home', function () {
      renderHome();
      setTimeout(function () { speech(); }, 700);
      if (!giftShown && giftReady()) { giftShown = true; setTimeout(function () { if (screen === 'home' && !stack.length) openGift(); }, 900); }
    });
  }
  setInterval(function () { if (screen === 'home' && !stack.length) { var b = $('f-free'), fr = freeReadyIn(); b.querySelector('.lbl').textContent = fr > 0 ? fmtMs(fr) : T('free_coins'); var bd = b.querySelector('.badge'); bd.textContent = fr <= 0 ? '+' + C.FREE_COINS : ''; bd.classList.toggle('on', fr <= 0); } }, 1000);

  // ------------------------------------------------------------------ level map (winding path, level 1 at the bottom)
  var CH_PUP = {}; // chapter -> pup unlocked inside it
  Object.keys(C.PUP_UNLOCK).forEach(function (id) { CH_PUP[chapterOf(C.PUP_UNLOCK[id] - 1)] = id; });
  // keep in sync with MAP_DECO in tools/export-assets.mjs
  var MAP_DECO = {
    backyard: ['tree', 'bush', 'flowers', 'doghouse', 'bone', 'ball'], park: ['tree2', 'bench', 'balloon', 'bush', 'flowers', 'frisbee'],
    beach: ['umbrella', 'castle', 'shell', 'beachball', 'bone', 'shell'], autumn: ['autumntree', 'pumpkin', 'mushroom', 'leaves', 'redtree', 'pumpkin'],
    snow: ['pine', 'snowman', 'snowbush', 'icehouse', 'pine', 'bone'], night: ['nightpine', 'lantern', 'litdoghouse', 'stars', 'nightpine', 'moonbone']
  };
  var MAP_BG = { backyard: ['#a8e58a', '#c9f2ad'], park: ['#8fdcb0', '#c2f1d5'], beach: ['#f6d58f', '#fff0c6'], autumn: ['#f3bd7e', '#ffe2b8'], snow: ['#cfe2fb', '#f4f9ff'], night: ['#3f3b86', '#6c64bc'] };
  var MAP_RIB = ['green', 'blue', 'orange', 'pink', 'blue', 'purple'];
  var STEP = 94, HEAD = 150, PAD_B = 90, PAD_T = 110;
  function mapGeom(W) {
    var A = Math.min(W * 0.28, 120), secH = C.CHAPTER_SIZE * STEP + HEAD, H = PAD_B + C.CHAPTERS.length * secH + PAD_T, pts = [];
    for (var L = 1; L <= C.LEVELS; L++) {
      var ch = chapterOf(L - 1), j = (L - 1) % C.CHAPTER_SIZE;
      var yb = PAD_B + ch * secH + HEAD + j * STEP;
      pts.push({ L: L, x: W / 2 + A * Math.sin((L - 1) * 0.72), y: H - yb });
    }
    return { W: W, H: H, secH: secH, A: A, pts: pts };
  }
  function roadPath(p) {
    // Catmull-Rom through the nodes, extended past both ends
    var q = [{ x: p[0].x, y: p[0].y + 200 }].concat(p).concat([{ x: p[p.length - 1].x, y: p[p.length - 1].y - 200 }]);
    var d = 'M' + q[0].x.toFixed(1) + ' ' + q[0].y.toFixed(1);
    for (var i = 0; i < q.length - 1; i++) {
      var p0 = q[Math.max(0, i - 1)], p1 = q[i], p2 = q[i + 1], p3 = q[Math.min(q.length - 1, i + 2)];
      d += ' C' + (p1.x + (p2.x - p0.x) / 6).toFixed(1) + ' ' + (p1.y + (p2.y - p0.y) / 6).toFixed(1) + ' ' + (p2.x - (p3.x - p1.x) / 6).toFixed(1) + ' ' + (p2.y - (p3.y - p1.y) / 6).toFixed(1) + ' ' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
    }
    return d;
  }
  function seededRnd(seed) { var a = seed | 0; return function () { a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function renderMap() {
    var d = Store.data, list = $('map-list'), W = $('map-scroll').clientWidth || 390, g = mapGeom(W), html = '', ch, k;
    $('m-title').textContent = T('levels');
    $('m-stars').querySelector('img').src = url('icon/star');
    $('m-stars').querySelector('.val').textContent = Store.totalStars();
    list.style.height = g.H + 'px';
    // chapter grounds
    for (ch = 0; ch < C.CHAPTERS.length; ch++) {
      var name = C.CHAPTERS[ch], top = g.H - PAD_B - (ch + 1) * g.secH - (ch === C.CHAPTERS.length - 1 ? PAD_T : 0), h = g.secH + (ch === 0 ? PAD_B : 0) + (ch === C.CHAPTERS.length - 1 ? PAD_T : 0);
      var bgc = MAP_BG[name];
      html += '<div class="mch" style="position:absolute;left:0;right:0;top:' + top + 'px;height:' + h + 'px;background:linear-gradient(' + bgc[1] + ',' + bgc[0] + ');' +
        'background-image:radial-gradient(circle at 20% 30%, rgba(255,255,255,.22) 0 5px, transparent 6px),radial-gradient(circle at 70% 70%, rgba(255,255,255,.16) 0 4px, transparent 5px),linear-gradient(' + bgc[1] + ',' + bgc[0] + ');background-size:90px 110px,130px 150px,100% 100%"></div>';
    }
    // decorations beside the road
    var rnd = seededRnd(7);
    function deco(key, dx, dy, sz) {
      dx = Math.max(sz * 0.42, Math.min(W - sz * 0.42, dx));
      return '<img class="deco" alt="" src="' + url('map/' + key) + '" style="left:' + dx.toFixed(0) + 'px;top:' + dy.toFixed(0) + 'px;width:' + sz.toFixed(0) + 'px;height:' + sz.toFixed(0) + 'px;margin:' + (-sz).toFixed(0) + 'px 0 0 ' + (-sz / 2).toFixed(0) + 'px">';
    }
    var lastKey = {};
    function pickKey(set, side) {
      var k = set[(rnd() * set.length) | 0];
      if (k === lastKey[side]) k = set[(set.indexOf(k) + 1 + ((rnd() * (set.length - 1)) | 0)) % set.length];
      lastKey[side] = k; return k;
    }
    g.pts.forEach(function (p, i) {
      var set = MAP_DECO[C.CHAPTERS[chapterOf(p.L - 1)]], off = (p.x - W / 2) / g.A, side = off > 0 ? -1 : 1;
      // big prop on the far side of the road, a small one near the edge when the road is away from it
      html += deco(pickKey(set, side), W / 2 + side * (W * 0.3 + rnd() * W * 0.08), p.y + 34 + rnd() * 20, 72 + rnd() * 26);
      if (Math.abs(off) < 0.5 && i % 2) html += deco(pickKey(set, -side), W / 2 - side * (W * 0.42), p.y + 10 + rnd() * 30, 50 + rnd() * 16);
    });
    // road
    var dpath = roadPath(g.pts);
    html += '<svg class="road" style="position:absolute;left:0;top:0;width:' + W + 'px;height:' + g.H + 'px;z-index:1" viewBox="0 0 ' + W + ' ' + g.H + '">' +
      '<path d="' + dpath + '" fill="none" stroke="rgba(60,35,15,0.22)" stroke-width="38" stroke-linecap="round" transform="translate(0,5)"/>' +
      '<path d="' + dpath + '" fill="none" stroke="#8a5a2c" stroke-width="36" stroke-linecap="round"/>' +
      '<path d="' + dpath + '" fill="none" stroke="#f6dfae" stroke-width="28" stroke-linecap="round"/>' +
      '<path d="' + dpath + '" fill="none" stroke="#fff8e6" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 17"/></svg>';
    // nodes
    g.pts.forEach(function (p) {
      var L = p.L, s = d.stars[L] | 0, cur = L === d.level, lk = L > d.level, boss = L % 10 === 0;
      var col = lk ? 'gray' : cur ? 'green' : boss && !s ? 'pink' : 'gold';
      html += '<button class="node rnd ' + col + (cur ? ' cur' : '') + '" data-l="' + L + '" style="left:' + p.x.toFixed(1) + 'px;top:' + p.y.toFixed(1) + 'px">' +
        (lk ? '<img class="lk" alt="" src="' + url('icon/lock') + '">' : '<span class="num st">' + L + '</span>') +
        (!lk && !cur ? '<span class="stars">' + [1, 2, 3].map(function (k2) { return '<img alt="" src="' + url(k2 <= s ? 'icon/star' : 'icon/star_empty') + '">'; }).join('') + '</span>' : '') +
        (boss ? '<img class="crown" alt="" src="' + url('icon/crown') + '">' : '') +
        (cur ? '<img class="me" alt="" src="' + url('pup/corgi_joy') + '">' : '') + '</button>';
    });
    // chapter headers + locks
    for (ch = 0; ch < C.CHAPTERS.length; ch++) {
      var a = ch * C.CHAPTER_SIZE, b = a + C.CHAPTER_SIZE, st = 0, locked = d.level <= a;
      for (k = a + 1; k <= b; k++) st += d.stars[k] | 0;
      // centred in the gap between the previous chapter's last level and this chapter's first
      var hy = g.H - PAD_B - ch * g.secH - (HEAD - STEP) / 2 - 46, pup = CH_PUP[ch];
      html += '<div class="chead" style="top:' + hy + 'px"><div class="ribbon ' + MAP_RIB[ch] + '"><span class="st">' + esc(T('ch_' + C.CHAPTERS[ch])) + '</span>' +
        (pup ? '<img class="prz" alt="" src="' + url('pup/' + pup + (d.pups.indexOf(pup) >= 0 ? '_joy' : '_locked')) + '">' : '') + '</div>' +
        '<div class="sub">' + esc(T('chapter', { n: ch + 1 })) + ' · <img alt="" src="' + url('icon/star') + '">' + st + ' / ' + (b - a) * 3 + '</div></div>';
      if (locked) {
        var ltop = g.H - PAD_B - (ch + 1) * g.secH - (ch === C.CHAPTERS.length - 1 ? PAD_T : 0);
        html += '<div class="mch-lock" style="position:absolute;left:0;right:0;top:' + ltop + 'px;height:' + (g.secH - HEAD + 10 + (ch === C.CHAPTERS.length - 1 ? PAD_T : 0)) + 'px"><div class="lockveil"><img alt="" src="' + url('icon/lock') + '"><span class="st">' + esc(T('locked_chapter', { n: a })) + '</span></div></div>';
      }
    }
    list.innerHTML = html;
    refreshCoins();
    return g;
  }
  function goMap() {
    show('map', function () {
      renderMap();
      var cur = document.querySelector('.node.cur') || document.querySelector('.node[data-l="' + C.LEVELS + '"]');
      var sc = $('map-scroll');
      if (cur) sc.scrollTop = parseFloat(cur.style.top) - sc.clientHeight * 0.58;
    });
  }

  // ------------------------------------------------------------------ play
  function playLevel(index) {
    index = Math.max(0, Math.min(C.LEVELS - 1, index));
    show('game', function () {
      $('g-bg').style.backgroundImage = 'url(' + url('bg/play_' + C.CHAPTERS[chapterOf(index)]) + ')';
      Game.start({ mode: 'level', index: index });
    });
  }
  function playDaily() {
    if (dailyDone()) {
      modal({ title: T('daily_puzzle'), color: 'purple', body: '<div class="glowbox"><img alt="" src="' + url('icon/trophy') + '"></div><p>' + esc(T('daily_done_today')) + '</p><p class="muted">' + esc(T('streak', { n: Store.data.challenge.streak })) + '</p><p>' + esc(T('come_back')) + '</p>',
        buttons: [{ cls: 'green full', label: T('ok'), onClick: function (h) { h.close(); } }] });
      return;
    }
    var pool = Assets.levels.daily, idx = ((Store.dayNumber() % pool.length) + pool.length) % pool.length;
    show('game', function () {
      $('g-bg').style.backgroundImage = 'url(' + url('bg/play_' + C.CHAPTERS[Store.dayNumber() % C.CHAPTERS.length]) + ')';
      Game.start({ mode: 'daily', index: idx });
    });
  }

  // progress + rewards for a solved puzzle (called by Game before the win dialog)
  function finishPuzzle(r) {
    var d = Store.data, res = { mode: r.mode, index: r.index, stars: r.stars, time: r.time, boss: r.boss, coins: 0, unlocks: [], newBest: false };
    if (r.mode === 'level') {
      var L = r.index + 1, prev = d.stars[L] | 0, first = prev === 0;
      res.L = L; res.firstClear = first;
      if (r.stars > prev) { d.stars[L] = r.stars; d.box += r.stars - prev; }
      if (!d.best[L] || r.time < d.best[L]) { res.newBest = !!d.best[L]; d.best[L] = r.time; }
      res.best = d.best[L];
      res.coins = first ? (C.REWARD_BASE + C.REWARD_STAR * r.stars) * (r.boss ? C.BOSS_MULT : 1) : C.REWARD_REPLAY;
      if (d.level === L) d.level = L + 1;
      if (L === 1) d.tut.level1 = true;
      d.stats.solved++; if (r.stars === 3) d.stats.perfect++;
      d.coins += res.coins;
      Store.save();
      res.unlocks = Store.checkPupUnlocks();
    } else {
      var today = Store.today(), ch = d.challenge, first2 = ch.date !== today;
      var y = new Date(); y.setDate(y.getDate() - 1);
      if (first2) { ch.streak = ch.lastDone === Store.today(y) ? ch.streak + 1 : 1; ch.date = today; ch.lastDone = today; }
      res.coins = first2 ? 50 + 10 * Math.min(ch.streak, 7) : 5;
      res.streak = ch.streak;
      d.stats.solved++;
      d.coins += res.coins;
      Store.save();
    }
    return res;
  }

  function fmtTime(s) { s = Math.floor(s); var m = Math.floor(s / 60); return m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }

  function showWin(res) {
    var sess = Game.session(), breeds = [];
    if (sess) { var dbg = Game._debug(); breeds = dbg.B.breeds.slice(0, 3); }
    var isLevel = res.mode === 'level';
    var body = '<div class="win-top"><div class="rays"></div><div class="win-stars">' + [0, 1, 2].map(function (k) { return '<img alt="" data-k="' + k + '" src="' + url(k < res.stars ? 'icon/star' : 'icon/star_empty') + '" class="' + (k < res.stars ? '' : 'empty') + '">'; }).join('') + '</div></div>' +
      '<div class="win-pups">' + breeds.map(function (b) { return '<img alt="" src="' + url('pup/' + b + '_joy') + '">'; }).join('') + '</div>' +
      '<div class="stat-row"><div class="stat">' + esc(T('time')) + '<b>' + fmtTime(res.time) + '</b></div>' +
      (isLevel ? '<div class="stat">' + esc(T('best')) + '<b>' + fmtTime(res.best) + '</b>' + (res.newBest ? '<span class="nb">' + esc(T('new_best')) + '</span>' : '') + '</div>'
        : '<div class="stat">' + esc(T('streak', { n: res.streak })) + '<b>🔥 ' + res.streak + '</b></div>') + '</div>' +
      '<div class="reward" id="w-reward"><img alt="" src="' + url('icon/coin') + '"><span class="st">+<span class="n">' + res.coins + '</span></span></div>' +
      (!isLevel ? '<p class="muted">' + esc(T('come_back')) + '</p>' : '');
    var doubled = false, buttons = [];
    if (res.coins >= 10) buttons.push({ cls: 'purple full', html: bh('icon/ad', T('double_it')), onClick: function (h, btn) {
      if (doubled) return;
      Ads.rewarded('double_coins').then(function (ok) {
        if (!ok) return;
        doubled = true; btn.disabled = true;
        Store.addCoins(res.coins);
        h.el.querySelector('#w-reward .n').textContent = res.coins * 2;
        var p = Fx.center(h.el.querySelector('#w-reward')); Fx.burst(p.x, p.y, { n: 16, shapes: ['star', 'sparkle'], colors: ['#ffd257', '#fff'], speed: 220, gravity: 200 });
        Snd.play('coins');
      });
    } });
    buttons.push({ cls: 'blue', html: bh('icon/retry', T('retry')), onClick: function (h) { h.onClose = null; h.close(); isLevel ? playLevel(res.index) : goHome(); } });
    buttons.push({ cls: 'green', html: bh(null, isLevel ? T('next') : T('ok')), onClick: function (h) { h.onClose = null; h.close(); afterWin(res); } });
    var h = modal({
      title: isLevel ? T('level_done', { n: res.L }) : T('daily_done'), color: 'green', body: body, buttons: buttons, cls: 'win',
      onX: function (m) { m.onClose = null; m.close(); afterWin(res, true); }
    });
    if (!isLevel) h.el.querySelectorAll('.btns .btn.blue').forEach(function (b) { b.remove(); });
    Snd.duck(2.5);
    var stars = h.el.querySelectorAll('.win-stars img');
    for (var k = 0; k < res.stars; k++) (function (k) {
      setTimeout(function () {
        stars[k].classList.add('on'); Snd.play('star', { i: k }); vib(15);
        var p = Fx.center(stars[k]); Fx.burst(p.x, p.y, { n: 12, shapes: ['star', 'sparkle'], colors: ['#ffd257', '#fff6b0', '#ffffff'], speed: 260, gravity: 300, life: 0.7 });
      }, 350 + k * 330);
    })(k);
  }
  function afterWin(res, toMap) {
    var queue = res.unlocks.slice();
    (function next() {
      if (queue.length) { showUnlock(queue.shift(), next); return; }
      if (res.mode === 'daily') { goHome(); return; }
      if (toMap || res.L >= C.LEVELS) { goMap(); return; }
      playLevel(res.L);
    })();
  }

  function showFail(mode) {
    var body = '<img class="bimg" alt="" src="' + url('mascot/sad') + '"><p>' + esc(T('continue_d')) + '</p>';
    modal({
      title: T('continue_q'), color: 'orange', body: body, close: false, cls: 'fail',
      buttons: [
        { cls: 'gold full', html: '<span class="row"><span class="st">' + esc(T('continue_coins')) + '</span><img class="ico" alt="" src="' + url('icon/coin') + '"><span class="st">' + C.CONTINUE_PRICE + '</span></span>', onClick: function (h, btn) {
          if (!Store.spend(C.CONTINUE_PRICE)) { toast(T('not_enough')); btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake'); return; }
          refreshCoins(); h.close(); Game.continueRun();
        } },
        { cls: 'purple full', html: bh('icon/ad', T('continue_ad')), onClick: function (h) {
          Ads.rewarded('continue').then(function (ok) { if (ok) { h.close(); Game.continueRun(); } });
        } },
        { cls: 'orange', html: bh('icon/home', T('home')), onClick: function (h) { h.close(); goHome(); } },
        { cls: 'blue', html: bh('icon/retry', T('retry')), onClick: function (h) { h.close(); Game.restart(); } }
      ]
    });
  }

  // ------------------------------------------------------------------ rules
  var RULE_REG = [0, 0, 1, 1, 1, 0, 2, 2, 1, 1, 3, 2, 2, 2, 4, 3, 3, 2, 4, 4, 3, 3, 4, 4, 4];
  function showRules(done) {
    var colors = BoardView.assignColors(5, RULE_REG, 99);
    var wrap = document.createElement('div');
    wrap.innerHTML = '<p class="muted" style="margin-top:0">' + esc(T('rule_title')) + '</p><div class="rules">' +
      [1, 2, 3].map(function (k) { return '<div class="rule"><canvas data-k="' + k + '"></canvas><div><h4>' + esc(T('rule_' + k)) + '</h4><p>' + esc(T('rule_' + k + 'd')) + '</p></div></div>'; }).join('') +
      '</div><div class="controls-tip">' + esc(T('controls')) + '</div>';
    var cvs = wrap.querySelectorAll('canvas');
    BoardView.drawMini(cvs[0], { n: 5, reg: RULE_REG, colors: colors, size: 104, pups: [[8, 'corgi']], marks: [5, 6, 7, 9, 3, 13, 18, 23], glow: [5, 6, 7, 9, 3, 13, 18, 23] });
    BoardView.drawMini(cvs[1], { n: 5, reg: RULE_REG, colors: colors, size: 104, pups: [[17, 'shiba']], marks: [6, 7, 11, 12, 13], glow: [6, 7, 11, 12, 13] });
    BoardView.drawMini(cvs[2], { n: 5, reg: RULE_REG, colors: colors, size: 104, pups: [[12, 'pug', 'idle'], [18, 'beagle', 'sad']], red: [6, 7, 8, 11, 13, 16, 17, 18], lines: [[12, 18]] });
    modal({ title: T('how_to_play'), color: 'blue', body: wrap, buttons: [{ cls: 'green full', label: T('lets_go'), onClick: function (h) { h.close(); } }], onClose: done });
  }

  // ------------------------------------------------------------------ settings / pause
  function settingsBody(inGame) {
    var s = Store.data.settings, wrap = document.createElement('div');
    var rows = [['music', 'icon/music', T('music')], ['sfx', 'icon/sound', T('sound')], ['vibrate', 'icon/vibrate', T('vibration')],
      ['patterns', 'icon/paw', T('patterns'), T('patterns_d')]];
    var html = '<div class="set-list">' + rows.map(function (r) {
      return '<div class="set-row" data-k="' + r[0] + '"><img alt="" src="' + url(r[1]) + '"><div class="nm">' + esc(r[2]) + (r[3] ? '<small>' + esc(r[3]) + '</small>' : '') + '</div><button class="switch' + (s[r[0]] ? ' on' : '') + '" aria-label="' + esc(r[2]) + '"></button></div>';
    }).join('');
    html += '<div class="set-row"><img alt="" src="' + url('icon/globe') + '"><div class="nm">' + esc(T('language')) + '</div><div class="seg"><button data-l="en" class="' + (I18n.lang === 'en' ? 'on' : '') + '">EN</button><button data-l="zh" class="' + (I18n.lang === 'zh' ? 'on' : '') + '">中文</button></div></div>';
    html += '<div class="set-row link" data-a="rules"><img alt="" src="' + url('icon/album') + '"><div class="nm">' + esc(T('how_to_play')) + '</div><span class="go">›</span></div>';
    if (!inGame) html += '<div class="set-row link" data-a="reset"><img alt="" src="' + url('icon/retry') + '"><div class="nm">' + esc(T('reset')) + '</div><span class="go">›</span></div>';
    html += '</div>';
    if (!inGame) html += '<div class="ver">Woofdoku · ' + esc(T('version', { v: (Assets.manifest && Assets.manifest.version) || '' })) + '</div>';
    wrap.innerHTML = html;
    wrap.querySelectorAll('.set-row[data-k]').forEach(function (row) {
      row.querySelector('.switch').addEventListener('click', function () {
        var k = row.getAttribute('data-k'); s[k] = !s[k]; Store.save();
        this.classList.toggle('on', s[k]);
        Snd.play('toggle');
        if (k === 'music') Snd.setMusic(s.music);
        if (k === 'sfx') Snd.setSfx(s.sfx);
        if (k === 'vibrate' && s.vibrate) vib(30);
        if (k === 'patterns') Game.refreshHud();
      });
    });
    wrap.querySelectorAll('.seg button').forEach(function (b) {
      b.addEventListener('click', function () {
        Snd.play('toggle');
        s.lang = b.getAttribute('data-l'); Store.save(); I18n.set(s.lang);
        applyLang();
        closeAll();
        if (inGame) { Game.refreshHud(); Game.pause(); UI.showPause(); } else openSettings();
      });
    });
    wrap.querySelectorAll('[data-a]').forEach(function (b) {
      b.addEventListener('click', function () {
        Snd.play('tap');
        var a = b.getAttribute('data-a');
        if (a === 'rules') showRules();
        if (a === 'reset') confirmBox(T('reset_q'), function () { Store.reset(); I18n.set(Store.data.settings.lang); applyLang(); closeAll(); goHome(); });
      });
    });
    return wrap;
  }
  function openSettings() { modal({ title: T('settings'), color: 'orange', body: settingsBody(false) }); }
  function showPause() {
    modal({
      title: T('paused'), color: 'orange', body: settingsBody(true), onClose: function () { Game.resume(); },
      buttons: [
        { cls: 'green full', html: bh('icon/play', T('resume')), onClick: function (h) { h.close(); } },
        { cls: 'orange', html: bh('icon/home', T('home')), onClick: function (h) { h.onClose = null; h.close(); goHome(); } },
        { cls: 'blue', html: bh('icon/retry', T('restart')), onClick: function (h) { h.onClose = null; h.close(); Game.restart(); } }
      ]
    });
  }
  function applyLang() {
    $('rotate-msg').textContent = T('rotate');
    if (screen === 'home') renderHome();
    if (screen === 'map') renderMap();
  }

  // ------------------------------------------------------------------ boosters
  function boosterIntro(id, done) {
    Game.pause();
    modal({
      title: T('new_booster'), color: 'purple', close: false,
      body: '<div class="glowbox"><img alt="" src="' + url('icon/' + id) + '"></div><h3 class="st" style="--sc:#33166b">' + esc(T(id)) + '</h3><p>' + esc(T(id + '_d')) + '</p><p class="muted">' + esc(T('free_gift', { n: C.BOOSTER_GIFT })) + '</p>',
      buttons: [{ cls: 'green full', label: T('got_it'), onClick: function (h) { h.close(); } }],
      onClose: function () { Game.resume(); Snd.play('reward'); if (done) done(); }
    });
  }
  function boosterShop(id, done) {
    Game.pause();
    var price = C.BOOSTER_PRICE[id];
    modal({
      title: T('get_more', { name: T(id) }), color: 'blue',
      body: '<div class="glowbox"><img alt="" src="' + url('icon/' + id) + '"></div><p>' + esc(T(id + '_d')) + '</p><div class="pricebox"><div class="coinbar"><img class="ci" alt="" src="' + url('icon/coin') + '"><span class="val st">' + Store.data.coins + '</span></div></div>',
      onClose: function () { Game.resume(); },
      buttons: [
        { cls: 'gold full', html: '<span class="row"><span class="st">' + esc(T('buy_for', { n: C.BOOSTER_PACK })) + '</span><img class="ico" alt="" src="' + url('icon/coin') + '"><span class="st">' + price + '</span></span>', onClick: function (h, btn) {
          if (!Store.spend(price)) { toast(T('not_enough')); btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake'); return; }
          Store.addBooster(id, C.BOOSTER_PACK); Snd.play('reward'); refreshCoins(); h.close(); if (done) done();
        } },
        { cls: 'purple full', html: bh('icon/ad', T('watch_ad_1')), onClick: function (h) {
          Ads.rewarded('booster').then(function (ok) { if (ok) { Store.addBooster(id, 1); Snd.play('reward'); h.close(); if (done) done(); } });
        } }
      ]
    });
  }

  // ------------------------------------------------------------------ daily gift
  function openGift() {
    var g = Store.data.gift, ready = giftReady(), today = g.day % 7;
    var cal = '<div class="cal">' + C.GIFTS.map(function (items, k) {
      var cls = 'day' + (k === 6 ? ' big' : '') + (k < today ? ' got' : '') + (k === today && ready ? ' today' : '');
      return '<div class="' + cls + '"><div class="q">' + esc(T('day_n', { n: k + 1 })) + '</div><div class="it">' + items.map(function (it) { return '<img alt="" src="' + url(it.coins ? 'icon/coin' : 'icon/' + it.booster) + '">'; }).join('') + '</div><div class="q">' + items.map(function (it) { return it.coins ? it.coins : '×' + (it.n || 1); }).join(' ') + '</div></div>';
    }).join('') + '</div>' + (ready ? '' : '<p class="muted">' + esc(T('come_tomorrow')) + '</p>');
    function claim(h, mult) {
      var items = C.GIFTS[today].map(function (it) { return it.coins ? { coins: it.coins * mult } : { booster: it.booster, n: (it.n || 1) * mult }; });
      var from = Fx.center(h.el.querySelector('.day.today') || h.el);
      Store.grant(items);
      g.day = (today + 1) % 7; g.last = Store.today(); Store.save();
      Snd.play('daily');
      Fx.burst(from.x, from.y, { n: 24, shapes: ['star', 'sparkle', 'heart'], speed: 300 });
      h.close();
      setTimeout(function () {
        items.forEach(function (it) { if (it.coins) flyCoins(from, it.coins); });
        showPrizes(T('gift_title'), items);
        if (screen === 'home') renderHome();
      }, 250);
    }
    modal({
      title: T('gift_title'), color: 'green', body: cal,
      buttons: ready ? [
        { cls: 'purple', html: bh('icon/ad', T('claim_x2')), onClick: function (h) { Ads.rewarded('gift_x2').then(function (ok) { if (ok) claim(h, 2); }); } },
        { cls: 'green', label: T('claim'), onClick: function (h) { claim(h, 1); } }
      ] : [{ cls: 'green full', label: T('ok'), onClick: function (h) { h.close(); } }]
    });
  }
  function showPrizes(title, items, done) {
    modal({ title: title, color: 'orange', body: '<div class="glowbox"><img alt="" src="' + url('icon/gift') + '"></div><div class="prizes">' + itemsHtml(items) + '</div>', buttons: [{ cls: 'green full', label: T('ok'), onClick: function (h) { h.close(); } }], onClose: function () { if (screen === 'home') renderHome(); if (done) done(); } });
  }

  // ------------------------------------------------------------------ lucky wheel
  var WHEEL_COLS = ['#ffd0dc', '#fff0a8', '#c9f0b8', '#bfe3ff', '#ffe0b8', '#e2d4ff', '#c2f0e8', '#fff6c0'];
  function drawWheel(cv, rot, hi) {
    var dpr = Math.min(window.devicePixelRatio || 1, 3), S = 280, x = cv.getContext('2d'), N = C.WHEEL.length;
    if (cv.width !== S * dpr) { cv.width = S * dpr; cv.height = S * dpr; }
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, S, S);
    var R = S / 2 - 6;
    x.save(); x.translate(S / 2, S / 2);
    x.beginPath(); x.arc(0, 0, R + 4, 0, Math.PI * 2); x.fillStyle = '#ff9a3c'; x.fill();
    x.lineWidth = 4; x.strokeStyle = '#5b3d31'; x.stroke();
    x.rotate(rot);
    for (var k = 0; k < N; k++) {
      var a0 = -Math.PI / 2 + (k - 0.5) * Math.PI * 2 / N, a1 = a0 + Math.PI * 2 / N;
      x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, R - 6, a0, a1); x.closePath();
      x.fillStyle = k === hi ? '#fff' : C.WHEEL[k].jackpot ? '#ffd257' : WHEEL_COLS[k]; x.fill();
      x.lineWidth = 2; x.strokeStyle = 'rgba(91,61,49,0.35)'; x.stroke();
      x.save(); x.rotate((k) * Math.PI * 2 / N);
      var it = C.WHEEL[k], im = Assets.img(it.coins ? 'icon/coin' : 'icon/' + it.booster);
      if (im) x.drawImage(im, -20, -R + 26, 40, 40);
      x.font = '700 16px Fredoka, sans-serif'; x.textAlign = 'center'; x.fillStyle = '#5b3d31';
      x.fillText(it.coins ? String(it.coins) : '×' + (it.n || 1), 0, -R + 84);
      x.restore();
    }
    // bulbs
    for (k = 0; k < 16; k++) { var a = k / 16 * Math.PI * 2; x.beginPath(); x.arc(Math.cos(a) * (R + 0.5), Math.sin(a) * (R + 0.5), 3.5, 0, Math.PI * 2); x.fillStyle = k % 2 ? '#fff6b0' : '#ffffff'; x.fill(); }
    x.restore();
  }
  function openWheel() {
    var w = Store.data.wheel, today = Store.today();
    if (w.date !== today) { w.date = today; w.free = false; w.ads = 0; Store.save(); }
    var wrap = document.createElement('div');
    wrap.innerHTML = '<div class="wheel-wrap"><canvas></canvas><svg class="ptr" viewBox="0 0 46 52"><path d="M23 50 L4 12 Q2 4 10 3 L36 3 Q44 4 42 12 Z" fill="#ff5b7f" stroke="#fff" stroke-width="4" stroke-linejoin="round"/></svg><span class="hub rnd gold"><img alt="" src="' + url('icon/paw') + '"></span></div><p class="muted" id="w-info"></p>';
    var cv = wrap.querySelector('canvas'), rot = 0, spinning = false;
    drawWheel(cv, rot, -1);
    var h = modal({ title: T('wheel_title'), color: 'purple', body: wrap, buttons: [{ cls: 'green full', label: T('spin'), onClick: function (hh, btn) { go(btn); } }] });
    var btn = h.el.querySelector('.btns .btn');
    function label() {
      var free = !w.free, left = C.WHEEL_AD_SPINS - w.ads;
      btn.innerHTML = free ? bh(null, T('spin_free')) : bh('icon/ad', T('spin_ad'));
      btn.className = 'btn full ' + (free ? 'green' : 'purple');
      btn.disabled = !free && left <= 0;
      wrap.querySelector('#w-info').textContent = !free && left <= 0 ? T('no_spins') : !free ? T('spins_left', { n: left }) : '';
    }
    label();
    function go() {
      if (spinning) return;
      if (!w.free) { w.free = true; Store.save(); spin(); }
      else if (w.ads < C.WHEEL_AD_SPINS) Ads.rewarded('wheel').then(function (ok) { if (ok) { w.ads++; Store.save(); spin(); } });
    }
    function spin() {
      spinning = true; btn.disabled = true; h.el.querySelector('.x').style.visibility = 'hidden';
      var tot = C.WHEEL.reduce(function (s, p) { return s + p.w; }, 0), r = Math.random() * tot, pick = 0;
      for (var k = 0; k < C.WHEEL.length; k++) { r -= C.WHEEL[k].w; if (r < 0) { pick = k; break; } }
      var N = C.WHEEL.length, seg = Math.PI * 2 / N;
      var target = -pick * seg + (Math.random() - 0.5) * seg * 0.6;
      var start = rot, end = start + Math.PI * 2 * 6 + ((target - start) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      var t0 = performance.now(), dur = 4200, lastSeg = Math.floor((start + seg / 2) / seg);
      (function step(now) {
        var k2 = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k2, 4);
        rot = start + (end - start) * e;
        var sg = Math.floor((rot + seg / 2) / seg);
        if (sg !== lastSeg) { lastSeg = sg; Snd.play('spin_tick'); }
        drawWheel(cv, rot, -1);
        if (k2 < 1) requestAnimationFrame(step);
        else done(pick);
      })(t0);
    }
    function done(pick) {
      var prize = C.WHEEL[pick], item = prize.coins ? { coins: prize.coins } : { booster: prize.booster, n: prize.n };
      var blink = 0, iv = setInterval(function () { drawWheel(cv, rot, blink++ % 2 ? pick : -1); if (blink > 6) { clearInterval(iv); drawWheel(cv, rot, pick); } }, 120);
      Snd.play('spin_win'); vib(30);
      Store.grant([item]);
      var p = Fx.center(cv);
      Fx.burst(p.x, p.y - 100, { n: prize.jackpot ? 40 : 20, shapes: ['star', 'sparkle', 'paw'], speed: 320 });
      if (prize.jackpot) Fx.confetti(80);
      Fx.text(p.x, p.y - 40, T('you_won', { what: itemText(item) }), { size: 24, life: 1.8, color: '#ffd257' });
      setTimeout(function () {
        spinning = false; h.el.querySelector('.x').style.visibility = '';
        label();
        if (item.coins) flyCoins(p, item.coins);
        if (screen === 'home') renderHome();
      }, 900);
    }
  }

  // ------------------------------------------------------------------ album
  function openAlbum() {
    var d = Store.data, fresh = d.newPups.slice();
    d.newPups = []; Store.save();
    var html = '<p class="muted" style="margin-top:0">' + esc(T('pups_count', { a: d.pups.length, b: C.ALL_PUPS.length })) + '</p><div class="album">' + C.ALL_PUPS.map(function (id) {
      var own = d.pups.indexOf(id) >= 0;
      return '<button class="pupcard' + (own ? '' : ' lock') + (fresh.indexOf(id) >= 0 ? ' new' : '') + '" data-id="' + id + '"><img alt="" src="' + url('pup/' + id + (own ? '_idle' : '_locked')) + '"><div>' + esc(own ? breedName(id) : T('locked_pup', { n: C.PUP_UNLOCK[id] })) + '</div></button>';
    }).join('') + '</div>';
    var h = modal({ title: T('album'), color: 'orange', body: html });
    h.el.querySelectorAll('.pupcard').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-id');
        if (d.pups.indexOf(id) < 0) { Snd.play('blocked'); toast(T('locked_pup', { n: C.PUP_UNLOCK[id] })); return; }
        Snd.play('yip', { i: C.ALL_PUPS.indexOf(id) % 6 });
        modal({ title: breedName(id), color: 'green', body: '<div class="glowbox"><img alt="" src="' + url('pup/' + id + '_joy') + '"></div><div class="fact">' + esc(I18n.fact(id)) + '</div>', buttons: [{ cls: 'green full', label: T('ok'), onClick: function (m) { m.close(); } }] });
      });
    });
    if (screen === 'home') renderHome();
  }
  function showUnlock(id, done) {
    Snd.play('unlock'); vib([30, 50, 30]);
    Fx.confetti(90);
    modal({
      title: T('new_pup'), color: 'purple', close: false,
      body: '<div class="glowbox"><img alt="" src="' + url('pup/' + id + '_joy') + '"></div><h3 class="st" style="--sc:#33166b">' + esc(breedName(id)) + '</h3><p>' + esc(T('joined', { name: breedName(id) })) + '</p><div class="fact">' + esc(I18n.fact(id)) + '</div>',
      buttons: [{ cls: 'green full', label: T('got_it'), onClick: function (h) { h.close(); } }], onClose: done
    });
  }

  // ------------------------------------------------------------------ treat box / free coins
  function openBox() {
    var d = Store.data;
    if (d.box < C.BOX_STARS) {
      modal({ title: T('box_title'), color: 'blue', body: '<div class="glowbox"><img alt="" src="' + url('icon/gift') + '"></div><p>' + esc(T('box_d', { n: C.BOX_STARS })) + '</p><div class="reward"><img alt="" src="' + url('icon/star') + '"><span class="st">' + esc(T('box_progress', { a: d.box, b: C.BOX_STARS })) + '</span></div>', buttons: [{ cls: 'green full', label: T('ok'), onClick: function (h) { h.close(); } }] });
      return;
    }
    d.box -= C.BOX_STARS;
    var bo = C.BOOSTERS[(Math.random() * C.BOOSTERS.length) | 0];
    var items = [{ coins: 100 }, { booster: bo, n: 1 }];
    if (Math.random() < 0.35) items.push({ booster: C.BOOSTERS[(Math.random() * 3) | 0], n: 1 });
    Store.grant(items);
    Snd.play('chest'); vib([20, 40, 20]);
    var h = modal({ title: T('box_title'), color: 'blue', close: false, body: '<div class="glowbox"><img alt="" src="' + url('icon/gift') + '"></div><div class="prizes">' + itemsHtml(items) + '</div>', buttons: [{ cls: 'green full', label: T('ok'), onClick: function (m) { m.close(); } }], onClose: function () { renderHome(); } });
    setTimeout(function () { var p = Fx.center(h.el.querySelector('.glowbox')); Fx.burst(p.x, p.y, { n: 30, shapes: ['star', 'bone', 'paw', 'sparkle'], speed: 340 }); flyCoins(p, 100); }, 300);
  }
  function freeCoins() {
    var fr = freeReadyIn();
    if (fr > 0) { toast(T('coins_ready_in', { t: fmtMs(fr) })); return; }
    Ads.rewarded('free_coins').then(function (ok) {
      if (!ok) return;
      Store.data.freeCoinsAt = Date.now() + C.FREE_COINS_COOLDOWN;
      Store.addCoins(C.FREE_COINS);
      Snd.play('reward');
      var src = $('f-free');
      flyCoins(Fx.center(src), C.FREE_COINS);
      renderHome();
    });
  }

  // ------------------------------------------------------------------ wiring
  function wire() {
    function on(id, fn) { $(id).addEventListener('click', function (e) { Snd.unlock(); Snd.play('tap'); fn(e); }); }
    on('h-play', function () { var L = Store.data.level; if (L > C.LEVELS) goMap(); else playLevel(L - 1); });
    on('h-set', openSettings);
    on('h-coins', freeCoins); on('m-coins', freeCoins);
    on('f-gift', openGift); on('f-wheel', openWheel); on('f-free', freeCoins);
    on('f-daily', playDaily); on('f-album', openAlbum); on('f-levels', goMap);
    on('h-box', openBox);
    on('m-back', goHome);
    $('h-mascot').style.pointerEvents = 'auto';
    $('h-mascot').addEventListener('click', function () {
      Snd.unlock(); var m = $('h-mascot');
      m.classList.remove('hop'); void m.offsetWidth; m.classList.add('hop');
      Snd.play('yip', { i: 1 }); speech();
    });
    $('map-list').addEventListener('click', function (e) {
      var b = e.target.closest('.node'); if (!b) return;
      Snd.unlock();
      var L = +b.getAttribute('data-l');
      if (L > Store.data.level) { Snd.play('blocked'); toast(T('locked_chapter', { n: L - 1 })); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; }
      Snd.play('tap'); playLevel(L - 1);
    });
    // static images
    $('h-logo').src = url('ui/logo');
    $('h-mascot').src = url('mascot/wave');
    $('h-set').querySelector('img').src = url('icon/gear');
    document.querySelectorAll('.coinbar.coins img.ci').forEach(function (i) { i.src = url('icon/coin'); });
    $('m-back').querySelector('img').src = url('icon/home');
    $('g-pause').querySelector('img').src = url('icon/pause');
    $('g-clock').src = url('icon/clock');
    $('g-hand').src = url('icon/paw');
    C.BOOSTERS.forEach(function (id) { var b = $('b-' + id); b.querySelector('.slot img.bi').src = url('icon/' + id); b.querySelector('.slot img.lock').src = url('icon/lock'); });
    // hardware back button / swipe-back on Android: stay inside the game
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && stack.length) { var t = stack[stack.length - 1]; if (t.el.querySelector('.x')) t.close(); } });
  }

  window.UI = {
    show: show, toast: toast, modal: modal, modalOpen: function () { return stack.length > 0; },
    goHome: goHome, goMap: goMap, playLevel: playLevel, playDaily: playDaily,
    finishPuzzle: finishPuzzle, showWin: showWin, showFail: showFail, showPause: showPause, showRules: showRules,
    boosterIntro: boosterIntro, boosterShop: boosterShop, openGift: openGift, openWheel: openWheel, openAlbum: openAlbum, openBox: openBox,
    refreshCoins: refreshCoins, applyLang: applyLang, wire: wire,
    screen: function () { return screen; }
  };
})();
