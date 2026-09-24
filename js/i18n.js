/* Woofdoku — texts in English and Simplified Chinese.
 *   I18n.t(key, params)   '{name}' placeholders are replaced from params
 *   I18n.set('en'|'zh')    I18n.lang
 */
(function () {
  'use strict';
  var S = {
    en: {
      loading: 'Fetching puppies…', load_fail: 'Some files could not be loaded. Check your connection and reload.',
      tagline: 'PUPPY LOGIC PUZZLE', play: 'Play', level: 'Level {n}', levels: 'Levels', daily_puzzle: 'Daily Puzzle', wheel: 'Lucky Wheel',
      album: 'Pup Album', gift: 'Daily Gift', treat_box: 'Treat Box', open: 'Open!', free: 'Free', settings: 'Settings',
      free_coins: 'Free coins', coins_ready_in: 'Ready in {t}',
      chapter: 'Chapter {n}',
      ch_backyard: 'Sunny Backyard', ch_park: 'Dog Park', ch_beach: 'Beach Day', ch_autumn: 'Autumn Woods', ch_snow: 'Snowy Hills', ch_night: 'Starry Night',
      locked_chapter: 'Clear level {n} to unlock', boss: 'Boss',
      diff_1: 'Easy', diff_2: 'Casual', diff_3: 'Medium', diff_4: 'Hard', diff_5: 'Expert',
      // rules
      how_to_play: 'How to play', rule_title: 'Place one pup in every…',
      rule_1: 'Row and column', rule_1d: 'Each row and each column gets exactly one pup.',
      rule_2: 'Colored yard', rule_2d: 'Each colored yard gets exactly one pup too.',
      rule_3: 'No touching!', rule_3d: 'Pups need personal space — they can\'t touch, not even diagonally.',
      controls: 'Tap = ✕ (no pup here) · Double-tap = place a pup · Drag = ✕ many cells',
      got_it: 'Got it!', lets_go: 'Let\'s go!',
      // tutorial coach
      tut_1: 'Double-tap the glowing cell to place a pup! Tiny yards are a great place to start.',
      tut_2: 'Nice! Every cell that pup rules out got a ✕ automatically.',
      tut_next: 'Only one free spot is left in {unit} — double-tap it!',
      tut_done: 'You solved it! Every row, column and yard has one happy pup.',
      tip_mark: 'Tip: tap a cell to mark ✕ where a pup can\'t go — drag to mark many at once.',
      tip_mode: 'Tip: prefer single taps? Switch the tap button below to 🐶 to place pups with one tap.',
      // hud / tools
      undo: 'Undo', clear: 'Clear ✕', tap_mark: 'Tap: ✕', tap_pup: 'Tap: Pup', paused: 'Paused', resume: 'Resume', restart: 'Restart', home: 'Home',
      sniff: 'Sniff', fetch: 'Fetch', sweep: 'Sweep',
      sniff_d: 'Sniffs out the next clue and explains it.', fetch_d: 'Fetches a pup straight to its spot.', sweep_d: 'Crosses out every cell a pup can\'t use.',
      unlock_at: 'Unlocks at level {n}',
      new_booster: 'New booster!', free_gift: 'Here are {n} free to try!',
      get_more: 'Get more {name}', buy_for: '{n} for', watch_ad_1: 'Watch ad: +1', not_enough: 'Not enough coins',
      nothing_sweep: 'Nothing to sweep right now — try Sniff!', undo_empty: 'Nothing to undo',
      // feedback
      conflict_row: 'Pups can\'t share a row!', conflict_col: 'Pups can\'t share a column!', conflict_yard: 'One pup per yard!', conflict_touch: 'Pups can\'t touch — not even diagonally!',
      wrong_spot: 'Not this spot…', auto_off: 'Auto ✕ is off — mark cells yourself',
      locked_x: 'That ✕ is certain — no pup can go there',
      // hints
      h_mark: 'A pup rules out its row, column, yard and the 8 cells around it. Crossing those out!',
      h_lone: '{unit} has only one free spot left — a pup goes there!',
      h_confine: '{unit}\'s pup must be in {line}, so the rest of {line} is ruled out.',
      h_block: 'A pup on the red-ringed cells would leave no room in {unit}, so they\'re ruled out.',
      h_group: '{units} can only use {lines} between them, so no other pup can go there.',
      h_trial: 'If a pup sat here, some yard or line would run out of room a few moves later — so it\'s ruled out.',
      h_wrongmark: 'Oops — this ✕ is covering a pup\'s spot! Lifting it.',
      h_reveal: 'Sniff sniff… a pup belongs right here!',
      h_fetch: 'Fetched! A pup ran straight into {unit}.',
      h_sweep: 'Swept {n} cells no pup can use.', h_sweep_wrong: 'Also lifted {n} ✕ that covered a pup\'s spot.',
      row_n: 'row {n}', col_n: 'column {n}', yard_c: 'the {c} yard', and: ' and ',
      // colours
      c0: 'Pink', c1: 'Peach', c2: 'Lemon', c3: 'Mint', c4: 'Sky', c5: 'Lilac', c6: 'Aqua', c7: 'Coral', c8: 'Sand', c9: 'Cloud',
      // results
      pawsome: 'Pawsome!', great: 'Great job!', level_done: 'Level {n} complete!', time: 'Time', best: 'Best', new_best: 'New best!',
      reward: 'Reward', double_it: 'Double it', next: 'Next', retry: 'Retry', continue_q: 'Out of hearts!', continue_d: 'Keep going with 3 fresh hearts?',
      continue_coins: 'Continue', continue_ad: 'Watch ad', give_up: 'Give up', level_failed: 'The pups need another try!', try_again: 'Try again',
      daily_done: 'Daily puzzle solved!', streak: 'Streak: {n} day(s)', come_back: 'Come back tomorrow for a new puzzle!', daily_done_today: 'Today\'s puzzle is done ✓',
      // meta
      new_pup: 'New pup unlocked!', joined: '{name} joined your pack!', pups_count: '{a} / {b} pups', locked_pup: 'Clear level {n}',
      gift_title: 'Daily Gift', day_n: 'Day {n}', claim: 'Claim', claimed: 'Claimed', claim_x2: 'Claim ×2', come_tomorrow: 'Come back tomorrow!',
      wheel_title: 'Lucky Wheel', spin: 'Spin!', spin_free: 'Free spin', spin_ad: 'Spin again', spins_left: '{n} bonus spins left today', no_spins: 'Out of spins — come back tomorrow!',
      you_won: 'You won {what}!', box_title: 'Treat Box', box_d: 'Earn stars to fill the box.', box_progress: '{a} / {b} ★',
      coins_n: '{n} coins', booster_n: '{n} × {name}',
      ad_title: 'Rewarded video', ad_body: 'Demo ad — your ad network plugs in here', ad_close: 'Close', ad_reward_in: 'Reward in {n}s', ad_skip_warn: 'Close now and lose the reward?',
      // settings
      music: 'Music', sound: 'Sound', vibration: 'Vibration', auto_x: 'Auto ✕', auto_x_d: 'Cross out cells a pup rules out',
      patterns: 'Yard patterns', patterns_d: 'Symbols for color-blind play', language: 'Language', reset: 'Reset progress', reset_q: 'Erase all progress, coins and pups?',
      yes: 'Yes', no: 'No', ok: 'OK', cancel: 'Cancel', close: 'Close', version: 'Version {v}',
      rotate: 'Please rotate your phone to portrait',
      breeds: { shiba: 'Shiba Inu', corgi: 'Corgi', pug: 'Pug', beagle: 'Beagle', husky: 'Husky', dalmatian: 'Dalmatian', poodle: 'Poodle', golden: 'Golden Retriever', samoyed: 'Samoyed', frenchie: 'French Bulldog', chihuahua: 'Chihuahua', collie: 'Border Collie' },
      facts: {
        shiba: 'Shibas are famous for their foxy smile and dramatic "shiba scream".',
        corgi: 'Corgis were bred to herd cattle — those little legs are fast!',
        pug: 'Pugs were the lap dogs of ancient Chinese emperors.',
        beagle: 'A beagle\'s nose has about 220 million scent receptors.',
        husky: 'Huskies can have one blue eye and one brown eye.',
        dalmatian: 'Dalmatian puppies are born pure white — spots come later!',
        poodle: 'Poodles are the second smartest dog breed.',
        golden: 'Goldens love water and have water-repellent coats.',
        samoyed: 'The "Sammy smile" keeps them from drooling icicles.',
        frenchie: 'Frenchies can\'t swim well — their heads are too big!',
        chihuahua: 'Chihuahuas are the smallest dog breed in the world.',
        collie: 'Border collies can learn over 1,000 words.'
      }
    },
    zh: {
      loading: '小狗们正在赶来…', load_fail: '部分文件加载失败，请检查网络后刷新。',
      tagline: '汪汪逻辑谜题', play: '开始', level: '第 {n} 关', levels: '关卡', daily_puzzle: '每日谜题', wheel: '幸运转盘',
      album: '狗狗图鉴', gift: '每日礼物', treat_box: '零食宝箱', open: '打开！', free: '免费', settings: '设置',
      free_coins: '免费金币', coins_ready_in: '{t} 后可领',
      chapter: '第 {n} 章',
      ch_backyard: '阳光后院', ch_park: '狗狗公园', ch_beach: '海滩假日', ch_autumn: '秋日森林', ch_snow: '雪山小屋', ch_night: '星空之夜',
      locked_chapter: '通关第 {n} 关解锁', boss: '挑战',
      diff_1: '简单', diff_2: '轻松', diff_3: '中等', diff_4: '困难', diff_5: '专家',
      how_to_play: '玩法说明', rule_title: '每个区域只放一只狗狗…',
      rule_1: '每行和每列', rule_1d: '每一行、每一列都恰好有一只狗狗。',
      rule_2: '每个彩色院子', rule_2d: '每个颜色的院子里也恰好有一只狗狗。',
      rule_3: '不能挨着！', rule_3d: '狗狗需要私人空间——任何两只都不能相邻，斜着也不行。',
      controls: '单击 = ✕（这里没狗）· 双击 = 放狗狗 · 拖动 = 批量标 ✕',
      got_it: '知道啦！', lets_go: '出发！',
      tut_1: '双击发光的格子放下狗狗！从小院子开始最简单。',
      tut_2: '真棒！这只狗狗排除的格子已经自动标上 ✕ 了。',
      tut_next: '{unit}只剩一个空位了——双击它！',
      tut_done: '完成啦！每行、每列、每个院子都有一只开心的狗狗。',
      tip_mark: '小提示：单击格子标记 ✕ 表示不能放狗，按住拖动可以一次标很多格。',
      tip_mode: '小提示：喜欢单击放狗？把下面的点击模式切换成 🐶 即可。',
      undo: '撤销', clear: '清除 ✕', tap_mark: '点击：✕', tap_pup: '点击：狗狗', paused: '暂停', resume: '继续', restart: '重新开始', home: '主页',
      sniff: '嗅嗅', fetch: '叼回', sweep: '扫扫',
      sniff_d: '嗅出下一条线索并告诉你原因。', fetch_d: '直接叼来一只狗狗放到正确位置。', sweep_d: '把所有不可能放狗的格子都标上 ✕。',
      unlock_at: '第 {n} 关解锁',
      new_booster: '新道具！', free_gift: '送你 {n} 个免费试用！',
      get_more: '获取更多「{name}」', buy_for: '{n} 个', watch_ad_1: '看广告 +1', not_enough: '金币不足',
      nothing_sweep: '现在没有可以扫的格子——试试「嗅嗅」吧！', undo_empty: '没有可撤销的操作',
      conflict_row: '同一行不能有两只狗狗！', conflict_col: '同一列不能有两只狗狗！', conflict_yard: '一个院子只能有一只狗狗！', conflict_touch: '狗狗不能挨着——斜着也不行！',
      wrong_spot: '不是这里哦…', auto_off: '自动 ✕ 已关闭——请手动标记',
      locked_x: '这个 ✕ 是确定的——这里不能放狗狗',
      h_mark: '一只狗狗会排除它所在的行、列、院子以及周围 8 格。帮你标上 ✕！',
      h_lone: '{unit}只剩一个空位了——狗狗就在那里！',
      h_confine: '{unit}的狗狗一定在{line}，所以{line}的其他格子都排除了。',
      h_block: '如果狗狗在红圈格子上，{unit}就没有位置了，所以这些格子排除。',
      h_group: '{units}只能使用{lines}，所以其他狗狗不能放在那里。',
      h_trial: '如果狗狗放在这里，几步之后某个院子或行列就会没有位置——所以排除它。',
      h_wrongmark: '哎呀——这个 ✕ 盖住了狗狗的位置！帮你拿掉。',
      h_reveal: '嗅嗅…狗狗就该在这里！',
      h_fetch: '叼回来啦！一只狗狗跑进了{unit}。',
      h_sweep: '扫掉了 {n} 个不能放狗的格子。', h_sweep_wrong: '还拿掉了 {n} 个盖住狗狗位置的 ✕。',
      row_n: '第 {n} 行', col_n: '第 {n} 列', yard_c: '{c}院子', and: '和',
      c0: '粉色', c1: '桃色', c2: '柠檬色', c3: '薄荷色', c4: '天蓝色', c5: '淡紫色', c6: '水蓝色', c7: '珊瑚色', c8: '沙色', c9: '云灰色',
      pawsome: '汪汪棒！', great: '太棒了！', level_done: '第 {n} 关完成！', time: '用时', best: '最佳', new_best: '新纪录！',
      reward: '奖励', double_it: '双倍领取', next: '下一关', retry: '重玩', continue_q: '爱心用完了！', continue_d: '补满 3 颗爱心继续吗？',
      continue_coins: '继续', continue_ad: '看广告', give_up: '放弃', level_failed: '狗狗们想再试一次！', try_again: '再试一次',
      daily_done: '每日谜题完成！', streak: '连续 {n} 天', come_back: '明天再来挑战新谜题吧！', daily_done_today: '今日谜题已完成 ✓',
      new_pup: '解锁新狗狗！', joined: '{name}加入了你的狗狗队！', pups_count: '{a} / {b} 只狗狗', locked_pup: '通关第 {n} 关',
      gift_title: '每日礼物', day_n: '第 {n} 天', claim: '领取', claimed: '已领取', claim_x2: '双倍领取', come_tomorrow: '明天再来吧！',
      wheel_title: '幸运转盘', spin: '转！', spin_free: '免费转', spin_ad: '再转一次', spins_left: '今天还有 {n} 次额外机会', no_spins: '次数用完了，明天再来！',
      you_won: '你获得了 {what}！', box_title: '零食宝箱', box_d: '收集星星装满宝箱。', box_progress: '{a} / {b} ★',
      coins_n: '{n} 金币', booster_n: '{n} 个{name}',
      ad_title: '激励视频', ad_body: '演示广告——在这里接入你的广告平台', ad_close: '关闭', ad_reward_in: '{n} 秒后获得奖励', ad_skip_warn: '现在关闭将得不到奖励，确定吗？',
      music: '音乐', sound: '音效', vibration: '振动', auto_x: '自动 ✕', auto_x_d: '自动标出被狗狗排除的格子',
      patterns: '院子图案', patterns_d: '为色弱玩家显示符号', language: '语言', reset: '重置进度', reset_q: '清除所有进度、金币和狗狗吗？',
      yes: '确定', no: '取消', ok: '好的', cancel: '取消', close: '关闭', version: '版本 {v}',
      rotate: '请把手机竖过来玩',
      breeds: { shiba: '柴犬', corgi: '柯基', pug: '巴哥', beagle: '比格', husky: '哈士奇', dalmatian: '斑点狗', poodle: '贵宾', golden: '金毛', samoyed: '萨摩耶', frenchie: '法斗', chihuahua: '吉娃娃', collie: '边牧' },
      facts: {
        shiba: '柴犬以狐狸般的微笑和夸张的"柴犬尖叫"闻名。',
        corgi: '柯基原本是牧牛犬——小短腿跑得可快了！',
        pug: '巴哥犬曾是中国古代皇帝的宠物。',
        beagle: '比格犬的鼻子约有 2.2 亿个嗅觉细胞。',
        husky: '哈士奇可能一只眼睛蓝色、一只眼睛棕色。',
        dalmatian: '斑点狗刚出生时是纯白的——斑点是后来长的！',
        poodle: '贵宾犬是智商排名第二的狗狗。',
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
    breed: function (id) { return (S[I18n.lang].breeds || S.en.breeds)[id] || id; }
  };
  window.I18n = I18n;
  window.T = I18n.t;
})();
