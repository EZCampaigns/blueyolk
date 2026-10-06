// Blue Yolk static site generator. No dependencies: `node build.mjs` writes ./dist.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseFile, render, esc } from './lib/markdown.mjs';
import { SITE, LANGS, T } from './lib/strings.mjs';
import { plate, plateCount, plateAlt } from './lib/plates.mjs';
import { readFileSync as rf } from 'node:fs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/* ---------- output helpers ---------- */
function write(rel, content) {
  const full = join(DIST, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}
const hash = (s) => createHash('md5').update(s).digest('hex').slice(0, 8);

/* ---------- content ---------- */
function loadCollection(dir, re, build) {
  const byLang = { en: [], ar: [] };
  for (const file of readdirSync(join(ROOT, dir)).filter((f) => f.endsWith('.md')).sort()) {
    const m = file.match(re);
    if (!m) throw new Error(`Unexpected file name in ${dir}: ${file}`);
    const { data, body } = parseFile(read(`${dir}/${file}`));
    const lang = m[m.length - 1];
    byLang[lang].push({ ...build(m, data), body: render(body), file });
  }
  // every item must exist in both languages
  const slugs = (l) => byLang[l].map((i) => i.slug).sort().join('|');
  if (slugs('en') !== slugs('ar')) throw new Error(`${dir}: English and Arabic items do not match.\n en: ${slugs('en')}\n ar: ${slugs('ar')}`);
  return byLang;
}

const work = loadCollection('content/work', /^(\d+)-(.+)\.(en|ar)\.md$/, (m, d) => ({ order: Number(m[1]), slug: m[2], ...d }));
const journal = loadCollection('content/journal', /^(\d{4}-\d{2}-\d{2})-(.+)\.(en|ar)\.md$/, (m, d) => ({ slug: m[2], date: d.date || m[1], ...d }));
// Stand-in exhibits retire themselves as soon as real work exists. Their files stay in the repo untouched.
for (const l of LANGS) {
  if (work[l].some((e) => !e.standin)) work[l] = work[l].filter((e) => !e.standin);
}
for (const l of LANGS) {
  work[l].sort((a, b) => a.order - b.order);
  journal[l].sort((a, b) => (a.date < b.date ? 1 : -1));
}
const page = (name, lang) => {
  const { data, body } = parseFile(read(`content/pages/${name}.${lang}.md`));
  return { data, html: render(body) };
};

/* ---------- shared bits ---------- */
// The master dot path from the brand files (viewBox 0 0 1000 990.4). Never redrawn, never a perfect circle.
const DOT_D = 'M505.2 0.3C793.8 -10.0 1000.0 247.7 1000.0 536.4C1000.0 804.4 752.6 1000.3 474.2 990.0C216.5 990.0 0.0 783.8 0.0 495.1C0.0 227.1 237.1 10.6 505.2 0.3Z';
// Brand tokens + components are loaded first, then the site's own layout. The Google Fonts @import is
// replaced by a <link> in the page head so fonts do not block the stylesheet.
const css = [read('src/brand/tokens.css').replace(/@import url\([^)]*\);?/, ''), read('src/brand/components.css'), read('src/style.css')].join('\n');
const js = read('src/app.js');
const CSS_V = hash(css), JS_V = hash(js);

