/* Decoded FIT -> RUN, the object every template draws from. Pure (no DOM), so the tools use it too. */
const SIZE = 1000;                                        // track is projected into a SIZE x SIZE square
const POINTS = 1400;
const MILESTONES = [['5k', 5000], ['10k', 10000], ['half', 21097.5], ['mar', 42195], ['50k', 50000], ['50mi', 80467.2], ['100k', 100000], ['100mi', 160934.4]];
const r1 = v => Math.round(v * 10) / 10;

export function build(fit, extra = {}) {
  const t0 = fit.record[0]?.timestamp, se = fit.session[0] || {};
  // elapsed time follows the watch timer: timer-stop pauses are removed
  const pauses = []; let stop = null;
  for (const e of fit.event || []) { if (e.event !== 0) continue; if (e.eventType === 0) { if (stop != null) pauses.push([stop, e.timestamp]); stop = null; } else stop = e.timestamp; }
  const paused = ts => pauses.reduce((s, [a, b]) => s + (ts >= b ? b - a : ts > a ? ts - a : 0), 0);
  const rec = fit.record.filter(r => r.lat != null && r.lon != null && r.distance != null).map(r => ({ ...r, el: r.timestamp - t0 - paused(r.timestamp) })), n = rec.length;
  // no speed field: derive it from distance over time
  if (n && rec.every(r => r.speed == null)) rec.forEach((r, i) => { const a = rec[Math.max(0, i - 1)], dt = r.timestamp - a.timestamp; r.speed = dt > 0 ? (r.distance - a.distance) / dt : 0; });
  if (n < 30) throw new Error('no-gps');
  const total = rec[n - 1].el, dist = rec[n - 1].distance, hasHr = rec.some(r => r.heartRate);

  const avg = (key, half) => { const out = new Array(n); let s = 0, c = 0, lo = 0, hi = -1;
    for (let i = 0; i < n; i++) {
      while (hi < Math.min(n - 1, i + half)) { hi++; const v = rec[hi][key]; if (v != null) { s += v; c++; } }
      while (lo < i - half) { const v = rec[lo][key]; if (v != null) { s -= v; c--; } lo++; }
      out[i] = c ? s / c : 0;
    } return out; };
  const hr = avg('heartRate', 10), alt = avg('altitude', 7), spd = avg('speed', 30);

  // equirectangular projection about the middle latitude
  const lats = rec.map(r => r.lat), lons = rec.map(r => r.lon), mm = a => a.reduce((m, v) => [Math.min(m[0], v), Math.max(m[1], v)], [Infinity, -Infinity]);
  const [latMin, latMax] = mm(lats), [lonMin, lonMax] = mm(lons);
  const kx = Math.cos((latMin + latMax) / 2 * Math.PI / 180), wDeg = (lonMax - lonMin) * kx, hDeg = latMax - latMin;
  const sc = SIZE / Math.max(wDeg, hDeg, 1e-6), ox = (SIZE - wDeg * sc) / 2, oy = (SIZE - hDeg * sc) / 2;
  const proj = (lat, lon) => [r1(ox + (lon - lonMin) * kx * sc), r1(oy + (latMax - lat) * sc)];

  const STEP = Math.max(8, dist / POINTS), T = { x: [], y: [], d: [], t: [], a: [], h: [], v: [] };
  let next = 0;
  rec.forEach((r, i) => {
    if (r.distance < next && i !== n - 1) return;
    next = r.distance + STEP;
    const [x, y] = proj(r.lat, r.lon);
    T.x.push(x); T.y.push(y); T.d.push(Math.round(r.distance)); T.t.push(Math.round(r.el));
    T.a.push(r1(alt[i])); T.h.push(Math.round(hr[i])); T.v.push(Math.round(spd[i] * 100));
  });

  const tiz = fit.timeInZone.find(z => z.referenceMesg === 18 && Array.isArray(z.hrZoneHigh) && z.hrZoneHigh[4] != null);
  const maxHr = se.maxHeartRate || rec.reduce((m, r) => Math.max(m, r.heartRate || 0), 0);
  const zoneLow = extra.zoneLow || (tiz ? tiz.hrZoneHigh.slice(0, 5) : [0.5, 0.6, 0.7, 0.8, 0.9].map(k => Math.round(k * (maxHr || 180))));
  const zone = b => zoneLow.reduce((z, lo, k) => (b >= lo ? k + 1 : z), 0);

  const mins = Math.ceil(total / 60) || 1, hrMin = new Array(mins).fill(0), cnt = new Array(mins).fill(0), zoneSecs = [0, 0, 0, 0, 0, 0];
  let beats = 0, moving = 0;
  rec.forEach((r, i) => { const dt = i ? Math.min(30, r.el - rec[i - 1].el) : 1, b = r.heartRate;
    if ((r.speed ?? 0) >= 0.45) moving += dt;
    if (!b) return;
    const m = Math.min(mins - 1, Math.floor(r.el / 60)); hrMin[m] += b; cnt[m]++; zoneSecs[zone(b)] += dt; beats += b / 60 * dt; });
  const hrSeries = hrMin.map((s, i) => (cnt[i] ? Math.round(s / cnt[i]) : 0));

  const splitM = dist < 30000 ? 1000 : dist < 130000 ? 5000 : 10000, splits = [];
  { let prev = rec[0], mark = splitM, up = 0, last = alt[0], hs = 0, hn = 0;
    rec.forEach((r, i) => {
      const dz = alt[i] - last; if (Math.abs(dz) >= 2) { if (dz > 0) up += dz; last = alt[i]; }
      if (r.heartRate) { hs += r.heartRate; hn++; }
      if (r.distance >= mark || i === n - 1) {
        const km = (r.distance - prev.distance) / 1000;
        if (km * 1000 >= splitM * 0.3) splits.push({ km: r1(r.distance / 1000), pace: Math.round((r.el - prev.el) / km), hr: hn ? Math.round(hs / hn) : 0, up: Math.round(up) });
        prev = r; mark += splitM; up = 0; hs = hn = 0;
      }
    }); }
  if (!splits.length) splits.push({ km: r1(dist / 1000), pace: Math.round(total / Math.max(0.05, dist / 1000)), hr: se.avgHeartRate || 0, up: 0 });

  const stops = []; let s0 = null;
  rec.forEach(r => { const slow = (r.speed ?? 0) < 0.35;
    if (slow && !s0) s0 = r;
    if (!slow && s0) { const dur = r.el - s0.el; if (dur >= 90) { const [x, y] = proj(s0.lat, s0.lon); stops.push({ x, y, t: Math.round(s0.el), d: Math.round(s0.distance), dur: Math.round(dur) }); } s0 = null; } });

  let climb = { up: 0 }, lowI = 0, topI = 0;
  for (let i = 1; i < n; i++) {
    if (alt[i] > alt[topI]) topI = i;
    if (alt[i] < alt[lowI] || alt[topI] - alt[i] > 25 || i === n - 1) {
      if (alt[topI] - alt[lowI] > climb.up) climb = { up: Math.round(alt[topI] - alt[lowI]), d0: Math.round(rec[lowI].distance), d1: Math.round(rec[topI].distance), t0: Math.round(rec[lowI].el) };
      lowI = i; topI = i;
    }
  }

  const at = i => { const r = rec[i], [x, y] = proj(r.lat, r.lon); return { t: Math.round(r.el), d: Math.round(r.distance), x, y, a: Math.round(alt[i]) }; };
  const best = (arr, cmp) => arr.reduce((b, v, i) => (cmp(v, arr[b]) ? i : b), 0);
  const iHigh = best(alt, (a, b) => a > b), iLow = best(alt, (a, b) => a < b), iHr = best(rec.map(r => r.heartRate || 0), (a, b) => a > b);
  const raw = rec.map(r => r.altitude).filter(v => v != null), [rawMin, rawMax] = raw.length ? mm(raw) : [0, 0];
  const reached = MILESTONES.filter(([, m]) => dist >= m).slice(-3).map(([k, m]) => ({ k, ...at(rec.findIndex(r => r.distance >= m)) }));
  const marks = [rawMax - rawMin >= 20 && { k: 'high', ...at(iHigh) }, hasHr && { k: 'hr', ...at(iHr), v: rec[iHr].heartRate }, ...reached].filter(Boolean).sort((a, b) => a.t - b.t);

  const offset = fit.activity[0]?.localTimestamp != null ? fit.activity[0].localTimestamp - fit.activity[0].timestamp : Math.round(lons[0] / 15) * 3600;
  const foot = [1, 11, 17].includes(se.sport ?? 1), [a0, b0] = [rec[0], rec[n - 1]];
  const gap = Math.hypot((a0.lat - b0.lat) * 111320, (a0.lon - b0.lon) * 111320 * kx);
  const meta = {
    name: null, place: null, sport: se.sport ?? 1, subSport: se.subSport ?? 0, profile: typeof se.f110 === 'string' ? se.f110 : null,
    startLocal: new Date((t0 + offset) * 1000).toISOString().slice(0, 19), loop: gap < 400,
    distance: Math.round(se.distance || dist), elapsed: Math.round(total), wall: Math.round(rec[n - 1].timestamp - t0), movingSeconds: Math.round(moving), hasAlt: raw.length > 0,
    gain: se.ascent ?? 0, loss: se.descent ?? 0, maxAlt: Math.round(rawMax), minAlt: Math.round(rawMin), low: at(iLow),
    hasHr, avgHr: se.avgHeartRate || 0, maxHr, zoneLow, zoneSecs: zoneSecs.slice(1).map(Math.round), beats: Math.round(beats),
    steps: foot && se.cycles ? se.cycles * 2 : null, calories: se.calories || null, power: se.avgPower || null,
    cadence: foot && se.avgCadence ? Math.round((se.avgCadence + (se.avgFractionalCadence || 0)) * 2) : null,
    trainingEffect: se.trainingEffect ?? null, trainingLoad: se.trainingLoad ? Math.round(se.trainingLoad) : null,
    splitKm: splitM / 1000, unitsPerKm: r1(sc / 111.32), size: SIZE,
    // the projection, so a real map can be laid under the track: x = ox + (lon - lonMin) * kx * sc, y = oy + (latMax - lat) * sc
    geo: { latMax, lonMin, kx: Math.round(kx * 1e6) / 1e6, sc: Math.round(sc * 1000) / 1000, ox: r1(ox), oy: r1(oy) }, ...extra, zoneLow,
  };
  return { meta, track: T, hr: hrSeries, splits, stops, climb, marks };
}
