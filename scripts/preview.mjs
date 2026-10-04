// Makes a copy of ./dist whose links work from any sub-folder (relative paths, explicit index.html),
// so the whole site can be previewed from a static host that has no root. Usage: node scripts/preview.mjs <outDir>
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync, rmSync, cpSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const OUT = process.argv[2];
if (!OUT) throw new Error('give an output directory');
const SITE = join(OUT, 's');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(SITE, { recursive: true });
cpSync(DIST, SITE, { recursive: true });
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
for (const f of walk(SITE).filter((x) => x.endsWith('.html'))) {
  const depth = relative(SITE, dirname(f)).split('/').filter(Boolean).length;
  const up = '../'.repeat(depth);
  let html = readFileSync(f, 'utf8');
  html = html.replace(/(href|src)="(\/[^"/][^"]*|\/)"/g, (_, attr, url) => {
    const m = url.match(/^([^?#]*)([?#].*)?$/);
    let p = m[1].replace(/^\//, ''); const tail = m[2] || '';
    if (p === '' || p.endsWith('/')) p += 'index.html';
    return `${attr}="${up}${p}${tail}"`;
  });
  writeFileSync(f, html);
}
writeFileSync(join(OUT, 'index.html'), `<title>Blue Yolk Preview</title>
<style>
:root{--bg:#F2F3F7;--fg:#0B0D14;--accent:#1F41E0}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#0B0D14;--fg:#F2F3F7;--accent:#8EA2FF}}
:root[data-theme="dark"]{--bg:#0B0D14;--fg:#F2F3F7;--accent:#8EA2FF}
body{background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,sans-serif;padding-inline:20px;padding-block:48px;max-width:40rem;margin-inline:auto}
a{color:var(--accent)}h1{font-weight:500;margin:0 0 .5rem}
</style>
<h1>Blue Yolk preview</h1>
<p>Private working preview of blueyolk.org. Stand-in content is tagged on every page.</p>
<ul>
<li><a href="s/index.html">English</a></li>
<li><a href="s/ar/index.html">العربية</a></li>
</ul>
`);
console.log('preview written to', OUT);
