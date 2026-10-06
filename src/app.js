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


  /* mosaic home: every tile is a frame from the work; from far away the tiles form the dot.
     The pointer acts as a soft lens: tiles swell smoothly around it, and when it rests the
     tile settles and a "now playing" card slides up. */
  var hero = doc.querySelector('[data-mosaic]');
  if (hero) {
    var host = hero.querySelector('.mosaic');
    fetch(hero.getAttribute('data-mosaic')).then(function (r) { return r.json(); }).then(function (data) {
      var tiles = data.tiles || [];
      if (!tiles.length) return;
      var rtl = doc.documentElement.dir === 'rtl';
      var cells = [], cols = 0, rows = 0, pitch = 60;
      var px = -1e4, py = -1e4, has = false, touch = false;
      var center = null, settled = false, lastMove = 0, raf = 0, hideT = 0, frameT = 0, overPlayer = false, tapped = null;
      var small = function () { return window.innerWidth < 700; };
      function rnd(seed) { var a = seed; return function () { a = (a * 16807) % 2147483647; return a / 2147483647; }; }

      /* the now-playing card */
      var player = doc.createElement('a');
      player.className = 'm-player';
      player.innerHTML = '<span class="m-thumb"></span><span class="m-meta"><b></b><small></small></span><span class="m-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="m-go" aria-hidden="true">→</span>';
      hero.appendChild(player);
      var pThumb = player.querySelector('.m-thumb'), pTitle = player.querySelector('b'), pSub = player.querySelector('small');
      player.addEventListener('pointerenter', function () { overPlayer = true; clearTimeout(hideT); });
      player.addEventListener('pointerleave', function () { overPlayer = false; if (!touch) release(); });

      function build() {
        host.innerHTML = ''; cells = [];
        var W = hero.clientWidth, H = hero.clientHeight, size = small() ? 38 : 56, gap = 2;
        pitch = size + gap;
        cols = Math.ceil(W / pitch); rows = Math.ceil(H / pitch);
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
          el.innerHTML = '<i></i>';
          el._tile = tile; el._x = x; el._y = y; el._b = b; el._s = 1; el._k = 0; el._z = 0;
          frag.appendChild(el); cells.push(el);
        }
        host.appendChild(frag);
      }

      function showPlayer(c) {
        var t = c._tile;
        pTitle.textContent = t.t; pSub.textContent = t.d || '';
        pThumb.style.backgroundImage = 'url(' + t.s + ')';
        player.setAttribute('href', t.u);
        player.classList.add('on');
        clearInterval(frameT);
        if (t.f && !reduce) {
          var k = 0;
          frameT = setInterval(function () {
            k = (k + 1) % t.f.length;
            c.style.backgroundImage = 'url(' + t.f[k] + ')'; pThumb.style.backgroundImage = 'url(' + t.f[k] + ')';
          }, 700);
        }
      }
      function hidePlayer() { player.classList.remove('on'); clearInterval(frameT); }
      function reset(c) { if (c) c.style.backgroundImage = 'url(' + c._tile.s + ')'; }
      function release() {
        clearTimeout(hideT);
        hideT = setTimeout(function () {
          if (overPlayer) return;
          has = false; reset(center); center = null; settled = false; hidePlayer(); wake();
        }, 650);
      }

      function frame() {
        raf = 0;
        var now = performance.now(), busy = false;
        var fx = px / pitch - 0.5, fy = py / pitch - 0.5;
        var ci = Math.round(fx), cj = Math.round(fy);
        var cc = has && ci >= 0 && cj >= 0 && ci < cols && cj < rows ? cells[cj * cols + ci] : null;
        if (cc !== center) {
          reset(center); center = cc; settled = false; hidePlayer(); clearInterval(frameT);
          if (cc) {
            var ox = cc._x < 2 ? '0%' : cc._x > cols - 3 ? '100%' : '50%', oy = cc._y < 2 ? '0%' : cc._y > rows - 3 ? '100%' : '50%';
            cc.style.transformOrigin = ox + ' ' + oy;
          }
        }
        if (cc && !settled && now - lastMove > 420) { settled = true; showPlayer(cc); }
        var f = reduce ? 1 : 0.13, sig = touch ? 1.5 : 1.35, amp = touch ? 0.6 : 0.5;
        var big = small() ? 2.9 : 3.3, mid = small() ? 1.8 : 1.95;
        for (var i = 0; i < cells.length; i++) {
          var c = cells[i], tS = 1, tK = 0;
          if (has) {
            var dx = c._x - fx, dy = c._y - fy, d2 = dx * dx + dy * dy;
            if (d2 < 30) { var g = Math.exp(-d2 / (2 * sig * sig)); tS = 1 + amp * g; tK = g; }
            if (c === center) { tS = settled ? big : mid; tK = 1; }
          }
          var ds = tS - c._s, dk = tK - c._k;
          if (ds > 0.002 || ds < -0.002 || dk > 0.004 || dk < -0.004) {
            c._s += ds * f; c._k += dk * f; busy = true;
            c.style.transform = c._s > 1.004 ? 'scale(' + c._s.toFixed(3) + ')' : '';
            c.style.setProperty('--k', c._k.toFixed(3));
            var z = c === center ? 6 : (c._s > 1.05 ? 3 : 0);
            if (z !== c._z) { c.style.zIndex = z || ''; c._z = z; }
          }
        }
        if (busy || (has && !settled) || has) raf = requestAnimationFrame(frame);
      }
      function wake() { if (!raf) raf = requestAnimationFrame(frame); }

      function point(e) {
        var r = hero.getBoundingClientRect();
        px = e.clientX - r.left; py = e.clientY - r.top;
      }
      host.addEventListener('pointerenter', function (e) { touch = e.pointerType === 'touch'; clearTimeout(hideT); });
      host.addEventListener('pointermove', function (e) {
        touch = e.pointerType === 'touch'; point(e); has = true; lastMove = performance.now(); clearTimeout(hideT); wake();
      });
      host.addEventListener('pointerdown', function (e) {
        touch = e.pointerType === 'touch'; tapped = center; point(e); has = true; clearTimeout(hideT);
        lastMove = touch ? performance.now() - 1000 : performance.now(); wake();
      });
      host.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') release(); });
      host.addEventListener('click', function (e) {
        if (!center) return;
        if (touch) { if (tapped === center && settled) location.href = center._tile.u; return; }
        location.href = center._tile.u;
      });
      doc.addEventListener('pointerdown', function (e) { if (touch && !hero.contains(e.target)) release(); });

      build(); hero.classList.add('has-mosaic');
      /* idle life: now and then a bright tile settles by itself so the page is never dead */
      if (!reduce) setInterval(function () {
        if (doc.hidden || has) return;
        var pick = null, tries = 0;
        while (tries++ < 40) { var c = cells[Math.floor(Math.random() * cells.length)]; if (c._b > 0.6) { pick = c; break; } }
        if (!pick) return;
        var r = hero.getBoundingClientRect();
        px = (pick._x + 0.5) * pitch; py = (pick._y + 0.5) * pitch; has = true; touch = false; lastMove = performance.now(); wake();
        setTimeout(function () { if (center === pick) { has = false; release(); } }, 3600);
      }, 6500);
      var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { has = false; center = null; hidePlayer(); build(); }, 250); });
    }).catch(function () {});
  }

  /* year in the footer */
  var y = doc.querySelector('[data-year]');
  if (y) y.textContent = new Date().getFullYear();
})();
