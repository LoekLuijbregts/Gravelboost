import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const SITE = 'https://gravelboost.com';
const TARGETS = { nl: 'NL', de: 'DE', fr: 'FR', es: 'ES' };
const CACHE_DIR = 'translations';
const SKIP = new Set(['script', 'style', 'svg', 'noscript', 'iframe']);
const INLINE = new Set(['a', 'strong', 'em', 'b', 'i', 'span', 'mark', 'br', 'small', 'abbr', 'time']);
const ATTRS = ['alt', 'title', 'aria-label', 'placeholder'];
const TODO = /\[(?:PLACEHOLDER|CHECK|LINK)[^\]]*\]/g;
const NOTE = { text: 'Automatically translated.', link: 'Read the original in English' };

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : [];
  });
}

function routeOf(dist, file) {
  const rel = path.relative(dist, file).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel === '404.html') return null;
  return '/' + rel.replace(/index\.html$/, '');
}

function stripTodos($) {
  $('body *')
    .contents()
    .each((_, n) => {
      if (n.type === 'text' && !$(n).parents('script,style').length) n.data = n.data.replace(TODO, '');
    });
  $('main p:not(.status), main .meta, main .checked').each((_, el) => {
    if (!$(el).text().trim() && !$(el).find('img,svg,a,input').length) $(el).remove();
  });
}

