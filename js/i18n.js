/* Woofdoku — texts in English and Simplified Chinese.
 *   I18n.t(key, params)   '{name}' placeholders are replaced from params
 *   I18n.set('en'|'zh')    I18n.lang
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
      music: 'Music', sound: 'Sound Effects', vibration: 'Vibration',
      patterns: 'Colorblind Mode', patterns_d: 'Adds symbols to every color zone', language: 'Language', reset: 'Reset Progress', reset_q: 'Reset all levels, coins and pups? This can\'t be undone.',
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
    },
    zh: {
      loading: '正在召集狗狗…', load_fail: '加载失败，请检查网络后重试。',
      tagline: '萌犬逻辑解谜', play: '开始游戏', level: '第 {n} 关', levels: '关卡', daily_puzzle: '每日挑战', wheel: '幸运转盘',
      album: '狗狗图鉴', gift: '每日签到', treat_box: '星星宝箱', open: '开启！', settings: '设置',
      free_coins: '免费金币', coins_ready_in: '{t} 后可领取',
      chapter: '第 {n} 章',
      ch_backyard: '阳光后院', ch_park: '狗狗公园', ch_beach: '海滩假日', ch_autumn: '秋日森林', ch_snow: '冰雪山丘', ch_night: '星空之夜',
      locked_chapter: '通关第 {n} 关解锁', boss: 'BOSS关',
      diff_1: '简单', diff_2: '普通', diff_3: '进阶', diff_4: '困难', diff_5: '专家',
      how_to_play: '玩法说明', rule_title: '放置狗狗时需要满足：',
      rule_1: '每行每列各一只', rule_1d: '每一行、每一列都恰好有一只狗狗。',
      rule_2: '每个区域各一只', rule_2d: '每个颜色区域里都恰好有一只狗狗。',
      rule_3: '不能相邻', rule_3d: '任意两只狗狗都不能挨着，斜对角也不行。',
      controls: '单击：标记 ✕ · 双击：放置狗狗 · 滑动：连续标记 ✕',
      got_it: '知道了', lets_go: '开始吧！',
      rc_color: '一种颜色\n一只狗', rc_line: '同行同列\n各一只', rc_touch: '狗狗\n不能相邻',
      tut_1: '每种颜色的区域只能放一只狗狗。{unit}只有一个格子——双击它放下狗狗！',
      tut_row: '同一行、同一列只能有一只狗狗。点击发光的格子标记 ✕，也可以滑动连续标记！',
      tut_touch: '狗狗不能相邻，斜对角也不行。把狗狗周围发光的格子也标上 ✕！',
      tut_zone: '这个颜色区域已经有狗狗了，把剩下的格子标上 ✕！',
      tut_marked: '标得漂亮！',
      tut_next: '{unit}只剩一个空格了——双击它！',
      tut_done: '解谜成功！每行、每列、每个区域都有一只开心的狗狗。',
      tip_mark: '小提示：单击格子标记 ✕，表示这里不能放狗狗；滑动可以一次标记多格。',
      paused: '暂停', resume: '继续游戏', restart: '重新开始', home: '返回主页',
      hint: '提示', locate: '定位',
      hint_d: '直接揭示一只狗狗的正确位置。', locate_d: '找出几个障碍格，并自动标上 ✕。',
      unlock_at: '第 {n} 关解锁',
      new_booster: '新道具！', free_gift: '赠送 {n} 个，快试试吧！',
      get_more: '获取更多「{name}」', buy_for: '购买 {n} 个', watch_ad_1: '免费 +1', not_enough: '金币不足！',
      nothing_locate: '已经没有可定位的障碍格了！',
      conflict_row: '每行只能放一只狗狗！', conflict_col: '每列只能放一只狗狗！', conflict_yard: '每个颜色区域只能放一只狗狗！', conflict_touch: '狗狗不能相邻，斜对角也不行！',
      wrong_spot: '位置错误，扣除 1 颗爱心！', locked_x: '这是障碍格，不能放狗狗！',
      h_hint: '在{unit}找到了一只狗狗的位置！', h_locate: '定位到 {n} 个障碍格！',
      row_n: '第 {n} 行', col_n: '第 {n} 列', yard_c: '{c}区域',
      c0: '粉色', c1: '橙色', c2: '黄色', c3: '绿色', c4: '蓝色', c5: '紫色', c6: '青色', c7: '红色', c8: '米色', c9: '灰色',
      pawsome: '汪汪真棒！', great: '太棒了！', level_done: '第 {n} 关 通关！', time: '用时', best: '最佳', new_best: '新纪录！',
      double_it: '双倍领取', next: '下一关', retry: '再来一次', continue_q: '爱心用完了！', continue_d: '补满 3 颗爱心，继续挑战？',
      continue_coins: '继续挑战', continue_ad: '免费复活',
      daily_done: '每日挑战完成！', streak: '连续 {n} 天', come_back: '明天会有新的挑战！', daily_done_today: '今日挑战已完成！',
      new_pup: '解锁新狗狗！', joined: '{name}加入了你的狗狗队！', pups_count: '已收集 {a}/{b}', locked_pup: '第 {n} 关解锁',
      gift_title: '每日签到', day_n: '第{n}天', claim: '领取', claim_x2: '双倍领取', come_tomorrow: '明天再来签到领奖励吧！',
      wheel_title: '幸运转盘', spin: '抽奖', spin_free: '免费抽奖', spin_ad: '再抽一次', spins_left: '今日剩余额外次数：{n}', no_spins: '今日次数已用完，明天再来！',
      you_won: '获得 {what}！', box_title: '星星宝箱', box_d: '集满 {n} 颗星星即可开启宝箱！', box_progress: '{a}/{b}',
      coins_n: '{n} 金币', booster_n: '{name} ×{n}',
      ad_title: '奖励视频', ad_body: '演示广告：此处接入广告平台', ad_close: '关闭', ad_reward_in: '{n} 秒后获得奖励',
      music: '音乐', sound: '音效', vibration: '震动',
      patterns: '色弱模式', patterns_d: '为每个颜色区域加上图案', language: '语言', reset: '重置进度', reset_q: '确定重置所有关卡、金币和狗狗吗？此操作无法撤销。',
      yes: '重置', no: '取消', ok: '好的', close: '关闭', version: '版本 {v}',
      rotate: '请将手机竖屏游玩',
      speech: ['汪！来挑战谜题吧！', '单击标记 ✕，双击放狗狗！', '狗狗不能相邻，斜对角也不行！', '每个颜色区域只放一只狗狗。', '卡住了？用「提示」找到一只狗狗！', '「定位」能帮你找出障碍格！', '集齐全部 12 只狗狗吧！', '每天都有新的每日挑战！'],
      breeds: { shiba: '柴犬', corgi: '柯基', pug: '巴哥', beagle: '比格', husky: '哈士奇', dalmatian: '斑点狗', poodle: '贵宾', golden: '金毛', samoyed: '萨摩耶', frenchie: '法斗', chihuahua: '吉娃娃', collie: '边牧' },
      facts: {
        shiba: '柴犬以狐狸般的微笑和夸张的"柴犬尖叫"闻名。',
        corgi: '柯基原本是牧牛犬——小短腿跑得可快了！',
        pug: '巴哥犬曾是中国古代皇帝的宠物。',
        beagle: '比格犬的鼻子约有 2.2 亿个嗅觉细胞。',
        husky: '哈士奇可能一只眼睛蓝色、一只眼睛棕色。',
        dalmatian: '斑点狗刚出生时是纯白的——斑点是后来长的！',
        poodle: '贵宾犬是最聪明的犬种之一。',
        golden: '金毛超爱玩水，毛发还能防水。',
        samoyed: '"萨摩耶微笑"能防止口水结成冰。',
        frenchie: '法斗不太会游泳——因为头太大啦！',
        chihuahua: '吉娃娃是世界上体型最小的狗狗。',
        collie: '边牧能学会 1000 多个单词。'
      }
    }
  };
  var I18n = {
    lang: 'en',
    set: function (l) { I18n.lang = S[l] ? l : 'en'; try { document.documentElement.lang = I18n.lang === 'zh' ? 'zh-CN' : 'en'; } catch (e) {} },
    t: function (key, p) {
      var v = S[I18n.lang][key];
      if (v == null) v = S.en[key];
      if (v == null) return key;
      if (p) v = String(v).replace(/\{(\w+)\}/g, function (m, k) { return p[k] != null ? p[k] : m; });
      return v;
    },
    fact: function (id) { return (S[I18n.lang].facts || S.en.facts)[id] || ''; },
    breed: function (id) { return (S[I18n.lang].breeds || S.en.breeds)[id] || id; },
    list: function (key) { return S[I18n.lang][key] || S.en[key] || []; }
  };
  window.I18n = I18n;
  window.T = I18n.t;
})();
