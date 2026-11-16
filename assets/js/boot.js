/* 我的人社超能力：永續未來術 — 頁首啟動（同步載入，須放在樣式表之前）
   1. 標記可執行 JavaScript；site.js 載入失敗或中途出錯時，於 DOMContentLoaded 撤回標記，關卡與選單改為全部展開。
   2. 標題字型（Noto Serif TC）的版面跳動防護：
      a. DOMContentLoaded 時一次請求本頁所有襯線文字需要的字型分片（含收合中的關卡與展開區），
         之後切換關卡或展開內容不會再臨時下載。
      b. 若約 2.2 秒後仍沒有任何分片下載完成（畫面上還沒出現 Noto 字），固定改用系統襯線字，
         字型晚到也不替換；已有分片顯示時不切換，避免把已呈現的字換掉。
      Chrome 的 loading 事件不附 fontfaces，因此載入期間每 200ms 掃描一次各分片狀態。 */
(function () {
  'use strict';

  var root = document.documentElement;
  var FAMILY = 'Noto Serif TC';
  root.classList.add('js');
  document.addEventListener('DOMContentLoaded', function () {
    if (!root.classList.contains('js-ready')) root.classList.remove('js');
    requestSerifText();
  });

  var fonts = document.fonts;
  if (!fonts || typeof fonts.addEventListener !== 'function' || typeof fonts.forEach !== 'function') return;

  function requestSerifText() {
    if (!fonts || typeof fonts.load !== 'function' || root.classList.contains('fonts-late')) return;
    var byWeight = {};
    var els = document.body ? document.body.getElementsByTagName('*') : [];
    for (var i = 0; i < els.length; i++) {
      var cs = window.getComputedStyle(els[i]);
      if (cs.fontFamily.indexOf(FAMILY) === -1) continue;
      var own = '';
      for (var n = els[i].firstChild; n; n = n.nextSibling) if (n.nodeType === 3) own += n.nodeValue;
      own = own.replace(/\s+/g, '');
      if (own) byWeight[cs.fontWeight] = (byWeight[cs.fontWeight] || '') + own;
    }
    Object.keys(byWeight).forEach(function (w) {
      fonts.load(w + ' 1em "' + FAMILY + '"', byWeight[w]).catch(function () { /* 下載失敗時維持系統字型 */ });
    });
  }

  var LIMIT = 2200;
  var STEP = 200;
  var seen = [];
  var timer = 0;
  var shown = false;
  function firstSeen(face, now) {
    for (var i = 0; i < seen.length; i++) if (seen[i].face === face) return seen[i].t;
    seen.push({ face: face, t: now });
    return now;
  }
  function scan() {
    timer = 0;
    if (shown || root.classList.contains('fonts-late')) return;
    var now = Date.now();
    var late = false;
    fonts.forEach(function (face) {
      if (face.family.indexOf(FAMILY) === -1) return;
      if (face.status === 'loaded') shown = true;
      else if (face.status === 'loading' && now - firstSeen(face, now) >= LIMIT) late = true;
    });
    if (shown) return;
    if (late) { root.classList.add('fonts-late'); return; }
    if (fonts.status === 'loading') timer = window.setTimeout(scan, STEP);
  }
  fonts.addEventListener('loading', function () { if (!timer) scan(); });
})();
