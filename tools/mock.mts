/* Made-up 1 Hz runs -> src/lib/samples/<template>.json, through the same build() as a real FIT. Usage: pnpm mock */
import fs from 'node:fs';
import { build } from '../src/lib/build.js';

type Spec = {
  key: string; name: string; place: string; event?: string; tagline?: string; highName?: string;
  weather?: { temp: number; rain: boolean; text: string; humidity: number; wind: number; windDir: string };
  start: string; tz: number;               // tz: UTC offset in hours
  lat: number; lon: number;
  km: number; shape: 'loop' | 'laps' | 'outback'; laps?: number;
  pace: number;                            // s/km on the flat
  alt: (u: number) => number;              // u: 0..1 along the route (one lap for 'laps')
  trail?: boolean; hr: { rest: number; max: number; zones: number[]; effort: number }; seed: number;
  stops?: [number, number][];              // [km, seconds stood still]
  fade?: number;                           // slowdown over the last quarter (0.04 = 4 %)
};

const rng = (a: number) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const through = (pts: [number, number][]) => (u: number) => {
  const i = Math.max(0, pts.findIndex(([x], k) => u <= x && k > 0) - 1), [x0, y0] = pts[i], [x1, y1] = pts[i + 1] ?? pts[i];
  const f = x1 > x0 ? (u - x0) / (x1 - x0) : 0; return y0 + (y1 - y0) * (1 - Math.cos(Math.PI * f)) / 2;
};

// route in metres (x east, y north)
function route(s: Spec, len: number) {
  const r = rng(s.seed), N = 3000, H = Array.from({ length: 5 }, (_, k) => [k + 2, (0.05 + r() * 0.16) / (k + 1) ** 0.6, r() * 6.3]);
  const wig = Array.from({ length: 6 }, () => [12 + Math.floor(r() * 30), 0.004 + r() * 0.01, r() * 6.3]);
  let P: number[][];
  if (s.shape === 'outback') {
    const half = Array.from({ length: N }, (_, i) => { const u = i / (N - 1); return [u * 1000, 90 * Math.sin(u * 5.1 + 0.4) + 40 * Math.sin(u * 13 + 2) + wig.reduce((a, [k, A, p]) => a + A * 600 * Math.sin(k * u * 3 + p), 0)]; });
    P = [...half, ...half.slice().reverse().map(([x, y]) => [x, y - 9])];      // back on the other side of the path
  } else {
    const stretch = 0.6 + r() * 0.5;
    P = Array.from({ length: N + 1 }, (_, i) => { const t = i / N * 2 * Math.PI;
      const rad = 1 + H.reduce((a, [k, A, p]) => a + A * Math.sin(k * t + p), 0) + wig.reduce((a, [k, A, p]) => a + A * Math.sin(k * t + p), 0);
      return [Math.cos(t) * rad * 1000, Math.sin(t) * rad * 1000 * stretch]; });
  }
  const seg = P.slice(1).map((p, i) => Math.hypot(p[0] - P[i][0], p[1] - P[i][1])), total = seg.reduce((a, b) => a + b, 0), k = len / total;
  const cum = [0]; seg.forEach(d => cum.push(cum[cum.length - 1] + d * k));
  const pts = P.map(([x, y]) => [x * k, y * k]);
  return (d: number) => { d = Math.max(0, Math.min(len, d)); let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const f = cum[hi] > cum[lo] ? (d - cum[lo]) / (cum[hi] - cum[lo]) : 0; return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * f, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * f, cum[lo] / len]; };
}

