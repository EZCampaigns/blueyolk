/* Blue Yolk — small, dependency-free behaviour.
   Everything here is progressive enhancement: the site reads and navigates without it. */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function store(key, val) {
    try { if (val === undefined) return sessionStorage.getItem(key); sessionStorage.setItem(key, val); } catch (e) { /* ignore */ }
    return null;
  }

  /* ---------- living blob ---------- */
  function smooth(p) {
    var n = p.length, d = 'M' + p[0][0].toFixed(2) + ' ' + p[0][1].toFixed(2);
    for (var i = 0; i < n; i++) {
      var p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
      d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(2) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(2) + ' ' +
        (p2[0] - (p3[0] - p1[0]) / 6).toFixed(2) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(2) + ' ' +
        p2[0].toFixed(2) + ' ' + p2[1].toFixed(2);
    }
    return d + 'Z';
  }

  function liveBlob(svg) {
    var path = svg.querySelector('.blob-path');
    var raw = svg.getAttribute('data-pts');
    if (!path || !raw || reduce) return;
    var all;
    try { all = JSON.parse(raw); } catch (e) { return; }
    var base = all.filter(function (_, i) { return i % 2 === 0; }); // 24 points is plenty
    var cx = 100, cy = 100;
    var amp = parseFloat(svg.getAttribute('data-amp') || '3.2');
    var seeds = base.map(function (_, i) { return { s: 0.35 + ((i * 37) % 17) / 22, ph: i * 1.7 }; });
    var visible = true, last = 0;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(svg);
    }
    function frame(t) {
      requestAnimationFrame(frame);
      if (!visible || t - last < 33) return;
      last = t;
      var time = t / 1000, pts = [];
      for (var i = 0; i < base.length; i++) {
        var dx = base[i][0] - cx, dy = base[i][1] - cy;
        var k = 1 + (amp / 80) * Math.sin(time * seeds[i].s + seeds[i].ph) +
          (amp / 160) * Math.sin(time * seeds[i].s * 2.3 + seeds[i].ph * 0.6);
        pts.push([cx + dx * k, cy + dy * k]);
      }
      path.setAttribute('d', smooth(pts));
    }
    requestAnimationFrame(frame);
  }
  Array.prototype.forEach.call(doc.querySelectorAll('svg[data-blob]'), liveBlob);

  /* ---------- pointer parallax on the hero blob ---------- */
  var stage = doc.querySelector('.hero-stage');
  if (stage && fine && !reduce) {
    var tx = 0, ty = 0, cx2 = 0, cy2 = 0;
    window.addEventListener('pointermove', function (e) {
      tx = (e.clientX / window.innerWidth - 0.5) * 28;
      ty = (e.clientY / window.innerHeight - 0.5) * 28;
    }, { passive: true });
    (function loop() {
      cx2 += (tx - cx2) * 0.06; cy2 += (ty - cy2) * 0.06;
      stage.style.transform = 'translate(' + cx2.toFixed(2) + 'px,' + cy2.toFixed(2) + 'px)';
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- cursor ---------- */
  var cur = doc.querySelector('.cursor');
  if (cur && fine && !reduce) {
    var mx = -100, my = -100, x = -100, y = -100;
    window.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; cur.classList.add('on'); }, { passive: true });
    doc.addEventListener('pointerleave', function () { cur.classList.remove('on'); });
    doc.addEventListener('pointerover', function (e) {
      cur.classList.toggle('big', !!(e.target.closest && e.target.closest('a, button, .card')));
    });
    (function loop() {
      x += (mx - x) * 0.22; y += (my - y) * 0.22;
      cur.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- page transition: the blob grows to fill the screen ---------- */
  var veil = doc.querySelector('.veil');
  if (veil && !reduce) {
    if (store('by-veil') === '1') {
      store('by-veil', '0');
      veil.style.setProperty('--x', store('by-x') || '50%');
      veil.style.setProperty('--y', store('by-y') || '50%');
      veil.classList.add('start-covered');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          veil.classList.remove('start-covered');
          veil.classList.add('reveal');
        });
      });
    }
    doc.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      var u = new URL(a.href, location.href);
      if (u.origin !== location.origin || (u.pathname === location.pathname && u.hash)) return;
      if (/\.(xml|txt|pdf|png|jpg|svg|zip)$/i.test(u.pathname)) return;
      e.preventDefault();
      veil.style.setProperty('--x', e.clientX + 'px');
      veil.style.setProperty('--y', e.clientY + 'px');
      store('by-veil', '1'); store('by-x', e.clientX + 'px'); store('by-y', e.clientY + 'px');
      veil.classList.remove('reveal');
      veil.classList.add('cover');
      setTimeout(function () { location.href = a.href; }, 560);
    });
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) { veil.className = 'veil'; }
    });
  }

  /* ---------- mobile menu ---------- */
  var btn = doc.querySelector('.menu-btn');
  if (btn) {
    btn.addEventListener('click', function () {
      var open = doc.body.classList.toggle('menu-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? btn.getAttribute('data-close') : btn.getAttribute('data-open');
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && doc.body.classList.contains('menu-open')) btn.click();
    });
  }

  /* ---------- filters (work and journal) ---------- */
  Array.prototype.forEach.call(doc.querySelectorAll('[data-filters]'), function (bar) {
    var items = Array.prototype.slice.call(doc.querySelectorAll(bar.getAttribute('data-filters')));
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-filter]');
      if (!b) return;
      var f = b.getAttribute('data-filter');
      Array.prototype.forEach.call(bar.querySelectorAll('button'), function (x) {
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      });
      items.forEach(function (it) {
        it.classList.toggle('is-hidden', f !== 'all' && it.getAttribute('data-cat') !== f);
      });
    });
  });

  /* ---------- gentle reveal on scroll ---------- */
  var reveals = doc.querySelectorAll('.reveal-in');
  if (reveals.length && 'IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('seen'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(reveals, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('seen'); });
  }

  /* year in the footer */
  var y2 = doc.querySelector('[data-year]');
  if (y2) y2.textContent = new Date().getFullYear();
})();
