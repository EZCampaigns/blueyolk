// Original, generated stand-in artwork for Blue Yolk.
// Every plate is drawn from code in the brand palette, so there is nothing to license.
// Replace plates with real stills by pointing an exhibit's `image:` front-matter field at a file.

export const C = '#1F41E0'; // cobalt
export const P = '#F2F3F7'; // ink-white
export const I = '#0B0D14'; // near-black
export const Y = '#F2B632'; // yolk

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n) => Math.round(n * 100) / 100;

export function smooth(pts) {
  const n = pts.length;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}

// A slightly irregular closed blob, like the logo.
function blob(cx, cy, r, rand, irregular = 0.07, n = 10) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n;
    const k = 1 + (rand() - 0.5) * 2 * irregular;
    pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]);
  }
  return smooth(pts);
}

function grain(seed, opacity = 0.1) {
  return `<filter id="g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${seed}"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 ${opacity}"/></feComponentTransfer></filter>`;
}

function wrap(seed, body, defs = '', grainOpacity = 0.1) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"><defs>${grain(seed, grainOpacity)}${defs}</defs>${body}<rect width="1600" height="1000" filter="url(#g)" style="mix-blend-mode:multiply"/></svg>`;
}

const makers = {
  // 1. One large blob and one small yolk on paper
  1() {
    const r = rng(11);
    return wrap(11, `<rect width="1600" height="1000" fill="${P}"/>
<path d="${blob(1010, 500, 340, r)}" fill="${C}"/>
<path d="${blob(560, 650, 70, r, 0.1)}" fill="${Y}"/>`);
  },
  // 2. Halftone fading from left to right
  2() {
    let dots = '';
    const step = 40;
    for (let y = step / 2; y < 1000; y += step) {
      for (let x = step / 2; x < 1600; x += step) {
        const t = 1 - x / 1600;
        const wave = 0.5 + 0.5 * Math.sin(y / 170);
        const rad = Math.max(0, (step / 2 - 1) * (t * 0.95 * (0.55 + 0.45 * wave)));
        if (rad > 1.2) dots += `<circle cx="${x}" cy="${y}" r="${f(rad)}"/>`;
      }
    }
    return wrap(22, `<rect width="1600" height="1000" fill="${P}"/><g fill="${C}">${dots}</g><circle cx="1180" cy="330" r="46" fill="${Y}"/>`);
  },
  // 3. Dark room, a beam of yolk light
  3() {
    const r = rng(33);
    return wrap(33, `<rect width="1600" height="1000" fill="${I}"/>
<polygon points="0,170 0,460 1180,1000 1600,1000 1600,720" fill="url(#beam)"/>
<circle cx="70" cy="315" r="95" fill="${Y}" opacity="0.9"/>
<path d="${blob(1290, 760, 120, r, 0.09)}" fill="${C}"/>`,
      `<linearGradient id="beam" x1="0" y1="0" x2="1" y2="0.5"><stop offset="0" stop-color="${Y}" stop-opacity="0.55"/><stop offset="1" stop-color="${Y}" stop-opacity="0"/></linearGradient>`, 0.14);
  },
  // 4. A blob made of shifted scanlines
  4() {
    const r = rng(44);
    let bars = '';
    const cx = 800, cy = 500, R = 390, h = 14;
    for (let y = cy - R; y < cy + R; y += h + 2) {
      const dy = y + h / 2 - cy;
      const half = Math.sqrt(Math.max(0, R * R - dy * dy));
      if (half < 4) continue;
      const shift = (r() - 0.5) * 140 * (Math.abs(dy) / R + 0.2);
      const trim = r() * 40;
      bars += `<rect x="${f(cx - half + shift + trim)}" y="${f(y)}" width="${f(Math.max(10, half * 2 - trim * 2))}" height="${h}"/>`;
    }
    return wrap(44, `<rect width="1600" height="1000" fill="${P}"/><g fill="${C}">${bars}</g>`);
  },
  // 5. A grid of small blobs, one of them yolk
  5() {
    const r = rng(55);
    let cells = '';
    const cols = 12, rows = 7, gx = 1600 / cols, gy = 1000 / rows;
    const special = Math.floor(r() * cols * rows);
    let k = 0;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const rad = 22 + r() * 30;
        cells += `<path d="${blob(gx * (i + 0.5), gy * (j + 0.5), rad, r, 0.12, 8)}" fill="${k === special ? Y : C}"/>`;
        k++;
      }
    }
    return wrap(55, `<rect width="1600" height="1000" fill="${P}"/>${cells}`);
  },
  // 6. Nested blobs
  6() {
    const r = rng(66);
    let rings = '';
    for (let i = 0; i < 8; i++) {
      const rad = 440 - i * 52;
      rings += `<path d="${blob(800, 500, rad, r, 0.045)}" fill="${i % 2 === 0 ? P : C}"/>`;
    }
    rings += `<path d="${blob(800, 500, 40, r, 0.1)}" fill="${Y}"/>`;
    return wrap(66, `<rect width="1600" height="1000" fill="${C}"/>${rings}`);
  },
  // 7. Cobalt field, paper blob cropped by the edge
  7() {
    const r = rng(77);
    return wrap(77, `<rect width="1600" height="1000" fill="${C}"/>
<path d="${blob(1380, 470, 430, r, 0.06)}" fill="${P}"/>
<circle cx="360" cy="700" r="58" fill="${I}"/>`);
  },
  // 8. Binary text, lit by a blob (BY = 01000010 01011001 = 42 59)
  8() {
    const r = rng(88);
    const line = '01000010 01011001 &#160;42 59 &#160;';
    let rowsTxt = '';
    for (let y = 30; y < 1000; y += 34) {
      rowsTxt += `<text x="-${Math.floor(r() * 300)}" y="${y}">${line.repeat(6)}</text>`;
    }
    return wrap(88, `<rect width="1600" height="1000" fill="${P}"/>
<g font-family="ui-monospace,Menlo,Consolas,monospace" font-size="26" fill="${C}" opacity="0.14">${rowsTxt}</g>
<g font-family="ui-monospace,Menlo,Consolas,monospace" font-size="26" fill="${C}" clip-path="url(#lit)">${rowsTxt}</g>`,
      `<clipPath id="lit"><path d="${blob(800, 500, 330, r, 0.06)}"/></clipPath>`);
  },
};

