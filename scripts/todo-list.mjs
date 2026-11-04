import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

const dist = 'dist';
const skipLang = /^(nl|de|fr|es)$/;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return dir === dist && skipLang.test(e.name) ? [] : walk(p);
    return p.endsWith('.html') && e.name !== '404.html' ? [p] : [];
  });
}

const out = ['# Open items per page', '', 'Generated from the built site. Run `npm run build && npm run todo` to refresh.', ''];
for (const file of walk(dist).sort()) {
  const route = '/' + path.relative(dist, file).replace(/index\.html$/, '');
  const $ = cheerio.load(fs.readFileSync(file, 'utf8'));
  const items = [];
  $('mark.todo').each((_, m) => {
    const context = $(m).closest('li, dd, p, h3, h2, figcaption, span.btn, a, div').text().replace(/\s+/g, ' ').trim().slice(0, 140);
    items.push({ token: $(m).text(), context });
  });
  const byContext = new Map();
  for (const i of items) byContext.set(i.context, [...new Set([...(byContext.get(i.context) ?? []), i.token])]);
  const unique = [...byContext].map(([context, tokens]) => ({ context, token: tokens.join(' ') }));
  out.push(`## ${route}`, '');
  if (!unique.length) out.push('Nothing open.', '');
  else {
    for (const i of unique) out.push(`- ${i.context}`);
    out.push('');
  }
}
fs.writeFileSync('OPEN-ITEMS.md', out.join('\n'));
console.log('wrote OPEN-ITEMS.md');
