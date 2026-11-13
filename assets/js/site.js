/* 我的人社超能力：永續未來術 — 前端互動
   GSAP 未載入或使用者偏好減少動態時，內容一律直接呈現，不預先隱藏。 */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var animate = hasGsap && !reduce;
  root.classList.add('js');

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (err) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (err) { /* 私密模式或封鎖儲存時略過 */ } }
  };

  /* ---------- 導覽列：下捲隱藏、上捲出現、閱讀進度、回頂端 ---------- */
  var header = $('[data-header]');
  var bar = $('[data-progress]');
  var toTop = $('[data-to-top]');
  var lastY = window.scrollY;
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    var max = doc.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    if (header && !header.classList.contains('menu-open')) {
      if (y > lastY && y > 240) header.classList.add('is-hidden');
      else if (y < lastY - 4 || y < 120) header.classList.remove('is-hidden');
    }
    if (toTop) toTop.classList.toggle('is-on', y > window.innerHeight);
    lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      var skip = $('.brand');
      if (skip) skip.focus({ preventScroll: true });
    });
  }

  /* ---------- 行動版選單 ---------- */
  var menuBtn = $('[data-menu-btn]');
  var menu = $('[data-menu]');
  /* 選單開啟時，被遮住的頁面內容不可聚焦，Tab 不會跑到看不見的位置 */
  var behindMenu = $all('.skip, #main, .pager, .site-footer, [data-to-top]');
  function setMenu(open) {
    if (!menuBtn || !menu) return;
    menuBtn.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
    doc.body.style.overflow = open ? 'hidden' : '';
    behindMenu.forEach(function (el) { el.inert = open; });
    if (open) {
      header.classList.remove('is-hidden');
      var first = $('a', menu);
      if (first) first.focus();
    }
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    doc.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
    });
    $all('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    /* 與 CSS 行動版斷點同一條件，避免 1080～1081 之間的小數寬度留下 inert 與捲動鎖定 */
    window.matchMedia('(max-width: 1080px)').addEventListener('change', function (mq) { if (!mq.matches) setMenu(false); });
  }

  /* ---------- 進場動畫與顯影 ---------- */
  if (animate) {
    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);

    /* 背景齒孔隨捲動緩移，像底片在片門中前進 */
    gsap.to('.bg-sprocket', {
      y: 96, ease: 'none',
      scrollTrigger: { trigger: doc.body, start: 'top top', end: 'bottom bottom', scrub: 0.6 }
    });

    /* 背景特效：半色調網點與畫格外框以不同速度位移，形成景深（參考站的背景分層手法） */
    var scrubBody = { trigger: doc.body, start: 'top top', end: 'bottom bottom', scrub: 0.8 };
    gsap.to('.bg-halftone', { y: -180, ease: 'none', scrollTrigger: scrubBody });
    gsap.to('.bg-frame', { y: 140, rotation: '+=4', ease: 'none', scrollTrigger: scrubBody });
    /* 首頁四格角色：捲動時各自以不同速度小幅位移（作用在內層圖，不與進場動畫衝突） */
    $all('[data-hero-frame] .hf-char').forEach(function (img, i) {
      gsap.to(img, { y: (i % 2 ? -1 : 1) * 22, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 } });
    });

    /* 首頁主視覺：展名由潛影浮現 */
    var heroLines = $all('[data-hero-line]');
    var heroTl = null;
    if (heroLines.length) {
      heroTl = gsap.timeline({ delay: 0.15, paused: true })
        .from(heroLines, { opacity: 0, filter: 'blur(10px) contrast(0.6)', y: 36, duration: 1.8, stagger: 0.3, ease: 'power2.out' })
        .from('.hero-en, .hero-meta', { opacity: 0, y: 22, duration: 1.3, stagger: 0.2, ease: 'power2.out' }, '-=1.0')
        .from('[data-hero-frame]', { opacity: 0, filter: 'grayscale(1) brightness(1.4)', y: 44, duration: 1.7, stagger: 0.28, ease: 'power2.out' }, '-=1.0');
    }

    /* 文字段落：逐字浮現（拆字只在這裡由 JS 完成，HTML 與文案不變；全文保持原順序，不增減任何字）。
       其餘區塊逐段進場。往下捲、往回捲再進入畫面都會重播，離開畫面後重設。速度比原版放慢。 */
    var charGroups = [];
    $all('p[data-reveal], .verse p, h1[data-reveal]').forEach(function (el) {
      if (el.children.length || !el.textContent.trim()) return;
      var text = el.textContent;
      var frag = doc.createDocumentFragment();
      var chars = [];
      Array.from(text).forEach(function (c) {
        var s = doc.createElement('span');
        s.className = 'ch';
        s.textContent = c;
        frag.appendChild(s);
        chars.push(s);
      });
      el.textContent = '';
      el.appendChild(frag);
      var isTitle = el.classList.contains('page-title');
      charGroups.push({ el: el, chars: chars, stage: !!el.closest('[data-stage]'),
        each: isTitle ? Math.min(0.09, 1.4 / chars.length) : Math.min(0.045, 2.6 / chars.length), delay: 0 });
    });
    /* 副標接續標題之後浮現：延遲＝標題播放時間 */
    charGroups.forEach(function (g) {
      if (!g.el.classList.contains('page-unit')) return;
      var t = charGroups.filter(function (x) { return x.el.classList.contains('page-title'); })[0];
      if (t) g.delay = (t.chars.length - 1) * t.each + 0.6;
    });
    function charsPlay(g) {
      gsap.killTweensOf(g.chars);
      gsap.to(g.chars, { opacity: 1, duration: 0.6, ease: 'none', delay: g.delay || 0,
        stagger: { each: g.each }, overwrite: true });
    }
    function charsReset(g) {
      gsap.killTweensOf(g.chars);
      gsap.set(g.chars, { opacity: 0 });
    }
    window.__hssCharsPlay = function (panel) {
      charGroups.forEach(function (g) { if (g.stage && panel.contains(g.el)) { charsReset(g); charsPlay(g); } });
    };
    charGroups.forEach(function (g) { gsap.set(g.chars, { opacity: 0 }); });

    var plainReveal = $all('[data-reveal]').filter(function (el) {
      return !charGroups.some(function (g) { return g.el === el; }) &&
        !(el.classList.contains('verse'));
    });
    /* 各頁不同的進場方向（由左、由右、由下），手機版位移縮小避免橫向溢出 */
    var DX = window.matchMedia('(max-width: 720px)').matches ? 24 : 56;
    var FX = [
      ['.page-sustain .essay-h', function () { return { x: -DX, y: 0 }; }],
      ['.page-powers .power-big', function (el) {
        var i = $all('.power-block').indexOf(el.closest('.power-block'));
        return { x: i % 2 ? DX : -DX, y: 0 };
      }],
      ['.page-awaken .intro-h', function () { return { x: -DX, y: 0 }; }],
      ['.page-awaken .intro-bullets li', function () { return { x: DX, y: 0 }; }],
      ['.page-awaken .voice', function () { return { x: 0, y: 40 }; }],
      ['.page-timeline .ev', function () { return { x: -DX, y: 0 }; }],
      ['.page-events .ticket', function () { return { x: -DX, y: 0 }; }],
      ['.page-events .lecture', function () { return { x: DX, y: 0 }; }],
      ['.page-events .game-title, .page-events .game-body p', function () { return { x: 0, y: 32 }; }]
    ];
    function fxFrom(el) {
      var d = el.getAttribute('data-fx');
      if (d === 'l') return { x: -DX, y: 0 };
      if (d === 'r') return { x: DX, y: 0 };
      for (var i = 0; i < FX.length; i++) { if (el.matches(FX[i][0])) return FX[i][1](el); }
      return { x: 0, y: 24 };
    }
    plainReveal.forEach(function (el) {
      el.__fx = fxFrom(el);
      gsap.set(el, { opacity: 0, x: el.__fx.x, y: el.__fx.y });
    });

    /* 進場動畫等網頁字型就緒再開始（最多等 800ms），避免字型替換與位移動畫疊加造成版面跳動 */
    var entranceStarted = false;
    var startEntrance = function () {
      if (entranceStarted) return;
      entranceStarted = true;
      if (heroTl) heroTl.play();
      var st = window.ScrollTrigger;
      plainReveal.forEach(function (el) {
        if (el.closest('dialog')) return; /* 已搬進彈窗的內容不再建立進場觸發 */
        if (el.closest('[data-stage]')) {
          st.create({ trigger: el, start: 'top 92%', once: true,
            onEnter: function () { gsap.to(el, { opacity: 1, x: 0, y: 0, duration: 1.1, ease: 'power3.out', overwrite: true }); } });
          return;
        }
        /* 重設只在整塊文字完全離開視窗後才發生，畫面內的文字不會突然消失 */
        var showEl = function () { gsap.to(el, { opacity: 1, x: 0, y: 0, duration: 1.1, ease: 'power3.out', overwrite: true }); };
        var hideEl = function () { if (el.closest('dialog')) return; gsap.killTweensOf(el); gsap.set(el, { opacity: 0, x: el.__fx.x, y: el.__fx.y }); };
        st.create({ trigger: el, start: 'top 92%', end: 'bottom top', onEnter: showEl, onEnterBack: showEl, onLeave: hideEl });
        st.create({ trigger: el, start: 'top bottom', onLeaveBack: hideEl });
      });
      charGroups.forEach(function (g) {
        if (g.stage || g.el.closest('dialog')) return;
        var show = function () { charsPlay(g); };
        var hide = function () { charsReset(g); };
        st.create({ trigger: g.el, start: 'top 92%', end: 'bottom top', onEnter: show, onEnterBack: show, onLeave: hide });
        st.create({ trigger: g.el, start: 'top bottom', onLeaveBack: hide });
      });
      st.refresh();
    };
    if (doc.fonts && doc.fonts.ready) {
      doc.fonts.ready.then(startEntrance, startEntrance);
      window.setTimeout(startEntrance, 800);
    } else {
      startEntrance();
    }

    /* 照片：由灰階潛影沖成原色 */
    $all('[data-develop]').forEach(function (fig) {
      var img = $('img', fig);
      if (!img) return;
      gsap.fromTo(img,
        { filter: 'grayscale(1) contrast(0.85) brightness(1.18)', clipPath: 'inset(0 100% 0 0)' },
        {
          filter: 'grayscale(0) contrast(1) brightness(1)', clipPath: 'inset(0 0% 0 0)', duration: 1.6, ease: 'power2.out',
          scrollTrigger: { trigger: fig, start: 'top 88%', once: true },
          onComplete: function () { img.style.filter = ''; img.style.clipPath = ''; }
        });
    });

    /* 超能力大字：由描邊沖成實色 */
    $all('[data-develop-text]').forEach(function (el) {
      gsap.fromTo(el, { color: '#d9cdc5', filter: 'blur(6px)' },
        { color: '#74604f', filter: 'blur(0px)', duration: 1.1, ease: 'power2.out', clearProps: 'filter',
          scrollTrigger: { trigger: el, start: 'top 80%', once: true } });
    });

    /* 內頁 10：影片縮圖卡依序由下浮入（只用 opacity 與 transform，不影響版面） */
    var vcards = $all('.page-supply .vthumb, .page-supply .v-more');
    if (vcards.length) {
      gsap.set(vcards, { opacity: 0, y: 36, scale: 0.96 });
      window.ScrollTrigger.batch(vcards, {
        start: 'top 92%', once: true,
        onEnter: function (batch) {
          gsap.to(batch, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out', stagger: 0.09, overwrite: true, clearProps: 'transform' });
        }
      });
    }

    /* 內頁 11：年代大字隨捲動小幅橫移 */
    $all('[data-drift]').forEach(function (el) {
      gsap.fromTo(el, { x: -40 }, { x: 40, ease: 'none',
        scrollTrigger: { trigger: el.closest('.decade'), start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    });

    /* 大事記：時間軸隨捲動描繪 */
    var rail = $('[data-rail]');
    if (rail) {
      gsap.fromTo(rail, { scaleY: 0 }, {
        scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: '.timeline-wrap', start: 'top 70%', end: 'bottom 70%', scrub: 0.4 }
      });
    }
  }

  /* ---------- 內頁 11、12：固定跳轉列的捲動位置標示 ---------- */
  var spy = $('[data-spy]');
  if (spy) {
    var spyLinks = $all('a', spy);
    var spyPairs = spyLinks.map(function (a) {
      return { a: a, t: doc.getElementById(a.getAttribute('href').slice(1)) };
    }).filter(function (x) { return x.t; });
    var spyTick = false;
    var spyUpdate = function () {
      spyTick = false;
      var line = spy.getBoundingClientRect().bottom + 190; /* 含錨點 scroll-margin，跳轉後目標區塊即判定為目前位置 */
      var cur = null;
      spyPairs.forEach(function (x) { if (x.t.getBoundingClientRect().top <= line) cur = x; });
      spyPairs.forEach(function (x) {
        if (x === cur) x.a.setAttribute('aria-current', 'true'); else x.a.removeAttribute('aria-current');
      });
      if (cur) {
        var ul = cur.a.parentNode.parentNode;
        var want = cur.a.offsetLeft - (ul.clientWidth - cur.a.offsetWidth) / 2;
        if (ul.scrollWidth > ul.clientWidth) ul.scrollLeft = want;
      }
    };
    window.addEventListener('scroll', function () {
      if (!spyTick) { spyTick = true; window.requestAnimationFrame(spyUpdate); }
    }, { passive: true });
    window.addEventListener('resize', spyUpdate);
    spyUpdate();
  }

  /* ---------- 內頁 3–9：關卡頁籤與選項 ---------- */
  var game = $('[data-game]');
  if (game) {
    var tabs = $all('[data-tab]', game);
    var stagesWrap = $('.stages', game);
    var stages = $all('[data-stage]', game);
    var seenCount = $('[data-seen-count]', game);
    /* 只收 1～6 並去重（初始資料與每次合併都用同一套） */
    function mergeSeen(list, raw) {
      (raw || '').split(',').forEach(function (k) { if (/^[1-6]$/.test(k) && list.indexOf(k) === -1) list.push(k); });
      return list;
    }
    var seen = mergeSeen([], store.get('hss-seen'));
    var current = 0;

    function markSeen(n) {
      /* 先併入儲存中的最新進度（多分頁同時開啟時不互相覆蓋），只收 1～6 */
      mergeSeen(seen, store.get('hss-seen'));
      if (seen.indexOf(String(n)) === -1) { seen.push(String(n)); }
      store.set('hss-seen', seen.join(','));
      tabs.forEach(function (t) { t.classList.toggle('is-seen', seen.indexOf(t.getAttribute('data-tab')) !== -1); });
      if (seenCount) seenCount.textContent = String(Math.min(6, seen.length));
      /* 探索滿 6 關才顯示「前往超能力補給站」，顯示後維持 */
      var allSeen = seen.length >= 6;
      $all('[data-gate-supply]', game).forEach(function (a) { a.hidden = !allSeen; });
    }

    /* 另一分頁更新了進度時，這一頁也同步（顯示解鎖狀態） */
    window.addEventListener('storage', function (ev) {
      if (ev.key !== 'hss-seen') return;
      mergeSeen(seen, ev.newValue);
      tabs.forEach(function (t) { t.classList.toggle('is-seen', seen.indexOf(t.getAttribute('data-tab')) !== -1); });
      if (seenCount) seenCount.textContent = String(Math.min(6, seen.length));
      $all('[data-gate-supply]', game).forEach(function (a) { a.hidden = seen.length < 6; });
    });

    function activate(n, opts) {
      opts = opts || {};
      closeStageDialog();
      n = Math.max(1, Math.min(stages.length, n));
      tabs.forEach(function (t) {
        var on = Number(t.getAttribute('data-tab')) === n;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      stages.forEach(function (s) { s.classList.toggle('is-active', Number(s.getAttribute('data-stage')) === n); });
      stagesWrap.classList.add('is-ready');
      var panel = stages[n - 1];
      if (animate && current && current !== n) {
        window.gsap.fromTo($('.stage-inner', panel),
          { clipPath: 'inset(0 0 100% 0)', y: -12 },
          { clipPath: 'inset(0 0 0% 0)', y: 0, duration: 0.6, ease: 'power3.out',
            onComplete: function () { $('.stage-inner', panel).style.clipPath = ''; } });
        $all('[data-reveal]', panel).forEach(function (el) { el.style.opacity = '1'; el.style.transform = ''; });
      }
      if (animate && window.__hssCharsPlay) window.__hssCharsPlay(panel);
      current = n;
      markSeen(n);
      if (opts.scroll) {
        var top = game.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
      }
      if (animate) window.ScrollTrigger.refresh();
    }

    function fromHash() {
      var m = /^#stage-(\d)$/.exec(window.location.hash);
      return m ? Number(m[1]) : 0;
    }

    function go(n, focusTab) {
      if (window.location.hash !== '#stage-' + n) history.pushState(null, '', '#stage-' + n);
      activate(n, { scroll: true });
      if (focusTab) tabs[n - 1].focus({ preventScroll: true });
    }

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function (ev) { ev.preventDefault(); go(i + 1, false); });
      t.addEventListener('keydown', function (ev) {
        var k = ev.key, to = null;
        if (k === 'ArrowRight') to = i + 1 < tabs.length ? i + 2 : 1;
        else if (k === 'ArrowLeft') to = i > 0 ? i : tabs.length;
        else if (k === 'Home') to = 1;
        else if (k === 'End') to = tabs.length;
        if (to) { ev.preventDefault(); go(to, true); }
      });
    });

    $all('[data-goto]', game).forEach(function (a) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        var d = a.closest('details');
        if (d) d.open = false;
        go(Number(a.getAttribute('data-goto')), true);
      });
    });

    /* 7-2 地圖、8-2 拼圖：選項回應以原生 dialog 彈窗顯示。
       內容不複製：開窗時把該 .resp 搬進 dialog（原位留佔位節點），關窗搬回；無 JS／列印時內容永遠在原位 */
    var openDlg = null;
    function closeStageDialog() {
      var d = openDlg;
      if (!d) return;
      if (d.open) d.close();
      if (d.__restore) d.__restore(); /* 同步還原：close 事件是非同步的，列印／切關不能等它 */
    }
    window.addEventListener('beforeprint', closeStageDialog);
    function showInDialog(btn, resp) {
      if (typeof HTMLDialogElement === 'undefined') { resp.hidden = false; return; }
      var dlg = document.createElement('dialog');
      dlg.className = 'stage-dialog';
      var tid = 'sd-t-' + resp.id;
      dlg.setAttribute('aria-labelledby', tid);
      dlg.innerHTML = '<div class="sd-head"><h3 class="sd-title" id="' + tid + '"></h3>' +
        '<button type="button" class="sd-close">關閉</button></div><div class="sd-body"></div>';
      $('.sd-title', dlg).textContent = $('.opt-text', btn).textContent;
      var holder = document.createComment('resp-holder');
      resp.parentNode.insertBefore(holder, resp);
      $('.sd-body', dlg).appendChild(resp);
      resp.hidden = false;
      document.body.appendChild(dlg);
      $('.sd-close', dlg).addEventListener('click', function () { dlg.close(); });
      var restored = false;
      var restore = function () {
        if (restored) return;
        restored = true;
        holder.parentNode.insertBefore(resp, holder);
        holder.parentNode.removeChild(holder);
        resp.hidden = true;
        btn.setAttribute('aria-pressed', 'false');
        if (dlg.parentNode) dlg.parentNode.removeChild(dlg);
        if (openDlg === dlg) openDlg = null;
        if (document.contains(btn) && btn.offsetParent !== null) btn.focus();
      };
      dlg.__restore = restore;
      dlg.addEventListener('close', restore);
      openDlg = dlg;
      dlg.showModal();
    }

    stages.forEach(function (stage) {
      var opts = $all('[data-opt]', stage);
      var resps = $all('[data-resp]', stage);
      var hint = $('[data-hint]', stage);
      var dlgMode = typeof HTMLDialogElement !== 'undefined' && typeof HTMLDialogElement.prototype.showModal === 'function' && /^(map|puzzle)$/.test(stage.getAttribute('data-ui') || '');
      opts.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var k = btn.getAttribute('data-opt');
          if (dlgMode) {
            var rr = resps.filter(function (r) { return r.getAttribute('data-resp') === k; })[0];
            if (rr) { opts.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); }); showInDialog(btn, rr); }
            return;
          }
          opts.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
          resps.forEach(function (r) {
            var on = r.getAttribute('data-resp') === k;
            r.hidden = !on;
            if (on && animate) {
              window.gsap.fromTo(r, { opacity: 0, y: 12, filter: 'grayscale(1)' }, { opacity: 1, y: 0, filter: 'grayscale(0)', duration: 0.5, ease: 'power2.out',
                onComplete: function () { r.style.filter = ''; } });
            }
          });
          if (hint) hint.hidden = true;
          if (stage.getAttribute('data-ui') === 'card') { /* 回應在卡片內展開，另把文字送進原本的朗讀區 */
            var live = $('.resp-box', stage), cur = resps.filter(function (r) { return r.getAttribute('data-resp') === k; })[0];
            if (live && cur) live.textContent = cur.textContent;
          }
        });
      });
    });

    window.addEventListener('popstate', function () {
      var hadDialog = !!openDlg;
      activate(fromHash() || 1, { scroll: false });
      var lost = !document.activeElement || document.activeElement === document.body;
      if (hadDialog || lost) {
        var focusTab = function () { var tb = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0]; if (tb) tb.focus({ preventScroll: true }); };
        focusTab(); window.setTimeout(focusTab, 0); window.setTimeout(focusTab, 120); /* 原生關窗的焦點歸還是延後執行，補打幾次確保落在新頁籤 */
      }
    });
    var initial = fromHash();
    activate(initial || 1, { scroll: false });
    if (initial) {
      window.requestAnimationFrame(function () {
        window.scrollTo({ top: game.getBoundingClientRect().top + window.scrollY, behavior: 'auto' });
      });
    }
  }

  /* ---------- 影音：點擊後才載入播放器 ---------- */
  $all('[data-embed]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var src = btn.getAttribute('data-embed');
      if (!/^https:\/\/(www\.youtube-nocookie\.com|drive\.google\.com)\//.test(src)) return;
      if (src.indexOf('youtube-nocookie') !== -1) src += (src.indexOf('?') === -1 ? '?' : '&') + 'autoplay=1&rel=0';
      var box = doc.createElement('div');
      box.className = 'v-frame';
      var f = doc.createElement('iframe');
      f.src = src;
      f.title = btn.getAttribute('data-title') || '影片';
      f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
      f.setAttribute('allowfullscreen', '');
      f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      box.appendChild(f);
      btn.replaceWith(box);
      f.focus();
    });
  });

  /* ---------- 照片燈箱 ---------- */
  var dlg = $('[data-lightbox-dialog]');
  if (dlg && typeof dlg.showModal === 'function') {
    var lbImg = $('[data-lb-img]', dlg);
    var lbCap = $('[data-lb-cap]', dlg);
    var group = [], idx = 0, opener = null;

    function show(i) {
      idx = (i + group.length) % group.length;
      var a = group[idx];
      var img = $('img', a);
      lbImg.src = a.getAttribute('href');
      lbImg.alt = img ? img.alt : '';
      lbCap.textContent = a.getAttribute('data-caption') || '';
      $('[data-lb-prev]', dlg).hidden = group.length < 2;
      $('[data-lb-next]', dlg).hidden = group.length < 2;
    }
    var lbGroups = {}; /* 載入時固定各群組照片順序：之後區塊被搬進彈窗也不會打亂前後張 */
    $all('[data-lightbox]').forEach(function (a) {
      var nm = a.getAttribute('data-lightbox');
      (lbGroups[nm] = lbGroups[nm] || []).push(a);
    });
    $all('[data-lightbox]').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        var name = a.getAttribute('data-lightbox');
        group = lbGroups[name];
        opener = a;
        show(group.indexOf(a));
        dlg.showModal();
      });
    });
    $('[data-lb-close]', dlg).addEventListener('click', function () { dlg.close(); });
    $('[data-lb-prev]', dlg).addEventListener('click', function () { show(idx - 1); });
    $('[data-lb-next]', dlg).addEventListener('click', function () { show(idx + 1); });
    dlg.addEventListener('click', function (ev) { if (ev.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowLeft' && group.length > 1) show(idx - 1);
      if (ev.key === 'ArrowRight' && group.length > 1) show(idx + 1);
    });
    dlg.addEventListener('close', function () {
      lbImg.removeAttribute('src');
      if (opener && !window.__hssBulkClose) opener.focus(); /* 整批關閉時焦點由角色彈窗還原統一處理 */
    });
  }

  /* ---------- 內頁2 四扇門：點門以彈窗顯示該角色介紹（內容整段搬入、關窗搬回；無 JS／列印時仍直排原位） ---------- */
  var pdoors = $all('[data-power-door]');
  if (pdoors.length && typeof HTMLDialogElement !== 'undefined') {
    pdoors.forEach(function (a) {
      a.addEventListener('click', function (ev) {
        var sec = document.getElementById(a.getAttribute('data-power-door'));
        if (!sec) return;
        ev.preventDefault();
        var dlg2 = document.createElement('dialog');
        dlg2.className = 'stage-dialog power-dialog';
        var tid = 'pd-t-' + sec.id;
        dlg2.setAttribute('aria-labelledby', tid);
        dlg2.innerHTML = '<div class="sd-head"><h3 class="sd-title" id="' + tid + '"></h3>' +
          '<button type="button" class="sd-close">關閉</button></div><div class="sd-body"></div>';
        $('.sd-title', dlg2).textContent = a.getAttribute('data-title') || '';
        var holder = document.createComment('power-holder');
        sec.parentNode.insertBefore(holder, sec);
        $('.sd-body', dlg2).appendChild(sec);
        /* 搬進彈窗後捲動觸發不會再發生：先把此區所有進場動畫收尾（強制顯示、移除觸發器），內容才會完整可見 */
        if (window.gsap) {
          if (window.ScrollTrigger) window.ScrollTrigger.getAll().forEach(function (st) { if (st.trigger && sec.contains(st.trigger)) st.kill(); });
          var all = $all('*', sec); all.push(sec);
          window.gsap.killTweensOf(all);
          all.forEach(function (el) {
            if (el.style && (el.style.opacity !== '' || el.style.transform || el.style.filter || el.style.clipPath)) { el.style.opacity = ''; el.style.transform = ''; el.style.filter = ''; el.style.clipPath = ''; }
          });
          $all('img[loading="lazy"]', sec).forEach(function (im) { im.loading = 'eager'; });
        }
        document.body.appendChild(dlg2);
        $('.sd-close', dlg2).addEventListener('click', function () { dlg2.close(); });
        var restored2 = false;
        var restore2 = function () {
          if (restored2) return;
          restored2 = true;
          holder.parentNode.insertBefore(sec, holder);
          holder.parentNode.removeChild(holder);
          if (dlg2.parentNode) dlg2.parentNode.removeChild(dlg2);
          if (a.offsetParent !== null) a.focus();
        };
        dlg2.__restore = restore2;
        dlg2.addEventListener('close', restore2);
        dlg2.showModal();
      });
    });
    var closePowerLayers = function () {
      window.__hssBulkClose = true;
      var lb = document.querySelector('[data-lightbox-dialog][open]'); if (lb) lb.close();
      var d = document.querySelector('dialog.power-dialog[open]'); if (d) { d.close(); if (d.__restore) d.__restore(); }
      window.setTimeout(function () { window.__hssBulkClose = false; }, 100);
    };
    window.addEventListener('popstate', closePowerLayers);
    window.addEventListener('beforeprint', closePowerLayers); /* 列印前搬回內容，避免被隱藏的彈窗帶走 */
  }

  /* ---------- 首頁展場照片輪播 ---------- */
  var car = $('[data-carousel]');
  if (car) {
    var track = $('[data-track]', car);
    var slides = $all('[data-slide]', car);
    var count = $('[data-count]', car);
    var pauseBtn = $('[data-pause]', car);
    var pos = 0, timer = null, paused = reduce;

    function goSlide(i, smooth) {
      pos = (i + slides.length) % slides.length;
      var s = slides[pos];
      track.scrollTo({ left: s.offsetLeft - (track.clientWidth - s.clientWidth) / 2, behavior: smooth && !reduce ? 'smooth' : 'auto' });
      if (count) count.textContent = (pos + 1) + ' / ' + slides.length;
    }
    function play() {
      clearInterval(timer);
      if (!paused && slides.length > 1) timer = setInterval(function () { goSlide(pos + 1, true); }, 5000);
    }
    $('[data-prev]', car).addEventListener('click', function () { goSlide(pos - 1, true); play(); });
    $('[data-next]', car).addEventListener('click', function () { goSlide(pos + 1, true); play(); });
    if (pauseBtn) {
      pauseBtn.textContent = paused ? 'PLAY' : 'PAUSE';
      pauseBtn.addEventListener('click', function () {
        paused = !paused;
        pauseBtn.textContent = paused ? 'PLAY' : 'PAUSE';
        pauseBtn.setAttribute('aria-label', paused ? '開始自動播放' : '暫停自動播放');
        play();
      });
    }
    var scrollT = null;
    track.addEventListener('scroll', function () {
      clearTimeout(scrollT);
      scrollT = setTimeout(function () {
        var c = track.scrollLeft + track.clientWidth / 2, best = 0, bd = Infinity;
        slides.forEach(function (s, i) { var d = Math.abs(s.offsetLeft + s.clientWidth / 2 - c); if (d < bd) { bd = d; best = i; } });
        pos = best;
        if (count) count.textContent = (pos + 1) + ' / ' + slides.length;
      }, 120);
    }, { passive: true });
    car.addEventListener('mouseenter', function () { clearInterval(timer); });
    car.addEventListener('mouseleave', play);
    car.addEventListener('focusin', function () { clearInterval(timer); });
    car.addEventListener('focusout', play);
    goSlide(0, false);
    play();
  }

  /* 全部功能綁定完成；boot.js 據此判斷是否保留 .js（未執行到這裡則內容全部展開） */
  root.classList.add('js-ready');
})();
