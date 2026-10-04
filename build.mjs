// Blue Yolk static site generator. No dependencies: `node build.mjs` writes ./dist.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseFile, render, esc } from './lib/markdown.mjs';
import { SITE, LANGS, T } from './lib/strings.mjs';
import { plate, plateCount, plateAlt, smooth } from './lib/plates.mjs';

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
for (const l of LANGS) {
  work[l].sort((a, b) => a.order - b.order);
  journal[l].sort((a, b) => (a.date < b.date ? 1 : -1));
}
const page = (name, lang) => {
  const { data, body } = parseFile(read(`content/pages/${name}.${lang}.md`));
  return { data, html: render(body) };
};

/* ---------- shared bits ---------- */
const BLOB_PTS = JSON.parse(read('lib/blob-points.json'));
const BLOB_D = smooth(BLOB_PTS);
const BLOB_PTS_ATTR = esc(JSON.stringify(BLOB_PTS));
const css = read('src/style.css');
const js = read('src/app.js');
const CSS_V = hash(css), JS_V = hash(js);

const href = (lang, p) => (lang === 'en' ? p : `/ar${p}`);
const abs = (lang, p) => SITE.url + href(lang, p);
const fmtDate = (iso, lang) =>
  new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${iso}T00:00:00Z`));
const pad = (n) => String(n).padStart(2, '0');
const ARROW = '<span class="arr" aria-hidden="true">→</span>';

function imgFor(item, lang) {
  if (item.image) return { src: item.image, alt: item.imageAlt || '' };
  const n = Number(item.plate) || 1;
  return { src: `/img/plate-${n}.svg`, alt: plateAlt[lang][n] || '' };
}
const tag = (t) => `<span class="tag">${esc(t.standin)}</span>`;

function blobSvg(cls = '', amp = 3.2) {
  return `<svg class="${cls}" viewBox="0 0 200 200" data-blob data-amp="${amp}" data-pts="${BLOB_PTS_ATTR}" aria-hidden="true" focusable="false"><path class="blob-path" d="${BLOB_D}"/></svg>`;
}

/* ---------- layout ---------- */
function layout(lang, { path, title, desc, main, bodyClass = '', jsonld = '', ogType = 'website', alt = true, noindex = false }) {
  const t = T[lang];
  const other = lang === 'en' ? 'ar' : 'en';
  const navKeys = ['work', 'journal', 'lab', 'about', 'contact'];
  const nav = navKeys.map((k) => {
    const p = `/${k}/`;
    const current = path === p || path.startsWith(p) ? ' aria-current="page"' : '';
    return `<a href="${href(lang, p)}"${current}>${esc(t.nav[k])}</a>`;
  }).join('');
  const alternates = alt
    ? `<link rel="alternate" hreflang="en" href="${abs('en', path)}"><link rel="alternate" hreflang="ar" href="${abs('ar', path)}"><link rel="alternate" hreflang="x-default" href="${abs('en', path)}">`
    : '';
  const pageTitle = path === '/' ? title : `${title} — ${t.siteName}`;
  return `<!doctype html>
<html lang="${t.lang}" dir="${t.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${abs(lang, path)}">
${alternates}
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta name="theme-color" content="#F2F3F7">
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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Inter:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&display=swap">
<link rel="stylesheet" href="/assets/style.css?v=${CSS_V}">
${jsonld}
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">${esc(t.skip)}</a>
<div class="veil" aria-hidden="true"></div>
<div class="cursor" aria-hidden="true"></div>
<header class="site-header">
  <a class="wordmark" href="${href(lang, '/')}" aria-label="${esc(t.siteName)}">
    <svg viewBox="20 20 160 160" aria-hidden="true" focusable="false"><path d="${BLOB_D}" fill="#1F41E0"/></svg>
    <span>${esc(t.siteName)}</span>
  </a>
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
    <ul class="mono caps">${navKeys.map((k) => `<li><a href="${href(lang, `/${k}/`)}">${esc(t.nav[k])}</a></li>`).join('')}</ul>
    <ul class="mono">
      <li><a href="${SITE.instagram}" rel="noopener" target="_blank">EZ · Instagram</a></li>
      <li><a href="${href(other, path)}" hreflang="${other}" lang="${other}">${esc(T[other].switchLabel)}</a></li>
    </ul>
  </div>
  <div class="footer-base mono">
    <span>© <span data-year>2026</span> Blue Yolk. ${esc(t.rights)}</span>
    <span>blueyolk.org</span>
  </div>