const href = (lang, p) => (lang === 'en' ? p : `/ar${p}`);
const abs = (lang, p) => SITE.url + href(lang, p);
const fmtDate = (iso, lang) =>
  new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${iso}T00:00:00Z`));
const pad = (n) => String(n).padStart(2, '0');
const ARROW = '<span class="arr" aria-hidden="true">→</span>';
const WORLD = JSON.parse(readFileSync(join(ROOT, 'lib/world-grid.json'), 'utf8'));

// Films live on Cloudflare Stream. `video` is the Stream video ID; `still` is the second used for the poster frame.
const STREAM = 'https://customer-38v2r0uca4gfzf5b.cloudflarestream.com';
const streamStill = (id, sec, h = 1000) => `${STREAM}/${id}/thumbnails/thumbnail.jpg?time=${Number(sec) || 0}s&height=${h}`;

function imgFor(item, lang, full = false) {
  if (item.video) return { src: streamStill(item.video, item.still, full ? 1000 : 720), alt: item.imageAlt || '' };
  if (item.stills) return { src: full ? `/stills/${item.stills}-${pad(item.cover || 1)}.jpg` : `/covers/${item.stills}.jpg`, alt: item.imageAlt || '' };
  if (item.image) return { src: item.image, alt: item.imageAlt || '' };
  const n = Number(item.plate) || 1;
  return { src: `/img/plate-${n}.svg`, alt: plateAlt[lang][n] || '' };
}
const tag = (t) => `<span class="tag">${esc(t.standin)}</span>`;

function dotSvg(cls = '') {
  return `<svg class="${cls}" viewBox="0 0 1000 990.4" aria-hidden="true" focusable="false"><path class="dot-path" d="${DOT_D}"/></svg>`;
}
// Logo: the supplied files as they are. Light file on light grounds (landing), dark file on dark grounds (everything else).
function logo(lang, name, tone = 'dark', h = 28) {
  const file = lang === 'ar' ? 'blue-yolk-horizontal-bilingual-rtl' : 'blue-yolk-horizontal';
  const w = lang === 'ar' ? 6057 : 3568.3;
  return `<img src="/logos/${file}-${tone}.svg" alt="${esc(name)}" width="${Math.round((h * w) / 990.4)}" height="${h}">`;
}

/* ---------- work data helpers ---------- */
const metaOf = (lang, ex) => [catLabel(lang, catOf(ex)), ex.year, ex.country, ex.seconds ? T[lang].minutes(Math.max(1, Math.round(Number(ex.seconds) / 60))) : ''].filter(Boolean).map(String);
const catOf = (ex) => ex.discipline || 'film';
const catLabel = (lang, k) => T[lang].disciplines[k] || k;
const cover = (ex, lang, h = 720) => imgFor(ex, lang, false);
function framesOf(ex, lang) {
  if (ex.stills) {
    return Array.from({ length: Number(ex.count) || 1 }, (_, k) => ({
      full: `/stills/${ex.stills}-${pad(k + 1)}.jpg`, thumb: `/tiles/${ex.stills}-${pad(k + 1)}.jpg`, w: 1400, h: 788,
    }));
  }
  if (ex.video) {
    const n = 8, sec = Number(ex.seconds) || 600;
    return Array.from({ length: n }, (_, k) => {
      const s = Math.round((sec * (k + 0.5)) / n);
      return { full: streamStill(ex.video, s, 900), thumb: streamStill(ex.video, s, 220), w: 1600, h: 680 };
    });
  }
  const im = imgFor(ex, lang, true);
  return [{ full: im.src, thumb: im.src, w: 1600, h: 1000 }];
}
const years = (list) => [...new Set(list.map((e) => String(e.year || '')).filter(Boolean))].sort().reverse();

/* ---------- layout ---------- */
function head(lang, { path, title, desc, bodyClass, theme, jsonld = '', ogType = 'website', alt = true, noindex = false }) {
  const t = T[lang];
  const pageTitle = path === '/' ? title : `${title} — ${t.siteName}`;
  const alternates = alt
    ? `<link rel="alternate" hreflang="en" href="${abs('en', path)}"><link rel="alternate" hreflang="ar" href="${abs('ar', path)}"><link rel="alternate" hreflang="x-default" href="${abs('en', path)}">`
    : '';
  return `<!doctype html>
