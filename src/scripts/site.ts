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

const finder = document.querySelector<HTMLElement>('[data-finder]');
if (finder) {
  const tiles = [...finder.querySelectorAll<HTMLElement>('[data-ride]')];
  const grid = tiles[0]?.parentElement;
  const count = finder.querySelector<HTMLElement>('[data-count]');
  const empty = finder.querySelector<HTMLElement>('[data-empty]');
  const clear = finder.querySelector<HTMLButtonElement>('[data-clear]');
  const sort = finder.querySelector<HTMLSelectElement>('[data-sort]');
  const params = new URLSearchParams(location.search);
  const state: Record<string, string> = {};
  for (const k of ['bike', 'length', 'level', 'train']) {
    const v = params.get(k);
    if (v) state[k] = v;
  }
  finder.querySelector<HTMLElement>('[data-controls]')?.removeAttribute('hidden');
  const matches = (t: HTMLElement) => {
    const km = Number(t.dataset.km);
    const level = Number(t.dataset.level);
    if (state.bike && t.dataset.bike !== state.bike) return false;
    if (state.length === 'short' && km >= 70) return false;
    if (state.length === 'mid' && (km < 70 || km > 100)) return false;
    if (state.length === 'long' && km <= 100) return false;
    if (state.level === 'easier' && level > 2) return false;
    if (state.level === 'harder' && level < 3) return false;
    if (state.train && Number(t.dataset.station) >= 1) return false;
    return true;
  };
  const render = () => {
    let shown = 0;
    for (const t of tiles) {
      t.hidden = !matches(t);
      if (!t.hidden) shown++;
    }
    finder.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((b) => {
      b.setAttribute('aria-pressed', String(state[b.dataset.filter ?? ''] === b.dataset.value));
    });
    if (count) count.textContent = (count.dataset.msgCount ?? '{n} rides').replace('{n}', String(shown));
    if (empty) empty.hidden = shown > 0;
    if (clear) clear.hidden = Object.keys(state).length === 0;
    const q = new URLSearchParams(state).toString();
    history.replaceState(null, '', q ? `?${q}${location.hash}` : location.pathname + location.hash);
  };
  finder.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((b) =>
    b.addEventListener('click', () => {
      const k = b.dataset.filter ?? '';
      if (state[k] === b.dataset.value) delete state[k];
      else state[k] = b.dataset.value ?? '';
      render();
    }),
  );
  clear?.addEventListener('click', () => {
    Object.keys(state).forEach((k) => delete state[k]);
    render();
  });
  sort?.addEventListener('change', () => {
    const key = sort.value === 'level' ? 'level' : sort.value === 'station' ? 'station' : 'km';
    [...tiles]
      .sort((a, b) => Number(a.dataset[key]) - Number(b.dataset[key]) || Number(a.dataset.km) - Number(b.dataset.km))
      .forEach((t) => grid?.appendChild(t));
  });
  render();
}

const lightbox = document.getElementById('lightbox') as HTMLDialogElement | null;
if (lightbox) {
  const img = lightbox.querySelector('img');
  const cap = lightbox.querySelector('.lightbox-cap');
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('[data-zoom]');
    if (!a || !img) return;
    e.preventDefault();
    const thumb = a.querySelector('img');
    img.src = a.href;
    img.alt = thumb?.alt ?? '';
    if (cap) cap.textContent = a.closest('figure')?.querySelector('figcaption')?.textContent ?? '';
    lightbox.showModal();
  });
  lightbox.addEventListener('click', (e) => {
    const t = e.target as Element;
    if (t === lightbox || t.closest('[data-lightbox-close]')) lightbox.close();
  });
}

const place = new URLSearchParams(location.search).get('place');
const message = document.querySelector<HTMLTextAreaElement>('textarea[name=message]');
if (place && message && /^[\p{L} -]{2,40}$/u.test(place)) {
  message.value = (message.dataset.msgPrefill ?? 'I would love a guide for {place}.').replace('{place}', place);
}
