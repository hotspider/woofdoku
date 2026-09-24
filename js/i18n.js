/* Woofdoku — all in-game texts (English).
 *   I18n.t(key, params)   '{name}' placeholders are replaced from params  (also available as T)
 *   I18n.fact(id) / I18n.breed(id) / I18n.list(key)
 */
(function () {
  'use strict';
  // Game vocabulary: pup · color zone · blocked cell (✕) · hearts · coins · stars ·
  // boosters Hint (reveals a pup's spot) and Locate (finds blocked cells).
  var S = {
    en: {
      loading: 'Calling the pups…', load_fail: 'Loading failed. Please check your connection and try again.',
      tagline: 'PUPPY LOGIC PUZZLE', play: 'Play', level: 'Level {n}', levels: 'Levels', daily_puzzle: 'Daily Challenge', wheel: 'Lucky Spin',
      album: 'Pup Collection', gift: 'Daily Reward', treat_box: 'Star Chest', open: 'Open!', settings: 'Settings',
      free_coins: 'Free Coins', coins_ready_in: 'Ready in {t}',
      chapter: 'Chapter {n}',
      ch_backyard: 'Sunny Backyard', ch_park: 'Dog Park', ch_beach: 'Beach Day', ch_autumn: 'Autumn Woods', ch_snow: 'Snowy Hills', ch_night: 'Starry Night',
      locked_chapter: 'Clear Level {n} to unlock', boss: 'Boss Level',
      diff_1: 'Easy', diff_2: 'Normal', diff_3: 'Tricky', diff_4: 'Hard', diff_5: 'Expert',
      // rules
      how_to_play: 'How to Play', rule_title: 'Place the pups so that…',
      rule_1: 'One per Row & Column', rule_1d: 'Every row and every column holds exactly one pup.',
      rule_2: 'One per Color Zone', rule_2d: 'Every color zone holds exactly one pup.',
      rule_3: 'No Touching', rule_3d: 'Pups can\'t be neighbors — not even diagonally.',
      controls: 'Tap: mark ✕ · Double-tap: place a pup · Swipe: mark many ✕',
      got_it: 'Got It!', lets_go: 'Let\'s Go!',
      // tutorial
      rc_color: 'One per\ncolor', rc_line: 'One per\nrow & col', rc_touch: 'No\ntouching',
      tut_1: 'Every color zone gets exactly one pup. {unit} has just one tile — double-tap it to place a pup!',
      tut_row: 'A row or column can hold only one pup. Tap each glowing tile to mark ✕ — or swipe across them!',
      tut_touch: 'Pups can\'t be neighbors — not even diagonally. Mark the glowing tiles around the pup ✕ too!',
      tut_zone: 'This color zone already has its pup. Mark the rest of it ✕!',
      tut_marked: 'Great marking!',
      tut_next: '{unit} has only one open cell left — double-tap it!',
      tut_done: 'Puzzle solved! Every row, column and zone has one happy pup.',
      tip_mark: 'Tip: tap a cell to mark ✕ where no pup can go. Swipe to mark several at once.',
      // HUD / boosters
      paused: 'Paused', resume: 'Resume', restart: 'Restart', home: 'Home',
      hint: 'Hint', locate: 'Locate',
      hint_d: 'Reveals where a pup belongs.', locate_d: 'Finds a few blocked cells and marks them ✕.',
      unlock_at: 'Unlocks at Level {n}',
      new_booster: 'New Booster!', free_gift: '{n} free to start!',
      get_more: 'Get More {name}', buy_for: 'Buy {n}', watch_ad_1: 'Free +1', not_enough: 'Not enough coins!',
      nothing_locate: 'No blocked cells left to find!',
      // feedback
      conflict_row: 'Only one pup per row!', conflict_col: 'Only one pup per column!', conflict_yard: 'Only one pup per color zone!', conflict_touch: 'Pups can\'t touch — not even diagonally!',
      wrong_spot: 'Wrong spot! −1 heart', locked_x: 'Blocked cell — no pup can go here!',
      h_hint: 'Found a pup\'s spot in {unit}!', h_locate: 'Located {n} blocked cells!',
      row_n: 'row {n}', col_n: 'column {n}', yard_c: 'the {c} zone',
      c0: 'Pink', c1: 'Orange', c2: 'Yellow', c3: 'Green', c4: 'Blue', c5: 'Purple', c6: 'Teal', c7: 'Red', c8: 'Tan', c9: 'Gray',
      // results
      pawsome: 'Pawsome!', great: 'Great Job!', level_done: 'Level {n} Complete!', time: 'Time', best: 'Best', new_best: 'New Record!',
      double_it: 'x2 Reward', next: 'Next', retry: 'Retry', continue_q: 'Out of Hearts!', continue_d: 'Refill 3 hearts and keep going?',
      continue_coins: 'Continue', continue_ad: 'Free Revive',
      daily_done: 'Challenge Complete!', streak: '{n}-Day Streak', come_back: 'A new challenge arrives tomorrow!', daily_done_today: 'Today\'s challenge is complete!',
      // meta
      new_pup: 'New Pup Unlocked!', joined: '{name} joined your pack!', pups_count: 'Collected {a}/{b}', locked_pup: 'Level {n}',
      gift_title: 'Daily Reward', day_n: 'Day {n}', claim: 'Claim', claim_x2: 'Claim x2', come_tomorrow: 'Come back tomorrow for more rewards!',
      wheel_title: 'Lucky Spin', spin: 'Spin', spin_free: 'Free Spin', spin_ad: 'Spin Again', spins_left: '{n} extra spins left today', no_spins: 'No spins left — come back tomorrow!',
      you_won: 'You got {what}!', box_title: 'Star Chest', box_d: 'Collect {n} stars to open the chest!', box_progress: '{a}/{b}',
      coins_n: '{n} Coins', booster_n: '{name} ×{n}',
      ad_title: 'Reward Video', ad_body: 'Demo ad — connect your ad network here', ad_close: 'Close', ad_reward_in: 'Reward in {n}s',
      // settings
      music: 'Music', sound: 'Sound Effects',
      reset: 'Reset Progress', reset_q: 'Reset all levels, coins and pups? This can\'t be undone.',
      yes: 'Reset', no: 'Cancel', ok: 'OK', close: 'Close', version: 'Version {v}',
      rotate: 'Please turn your phone to portrait',
      speech: ['Woof! Ready for a puzzle?', 'Tap to mark ✕, double-tap to place a pup!', 'Pups can\'t touch — not even diagonally!', 'Each color zone needs exactly one pup.', 'Stuck? A Hint shows you a pup!', 'Locate finds blocked cells for you!', 'Collect all 12 pups!', 'A new Daily Challenge every day!'],
      breeds: { shiba: 'Shiba Inu', corgi: 'Corgi', pug: 'Pug', beagle: 'Beagle', husky: 'Husky', dalmatian: 'Dalmatian', poodle: 'Poodle', golden: 'Golden Retriever', samoyed: 'Samoyed', frenchie: 'French Bulldog', chihuahua: 'Chihuahua', collie: 'Border Collie' },
      facts: {
        shiba: 'Shibas are famous for their foxy smile and dramatic "shiba scream".',
        corgi: 'Corgis were bred to herd cattle — those little legs are fast!',
        pug: 'Pugs were the lap dogs of ancient Chinese emperors.',
        beagle: 'A beagle\'s nose has about 220 million scent receptors.',
        husky: 'Huskies can have one blue eye and one brown eye.',
        dalmatian: 'Dalmatian puppies are born pure white — the spots come later!',
        poodle: 'Poodles are among the smartest dog breeds.',
        golden: 'Goldens love water and have water-repellent coats.',
        samoyed: 'The "Sammy smile" keeps them from drooling icicles.',
        frenchie: 'Frenchies can\'t swim well — their heads are too big!',
        chihuahua: 'Chihuahuas are the smallest dog breed in the world.',
        collie: 'Border collies can learn over 1,000 words.'
      }
    }
  };

  var I18n = {
    t: function (key, p) {
      var v = S.en[key];
      if (v == null) return key;
      if (p) v = String(v).replace(/\{(\w+)\}/g, function (m, k) { return p[k] != null ? p[k] : m; });
      return v;
    },
    fact: function (id) { return S.en.facts[id] || ''; },
    breed: function (id) { return S.en.breeds[id] || id; },
    list: function (key) { return S.en[key] || []; }
  };
  window.I18n = I18n;
  window.T = I18n.t;
})();
