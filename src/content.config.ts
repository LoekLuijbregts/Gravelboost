import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

const month = z.number().int().min(1).max(12);

const photo = z.object({
  file: z.string(),
  alt: z.string(),
  credit: z.string(),
  caption: z.string().optional(),
  focus: z.enum(['center', 'top', 'bottom', 'left', 'right']).default('center'),
});

const answer = z.object({
  answer: z.string(),
  checked: z.coerce.date().nullable().default(null),
});

const honestAnswers = z.object({
  surface: answer,
  trafficFree: answer,
  access: answer,
  foodWater: answer,
  gettingThere: answer,
  sleeping: answer,
  ebike: answer,
  kids: answer,
});

const offTheBike = z.object({
  title: z.string(),
  kind: z.enum(['eat', 'see', 'do', 'stay']),
  place: z.string(),
  when: z.enum(['before', 'after']).default('after'),
  why: z.string(),
});

const provenance = z.object({
  text: z.string(),
  paid: z.boolean().default(false),
  paidBy: z.string().optional(),
});

const partnerPerk = z.object({
  partner: z.string(),
  perk: z.string(),
});

const loop = z.object({
  id: z.string(),
  name: z.string(),
  activity: z.enum(['gravel', 'mtb', 'road']),
  gpx: z.string().optional(),
  level: z.number().int().min(1).max(5).optional(),
  surface: z.string(),
  summary: z.string(),
  towers: z.array(z.string()).optional(),
  komootTourId: z.string().optional(),
  freeGpxUrl: z.string().optional(),
  cover: z.string().optional(),
});

const stop = z.object({
  name: z.string(),
  station: z.string().optional(),
});

const journeys = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/journeys' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    destination: reference('destinations'),
    days: z.string(),
    routeNote: z.string().optional(),
    level: z.number().int().min(1).max(5),
    bestMonths: z.array(month),
    bestMonthsNote: z.string().optional(),
    start: stop,
    end: stop,
    loops: z.array(loop).min(1),
    photoSet: z.string(),
    photos: z.array(photo).min(1),
    honestAnswers,
    offTheBike: z.array(offTheBike).default([]),
    offTheBikePreview: z.string().optional(),
    provenance,
    partnerOffer: z.array(partnerPerk).default([]),
    products: z.array(reference('products')).default([]),
    towers: z.array(z.object({ name: z.string(), place: z.string(), note: z.string().optional() })).default([]),
    noindex: z.boolean().default(false),
  }),
});

const destinations = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/destinations' }),
  schema: z.object({
    name: z.string(),
    country: z.string(),
    description: z.string(),
    intro: z.string(),
    href: z.string(),
    bestMonths: z.array(month),
    bestMonthsNote: z.string().optional(),
    arrival: z.string(),
    basePlaces: z.array(reference('places')).default([]),
    journeys: z.array(reference('journeys')).default([]),
    trips: z
      .array(
        z.object({
          title: z.string(),
          area: z.string(),
          days: z.string(),
          distanceKm: z.string(),
          ascentM: z.string(),
          level: z.string(),
          summary: z.string(),
          access: z.enum(['preview', 'guide']),
        }),
      )
      .default([]),
    stops: z.array(reference('places')).default([]),
    offTheBike: z.array(offTheBike).default([]),
    photoSet: z.string(),
    photos: z.array(photo).min(1),
    visited: z.string(),
    provenance,
    products: z.array(reference('products')).default([]),
    guide: z.boolean().default(false),
    noindex: z.boolean().default(false),
  }),
});

const products = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/products' }),
  schema: z.object({
    name: z.string(),
    kind: z.enum(['pack', 'bundle']),
    summary: z.string(),
    contents: z.array(z.string()),
    price: z.number(),
    currency: z.string().default('EUR'),
    examplePrice: z.boolean().default(false),
    shopifyUrl: z.string().default(''),
    partnerPerks: z.array(partnerPerk).default([]),
  }),
});

const events = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/events' }),
  schema: z.object({
    name: z.string(),
    organiser: z.string(),
    place: reference('places'),
    nextEdition: z.coerce.date().nullable().default(null),
    registrationPaidBy: z.string(),
    url: z.string().optional(),
  }),
});

const places = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/places' }),
  schema: z.object({
    name: z.string(),
    kind: z.enum(['town', 'station', 'tower', 'food', 'sight', 'stay', 'region']),
    coordinates: z.tuple([z.number(), z.number()]).optional(),
    why: z.string(),
  }),
});

export const collections = { journeys, destinations, products, events, places };
