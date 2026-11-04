import { getCollection, getEntries } from 'astro:content';
import { getGpx } from './gpx';

export const journeyHref = (id: string) => (id === 'all-along-the-watchtowers' ? '/bundles/all-along-the-watchtowers/' : `/journeys/${id}/`);

export async function getRides() {
  const journeys = await getCollection('journeys');
  const rides = [];
  for (const j of journeys) {
    const products = await getEntries(j.data.products);
    const buyable = products.some((p) => p.data.shopifyUrl);
    for (const l of j.data.loops) {
      const g = getGpx(l.gpx);
      if (!g) continue;
      const photo = j.data.photos.find((p) => p.file === l.cover) ?? j.data.photos[0];
      rides.push({
        id: `${j.id}-${l.id}`,
        title: j.data.shortName ? `${j.data.shortName}: ${l.name}` : l.name,
        href: `${journeyHref(j.id)}#loop-${l.id}`,
        bike: l.activity,
        km: g.distanceKm,
        ascent: g.ascentM,
        level: l.level ?? j.data.level,
        time: l.time,
        stationKm: l.stationKm,
        station: j.data.start.station,
        surface: l.surface,
        set: j.data.photoSet,
        photo,
        free: Boolean(l.freeGpxUrl),
        buyable,
        paid: j.data.provenance.paid,
      });
    }
  }
  return rides.sort((a, b) => a.km - b.km);
}