<html lang="${t.lang}" dir="${t.dir}" data-theme="${theme}">
<head>
<meta charset="utf-8">
<script>document.documentElement.className+=" js"</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${abs(lang, path)}">
${alternates}
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta name="theme-color" content="${theme === 'light' ? '#FFFFFF' : '#000000'}">
<meta property="og:site_name" content="Blue Yolk">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(pageTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${abs(lang, path)}">
<meta property="og:image" content="${SITE.url}/og.png">
<meta property="og:locale" content="${lang === 'ar' ? 'ar_AR' : 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Outfit:wght@400;500&family=IBM+Plex+Sans+Arabic:wght@300;400;600;700&family=Bodoni+Moda:wght@500&display=swap">
<link rel="stylesheet" href="/assets/style.css?v=${CSS_V}">
${jsonld}
</head>
<body class="${bodyClass}">`;
}
const tail = `<script src="/assets/app.js?v=${JS_V}" defer></script>
</body>
</html>
`;

function layout(lang, { path, title, desc, main, bodyClass = '', jsonld = '', ogType = 'website', alt = true, noindex = false }) {
  const t = T[lang];
  const other = lang === 'en' ? 'ar' : 'en';
  const navKeys = ['work', 'journal', 'lab', 'contact'];
  const nav = navKeys.map((k) => {
    const p = `/${k}/`;
    const current = path === p || path.startsWith(p) ? ' aria-current="page"' : '';
    return `<a href="${href(lang, p)}"${current}>${esc(t.nav[k])}</a>`;
  }).join('');
  return `${head(lang, { path, title, desc, bodyClass, theme: 'dark', jsonld, ogType, alt, noindex })}
<a class="skip" href="#main">${esc(t.skip)}</a>
<header class="site-header">
  <a class="wordmark" href="${href(lang, '/')}">${logo(lang, t.siteName)}</a>
  <button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav" data-open="${esc(t.menu)}" data-close="${esc(t.close)}">${esc(t.menu)}</button>
  <nav class="nav" id="nav" aria-label="${esc(t.siteName)}">
    ${nav}
    <a class="lang-switch" href="${href(other, path)}" hreflang="${other}" lang="${other}" aria-label="${esc(T[other].switchLabel)}">${esc(t.switchTo)}</a>
  </nav>
</header>
<main id="main">
${main}
</main>
<footer class="site-footer">
  <div class="footer-grid">
    <div>
      <a class="big-mail" href="mailto:${SITE.email}">${SITE.email}</a>
      <p class="mono muted" style="margin:10px 0 0">${esc(t.footerLine)}</p>
    </div>
    <ul class="mono caps">${[...navKeys, 'about'].map((k) => `<li><a href="${href(lang, `/${k}/`)}">${esc(t.nav[k])}</a></li>`).join('')}</ul>
    <ul class="mono">
      <li><a href="${href(other, path)}" hreflang="${other}" lang="${other}">${esc(T[other].switchLabel)}</a></li>
    </ul>
  </div>
  <div class="footer-base mono">
    <span>© <span data-footer-year>2026</span> Blue Yolk. ${esc(t.rights)}</span>
    <span>blueyolk.org</span>
  </div>
</footer>
${tail}`;
}

/* ---------- page builders ---------- */
const emit = (lang, path, html) => {
  const rel = (href(lang, path) + 'index.html').replace(/^\//, '');
  write(rel, html);
};

/* the entrance: a plain light page, one yolk, nothing else */
function landing(lang) {
  const t = T[lang];
  const other = lang === 'en' ? 'ar' : 'en';
  const jsonld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Organization', name: 'Blue Yolk', url: SITE.url, logo: `${SITE.url}/logo.svg`,
    email: SITE.email, description: T.en.homeDesc, founder: { '@type': 'Person', name: SITE.founder },
  })}</script>`;
  const dirs = [['r', 'work'], ['t', 'journal'], ['l', 'lab'], ['b', 'contact']];
  const html = `${head(lang, { path: '/', title: t.homeTitle, desc: t.homeDesc, bodyClass: 'page-landing', theme: 'light', jsonld })}
<main class="landing" id="main" ${dirs.map(([d, k]) => `data-${d}="${href(lang, `/${k}/`)}" data-n-${d}="${esc(t.nav[k])}"`).join(' ')}>
  <a class="l-logo" href="${href(lang, '/')}">${logo(lang, t.siteName, 'light', 28)}</a>
  <h1 class="sr-only">${esc(t.siteName)}: ${esc(t.eyebrow)}</h1>
  <div class="l-stage">
    <button class="l-yolk in swell" type="button" aria-label="${esc(t.landLabel)}"><span class="sw"><svg viewBox="0 0 1000 990.4" aria-hidden="true" focusable="false"><path d="${DOT_D}"/></svg></span></button>
    <span class="l-label" aria-hidden="true"></span>
  </div>
  <p class="l-hint">${esc(t.landHint)}</p>
  <nav class="l-nav" aria-label="${esc(t.siteName)}">${dirs.map(([, k]) => `<a href="${href(lang, `/${k}/`)}">${esc(t.nav[k])}</a>`).join('')}</nav>
  <footer class="l-foot"><span>${esc(t.eyebrow)}</span><a href="${href(other, '/')}" hreflang="${other}" lang="${other}" aria-label="${esc(T[other].switchLabel)}">${esc(t.label === 'EN' ? 'EN · ع' : 'ع · EN')}</a></footer>
  <div class="l-fade" aria-hidden="true"></div>
</main>
${tail}`;
  emit(lang, '/', html);
}

