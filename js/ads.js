/* Woofdoku — rewarded video hook.
 *   Ads.rewarded(placement) -> Promise<boolean>   true = the player earned the reward
 *
 * This build shows a 5-second demo placeholder. To go live, replace `show()` with your ad network's
 * rewarded-video call (e.g. AdSense H5 Games adBreak({type:'reward'}), WeChat wx.createRewardedVideoAd,
 * or a native bridge) and resolve true only from its "reward earned" callback.
 * Placements used by the game: 'double_coins', 'continue', 'booster', 'wheel', 'free_coins', 'gift_x2'.
 */
(function () {
  'use strict';
  var DEMO_SECONDS = 5;

  function show(placement) {
    return new Promise(function (resolve) {
      var app = document.getElementById('app');
      var el = document.createElement('div');
      el.className = 'ad-screen';
      el.setAttribute('data-placement', placement || '');
      var pup = window.Assets ? Assets.url('mascot/cheer') : '';
      el.innerHTML = '<div class="tag">' + T('ad_title') + '</div><div class="cd"></div>' +
        (pup ? '<img alt="" src="' + pup + '">' : '') + '<h2>Woofdoku</h2><p>' + T('ad_body') + '</p><div class="bar"><i></i></div>';
      app.appendChild(el);
      try { Snd.duck(DEMO_SECONDS + 1); } catch (e) {}
      var left = DEMO_SECONDS, cd = el.querySelector('.cd'), bar = el.querySelector('.bar i'), done = false;
      bar.style.transition = 'width ' + DEMO_SECONDS + 's linear';
      requestAnimationFrame(function () { requestAnimationFrame(function () { bar.style.width = '100%'; }); });
      function render() { cd.textContent = left > 0 ? T('ad_reward_in', { n: left }) : '✕ ' + T('ad_close'); }
      render();
      var iv = setInterval(function () { left--; render(); if (left <= 0) clearInterval(iv); }, 1000);
      cd.style.pointerEvents = 'auto';
      cd.addEventListener('click', function () {
        if (done) return;
        if (left > 0) return; // reward requires watching to the end
        done = true; clearInterval(iv);
        el.remove();
        resolve(true);
      });
    });
  }

  var busy = false;
  window.Ads = {
    rewarded: function (placement) {
      if (busy) return Promise.resolve(false);
      busy = true;
      return show(placement).then(function (ok) { busy = false; return ok; }, function () { busy = false; return false; });
    }
  };
})();
