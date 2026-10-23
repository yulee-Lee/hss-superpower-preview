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

    /* 首頁主視覺：展名由潛影浮現 */
    var heroLines = $all('[data-hero-line]');
    var heroTl = null;
    if (heroLines.length) {
      heroTl = gsap.timeline({ delay: 0.15, paused: true })
        .from(heroLines, { opacity: 0, filter: 'blur(10px) contrast(0.6)', y: 24, duration: 1.1, stagger: 0.18, ease: 'power3.out' })
        .from('.hero-en, .hero-meta', { opacity: 0, y: 16, duration: 0.7, stagger: 0.1, ease: 'power2.out' }, '-=0.6')
        .from('[data-hero-frame]', { opacity: 0, filter: 'grayscale(1) brightness(1.4)', y: 28, duration: 0.8, stagger: 0.12, ease: 'power3.out' }, '-=0.5');
    }

    /* 文字段落：逐段進場 */
    gsap.set('[data-reveal]', { opacity: 0, y: 24 });

    /* 進場動畫等網頁字型就緒再開始（最多等 800ms），避免字型替換與位移動畫疊加造成版面跳動 */
    var entranceStarted = false;
    var startEntrance = function () {
      if (entranceStarted) return;
      entranceStarted = true;
      if (heroTl) heroTl.play();
      window.ScrollTrigger.batch('[data-reveal]', {
        start: 'top 92%',
        once: true,
        onEnter: function (els) {
          gsap.to(els, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out', overwrite: true });
        }
      });
      window.ScrollTrigger.refresh();
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
          filter: 'grayscale(0) contrast(1) brightness(1)', clipPath: 'inset(0 0% 0 0)', duration: 1.1, ease: 'power2.out',
          scrollTrigger: { trigger: fig, start: 'top 88%', once: true },
          onComplete: function () { img.style.filter = ''; img.style.clipPath = ''; }
        });
    });

    /* 超能力大字：由描邊沖成實色 */
    $all('[data-develop-text]').forEach(function (el) {
      gsap.fromTo(el, { color: '#c8b6df', filter: 'blur(6px)' },
        { color: '#46296f', filter: 'blur(0px)', duration: 1.1, ease: 'power2.out', clearProps: 'filter',
          scrollTrigger: { trigger: el, start: 'top 80%', once: true } });
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

  /* ---------- 內頁 3–9：關卡頁籤與選項 ---------- */
  var game = $('[data-game]');
  if (game) {
    var tabs = $all('[data-tab]', game);
    var stagesWrap = $('.stages', game);
    var stages = $all('[data-stage]', game);
    var seenCount = $('[data-seen-count]', game);
    var seen = (store.get('hss-seen') || '').split(',').filter(Boolean);
    var current = 0;

    function markSeen(n) {
      if (seen.indexOf(String(n)) === -1) { seen.push(String(n)); store.set('hss-seen', seen.join(',')); }
      tabs.forEach(function (t) { t.classList.toggle('is-seen', seen.indexOf(t.getAttribute('data-tab')) !== -1); });
      if (seenCount) seenCount.textContent = String(Math.min(6, seen.length));
    }

    function activate(n, opts) {
      opts = opts || {};
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

    stages.forEach(function (stage) {
      var opts = $all('[data-opt]', stage);
      var resps = $all('[data-resp]', stage);
      var hint = $('[data-hint]', stage);
      opts.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var k = btn.getAttribute('data-opt');
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
        });
      });
    });

    window.addEventListener('popstate', function () { activate(fromHash() || 1, { scroll: false }); });
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
    $all('[data-lightbox]').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        var name = a.getAttribute('data-lightbox');
        group = $all('[data-lightbox="' + name + '"]');
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
      if (opener) opener.focus();
    });
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