/* ---------- work ---------- */
function exRow(lang, ex) {
  const t = T[lang];
  const im = cover(ex, lang);
  return `<li class="x-row reveal-in" data-yr="${esc(ex.year || '')}">
  <a href="${href(lang, `/work/${ex.slug}/`)}">
    <span class="x-thumb"><img src="${im.src}" alt="" loading="lazy" decoding="async" width="320" height="200"></span>
    <span class="x-title">${esc(ex.title)}${ex.standin ? ' ' + tag(t) : ''}</span>
    <span class="x-meta mono caps">${esc(catLabel(lang, catOf(ex)))}${ex.year ? ' · ' + esc(ex.year) : ''}</span>
  </a>
</li>`;
}
function exCard(lang, ex) {
  const im = cover(ex, lang);
  return `<a class="x-card reveal-in" href="${href(lang, `/work/${ex.slug}/`)}">
  <span class="x-frame"><img src="${im.src}" alt="" loading="lazy" decoding="async" width="720" height="450"></span>
  <span class="x-meta mono caps">${esc(catLabel(lang, catOf(ex)))}${ex.year ? ' · ' + esc(ex.year) : ''}</span>
  <span class="x-name">${esc(ex.title)}</span>
</a>`;
}
const catsOf = (lang) => [...new Set(work[lang].map(catOf))];
const firstOf = (lang, k) => work[lang].find((e) => catOf(e) === k);

function workIndex(lang) {
  const t = T[lang];
  const list = work[lang];
  const cats = catsOf(lang);
  const rows = [['all', t.allWorkLabel, list.length, list[0]], ...cats.map((k) => [k, catLabel(lang, k), list.filter((e) => catOf(e) === k).length, firstOf(lang, k)])];
  const index = `<section class="w-index" id="index" aria-label="${esc(t.indexTitle)}">
  <div class="wrap w-index-grid">
    <div>
      <h2 class="caps muted w-kicker">${esc(t.nav.work)} · ${esc(t.exhibitsN(list.length))}</h2>
      <ul class="cat-list">${rows.map(([k, label, n, ex]) => `<li><a href="${href(lang, `/work/category/${k}/`)}" data-frame="${ex ? esc(cover(ex, lang).src) : ''}"><span>${esc(label)}</span><i class="mono">${pad(n)}</i></a></li>`).join('')}</ul>
    </div>
    <div class="cat-frame" aria-hidden="true"><img src="${cover(list[0], lang).src}" alt="" width="720" height="450" id="cat-frame-img"></div>
  </div>
  <div class="wrap"><div class="x-grid">${list.map((ex) => exCard(lang, ex)).join('\n')}</div></div>
</section>`;
  const museum = `<section class="museum" id="museum" data-world="${href(lang, '/world.json')}" data-atlas="/world.webp" data-lang="${lang}" aria-label="${esc(t.viewMap)}">
  <canvas class="m-canvas" aria-hidden="true"></canvas>
  <span class="m-pin" aria-hidden="true"></span>
  <div class="m-zoom"><button type="button" data-z="in" aria-label="${esc(t.zoomIn)}">+</button><button type="button" data-z="out" aria-label="${esc(t.zoomOut)}">−</button></div>
  <div class="m-title">
    <h1>${esc(t.museumTitle)}</h1>
    <p class="m-count">${esc(t.museumCount(list.length))}</p>
    <p class="m-hint">${esc(t.museumHint)}</p>
  </div>
  <a class="m-card" href="${href(lang, '/work/')}" data-home="${href(lang, '/work/')}" hidden data-edge="${esc(t.edgeOfMap)}" data-count="${esc(t.exhibitsN(list.length))}"><canvas class="m-thumb" width="108" height="108" aria-hidden="true"></canvas><span class="m-tx"><b></b><small></small></span><span class="by-btn by-btn-primary by-btn-sm">${esc(t.open)}</span></a>
</section>`;
  const main = `<div class="work" id="work" data-view="map">
  <div class="view-toggle" role="group" aria-label="${esc(t.nav.work)}">
    <button type="button" data-view="map" aria-pressed="true">${esc(t.viewMap)}</button>
    <button type="button" data-view="index" aria-pressed="false">${esc(t.viewIndex)}</button>
  </div>
  ${museum}
  ${index}
</div>`;
  emit(lang, '/work/', layout(lang, { path: '/work/', title: t.workTitle, desc: t.workDesc, main, bodyClass: 'page-work' }));
}

