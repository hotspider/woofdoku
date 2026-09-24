/* Woofdoku — puzzle rules and the step-by-step logic solver.
 *
 * A puzzle is an n×n grid split into n coloured yards (regions). The player places n pups so
 * that every row, every column and every yard holds exactly one pup, and no two pups touch —
 * not even diagonally.
 *
 * The same solver powers three things:
 *   - tools/gen-levels.mjs rates every generated level (which techniques it needs, how many);
 *   - the in-game "Sniff" hint (Puzzle.nextStep) explains the easiest next deduction;
 *   - the "Sweep" booster (Puzzle.sweep) crosses out every cell basic logic can rule out.
 *
 * Cells are indexed i = row * n + col. Units: 0..n-1 rows, n..2n-1 columns, 2n..3n-1 yards.
 * Works in the browser (window.Puzzle) and in Node (module.exports).
 */
(function (root) {
  'use strict';

  // technique tiers, easiest first
  var TIER = { clear: 0, lone: 1, confine: 2, block: 3, pair: 4, group: 5, trial: 6 };
  var WEIGHT = { clear: 0, lone: 1, confine: 3, block: 5, pair: 8, group: 12, trial: 20 };

  function Board(n, reg) {
    var N = n * n, i, r, c;
    this.n = n; this.N = N; this.reg = reg;
    this.units = [];
    for (r = 0; r < n; r++) { var row = []; for (c = 0; c < n; c++) row.push(r * n + c); this.units.push(row); }
    for (c = 0; c < n; c++) { var col = []; for (r = 0; r < n; r++) col.push(r * n + c); this.units.push(col); }
    for (var g = 0; g < n; g++) this.units.push([]);
    for (i = 0; i < N; i++) this.units[2 * n + reg[i]].push(i);
    this.cellUnits = [];
    this.nb = [];
    this.attack = [];
    for (i = 0; i < N; i++) {
      r = (i / n) | 0; c = i % n;
      this.cellUnits.push([r, n + c, 2 * n + reg[i]]);
      var nb = [];
      for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        var rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < n && cc >= 0 && cc < n) nb.push(rr * n + cc);
      }
      this.nb.push(nb);
    }
    // attack[i]: every other cell that cannot hold a pup once a pup sits on i (symmetric relation)
    var mark = new Uint8Array(N);
    for (i = 0; i < N; i++) {
      var list = [], u, k, cu = this.cellUnits[i];
      mark.fill(0); mark[i] = 1;
      for (u = 0; u < 3; u++) { var cells = this.units[cu[u]]; for (k = 0; k < cells.length; k++) if (!mark[cells[k]]) { mark[cells[k]] = 1; list.push(cells[k]); } }
      for (k = 0; k < this.nb[i].length; k++) if (!mark[this.nb[i][k]]) { mark[this.nb[i][k]] = 1; list.push(this.nb[i][k]); }
      this.attack.push(list);
    }
    this._cnt = new Int16Array(N);
    this._flag = new Uint8Array(N);
  }

  // ------------------------------------------------------------------ state
  // cand[i] = 1: empty cell that may still hold a pup. pup[i] = 1: a pup sits there.
  function State(board) { this.cand = new Uint8Array(board.N).fill(1); this.pup = new Uint8Array(board.N); }
  State.prototype.clone = function () { var s = Object.create(State.prototype); s.cand = this.cand.slice(); s.pup = this.pup.slice(); return s; };

  function unitDone(b, s, u) { var cells = b.units[u]; for (var k = 0; k < cells.length; k++) if (s.pup[cells[k]]) return true; return false; }
  function candsOf(b, s, u) { var cells = b.units[u], out = []; for (var k = 0; k < cells.length; k++) if (s.cand[cells[k]]) out.push(cells[k]); return out; }
  function placePup(b, s, i) {
    s.pup[i] = 1; s.cand[i] = 0;
    var a = b.attack[i]; for (var k = 0; k < a.length; k++) s.cand[a[k]] = 0;
  }
  function kindOf(b, u) { return u < b.n ? 'row' : u < 2 * b.n ? 'col' : 'yard'; }
  function lineOf(b, i, kind) { return kind === 'row' ? ((i / b.n) | 0) : kind === 'col' ? b.n + (i % b.n) : 2 * b.n + b.reg[i]; }

  // unit order used by the hint engine: yards first (most intuitive), then rows, then columns
  function unitOrder(b) { var o = [], u; for (u = 2 * b.n; u < 3 * b.n; u++) o.push(u); for (u = 0; u < 2 * b.n; u++) o.push(u); return o; }

  // a unit with no pup and no candidate: the position is impossible
  function brokenUnit(b, s) {
    for (var u = 0; u < 3 * b.n; u++) if (!unitDone(b, s, u) && candsOf(b, s, u).length === 0) return u;
    return -1;
  }

  // ------------------------------------------------------------------ techniques
  // Each returns a step or null. Step: { t, place?, elim?, unit?, line?, units?, lines?, cell?, k? }

  function tClear(b, s) {
    for (var i = 0; i < b.N; i++) if (s.pup[i]) {
      var a = b.attack[i], elim = [];
      for (var k = 0; k < a.length; k++) if (s.cand[a[k]]) elim.push(a[k]);
      if (elim.length) return { t: 'clear', cell: i, elim: elim };
    }
    return null;
  }

  function tLone(b, s) {
    var order = unitOrder(b);
    for (var k = 0; k < order.length; k++) {
      var u = order[k];
      if (unitDone(b, s, u)) continue;
      var c = candsOf(b, s, u);
      if (c.length === 1) return { t: 'lone', unit: u, place: c[0] };
    }
    return null;
  }

  // all candidates of a unit lie in one line of another kind -> clear the rest of that line
  function tConfine(b, s) {
    var order = unitOrder(b), n = b.n;
    for (var k = 0; k < order.length; k++) {
      var u = order[k], kind = kindOf(b, u);
      if (unitDone(b, s, u)) continue;
      var c = candsOf(b, s, u);
      if (c.length < 2) continue;
      var kinds = kind === 'yard' ? ['row', 'col'] : ['yard', kind === 'row' ? 'col' : 'row'];
      for (var q = 0; q < kinds.length; q++) {
        var line = lineOf(b, c[0], kinds[q]), same = true;
        for (var j = 1; j < c.length && same; j++) if (lineOf(b, c[j], kinds[q]) !== line) same = false;
        if (!same) continue;
        var inU = b._flag; inU.fill(0);
        var uc = b.units[u]; for (j = 0; j < uc.length; j++) inU[uc[j]] = 1;
        var lc = b.units[line], elim = [];
        for (j = 0; j < lc.length; j++) if (s.cand[lc[j]] && !inU[lc[j]]) elim.push(lc[j]);
        if (elim.length) return { t: 'confine', unit: u, line: line, elim: elim };
      }
    }
    void n;
    return null;
  }

  // cells that would wipe out every candidate of some unit
  function tBlock(b, s) {
    var order = unitOrder(b).map(function (u) { return { u: u, c: unitDone(b, s, u) ? null : candsOf(b, s, u) }; })
      .filter(function (o) { return o.c && o.c.length > 0; });
    order.sort(function (x, y) { return x.c.length - y.c.length; });
    var cnt = b._cnt;
    for (var k = 0; k < order.length; k++) {
      var u = order[k].u, c = order[k].c;
      cnt.fill(0);
      for (var j = 0; j < c.length; j++) { var a = b.attack[c[j]]; for (var q = 0; q < a.length; q++) cnt[a[q]]++; }
      var inU = b._flag; inU.fill(0);
      var uc = b.units[u]; for (j = 0; j < uc.length; j++) inU[uc[j]] = 1;
      var elim = [];
      for (var i = 0; i < b.N; i++) if (s.cand[i] && !inU[i] && cnt[i] === c.length) elim.push(i);
      if (elim.length) return { t: 'block', unit: u, elim: elim };
    }
    return null;
  }

  // k units of one kind whose candidates all fit into k lines of another kind -> nothing else may use those lines
  var FAMILIES = [['yard', 'row'], ['yard', 'col'], ['row', 'yard'], ['col', 'yard'], ['row', 'col'], ['col', 'row']];
  function tGroup(b, s, kMin, kMax) {
    var n = b.n;
    var base = { row: 0, col: n, yard: 2 * n };
    for (var k = kMin; k <= kMax; k++) {
      for (var f = 0; f < FAMILIES.length; f++) {
        var A = FAMILIES[f][0], B = FAMILIES[f][1], open = [], lines = [];
        for (var x = 0; x < n; x++) {
          var u = base[A] + x;
          if (unitDone(b, s, u)) continue;
          var c = candsOf(b, s, u), m = 0;
          for (var j = 0; j < c.length; j++) m |= 1 << (lineOf(b, c[j], B) - base[B]);
          open.push({ u: u, m: m });
        }
        if (open.length <= k) continue;
        var step = combo(open, k, function (set) {
          var m = 0; for (var j = 0; j < set.length; j++) m |= set[j].m;
          if (popcount(m) !== k) return null;
          var inSet = b._flag; inSet.fill(0);
          for (j = 0; j < set.length; j++) { var uc = b.units[set[j].u]; for (var q = 0; q < uc.length; q++) inSet[uc[q]] = 1; }
          var elim = [], ls = [];
          for (var y = 0; y < n; y++) if (m & (1 << y)) {
            ls.push(base[B] + y);
            var lc = b.units[base[B] + y];
            for (q = 0; q < lc.length; q++) if (s.cand[lc[q]] && !inSet[lc[q]]) elim.push(lc[q]);
          }
          return elim.length ? { t: k === 2 ? 'pair' : 'group', k: k, units: set.map(function (o) { return o.u; }), lines: ls, elim: elim } : null;
        });
        if (step) return step;
      }
    }
    return null;
  }
  function popcount(m) { var c = 0; while (m) { m &= m - 1; c++; } return c; }
  function combo(arr, k, fn) {
    var idx = [], res = null;
    (function rec(start) {
      if (res) return;
      if (idx.length === k) { res = fn(idx.map(function (i) { return arr[i]; })); return; }
      for (var i = start; i <= arr.length - (k - idx.length) && !res; i++) { idx.push(i); rec(i + 1); idx.pop(); }
    })(0);
    return res;
  }

  // basic propagation used inside a trial: returns false on contradiction
  function propagate(b, s) {
    for (var guard = 0; guard < 400; guard++) {
      if (brokenUnit(b, s) >= 0) return false;
      var st = tLone(b, s) || tConfine(b, s) || tBlock(b, s);
      if (!st) return true;
      if (st.place != null) {
        // two pups forced into conflict?
        if (!s.cand[st.place]) return false;
        placePup(b, s, st.place);
      } else for (var k = 0; k < st.elim.length; k++) s.cand[st.elim[k]] = 0;
    }
    return true;
  }
  // assume a pup on a cell; if basic logic then runs a unit dry, the cell is impossible
  function tTrial(b, s) {
    var elim = [];
    for (var i = 0; i < b.N; i++) {
      if (!s.cand[i]) continue;
      var t = s.clone();
      placePup(b, t, i);
      if (!propagate(b, t)) { elim.push(i); break; }
    }
    return elim.length ? { t: 'trial', cell: elim[0], elim: elim } : null;
  }

  // easiest applicable step, up to maxTier (default: everything)
  function findStep(b, s, maxTier) {
    if (maxTier == null) maxTier = 6;
    return tClear(b, s) || tLone(b, s) ||
      (maxTier >= 2 ? tConfine(b, s) : null) ||
      (maxTier >= 3 ? tBlock(b, s) : null) ||
      (maxTier >= 4 ? tGroup(b, s, 2, 2) : null) ||
      (maxTier >= 5 ? tGroup(b, s, 3, b.n - 2) : null) ||
      (maxTier >= 6 ? tTrial(b, s) : null);
  }
  function applyStep(b, s, st) {
    if (st.place != null) placePup(b, s, st.place);
    else for (var k = 0; k < st.elim.length; k++) s.cand[st.elim[k]] = 0;
  }

  // Full logical solve from the empty grid. Returns rating info.
  function rate(n, reg, maxTier) {
    var b = new Board(n, reg), s = new State(b), counts = {}, steps = 0, top = 0, score = 0, first = null;
    for (var guard = 0; guard < 2000; guard++) {
      var placed = 0; for (var i = 0; i < b.N; i++) placed += s.pup[i];
      if (placed === n) return { solved: true, counts: counts, steps: steps, maxTier: top, score: score, firstTech: first };
      if (brokenUnit(b, s) >= 0) return { solved: false, broken: true, counts: counts, steps: steps, maxTier: top, score: score };
      var st = findStep(b, s, maxTier);
      if (!st) return { solved: false, counts: counts, steps: steps, maxTier: top, score: score };
      counts[st.t] = (counts[st.t] || 0) + 1;
      if (st.t !== 'clear') { steps++; score += WEIGHT[st.t] + (st.k > 3 ? (st.k - 3) * 3 : 0); if (!first) first = st.t; }
      if (TIER[st.t] > top) top = TIER[st.t];
      applyStep(b, s, st);
    }
    return { solved: false, counts: counts, steps: steps, maxTier: top, score: score };
  }

  // ------------------------------------------------------------------ brute force
  // Count solutions (stops at `limit`). Returns { count, sols: [colsPerRow...] (up to limit) }.
  function solveAll(n, reg, limit) {
    limit = limit || 2;
    var sols = [], cols = new Array(n);
    var regCells = [];
    for (var g = 0; g < n; g++) regCells.push([]);
    for (var i = 0; i < n * n; i++) regCells[reg[i]].push(i);
    // lowest row of each region: when we pass it, the region must have a pup
    var lastRow = new Array(n).fill(0);
    for (i = 0; i < n * n; i++) { var r0 = (i / n) | 0; if (r0 > lastRow[reg[i]]) lastRow[reg[i]] = r0; }
    var dueAt = []; for (var r = 0; r < n; r++) dueAt.push([]);
    for (g = 0; g < n; g++) dueAt[lastRow[g]].push(g);
    (function rec(r, colMask, regMask, prev) {
      if (sols.length >= limit) return;
      if (r === n) { sols.push(cols.slice()); return; }
      for (var c = 0; c < n; c++) {
        if (colMask & (1 << c)) continue;
        if (prev >= 0 && Math.abs(c - prev) < 2) continue;
        var g = reg[r * n + c];
        if (regMask & (1 << g)) continue;
        var nm = regMask | (1 << g), ok = true, due = dueAt[r];
        for (var k = 0; k < due.length; k++) if (!(nm & (1 << due[k]))) { ok = false; break; }
        if (!ok) continue;
        cols[r] = c;
        rec(r + 1, colMask | (1 << c), nm, c);
        if (sols.length >= limit) return;
      }
    })(0, 0, 0, -1);
    return { count: sols.length, sols: sols };
  }

  // ------------------------------------------------------------------ in-game helpers
  // Build a solver state from the player's board: pups (all verified correct) and ✕ marks.
  // Only marks that are logically sound (not on a solution cell) are used, so hints never
  // build on a player's mistake.
  function stateFrom(b, pups, marks, sol) {
    var s = new State(b), i;
    for (i = 0; i < b.N; i++) if (pups[i]) placePup(b, s, i);
    for (i = 0; i < b.N; i++) if (marks[i] && !sol[i]) s.cand[i] = 0;
    return s;
  }

  // Next hint for the player. sol: Uint8Array N (1 = solution cell).
  // Returns a step; extra kinds: 'wrongmark' (an ✕ sits on a pup's spot), 'mark' (cells ruled out by a
  // pup are not crossed out yet), 'reveal' (fallback: show a solution cell).
  function nextStep(n, reg, pups, marks, sol, opts) {
    opts = opts || {};
    var b = new Board(n, reg), i;
    for (i = 0; i < b.N; i++) if (marks[i] && sol[i] && !pups[i]) return { t: 'wrongmark', cell: i, elim: [] };
    var s = new State(b);
    for (i = 0; i < b.N; i++) if (pups[i]) { s.pup[i] = 1; s.cand[i] = 0; }
    for (i = 0; i < b.N; i++) if (marks[i]) s.cand[i] = 0;
    var st = tClear(b, s);
    if (st) { st.t = 'mark'; return st; }
    // cells the player has not crossed out but logic already rules out count as open candidates
    st = findStep(b, s, 6);
    if (st && st.place != null && !sol[st.place]) st = null; // should never happen
    if (st && st.elim) for (i = 0; i < st.elim.length; i++) if (sol[st.elim[i]]) { st = null; break; }
    if (st) return st;
    for (i = 0; i < b.N; i++) if (sol[i] && !pups[i]) return { t: 'reveal', place: i, unit: 2 * n + reg[i] };
    return null;
  }

  // Sweep booster: every cell basic logic (clear/confine/block, repeated) rules out, without placing pups.
  // Returns { elim: [cells], wrong: [cells with a wrong ✕ that must be lifted] }.
  function sweep(n, reg, pups, marks, sol) {
    var b = new Board(n, reg), s = stateFrom(b, pups, marks, sol), wrong = [], i;
    for (i = 0; i < b.N; i++) if (marks[i] && sol[i] && !pups[i]) wrong.push(i);
    var before = s.cand.slice();
    for (var guard = 0; guard < 500; guard++) {
      var st = tConfine(b, s) || tBlock(b, s) || tGroup(b, s, 2, 2);
      if (!st) break;
      applyStep(b, s, st);
    }
    var elim = [];
    for (i = 0; i < b.N; i++) if (!pups[i] && !marks[i] && (!s.cand[i] || !before[i]) && !sol[i]) elim.push(i);
    return { elim: elim, wrong: wrong };
  }

  // Whether placing a pup on i breaks a visible rule with pups already on the board.
  // Returns the conflicting pup cell or -1.
  function conflictWith(n, reg, pups, i) {
    var r = (i / n) | 0, c = i % n;
    for (var j = 0; j < n * n; j++) {
      if (!pups[j] || j === i) continue;
      var rj = (j / n) | 0, cj = j % n;
      if (rj === r || cj === c || reg[j] === reg[i] || (Math.abs(rj - r) <= 1 && Math.abs(cj - c) <= 1)) return j;
    }
    return -1;
  }

  var Puzzle = {
    Board: Board, State: State, TIER: TIER, WEIGHT: WEIGHT,
    findStep: findStep, applyStep: applyStep, placePup: placePup, candsOf: candsOf, unitDone: unitDone, kindOf: kindOf,
    rate: rate, solveAll: solveAll, nextStep: nextStep, sweep: sweep, conflictWith: conflictWith, brokenUnit: brokenUnit
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Puzzle;
  else root.Puzzle = Puzzle;
})(typeof window !== 'undefined' ? window : this);