function record(s: Spec) {
  const r = rng(s.seed * 7 + 1), D = s.km * 1000, lapLen = s.shape === 'laps' ? D / (s.laps ?? 1) : D, at = route(s, lapLen);
  const where = (d: number) => { const lapD = s.shape === 'laps' ? d % lapLen : d, [x, y, u] = at(lapD);
    const uu = s.shape === 'outback' ? (u < 0.5 ? u * 2 : (1 - u) * 2) : u;               // the way back is the same ground
    return { x, y, alt: s.alt(uu) }; };
  const local = Date.parse(s.start + 'Z') / 1000, t0 = local - s.tz * 3600;
  const kx = 111320 * Math.cos(s.lat * Math.PI / 180);
  const rec: Record<string, number>[] = [];
  let d = 0, t = 0, hr = s.hr.rest + 25, stopLeft = 0, stopI = 0, noise = 0;
  const stops = (s.stops ?? []).map(([km, secs]) => [km * 1000, secs]);
  const vFlat = 1000 / s.pace;
  while (d < D) {
    const here = where(d), ahead = where(Math.min(D, d + 25)), grade = (ahead.alt - here.alt) / 25;
    if (stopI < stops.length && d >= stops[stopI][0]) { stopLeft = stops[stopI][1]; stopI++; }
    let v = 0;
    if (stopLeft > 0) stopLeft--;
    else {
      noise = noise * 0.97 + (r() - 0.5) * 0.02;
      const g = grade > 0 ? 1 / (1 + (s.trail ? 9 : 6) * grade) : Math.max(0.55, 1 + 2.5 * -grade - 18 * grade * grade);
      const warm = Math.min(1, 0.9 + t / 1200), fade = s.fade && d > D * 0.75 ? 1 - s.fade * (d - D * 0.75) / (D * 0.25) : 1, kick = D - d < 600 ? 1.05 : 1;
      v = vFlat * g * warm * fade * kick * (1 + noise);
    }
      const effort = v ? s.hr.effort + (v / vFlat - 1) * 0.35 + Math.max(0, grade) * 1.6 : 0.2;
    const target = s.hr.rest + (s.hr.max - s.hr.rest) * Math.min(0.99, effort) + t / 3600 * 3;
    hr += (target - hr) / 20 + (r() - 0.5) * 0.8;
    const lat = s.lat + here.y / 111320, lon = s.lon + here.x / kx;
    rec.push({ timestamp: t0 + t, lat, lon, distance: d, altitude: here.alt + (r() - 0.5) * 0.6, heartRate: Math.round(Math.min(s.hr.max - 1, hr)), speed: v, cadence: v ? Math.round(84 + v * 1.6 + (r() - 0.5) * 3) : 0 });
    d += v; t++;
  }
  const last = rec[rec.length - 1];
  rec.push({ ...last, timestamp: t0 + t, distance: D });
  return { rec, t0, tEnd: t0 + t };
}

function fit(s: Spec) {
  const { rec, t0, tEnd } = record(s);
  let up = 0, down = 0, ref = rec[0].altitude;
  for (const r of rec) { const dz = r.altitude - ref; if (Math.abs(dz) >= 1) { if (dz > 0) up += dz; else down -= dz; ref = r.altitude; } }
  const hrs = rec.map(r => r.heartRate), moving = rec.filter(r => r.speed > 0), cad = moving.reduce((a, r) => a + r.cadence, 0) / moving.length;
  const secs = tEnd - t0, avgHr = Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length);
  return {
    record: rec, event: [{ timestamp: t0, event: 0, eventType: 0 }],
    activity: [{ timestamp: tEnd, localTimestamp: tEnd + s.tz * 3600 }],
    timeInZone: [{ referenceMesg: 18, hrZoneHigh: [...s.hr.zones, s.hr.max] }],
    session: [{ sport: 1, subSport: s.trail ? 3 : 0, f110: s.trail ? 'Trail Run' : 'Run', distance: s.km * 1000, ascent: Math.round(up), descent: Math.round(down),
      avgHeartRate: avgHr, maxHeartRate: Math.max(...hrs), cycles: Math.round(moving.reduce((a, r) => a + r.cadence, 0) / 60),
      calories: Math.round(s.km * 68 + up * 0.9), avgCadence: Math.floor(cad), avgFractionalCadence: cad % 1,
      trainingEffect: Math.min(5, Math.round((2.4 + secs / 3600 * 0.9 + (avgHr - 140) / 40) * 10) / 10), trainingLoad: Math.round(secs / 60 * (avgHr - s.hr.rest) / 45) }],
  };
}