function markTodos($) {
  const hits = [];
  $('body *')
    .contents()
    .each((_, n) => {
      if (n.type !== 'text' || !TODO.test(n.data)) return;
      TODO.lastIndex = 0;
      if ($(n).parents('script,style,mark').length) return;
      hits.push(n);
    });
  for (const n of hits) {
    const html = n.data
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(TODO, (m) => `<mark class="todo">${m}</mark>`);
    $(n).replaceWith(html);
  }
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const textToXml = (s) => esc(s).replace(TODO, (m) => `<x>${m}</x>`);
const xmlToText = (s) => unesc(s.replace(/<\/?x>/g, ''));

function htmlToXml($, el) {
  let h = $(el).html() ?? '';
  h = h.replace(/<mark class="todo">([\s\S]*?)<\/mark>/g, '<x>$1</x>').replace(/<br\s*>/g, '<br/>').replace(/&nbsp;/g, '&#160;');
  return h.trim();
}
const xmlToHtml = (s) => s.replace(/<x>([\s\S]*?)<\/x>/g, '<mark class="todo">$1</mark>').replace(/<br\/>/g, '<br>');

function hasLetters(s) {
  return /\p{L}/u.test(s.replace(/<[^>]+>/g, '').replace(/&\w+;/g, ''));
}

function isBlock($, el) {
  let ok = true;
  $(el)
    .find('*')
    .each((_, d) => {
      if (!INLINE.has(d.tagName)) ok = false;
    });
  return ok;
}

function collect($, hooks) {
  const visit = (el) => {
    if (SKIP.has(el.tagName) || $(el).attr('translate') === 'no' || $(el).hasClass('todo')) return;
    for (const a of ATTRS) {
      const v = $(el).attr(a);
      if (v && hasLetters(v)) hooks.attr(el, a, v);
    }
    for (const [k, v] of Object.entries(el.attribs ?? {})) {
      if (k.startsWith('data-msg-') && hasLetters(v)) hooks.attr(el, k, v);
    }
    if (el.tagName !== 'body' && el.tagName !== 'main' && isBlock($, el)) {
      const x = htmlToXml($, el);
      if (x && hasLetters(x)) hooks.block(el, x);
      return;
    }
    for (const c of el.children ?? []) {
      if (c.type === 'text') {
        const t = c.data.trim();
        if (t && hasLetters(t)) hooks.text(c, t);
      } else if (c.type === 'tag') visit(c);
    }
  };
  visit($('body')[0]);
  const title = $('title').first();
  if (title.length) hooks.title(title[0], title.text().trim());
  $('meta[name="description"], meta[property="og:title"], meta[property="og:description"]').each((_, m) => {
    const v = $(m).attr('content');
    if (v) hooks.meta(m, v);
  });
}

async function deepl(strings, lang, key) {
  const base = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  const out = [];
  for (let i = 0; i < strings.length; i += 40) {
    const batch = strings.slice(i, i + 40);
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(`${base}/v2/translate`, {
        method: 'POST',
        headers: { Authorization: `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: batch, source_lang: 'EN', target_lang: TARGETS[lang], tag_handling: 'xml', ignore_tags: ['x'], preserve_formatting: true }),
      });
      if (res.status === 429 && attempt < 5) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      if (!res.ok) throw new Error(`DeepL ${res.status}: ${await res.text()}`);
      const json = await res.json();
      out.push(...json.translations.map((t) => t.text));
      break;
    }
  }
  return out;
}

function loadCache(lang) {
  try {
    return JSON.parse(fs.readFileSync(path.join(CACHE_DIR, `${lang}.json`), 'utf8'));
  } catch {
    return {};
  }
}

function saveCache(lang, cache) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const sorted = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(path.join(CACHE_DIR, `${lang}.json`), JSON.stringify(sorted, null, 1) + '\n');
}

function pageImages($) {
  const seen = new Set();
  const add = (u) => {
    if (!u) return;
    const m = u.match(/[?&]url=([^&]+)/);
    const p = m ? decodeURIComponent(m[1]) : u;
    if (p.startsWith('/photos/')) seen.add(p);
  };
  $('img').each((_, i) => add($(i).attr('src')));
  $('source').each((_, s) => add(($(s).attr('srcset') ?? '').split(',')[0].trim().split(' ')[0]));
  return [...seen];
}

function isPage(href) {
  if (!href.startsWith('/') || href.startsWith('//')) return false;
  const p = href.split(/[?#]/)[0];
  if (/^\/(_astro|photos|\.netlify)/.test(p)) return false;
  return !/\.[a-z0-9]+$/i.test(p);
}

export default function translate() {
  return {
    name: 'gravelboost-post-build',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const dist = fileURLToPath(dir);
        const allowIndex = process.env.PUBLIC_ALLOW_INDEX === 'true';
        const key = process.env.DEEPL_API_KEY;
        const mock = process.env.TRANSLATE_MOCK === '1';
        const files = walk(dist);
        const pages = [];

        for (const file of files) {
          const route = routeOf(dist, file);
          const $ = cheerio.load(fs.readFileSync(file, 'utf8'));
          if (process.env.CONTEXT === 'production' && process.env.PUBLIC_SHOW_TODOS !== 'true') stripTodos($);
          else markTodos($);
          pages.push({ file, route, html: $.html(), $ });
        }
        const real = pages.filter((p) => p.route);

        const needed = new Set([NOTE.text, NOTE.link]);
        for (const p of real) {
          collect(p.$, {
            attr: (_, __, v) => needed.add(textToXml(v)),
            text: (_, t) => needed.add(textToXml(t)),
            block: (_, x) => needed.add(x),
            title: (_, t) => needed.add(textToXml(t)),
            meta: (_, v) => needed.add(textToXml(v)),
          });
        }

        const tables = {};
        for (const lang of Object.keys(TARGETS)) {
          const cache = loadCache(lang);
          const missing = [...needed].filter((s) => !(s in cache));
          if (missing.length && key && !mock) {
            try {
              const got = await deepl(missing, lang, key);
              missing.forEach((s, i) => (cache[s] = got[i]));
              saveCache(lang, cache);
              logger.info(`translated ${missing.length} strings to ${lang}`);
            } catch (e) {
              logger.warn(`DeepL failed for ${lang}: ${e.message}`);
            }
          }
          const still = [...needed].filter((s) => !(s in cache));
          if (!still.length) tables[lang] = cache;
          else if (mock) tables[lang] = new Proxy(cache, { get: (t, k) => (k in t ? t[k] : typeof k === 'string' ? `[${lang}] ${k}` : undefined) });
          else logger.warn(`no complete translation for ${lang} (${still.length} missing). Set DEEPL_API_KEY to build it.`);
        }
        const langs = Object.keys(tables);
        logger.info(`languages built: en${langs.map((l) => ', ' + l).join('')}`);

        const urlOf = (lang, route) => `${SITE}${lang === 'en' ? '' : '/' + lang}${route}`;
        const sitemap = [];

        const finish = ($, lang, route) => {
          if (langs.length) {
            const head = $('head');
            for (const l of ['en', ...langs]) head.append(`<link rel="alternate" hreflang="${l}" href="${urlOf(l, route)}">\n`);
            head.append(`<link rel="alternate" hreflang="x-default" href="${urlOf('en', route)}">\n`);
            $('[data-lang-link]').each((_, a) => {
              const l = $(a).attr('data-lang-link');
              if (l !== 'en' && !langs.includes(l)) $(a).parent().remove();
              else {
                $(a).attr('href', (l === 'en' ? '' : '/' + l) + route);
                if (l === lang) $(a).attr('aria-current', 'true');
              }
            });
            $('[data-lang-menu] summary').text(lang.toUpperCase());
          } else $('[data-lang-menu]').remove();
        };

        for (const p of pages) {
          if (!p.route) {
            fs.writeFileSync(p.file, p.$.html());
            continue;
          }
          const noindexPage = p.$('meta[name="gb-page-noindex"]').length > 0;
          const images = pageImages(p.$);
          const source = cheerio.load(p.$.html());
          finish(p.$, 'en', p.route);
          fs.writeFileSync(p.file, p.$.html());
          if (!noindexPage) sitemap.push({ route: p.route, lang: 'en', images });

          for (const lang of langs) {
            const $ = cheerio.load(source.html());
            const t = tables[lang];
            const tr = (x) => t[x];
            collect($, {
              attr: (el, a, v) => $(el).attr(a, xmlToText(tr(textToXml(v)))),
              text: (n, s) => {
                const lead = n.data.match(/^\s*/)[0];
                const trail = n.data.match(/\s*$/)[0];
                n.data = lead + xmlToText(tr(textToXml(s))) + trail;
              },
              block: (el, x) => $(el).html(xmlToHtml(tr(x))),
              title: (el, s) => $(el).text(xmlToText(tr(textToXml(s)))),
              meta: (el, v) => $(el).attr('content', xmlToText(tr(textToXml(v)))),
            });
            $('html').attr('lang', lang);
            $('link[rel="canonical"]').attr('href', urlOf(lang, p.route));
            $('meta[property="og:url"]').attr('href', urlOf(lang, p.route)).attr('content', urlOf(lang, p.route));
            $('a[href]').each((_, a) => {
              const h = $(a).attr('href');
              if ($(a).attr('data-lang-link') || !isPage(h)) return;
              $(a).attr('href', `/${lang}${h}`);
            });
            $('main#main').prepend(
              `<p class="auto-note"><span class="wrap" style="display:block">${esc(xmlToText(tr(NOTE.text)))} <a href="${p.route}">${esc(xmlToText(tr(NOTE.link)))}</a></span></p>`,
            );
            finish($, lang, p.route);
            const out = path.join(dist, lang, p.route === '/' ? '' : p.route, 'index.html');
            fs.mkdirSync(path.dirname(out), { recursive: true });
            fs.writeFileSync(out, $.html());
            if (!noindexPage) sitemap.push({ route: p.route, lang, images });
          }
        }

        const byRoute = new Map();
        for (const s of sitemap) byRoute.set(s.route, [...(byRoute.get(s.route) ?? []), s]);
        const urls = sitemap
          .map((s) => {
            const alts = langs.length
              ? ['en', ...langs]
                  .filter((l) => (byRoute.get(s.route) ?? []).some((x) => x.lang === l))
                  .map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${urlOf(l, s.route)}"/>`)
                  .join('')
              : '';
            const imgs = s.images.map((i) => `<image:image><image:loc>${SITE}${i}</image:loc></image:image>`).join('');
            return `<url><loc>${urlOf(s.lang, s.route)}</loc>${alts}${imgs}</url>`;
          })
          .join('\n');
        fs.writeFileSync(
          path.join(dist, 'sitemap.xml'),
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>\n`,
        );
        fs.writeFileSync(
          path.join(dist, 'robots.txt'),
          allowIndex ? `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n',
        );
        logger.info(`sitemap: ${sitemap.length} urls, indexing ${allowIndex ? 'allowed' : 'blocked (PUBLIC_ALLOW_INDEX is not true)'}`);
      },
    },
  };
}
