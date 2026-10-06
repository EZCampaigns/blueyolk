/* Blue Yolk: small, dependency-free behaviour.
   Everything here is progressive enhancement: the site reads and navigates without it.
   Motion follows the brand: only scale, position and opacity, one dot at a time, and nothing moves with reduced motion on. */
(function () {
  'use strict';
  var doc = document;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || {};
  var lite = !!(conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''));
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };

  /* mobile menu */
  var btn = $('.menu-btn');
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

  /* journal filters */
  $$('[data-filters]').forEach(function (bar) {
    var items = $$(bar.getAttribute('data-filters'));
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-filter]');
      if (!b) return;
      var f = b.getAttribute('data-filter');
      $$('button', bar).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      items.forEach(function (it) { it.classList.toggle('is-hidden', f !== 'all' && it.getAttribute('data-cat') !== f); });
    });
  });

  /* category page: year filter */
  var yBar = $('[data-year-filter]');
  if (yBar) {
    var rows = $$('[data-rows] .x-row'), cnt = $('[data-count]'), empty = $('[data-empty]');
    var one = cnt && cnt.getAttribute('data-one'), many = cnt && cnt.getAttribute('data-many');
    yBar.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-y]');
      if (!b) return;
      var y = b.getAttribute('data-y'), n = 0;
      $$('button', yBar).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      rows.forEach(function (r) {
        var show = y === 'all' || r.getAttribute('data-yr') === y;
        r.classList.toggle('is-hidden', !show);
        if (show) n++;
      });
      if (cnt) cnt.textContent = n === 1 ? one : many.replace('{n}', n);
      if (empty) empty.hidden = n > 0;
    });
  }

  /* gentle reveal on scroll */
  var reveals = $$('.reveal-in');
  if (reveals.length && 'IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('seen'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('seen'); });
  }

  /* contact: copy the address */
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var label = b.textContent;
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(b.getAttribute('data-copy')).then(function () {
        b.textContent = b.getAttribute('data-copied');
        setTimeout(function () { b.textContent = label; }, 1800);
      }, function () {});
    });
  });

  /* year in the footer */
  var y = $('[data-footer-year]');
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- landing: press the yolk and move it ---------- */
  var L = $('.landing');
  if (L) {
    var yolk = $('.l-yolk', L), label = $('.l-label', L), hint = $('.l-hint', L);
    var names = { r: L.getAttribute('data-n-r'), t: L.getAttribute('data-n-t'), l: L.getAttribute('data-n-l'), b: L.getAttribute('data-n-b') };
    var tx = 0, ty = 0, drag = false, armed = false, cur = null, sx = 0, sy = 0, TH = 84, LIM = 170;
    var pos = function () { yolk.style.transform = 'translate(' + tx + 'px,' + ty + 'px)'; };
    var dirOf = function (x, yy) {
      if (Math.hypot(x, yy) < TH * 0.5) return null;
      return Math.abs(x) > Math.abs(yy) ? (x > 0 ? 'r' : 'l') : (yy > 0 ? 'b' : 't');
    };
    var wobble = function () {
      if (reduce) return;
      yolk.classList.remove('swell', 'wob');
      void yolk.offsetWidth;
      yolk.classList.add('wob');
    };
    yolk.addEventListener('animationend', function (e) {
      if (e.animationName === 'y-settle') { yolk.classList.remove('in'); yolk.classList.add('swell'); }
      if (e.animationName === 'y-wobble') { yolk.classList.remove('wob'); if (!drag) yolk.classList.add('swell'); }
    });
    var go = function (d) {
      var url = L.getAttribute('data-' + d);
      if (!url) return;
      label.classList.remove('on');
      L.classList.add('leaving');
      setTimeout(function () { location.href = url; }, reduce ? 0 : 380);
    };
    yolk.addEventListener('pointerdown', function (e) {
      drag = true; armed = false;
      try { yolk.setPointerCapture(e.pointerId); } catch (_) {}
      yolk.classList.remove('back', 'swell', 'in');
      sx = e.clientX - tx; sy = e.clientY - ty;
      yolk.style.cursor = 'grabbing';
    });
    yolk.addEventListener('pointermove', function (e) {
      if (!drag) return;
      tx = e.clientX - sx; ty = e.clientY - sy;
      var m = Math.hypot(tx, ty);
      if (m > LIM) { tx *= LIM / m; ty *= LIM / m; m = LIM; }
      pos();
      var c = dirOf(tx, ty), over = m > TH && c;
      if (over && !armed) { armed = true; wobble(); }
      if (!over) armed = false;
      if (over) {
        var o = { r: [64, 0], l: [-64, 0], t: [0, -64], b: [0, 64] }[c];
        label.textContent = names[c];
        var half = L.clientWidth / 2, lx2 = Math.max(-half + 52, Math.min(half - 52, tx + o[0]));
        label.style.left = 'calc(50% + ' + lx2 + 'px)';
        label.style.top = (ty + o[1]) + 'px';
        label.classList.add('on');
      } else { label.classList.remove('on'); }
      cur = c;
      hint.style.opacity = m > 8 ? 0 : 1;
    });
    var release = function () {
      if (!drag) return;
      drag = false; yolk.style.cursor = '';
      var c = dirOf(tx, ty);
      if (c && Math.hypot(tx, ty) > TH) { go(c); return; }
      yolk.classList.add('back');
      tx = ty = 0; pos();
      label.classList.remove('on'); hint.style.opacity = 1;
      setTimeout(function () { yolk.classList.remove('back'); if (!yolk.classList.contains('wob')) yolk.classList.add('swell'); }, 400);
    };
    yolk.addEventListener('pointerup', release);
    yolk.addEventListener('pointercancel', release);
    yolk.addEventListener('keydown', function (e) {
      var d = { ArrowRight: 'r', ArrowLeft: 'l', ArrowUp: 't', ArrowDown: 'b' }[e.key];
      if (d) { e.preventDefault(); go(d); }
    });
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      L.classList.remove('leaving'); tx = ty = 0; pos(); label.classList.remove('on'); hint.style.opacity = 1;
      yolk.classList.add('swell');
    });
  }

  /* ---------- project page: the reel ---------- */
  var reel = $('#reel');
  if (reel) {
    var count = $('[data-reel-count]'), frames = $$('.r-frame', reel);
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var step = function () { var f = frames[0]; return f ? f.getBoundingClientRect().width + 10 : 300; };
    reel.addEventListener('scroll', function () {
      var i = Math.max(0, Math.min(frames.length - 1, Math.round(Math.abs(reel.scrollLeft) / step())));
      if (count) count.textContent = pad(i + 1) + ' / ' + pad(frames.length);
    }, { passive: true });
    $$('.reel-nav button').forEach(function (b) {
      b.addEventListener('click', function () {
        var dir = b.getAttribute('data-r') === 'next' ? 1 : -1;
        if (doc.documentElement.dir === 'rtl') dir = -dir;
        reel.scrollBy({ left: dir * step(), behavior: reduce ? 'auto' : 'smooth' });
      });
    });
  }


  /* ---------- project page: the film theatre (the yolk opens) ---------- */
  var watchBtn = $('[data-watch]');
  if (watchBtn) {
    var th = null, timers = [], opener = null, sdkTried = false;
    var later = function (ms, f) { timers.push(setTimeout(f, ms)); };
    var build = function () {
      var d = doc.createElement('div');
      d.className = 'theatre'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
      d.setAttribute('aria-label', watchBtn.getAttribute('data-title'));
      d.innerHTML = '<div class="th-stage"><div class="th-frame"></div></div>' +
        '<div class="th-dot" aria-hidden="true"></div>' +
        '<div class="th-info"><p class="th-title"></p><p class="th-meta mono caps"></p><p class="th-status mono caps"></p></div>' +
        '<p class="th-now mono caps" hidden><i aria-hidden="true"></i><span></span></p>' +
        '<button type="button" class="th-x"></button>';
      d.querySelector('.th-title').textContent = watchBtn.getAttribute('data-title');
      d.querySelector('.th-meta').textContent = watchBtn.getAttribute('data-meta') || '';
      d.querySelector('.th-status').textContent = watchBtn.getAttribute('data-starting');
      d.querySelector('.th-now span').textContent = watchBtn.getAttribute('data-now');
      var x = d.querySelector('.th-x'); x.textContent = '✕'; x.setAttribute('aria-label', watchBtn.getAttribute('data-close'));
      d.style.setProperty('--ratio', watchBtn.getAttribute('data-ratio') || '1.7778');
      doc.body.appendChild(d);
      x.addEventListener('click', closeTheatre);
      return d;
    };
    var closeTheatre = function () {
      if (!th) return;
      timers.forEach(clearTimeout); timers = [];
      th.remove(); th = null;
      doc.documentElement.classList.remove('th-lock');
      doc.removeEventListener('keydown', onKey);
      if (opener) opener.focus();
    };
    var onKey = function (e) {
      if (e.key === 'Escape') closeTheatre();
      if (e.key === 'Tab' && th) { e.preventDefault(); th.querySelector('.th-x').focus(); }
    };
    var openTheatre = function (e) {
      e.preventDefault();
      if (th) return;
      opener = watchBtn;
      th = build();
      var cur = th, t0 = Date.now(), revealed = false;
      doc.documentElement.classList.add('th-lock');
      doc.addEventListener('keydown', onKey);
      cur.querySelector('.th-x').focus();
      var frame = document.createElement('iframe');
      frame.title = watchBtn.getAttribute('data-title');
      frame.allow = 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;';
      frame.setAttribute('allowfullscreen', '');
      cur.querySelector('.th-frame').appendChild(frame);
      var reveal = function () {
        if (revealed || th !== cur) return;
        revealed = true;
        var dot = cur.querySelector('.th-dot');
        dot.classList.add('go');
        cur.querySelector('.th-info').classList.add('out');
        later(reduce ? 0 : 560, function () { cur.classList.add('open'); });
        later(reduce ? 0 : 1000, function () { dot.classList.add('gone'); });
        later(1300, function () { try { hookPlayer(cur, frame); } catch (er) {} });
      };
      frame.addEventListener('load', function () {
        later(Math.max(0, 2300 - (Date.now() - t0)), reveal);
      });
      later(12000, reveal);
      frame.src = watchBtn.getAttribute('data-src');
    };
    /* "Now playing" chip, only if Stream's player SDK is reachable */
    var hookPlayer = function (cur, frame) {
      var chip = cur.querySelector('.th-now');
      var attach = function () {
        if (!window.Stream || th !== cur) return;
        var p = window.Stream(frame);
        p.addEventListener('playing', function () { chip.hidden = false; });
        p.addEventListener('pause', function () { chip.hidden = true; });
        p.addEventListener('ended', function () { chip.hidden = true; });
      };
      if (window.Stream) return attach();
      if (sdkTried) return;
      sdkTried = true;
      var s = doc.createElement('script');
      s.src = 'https://embed.cloudflarestream.com/embed/sdk.latest.js';
      s.onload = attach;
      doc.head.appendChild(s);
    };
    watchBtn.addEventListener('click', openTheatre);
  }

  /* ---------- stills: the contact sheet ---------- */
  var big = $('#s-big');
  if (big) {
    var links = $$('#sheet a'), edge = $('#edge-cur'), altBase = $('.stills').getAttribute('data-alt');
    links.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var i = Number(a.getAttribute('data-i'));
        big.src = a.getAttribute('href');
        big.alt = altBase + ' (' + (i + 1) + '/' + links.length + ')';
        links.forEach(function (x) { x.removeAttribute('aria-current'); });
        a.setAttribute('aria-current', 'true');
        if (edge) edge.textContent = '▸ ' + (i < 9 ? '0' : '') + (i + 1) + 'A';
        if (window.scrollY > 240) big.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      });
    });
  }

  /* ---------- index: the frame follows the category ---------- */
  var catImg = $('#cat-frame-img');
  if (catImg) {
    var swap = function (a) {
      var f = a.getAttribute('data-frame');
      $$('.cat-list a').forEach(function (x) { x.classList.toggle('on', x === a); });
      if (f) catImg.src = f;
    };
    $$('.cat-list a').forEach(function (a) {
      a.addEventListener('pointerenter', function () { swap(a); });
      a.addEventListener('focus', function () { swap(a); });
    });
  }

  /* ---------- work: the museum map ---------- */
  var museum = $('#museum');
  var work = $('#work');
  if (museum && work) {
    var started = false;
    var setView = function (v) {
      work.setAttribute('data-view', v);
      $$('.view-toggle button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-view') === v ? 'true' : 'false'); });
      if (v === 'map') startMap();
      window.scrollTo(0, 0);
    };
    $$('.view-toggle button').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-view');
        history.replaceState(null, '', v === 'index' ? '#index' : location.pathname);
        setView(v);
      });
    });
    var want = location.hash === '#index' || lite ? 'index' : 'map';
    if (want === 'index') {
      work.setAttribute('data-view', 'index');
      $$('.view-toggle button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-view') === 'index' ? 'true' : 'false'); });
    } else startMap();
  }

  function startMap() {
    if (started || !museum) return;
    started = true;
    var cv = $('.m-canvas', museum), ctx = cv.getContext('2d');
    var card = $('.m-card', museum), thumb = $('.m-thumb', museum), tctx = thumb.getContext('2d');
    var cardName = $('b', card), cardSub = $('small', card);
    var world = null, G = null, img = new Image(), offscreen = null;
    var scale = 0.3, tScale = 0.3, ox = 0, oy = 0, W = 0, H = 0, dpr = 1, mx = 0, my = 0, mdrag = false, lx = 0, ly = 0, raf = 0, zraf = 0, cellKey = '', ready = false;
    var PYF = 0.46, MIN = 0.26, MAX = 3, MA = null, TI = {};
    var ss = function (a, b, x) { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
    var hash = function (a, b) { var h = a * 374761393 + b * 668265263; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; };
    var vnoise = function (x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      var a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
    Promise.all([
      fetch(museum.getAttribute('data-world')).then(function (r) { return r.json(); }),
      new Promise(function (res, rej) { img.onload = res; img.onerror = rej; img.src = museum.getAttribute('data-atlas'); })
    ]).then(function (r) { G = r[0]; build(); ready = true; resize(); setScale(startScale()); museum.classList.add('ready', 'far'); draw(); }, function () { /* the index still works */ });

    /* the territory: a land with an unclear edge. Each tile fades with a noisy distance; the soft mask is the smoothed result. */
    function build() {
      var C = G.cols, R = G.rows, N = G.cell, S = C * N;
      var m = doc.createElement('canvas'); m.width = C; m.height = R;
      var mc = m.getContext('2d'), id = mc.createImageData(C, R);
      MA = new Float32Array(C * R);
      for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
        var dx = c - (C - 1) / 2, dy = r - (R - 1) / 2, d = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
        /* an irregular coastline: a wobbling radius, never a straight run */
        var R0 = 4.5 + 1.0 * Math.sin(2 * th + 1.1) + 0.7 * Math.sin(3 * th + 0.4) + 0.4 * Math.sin(5 * th + 2.0);
        var nz = (vnoise(c * 0.6 + 3, r * 0.6 + 9) - 0.5) * 1.8;
        var a = 1 - ss(R0 - 1.3, R0 + 0.9, d + nz);
        if (a > 0.02 && a < 0.98) a *= 0.55 + 0.45 * hash(c + 7, r + 3);
        if (r === 0 || c === 0 || r === R - 1 || c === C - 1) a = 0;
        MA[r * C + c] = a;
        var o = (r * C + c) * 4;
        id.data[o] = id.data[o + 1] = id.data[o + 2] = 255; id.data[o + 3] = Math.round(a * 255);
      }
      mc.putImageData(id, 0, 0);
      world = doc.createElement('canvas'); world.width = S; world.height = S;
      var wc = world.getContext('2d'); wc.drawImage(img, 0, 0, S, S);
      wc.globalCompositeOperation = 'destination-in'; wc.imageSmoothingEnabled = true; wc.imageSmoothingQuality = 'high';
      wc.drawImage(m, 0, 0, S, S);
      offscreen = wc;
    }
    /* open close enough that the territory fills the screen, never a small island */
    function startScale() { return Math.max(0.3, Math.min(0.58, 0.82 * Math.min(W, H * 0.8) / 700)); }
    /* sharper tiles replace the atlas once a cell is big enough to see */
    function tile(f) {
      var t = TI[f];
      if (t) return t;
      t = TI[f] = { ok: false, img: new Image() };
      t.img.onload = function () { t.ok = true; if (!raf && !zraf) draw(); };
      t.img.src = f;
      return t;
    }
    function WS() { return G.cols * G.cell; }
    function center() { var s = WS() * scale; ox = W / 2 - s / 2; oy = H * PYF - s / 2; }
    function resize() {
      var r = cv.getBoundingClientRect();
      if (!r.width) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2); W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr;
      if (ready) draw();
    }
    window.addEventListener('resize', resize);
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(cv);
    function clamp() {
      var s = WS() * scale, px = W / 2, py = H * PYF;
      ox = Math.max(px - s * 0.9, Math.min(px - s * 0.1, ox));
      oy = Math.max(py - s * 0.9, Math.min(py - s * 0.1, oy));
    }
    function cellAt() {
      var N = G.cell, cs = N * scale, px = W / 2, py = H * PYF;
      var gx = Math.floor((px - ox) / cs), gy = Math.floor((py - oy) / cs);
      var inn = gx >= 0 && gy >= 0 && gx < G.cols && gy < G.rows, vis = false;
      if (inn && scale > 0.6) {
        var sx = Math.min(WS() - 1, Math.max(0, Math.round((px - ox) / scale))), sy = Math.min(WS() - 1, Math.max(0, Math.round((py - oy) / scale)));
        vis = offscreen.getImageData(sx, sy, 1, 1).data[3] > 40;
      }
      return { c: gx, r: gy, sx: gx * cs + ox, sy: gy * cs + oy, hit: inn && vis };
    }
    function draw() {
      if (!ready || !W || museum.offsetParent === null) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(world, ox, oy, WS() * scale, WS() * scale);
      if (scale >= 1) {
        var ks = G.cell * scale, c0 = Math.max(0, Math.floor(-ox / ks)), c1 = Math.min(G.cols - 1, Math.floor((W - ox) / ks)), r0 = Math.max(0, Math.floor(-oy / ks)), r1 = Math.min(G.rows - 1, Math.floor((H - oy) / ks));
        for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) {
          var al = MA[rr * G.cols + cc];
          if (al < 0.12) continue;
          var tl = tile(G.tiles[G.d[rr][cc]].f);
          if (!tl.ok) continue;
          ctx.globalAlpha = al; ctx.drawImage(tl.img, cc * ks + ox, rr * ks + oy, ks + 0.6, ks + 0.6);
        }
        ctx.globalAlpha = 1;
      }
      var far = scale < 0.6;
      museum.classList.toggle('far', far);
      var c = cellAt(), cs = G.cell * scale;
      if (c.hit && !far) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.strokeRect(c.sx + 1.25, c.sy + 1.25, cs - 2.5, cs - 2.5); }
      var key = c.hit ? c.c + ',' + c.r : 'out';
      if (key !== cellKey) { cellKey = key; setCard(c); }
    }
    function setCard(c) {
      card.hidden = false;
      tctx.clearRect(0, 0, 108, 108);
      if (!c.hit) { cardName.textContent = 'Blue Yolk'; cardSub.textContent = card.getAttribute('data-count') + ' · ' + card.getAttribute('data-edge'); card.setAttribute('href', card.getAttribute('data-home') || card.getAttribute('href')); return; }
      var t = G.tiles[G.d[c.r][c.c]], N = G.cell;
      cardName.textContent = t.n; cardSub.textContent = t.c; card.setAttribute('href', t.u);
      tctx.drawImage(img, c.c * N, c.r * N, N, N, 0, 0, 108, 108);
    }
    function snap() {
      if (scale < 0.8) return;
      var cs = G.cell * scale, px = W / 2, py = H * PYF, t = 0, x0 = ox, y0 = oy;
      var ex = px - (Math.floor((px - ox) / cs) * cs + ox + cs / 2), ey = py - (Math.floor((py - oy) / cs) * cs + oy + cs / 2);
      var f = function () { t += 0.12; var k = 1 - Math.pow(1 - Math.min(t, 1), 3); ox = x0 + ex * k; oy = y0 + ey * k; draw(); if (t < 1) raf = requestAnimationFrame(f); };
      raf = requestAnimationFrame(f);
    }
    function tick() {
      if (!mdrag) {
        ox += mx; oy += my; mx *= 0.93; my *= 0.93; clamp();
        if (Math.abs(mx) < 0.15 && Math.abs(my) < 0.15) { mx = my = 0; snap(); return; }
      }
      draw(); raf = requestAnimationFrame(tick);
    }
    function zoomAt(ns) {
      ns = Math.max(MIN, Math.min(MAX, ns));
      var px = W / 2, py = H * PYF, k = ns / scale;
      ox = px - (px - ox) * k; oy = py - (py - oy) * k; scale = ns; clamp(); draw();
    }
    /* zoom travels like a camera: eased, never a cut */
    function animateTo(s) {
      s = Math.max(MIN, Math.min(MAX, s)); tScale = s;
      cancelAnimationFrame(zraf); cancelAnimationFrame(raf);
      var s0 = scale, t0 = performance.now(), dur = reduce ? 1 : 900;
      var f = function (now) {
        var k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        zoomAt(s0 * Math.pow(s / s0, e));
        if (k < 1) zraf = requestAnimationFrame(f); else snap();
      };
      zraf = requestAnimationFrame(f);
    }
    function setScale(s) { scale = tScale = s; center(); draw(); }
    var ptrs = {}, pd = 0, moved = 0;
    cv.addEventListener('pointerdown', function (e) {
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      ptrs[e.pointerId] = [e.clientX, e.clientY]; cancelAnimationFrame(raf); moved = 0;
      if (Object.keys(ptrs).length === 1) { mdrag = true; lx = e.clientX; ly = e.clientY; mx = my = 0; } else { mdrag = false; pd = 0; }
    });
    cv.addEventListener('pointermove', function (e) {
      if (!ptrs[e.pointerId]) return;
      ptrs[e.pointerId] = [e.clientX, e.clientY];
      var ids = Object.keys(ptrs);
      if (ids.length === 2) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pd) { cancelAnimationFrame(zraf); zoomAt(scale * d / pd); }
        pd = d; moved = 9; return;
      }
      if (!mdrag) return;
      var ddx = e.clientX - lx, ddy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY; moved += Math.abs(ddx) + Math.abs(ddy);
      ox += ddx; oy += ddy; mx = ddx; my = ddy; clamp(); draw();
    });
    var up = function (e) {
      delete ptrs[e.pointerId]; pd = 0;
      if (!Object.keys(ptrs).length && mdrag) {
        mdrag = false;
        if (moved < 6 && scale < 0.8) { animateTo(1.4); return; }
        if (reduce) { mx = my = 0; snap(); return; }
        raf = requestAnimationFrame(tick);
      }
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', function (e) { e.preventDefault(); animateTo(tScale * (e.deltaY < 0 ? 1.25 : 0.8)); }, { passive: false });
    $$('.m-zoom button', museum).forEach(function (b) {
      b.addEventListener('click', function () { animateTo(b.getAttribute('data-z') === 'in' ? tScale * 1.6 : tScale / 1.6); });
    });
  }
})();
