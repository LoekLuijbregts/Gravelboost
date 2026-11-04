import sharp from 'sharp';
import path from 'node:path';

export type Ratio = 'hero' | 'card' | 'portrait' | 'orig';
const RATIOS: Record<Exclude<Ratio, 'orig'>, [number, number]> = { hero: [16, 9], card: [4, 3], portrait: [4, 5] };
const WIDTHS = [640, 960, 1280, 1600, 2000, 2560];

const cache = new Map<string, { width: number; height: number }>();

export async function dims(set: string, file: string) {
  const key = `${set}/${file}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const meta = await sharp(path.join(process.cwd(), 'public/photos', set, file)).metadata();
  const value = { width: meta.width ?? 1600, height: meta.height ?? 1067 };
  cache.set(key, value);
  return value;
}

function url(set: string, file: string, w: number, h: number | null, focus: string) {
  const src = `/photos/${set}/${file}`;
  if (import.meta.env.DEV) return src;
  const params = new URLSearchParams({ url: src, w: String(w), fm: 'webp', q: '84' });
  if (h) {
    params.set('h', String(h));
    params.set('fit', 'cover');
    params.set('position', focus);
  }
  return `/.netlify/images?${params}`;
}

export async function sources(set: string, file: string, ratio: Ratio, focus = 'center') {
  const orig = await dims(set, file);
  const r = ratio === 'orig' ? null : RATIOS[ratio];
  const maxW = r ? Math.min(orig.width, Math.floor((orig.height * r[0]) / r[1])) : orig.width;
  const widths = WIDTHS.filter((w) => w <= maxW);
  if (!widths.length) widths.push(maxW);
  const h = (w: number) => (r ? Math.round((w * r[1]) / r[0]) : null);
  const srcset = widths.map((w) => `${url(set, file, w, h(w), focus)} ${w}w`).join(', ');
  const mid = widths[Math.min(2, widths.length - 1)];
  const midH = r ? Math.round((mid * r[1]) / r[0]) : Math.round((mid * orig.height) / orig.width);
  return { srcset, src: url(set, file, mid, h(mid), focus), width: mid, height: midH };
}

export function fullSize(set: string, file: string) {
  return url(set, file, 2560, null, 'center');
}

export function autoRatio(w: number, h: number): Ratio {
  return h > w ? 'portrait' : 'card';
}

export async function heroPreload(set: string, file: string, focus = 'center') {
  const wide = await sources(set, file, 'hero', focus);
  const tall = await sources(set, file, 'portrait', focus);
  return [
    { srcset: tall.srcset, media: '(max-width: 640px)' },
    { srcset: wide.srcset, media: '(min-width: 641px)' },
  ];
}
