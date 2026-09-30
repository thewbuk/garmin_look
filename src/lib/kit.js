/* Shared by every template: formatting, words, DOM builder, looks, weather, audio and transport. */
import * as Runs from './runs';

const LOC = 'en-GB';

const NS = 'http://www.w3.org/2000/svg', HTML = new Set(['div', 'span', 'aside', 'section', 'i', 'b', 'p', 'h1', 'h2', 'h3', 'small', 'em', 'time', 'a', 'button', 'label', 'input']);
export const FRAME = 'relative flex-none overflow-hidden rounded-[6px] shadow-[0_24px_80px_#000c] w-(--w) h-(--h)';
export const LAYER = 'absolute inset-0', FB = '[transform-box:fill-box] origin-center', VIEWBOX = '[transform-box:view-box] origin-top-left', WORD = 'inline-block will-change-transform';
export const stageHTML = cls => `<div id="frame" class="${FRAME}"><div id="stage" class="absolute top-0 left-0 origin-top-left overflow-hidden ${cls}"></div></div>`;
// words as separate animatable spans (text only, never HTML); an element is wrapped as one word
export const wordEls = ws => ws.flatMap((w, i) => [i ? document.createTextNode(' ') : null, h('span', { 'data-word': '', class: WORD, text: typeof w === 'string' ? w : null }, typeof w === 'string' ? null : w)]).filter(Boolean);
// localStorage that may be blocked (private mode, cookies off)
export const stored = k => { try { return localStorage.getItem(k); } catch { return null; } };
export const remember = (k, v) => { try { localStorage.setItem(k, v); } catch { /* blocked */ } };
export function download(blob, file) {
  const url = URL.createObjectURL(blob), a = document.body.appendChild(Object.assign(document.createElement('a'), { href: url, download: file }));
  a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export function h(tag, attrs = {}, ...kids) {
  const e = HTML.has(tag) ? document.createElement(tag) : document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) { if (v == null) continue; if (k === 'text') e.textContent = v; else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v); }
  kids.flat().forEach(k => k && e.appendChild(k)); return e;
}
export const poly = pts => 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');
export const seeded = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
export const step = (span, max, steps) => steps.find(s => span / s <= max) || steps[steps.length - 1];

const UNITS_KEY = 'garminLook.units';
export const units = () => { try { return localStorage.getItem(UNITS_KEY) === 'mi' ? 'mi' : 'km'; } catch { return 'km'; } };
export const unitM = () => (units() === 'mi' ? 1609.344 : 1000);
export function setUnits(u) { try { localStorage.setItem(UNITS_KEY, u); } catch { /* private mode */ } dispatchEvent(new Event('garminlook:look')); }

