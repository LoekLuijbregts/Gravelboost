export interface GpxData {
  slug: string;
  distanceKm: number;
  ascentM: number;
  descentM: number;
  minM: number;
  maxM: number;
  start: [number, number];
  bbox: [number, number, number, number];
  preview: boolean;
  line: [number, number][];
  profile: [number, number][];
}

const files = import.meta.glob<GpxData>('../data/gpx/*.json', { eager: true, import: 'default' });

export function getGpx(slug?: string): GpxData | null {
  if (!slug) return null;
  return files[`../data/gpx/${slug}.json`] ?? null;
}
