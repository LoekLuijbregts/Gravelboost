declare global {
  interface Window {
    dataLayer: unknown[];
    gbTrack: (name: string, params?: Record<string, unknown>) => void;
  }
}

const KEY = 'gb-consent';
const body = document.body;
const GA = body.dataset.ga ?? '';

window.dataLayer = window.dataLayer || [];
function gtag(..._args: unknown[]) {
  window.dataLayer.push(arguments);
}
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  wait_for_update: 500,
});

let granted = false;
const waiting: (() => void)[] = [];

function read() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
function write(v: string) {
  try {
    localStorage.setItem(KEY, v);
  } catch {}
}

function grant() {
  if (granted) return;
  granted = true;
  gtag('consent', 'update', { analytics_storage: 'granted' });
  if (GA) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA)}`;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA, { anonymize_ip: true });
  }
  waiting.splice(0).forEach((f) => f());
}

function revoke() {
  granted = false;
  gtag('consent', 'update', { analytics_storage: 'denied' });
}

window.gbTrack = (name, params = {}) => {
  if (!granted || !GA) return;
  gtag('event', name, params);
};

function whenGranted(f: () => void) {
  if (granted) f();
  else waiting.push(f);
}

const banner = document.getElementById('consent');
function decide(v: 'granted' | 'denied') {
  write(v);
  if (banner) banner.hidden = true;
  if (v === 'granted') grant();
  else revoke();
}
const saved = read();
if (saved === 'granted') grant();
else if (saved !== 'denied' && banner) banner.hidden = false;
document.getElementById('consent-accept')?.addEventListener('click', () => decide('granted'));
document.getElementById('consent-decline')?.addEventListener('click', () => decide('denied'));
document.querySelectorAll('[data-consent-open]').forEach((b) =>
  b.addEventListener('click', () => {
    if (banner) banner.hidden = false;
  }),
);

if (body.dataset.view) {
  const name = body.dataset.view + '_view';
  whenGranted(() => window.gbTrack(name, { item_name: body.dataset.viewName ?? '' }));
}

document.addEventListener('click', (e) => {
  const el = (e.target as Element).closest<HTMLElement>('[data-event]');
  if (!el || !el.dataset.event) return;
  window.gbTrack(el.dataset.event, { label: el.dataset.label ?? '', link_url: (el as HTMLAnchorElement).href ?? '' });
});

document.querySelectorAll<HTMLButtonElement>('[data-share]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const status = document.getElementById('share-status');
    const data = { title: document.title, url: location.href };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(data.url);
      if (status) status.textContent = btn.dataset.msgCopied ?? 'Link copied. Paste it in a message to your phone.';
    } catch {
      location.href = `mailto:?subject=${encodeURIComponent(data.title)}&body=${encodeURIComponent(data.url)}`;
    }
  });
});

document.querySelectorAll<HTMLElement>('[data-komoot]').forEach((box) => {
  box.querySelector('button')?.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = `https://www.komoot.com/tour/${box.dataset.komoot}/embed?share_token=${box.dataset.token}&hl=en&layout=compact&line=4f6814`;
    f.title = box.dataset.title ?? 'Komoot';
    f.allow = 'fullscreen';
    f.loading = 'lazy';
    box.replaceChildren(f);
  });
});

document.querySelectorAll<HTMLFormElement>('form[data-form]').forEach((form) => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = form.querySelector<HTMLElement>('[role=status]');
    const say = (m: string) => {
      if (status) status.textContent = m;
    };
    const { portal, formId, form: kind } = form.dataset;
    if (!portal || !formId) {
      say(form.dataset.msgNotConnected ?? 'This form is not open yet. Write to loek@cyclingincubators.com.');
      return;
    }
    const fields = [...new FormData(form).entries()]
      .filter(([k, v]) => typeof v === 'string' && v.trim() && !k.startsWith('_'))
      .map(([name, value]) => ({ name, value: String(value) }));
    const context: Record<string, string> = { pageUri: location.href, pageName: document.title };
    if (granted) {
      const hutk = document.cookie.match(/hubspotutk=([^;]+)/)?.[1];
      if (hutk) context.hutk = hutk;
    }
    const btn = form.querySelector<HTMLButtonElement>('button[type=submit]');
    if (btn) btn.disabled = true;
    say(form.dataset.msgSending ?? 'Sending...');
    try {
      const res = await fetch(`https://api.hsforms.com/submissions/v3/integration/submit/${portal}/${formId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields, context }),
      });
      if (!res.ok) throw new Error(String(res.status));
      say(form.dataset.msgOk ?? 'Thanks. We got it.');
      form.reset();
      window.gbTrack(kind === 'request' ? 'request_submit' : 'newsletter_submit');
    } catch {
      say(form.dataset.msgError ?? 'Something went wrong. Please try again.');
    } finally {
      if (btn) btn.disabled = false;
    }
  });
});

function startHeroVideo() {
  const video = document.querySelector<HTMLVideoElement>('[data-hero-video]');
  if (!video) return;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || conn?.saveData) return;
  video.src = (innerWidth < 700 ? video.dataset.heroVideoSm : video.dataset.heroVideo) ?? '';
  video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });
  video.play().catch(() => {});
  const toggle = document.querySelector<HTMLButtonElement>('[data-video-toggle]');
  if (!toggle) return;
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    if (video.paused) {
      video.play().catch(() => {});
      toggle.textContent = toggle.dataset.labelPause ?? 'Pause video';
    } else {
      video.pause();
      toggle.textContent = toggle.dataset.labelPlay ?? 'Play video';
    }
  });
}
if (document.readyState === 'complete') startHeroVideo();
else addEventListener('load', () => setTimeout(startHeroVideo, 300), { once: true });
