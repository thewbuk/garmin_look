/* A real map under the route: raster tiles fetched once, stitched into one picture laid out in the
   track's own coordinates (RUN.meta.geo), then recoloured to the look. The picture is a data URL so it
   survives rasterize() for PNG export, and it sits inside the template's map group so it moves with it. */
const NS = 'http://www.w3.org/2000/svg';
const KEY = 'garminLook.basemap';

export const BASEMAPS = {
  terrain: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', max: 16, credit: 'Hillshade © Esri' },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', max: 18, credit: 'Imagery © Esri, Maxar, Earthstar Geographics' },
};
export const basemap = () => { try { const v = localStorage.getItem(KEY); return BASEMAPS[v] ? v : 'off'; } catch { return 'off'; } };
export function setBasemap(v) { try { localStorage.setItem(KEY, v); } catch { /* private mode */ } dispatchEvent(new Event('garminlook:look')); }

const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const tileX = (lon, z) => (lon + 180) / 360 * 2 ** z;
const tileY = (lat, z) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z; };
const lonOf = (x, z) => x / 2 ** z * 360 - 180;
const latOf = (y, z) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / 2 ** z))) * 180 / Math.PI;
const tile = src => new Promise(ok => { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => ok(img); img.onerror = () => ok(null); img.src = src; });

const cache = new Map();
/* The picture covering box units [-pad, size + pad] on both axes, `density` pixels per unit. */
export function picture(meta, look, kind, { pad = 0, density = 1.5 } = {}) {
  const g = meta.geo, B = BASEMAPS[kind];
  if (!g || !B) return Promise.resolve(null);
  const id = JSON.stringify([kind, look.key, g, meta.size, pad, density]);
  if (!cache.has(id)) cache.set(id, draw(meta, look, B, kind, pad, density).catch(e => { console.warn('basemap', e); cache.delete(id); return null; }));
  return cache.get(id);
}

async function draw(meta, look, B, kind, pad, density) {
  const g = meta.geo, S = meta.size, x0 = -pad, span = S + 2 * pad, px = Math.round(span * density);
  const lonAt = x => g.lonMin + (x - g.ox) / (g.kx * g.sc), latAt = y => g.latMax - (y - g.oy) / g.sc;
  const bx = lon => g.ox + (lon - g.lonMin) * g.kx * g.sc, by = lat => g.oy + (g.latMax - lat) * g.sc;
  const W = lonAt(x0), E = lonAt(x0 + span), N = latAt(x0), Sth = latAt(x0 + span), mid = (N + Sth) / 2;
  // the zoom whose pixels match ours, fewer if that would mean too many tiles
  const mpp = 111320 / g.sc / density;
  let z = Math.max(2, Math.min(B.max, Math.round(Math.log2(156543.03 * Math.cos(mid * Math.PI / 180) / mpp))));
  const range = z => [Math.floor(tileX(W, z)), Math.floor(tileX(E, z)), Math.floor(tileY(N, z)), Math.floor(tileY(Sth, z))];
  while (z > 2) { const [a, b, c, d] = range(z); if ((b - a + 1) * (d - c + 1) <= 144) break; z--; }
  const [tx0, tx1, ty0, ty1] = range(z), jobs = [];
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++)
    jobs.push(tile(B.url.replace('{z}', z).replace('{x}', tx).replace('{y}', ty)).then(img => ({ img, tx, ty })));
  const cv = Object.assign(document.createElement('canvas'), { width: px, height: px }), c = cv.getContext('2d');
  const tiles = await Promise.all(jobs);
  if (!tiles.some(t => t.img)) throw new Error('no tiles');
  for (const { img, tx, ty } of tiles) {
    if (!img) continue;
    const l = (bx(lonOf(tx, z)) - x0) * density, r = (bx(lonOf(tx + 1, z)) - x0) * density;
    const t = (by(latOf(ty, z)) - x0) * density, b = (by(latOf(ty + 1, z)) - x0) * density;
    c.drawImage(img, l, t, r - l + 0.6, b - t + 0.6);                      // a hair of overlap hides the seams
  }
  tint(c, px, look, kind);
  return { href: cv.toDataURL('image/jpeg', 0.86), x: x0, y: x0, size: span, credit: B.credit };
}

/* Terrain: the hillshade becomes light and shadow in the look's own colours. Satellite: kept, pulled toward the ground. */
function tint(c, px, look, kind) {
  const im = c.getImageData(0, 0, px, px), d = im.data, bg = hex(look.bg);
  if (kind === 'terrain') {
    // relief as one ramp from the ground toward the look's ink: plains sit a little above the ground,
    // shaded slopes sink back to it, lit ones rise toward the light (dark looks) or the ink (paper looks)
    const to = hex(look.dark ? look.fg : look.soft), [base, gain, top] = look.dark ? [0.13, 2.1, 0.52] : [0.14, -1.9, 0.55];
    let sum = 0, n = 0; for (let i = 0; i < d.length; i += 16) { sum += d[i]; n++; }
    const flat = sum / n / 255;
    for (let i = 0; i < d.length; i += 4) {
      const k = Math.max(0, Math.min(top, base + (d[i] / 255 - flat) * gain));
      for (let ch = 0; ch < 3; ch++) d[i + ch] = bg[ch] + (to[ch] - bg[ch]) * k;
    }
  } else {
    const keep = look.dark ? 0.62 : 0.72;
    for (let i = 0; i < d.length; i += 4) {
      const y = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
      for (let ch = 0; ch < 3; ch++) d[i + ch] = bg[ch] + ((d[i + ch] * 0.8 + y * 0.2) - bg[ch]) * keep;
    }
  }
  c.putImageData(im, 0, 0);
}

/* An SVG group to put first in a map group; the picture arrives when its tiles have. `fade` softens the edges
   into the background (moving maps); `clip` keeps it to the square (posters). `ready` resolves when it is in. */
let seq = 0;
export function layer(meta, look, { kind = basemap(), pad = 0, density, fade = 0.3, radius = 0, opacity = 1 } = {}) {
  const el = document.createElementNS(NS, 'g');
  const ready = picture(meta, look, kind, { pad, density }).then(p => {
    if (!p) return null;
    const id = `bm${++seq}`, mk = (tag, attrs, ...kids) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); kids.forEach(k => e.appendChild(k)); return e; };
    const cx = p.x + p.size / 2, R = p.size / 2;
    const defs = mk('defs', {},
      // a long, eased falloff so the edge never reads as a disc
      mk('radialGradient', { id: id + 'g', gradientUnits: 'userSpaceOnUse', cx, cy: cx, r: R },
        ...[[0, 1], [0.25, 0.97], [0.5, 0.85], [0.75, 0.55], [0.9, 0.22], [1, 0]].map(([o, a]) => mk('stop', { offset: 1 - fade + o * (fade - 0.02), 'stop-color': '#fff', 'stop-opacity': a })),
        mk('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 })),
      mk('mask', { id: id + 'm', maskUnits: 'userSpaceOnUse', x: p.x, y: p.y, width: p.size, height: p.size }, mk('rect', { x: p.x, y: p.y, width: p.size, height: p.size, fill: fade ? `url(#${id}g)` : '#fff', rx: radius })));
    el.replaceChildren(defs, mk('image', { href: p.href, x: p.x, y: p.y, width: p.size, height: p.size, preserveAspectRatio: 'none', mask: `url(#${id}m)`, opacity }));
    return p;
  });
  return { el, ready, kind, credit: BASEMAPS[kind]?.credit ?? '' };
}
