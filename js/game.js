/* Woofdoku — one puzzle session: placing pups, crosses, hearts, undo, boosters, tutorial coach,
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
  var timer = 0, bubbleTimer = 0;
  var DOUBLE = 0.34;         // double-tap window (s)

  function t() { return performance.now() / 1000; }
  function vib(p) { try { if (Store.data.settings.vibrate && navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
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
  function joinNames(list) {
    if (list.length <= 1) return list.join('');
    return list.slice(0, -1).join(I18n.lang === 'zh' ? '、' : ', ') + T('and') + list[list.length - 1];
  }
  function unitCells(u) { return pb.units[u].slice(); }

  // ------------------------------------------------------------------ HUD
  function renderHearts(breakIdx) {
    var el = $('g-hearts'), h = '';
    for (var k = 0; k < S.maxHearts; k++) h += '<img class="heart' + (k < S.hearts ? '' : ' off') + (k === breakIdx ? ' breaking' : '') + '" src="' + Assets.url(k < S.hearts ? 'icon/heart' : 'icon/heart_empty') + '" alt="">';
    el.innerHTML = h;
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
  function renderTools() {
    var pm = Store.data.settings.tapMode === 'pup';
    $('t-mode').classList.toggle('pup', pm);
    $('t-mode').querySelector('.lbl').textContent = pm ? T('tap_pup') : T('tap_mark');
    $('t-undo').querySelector('.lbl').textContent = T('undo');
    $('t-clear').querySelector('.lbl').textContent = T('clear');
    $('t-undo').classList.toggle('dim', !S || !S.undo.length);
  }
  function renderTitle() {
    var title = S.mode === 'daily' ? T('daily_puzzle') : T('level', { n: S.index + 1 });
    $('g-title').textContent = title;
    var d = '';
    for (var k = 1; k <= 5; k++) d += '<i class="' + (k <= B.diff ? 'on' : '') + '"></i>';
    $('g-diff').innerHTML = d;
    $('g-diff').title = T('diff_' + B.diff);
    $('g-difflbl').textContent = (B.boss ? T('boss') + ' · ' : '') + T('diff_' + B.diff);
    $('screen-game').classList.toggle('boss', B.boss);
    $('g-ribbon').className = 'ribbon ' + (S.mode === 'daily' ? 'purple' : B.boss ? 'pink' : 'blue');
  }
  function bubble(text, o) {
    o = o || {};
    var el = $('g-bubble');
    clearTimeout(bubbleTimer);
    if (!text) { el.classList.remove('on'); return; }
    el.querySelector('.txt').textContent = text;
    el.querySelector('img').src = Assets.url(o.face || 'pup/corgi_idle');
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    if (o.ms) bubbleTimer = setTimeout(function () { el.classList.remove('on'); }, o.ms);
  }

  function layout() {
    if (!S) return;
    var app = $('app'), W = app.clientWidth, H = app.clientHeight;
    var top = $('g-top').getBoundingClientRect().height, bot = $('g-bottom').getBoundingClientRect().height;
    var avail = H - top - bot - 70;
    var size = Math.max(200, Math.min(W - 20, avail, 560));
    bv.resize(size);
    $('g-board').style.width = size + 'px'; $('g-board').style.height = size + 'px';
  }

  // ------------------------------------------------------------------ timer
  function tick() {
    if (!S || S.over || S.paused || document.hidden || UI.modalOpen()) return;
    S.time += 1; renderTime();
    // stuck for a while? the Sniff button starts wagging
    S.idle = (S.idle || 0) + 1;
    if (S.idle === 25 && !S.tutorial && Store.boosterUnlocked('sniff')) $('b-sniff').classList.add('nudge');
  }
  function active() { if (S) { S.idle = 0; $('b-sniff').classList.remove('nudge'); } }

  // ------------------------------------------------------------------ actions
  function pushUndo(entry) { if (entry.cells.length) { S.undo.push(entry); if (S.undo.length > 200) S.undo.shift(); renderTools(); } }
  function setMark(i, v, delay) { S.marks[i] = v; bv.setMark(i, v, delay); }
  function interact() { active(); if (bv.hintSpec) bv.clearHint(); }

  function toggleMark(i) {
    if (S.pups[i]) { bv.nudge(i); Snd.play('yip', { i: (Math.random() * 6) | 0 }); return null; }
    if (S.marks[i] === 2) { bv.glowCells([i], 'rgba(255,255,255,0.9)', 0.4); return null; }
    var before = S.marks[i], after = before ? 0 : 1;
    setMark(i, after);
    Snd.play(after ? 'mark' : 'unmark');
    var e = { cells: [i], before: [before], after: [after] };
    pushUndo(e);
    if (S.tutorial) coachSoon(DOUBLE * 1000 + 60);
    return e;
  }

  function onTap(i) {
    if (!S || S.over || S.lock) return;
    Snd.unlock(); interact();
    var now = t();
    if (Store.data.settings.tapMode === 'pup') { S.lastTap = null; placePup(i, 'tap'); return; }
    if (S.lastTap && S.lastTap.i === i && now - S.lastTap.t < DOUBLE) {
      // double tap: revert the first tap's cross, then place
      var e = S.lastTap.entry;
      if (e && S.undo[S.undo.length - 1] === e) { S.undo.pop(); setMark(i, e.before[0]); renderTools(); }
      S.lastTap = null;
      placePup(i, 'tap');
      return;
    }
    var entry = toggleMark(i);
    S.lastTap = { i: i, t: now, entry: entry };
  }
  function onDrag(i, first) {
    if (!S || S.over || S.lock) return;
    interact();
    S.lastTap = null;
    if (first) {
      S.drag = { mode: S.marks[i] === 1 ? 'erase' : 'mark', entry: { cells: [], before: [], after: [] }, seen: {} };
    }
    var d = S.drag;
    if (!d || d.seen[i]) return;
    d.seen[i] = 1;
    if (S.pups[i] || S.marks[i] === 2) return;
    var before = S.marks[i], after = d.mode === 'mark' ? 1 : 0;
    if (before === after) return;
    setMark(i, after);
    d.entry.cells.push(i); d.entry.before.push(before); d.entry.after.push(after);
    Snd.play('paint');
  }
  function onDragEnd() { if (S && S.drag) { pushUndo(S.drag.entry); S.drag = null; if (S.tutorial) coachSoon(); } }

  function undo() {
    if (!S || S.over || S.lock) return;
    interact();
    var e = S.undo.pop();
    if (!e) { UI.toast(T('undo_empty')); return; }
    for (var k = e.cells.length - 1; k >= 0; k--) {
      var i = e.cells[k];
      if (S.pups[i] || S.marks[i] === 2) continue;
      setMark(i, e.before[k]);
    }
    Snd.play('undo'); renderTools();
    if (S.tutorial) coachSoon();
  }
  function clearMarks() {
    if (!S || S.over || S.lock) return;
    interact();
    var e = { cells: [], before: [], after: [] };
    for (var i = 0; i < S.marks.length; i++) if (S.marks[i] === 1) { e.cells.push(i); e.before.push(1); e.after.push(0); setMark(i, 0); }
    if (!e.cells.length) return;
    pushUndo(e); Snd.play('clear');
    if (S.tutorial) coachSoon();
  }

  function conflictReason(i, j) {
    var n = B.n, r = (i / n) | 0, c = i % n, rj = (j / n) | 0, cj = j % n;
    if (r === rj) return T('conflict_row');
    if (c === cj) return T('conflict_col');
    if (B.reg[i] === B.reg[j]) return T('conflict_yard');
    return T('conflict_touch');
  }
  function pupCount() { var k = 0; for (var i = 0; i < S.pups.length; i++) k += S.pups[i]; return k; }

  // source: 'tap' | 'hint' | 'fetch'
  function placePup(i, source) {
    if (S.pups[i]) { bv.nudge(i); Snd.play('yip', { i: (Math.random() * 6) | 0 }); return; }
    var j = Puzzle.conflictWith(B.n, B.reg, S.pups, i);
    if (j >= 0) {
      bv.conflict(i, j); Snd.play('blocked'); vib(30);
      UI.toast(conflictReason(i, j));
      return;
    }
    if (S.marks[i] === 2 && !B.sol[i]) { bv.glowCells([i], 'rgba(255,120,120,0.8)', 0.5); Snd.play('blocked'); UI.toast(T('locked_x')); return; }
    if (!B.sol[i]) return wrong(i);
    S.pups[i] = 1; S.marks[i] = 0;
    bv.placePup(i);
    var k = pupCount();
    Snd.play('place'); Snd.play('yip', { i: (Math.random() * 6) | 0 }); Snd.play('progress', { i: Math.min(9, k - 1) });
    vib(12);
    var p = cellPos(i), col = BoardView.PALETTE[B.colors[B.reg[i]]];
    Fx.burst(p.x, p.y, { n: 12, shapes: ['heart', 'paw', 'sparkle', 'dot'], colors: [col.dark, col.base, '#ffffff', '#ffd257'], speed: 240, gravity: 300, life: 0.8, size: 7 });
    Fx.ring(p.x, p.y, '#ffffff', bv.cellSize() * 0.9, 0.45);
    Store.data.stats.pups++;
    // no automatic crosses: ruling cells out is the player's job (Sniff / Sweep can help)
    S.lastTap = null;
    if (k === B.n) { win(); return; }
    if (S.tutorial) {
      if (k === 1) { S.tutStage = 'mark'; S.tutPup = i; S.tutMark = pb.attack[i].filter(function (q) { return !S.pups[q]; }); }
      setTimeout(coach, 650);
    }
  }

  function wrong(i) {
    if (S.tutorial) {
      bv.conflict(i, i); Snd.play('blocked');
      bubble(T('wrong_spot') + ' ' + T('tut_1'), { face: 'pup/corgi_sad' });
      setTimeout(coach, 1600);
      return;
    }
    S.hearts--; S.mistakes++;
    bv.wrongPup(i);
    if (S.marks[i] !== 2) setMark(i, 2, 1.15);
    Snd.play('wrong'); setTimeout(function () { Snd.play('heart_break'); }, 180);
    vib([40, 60, 40]);
    renderHearts(S.hearts);
    var hs = document.querySelectorAll('#g-hearts .heart');
    var hp = hs[S.hearts] ? Fx.center(hs[S.hearts]) : cellPos(i);
    Fx.burst(hp.x, hp.y, { n: 10, shapes: ['heart'], colors: ['#ff5b7f', '#ff8fa8'], speed: 200, gravity: 700, life: 0.8, size: 6 });
    $('screen-game').classList.remove('shake'); void $('screen-game').offsetWidth; $('screen-game').classList.add('shake');
    UI.toast(T('wrong_spot'));
    setTimeout(renderHearts, 600);
    if (S.hearts <= 0) {
      S.lock = true;
      setTimeout(function () { if (!S || S.over) return; S.over = true; Snd.play('lose'); UI.showFail(S.mode); }, 1300);
    }
  }

  function cellPos(i) {
    var c = bv.cellCenter(i), r = bv.cv.getBoundingClientRect(), a = $('app').getBoundingClientRect();
    return { x: c.x + r.left - a.left, y: c.y + r.top - a.top };
  }

  // ------------------------------------------------------------------ boosters
  function boosterAvailable(id) { return Store.boosterUnlocked(id); }
  function useBooster(id) {
    if (!S || S.over || S.lock) return;
    Snd.unlock(); interact();
    if (!boosterAvailable(id)) { UI.toast(T('unlock_at', { n: Store.CFG.BOOSTER_UNLOCK[id] })); Snd.play('blocked'); return; }
    if ((Store.data.boosters[id] | 0) <= 0) { UI.boosterShop(id, function () { renderBoosters(); }); return; }
    var ok = id === 'sniff' ? sniff() : id === 'fetch' ? fetch() : sweep();
    if (ok) {
      Store.data.boosters[id]--; Store.data.stats.hints++; S.boostersUsed++; Store.save();
      renderBoosters();
      var btn = $('b-' + id);
      btn.classList.remove('used'); void btn.offsetWidth; btn.classList.add('used');
    }
  }

  function sniff() {
    var st = Puzzle.nextStep(B.n, B.reg, S.pups, S.marks, B.sol);
    if (!st) return false;
    Snd.play('hint');
    var cells = [], text = '', n = B.n, d = 0.25;
    switch (st.t) {
      case 'wrongmark':
        cells = [st.cell]; text = T('h_wrongmark');
        bv.hint({ cells: cells, target: st.cell });
        setTimeout(function () { setMark(st.cell, 0); bv.glowCells([st.cell], 'rgba(255,120,120,0.8)', 0.6); }, 450);
        break;
      case 'mark':
        cells = [st.cell].concat(st.elim); text = T('h_mark');
        bv.hint({ cells: cells, elim: st.elim });
        st.elim.forEach(function (q, k) { setMark(q, 2, d + k * 0.03); });
        break;
      case 'lone':
      case 'reveal':
        cells = unitCells(st.unit); text = st.t === 'lone' ? cap(T('h_lone', { unit: unitName(st.unit) })) : T('h_reveal');
        bv.hint({ cells: cells, target: st.place });
        var sess = S;
        setTimeout(function () { if (S === sess && !S.over && !S.pups[st.place]) placePup(st.place, 'hint'); }, 700);
        break;
      case 'confine':
        cells = unitCells(st.unit).concat(unitCells(st.line));
        text = cap(T('h_confine', { unit: unitName(st.unit), line: unitName(st.line) }));
        bv.hint({ cells: cells, elim: st.elim });
        st.elim.forEach(function (q, k) { setMark(q, 2, d + 0.3 + k * 0.04); });
        break;
      case 'block':
        cells = unitCells(st.unit).concat(st.elim);
        text = cap(T('h_block', { unit: unitName(st.unit) }));
        bv.hint({ cells: cells, elim: st.elim });
        st.elim.forEach(function (q, k) { setMark(q, 2, d + 0.3 + k * 0.04); });
        break;
      case 'pair':
      case 'group':
        st.units.forEach(function (u) { cells = cells.concat(unitCells(u)); });
        text = cap(T('h_group', { units: joinNames(st.units.map(unitName)), lines: joinNames(st.lines.map(unitName))}));
        bv.hint({ cells: cells, elim: st.elim });
        st.elim.forEach(function (q, k) { setMark(q, 2, d + 0.3 + k * 0.04); });
        break;
      case 'trial':
        cells = st.elim.slice(); text = T('h_trial');
        bv.hint({ cells: cells, elim: st.elim });
        st.elim.forEach(function (q, k) { setMark(q, 2, d + 0.3 + k * 0.04); });
        break;
    }
    // cells in the highlighted area that a pup already rules out get crossed too, so the board matches the explanation
    var att = {};
    for (var p = 0; p < S.pups.length; p++) if (S.pups[p]) pb.attack[p].forEach(function (q) { att[q] = 1; });
    cells.forEach(function (q, k) { if (att[q] && !S.marks[q] && !S.pups[q] && q !== st.place) setMark(q, 2, d + k * 0.02); });
    bubble(text, { face: 'pup/beagle_idle' });
    void n;
    return true;
  }

  function fetch() {
    // the yard with the most open cells gets its pup
    var best = -1, bestOpen = -1, g, i, n = B.n;
    for (g = 0; g < n; g++) {
      var cells = pb.units[2 * n + g], has = false, open = 0;
      for (var k = 0; k < cells.length; k++) { if (S.pups[cells[k]]) has = true; if (!S.marks[cells[k]]) open++; }
      if (!has && open > bestOpen) { bestOpen = open; best = g; }
    }
    if (best < 0) return false;
    var target = -1;
    pb.units[2 * n + best].forEach(function (q) { if (B.sol[q]) target = q; });
    if (target < 0) return false;
    Snd.play('fetch');
    S.lock = true;
    var from = Fx.center($('b-fetch')), to = cellPos(target), sess = S;
    Fx.fly('icon/bone', from, to, { size: 44, dur: 0.6, shrink: 0.2 }).then(function () {
      if (S !== sess || S.over) return;
      S.lock = false;
      if (S.marks[target]) setMark(target, 0);
      placePup(target, 'fetch');
      bubble(cap(T('h_fetch', { unit: unitName(2 * n + best) })), { face: 'pup/golden_joy', ms: 3500 });
    });
    void i;
    return true;
  }

  function sweep() {
    var res = Puzzle.sweep(B.n, B.reg, S.pups, S.marks, B.sol);
    if (!res.elim.length && !res.wrong.length) { UI.toast(T('nothing_sweep')); Snd.play('blocked'); return false; }
    Snd.play('sweep');
    bv.sweepFx();
    var n = B.n;
    res.elim.forEach(function (q) { setMark(q, 2, 0.1 + ((q / n) | 0) * 0.075); });
    res.wrong.forEach(function (q) { setTimeout(function () { setMark(q, 0); bv.glowCells([q], 'rgba(255,120,120,0.8)', 0.6); }, 400); });
    var txt = T('h_sweep', { n: res.elim.length }) + (res.wrong.length ? ' ' + T('h_sweep_wrong', { n: res.wrong.length }) : '');
    bubble(txt, { face: 'pup/samoyed_joy', ms: 3500 });
    return true;
  }

  // ------------------------------------------------------------------ tutorial coach (level 1)
  // Stage 1: place the first pup. Stage 2: cross out every cell it rules out (teaches ✕ by tapping /
  // dragging). Stage 3+: the coach points at each remaining forced spot.
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
  function coach() {
    if (!S || !S.tutorial || S.over) return;
    if (S.tutStage === 'mark') {
      var todo = S.tutMark.filter(function (q) { return !S.marks[q] && !S.pups[q]; });
      if (todo.length) {
        bv.hint({ cells: S.tutMark.concat([S.tutPup]), mark: todo });
        bubble(T('tut_mark'), { face: 'pup/corgi_idle' });
        showHand(todo[0], true);
        return;
      }
      S.tutStage = 'place';
      Snd.play('reward');
    }
    // cells ruled out by pups count as crossed out from here on (the lesson has been learned)
    var virt = S.marks.slice();
    for (var p = 0; p < S.pups.length; p++) if (S.pups[p]) pb.attack[p].forEach(function (q) { if (!virt[q]) virt[q] = 2; });
    var st = null;
    for (var guard = 0; guard < 20; guard++) {
      st = Puzzle.nextStep(B.n, B.reg, S.pups, virt, B.sol);
      if (!st) return;
      if (st.t === 'wrongmark') { setMark(st.cell, 0); virt[st.cell] = 0; bv.glowCells([st.cell], 'rgba(255,120,120,0.8)', 0.6); continue; }
      if (st.place != null) break;
      (st.elim || []).forEach(function (q) { virt[q] = 2; });
    }
    if (!st || st.place == null) return;
    var first = pupCount() === 0;
    bv.hint({ cells: unitCells(st.unit), target: st.place });
    bubble(first ? T('tut_1') : (S.tutStage === 'place' && pupCount() === 1 ? T('tut_marked') + ' ' : '') + cap(T('tut_next', { unit: unitName(st.unit) })), { face: 'pup/corgi_joy' });
    showHand(st.place);
  }

  // ------------------------------------------------------------------ win
  function win() {
    S.over = true; S.lock = true;
    showHand(null); bv.clearHint();
    var stars = S.tutorial ? 3 : S.continued ? 1 : Math.max(1, S.hearts);
    setTimeout(function () {
      bv.winWave();
      Snd.play('win'); Snd.duck(3);
      for (var r = 0; r < B.n; r++) (function (r) { setTimeout(function () { Snd.play('yip', { i: r % 6 }); }, 120 + r * 90); })(r);
      var br = $('g-board').getBoundingClientRect(), a = $('app').getBoundingClientRect();
      Fx.confetti(110);
      Fx.text(br.left - a.left + br.width / 2, br.top - a.top + br.height / 2, S.tutorial ? T('great') : T('pawsome'), { size: 46, life: 1.6, rise: 30, color: '#ffb52e', stroke: '#7a3f12' });
      if (S.tutorial) bubble(T('tut_done'), { face: 'pup/corgi_joy' });
    }, 350);
    var result = UI.finishPuzzle({ mode: S.mode, index: S.index, stars: stars, time: S.time, boss: B.boss, hearts: S.hearts, mistakes: S.mistakes });
    setTimeout(function () { UI.showWin(result); }, 2000);
  }

  // ------------------------------------------------------------------ session
  var Game = {
    init: function () {
      bv = new BoardView($('board'), { onTap: onTap, onDrag: onDrag, onDragEnd: onDragEnd });
      $('t-undo').addEventListener('click', function () { undo(); });
      $('t-clear').addEventListener('click', function () { clearMarks(); });
      $('t-mode').addEventListener('click', function () {
        Snd.play('toggle');
        Store.data.settings.tapMode = Store.data.settings.tapMode === 'pup' ? 'mark' : 'pup'; Store.save();
        renderTools();
        UI.toast(Store.data.settings.tapMode === 'pup' ? T('tap_pup') : T('tap_mark'));
      });
      Store.CFG.BOOSTERS.forEach(function (id) { $('b-' + id).addEventListener('click', function () { useBooster(id); }); });
      $('g-pause').addEventListener('click', function () { if (S && !S.over) { Snd.play('tap'); Game.pause(); UI.showPause(); } });
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
        hearts: Store.CFG.HEARTS, maxHearts: Store.CFG.HEARTS, time: 0, undo: [], lastTap: null, drag: null,
        over: false, lock: false, paused: false, continued: false, mistakes: 0, boostersUsed: 0,
        tutorial: mode === 'level' && index === 0 && !Store.data.tut.level1
      };
      bv.setLevel({ n: B.n, reg: B.reg, colors: B.colors, breeds: B.breeds, patterns: Store.data.settings.patterns });
      renderTitle(); renderHearts(); renderTime(); renderBoosters(); renderTools(); bubble(null); showHand(null); active();
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
        else if (mode === 'level' && lvl === 5 && !Store.data.tut.tipMode) { Store.data.tut.tipMode = true; Store.save(); bubble(T('tip_mode'), { face: 'pup/pug_idle', ms: 7000 }); }
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
    isTutorial: function () { return !!(S && S.tutorial); },
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
    refreshHud: function () { if (S) { renderBoosters(); renderTools(); renderTitle(); bv.setPatterns(Store.data.settings.patterns); } },
    session: function () { return S; },
    // test hooks (used by tools/e2e.mjs)
    _debug: function () { return { S: S, B: B, bv: bv }; },
    _tapCell: function (i) { onTap(i); },
    _place: function (i) { if (S && !S.over && !S.lock) placePup(i, 'tap'); }
  };
  window.Game = Game;
})();
