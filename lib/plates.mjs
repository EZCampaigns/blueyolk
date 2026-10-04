// Original, generated stand-in artwork for Blue Yolk, drawn in the brand's imagery language:
// dark frame, one coloured light, one idea per image, light film grain. Nothing here needs a licence.
// Replace plates with real stills by pointing an exhibit's `image:` front-matter field at a file.

export const BLUE = '#4262FF'; // Yolk Blue Lit (imagery on dark)
export const GOLD = '#F5B731'; // Yolk Gold

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

function grain(seed, opacity = 0.16) {
  return `<filter id="g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="${seed}"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 ${opacity}"/></feComponentTransfer></filter>`;
}
const light = (id, color, o = 1) => `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${o}"/><stop offset="0.45" stop-color="${color}" stop-opacity="${o * 0.45}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;

function wrap(seed, body, defs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"><defs>${grain(seed)}${defs}</defs><rect width="1600" height="1000" fill="#000"/>${body}<rect width="1600" height="1000" filter="url(#g)" style="mix-blend-mode:screen"/></svg>`;
}

const makers = {
  // 1. blue light low and to the right
  1() { return wrap(11, `<circle cx="1100" cy="620" r="560" fill="url(#a)"/>`, light('a', BLUE)); },
  // 2. a small gold light
  2() { return wrap(22, `<circle cx="560" cy="420" r="300" fill="url(#a)"/>`, light('a', GOLD, 0.95)); },
  // 3. blue light, top left, large and quiet
  3() { return wrap(33, `<circle cx="330" cy="260" r="720" fill="url(#a)"/>`, light('a', BLUE, 0.85)); },
  // 4. blue light cut into slices that drift apart
  4() {
    const r = rng(44); let bars = '';
    for (let i = 0; i < 12; i++) {
      const y = i * 84, shift = (r() - 0.5) * 220;
      bars += `<g clip-path="url(#c${i})"><circle cx="${f(900 + shift)}" cy="500" r="520" fill="url(#a)"/></g>`;
    }
    const clips = Array.from({ length: 12 }, (_, i) => `<clipPath id="c${i}"><rect x="0" y="${i * 84}" width="1600" height="76"/></clipPath>`).join('');
    return wrap(44, bars, light('a', BLUE) + clips);
  },
  // 5. gold light, motion blur streak
  5() { return wrap(55, `<ellipse cx="860" cy="520" rx="760" ry="130" fill="url(#a)"/>`, light('a', GOLD, 0.9)); },
  // 6. blue light behind a hard horizon
  6() { return wrap(66, `<circle cx="800" cy="640" r="620" fill="url(#a)"/><rect y="640" width="1600" height="360" fill="#000"/>`, light('a', BLUE)); },
  // 7. gold light cropped by the frame
  7() { return wrap(77, `<circle cx="1560" cy="300" r="620" fill="url(#a)"/>`, light('a', GOLD, 0.9)); },
  // 8. blue light, glitch bands
  8() {
    const r = rng(88); let bands = '';
    for (let i = 0; i < 6; i++) bands += `<rect x="${f(r() * 600)}" y="${f(r() * 900)}" width="${f(500 + r() * 800)}" height="${f(10 + r() * 22)}" fill="${BLUE}" opacity="0.5"/>`;
    return wrap(88, `<circle cx="760" cy="500" r="480" fill="url(#a)"/>${bands}`, light('a', BLUE, 0.9));
  },
};

export const plateCount = Object.keys(makers).length;

export const plateAlt = {
  en: [
    '',
    'Abstract study: a soft blue light low in a dark frame',
    'Abstract study: a small gold light in a dark frame',
    'Abstract study: a large, quiet blue light in the upper corner of a dark frame',
    'Abstract study: a blue light cut into horizontal slices that drift apart',
    'Abstract study: a gold light stretched by motion blur',
    'Abstract study: a blue light resting on a hard horizon',
    'Abstract study: a gold light cropped by the edge of a dark frame',
    'Abstract study: a blue light with thin glitch bands',
  ],
  ar: [
    '',
    'دراسة تجريدية: ضوء أزرق ناعم في أسفل إطار معتم',
    'دراسة تجريدية: ضوء ذهبي صغير في إطار معتم',
    'دراسة تجريدية: ضوء أزرق كبير وهادئ في زاوية إطار معتم',
    'دراسة تجريدية: ضوء أزرق مقسوم إلى شرائح أفقية تتباعد',
    'دراسة تجريدية: ضوء ذهبي ممتد بتأثير حركة',
    'دراسة تجريدية: ضوء أزرق يستقر على أفق حاد',
    'دراسة تجريدية: ضوء ذهبي يقطعه حد إطار معتم',
    'دراسة تجريدية: ضوء أزرق مع خطوط تشويش رفيعة',
  ],
};

export function plate(n) {
  const make = makers[n];
  if (!make) throw new Error(`No plate ${n}`);
  return make();
}