function categoryPage(lang, key) {
  const t = T[lang];
  const list = key === 'all' ? work[lang] : work[lang].filter((e) => catOf(e) === key);
  const label = key === 'all' ? t.allWorkLabel : catLabel(lang, key);
  const ys = years(list);
  const chips = ys.length
    ? `<div class="chips" data-year-filter role="group" aria-label="${esc(t.byYear)}"><button class="by-chip" type="button" data-y="all" aria-pressed="true">${esc(t.allYears)}</button>${ys.map((y) => `<button class="by-chip" type="button" data-y="${esc(y)}" aria-pressed="false">${esc(y)}</button>`).join('')}</div>`
    : '';
  const catChips = `<div class="chips" role="group" aria-label="${esc(t.byCategory)}">${[['all', t.allWorkLabel], ...catsOf(lang).map((k) => [k, catLabel(lang, k)])].map(([k, l]) => `<a class="by-chip" href="${href(lang, `/work/category/${k}/`)}" aria-pressed="${k === key}">${esc(l)}</a>`).join('')}</div>`;
  const main = `<div class="wrap cat-page">
  <p class="mono caps back"><a href="${href(lang, '/work/')}#index">← ${esc(t.backIndex)}</a></p>
  <h1 class="page-title">${esc(label)}</h1>
  <p class="count mono caps muted" data-count data-one="${esc(t.exhibitsN(1))}" data-many="${esc(t.exhibitsN(0).replace('0', '{n}'))}">${esc(t.exhibitsN(list.length))}</p>
  ${catChips}
  ${chips}
  <ul class="x-rows" data-rows>${list.map((ex) => exRow(lang, ex)).join('\n')}</ul>
  <p class="empty muted" hidden data-empty>${esc(t.nothingHere)}</p>
</div>
<div style="height:clamp(56px,9vw,130px)"></div>`;
  emit(lang, `/work/category/${key}/`, layout(lang, { path: `/work/category/${key}/`, title: label, desc: t.catDesc(label), main, bodyClass: 'page-category' }));
}

function exhibitPage(lang, ex, i) {
  const t = T[lang];
  const list = work[lang];
  const next = list[(i + 1) % list.length];
  const fr = framesOf(ex, lang);
  const credits = String(ex.credits || '').split('|').map((s) => s.trim()).filter(Boolean).map((c) => {
    const k = c.indexOf(':');
    return k > 0 ? `<li><span>${esc(c.slice(0, k).trim())}</span><span>${esc(c.slice(k + 1).trim())}</span></li>` : `<li><span>${esc(c)}</span></li>`;
  }).join('');
  const alt = ex.imageAlt || ex.title;
  const reel = fr.map((f, k) => `<li class="r-frame"><img src="${f.full}" alt="${esc(alt)} (${k + 1}/${fr.length})" width="${f.w}" height="${f.h}" ${k ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async"></li>`).join('');
  const main = `<div class="proj">
  <div class="reel-wrap">
    <ol class="reel" id="reel" tabindex="0" aria-label="${esc(ex.title)}">${reel}</ol>
    ${fr.length > 1 ? `<div class="reel-nav"><button type="button" data-r="prev" aria-label="←">←</button><button type="button" data-r="next" aria-label="→">→</button></div>` : ''}
  </div>
  <div class="wrap proj-info">
    <p class="r-count mono caps"><i aria-hidden="true"></i><span data-reel-count>${pad(1)} / ${pad(fr.length)}</span></p>
    <h1 class="exhibit-title">${esc(ex.title)}</h1>
    <p class="proj-meta mono caps muted">${esc(metaOf(lang, ex).join(' · '))}${ex.role ? ' · ' + esc(ex.role) : ''}</p>
    ${ex.standin ? `<p class="mono" style="margin:0 0 16px">${tag(t)} <span class="muted">${esc(t.standinNote)}</span></p>` : ''}
    ${ex.caption ? `<p class="by-caption exhibit-caption"${lang === 'ar' ? ' lang="ar"' : ''}>${esc(ex.caption)}</p>` : ''}
    <div class="prose proj-prose">${ex.body}</div>
    <div class="acts">
      ${ex.video ? `<a class="by-btn by-btn-primary" href="#film" data-watch data-src="${STREAM}/${ex.video}/iframe?poster=${encodeURIComponent(streamStill(ex.video, ex.still, 1080))}&amp;autoplay=true&amp;primaryColor=%234262ff&amp;letterboxColor=000000" data-title="${esc(ex.title)}" data-meta="${esc(metaOf(lang, ex).join(' · '))}" data-ratio="${Number(ex.ratio) || 1.7778}" data-starting="${esc(t.startingFilm)}" data-now="${esc(t.nowPlaying)}" data-close="${esc(t.close)}">${esc(t.watch)}</a>` : ''}
      <a class="by-btn by-btn-secondary" href="${href(lang, `/work/${ex.slug}/stills/`)}">${esc(t.stills)}</a>
    </div>
    ${credits ? `<div class="credits-block"><h2 class="mono caps muted" style="margin:0 0 8px;font-weight:400">${esc(t.credits)}</h2><ul class="credits mono">${credits}</ul></div>` : ''}
  </div>
 ${ex.video ? `<noscript><div class="wrap" id="film"><div class="exhibit-hero is-video" style="--ratio:${Number(ex.ratio) || 1.7778}"><iframe src="${STREAM}/${ex.video}/iframe?poster=${encodeURIComponent(streamStill(ex.video, ex.still, 1080))}" title="${esc(ex.title)}" loading="lazy" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowfullscreen></iframe></div></div></noscript>` : ''}
  <div class="wrap">
    <p class="mono caps back" style="margin-block-start:var(--space-6)"><a href="${href(lang, '/work/')}">← ${esc(t.back)}</a></p>
    <a class="next-exhibit" href="${href(lang, `/work/${next.slug}/`)}">
      <span class="mono caps muted">${esc(t.next)}</span>
      <span class="big">${esc(next.title)} ${ARROW}</span>
    </a>
  </div>
</div>`;
  emit(lang, `/work/${ex.slug}/`, layout(lang, { path: `/work/${ex.slug}/`, title: ex.title, desc: ex.summary || t.workDesc, main, bodyClass: 'page-exhibit', ogType: 'article' }));
}

