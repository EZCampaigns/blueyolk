// Sanity checks on ./dist: broken internal links, one <h1> per page, titles, hreflang pairs, duplicate ids.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(DIST);
const pages = files.filter((f) => f.endsWith('.html'));
const problems = [];
const resolves = (u) => {
  const p = u.split('#')[0].split('?')[0];
  if (!p) return true;
  const full = join(DIST, p);
  if (existsSync(full) && statSync(full).isFile()) return true;
  return existsSync(join(full, 'index.html'));
};
for (const f of pages) {
  const html = readFileSync(f, 'utf8');
  const rel = f.slice(DIST.length);
  for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) if (!resolves(m[1])) problems.push(`${rel}: broken link ${m[1]}`);
  for (const m of html.matchAll(/href="(https:\/\/blueyolk\.org[^"]*)"/g)) {
    if (!resolves(m[1].replace('https://blueyolk.org', ''))) problems.push(`${rel}: canonical/alternate points nowhere ${m[1]}`);
  }
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) problems.push(`${rel}: ${h1} <h1> elements`);
  if (!/<title>[^<]+<\/title>/.test(html)) problems.push(`${rel}: missing title`);
  if (!/<meta name="description" content="[^"]+"/.test(html)) problems.push(`${rel}: missing description`);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) problems.push(`${rel}: duplicate ids ${dup.join(',')}`);
  if (/\[object Object\]|undefined|NaN/.test(html.replace(/<script[\s\S]*?<\/script>/g, ''))) problems.push(`${rel}: stray undefined/NaN/[object Object]`);
  const isAr = rel.startsWith('/ar/');
  if (!/<html lang="(en|ar)" dir="(ltr|rtl)">/.test(html)) problems.push(`${rel}: html lang/dir`);
  if (isAr && !html.includes('lang="ar" dir="rtl"')) problems.push(`${rel}: Arabic page not rtl`);
  if (!isAr && rel !== '/404.html' && !html.includes('lang="en" dir="ltr"')) problems.push(`${rel}: English page not ltr`);
  // images need width/height and alt attribute
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt="/.test(m[0])) problems.push(`${rel}: <img> without alt`);
    if (!/\swidth="/.test(m[0])) problems.push(`${rel}: <img> without width`);
  }
}
// en/ar pairs
const en = pages.map((f) => f.slice(DIST.length)).filter((r) => !r.startsWith('/ar/') && r !== '/404.html');
for (const r of en) if (!existsSync(join(DIST, 'ar', r))) problems.push(`no Arabic twin for ${r}`);
console.log(`${pages.length} pages, ${files.length} files checked`);
if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
console.log('No problems found.');