</footer>
<script src="/assets/app.js?v=${JS_V}" defer></script>
</body>
</html>
`;
}

/* ---------- page builders ---------- */
const outputs = []; // for the sitemap: { path } (language-neutral)
const emit = (lang, path, html) => {
  const rel = (href(lang, path) + 'index.html').replace(/^\//, '');
  write(rel, html);
};

function exhibitRow(lang, ex, i) {
  const t = T[lang];
  const im = imgFor(ex, lang);
  return `<li class="row reveal-in" data-cat="${esc(ex.discipline)}">
  <a href="${href(lang, `/work/${ex.slug}/`)}">
    <span class="mono num">${pad(i + 1)}</span>
    <span class="title">${esc(ex.title)}${ex.standin ? ' ' + tag(t) : ''}</span>
    <span class="mono disc caps">${esc(t.disciplines[ex.discipline] || ex.discipline)}</span>
    <span class="mono yr">${esc(ex.year)}</span>
    ${ARROW}
    <span class="thumb" aria-hidden="true"><img src="${im.src}" alt="" loading="lazy" width="1600" height="1000"></span>
  </a>
</li>`;
}

function journalRow(lang, post) {
  const t = T[lang];
  return `<li class="row journal-row reveal-in" data-cat="${esc(post.category)}">
  <a href="${href(lang, `/journal/${post.slug}/`)}">
    <span class="mono date">${esc(fmtDate(post.date, lang))}</span>
    <span class="mono cat caps">${esc(t.categories[post.category] || post.category)}</span>
    <span class="title">${esc(post.title)}${post.standin ? ' ' + tag(t) : ''}</span>
    ${ARROW}
    <p class="summary">${esc(post.summary || '')}</p>
  </a>
</li>`;
}

function home(lang) {
  const t = T[lang];
  const jsonld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Blue Yolk',
    url: SITE.url,
    logo: `${SITE.url}/logo.svg`,
    email: SITE.email,
    description: T.en.homeDesc,
    founder: { '@type': 'Person', name: SITE.founder },
    parentOrganization: { '@type': 'Organization', name: 'EZ', sameAs: [SITE.instagram] },
  })}</script>`;
  const main = `
<section class="hero">
  <p class="hero-eyebrow mono caps muted">${esc(t.eyebrow)}</p>
  <div class="hero-stage">
    ${blobSvg('', 3.4)}
    <h1 class="hero-statement display">${esc(t.tagline)}</h1>
  </div>
  <p class="hero-cta"><a href="${href(lang, '/work/')}"><span>${esc(t.enter)}</span>${ARROW}</a></p>
</section>
<section class="section wrap">
  <div class="section-head"><h2>${esc(t.selected)}</h2><a class="mono arrow-link" href="${href(lang, '/work/')}">${esc(t.allWork)} ${ARROW}</a></div>
  <ul class="rows">${work[lang].map((ex, i) => exhibitRow(lang, ex, i)).join('\n')}</ul>
</section>
<section class="section wrap">
  <div class="section-head"><h2>${esc(t.fromJournal)}</h2><a class="mono arrow-link" href="${href(lang, '/journal/')}">${esc(t.allJournal)} ${ARROW}</a></div>
  <ul class="rows">${journal[lang].slice(0, 3).map((p) => journalRow(lang, p)).join('\n')}</ul>
</section>
<section class="section wrap">
  <p class="display" style="font-size:clamp(2rem,6vw,5.5rem);max-width:16ch">${esc(t.invite)}</p>
  <p style="margin-top:28px"><a class="mono arrow-link caps" href="${href(lang, '/contact/')}">${esc(t.inviteAction)} ${ARROW}</a></p>
</section>`;
  emit(lang, '/', layout(lang, { path: '/', title: t.homeTitle, desc: t.homeDesc, main, jsonld, bodyClass: 'page-home' }));
}

