/* Blue Yolk: small, dependency-free behaviour.
   Everything here is progressive enhancement: the site reads and navigates without it.
   The brand rule is stillness by default, so there is no cursor effect, page transition or moving logo. */
(function () {
  'use strict';
  var doc = document;

  /* mobile menu */
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

  /* filters (work and journal) */
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

  /* gentle reveal on scroll */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals = doc.querySelectorAll('.reveal-in');
  if (reveals.length && 'IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('seen'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(reveals, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('seen'); });
  }


  /* mosaic home: every tile is a frame from the work; from far away the tiles form the dot */
  var hero = doc.querySelector('[data-mosaic]');
  if (hero) {
    var host = hero.querySelector('.mosaic');
    fetch(hero.getAttribute('data-mosaic')).then(function (r) { return r.json(); }).then(function (data) {
      var tiles = data.tiles || [];
      if (!tiles.length) return;
      var rtl = doc.documentElement.dir === 'rtl';
      var cells = [], cols = 0, rows = 0, active = null, last = null, cap = null;
      var small = function () { return window.innerWidth < 700; };
      function rnd(seed) { var a = seed; return function () { a = (a * 16807) % 2147483647; return a / 2147483647; }; }
      function build() {
        host.innerHTML = ''; cells = [];
        var W = hero.clientWidth, H = hero.clientHeight, size = small() ? 38 : 56, gap = 2;
        cols = Math.ceil(W / (size + gap)); rows = Math.ceil(H / (size + gap));
        host.style.gridTemplateColumns = 'repeat(' + cols + ',' + size + 'px)';
        host.style.gridTemplateRows = 'repeat(' + rows + ',' + size + 'px)';
        var cx = cols * (small() ? 0.5 : (rtl ? 0.38 : 0.62)), cy = rows * (small() ? 0.42 : 0.5);
        var rr = Math.min(cols, rows) * (small() ? 0.62 : 0.46);
        var r = rnd(7), order = [], i;
        for (i = 0; i < tiles.length; i++) order.push(i);
        for (i = order.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
        var frag = doc.createDocumentFragment(), n = 0;
        for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
          var d = Math.hypot((x + 0.5 - cx) / rr, (y + 0.5 - cy) / (rr * 0.99));
          var b = d < 1 ? 0.7 + 0.3 * (1 - d * d) : Math.max(0.02, 0.1 * Math.exp(-(d - 1) * 5));
          b = Math.min(1, Math.max(0, b + (r() - 0.5) * 0.1));
          var tile = tiles[order[n++ % order.length]];
          var el = doc.createElement('div');
          el.className = 'm-cell'; el.style.backgroundImage = 'url(' + tile.s + ')';
          el.style.setProperty('--o', (1 - b).toFixed(2));
          el.innerHTML = '<i></i>'; el._tile = tile; el._x = x; el._y = y; el._b = b;
          frag.appendChild(el); cells.push(el);
        }
        host.appendChild(frag);
        if (!cap) { cap = doc.createElement('div'); cap.className = 'm-cap'; hero.appendChild(cap); }
      }
      var timer = null;
      function frames(el) {
        clearInterval(timer);
        var f = el._tile.f; if (!f) return; var k = 0;
        timer = setInterval(function () { k = (k + 1) % f.length; el.style.backgroundImage = 'url(' + f[k] + ')'; }, 450);
      }
      function setActive(el) {
        if (el === active) return;
        if (active) { active.classList.remove('is-active'); active.style.backgroundImage = 'url(' + active._tile.s + ')'; clearInterval(timer); }
        cells.forEach(function (c) { if (c.classList.contains('is-near')) c.classList.remove('is-near'); });
        active = el;
        if (!el) { cap.classList.remove('on'); return; }
        // keep the lifted tile fully on screen: nudge its origin toward the middle at the edges
        var ox = el._x < 2 ? '0%' : el._x > cols - 3 ? '100%' : '50%', oy = el._y < 2 ? '0%' : el._y > rows - 3 ? '100%' : '50%';
        el.style.transformOrigin = ox + ' ' + oy;
        el.classList.add('is-active'); frames(el);
        cells.forEach(function (c) { if (Math.abs(c._x - el._x) < 3 && Math.abs(c._y - el._y) < 3) c.classList.add('is-near'); });
        cap.innerHTML = '<a href="' + el._tile.u + '">' + el._tile.t.replace(/</g, '&lt;') + ' →</a>';
        cap.classList.add('on');
      }
      function cellAt(e) {
        var el = doc.elementFromPoint(e.clientX, e.clientY);
        return el && el.closest ? el.closest('.m-cell') : null;
      }
      host.addEventListener('pointermove', function (e) { var c = cellAt(e); if (c) setActive(c); });
      host.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') setActive(null); });
      host.addEventListener('click', function (e) {
        var c = cellAt(e); if (!c) return;
        if (e.pointerType === 'touch' || window.matchMedia('(hover: none)').matches) {
          if (c === active && last === c) { location.href = c._tile.u; return; }
          setActive(c); last = c; return;
        }
        location.href = c._tile.u;
      });
      host.parentNode.addEventListener('keydown', function () {});
      build(); hero.classList.add('has-mosaic');
      host.removeAttribute('aria-hidden');
      // idle life: a tile lifts now and then when nobody is touching it
      if (!reduce) setInterval(function () {
        if (doc.hidden || host.matches(':hover')) return;
        var c = cells[Math.floor(Math.random() * cells.length)];
        if (c && c._b > 0.5) { setActive(c); setTimeout(function () { if (active === c && !host.matches(':hover')) setActive(null); }, 2600); }
      }, 4200);
      var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { setActive(null); build(); }, 250); });
    }).catch(function () {});
  }

  /* year in the footer */
  var y = doc.querySelector('[data-year]');
  if (y) y.textContent = new Date().getFullYear();
})();