function stillsPage(lang, ex) {
  const t = T[lang];
  const fr = framesOf(ex, lang);
  const alt = ex.imageAlt || ex.title;
  const sheet = fr.map((f, k) => `<li><a href="${f.full}" data-i="${k}" ${k === 0 ? 'aria-current="true"' : ''} aria-label="${esc(t.frame)} ${k + 1}"><img src="${f.thumb}" alt="" width="220" height="124" loading="lazy" decoding="async"></a></li>`).join('');
  const main = `<div class="stills" data-alt="${esc(alt)}">
  <div class="wrap">
    <p class="mono caps back"><a href="${href(lang, `/work/${ex.slug}/`)}">← ${esc(t.backProject)}</a></p>
    <h1 class="page-title s-title">${esc(ex.title)} <span class="muted">${esc(t.stills)}</span></h1>
    <figure class="s-view"><img id="s-big" src="${fr[0].full}" alt="${esc(alt)} (1/${fr.length})" width="${fr[0].w}" height="${fr[0].h}" fetchpriority="high"></figure>
    <ul class="sheet" id="sheet">${sheet}</ul>
  </div>
  <div class="edge-code" aria-hidden="true"><span>▸ 00</span><span>▸ 01</span><b id="edge-cur">▸ 01A</b><span>▸ 02</span><span>▸ 03</span><span>▸ 04</span></div>
</div>`;
  emit(lang, `/work/${ex.slug}/stills/`, layout(lang, { path: `/work/${ex.slug}/stills/`, title: t.stillsTitle(ex.title), desc: t.stillsDesc(ex.title), main, bodyClass: 'page-stills' }));
}

/* ---------- journal, lab, about, contact ---------- */
function journalCard(lang, post) {
  const t = T[lang];
  const im = imgFor(post, lang);
  return `<a class="j-card reveal-in" data-cat="${esc(post.category)}" href="${href(lang, `/journal/${post.slug}/`)}">
  <span class="j-frame"><img src="${im.src}" alt="" loading="lazy" decoding="async" width="1600" height="1000"></span>
  <span class="j-meta mono caps"><span>${esc(t.categories[post.category] || post.category)}</span><span>${esc(fmtDate(post.date, lang))}</span></span>
  <span class="j-title">${esc(post.title)}${post.standin ? ' ' + tag(t) : ''}</span>
  <span class="j-sum">${esc(post.summary || '')}</span>
</a>`;
}
function journalIndex(lang) {
  const t = T[lang];
  const cats = [...new Set(journal[lang].map((p) => p.category))];
  const filters = `<div class="filters" data-filters=".j-grid .j-card" role="group" aria-label="${esc(t.journalTitle)}">
  <button class="by-chip" type="button" data-filter="all" aria-pressed="true">${esc(t.filterAll)}</button>
  ${cats.map((c) => `<button class="by-chip" type="button" data-filter="${esc(c)}" aria-pressed="false">${esc(t.categories[c] || c)}</button>`).join('')}
</div>`;
  const main = `<div class="wrap journal-page">
  <p class="mono caps muted j-kicker"><i class="dot" aria-hidden="true"></i>${esc(t.journalKicker || t.nav.journal)}</p>
  <h1 class="j-head">${esc(t.journalTitle)}</h1>
  <p class="page-intro">${esc(t.journalIntro)}</p>
  ${filters}
  <div class="j-grid">${journal[lang].map((p) => journalCard(lang, p)).join('\n')}</div>
</div>
<div style="height:clamp(56px,9vw,130px)"></div>`;
  emit(lang, '/journal/', layout(lang, { path: '/journal/', title: t.journalTitle, desc: t.journalDesc, main, bodyClass: 'page-journal' }));
}

