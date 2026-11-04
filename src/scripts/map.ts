interface Line {
  id: string;
  name: string;
  color: string;
  coords: [number, number][];
}

interface Point {
  name: string;
  coords: [number, number];
}

function start(box: HTMLElement) {
  const lines: Line[] = JSON.parse(box.dataset.map ?? '[]');
  const points: Point[] = JSON.parse(box.dataset.points ?? '[]');
  if (!lines.length && !points.length) return;
  Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')]).then(([ml]) => {
    const maplibregl = ml.default ?? ml;
    const map = new maplibregl.Map({
      container: box,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: (lines[0]?.coords[0] ?? points[0].coords) as [number, number],
      zoom: 10,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    const bounds = new maplibregl.LngLatBounds();
    lines.forEach((l) => l.coords.forEach((c) => bounds.extend(c)));
    points.forEach((p) => {
      bounds.extend(p.coords);
      new maplibregl.Marker({ color: '#C2410C' }).setLngLat(p.coords).setPopup(new maplibregl.Popup({ offset: 24 }).setText(p.name)).addTo(map);
    });
    map.on('load', () => {
      lines.forEach((l) => {
        map.addSource(l.id, {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: l.coords } },
        });
        map.addLayer({
          id: l.id,
          type: 'line',
          source: l.id,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': l.color, 'line-width': 4, 'line-opacity': 0.9 },
        });
      });
      map.fitBounds(bounds, { padding: 36, duration: 0 });
      box.querySelector('.map-fallback')?.remove();
    });
  });
}

function boot() {
  document.querySelectorAll<HTMLElement>('[data-map]').forEach((box) => {
    const io = new IntersectionObserver(
      (entries, obs) => {
        if (entries.some((e) => e.isIntersecting)) {
          obs.disconnect();
          start(box);
        }
      },
      { rootMargin: '300px' },
    );
    io.observe(box);
  });
}

if (document.readyState === 'complete') boot();
else window.addEventListener('load', boot, { once: true });
