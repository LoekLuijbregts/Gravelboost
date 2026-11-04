import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';

const srcDir = 'gpx-source';
const outDir = 'src/data/gpx';
const FREE = new Set(['tilburg-gravel-highlights', 'tilburg-mtb-highlights']);
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
const rad = (d) => (d * Math.PI) / 180;
const dist = (a, b) => {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(h));
};
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

function points(file) {
  const gpx = parser.parse(fs.readFileSync(file, 'utf8')).gpx;
  const pts = [];
  for (const trk of arr(gpx.trk)) for (const seg of arr(trk.trkseg)) for (const p of arr(seg.trkpt)) {
    pts.push({ lat: +p.lat, lon: +p.lon, ele: p.ele === undefined ? null : +p.ele });
  }
  return pts;
}

function smooth(values, n) {
  return values.map((_, i) => {
    const s = Math.max(0, i - n);
    const e = Math.min(values.length, i + n + 1);
    let sum = 0;
    for (let j = s; j < e; j++) sum += values[j];
    return sum / (e - s);
  });
}

function decimate(arr2, max) {
  if (arr2.length <= max) return arr2;
  const step = (arr2.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => arr2[Math.round(i * step)]);
}

function stats(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
  const raw = pts.map((p) => p.ele ?? 0);
  const ele = smooth(raw, 2);
  let up = 0;
  let down = 0;
  let ref = raw[0];
  for (const e of raw) {
    if (e - ref >= 2) { up += e - ref; ref = e; }
    else if (ref - e >= 2) { down += ref - e; ref = e; }
  }
  return { cum, ele, up, down };
}

fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(srcDir).filter((n) => n.endsWith('.gpx'))) {
  const slug = path.basename(f, '.gpx');
  const pts = points(path.join(srcDir, f));
  const { cum, ele, up, down } = stats(pts);
  const idx = pts.map((_, i) => i);
  const lineIdx = decimate(idx, FREE.has(slug) ? 500 : 160);
  const profIdx = decimate(idx, 140);
  const lats = pts.map((p) => p.lat);
  const lons = pts.map((p) => p.lon);
  const out = {
    slug,
    distanceKm: Math.round(cum.at(-1) * 10) / 10,
    ascentM: Math.round(up),
    descentM: Math.round(down),
    minM: Math.round(Math.min(...ele)),
    maxM: Math.round(Math.max(...ele)),
    start: [pts[0].lon, pts[0].lat],
    bbox: [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)].map((n) => Math.round(n * 1e4) / 1e4),
    preview: !FREE.has(slug),
    line: lineIdx.map((i) => [Math.round(pts[i].lon * 1e4) / 1e4, Math.round(pts[i].lat * 1e4) / 1e4]),
    profile: profIdx.map((i) => [Math.round(cum[i] * 10) / 10, Math.round(ele[i])]),
  };
  fs.writeFileSync(path.join(outDir, `${slug}.json`), JSON.stringify(out));
  console.log(slug, out.distanceKm + ' km', '+' + out.ascentM + ' m', '-' + out.descentM + ' m', `${pts.length} pts`);
}
