/* Woofdoku — one puzzle session: placing pups, crosses, hearts, Hint / Locate boosters, tutorial coach,
 * win / fail. Owns the game screen HUD; screens and dialogs live in ui.js.
 *
 *   Game.init()                                  wire DOM once
 *   Game.start({ mode: 'level'|'daily', index })  begin a puzzle
 *   Game.pause() / Game.resume() / Game.restart() / Game.continueRun() / Game.leave()
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var S, B, bv, pb;          // session, board spec, BoardView, Puzzle.Board
  var timer = 0, bubbleTimer = 0, ruleTimer = 0;
  var DOUBLE = 0.34;         // double-tap window (s)

  function t() { return performance.now() / 1000; }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  // ------------------------------------------------------------------ level data
  function levelSpec(mode, index) {
    var src = mode === 'daily' ? Assets.levels.daily : Assets.levels.levels;
    var e = src[index];
    var n = e.n, reg = e.r.split('').map(Number), sol = new Uint8Array(n * n);
    e.s.split('').forEach(function (c, r) { sol[r * n + (+c)] = 1; });
    return { n: n, reg: reg, sol: sol, diff: e.d, boss: !!e.boss, entry: e };
  }
  function seeded(seed) { var a = seed | 0; return function () { a = a + 0x6D2B79F5 | 0; var q = Math.imul(a ^ a >>> 15, 1 | a); q = q + Math.imul(q ^ q >>> 7, 61 | q) ^ q; return ((q ^ q >>> 14) >>> 0) / 4294967296; }; }
  function breedsFor(n, seed) {
    var own = Store.ownedPups(), r = seeded(seed * 31 + 7), list = own.slice();
    for (var i = list.length - 1; i > 0; i--) { var j = (r() * (i + 1)) | 0; var q = list[i]; list[i] = list[j]; list[j] = q; }
    // the newest pup always shows up
    var newest = own[own.length - 1];
    if (list.indexOf(newest) >= n) { list.splice(list.indexOf(newest), 1); list.unshift(newest); }
    var out = []; for (i = 0; i < n; i++) out.push(list[i % list.length]);
    return out;
  }

  // ------------------------------------------------------------------ names for hints
  function colorName(g) { return T('c' + B.colors[g]); }
  function unitName(u) {
    var n = B.n;
    if (u < n) return T('row_n', { n: u + 1 });
    if (u < 2 * n) return T('col_n', { n: u - n + 1 });
    return T('yard_c', { c: colorName(u - 2 * n) });
  }
  function unitCells(u) { return pb.units[u].slice(); }

  // ------------------------------------------------------------------ HUD
  function renderHearts(breakIdx) {
    var el = $('g-hearts'), h = '';
    for (var k = 0; k < S.maxHearts; k++) h += '<img class="heart' + (k < S.hearts ? '' : ' off') + (k === breakIdx ? ' breaking' : '') + '" src="' + Assets.url(k < S.hearts ? 'icon/heart' : 'icon/heart_empty') + '" alt="">';
    el.innerHTML = h;
  }
  // one head per colour zone: coloured once that zone has its pup
  function renderPups(justGot) {
    var el = $('g-pups'), n = B.n, h = '', has = {};
    for (var i = 0; i < S.pups.length; i++) if (S.pups[i]) has[B.reg[i]] = 1;
    el.style.setProperty('--pw', pupW() + 'px');
    for (var g = 0; g < n; g++) h += '<img alt="" class="' + (has[g] ? (g === justGot ? 'got' : '') : 'off') + '" src="' + Assets.url('pup/' + B.breeds[g] + '_idle') + '">';
    el.innerHTML = h;
  }
  // pup icons in the progress bar: bigger on roomy screens as long as the hearts still fit beside them
  function pupW() {
    var n = B.n, w = n <= 6 ? 26 : n <= 8 ? 22 : 19;
    if (!$('screen-game').classList.contains('roomy')) return w;
    var fit = Math.floor(($('app').clientWidth - 20 - 150 - 8 - 20) / n) + 2;
    return Math.min(Math.round(w * 1.15), Math.max(w, fit));
  }
  // rule cards: always on the first levels; later on only when the screen has room for them (see layout)
  function renderRules() {
    ['color', 'line', 'touch'].forEach(function (r) { document.querySelector('#g-rules [data-r="' + r + '"] span').textContent = T('rc_' + r); });
  }
  function setRule(r) {
    clearTimeout(ruleTimer);
    document.querySelectorAll('#g-rules .rulecard').forEach(function (el) { el.classList.toggle('on', el.getAttribute('data-r') === r); });
  }
  // a broken rule lights up its card for a moment
  function flashRule(r) {
    if (S.tutorial || !$('g-rules').classList.contains('on')) return;
    setRule(r);
    ruleTimer = setTimeout(function () { setRule(null); }, 1500);
  }
  function fmtTime(s) { s = Math.floor(s); var m = Math.floor(s / 60); return (m < 10 ? '0' : '') + m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
  function renderTime() { $('g-time').textContent = fmtTime(S.time); }
  function renderBoosters() {
    Store.CFG.BOOSTERS.forEach(function (id) {
      var btn = $('b-' + id), cnt = Store.data.boosters[id] | 0;
      var locked = !Store.boosterUnlocked(id);
      btn.classList.toggle('locked', locked);
      btn.querySelector('.cnt').textContent = locked ? '' : cnt > 0 ? cnt : '+';
      btn.querySelector('.cnt').classList.toggle('plus', !locked && cnt <= 0);
      btn.querySelector('.lbl').textContent = T(id);
    });
  }
  function renderTitle() {
    var title = S.mode === 'daily' ? T('daily_puzzle') : T('level', { n: S.index + 1 });
    $('g-title').textContent = title;
    var d = '';
    for (var k = 1; k <= 5; k++) d += '<i class="' + (k <= B.diff ? 'on' : '') + '"></i>';
    $('g-diff').innerHTML = d;
    $('g-diff').title = T('diff_' + B.diff);
    $('g-difflbl').textContent = (B.boss ? T('boss_s') + ' · ' : '') + T('diff_' + B.diff);
    $('screen-game').classList.toggle('boss', B.boss);
    $('g-ribbon').className = 'ribbon ' + (S.mode === 'daily' ? 'purple' : B.boss ? 'pink' : 'blue');
  }
  function bubble(text, o) {
    o = o || {};
    var el = $('g-bubble');
    clearTimeout(bubbleTimer);
    if (!text) { el.classList.remove('on'); underBubble(); return; }
    el.querySelector('.txt').textContent = text;
    el.querySelector('img').src = Assets.url(o.face || 'pup/corgi_idle');
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    underBubble();
    if (o.ms) bubbleTimer = setTimeout(function () { el.classList.remove('on'); underBubble(); }, o.ms);
  }
  // on smaller screens the bubble floats over the hearts / rule rows: those fade out while it is up
  function underBubble() {
    var el = $('g-bubble'), on = el.classList.contains('on');
    var top = $('g-mid').getBoundingClientRect().top + el.offsetTop, bot = top + el.offsetHeight;
    ['.heartbar', '#g-rules'].forEach(function (s) {
      var row = document.querySelector('#g-top ' + s), r = row.getBoundingClientRect();
      row.classList.toggle('under', on && r.height > 0 && r.bottom > top + 2 && r.top < bot);
    });
  }

  // Vertical layout: HUD on top, booster shelf at the bottom, the board as big as the width allows and
  // the space left over split evenly above and below it. The guide bubble floats just above the board:
  // it may cover the hearts / rule rows for a moment, but never a tile, the pause row or (during the
  // first-time guide) the rule cards it talks about. Tall phones get the roomy HUD (bigger hearts and
  // boosters, rule cards on every level) instead of empty bands.
  function fitBoard(W, H) {
    var g = $('g-top'), row = g.querySelector('.g-row');
    var top = g.offsetHeight, bot = $('g-bottom').offsetHeight, M = H - top - bot;
    var floor = S.tutorial ? top : row.offsetTop + row.offsetHeight;
    var need = Math.max(0, floor + 4 + (S.tutorial ? 88 : 72) + 6 - top);
    var size = Math.max(180, Math.min(W - 16, M - Math.max(need, 10) - 10, 600));
    return { size: size, M: M, above: Math.max(need, Math.round((M - size) / 2)) };
  }
  function layout() {
    if (!S) return;
    var app = $('app'), W = app.clientWidth, H = app.clientHeight, scr = $('screen-game');
    var early = S.mode === 'level' && S.index < 3, fit;
    // roomy HUD → compact HUD with the rule cards → compact HUD: the first one that still gives the board
    // the full width with ~28 px to spare above and below it. It depends on the screen, not the level.
    var tiers = [[true, true], [false, true], [false, early]];
    tiers.some(function (t, k) {
      scr.classList.toggle('roomy', t[0]);
      $('g-rules').classList.toggle('on', t[1]);
      fit = fitBoard(W, H);
      return k === tiers.length - 1 || fit.M - Math.min(W - 16, 600) >= 56;
    });
    bv.resize(fit.size);
    $('g-board').style.width = fit.size + 'px'; $('g-board').style.height = fit.size + 'px';
    $('g-mid').style.paddingTop = fit.above + 'px';
    $('g-bubble').style.bottom = (fit.M - fit.above + 6) + 'px';
    $('g-pups').style.setProperty('--pw', pupW() + 'px');
    underBubble();
  }

  // ------------------------------------------------------------------ timer
  function tick() {
    if (!S || S.over || S.paused || document.hidden || UI.modalOpen()) return;
    S.time += 1; renderTime();
    // stuck for a while? the Hint button starts wagging
    S.idle = (S.idle || 0) + 1;
    if (S.idle === 25 && !S.tutorial && Store.boosterUnlocked('hint')) $('b-hint').classList.add('nudge');
  }
  function active() { if (S) { S.idle = 0; $('b-hint').classList.remove('nudge'); } }

  // ------------------------------------------------------------------ actions
  // tap = ✕ on / off · double-tap = place a pup · swipe = ✕ many cells
  function setMark(i, v, delay) { S.marks[i] = v; bv.setMark(i, v, delay); }
  function interact() {
    active(); if (bv.hintSpec) bv.clearHint();
    if (!S.tutorial && $('g-bubble').classList.contains('on')) bubble(null);
  }

  function toggleMark(i) {
    if (S.pups[i]) { bv.nudge(i); Snd.play('yip', { i: (Math.random() * 6) | 0 }); return null; }
    if (S.marks[i] === 2) { bv.glowCells([i], 'rgba(255,255,255,0.9)', 0.4); return null; }
    var before = S.marks[i];
    setMark(i, before ? 0 : 1);
    Snd.play(before ? 'unmark' : 'mark');
    if (S.tutorial) coachSoon(DOUBLE * 1000 + 60);
    return before;
  }

  function onTap(i) {
    if (!S || S.over || S.lock) return;
    Snd.unlock(); interact();
    var now = t();
    if (S.lastTap && S.lastTap.i === i && now - S.lastTap.t < DOUBLE) {
      // double tap: undo the first tap's ✕ toggle, then place
      if (S.lastTap.before != null) setMark(i, S.lastTap.before);
      S.lastTap = null;
      placePup(i, 'tap');
      return;
    }
    S.lastTap = { i: i, t: now, before: toggleMark(i) };
  }
  function onDrag(i, first) {
    if (!S || S.over || S.lock) return;
    interact();
    S.lastTap = null;
    if (first) S.drag = { mode: S.marks[i] === 1 ? 'erase' : 'mark', seen: {} };
    var d = S.drag;
    if (!d || d.seen[i]) return;
    d.seen[i] = 1;
    if (S.pups[i] || S.marks[i] === 2) return;
    var after = d.mode === 'mark' ? 1 : 0;
    if (S.marks[i] === after) return;
    setMark(i, after);
    Snd.play('paint');
  }
  function onDragEnd() { if (S && S.drag) { S.drag = null; if (S.tutorial) coachSoon(); } }

  function conflictKind(i, j) {
    var n = B.n, r = (i / n) | 0, c = i % n, rj = (j / n) | 0, cj = j % n;
    return r === rj ? 'row' : c === cj ? 'col' : B.reg[i] === B.reg[j] ? 'yard' : 'touch';
  }
  var KIND_RULE = { row: 'line', col: 'line', yard: 'color', touch: 'touch' };
  function pupCount() { var k = 0; for (var i = 0; i < S.pups.length; i++) k += S.pups[i]; return k; }

  // source: 'tap' | 'hint'
  function placePup(i, source) {
    if (S.pups[i]) { bv.nudge(i); Snd.play('yip', { i: (Math.random() * 6) | 0 }); return; }
    var j = Puzzle.conflictWith(B.n, B.reg, S.pups, i);
    if (j >= 0) {
      var kind = conflictKind(i, j);
      bv.conflict(i, j); Snd.play('blocked');
      UI.toast(T('conflict_' + kind)); flashRule(KIND_RULE[kind]);
      return;
    }
    if (S.marks[i] === 2 && !B.sol[i]) { bv.glowCells([i], 'rgba(255,120,120,0.8)', 0.5); Snd.play('blocked'); UI.toast(T('locked_x')); return; }
    if (!B.sol[i]) return wrong(i);
    S.pups[i] = 1; S.marks[i] = 0;
    bv.placePup(i);
    var k = pupCount();
    Snd.play('place'); Snd.play('yip', { i: (Math.random() * 6) | 0 }); Snd.play('progress', { i: Math.min(9, k - 1) });
    var p = cellPos(i), col = BoardView.PALETTE[B.colors[B.reg[i]]];
    Fx.burst(p.x, p.y, { n: 12, shapes: ['heart', 'paw', 'sparkle', 'dot'], colors: [col.dark, col.base, '#ffffff', '#ffd257'], speed: 240, gravity: 300, life: 0.8, size: 7 });
    Fx.ring(p.x, p.y, '#ffffff', bv.cellSize() * 0.9, 0.45);
    Store.data.stats.pups++;
    renderPups(B.reg[i]);
    // no automatic crosses: ruling cells out is the player's job (Hint / Locate can help)
    S.lastTap = null;
    if (k === B.n) { win(); return; }
    if (S.tutorial) {
      if (k === 1) { S.tutStage = 'row'; S.tutPup = i; }
      setTimeout(coach, 650);
    }
  }

  function wrong(i) {
    if (S.tutorial) {
      bv.conflict(i, i); Snd.play('blocked');
      bubble(T('tut_wrong'), { face: 'pup/corgi_sad' });
      setTimeout(coach, 1600);
      return;
    }
    var sess = S;
    S.hearts--; S.mistakes++;
    bv.wrongPup(i);
    if (S.marks[i] !== 2) setMark(i, 2, 1.15);
    Snd.play('wrong'); setTimeout(function () { Snd.play('heart_break'); }, 180);
    renderHearts(S.hearts);
    var hs = document.querySelectorAll('#g-hearts .heart');
    var hp = hs[S.hearts] ? Fx.center(hs[S.hearts]) : cellPos(i);
    Fx.burst(hp.x, hp.y, { n: 10, shapes: ['heart'], colors: ['#ff5b7f', '#ff8fa8'], speed: 200, gravity: 700, life: 0.8, size: 6 });
    $('screen-game').classList.remove('shake'); void $('screen-game').offsetWidth; $('screen-game').classList.add('shake');
    UI.toast(T('wrong_spot'));
    setTimeout(function () { if (S === sess) renderHearts(); }, 600);
    if (S.hearts <= 0) {
      S.lock = true;
      setTimeout(function () { if (S !== sess || S.over) return; S.over = true; Snd.play('lose'); UI.showFail(); }, 1300);
    }
  }

  function cellPos(i) {
    var c = bv.cellCenter(i), r = bv.cv.getBoundingClientRect(), a = $('app').getBoundingClientRect();
    return { x: c.x + r.left - a.left, y: c.y + r.top - a.top };
  }

  // ------------------------------------------------------------------ boosters
  // Hint: reveals where a pup belongs (the pup logic would find next) and places it.
  // Locate: finds a few blocked cells (no pup can go there) and crosses them out.
  function useBooster(id) {
    if (!S || S.over || S.lock) return;
    Snd.unlock(); interact();
    if (!Store.boosterUnlocked(id)) { UI.toast(T('unlock_at', { n: Store.CFG.BOOSTER_UNLOCK[id] })); Snd.play('blocked'); return; }
    if ((Store.data.boosters[id] | 0) <= 0) { UI.boosterShop(id, function () { renderBoosters(); }); return; }
    var ok = id === 'hint' ? hint() : locate();
    if (ok) {
      Store.data.boosters[id]--; Store.data.stats.hints++; S.boostersUsed++; Store.save();
      renderBoosters();
      var btn = $('b-' + id);
      btn.classList.remove('used'); void btn.offsetWidth; btn.classList.add('used');
    }
  }

  function hint() {
    var h = Puzzle.hintPup(B.n, B.reg, S.pups, S.marks, B.sol);
    if (!h || S.pups[h.place]) return false;
    var target = h.place, sess = S;
    Snd.play('hint');
    S.lock = true;
    Fx.fly('icon/hint', Fx.center($('b-hint')), cellPos(target), { size: 52, dur: 0.6, shrink: 0.3 }).then(function () {
      if (S !== sess || S.over) return;
      bv.hint({ cells: [target], target: target });
      var p = cellPos(target);
      Fx.burst(p.x, p.y, { n: 16, shapes: ['sparkle', 'star'], colors: ['#fff6b0', '#ffd257', '#ffffff'], speed: 200, gravity: 120, life: 0.7 });
      setTimeout(function () {
        if (S !== sess || S.over) return;
        S.lock = false;
        if (S.marks[target]) setMark(target, 0);
        Snd.play('fetch');
        placePup(target, 'hint');
        if (!S.over) bubble(cap(T('h_hint', { unit: unitName(h.unit) })), { face: 'pup/corgi_joy', ms: 3000 });
      }, 420);
    });
    return true;
  }

  function locate() {
    var count = Math.max(3, Math.round(B.n * 0.6));
    var cells = Puzzle.locate(B.n, B.reg, S.pups, S.marks, B.sol, count);
    if (!cells.length) { UI.toast(T('nothing_locate')); Snd.play('blocked'); return false; }
    Snd.play('sweep');
    var from = Fx.center($('b-locate')), sess = S;
    cells.forEach(function (q, k) {
      var p = cellPos(q);
      setTimeout(function () {
        if (S !== sess || S.over || S.pups[q]) return;
        setMark(q, 2);
        bv.glowCells([q], 'rgba(120,200,255,0.85)', 0.7);
        Fx.ring(p.x, p.y, '#7cd0ff', bv.cellSize() * 0.8, 0.45);
        Snd.play('mark');
      }, 250 + k * 120);
    });
    Fx.burst(from.x, from.y, { n: 10, shapes: ['sparkle'], colors: ['#bfeaff', '#ffffff'], speed: 160, gravity: 0, life: 0.5 });
    bubble(T('h_locate', { n: cells.length }), { face: 'pup/husky_idle', ms: 3000 });
    return true;
  }

  // ------------------------------------------------------------------ tutorial coach (level 1)
  // First-time guide (level 1): the rule cards light up one at a time.
  //   place1  one pup per colour zone  -> double-tap the 1-tile zone
  //   row     one per row & column     -> cross out the pup's row and column
  //   touch   pups can't touch          -> cross out the tiles around it
  //   zone    one per colour zone       -> cross out the rest of its zone (if any)
  //   next    the coach points at each remaining forced tile
  var hand = null, coachTimer = 0;
  function showHand(i, single) {
    if (!hand) hand = $('g-hand');
    if (i == null) { hand.classList.remove('on'); return; }
    var c = bv.cellCenter(i), r = bv.cv.getBoundingClientRect(), a = $('screen-game').getBoundingClientRect();
    hand.style.left = (c.x + r.left - a.left) + 'px'; hand.style.top = (c.y + r.top - a.top) + 'px';
    hand.classList.toggle('one', !!single);
    hand.classList.add('on');
  }
  function coachSoon(ms) { clearTimeout(coachTimer); coachTimer = setTimeout(coach, ms || 160); }
  function tutCells(stage) {
    var n = B.n, p = S.tutPup, r = (p / n) | 0, c = p % n, out = [];
    for (var i = 0; i < n * n; i++) {
      if (i === p) continue;
      var ri = (i / n) | 0, ci = i % n, line = ri === r || ci === c, near = Math.abs(ri - r) <= 1 && Math.abs(ci - c) <= 1, zone = B.reg[i] === B.reg[p];
      if (stage === 'row' && line) out.push(i);
      else if (stage === 'touch' && near && !line) out.push(i);
      else if (stage === 'zone' && zone && !line && !near) out.push(i);
    }
    return out;
  }
  var STAGE_RULE = { row: 'line', touch: 'touch', zone: 'color' }, STAGE_NEXT = { row: 'touch', touch: 'zone', zone: 'next' };
  function coach() {
    if (!S || !S.tutorial || S.over) return;
    var st, guard;
    while (STAGE_RULE[S.tutStage]) {
      var cells = tutCells(S.tutStage), todo = cells.filter(function (q) { return !S.marks[q] && !S.pups[q]; });
      if (todo.length) {
        setRule(STAGE_RULE[S.tutStage]);
        bv.hint({ cells: cells.concat([S.tutPup]), mark: todo });
        bubble(T('tut_' + S.tutStage), { face: 'pup/corgi_idle' });
        showHand(todo[0], true);
        return;
      }
      if (cells.length) Snd.play('reward');
      S.tutStage = STAGE_NEXT[S.tutStage];
      S.tutJustMarked = true;
    }
    // placements: tiles a pup already blocks count as crossed out from here on
    var virt = S.marks.slice();
    for (var p = 0; p < S.pups.length; p++) if (S.pups[p]) pb.attack[p].forEach(function (q) { if (!virt[q]) virt[q] = 2; });
    for (guard = 0; guard < 20; guard++) {
      st = Puzzle.nextStep(B.n, B.reg, S.pups, virt, B.sol);
      if (!st) return;
      if (st.t === 'wrongmark') { setMark(st.cell, 0); virt[st.cell] = 0; bv.glowCells([st.cell], 'rgba(255,120,120,0.8)', 0.6); continue; }
      if (st.place != null) break;
      (st.elim || []).forEach(function (q) { virt[q] = 2; });
    }
    if (!st || st.place == null) return;
    var first = pupCount() === 0, yard = st.unit >= 2 * B.n;
    setRule(yard ? 'color' : 'line');
    bv.hint({ cells: unitCells(st.unit), target: st.place });
    var msg = first ? T('tut_1', { unit: cap(unitName(st.unit)) }) : cap(T('tut_next', { unit: unitName(st.unit) }));
    if (S.tutJustMarked) { msg = T('tut_marked') + ' ' + msg; S.tutJustMarked = false; }
    bubble(msg, { face: 'pup/corgi_joy' });
    showHand(st.place);
  }

  // ------------------------------------------------------------------ win
  function win() {
    S.over = true; S.lock = true;
    showHand(null); bv.clearHint(); setRule(null);
    var stars = S.tutorial ? 3 : S.continued ? 1 : Math.max(1, S.hearts), sess = S, tut = S.tutorial;
    bubble(null);
    setTimeout(function () {
      if (S !== sess) return;
      bv.winWave();
      Snd.play('win'); Snd.duck(3);
      for (var r = 0; r < B.n; r++) (function (r) { setTimeout(function () { Snd.play('yip', { i: r % 6 }); }, 120 + r * 90); })(r);
      var br = $('g-board').getBoundingClientRect(), a = $('app').getBoundingClientRect();
      Fx.confetti(110);
      Fx.text(br.left - a.left + br.width / 2, br.top - a.top + br.height / 2, tut ? T('great') : T('pawsome'), { size: 46, life: 1.6, rise: 30, color: '#ffb52e', stroke: '#7a3f12' });
      if (tut) bubble(T('tut_done'), { face: 'pup/corgi_joy' });
    }, 350);
    var result = UI.finishPuzzle({ mode: S.mode, index: S.index, stars: stars, time: S.time, boss: B.boss, hearts: S.hearts, mistakes: S.mistakes, dayKey: S.dayKey });
    setTimeout(function () { if (S === sess) UI.showWin(result); }, 2000);
  }

  // ------------------------------------------------------------------ session
  var Game = {
    init: function () {
      bv = new BoardView($('board'), { onTap: onTap, onDrag: onDrag, onDragEnd: onDragEnd });
      Store.CFG.BOOSTERS.forEach(function (id) { $('b-' + id).addEventListener('click', function () { useBooster(id); }); });
      document.querySelectorAll('#g-rules .rulecard').forEach(function (el) { BoardView.drawRuleIcon(el.querySelector('canvas'), el.getAttribute('data-r'), 34); });
      $('g-pause').addEventListener('click', function () { if (S && !S.over && !S.lock && !UI.modalOpen()) { Snd.play('tap'); Game.pause(); UI.showPause(); } });
      $('g-bubble').addEventListener('click', function () { if (!S || !S.tutorial) bubble(null); });
      window.addEventListener('resize', function () { if (S) { layout(); if (S.tutorial && !S.over) setTimeout(coach, 50); } });
      timer = setInterval(tick, 1000);
    },
    start: function (o) {
      var mode = o.mode || 'level', index = o.index | 0;
      B = levelSpec(mode, index);
      var seed = mode === 'daily' ? 5000 + index : index + 1;
      B.colors = BoardView.assignColors(B.n, B.reg, seed);
      B.breeds = breedsFor(B.n, seed);
      pb = new Puzzle.Board(B.n, B.reg);
      S = {
        mode: mode, index: index, pups: new Uint8Array(B.n * B.n), marks: new Uint8Array(B.n * B.n),
        hearts: Store.CFG.HEARTS, maxHearts: Store.CFG.HEARTS, time: 0, lastTap: null, drag: null,
        over: false, lock: false, paused: false, continued: false, mistakes: 0, boostersUsed: 0,
        tutorial: mode === 'level' && index === 0 && !Store.data.tut.level1, tutStage: 'place1',
        dayKey: mode === 'daily' ? Store.today() : null
      };
      bv.setLevel({ n: B.n, reg: B.reg, colors: B.colors, breeds: B.breeds });
      renderTitle(); renderHearts(); renderPups(); renderRules(); setRule(null); renderTime(); renderBoosters(); bubble(null); showHand(null); active();
      $('g-hearts').classList.toggle('tut', S.tutorial);
      layout();
      bv.start();
      Snd.play('level_start');
      // tips & tutorial
      var lvl = index + 1;
      setTimeout(function () {
        if (!S) return;
        if (S.tutorial) coach();
        else if (mode === 'level' && lvl === 2 && !Store.data.tut.tipMark) { Store.data.tut.tipMark = true; Store.save(); bubble(T('tip_mark'), { face: 'pup/shiba_idle', ms: 7000 }); }
        else if (mode === 'level') {
          Store.CFG.BOOSTERS.forEach(function (id) {
            if (lvl === Store.CFG.BOOSTER_UNLOCK[id] && !Store.data.boosterIntro[id]) {
              Store.data.boosterIntro[id] = true; Store.addBooster(id, Store.CFG.BOOSTER_GIFT);
              UI.boosterIntro(id, function () { renderBoosters(); var b = $('b-' + id); b.classList.remove('used'); void b.offsetWidth; b.classList.add('used'); });
            }
          });
        }
      }, 450);
    },
    pause: function () { if (S) S.paused = true; },
    resume: function () { if (S) S.paused = false; },
    restart: function () { if (S) Game.start({ mode: S.mode, index: S.index }); },
    continueRun: function () {
      if (!S) return;
      S.hearts = S.maxHearts; S.over = false; S.lock = false; S.continued = true;
      renderHearts(); Snd.play('heart_refill');
      document.querySelectorAll('#g-hearts .heart').forEach(function (h, k) {
        var p = Fx.center(h); Fx.burst(p.x, p.y, { n: 8, shapes: ['heart', 'sparkle'], colors: ['#ff5b7f', '#ffd257', '#fff'], speed: 160, gravity: 200, life: 0.7, delay: k * 0.1 });
      });
    },
    leave: function () { bv.stop(); showHand(null); S = null; },
    session: function () { return S; },
    // test hooks (used by tools/e2e.mjs)
    _debug: function () { return { S: S, B: B, bv: bv }; },
    _tapCell: function (i) { onTap(i); },
    _place: function (i) { if (S && !S.over && !S.lock) placePup(i, 'tap'); }
  };
  window.Game = Game;
})();
