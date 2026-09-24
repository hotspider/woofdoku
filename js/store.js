/* Woofdoku — game config (economy, unlocks) and the saved player profile (localStorage).
 *   Store.data            the live profile object
 *   Store.save()          persist (debounced-safe, never throws)
 *   Store.addCoins(n) / Store.spend(n) -> bool / Store.addBooster(id, n)
 *   Store.today()         'YYYY-MM-DD' in local time
 */
(function () {
  'use strict';
  var KEY = 'woofdoku.save.v1';

  var CFG = {
    LEVELS: 120,
    HEARTS: 3,
    START_COINS: 200,
    // hint: reveals where a pup belongs · locate: finds a few blocked cells and marks them ✕
    BOOSTERS: ['hint', 'locate'],
    BOOSTER_UNLOCK: { hint: 3, locate: 5 },
    BOOSTER_GIFT: 3,
    BOOSTER_PRICE: { hint: 180, locate: 120 },   // price for a pack of 3
    BOOSTER_PACK: 3,
    CONTINUE_PRICE: 90,
    REWARD_BASE: 10, REWARD_STAR: 5, REWARD_REPLAY: 5, BOSS_MULT: 2,
    FREE_COINS: 40, FREE_COINS_COOLDOWN: 20 * 60 * 1000,
    BOX_STARS: 15,
    WHEEL_AD_SPINS: 3,
    DAILY_REWARD_COINS: 60,
    STARTER_PUPS: ['shiba', 'corgi', 'pug', 'beagle'],
    // pup unlocked after clearing this level
    PUP_UNLOCK: { husky: 10, dalmatian: 20, poodle: 30, golden: 45, samoyed: 60, frenchie: 75, chihuahua: 90, collie: 105 },
    ALL_PUPS: ['shiba', 'corgi', 'pug', 'beagle', 'husky', 'dalmatian', 'poodle', 'golden', 'samoyed', 'frenchie', 'chihuahua', 'collie'],
    CHAPTERS: ['backyard', 'park', 'beach', 'autumn', 'snow', 'night'],
    CHAPTER_SIZE: 20,
    // 7-day login calendar
    GIFTS: [
      [{ coins: 50 }], [{ booster: 'locate', n: 1 }], [{ coins: 80 }], [{ booster: 'hint', n: 1 }],
      [{ coins: 120 }], [{ booster: 'locate', n: 2 }], [{ coins: 300 }, { booster: 'hint', n: 1 }, { booster: 'locate', n: 1 }]
    ],
    // lucky wheel: weight, prize
    WHEEL: [
      { w: 22, coins: 20 }, { w: 12, booster: 'locate', n: 1 }, { w: 18, coins: 50 }, { w: 7, booster: 'hint', n: 1 },
      { w: 12, coins: 100 }, { w: 9, booster: 'locate', n: 2 }, { w: 17, coins: 30 }, { w: 3, coins: 300, jackpot: true }
    ]
  };

  function fresh() {
    return {
      v: 1,
      level: 1, stars: {}, best: {},
      coins: CFG.START_COINS,
      boosters: { hint: 0, locate: 0 },
      boosterIntro: {},
      pups: CFG.STARTER_PUPS.slice(), newPups: [],
      settings: { music: true, sfx: true },
      gift: { last: '', day: 0 },
      wheel: { date: '', free: false, ads: 0 },
      challenge: { date: '', streak: 0, lastDone: '' },
      box: 0,
      tut: { rules: false, level1: false, tipMark: false, tipMode: false },
      freeCoinsAt: 0,
      stats: { solved: 0, perfect: 0, pups: 0, hints: 0 }
    };
  }
  function merge(dst, src) {
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object' && !Array.isArray(dst[k])) merge(dst[k], src[k]);
      else dst[k] = src[k];
    }
    return dst;
  }
  function load() {
    var d = fresh();
    try {
      var raw = window.localStorage && localStorage.getItem(KEY);
      if (raw) merge(d, JSON.parse(raw));
    } catch (e) {}
    // sanity
    d.level = Math.max(1, Math.min(CFG.LEVELS + 1, d.level | 0 || 1));
    d.coins = Math.max(0, d.coins | 0);
    // v1.0/1.1 saves: Sniff + Fetch become Hint, Sweep becomes Locate
    if (d.boosters.sniff != null || d.boosters.fetch != null || d.boosters.sweep != null) {
      d.boosters = { hint: (d.boosters.sniff | 0) + (d.boosters.fetch | 0), locate: d.boosters.sweep | 0 };
      d.boosterIntro = {};
    }
    ['tapMode', 'automark', 'vibrate', 'patterns', 'lang'].forEach(function (k) { delete d.settings[k]; });
    CFG.BOOSTERS.forEach(function (b) { d.boosters[b] = Math.max(0, d.boosters[b] | 0); });
    if (!Array.isArray(d.pups)) d.pups = CFG.STARTER_PUPS.slice();
    return d;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  var Store = {
    CFG: CFG,
    data: load(),
    save: function () {
      try { if (window.localStorage) localStorage.setItem(KEY, JSON.stringify(Store.data)); } catch (e) {}
    },
    reset: function () { Store.data = fresh(); Store.save(); },
    today: function (d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); },
    dayNumber: function (d) { d = d || new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); },
    addCoins: function (n) { Store.data.coins = Math.max(0, Store.data.coins + (n | 0)); Store.save(); },
    spend: function (n) { if (Store.data.coins < n) return false; Store.data.coins -= n; Store.save(); return true; },
    addBooster: function (id, n) { Store.data.boosters[id] = (Store.data.boosters[id] | 0) + (n | 0); Store.save(); },
    boosterUnlocked: function (id) { return Store.data.level >= CFG.BOOSTER_UNLOCK[id]; },
    // pups the player owns, in collection order
    ownedPups: function () { return CFG.ALL_PUPS.filter(function (p) { return Store.data.pups.indexOf(p) >= 0; }); },
    // unlock pups whose level has been cleared; returns the newly unlocked ids
    checkPupUnlocks: function () {
      var got = [], cleared = Store.data.level - 1;
      Object.keys(CFG.PUP_UNLOCK).forEach(function (id) {
        if (cleared >= CFG.PUP_UNLOCK[id] && Store.data.pups.indexOf(id) < 0) { Store.data.pups.push(id); Store.data.newPups.push(id); got.push(id); }
      });
      if (got.length) Store.save();
      return got;
    },
    totalStars: function () { var s = 0, st = Store.data.stars; for (var k in st) s += st[k] | 0; return s; },
    grant: function (items) { // [{coins}|{booster,n}]
      items.forEach(function (it) { if (it.coins) Store.addCoins(it.coins); if (it.booster) Store.addBooster(it.booster, it.n || 1); });
    }
  };
  window.Store = Store;
})();