const SPECS: Spec[] = [
  { key: 'film', name: 'Moorland Ultra', place: 'Hebden Bridge', event: '50 mile', tagline: 'Fifty miles over the moors and back down the valleys.', highName: 'High Moss', start: '2026-09-19T07:00:00', tz: 1,
    lat: 53.7418, lon: -2.0122, km: 80.5, shape: 'loop', pace: 400, seed: 61, trail: true, fade: 0.08,
    stops: [[16, 240], [32, 320], [48, 400], [64, 260]],
    alt: u => through([[0, 150], [0.07, 330], [0.13, 250], [0.22, 470], [0.3, 420], [0.37, 584], [0.44, 360], [0.52, 455], [0.6, 240], [0.68, 410], [0.76, 300], [0.84, 470], [0.93, 260], [1, 150]])(u) + 9 * Math.sin(u * 90) + 4 * Math.sin(u * 230 + 1),
    hr: { rest: 48, max: 186, zones: [96, 115, 134, 154, 173], effort: 0.6 },
    weather: { temp: 14, rain: true, text: 'light rain', humidity: 92, wind: 18, windDir: 'SW' } },
  { key: 'story', name: 'Saturday parkrun', place: 'Victoria Park, London', tagline: 'Two laps, and a new best.', start: '2026-09-12T09:00:00', tz: 1,
    lat: 51.5362, lon: -0.0395, km: 5, shape: 'laps', laps: 2, pace: 252, seed: 5,
    alt: u => 12 + 3 * Math.sin(2 * Math.PI * u) + 1.2 * Math.sin(6 * Math.PI * u + 1),
    hr: { rest: 50, max: 189, zones: [100, 119, 138, 157, 176], effort: 0.87 },
    weather: { temp: 13, rain: false, text: 'clear', humidity: 72, wind: 8, windDir: 'W' } },
  { key: 'square', name: 'Riverside 10K', place: 'Belém, Lisbon', event: '10K', tagline: 'Out along the river and back into the sunset.', start: '2026-09-24T19:10:00', tz: 1,
    lat: 38.6916, lon: -9.216, km: 10, shape: 'outback', pace: 288, seed: 11,
    alt: u => 6 + 2.5 * Math.sin(4 * Math.PI * u) + 1.5 * Math.sin(11 * u),
    hr: { rest: 48, max: 186, zones: [98, 117, 136, 154, 172], effort: 0.76 },
    weather: { temp: 22, rain: false, text: 'clear', humidity: 58, wind: 14, windDir: 'NW' } },
  { key: 'poster', name: 'Autumn Marathon', place: 'Berlin', event: 'Marathon', tagline: 'Forty-two kilometres on a flat, fast city loop.', start: '2026-09-27T09:15:00', tz: 2,
    lat: 52.5163, lon: 13.3777, km: 42.195, shape: 'loop', pace: 295, seed: 23, fade: 0.05,
    alt: u => 38 + 9 * Math.sin(2 * Math.PI * 3 * u) + 4 * Math.sin(2 * Math.PI * 7 * u + 1),
    hr: { rest: 46, max: 184, zones: [96, 115, 134, 152, 170], effort: 0.73 },
    weather: { temp: 11, rain: false, text: 'overcast', humidity: 76, wind: 9, windDir: 'E' } },
  { key: 'print', name: 'Horseshoe ridge', place: 'Pen-y-Pass, Eryri', tagline: 'Up the ridge to the summit and round the horseshoe.', highName: 'Yr Wyddfa', start: '2026-08-30T08:05:00', tz: 1,
    lat: 53.0806, lon: -4.0214, km: 12.6, shape: 'loop', pace: 330, seed: 41, trail: true, stops: [[5.3, 240], [8.9, 110]],
    alt: through([[0, 359], [0.08, 420], [0.2, 640], [0.32, 905], [0.41, 1085], [0.47, 1012], [0.53, 1058], [0.61, 880], [0.72, 624], [0.85, 468], [0.93, 402], [1, 359]]),
    hr: { rest: 52, max: 187, zones: [99, 118, 137, 156, 174], effort: 0.62 },
    weather: { temp: 9, rain: false, text: 'low cloud', humidity: 88, wind: 24, windDir: 'SW' } },
];

fs.mkdirSync('src/lib/samples', { recursive: true });
for (const s of SPECS) {
  const RUN = build(fit(s), { name: s.name, place: s.place, event: s.event, tagline: s.tagline, highName: s.highName, weather: s.weather });
  const out = `src/lib/samples/${s.key}.json`, M = RUN.meta;
  fs.writeFileSync(out, JSON.stringify(RUN));
  console.log(`${out}: ${s.name}, ${(M.distance / 1000).toFixed(2)} km in ${Math.floor(M.elapsed / 3600)}:${String(Math.floor(M.elapsed % 3600 / 60)).padStart(2, '0')}, +${M.gain} m, ${M.avgHr} bpm avg, ${RUN.splits.length} splits, ${RUN.marks.length} moments, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}