function postPage(lang, post) {
  const t = T[lang];
  const im = imgFor(post, lang);
  const main = `
<article>
<div class="wrap exhibit-top post-top">
  <p class="mono caps back"><a href="${href(lang, '/journal/')}">← ${esc(t.backJournal)}</a></p>
  <p class="mono caps muted" style="margin:28px 0 12px">${esc(t.categories[post.category] || post.category)} · ${esc(fmtDate(post.date, lang))}</p>
  <h1 class="exhibit-title j-post-title">${esc(post.title)}</h1>
  ${post.standin ? `<p class="mono" style="margin:-8px 0 24px">${tag(t)} <span class="muted">${esc(t.standinNote)}</span></p>` : ''}
</div>
<div class="wrap"><div class="exhibit-hero"><img src="${im.src}" alt="${esc(im.alt)}" width="1600" height="1000"></div></div>
<div class="wrap" style="padding-block:clamp(36px,5vw,72px) clamp(56px,9vw,130px)">
  <div class="prose">${post.body}</div>
</div>
</article>`;
  emit(lang, `/journal/${post.slug}/`, layout(lang, { path: `/journal/${post.slug}/`, title: post.title, desc: post.summary || t.journalDesc, main, bodyClass: 'page-post', ogType: 'article' }));
}

function labPage(lang) {
  const t = T[lang];
  const p = page('lab', lang);
  // the first paragraph is the lead statement; the rest is the manifesto
  const m = p.html.match(/^<p>([\s\S]*?)<\/p>\n?([\s\S]*)$/);
  const lead = m ? m[1] : esc(t.labLead);
  const rest = m ? m[2] : p.html;
  const strip = ['prologue', 'lockdown', 'sannine', 'fardayso', 'farah-skaff', 'ryan-khoury'].map((s) => work[lang].find((e) => e.slug === s)).filter(Boolean)
    .map((e) => `<li><img src="${cover(e, lang).src}" alt="" loading="lazy" decoding="async" width="720" height="450"></li>`).join('');
  const main = `<div class="lab-page">
  <div class="wrap lab-hero">
    <p class="mono caps muted j-kicker"><i class="dot" aria-hidden="true"></i>${esc(t.nav.lab)}</p>
    <h1 class="lab-lead">${lead}</h1>
  </div>
  <ul class="lab-strip" aria-hidden="true">${strip}</ul>
  <div class="wrap lab-body">
    <div class="prose lead-first">${rest}</div>
    <p class="acts"><a class="by-btn by-btn-secondary" href="${href(lang, '/about/')}">${esc(t.meetFounder)}</a><a class="by-btn by-btn-primary" href="${href(lang, '/contact/')}">${esc(t.writeUs)}</a></p>
  </div>
  <div style="height:clamp(56px,9vw,130px)"></div>
</div>`;
  emit(lang, '/lab/', layout(lang, { path: '/lab/', title: t.labTitle, desc: t.labDesc, main, bodyClass: 'page-lab' }));
}

function aboutPage(lang) {
  const t = T[lang];
  const p = page('about', lang);
  const main = `<div class="wrap about-page">
  <p class="mono caps muted j-kicker"><i class="dot" aria-hidden="true"></i>${esc(t.nav.about)}</p>
  <h1 class="page-title" style="font-size:clamp(2.2rem,5vw,4rem);padding-block-end:0">${esc(t.aboutTitle)}</h1>
  <div class="about-grid section" style="padding-block-start:clamp(24px,4vw,56px)">
    <aside class="about-aside">
      <p class="display about-name">${esc(p.data.name)}</p>
      <p class="mono caps muted" style="margin-top:8px">${esc(p.data.role)} · Blue Yolk</p>
    </aside>
    <div class="prose lead-first">${p.html}
      <p><a class="mono arrow-link caps" href="${href(lang, '/contact/')}">${esc(t.inviteAction)} ${ARROW}</a></p>
    </div>
  </div>
</div>
<div style="height:clamp(56px,9vw,130px)"></div>`;
  emit(lang, '/about/', layout(lang, { path: '/about/', title: t.aboutTitle, desc: t.aboutDesc, main, bodyClass: 'page-about' }));
}