function workIndex(lang) {
  const t = T[lang];
  const discs = [...new Set(work[lang].map((e) => e.discipline))];
  const filters = `<div class="filters" data-filters=".grid .card" role="group" aria-label="${esc(t.discipline)}">
  <button type="button" data-filter="all" aria-pressed="true">${esc(t.filterAll)}</button>
  ${discs.map((d) => `<button type="button" data-filter="${esc(d)}" aria-pressed="false">${esc(t.disciplines[d] || d)}</button>`).join('')}
</div>`;
  const cards = work[lang].map((ex) => {
    const im = imgFor(ex, lang);
    return `<a class="card reveal-in" data-cat="${esc(ex.discipline)}" href="${href(lang, `/work/${ex.slug}/`)}">
  <div class="frame"><img src="${im.src}" alt="" loading="lazy" width="1600" height="1000"></div>
  <div class="meta mono caps"><span>${esc(t.disciplines[ex.discipline] || ex.discipline)}</span><span>${esc(ex.year)}</span></div>
  <h3>${esc(ex.title)}${ex.standin ? ' ' + tag(t) : ''}</h3>
  <p>${esc(ex.summary || '')}</p>
</a>`;
  }).join('\n');
  const main = `<div class="wrap">
  <h1 class="page-title">${esc(t.workTitle)}</h1>
  <p class="page-intro">${esc(t.workIntro)}</p>
  ${filters}
  <div class="grid">${cards}</div>
</div>
<div style="height:clamp(56px,9vw,130px)"></div>`;
  emit(lang, '/work/', layout(lang, { path: '/work/', title: t.workTitle, desc: t.workDesc, main, bodyClass: 'page-work' }));
}

function exhibitPage(lang, ex, i) {
  const t = T[lang];
  const im = imgFor(ex, lang);
  const list = work[lang];
  const next = list[(i + 1) % list.length];
  const credits = String(ex.credits || '').split('|').map((s) => s.trim()).filter(Boolean).map((c) => {
    const k = c.indexOf(':');
    return k > 0 ? `<li><span>${esc(c.slice(0, k).trim())}</span><span>${esc(c.slice(k + 1).trim())}</span></li>` : `<li><span>${esc(c)}</span></li>`;
  }).join('');
  const main = `
<div class="wrap exhibit-top">
  <p class="mono caps"><a href="${href(lang, '/work/')}">← ${esc(t.back)}</a></p>
  <h1 class="exhibit-title">${esc(ex.title)}</h1>
  ${ex.standin ? `<p class="mono" style="margin:-8px 0 24px">${tag(t)} <span class="muted">${esc(t.standinNote)}</span></p>` : ''}
  <dl class="facts mono">
    <div><dt class="caps">${esc(t.year)}</dt><dd>${esc(ex.year)}</dd></div>
    <div><dt class="caps">${esc(t.role)}</dt><dd>${esc(ex.role || '')}</dd></div>
    <div><dt class="caps">${esc(t.discipline)}</dt><dd>${esc(t.disciplines[ex.discipline] || ex.discipline)}</dd></div>
  </dl>
</div>
<div class="exhibit-hero"><img src="${im.src}" alt="${esc(im.alt)}" width="1600" height="1000"></div>
<div class="wrap" style="padding-block-start:clamp(36px,5vw,72px)">
  <div class="exhibit-body">
    <div class="prose">${ex.body}</div>
    ${credits ? `<div><h2 class="mono caps muted" style="margin:0 0 8px;font-weight:400">${esc(t.credits)}</h2><ul class="credits mono">${credits}</ul></div>` : ''}
  </div>
  <a class="next-exhibit" href="${href(lang, `/work/${next.slug}/`)}">
    <span class="mono caps muted">${esc(t.next)}</span>
    <span class="big">${esc(next.title)} ${ARROW}</span>
  </a>
</div>`;
  emit(lang, `/work/${ex.slug}/`, layout(lang, { path: `/work/${ex.slug}/`, title: ex.title, desc: ex.summary || T[lang].workDesc, main, bodyClass: 'page-exhibit', ogType: 'article' }));
}

function journalIndex(lang) {
  const t = T[lang];
  const cats = [...new Set(journal[lang].map((p) => p.category))];
  const filters = `<div class="filters" data-filters=".rows .journal-row" role="group" aria-label="${esc(t.journalTitle)}">
  <button type="button" data-filter="all" aria-pressed="true">${esc(t.filterAll)}</button>
  ${cats.map((c) => `<button type="button" data-filter="${esc(c)}" aria-pressed="false">${esc(t.categories[c] || c)}</button>`).join('')}
</div>`;
  const main = `<div class="wrap">
  <h1 class="page-title">${esc(t.journalTitle)}</h1>
  <p class="page-intro">${esc(t.journalIntro)}</p>
  ${filters}
  <ul class="rows">${journal[lang].map((p) => journalRow(lang, p)).join('\n')}</ul>
</div>
<div style="height:clamp(56px,9vw,130px)"></div>`;
  emit(lang, '/journal/', layout(lang, { path: '/journal/', title: t.journalTitle, desc: t.journalDesc, main, bodyClass: 'page-journal' }));
}

