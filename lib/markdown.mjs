// A small, dependency-free Markdown reader: front matter, paragraphs, ## / ### headings,
// bullet lists, block quotes, **bold**, *italic*, [links](url) and `code`.

export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function parseFile(raw) {
  const m = raw.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 1) continue;
    let v = line.slice(i + 1).trim();
    if (v === 'true') v = true;
    else if (v === 'false') v = false;
    else if (/^-?\d+$/.test(v)) v = Number(v);
    data[line.slice(0, i).trim()] = v;
  }
  return { data, body: m[2].trim() };
}

function inline(s) {
  let t = esc(s);
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, url) => {
    const external = /^https?:/.test(url);
    return `<a href="${url}"${external ? ' rel="noopener" target="_blank"' : ''}>${text}</a>`;
  });
  return t;
}

export function render(md) {
  const out = [];
  const blocks = md.replace(/\r\n/g, '\n').split(/\n{2,}/);
  for (const block of blocks) {
    const b = block.trim();
    if (!b) continue;
    if (/^###\s/.test(b)) out.push(`<h3>${inline(b.replace(/^###\s+/, ''))}</h3>`);
    else if (/^##\s/.test(b)) out.push(`<h2>${inline(b.replace(/^##\s+/, ''))}</h2>`);
    else if (/^(-|\*)\s/.test(b)) {
      const items = b.split('\n').map((l) => l.replace(/^(-|\*)\s+/, ''));
      out.push(`<ul>${items.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>`);
    } else if (/^>\s?/.test(b)) {
      out.push(`<blockquote><p>${inline(b.split('\n').map((l) => l.replace(/^>\s?/, '')).join(' '))}</p></blockquote>`);
    } else out.push(`<p>${inline(b.split('\n').join(' '))}</p>`);
  }
  return out.join('\n');
}
