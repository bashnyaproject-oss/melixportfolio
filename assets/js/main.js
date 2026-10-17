(function () {
  // Current year in footer
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // Highlight current nav item
  var path = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav-link').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href === path || (href === '/works' && path.indexOf('/projects/') === 0)) a.setAttribute('aria-current', 'page');
  });

  // Card videos: first frame loads right away (preload=metadata), play only while visible
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var vids = document.querySelectorAll('.card-media video');
  vids.forEach(function (v) {
    var box = v.parentElement;
    var done = function () { box.classList.add('loaded'); };
    if (v.readyState >= 2) done();
    v.addEventListener('loadeddata', done);
  });
  document.querySelectorAll('.card-media img').forEach(function (img) {
    var done = function () { img.parentElement.classList.add('loaded'); };
    if (img.complete) done(); else { img.addEventListener('load', done); img.addEventListener('error', done); }
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) {
          if (!reduce) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { rootMargin: '300px 300px' });
    vids.forEach(function (v) { io.observe(v); });
  }

  // Entrance on scroll: only elements below the first screen, so the page is complete without JS
  if (!reduce && 'IntersectionObserver' in window) {
    var sel = '.sec-head, .big, .mid, .intro, .stat, .process li, .fig, .exp, .card, .co, .faq, .do, .case-block, .gallery figure, .next, .footer-inner > *';
    var els = Array.prototype.slice.call(document.querySelectorAll(sel));
    document.documentElement.classList.add('js-anim');
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('revealed'); ro.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight) {
        var sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
        el.style.setProperty('--d', Math.min(sib, 5) * 0.07 + 's');
        el.classList.add('will-reveal');
        ro.observe(el);
      }
    });
    // Safety net: never leave content hidden if the observer doesn't fire
    var revealAll = function () { els.forEach(function (el) { el.classList.add('revealed'); }); };
    setTimeout(function () {
      window.addEventListener('scroll', function onS() {
        window.removeEventListener('scroll', onS);
        setTimeout(revealAll, 1500);
      }, { passive: true });
    }, 0);
    setTimeout(revealAll, 6000);
  }

  // Count-up numbers
  var nums = document.querySelectorAll('[data-count]');
  if (!reduce && 'IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        co.unobserve(en.target);
        var el = en.target, raw = el.getAttribute('data-count');
        var n = parseInt(raw, 10), suffix = raw.replace(/^\d+/, ''), t0 = null;
        var tick = function (ts) {
          if (!t0) t0 = ts;
          var k = Math.min(1, (ts - t0) / 1400), e = 1 - Math.pow(1 - k, 3);
          el.textContent = Math.round(n * e) + suffix;
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    nums.forEach(function (el) { co.observe(el); });
  }

  // Expertise slider buttons
  var slider = document.querySelector('[data-slider]');
  if (slider) {
    var step = function () { var c = slider.querySelector('.exp'); return c ? c.getBoundingClientRect().width + 20 : 400; };
    var prev = document.querySelector('[data-prev]');
    var next = document.querySelector('[data-next]');
    if (prev) prev.addEventListener('click', function () { slider.scrollBy({ left: -step(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { slider.scrollBy({ left: step(), behavior: 'smooth' }); });
  }

  // Case pages: draft mode shows empty slots as hints (localhost or ?draft)
  var draft = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || new URLSearchParams(location.search).has('draft');
  if (draft) document.documentElement.classList.add('draft');

  // Gallery: hide images that are not uploaded yet
  document.querySelectorAll('.gallery figure').forEach(function (fig) {
    var img = fig.querySelector('img');
    if (!img) return;
    var mark = function () {
      fig.classList.add('missing');
      fig.setAttribute('data-file', img.getAttribute('src'));
    };
    if (img.complete && img.naturalWidth === 0) mark();
    img.addEventListener('error', mark);
  });
})();

// Comic reader: page counter + full-size viewer
(function () {
  var pages = Array.prototype.slice.call(document.querySelectorAll('.comic-page'));
  if (!pages.length) return;
  var prog = document.querySelector('.comic-progress');
  var cur = prog && prog.querySelector('[data-cur]');
  var section = document.querySelector('.comic-pages');
  var update = function () {
    var mid = window.innerHeight * 0.5, n = 0;
    for (var i = 0; i < pages.length; i++) { if (pages[i].getBoundingClientRect().top < mid) n = i + 1; }
    var r = section.getBoundingClientRect();
    var inView = r.top < window.innerHeight * 0.6 && r.bottom > window.innerHeight * 0.4;
    if (prog) prog.classList.toggle('on', inView);
    if (cur && n) cur.textContent = n;
  };
  window.addEventListener('scroll', update, { passive: true });
  update();

  var lb = document.querySelector('.lightbox');
  if (!lb) return;
  var img = lb.querySelector('img'), count = lb.querySelector('.lb-count'), scroller = lb.querySelector('.lb-scroll');
  var idx = 1, lastFocus = null;
  var show = function (n) {
    idx = Math.max(1, Math.min(pages.length, n));
    var src = pages[idx - 1].querySelector('img');
    img.src = src.currentSrc || src.src; img.alt = src.alt;
    count.textContent = idx + ' / ' + pages.length;
    scroller.scrollTop = 0;
  };
  var open = function (n) { lastFocus = document.activeElement; show(n); lb.hidden = false; document.body.style.overflow = 'hidden'; lb.querySelector('.lb-close').focus(); };
  var close = function () {
    lb.hidden = true; document.body.style.overflow = '';
    var target = pages[idx - 1]; if (target) target.scrollIntoView({ block: 'start' });
    if (lastFocus) lastFocus.focus();
  };
  document.querySelectorAll('.comic-open').forEach(function (b) {
    b.addEventListener('click', function () { open(parseInt(b.getAttribute('data-page'), 10)); });
  });
  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', function () { show(idx - 1); });
  lb.querySelector('.lb-next').addEventListener('click', function () { show(idx + 1); });
  lb.addEventListener('click', function (ev) { if (ev.target === lb) close(); });
  document.addEventListener('keydown', function (ev) {
    if (lb.hidden) return;
    if (ev.key === 'Escape') close();
    else if (ev.key === 'ArrowRight') show(idx + 1);
    else if (ev.key === 'ArrowLeft') show(idx - 1);
  });
  var x0 = null;
  lb.addEventListener('touchstart', function (ev) { x0 = ev.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (ev) {
    if (x0 === null) return; var dx = ev.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 60) show(idx + (dx < 0 ? 1 : -1));
  });
})();

// Hero: gentle 3D parallax on the phone wall
(function () {
  var hero = document.querySelector('.hero'), tilt = document.querySelector('.hero-wall');
  if (!hero || !tilt || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover)').matches) return;
  hero.addEventListener('pointermove', function (ev) {
    var r = hero.getBoundingClientRect();
    var x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
    tilt.style.setProperty('--rx', (x * 8).toFixed(2) + 'deg');
    tilt.style.setProperty('--ry', (-y * 6).toFixed(2) + 'deg');
  });
  hero.addEventListener('pointerleave', function () { tilt.style.setProperty('--rx', '0deg'); tilt.style.setProperty('--ry', '0deg'); });
})();