function postPage(lang, post) {
  const t = T[lang];
  const im = imgFor(post, lang);
  const main = `
<article>
<div class="wrap exhibit-top">
  <p class="mono caps"><a href="${href(lang, '/journal/')}">← ${esc(t.backJournal)}</a></p>
  <p class="mono caps muted" style="margin:28px 0 12px">${esc(t.categories[post.category] || post.category)} · ${esc(fmtDate(post.date, lang))}</p>
  <h1 class="exhibit-title">${esc(post.title)}</h1>
  ${post.standin ? `<p class="mono" style="margin:-8px 0 24px">${tag(t)} <span class="muted">${esc(t.standinNote)}</span></p>` : ''}
</div>
<div class="exhibit-hero"><img src="${im.src}" alt="${esc(im.alt)}" width="1600" height="1000"></div>
<div class="wrap" style="padding-block:clamp(36px,5vw,72px) clamp(56px,9vw,130px)">
  <div class="prose">${post.body}</div>
</div>
</article>`;
  emit(lang, `/journal/${post.slug}/`, layout(lang, { path: `/journal/${post.slug}/`, title: post.title, desc: post.summary || T[lang].journalDesc, main, bodyClass: 'page-post', ogType: 'article' }));
}

function labPage(lang) {
  const t = T[lang];
  const p = page('lab', lang);
  const main = `<div class="wrap">
  <h1 class="page-title">${esc(t.labTitle)}</h1>
  <div class="lab-prose">${p.html}</div>
  <p class="dna mono" aria-hidden="true">BY &nbsp; 01000010 01011001<br>42 59</p>
  <div style="height:clamp(56px,9vw,130px)"></div>
</div>`;
  emit(lang, '/lab/', layout(lang, { path: '/lab/', title: t.labTitle, desc: t.labDesc, main, bodyClass: 'page-lab' }));
}

function aboutPage(lang) {
  const t = T[lang];
  const p = page('about', lang);
  const main = `<div class="wrap">
  <h1 class="page-title" style="font-size:clamp(2.2rem,5vw,4rem);padding-block-end:0">${esc(t.aboutTitle)}</h1>
  <div class="about-grid section" style="padding-block-start:clamp(24px,4vw,56px)">
    <aside class="about-aside">
      ${blobSvg('blob-mini', 2.4)}
      <p class="display about-name">${esc(p.data.name)}</p>
      <p class="mono caps muted" style="margin-top:8px">${esc(p.data.role)} · Blue Yolk</p>
    </aside>
    <div class="prose lead-first">${p.html}
      <p><a class="mono arrow-link caps" href="${href(lang, '/contact/')}">${esc(t.inviteAction)} ${ARROW}</a></p>
    </div>
  </div>
</div>`;
  emit(lang, '/about/', layout(lang, { path: '/about/', title: t.aboutTitle, desc: t.aboutDesc, main, bodyClass: 'page-about' }));
}

function contactPage(lang) {
  const t = T[lang];
  const main = `<div class="wrap">
  <h1 class="page-title">${esc(t.contactTitle)}</h1>
  <p class="page-intro">${esc(t.contactBody)}</p>
  <a class="contact-mail" href="mailto:${SITE.email}">${SITE.email}</a>
  <ul class="mono" style="list-style:none;padding:0;margin:0 0 clamp(56px,9vw,130px)">
    <li><a href="${SITE.instagram}" rel="noopener" target="_blank">EZ · ${esc(t.contactEz)} ${ARROW}</a></li>
  </ul>
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

/* ---------- run ---------- */
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

if (existsSync(join(ROOT, 'public'))) cpSync(join(ROOT, 'public'), DIST, { recursive: true });
write('assets/style.css', css);
write('assets/app.js', js);
for (let n = 1; n <= plateCount; n++) write(`img/plate-${n}.svg`, plate(n));

for (const lang of LANGS) {
  home(lang); workIndex(lang); journalIndex(lang); labPage(lang); aboutPage(lang); contactPage(lang);
  work[lang].forEach((ex, i) => exhibitPage(lang, ex, i));
  journal[lang].forEach((p) => postPage(lang, p));
}
notFound();

const paths = ['/', '/work/', ...work.en.map((e) => `/work/${e.slug}/`), '/journal/', ...journal.en.map((p) => `/journal/${p.slug}/`), '/lab/', '/about/', '/contact/'];
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
`);

console.log(`Built ${paths.length * 2 + 1} pages into ${DIST}`);