export const plateCount = Object.keys(makers).length;

export const plateAlt = {
  en: [
    '',
    'Abstract composition: a large cobalt blob and a small yellow one on a pale ground',
    'Abstract composition: cobalt halftone dots fading across a pale ground',
    'Abstract composition: a beam of warm light crossing a dark room',
    'Abstract composition: a cobalt blob built from shifted horizontal lines',
    'Abstract composition: a grid of small cobalt blobs with one yellow',
    'Abstract composition: nested cobalt and pale blobs around a yellow centre',
    'Abstract composition: a pale blob cropped by the edge of a cobalt field',
    'Abstract composition: lines of binary code lit inside a blob',
  ],
  ar: [
    '',
    'تكوين تجريدي: بقعة زرقاء كبيرة وأخرى صفراء صغيرة على أرضية فاتحة',
    'تكوين تجريدي: نقاط نصفية زرقاء تتلاشى عبر أرضية فاتحة',
    'تكوين تجريدي: شعاع ضوء دافئ يعبر غرفة معتمة',
    'تكوين تجريدي: بقعة زرقاء مبنية من خطوط أفقية متزحزحة',
    'تكوين تجريدي: شبكة من بقع زرقاء صغيرة وبقعة واحدة صفراء',
    'تكوين تجريدي: بقع زرقاء وفاتحة متداخلة حول مركز أصفر',
    'تكوين تجريدي: بقعة فاتحة يقطعها حد حقل أزرق',
    'تكوين تجريدي: أسطر من الشيفرة الثنائية مضاءة داخل بقعة',
  ],
};

export function plate(n) {
  const make = makers[n];
  if (!make) throw new Error(`No plate ${n}`);
  return make();
}
