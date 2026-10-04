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

  /* year in the footer */
  var y = doc.querySelector('[data-year]');
  if (y) y.textContent = new Date().getFullYear();
})();