function contactPage(lang) {
  const t = T[lang];
  const main = `<div class="wrap contact-page">
  <p class="mono caps muted j-kicker"><i class="dot" aria-hidden="true"></i>${esc(t.nav.contact)}</p>
  <h1 class="page-title">${esc(t.contactLead)}</h1>
  <a class="contact-mail" href="mailto:${SITE.email}">${SITE.email}</a>
  <p class="acts"><button class="by-btn by-btn-secondary" type="button" data-copy="${SITE.email}" data-copied="${esc(t.copied)}" hidden>${esc(t.copyMail)}</button></p>
  <ul class="offers">${t.offers.map((o) => `<li><i class="dot" aria-hidden="true"></i>${esc(o)}</li>`).join('')}</ul>
  <p class="page-intro" style="margin-block-start:var(--space-6)">${esc(t.contactBody)}</p>
  <p style="margin-block-start:var(--space-5)"><a class="mono arrow-link caps" href="${href(lang, '/about/')}">${esc(t.meetFounder)} ${ARROW}</a></p>
  <div style="height:clamp(56px,9vw,130px)"></div>
</div>`;
  emit(lang, '/contact/', layout(lang, { path: '/contact/', title: t.contactTitle, desc: t.contactDesc, main, bodyClass: 'page-contact' }));
}

function notFound() {
  const row = (l) => {
    const t = T[l];
    return `<div ${l === 'ar' ? 'dir="rtl" lang="ar"' : 'lang="en"'} style="margin-block:2rem">
  <${l === 'en' ? 'h1' : 'h2'} class="display" style="font-size:clamp(2.6rem,8vw,6rem)">${esc(t.notFoundTitle)}</${l === 'en' ? 'h1' : 'h2'}>
  <p>${esc(t.notFoundBody)} <a href="${href(l, '/')}">${esc(t.notFoundLink)}</a></p>
</div>`;
  };
  const main = `<div class="wrap" style="padding-block:clamp(120px,16vw,200px) 80px">${row('en')}${row('ar')}</div>`;
  const html = layout('en', { path: '/404.html', title: T.en.notFoundTitle, desc: T.en.notFoundBody, main, alt: false, noindex: true, bodyClass: 'page-404' })
    .replace(`href="${SITE.url}/404.html"`, `href="${SITE.url}/"`)
    .replaceAll('/ar/404.html', '/ar/');
  write('404.html', html);
}

/* ---------- the world: the map's tiles, per language ---------- */
function worldJson(lang) {
  const byStills = new Map(work[lang].filter((e) => e.stills).map((e) => [e.stills, e]));
  const tiles = WORLD.tiles.map((f) => {
    const slug = f.replace(/-\d+$/, '');
    const ex = byStills.get(slug);
    return ex ? { n: ex.title, u: href(lang, `/work/${ex.slug}/`), c: catLabel(lang, catOf(ex)) } : { n: slug, u: href(lang, '/work/'), c: '' };
  });
  return JSON.stringify({ cols: WORLD.cols, rows: WORLD.rows, cell: WORLD.cell, d: WORLD.d, tiles });
}

/* ---------- run ---------- */
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

if (existsSync(join(ROOT, 'public'))) cpSync(join(ROOT, 'public'), DIST, { recursive: true });
write('assets/style.css', css);
write('assets/app.js', js);
for (let n = 1; n <= plateCount; n++) write(`img/plate-${n}.svg`, plate(n));

const cats = (lang) => ['all', ...catsOf(lang)];
for (const lang of LANGS) {
  landing(lang); workIndex(lang); journalIndex(lang); labPage(lang); aboutPage(lang); contactPage(lang);
  cats(lang).forEach((k) => categoryPage(lang, k));
  work[lang].forEach((ex, i) => { exhibitPage(lang, ex, i); stillsPage(lang, ex); });
  journal[lang].forEach((p) => postPage(lang, p));
  write(`${lang === 'en' ? '' : 'ar/'}world.json`, worldJson(lang));
}
notFound();

const paths = ['/', '/work/', ...cats('en').map((k) => `/work/category/${k}/`), ...work.en.flatMap((e) => [`/work/${e.slug}/`, `/work/${e.slug}/stills/`]), '/journal/', ...journal.en.map((p) => `/journal/${p.slug}/`), '/lab/', '/about/', '/contact/'];
const today = new Date().toISOString().slice(0, 10);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGS.flatMap((l) => paths.map((p) => `  <url><loc>${abs(l, p)}</loc><lastmod>${today}</lastmod>
    <xhtml:link rel="alternate" hreflang="en" href="${abs('en', p)}"/><xhtml:link rel="alternate" hreflang="ar" href="${abs('ar', p)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${abs('en', p)}"/></url>`)).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
write('_headers', `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/img/*
  Cache-Control: public, max-age=86400

/world.webp
  Cache-Control: public, max-age=31536000, immutable
`);

console.log(`Built ${paths.length * 2 + 1} pages into ${DIST}`);
