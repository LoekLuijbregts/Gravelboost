import { SITE } from './site';
import { euro } from './site';

export const abs = (p: string) => new URL(p, SITE).toString();

export function breadcrumbs(items: { name: string; href: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.href) })),
  };
}

export function destinationLd(d: { name: string; country: string; description: string; href: string; image?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: d.name,
    description: d.description,
    url: abs(d.href),
    containedInPlace: { '@type': 'Country', name: d.country },
    ...(d.image ? { image: abs(d.image) } : {}),
  };
}

export function tripLd(t: { name: string; description: string; href: string; image?: string; itinerary?: string[] }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: t.name,
    description: t.description,
    url: abs(t.href),
    touristType: 'Cyclists',
    ...(t.image ? { image: abs(t.image) } : {}),
    ...(t.itinerary?.length
      ? { itinerary: { '@type': 'ItemList', itemListElement: t.itinerary.map((n, i) => ({ '@type': 'ListItem', position: i + 1, name: n })) } }
      : {}),
  };
}

export function productLd(p: { name: string; description: string; price: number; currency: string; examplePrice: boolean; href: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    url: abs(p.href),
    brand: { '@type': 'Brand', name: 'GravelBoost' },
    ...(p.examplePrice
      ? {}
      : { offers: { '@type': 'Offer', price: p.price, priceCurrency: p.currency, availability: 'https://schema.org/InStock' } }),
  };
}

export const priceText = (p: { price: number; examplePrice: boolean }) => euro(p.price) + (p.examplePrice ? ' (example price)' : '');
