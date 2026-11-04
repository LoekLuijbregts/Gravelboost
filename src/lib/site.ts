export const SITE = 'https://gravelboost.com';
export const NAME = 'GravelBoost';
export const TAGLINE = 'Accessible adventures across Europe';

export const ENV = {
  ga4: import.meta.env.PUBLIC_GA4_ID ?? '',
  hubspotPortal: import.meta.env.PUBLIC_HUBSPOT_PORTAL_ID ?? '',
  newsletterForm: import.meta.env.PUBLIC_HUBSPOT_NEWSLETTER_FORM_ID ?? '',
  requestForm: import.meta.env.PUBLIC_HUBSPOT_REQUEST_FORM_ID ?? '',
  allowIndex: import.meta.env.PUBLIC_ALLOW_INDEX === 'true',
};

export const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
];

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const ANSWER_QUESTIONS: Record<string, string> = {
  surface: 'What will I actually ride on?',
  trafficFree: 'How much is free of cars?',
  access: 'Can I get through? Gates, closures, seasons?',
  foodWater: 'Where do I eat and fill my bottles?',
  gettingThere: 'How do I get there and back?',
  sleeping: 'Can I sleep with my bike?',
  ebike: 'Is it fine on an e-bike?',
  kids: 'Can I take the kids?',
};

export const KIND_LABEL: Record<string, string> = { eat: 'Eat', see: 'See', do: 'Do', stay: 'Stay' };
export const ACTIVITY_LABEL: Record<string, string> = { gravel: 'Gravel', mtb: 'Mountain bike', road: 'Road' };

export function euro(price: number) {
  return `€${Number.isInteger(price) ? price : price.toFixed(2)}`;
}

export function formatDate(d: Date | null) {
  return d ? d.toISOString().slice(0, 10) : null;
}