export function fmt(RUN) {
  const M = RUN.meta, pad = n => String(n).padStart(2, '0');
  const hms = s => { s = Math.round(s); return `${Math.floor(s / 3600)}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`; };
  const pace = s => { s = Math.round(s); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
  const NF0 = new Intl.NumberFormat(LOC, { maximumFractionDigits: 0 }), NF1 = new Intl.NumberFormat(LOC, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const int = v => NF0.format(Math.round(v)), dec = (v, n = 1) => (n === 1 ? NF1.format(v) : v.toLocaleString(LOC, { minimumFractionDigits: n, maximumFractionDigits: n }));
  const START = new Date(M.startLocal), startSec = START.getHours() * 3600 + START.getMinutes() * 60 + START.getSeconds();
  const clock = s => { const c = startSec + s; return `${pad(Math.floor(c / 3600) % 24)}:${pad(Math.floor(c % 3600 / 60))}`; };
  const zone = b => M.zoneLow.reduce((z, lo, k) => (b >= lo ? k + 1 : z), 0);
  const dur = s => { const t = Math.round(s / 60), hh = Math.floor(t / 60), mm = t % 60; return hh ? `${hh} h ${mm} min` : `${mm} min`; };
  const U = unitM(), DU = units(), MI = DU === 'mi', pu = sPerKm => sPerKm * U / 1000;
  const ht = m => (MI ? m * 3.28084 : m), HU = MI ? 'ft' : 'm';
  const temp = c => (MI ? `${Math.round(c * 9 / 5 + 32)}°F` : `${Math.round(c)}°C`), wind = k => (MI ? `${Math.round(k / 1.609)} mph` : `${Math.round(k)} km/h`);
  return { pad, hms, pace, int, dec, clock, zone, dur, START, startSec, U, DU, MI, pu, ht, HU, temp, wind,
    DATE: START.toLocaleDateString(LOC, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), DAY: START.toLocaleDateString(LOC, { day: 'numeric', month: 'long', year: 'numeric' }) };
}

/* Weather is a pure function of timeline time, so scrubbing and export draw the same frame. */
export const sky = W => (!W ? null : W.snow ? 'snow' : W.rain ? 'rain' : /cloud|overcast|fog|mist|grey|gray/i.test(W.text || '') ? 'cloud' : 'clear');
export const weatherLine = (W, F) => (W ? [W.temp != null && F.temp(W.temp), W.text].filter(Boolean).join(' · ') : '');
const wrap = (v, n) => ((v % n) + n) % n;
// a soft radial disc drawn once and then stamped with drawImage, instead of a gradient per particle per frame
function sprite(stops, size = 128) {
  const c = Object.assign(document.createElement('canvas'), { width: size, height: size }), g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return c;
}
function scene(W, w, h, dark) {
  const kind = sky(W), r = seeded(7), wind = Math.min(1.4, (W?.wind ?? 8) / 20), temp = W?.temp ?? 12, m = Math.min(w, h), area = w * h;
  const tint = temp <= 3 ? `rgba(150,190,255,${dark ? 0.07 : 0.08})` : temp >= 25 ? `rgba(255,170,90,${dark ? 0.06 : 0.07})` : null;
  // [share, length, length spread, width, opacity, speed px/s]
  const DEPTHS = [[0.5, 18, 8, 0.7, 0.07, 1200], [0.33, 34, 12, 1, 0.15, 1650], [0.17, 66, 18, 1.4, 0.34, 2200]];
  const drops = kind === 'rain' ? DEPTHS.flatMap(([share, len, lv, wd, a, v], d) =>
    Array.from({ length: Math.round(area / 800 * share) }, () => ({ x: r() * (w + 300), y: r() * h, len: len + r() * lv, wd, a: a * (0.75 + r() * 0.5), v: v * (0.9 + r() * 0.2), d }))) : [];
  const nFlakes = Math.round(area / 6700), nNear = Math.max(3, Math.round(area / 350000)), bunches = Array.from({ length: 7 }, () => [r() * w, r() * h]);
  const flakes = kind === 'snow' ? Array.from({ length: nFlakes }, (_, k) => { const z = 0.3 + r() * 0.7, near = k < nNear, b = bunches[k % 7], loose = r() < 0.45;
    return { x: loose ? r() * w : b[0] + (r() - 0.5) * w * 0.35, y: loose ? r() * h : b[1] + (r() - 0.5) * h * 0.45, z, p: r() * 6.28,
      rad: near ? 9 + r() * 7 : 1 + 2 * r(), a: near ? 0.12 + r() * 0.06 : 0.2 + 0.35 * r(), near }; }) : [];
  const nClouds = kind === 'cloud' ? 6 : kind === 'rain' ? 5 : 0;
  const clouds = Array.from({ length: nClouds }, (_, k) => { const cw = w * (0.24 + r() * 0.16);
    return { x0: r() * (w + cw) - cw / 2, y0: h * (0.03 + r() * 0.11), cw, v: 6 + r() * 10, k,
      puffs: Array.from({ length: 11 + Math.floor(r() * 5) }, () => { const u = (r() - 0.5) * 0.75; return { dx: u * cw, dy: (r() - 0.5) * cw * 0.05 - (0.14 - u * u) * cw * 0.25, rad: cw * (0.04 + r() * 0.08) }; }) }; });
  const rainy = kind === 'rain', base = rainy ? (dark ? '96,110,118' : '120,116,108') : (dark ? '150,162,158' : '150,146,138'), lit = rainy ? (dark ? '160,174,180' : '184,180,172') : (dark ? '236,241,238' : '184,180,172');
  const ba = rainy ? (dark ? 0.14 : 0.1) : (dark ? 0.12 : 0.09), la = rainy ? (dark ? 0.1 : 0.05) : (dark ? 0.22 : 0.06), sc = dark ? '255,255,255' : '84,108,132';
  const S = { kind, tint, dark, w, h, m, wind, slant: 0.1 + wind * 0.2, drops, flakes, clouds, rc: dark ? '205,218,230' : '60,84,108' };
  if (clouds.length) Object.assign(S, {
    bank: sprite([[0, `rgba(${base},${ba * 1.1})`], [1, `rgba(${base},0)`]]),
    puff: sprite([[0, `rgba(${base},${ba})`], [0.6, `rgba(${base},${ba * 0.55})`], [1, `rgba(${base},0)`]]),
    lit: sprite([[0, `rgba(${lit},${la})`], [1, `rgba(${lit},0)`]]) });
  if (flakes.length) Object.assign(S, {
    flake: sprite([[0, `rgba(${sc},1)`], [0.25, `rgba(${sc},.55)`], [1, `rgba(${sc},0)`]], 32),
    bigFlake: sprite([[0, `rgba(${sc},1)`], [0.2, `rgba(${sc},.6)`], [1, `rgba(${sc},0)`]], 64) });
  if (kind === 'clear') {   // the rays, blurred once
    const R = Math.ceil(m * 0.3), c = Object.assign(document.createElement('canvas'), { width: R * 2, height: R * 2 }), g = c.getContext('2d');
    g.translate(R, R); g.filter = `blur(${Math.round(m * 0.008)}px)`;
    for (let k = 0; k < 14; k++) { g.rotate(Math.PI * 2 / 14); const L = m * (k % 3 ? 0.2 : 0.29), wd = m * (k % 2 ? 0.01 : 0.017), rg = g.createLinearGradient(0, 0, L, 0);
      rg.addColorStop(0, `rgba(255,228,176,${dark ? 0.09 : 0.11})`); rg.addColorStop(1, 'rgba(255,228,176,0)');
      g.fillStyle = rg; g.beginPath(); g.moveTo(0, 0); g.lineTo(L, -wd); g.lineTo(L, wd); g.fill(); }
    Object.assign(S, { rays: c, raysR: R });
  }
  return S;
}
function paint(g, S, t) {
  const { w, h, m, dark } = S;
  g.clearRect(0, 0, w, h);
  if (S.tint) { g.fillStyle = S.tint; g.fillRect(0, 0, w, h); }
  if (S.kind === 'rain') { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, dark ? 'rgba(4,10,16,.5)' : 'rgba(56,72,90,.22)'); gr.addColorStop(0.45, dark ? 'rgba(4,10,16,.2)' : 'rgba(56,72,90,.08)'); gr.addColorStop(1, dark ? 'rgba(4,10,16,.1)' : 'rgba(56,72,90,.03)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const mist = g.createLinearGradient(0, h * 0.72, 0, h); mist.addColorStop(0, 'rgba(210,222,232,0)'); mist.addColorStop(1, dark ? 'rgba(210,222,232,.12)' : 'rgba(255,255,255,.2)'); g.fillStyle = mist; g.fillRect(0, h * 0.72, w, h * 0.28); }
  if (S.kind === 'cloud') { const gr = g.createLinearGradient(0, 0, 0, h * 0.5); gr.addColorStop(0, dark ? 'rgba(170,182,178,.07)' : 'rgba(120,130,138,.1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h * 0.5); }
  for (const c of S.clouds) {
    const x = wrap(c.x0 + t * c.v * (0.6 + S.wind), w + c.cw * 1.4) - c.cw * 0.7, y = c.y0 + Math.sin(t * 0.08 + c.k) * 6, R = c.cw * 0.45;
    g.drawImage(S.bank, x - R, y + c.cw * 0.05 - R * 0.22, R * 2, R * 0.44);
    for (const p of c.puffs) { const px = x + p.dx, py = y + p.dy, lr = p.rad * 0.45;
      g.drawImage(S.puff, px - p.rad, py - p.rad * 0.62, p.rad * 2, p.rad * 1.24);
      g.drawImage(S.lit, px - lr, py - p.rad * 0.31 - lr * 0.62, lr * 2, lr * 1.24); } }
  if (S.kind === 'clear') {
    const x = w * 0.84, y = h * 0.13, pulse = 1 + 0.03 * Math.sin(t * 0.9);
    const bloom = g.createRadialGradient(x, y, 0, x, y, m * 0.85 * pulse); bloom.addColorStop(0, `rgba(255,214,160,${dark ? 0.16 : 0.24})`); bloom.addColorStop(1, 'rgba(255,214,160,0)');
    g.fillStyle = bloom; g.fillRect(0, 0, w, h);
    g.save(); g.translate(x, y); g.rotate(t * 0.03); g.drawImage(S.rays, -S.raysR, -S.raysR); g.restore();
    const glow = g.createRadialGradient(x, y, 0, x, y, m * 0.19 * pulse); glow.addColorStop(0, `rgba(255,233,196,${dark ? 0.26 : 0.6})`); glow.addColorStop(1, 'rgba(255,233,196,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(x, y, m * 0.19 * pulse, 0, 6.2832); g.fill();
    const cr = m * (dark ? 0.036 : 0.05), core = g.createRadialGradient(x, y, 0, x, y, cr); core.addColorStop(0, 'rgba(255,255,250,1)'); core.addColorStop(0.5, 'rgba(255,236,196,.6)'); core.addColorStop(1, 'rgba(255,226,176,0)');
    g.fillStyle = core; g.beginPath(); g.arc(x, y, cr, 0, 6.2832); g.fill();
    for (const [k, rad, col, a] of [[0.45, 0.022, '255,214,160', 0.11], [0.7, 0.014, '170,225,215', 0.1], [0.95, 0.034, '255,200,150', 0.08]]) {
      const gx = x + (w / 2 - x) * k, gy = y + (h / 2 - y) * k, gg = g.createRadialGradient(gx, gy, 0, gx, gy, m * rad);
      gg.addColorStop(0, `rgba(${col},${a})`); gg.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gg; g.beginPath(); g.arc(gx, gy, m * rad, 0, 6.2832); g.fill(); } }
  if (S.drops.length) {
    const gust = 0.8 + 0.2 * Math.sin(t * 0.5) * Math.sin(t * 0.21 + 1); g.lineCap = 'round';
    for (const d of S.drops) {
      const y = wrap(d.y + t * d.v, h + d.len * 2) - d.len, x = wrap(d.x - t * d.v * S.slant, w + 300) - 150, a = d.a * gust, x0 = x + d.len * S.slant, y0 = y - d.len;
      g.lineWidth = d.wd;
      if (d.d === 2) {   // near drops: a faint tail, a bright head
        g.strokeStyle = `rgba(${S.rc},${a * 0.3})`; g.beginPath(); g.moveTo(x0, y0); g.lineTo((x0 + x) / 2, (y0 + y) / 2); g.stroke();
        g.strokeStyle = `rgba(${S.rc},${a})`; g.beginPath(); g.moveTo((x0 + x) / 2, (y0 + y) / 2); g.lineTo(x, y); g.stroke();
      } else { g.strokeStyle = `rgba(${S.rc},${a})`; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x, y); g.stroke(); } } }
  for (const f of S.flakes) {
    const y = wrap(f.y + t * (22 + 55 * f.z) * (f.near ? 1.6 : 1), h + 40) - 20, x = wrap(f.x - t * S.wind * 40 * f.z + Math.sin(t * (0.6 + f.z) + f.p) * 22 * f.z, w + 40) - 20, R = f.rad * (f.near ? 1.6 : 2.2);
    g.globalAlpha = f.a; g.drawImage(f.near ? S.bigFlake : S.flake, x - R, y - R * 1.3, R * 2, R * 2.6); }
  g.globalAlpha = 1;
}
export function weatherLayer(W, w, h, dark) {
  const S = scene(W, w, h, dark), el = document.createElement('canvas'); el.width = w; el.height = h; el.className = 'absolute inset-0 pointer-events-none';
  const g = el.getContext('2d'); let last = null;
  return { el, draw: t => { if (t === last || !S.kind) return; last = t; paint(g, S, t / 1000); }, kind: S.kind };
}
export function weatherSvg(W, w, ht, dark) {
  const S = scene(W, w, ht, dark);
  if (!S.kind) return h('g', {});
  const cv = Object.assign(document.createElement('canvas'), { width: w, height: ht }); paint(cv.getContext('2d'), S, 12);
  return h('image', { href: cv.toDataURL('image/png'), width: w, height: ht, 'pointer-events': 'none' });
}
export const weatherControl = M => ({ now: M.weather || null, set: Runs.setWeather });

/* RUN.splits are per km; in miles they are re-measured from the track. `km` is in the unit, pace stays s/km. */
export function splits(RUN, F) {
  if (!F.MI) return { splits: RUN.splits, size: RUN.meta.splitKm };
  const T = RUN.track, n = T.d.length, D = RUN.meta.distance / F.U, size = D < 20 ? 1 : D < 80 ? 5 : 10, out = [];
  let i0 = 0, mark = size * F.U, up = 0, last = T.a[0], hs = 0, hn = 0;
  for (let i = 1; i < n; i++) {
    const dz = T.a[i] - last; if (Math.abs(dz) >= 2) { if (dz > 0) up += dz; last = T.a[i]; }
    if (T.h[i]) { hs += T.h[i]; hn++; }
    if (T.d[i] >= mark || i === n - 1) {
      const km = (T.d[i] - T.d[i0]) / 1000;
      if (km * 1000 >= size * F.U * 0.3) out.push({ km: Math.round(T.d[i] / F.U * 10) / 10, pace: Math.round((T.t[i] - T.t[i0]) / km), hr: hn ? Math.round(hs / hn) : 0, up: Math.round(up) });
      i0 = i; mark += size * F.U; up = 0; hs = hn = 0;
    }
  }
  return { splits: out.length ? out : RUN.splits, size };
}

export function words(RUN, F) {
  const M = RUN.meta, BPM = 'bpm';
  const kind = M.sport === 1 && M.subSport === 3 ? 'trail' : ({ 1: 'run', 2: 'ride', 11: 'walk', 17: 'hike' })[M.sport] || 'run';
  const SPORT = { run: 'Run', trail: 'Trail run', ride: 'Ride', walk: 'Walk', hike: 'Hike' }[kind];
  const hr = F.START.getHours(), part = hr < 5 ? 4 : hr < 11 ? 0 : hr < 14 ? 1 : hr < 17 ? 2 : hr < 22 ? 3 : 4;
  const NAME = M.name || `${['Morning', 'Midday', 'Afternoon', 'Evening', 'Night'][part]} ${SPORT.toLowerCase()}`, EVENT = M.event || '';
  const HIGH = 'Highest point', km = v => `${F.dec(v * 1000 / F.U)} ${F.DU}`;
  const K = (name, v) => (F.MI ? [name.replace(' km', 'K'), km(v)] : [name, '']), MI = (name, v) => [name, F.MI ? '' : km(v)];
  const MARK = { hr: 'Max heart rate', '5k': K('5 km', 5), '10k': K('10 km', 10), half: ['Half marathon', km(21.1)], mar: ['Marathon', km(42.2)], '50k': K('50 km', 50), '50mi': MI('50 miles', 80.5), '100k': K('100 km', 100), '100mi': MI('100 miles', 160.9) };
  return { BPM, SPORT, NAME, EVENT, TITLE: [NAME, EVENT].filter(Boolean).join(' · '), HIGH,
    mark: m => (m.k === 'high' ? [`${M.highName || HIGH} · ${F.int(F.ht(M.maxAlt))} ${F.HU}`, M.highName ? HIGH : ''] : m.k === 'hr' ? [`${m.v} ${BPM}`, MARK.hr] : MARK[m.k]),
    start: 'Start', startFinish: 'Start and finish', finish: 'Finish',
    ui: { play: 'Play', pause: 'Pause', sound: 'Sound', mute: 'Mute', exportMp4: 'Export MP4', exportVideo: 'Export video', stop: 'Stop', withSound: 'export with sound',
      yours: 'Use your run…', sample: 'Back to the sample', playback: 'Playback', colours: 'Colours', units: 'Units', weather: 'Weather', export: 'Export', run: 'Run', picture: 'Picture', templates: 'All templates', drop: 'drop a .fit or Garmin .zip anywhere',
      noRecord: 'This browser cannot record the page. Use Chrome or Edge on desktop.', choose: 'Choose “This tab” in the prompt. Keep this tab visible while it records.', cancelled: 'Export cancelled.',
      noCrop: 'This browser cannot crop to the frame, so the whole tab is recorded.', recording: 'Recording… the file downloads when the film ends.',
      saved: (file, mb, webm) => `Saved ${file} · ${mb} MB` + (webm ? ' (this browser records WebM, not MP4)' : '') } };
}

const ZONES_DARK = ['#8A9BA8', '#8A9BA8', '#4FA3E0', '#6CC24A', '#F5A623', '#E5484D'], ZONES_LIGHT = ['#9AA7B0', '#9AA7B0', '#2F86C8', '#4FA832', '#E8920C', '#D6353A'];
export const LOOKS = {
  night: { name: 'Night', dark: true, bg: '#0B1110', bg2: '#18231f', edge: '#070b0a', panel: '#131C19', line: '#24312C', fg: '#EEF1E7', soft: '#93A29B', accent: '#7FB069', signal: '#FF6B35', zones: ZONES_DARK },
  ocean: { name: 'Ocean', dark: true, bg: '#0A1122', bg2: '#16224A', edge: '#050913', panel: '#111B33', line: '#243258', fg: '#E8EEFB', soft: '#8E9CC0', accent: '#8AB8FF', signal: '#FFB23F', zones: ZONES_DARK },
  ember: { name: 'Ember', dark: true, bg: '#160E0B', bg2: '#2C1812', edge: '#0B0605', panel: '#211410', line: '#3D261E', fg: '#F8ECE4', soft: '#B79D90', accent: '#F2A65A', signal: '#FF5A36', zones: ZONES_DARK },
  paper: { name: 'Paper', dark: false, bg: '#F1EFE7', bg2: '#F7F5EF', edge: '#E6E3D8', panel: '#E7E4D9', line: '#D9D6CB', fg: '#16201C', soft: '#6B756F', accent: '#3F6B3A', signal: '#E5541F', zones: ZONES_LIGHT },
  snow: { name: 'Snow', dark: false, bg: '#FFFFFF', bg2: '#FFFFFF', edge: '#EDF0F3', panel: '#F1F3F5', line: '#E1E5EA', fg: '#0E1116', soft: '#687180', accent: '#1F6FEB', signal: '#F0503C', zones: ZONES_LIGHT },
};
const LOOK_KEY = 'garminLook.look';
const savedLook = () => { try { return localStorage.getItem(LOOK_KEY); } catch { return null; } };
/* `ground` names the template's background colour: 'ink' (dark-first) or 'paper' (paper-first). */
export function wear(root, fallback, ground = 'ink', force) {
  const key = LOOKS[force] ? force : LOOKS[savedLook()] ? savedLook() : fallback, L = { key, ...LOOKS[key] };
  const C = ground === 'ink' ? { ink: L.bg, peat: L.panel, line: L.line, paper: L.fg, soft: L.soft, moss: L.accent, signal: L.signal }
    : { paper: L.bg, ink: L.fg, peat: L.panel, line: L.line, soft: L.soft, moss: L.accent, signal: L.signal };
  Object.entries({ ...C, bg2: L.bg2, edge: L.edge }).forEach(([k, v]) => root.style.setProperty('--' + k, v));
  return { L, C, ZC: [...L.zones] };
}
export function setLook(key) { try { localStorage.setItem(LOOK_KEY, key); } catch { /* private mode */ } dispatchEvent(new Event('garminlook:look')); }

/* An SVG drawn onto a canvas cannot load page web fonts, so Inter is inlined as data URLs first. */
let fontCss = null;
async function inlineFonts() {
  if (fontCss) return fontCss;
  const faces = [];
  for (const sheet of document.styleSheets) { let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const r of rules) if (r instanceof CSSFontFaceRule && /inter/i.test(r.style.getPropertyValue('font-family'))) faces.push([r, sheet.href || location.href]); }
  const css = await Promise.all(faces.map(async ([r, base]) => {
    const url = r.style.getPropertyValue('src').match(/url\(["']?([^"')]+)["']?\)/)?.[1]; if (!url) return '';   // relative to its stylesheet
    const res = await fetch(new URL(url, base)); if (!res.ok) return '';
    const buf = await res.arrayBuffer(); let bin = ''; new Uint8Array(buf).forEach(b => { bin += String.fromCharCode(b); });
    return `@font-face{font-family:Inter;font-style:${r.style.getPropertyValue('font-style') || 'normal'};font-weight:${r.style.getPropertyValue('font-weight') || '100 900'};` +
      `unicode-range:${r.style.getPropertyValue('unicode-range') || 'U+0-10FFFF'};src:url(data:font/woff2;base64,${btoa(bin)}) format('woff2')}`;
  }));
  return (fontCss = css.join(''));
}
export async function rasterize(svgEl, w, h) {
  const copy = svgEl.cloneNode(true), style = document.createElementNS(NS, 'style');
  style.textContent = await inlineFonts(); copy.insertBefore(style, copy.firstChild);
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml' }));
  try {
    const img = new Image(); await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = url; });
    const cv = Object.assign(document.createElement('canvas'), { width: w, height: h }); cv.getContext('2d').drawImage(img, 0, 0, w, h);
    return cv;
  } finally { URL.revokeObjectURL(url); }
}

export function audio(paused) {
  const au = { AC: null, A: null,
    ok: () => au.A && !paused(),
    env(g, now, v, dur, att = 0.008) { g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(v, now + att); g.gain.exponentialRampToValueAtTime(0.0001, now + dur); },
    tone(f, dur, v, type = 'sine', delay = 0) { if (!au.ok()) return; const AC = au.AC, now = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f; au.env(g, now, v, dur); o.connect(g).connect(au.A.bus); o.start(now); o.stop(now + dur + 0.05); },
    noise(dur, v, f0, f1, q = 1, type = 'bandpass') { if (!au.ok()) return; const AC = au.AC, now = AC.currentTime, n = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
      n.buffer = au.A.noise; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, now); f.frequency.exponentialRampToValueAtTime(f1, now + dur * 0.8); au.env(g, now, v, dur, dur * 0.3); n.connect(f).connect(g).connect(au.A.bus); n.start(now); n.stop(now + dur + 0.05); },
    init() {
      const AC = au.AC = new (window.AudioContext || window.webkitAudioContext)();
      const master = AC.createGain(); master.gain.value = 0; master.connect(AC.destination);
      const len = AC.sampleRate * 2.4, ir = AC.createBuffer(2, len, AC.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
      const verb = AC.createConvolver(); verb.buffer = ir; const wet = AC.createGain(); wet.gain.value = 0.3; verb.connect(wet).connect(master);
      const bus = AC.createGain(); bus.connect(master); bus.connect(verb);
      const noise = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate), nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      au.A = { master, bus, noise };
      master.gain.setTargetAtTime(0.9, AC.currentTime, 0.5);
    } };
  return au;
}

export const WIDE = 1000, SIDE = 300;
export function store(state) {
  const fns = new Set();
  return { get: () => state, subscribe: fn => (fns.add(fn), () => fns.delete(fn)),
    set(patch) { if (Object.keys(patch).every(k => Object.is(patch[k], state[k]))) return; state = { ...state, ...patch }; fns.forEach(f => f()); } };
}
export function runControls(UI, look, signal, st) {
  const { pick } = Runs.attach({ signal, onError: note => st.set({ note }) });
  return { UI, look, looks: LOOKS, setLook, units: units(), setUnits, isSample: Runs.isSample(), pickRun: pick, backToSample: () => { Runs.clear(); location.reload(); } };
}

/* Call finishExport from the timeline's last frame. Export records the tab itself (the film is DOM + SVG,
   not a canvas) via getDisplayMedia, cropped to #frame with Region Capture. */
export function transport({ root, tl, total, W, H, chapters = [], frame = () => {}, au, UI, file = 'run', signal, look, resume, embed }) {
  const frameEl = root.querySelector('#frame'), stage = root.querySelector('#stage');
  // the time changes every frame, so it has its own store: only what shows it re-renders
  const st = store({ playing: true, sound: false, exporting: false, note: '' }), clk = store({ t: 0 });
  const note = txt => st.set({ note: txt });

  let exporting = null;
  const MIME = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
  const EXT = MIME.startsWith('video/mp4') ? 'mp4' : 'webm', FILE = `${file.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'run'}.${EXT}`, EXPORT = EXT === 'mp4' ? UI.exportMp4 : UI.exportVideo;
  function fit() { if (embed) { const w = frameEl.parentElement.clientWidth; frameEl.style.setProperty('--w', w + 'px'); frameEl.style.setProperty('--h', w * H / W + 'px'); stage.style.transform = `scale(${w / W})`; return; }
    const wide = innerWidth >= WIDE, roomW = wide ? innerWidth - SIDE - 72 : innerWidth * 0.95, roomH = wide ? innerHeight - 48 : innerHeight * 0.72;
    const fitW = Math.max(160, Math.min(roomW, roomH * W / H)), fullW = (W >= H ? 1920 : 1080) / devicePixelRatio;
    const w = exporting && fullW <= Math.min(roomW, innerHeight * 0.95 * W / H) ? fullW : fitW;   // export at 1080p when it fits
    frameEl.style.setProperty('--w', w + 'px'); frameEl.style.setProperty('--h', w * H / W + 'px'); stage.style.transform = `scale(${w / W})`; }
  if (embed) { const ro = new ResizeObserver(fit); ro.observe(frameEl.parentElement); signal?.addEventListener('abort', () => ro.disconnect()); }
  else addEventListener('resize', fit, { signal });
  fit();
  function seekTo(ms) { tl.seek(0); tl.seek(Math.max(0, Math.min(total - 1, ms))); clk.set({ t: tl.iterationCurrentTime }); }   // via 0: backwards seeks otherwise leave set() values behind
  function setPlaying(p) { if (p) tl.play(); else tl.pause(); st.set({ playing: p }); }
  const soundOn = () => { if (!au.A) au.init(); au.AC.resume(); au.A.master.gain.setTargetAtTime(0.9, au.AC.currentTime, 0.05); st.set({ sound: true }); };
  function toggleSound() { if (!au.A) { soundOn(); return; }
    const on = au.A.master.gain.value < 0.5; au.A.master.gain.setTargetAtTime(on ? 0.9 : 0, au.AC.currentTime, 0.2); st.set({ sound: on }); }

  async function startExport(withSound) {
    if (exporting) return stopExport(true);
    if (!navigator.mediaDevices?.getDisplayMedia || !MIME) { note(UI.noRecord); return; }
    let dest = null;
    if (withSound) { soundOn(); dest = au.AC.createMediaStreamDestination(); au.A.master.connect(dest); }          // before any await: audio needs the click gesture
    setPlaying(false); seekTo(0);
    note(UI.choose);
    let stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 60, max: 60 }, displaySurface: 'browser' }, audio: false,
        preferCurrentTab: true, selfBrowserSurface: 'include', surfaceSwitching: 'exclude', monitorTypeSurfaces: 'exclude' });
    } catch { if (dest) au.A.master.disconnect(dest); note(UI.cancelled); return; }
    const [track] = stream.getVideoTracks();
    exporting = { stream, dest, chunks: [], done: false, cancelled: false };
    fit();
    let cropped = false;
    if (window.CropTarget && track.cropTo) { try { await track.cropTo(await CropTarget.fromElement(frameEl)); cropped = true; } catch (e) { console.warn('cropTo failed', e); } }
    if (!cropped) note(UI.noCrop);
    track.addEventListener('ended', () => stopExport(true));          // "Stop sharing" in the browser bar
    const rec = new MediaRecorder(new MediaStream([track, ...(dest ? dest.stream.getAudioTracks() : [])]), { mimeType: MIME, videoBitsPerSecond: 8e6, audioBitsPerSecond: 192e3 });
    exporting.rec = rec;
    rec.ondataavailable = e => { if (e.data.size) exporting.chunks.push(e.data); };
    rec.onstop = () => {
      const ex = exporting; exporting = null; fit();
      ex.stream.getTracks().forEach(t => t.stop()); if (ex.dest) au.A.master.disconnect(ex.dest);
      st.set({ exporting: false });
      if (ex.cancelled) { note(UI.cancelled); return; }
      const blob = new Blob(ex.chunks, { type: MIME.split(';')[0] });
      download(blob, FILE);
      note(UI.saved(FILE, (blob.size / 1048576).toLocaleString(LOC, { maximumFractionDigits: 1 }), EXT === 'webm'));
    };
    st.set({ exporting: true });
    await new Promise(r => setTimeout(r, 700));                        // let the capture settle after the sharing bar appears
    seekTo(0);
    rec.start(500);
    await new Promise(r => setTimeout(r, 250));
    note(UI.recording);
    setPlaying(true);
  }
  function finishExport() { if (!exporting || exporting.done) return; exporting.done = true; setPlaying(false); setTimeout(() => exporting && exporting.rec.state !== 'inactive' && exporting.rec.stop(), 500); }
  function stopExport(cancel) {
    if (!exporting) return; exporting.cancelled = cancel; exporting.done = true; setPlaying(false);
    if (exporting.rec && exporting.rec.state !== 'inactive') exporting.rec.stop();
    else { exporting.stream.getTracks().forEach(t => t.stop()); if (exporting.dest) au.A.master.disconnect(exporting.dest); exporting = null; fit(); st.set({ exporting: false }); note(UI.cancelled); }
  }

  if (!embed) addEventListener('keydown', e => {
    if (e.target.closest?.('input, button, a, [role], #side')) return;   // controls handle their own keys
    if (e.code === 'Space') { e.preventDefault(); setPlaying(tl.paused); }
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { e.preventDefault(); seekTo(tl.iterationCurrentTime + (e.code === 'ArrowRight' ? 1000 : -1000)); }
  }, { signal });
  (function loop() {
    if (signal?.aborted) return;
    const t = tl.iterationCurrentTime;
    frame(t);
    clk.set({ t });
    requestAnimationFrame(loop);
  })();
  if (resume?.t != null) seekTo(resume.t);
  if (resume?.sound) soundOn();                                          // still inside the click gesture
  document.fonts.ready.then(() => { if (!signal?.aborted) setPlaying(resume?.playing ?? true); });
  signal?.addEventListener('abort', () => { tl.pause(); if (exporting) stopExport(true); au.AC?.close(); });
  const controls = { kind: 'film', total, chapters, exportLabel: EXPORT, get: st.get, subscribe: st.subscribe, clock: { get: () => clk.get().t, subscribe: clk.subscribe }, ...(embed ? {} : runControls(UI, look, signal, st)),
    play: setPlaying, toggle: () => setPlaying(tl.paused), scrub: ms => { setPlaying(false); seekTo(Math.min(ms, total - 100)); } /* the very end of a looping timeline is its start */, jump: seekTo, toggleSound, exportVideo: startExport };
  return { seekTo, setPlaying, finishExport, controls };
}
