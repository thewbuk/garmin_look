/* Film template: 60 s, 16:9. The replay is one tween of S.p (0..1); render() draws every frame from it. */
import { createScope, createTimeline, stagger, svg, splitText, scrambleText, cubicBezier } from 'animejs';
import * as Kit from '@/lib/kit';
import * as Runs from '@/lib/runs';

// scoped to root, so several templates can share a page (the home page mounts six)
export function mount(root, signal, resume, embed) {
  const scope = createScope({ root });
  return scope.execute(() => draw(root, signal, resume, embed, scope));
}

function draw(root, signal, resume, embed, scope) {
  root.innerHTML = Kit.stageHTML('h-[900px] w-[1600px] bg-(--ink) text-(color:--paper)');
  const { h, poly, step, LAYER, FB, VIEWBOX } = Kit;
  const EYEBROW = 'eyebrow text-[12px]/none font-medium tracking-[.16em] text-(color:--moss) uppercase', HIDE = 'absolute opacity-0', DISP = 'm-0 leading-[1.02] font-semibold tracking-[-.03em]';
  const SMALL = 'block text-[11px]/none font-medium tracking-[.14em] text-(color:--soft) uppercase', UNIT = 'ml-[5px] text-[15px]/[normal] font-medium tracking-normal text-(color:--soft) not-italic';
  const HALO = 'halo [paint-order:stroke] [stroke-linejoin:round] stroke-(--ink)', GROW_X = '[transform-box:fill-box] origin-left', VBAR = '[transform-box:fill-box] origin-bottom';
  const ENTER = cubicBezier(0.16, 1, 0.3, 1), EXIT = 'in(2)', MOVE = 'inOut(3)', TOTAL = 60000;
  const REPLAY0 = 7000, REPLAY_D = 21000;
  const { L, C, ZC } = Kit.wear(root, 'midnight_blue', 'ink', embed?.look);
  const RUN = Runs.current('film'), M = RUN.meta, T = RUN.track, N = T.x.length, DIST = M.distance, DUR = M.elapsed, KMS = DIST / Kit.unitM(), HR = M.hasHr;
  const F = Kit.fmt(RUN), { hms, pace, int, dec, clock, zone, startSec } = F, WD = Kit.words(RUN, F), { BPM } = WD;
  if (!HR) ZC[0] = C.moss; // no heart-rate data: one colour

  /* landmark the gain covers a round number of times (at most 5), else the tallest it covers once */
  const LANDMARKS = [[96, 'Big Ben', 'Big Ben', 0], [330, 'the Eiffel Tower', 'wieża Eiffla', 0], [1085, 'Snowdon', 'Snowdon', 1], [1345, 'Ben Nevis', 'Ben Nevis', 1], [2499, 'Rysy', 'Rysy', 1], [4808, 'Mont Blanc', 'Mont Blanc', 1], [8849, 'Everest', 'Everest', 1]];
  const round = l => { const t = M.gain / l[0]; return Math.round(t) <= 5 && Math.abs(t - Math.round(t)) < 0.06; };
  const fits = LANDMARKS.filter(l => M.gain >= l[0] * 0.97), LM = fits.filter(round).pop() || fits.pop() || null, lmT = LM ? M.gain / LM[0] : 0, whole = LM && round(LM) ? Math.round(lmT) : 0;
  const FLAT = M.gain < 50, W = Kit.skyOf(M, embed), { splits: SPLITS, size: SK } = Kit.splits(RUN, F), UNITW = F.MI ? ['mile', 'miles'] : ['kilometre', 'kilometres'];
  const TX = {
    en: () => { const times = whole ? ['', 'once', 'twice'][whole] || `${whole} times` : `${dec(lmT)} times`; return {
      tagline: FLAT ? `${dec(KMS)} ${F.DU}, almost flat.` : `${dec(KMS)} ${F.DU} and ${int(F.ht(M.gain))} ${F.HU} of climbing.`,
      wx: W ? [`${clock(0)} start`, W.temp != null && F.temp(W.temp), W.text, W.humidity != null && `${W.humidity}% humidity`, W.wind != null && `wind ${F.wind(W.wind)} ${W.windDir || ''}`.trim()].filter(Boolean).join(' · ') : `${clock(0)} start · ${clock(M.wall ?? DUR)} finish`,
      legend: 'stopped 90 s or more', elevation: 'ELEVATION', zone: 'Zone', chapters: ['Intro', 'Run', 'Climb', 'Heart', 'Day', 'End'],
      stats: ['Time', 'Time of day', 'Climbed', 'Heart rate', 'Altitude', 'Pace'],
      climbEyebrow: 'The climbing', climbWords: [F.MI ? 'feet' : M.gain === 1 ? 'metre' : 'metres', 'up.'], lmCap: LM ? `${LM[1]}, ${int(F.ht(LM[0]))} ${F.HU} · ${times}` : '',
      climbBody: M.hasAlt === false ? 'This file has no altitude, so there is no climbing to show.' : FLAT ? `Between ${int(F.ht(M.minAlt))} ${F.HU} and ${int(F.ht(M.maxAlt))} ${F.HU}: about as flat as a run gets.`
        : `From ${int(F.ht(M.minAlt))} ${F.HU} up to ${int(F.ht(M.maxAlt))} ${F.HU}${M.highName ? ' on ' + M.highName : ''}.` + (LM ? ` Stacked up, that is ${LM[1]} ${times}.` : ''),
      low: 'Low point', big: 'Biggest climb', bigSub: (km, from) => `in ${km} ${F.DU}, from ${F.DU} ${from}`,
      heartEyebrow: 'The heart', heartWords: ['heartbeats.'], heartBody: (pct, z) => `${M.avgHr} bpm on average for ${F.dur(DUR)}, ${pct}% of it in zone ${z}.`,
      noHrWords: ['No', 'heart', 'rate.'], noHr: 'This file has no heart-rate data, so the trail is drawn in one colour.',
      dayEyebrow: 'The day', dayWords: [({ 1: 'One', 5: 'Five' })[SK] || 'Ten', UNITW[SK === 1 ? 0 : 1], 'at', 'a', 'time.'],
      dayBody: o => `${o.first ? 'Fastest out of the gate at' : 'Fastest at'} ${o.fast} per ${F.MI ? 'mile' : 'km'}. Slowest at ${o.slow}${o.up >= 20 ? `, on ${int(F.ht(o.up))} ${F.HU} of climb` : ''}${o.next ? `, then straight back to ${o.next}.` : '.'}`,
      fastest: 'FASTEST', slowest: 'SLOWEST', hotSize: 12, hotGap: '.1em',
      dayCap: `PACE PER ${F.MI ? 'MILE' : 'KM'} FOR EACH ${SK === 1 ? '' : SK + ' '}${F.MI ? (SK === 1 ? 'MILE' : 'MILES') : 'KM'}` + (HR ? ' · COLOUR IS THE AVERAGE HEART-RATE ZONE' : ''),
      tiles: { steps: 'Steps', energy: 'Energy', still: 'Not moving', power: 'Average power', battery: 'Body Battery', load: 'Training load', effect: 'Training effect', cadence: 'Cadence' }, spm: 'spm',
      endl: `${F.MI ? `${dec(DIST / 1609.344, 2)} miles · ${dec(DIST / 1000, 2)} km` : `${dec(DIST / 1000, 2)} km · ${dec(DIST / 1609.344, 2)} miles`} · ${int(F.ht(M.gain))} ${F.HU} of climbing`,
      ends: [`Started ${clock(0)}, finished ${clock(M.wall ?? DUR)}`, HR && `${M.avgHr} bpm average`, M.steps && `${int(M.steps)} steps`].filter(Boolean).join(' · ') }; },
  }.en();

  const stage = root.querySelector('#stage');
  const add = el => (stage.appendChild(el), el);

  /* climb so far, with hysteresis, rescaled to the watch total; on a dead-flat track spread it by distance */
  const UP = (() => { const out = [0], th = M.maxAlt - M.minAlt < 40 ? 1 : 3; let last = T.a[0], s = 0; for (let i = 1; i < N; i++) { const dz = T.a[i] - last; if (Math.abs(dz) >= th) { if (dz > 0) s += dz; last = T.a[i]; } out.push(s); }
    return out.map((v, i) => (s ? v / s : T.d[i] / DIST) * M.gain); })();
  /* zone runs of the trail; neighbours share a point so there are no gaps */
  const SEGS = []; for (let i = 0, z = zone(T.h[0]), i0 = 0; i <= N; i++) { const zi = i < N ? zone(T.h[i]) : -1; if (zi !== z) { SEGS.push({ i0, i1: Math.min(N - 1, i), z }); i0 = i; z = zi; } }

  const sky = add(h('div', { id: 'sky', class: LAYER, style: `background:radial-gradient(120% 90% at 30% 40%, ${L.bg2} 0%, ${L.bg} 55%, ${L.edge} 100%)` }));

  const art = add(h('svg', { id: 'art', class: `${LAYER} pointer-events-none overflow-visible [&_text]:font-display`, viewBox: '0 0 1600 900' }));
  const WX = Kit.weatherLayer(Kit.skyOf(M, embed), 1600, 900, L.dark); add(WX.el);
  art.appendChild(h('defs', {},
    h('linearGradient', { id: 'gArea', x1: 0, y1: 0, x2: 0, y2: 1 }, h('stop', { offset: 0, 'stop-color': C.moss, 'stop-opacity': 0.42 }), h('stop', { offset: 1, 'stop-color': C.moss, 'stop-opacity': 0.02 })),
    h('radialGradient', { id: 'gDot' }, h('stop', { offset: 0, 'stop-color': C.signal, 'stop-opacity': 0.55 }), h('stop', { offset: 1, 'stop-color': C.signal, 'stop-opacity': 0 })),
    h('clipPath', { id: 'cStrip' }, h('rect', { id: 'cStripR', x: 60, y: 770, width: 0, height: 120 }))));

  const RAIN = !!(W && W.rain);

  const map = art.appendChild(h('g', { id: 'map', class: VIEWBOX }));
  const KM = M.unitsPerKm * F.U / 1000, SZ = M.size; // map units per km or mile
  const BAR = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50].filter(k => k * KM <= 380).pop() || 0.1, GRID = BAR * 0.4 * KM;
  const grid = map.appendChild(h('g', { id: 'grid', stroke: C.paper, 'stroke-opacity': 0.05, 'stroke-width': 1.4 }));
  for (let v = (SZ / 2) % GRID; v < SZ; v += GRID) grid.appendChild(h('path', { d: `M${v.toFixed(1)} 0 V${SZ} M0 ${v.toFixed(1)} H${SZ}` }));
  const ROUTE = poly(T.x.map((x, i) => [x, T.y[i]]));
  const ghost = map.appendChild(h('path', { id: 'ghost', d: ROUTE, fill: 'none', stroke: C.paper, 'stroke-opacity': 0.34, 'stroke-width': 2.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  const trail = map.appendChild(h('g', { id: 'trail', fill: 'none', 'stroke-width': 7.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  SEGS.forEach(s => { s.el = trail.appendChild(h('path', { d: poly(Array.from({ length: s.i1 - s.i0 + 1 }, (_, k) => [T.x[s.i0 + k], T.y[s.i0 + k]])), stroke: ZC[s.z], opacity: 0 })); s.on = false; });
  const headLine = trail.appendChild(h('path', { id: 'head', d: 'M0 0' }));
  const stopEls = RUN.stops.map(s => map.appendChild(h('circle', { class: `stop ${FB}`, cx: s.x, cy: s.y, r: 11, fill: C.ink, stroke: C.paper, 'stroke-width': 3, opacity: 0 })));
  /* map captions: outer g holds the position, inner g animates; label goes on the side with less track */
  const under = (x0, x1, y) => T.x.reduce((n, x, i) => n + (x > x0 && x < x1 && Math.abs(T.y[i] - y) < 34 ? 1 : 0), 0);
  const tag = (x, y, title, sub, col = C.paper) => { const s = x < 300 ? 1 : x > 800 ? -1 : under(x - 330, x - 20, y) < under(x + 20, x + 330, y) ? -1 : 1, a = { x: 24 * s, 'text-anchor': s < 0 ? 'end' : 'start' };
    return map.appendChild(h('g', { transform: `translate(${x} ${y})` }, h('g', { class: `tag ${FB}`, opacity: 0 },
      h('circle', { r: 12, fill: C.ink, stroke: col, 'stroke-width': 4 }),
      h('text', { class: HALO, ...a, y: sub ? -3 : 9, 'font-size': 27, 'font-weight': 600, fill: col, 'stroke-width': 9, text: title }),
      h('text', { class: HALO, ...a, y: 25, 'font-size': 19, fill: C.soft, 'stroke-width': 8, text: sub })))).firstChild; };
  const HERE = M.loop ? WD.startFinish : WD.start;
  const startTag = M.place ? tag(T.x[0], T.y[0], M.place.split(',')[0], `${HERE} · ${clock(0)}`, C.moss) : tag(T.x[0], T.y[0], HERE, clock(0), C.moss);
  const tagEls = RUN.marks.map(m => { const [title, sub] = WD.mark(m); return tag(m.x, m.y, title, [sub, hms(m.t)].filter(Boolean).join(' · '), m.k === 'hr' ? ZC[5] : C.paper); });
  const dotAt = map.appendChild(h('g', {}, h('g', { id: 'dot', class: FB, opacity: 0 }, h('circle', { r: 34, fill: 'url(#gDot)' }), h('circle', { r: 10.5, fill: C.signal, stroke: C.paper, 'stroke-width': 3.5 })))), dot = dotAt.firstChild;
  const legend = map.appendChild(h('g', { id: 'legend', opacity: 0 },
    h('path', { d: `M4 1030 v-9 M4 1026 H${(4 + KM * BAR).toFixed(1)} m0 4 v-9`, fill: 'none', stroke: C.soft, 'stroke-width': 2 }),
    h('text', { x: 18 + KM * BAR, y: 1033, 'font-size': 19, fill: C.soft, text: BAR < 1 && !F.MI ? `${BAR * 1000} m` : `${BAR} ${F.DU}` }),
    RUN.stops.length ? h('circle', { cx: 108 + KM * BAR, cy: 1026, r: 8, fill: 'none', stroke: C.soft, 'stroke-width': 2.4 }) : null,
    RUN.stops.length ? h('text', { x: 126 + KM * BAR, y: 1033, 'font-size': 19, fill: C.soft, text: TX.legend }) : null));

  /* elevation strip: at least 60 m top to bottom so a flat run reads as flat */
  const scaleD = (x0, x1) => d => x0 + d / DIST * (x1 - x0), scaleA = (yb, yt, a0, a1) => a => yb - (a - a0) / (a1 - a0) * (yb - yt);
  const profile = (X, Y) => T.d.map((d, i) => [X(d), Y(T.a[i])]);
  const SX = scaleD(60, 1540), SY = scaleA(868, 796, M.minAlt, Math.max(M.maxAlt, M.minAlt + 60)), SP = profile(SX, SY);
  const sStep = step(KMS, 5, [1, 2, 5, 10, 20, 25, 50, 100]), sTicks = []; for (let k = 0; k * sStep <= KMS - sStep * 0.1; k++) sTicks.push(k * sStep);
  const strip = art.appendChild(h('g', { id: 'strip', opacity: 0 },
    h('path', { d: poly(SP) + ' L1540 872 L60 872 Z', fill: C.paper, 'fill-opacity': 0.07 }),
    h('g', { 'clip-path': 'url(#cStrip)', fill: 'none', 'stroke-width': 3, 'stroke-linejoin': 'round' },
      h('path', { d: poly(SP) + ' L1540 872 L60 872 Z', fill: C.paper, 'fill-opacity': 0.1, stroke: 'none' }),
      ...SEGS.map(s => h('path', { d: poly(SP.slice(s.i0, s.i1 + 1)), stroke: ZC[s.z] }))),
    ...sTicks.map(k => h('text', { x: SX(k * F.U), y: 890, 'font-size': 11.5, fill: C.soft, 'letter-spacing': '.06em', text: k ? `${k} ${F.DU}` : TX.elevation })),
    h('path', { id: 'cur', d: 'M0 786 V872', stroke: C.signal, 'stroke-width': 1.6 }), h('circle', { id: 'curDot', r: 4.5, fill: C.signal })));
  const cur = strip.querySelector('#cur'), curDot = strip.querySelector('#curDot'), cStripR = art.querySelector('#cStripR');

  const span = Math.max(M.maxAlt - M.minAlt, 60), cLo = M.minAlt - span * 0.12, cHi = M.maxAlt + span * 0.09;
  const CX = scaleD(90, 1510), CY = scaleA(800, 420, cLo, cHi), CP = profile(CX, CY);
  /* altitude ticks at round numbers in the display unit, converted back to metres */
  const aStep = step(F.ht(span), 5, [5, 10, 20, 50, 100, 200, 500, 1000, 2000]), aTicks = []; for (let a = Math.ceil(F.ht(cLo) / aStep) * aStep; a < F.ht(cHi); a += aStep) aTicks.push(a);
  const kStep = step(KMS, 9, [1, 2, 5, 10, 20, 50]), kTicks = []; for (let k = 0; k <= KMS; k += kStep) kTicks.push(k);
  const iAt = d => { let i = 0; while (i < N - 1 && T.d[i] < d) i++; return i; };
  const iHigh = T.a.indexOf(Math.max(...T.a)), iLow = T.a.indexOf(Math.min(...T.a)), BIG = RUN.climb.up >= 30, iC0 = BIG ? iAt(RUN.climb.d0) : 0, iC1 = BIG ? iAt(RUN.climb.d1) : 0;
  const PEAK = 'M0 150 L58 66 L82 92 L128 8 L160 58 L182 40 L260 150', SNOW = 'M112 38 L122 50 L130 40 L140 52 L146 36', TOWER = 'M66 150 L118 14 L142 14 L194 150 M88 102 H172 M102 64 H158 M130 14 V0';
  const MARKS = LM ? Math.min(3, Math.max(1, Math.round(lmT))) : 0;
  const pin = (i, dy, size, fill, text) => h('g', { class: 'cpin', opacity: 0 }, h('circle', { cx: CP[i][0], cy: CP[i][1], r: 7, fill: C.ink, stroke: C.paper, 'stroke-width': 3 }),
    h('text', { class: HALO, x: Math.min(1430, Math.max(170, CP[i][0])), y: CP[i][1] + dy, 'text-anchor': 'middle', 'font-size': size, 'font-weight': size > 18 ? 600 : 400, fill, 'stroke-width': 7, text }));
  const climb = art.appendChild(h('g', { id: 'climb', opacity: 0 },
    ...aTicks.map(a => h('g', { class: 'cgrid' }, h('path', { d: `M90 ${CY(a / F.ht(1))} H1510`, stroke: C.paper, 'stroke-opacity': 0.06 }), h('text', { x: 1522, y: CY(a / F.ht(1)) + 4, 'font-size': 12, fill: C.soft, text: `${int(a)} ${F.HU}` }))),
    ...kTicks.map(k => h('text', { class: 'cgrid', x: CX(k * F.U), y: 828, 'text-anchor': 'middle', 'font-size': 12, fill: C.soft, text: k ? `${k} ${F.DU}` : '0' })),
    h('path', { id: 'cArea', d: poly(CP) + ' L1510 800 L90 800 Z', fill: 'url(#gArea)', opacity: 0 }),
    h('path', { id: 'cLine', d: poly(CP), fill: 'none', stroke: C.paper, 'stroke-width': 2.6, 'stroke-linejoin': 'round' }),
    BIG ? h('path', { id: 'cBig', d: poly(CP.slice(iC0, iC1 + 1)), fill: 'none', stroke: C.signal, 'stroke-width': 5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }) : null,
    pin(iHigh, -22, 20, C.paper, `${M.highName || WD.HIGH} · ${int(F.ht(M.maxAlt))} ${F.HU}`),
    pin(iLow, 34, 17, C.soft, `${TX.low} · ${int(F.ht(M.minAlt))} ${F.HU}`),
    BIG ? h('g', { class: 'cpin', opacity: 0 },
      h('text', { class: HALO, x: CP[iC1][0] - 16, y: CP[iC1][1] - 8, 'text-anchor': 'end', 'font-size': 20, 'font-weight': 600, fill: C.signal, 'stroke-width': 7, text: `${TX.big} · +${int(F.ht(RUN.climb.up))} ${F.HU}` }),
      h('text', { class: HALO, x: CP[iC1][0] - 16, y: CP[iC1][1] + 14, 'text-anchor': 'end', 'font-size': 15, fill: C.soft, 'stroke-width': 7, text: TX.bigSub(dec((RUN.climb.d1 - RUN.climb.d0) / F.U), Math.round(RUN.climb.d0 / F.U)) })) : null,
    h('g', { id: 'lms', transform: `translate(${1530 - MARKS * 190} 96)` },
      ...Array.from({ length: MARKS }, (_, k) => h('g', { transform: `translate(${k * 190} 0) scale(.68)` }, h('path', { class: 'lm', d: LM[3] ? PEAK : TOWER, fill: 'none', stroke: C.paper, 'stroke-width': 3.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }),
        LM[3] ? h('path', { class: 'lm', d: SNOW, fill: 'none', stroke: C.paper, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }) : null)),
      h('text', { class: 'lmT', x: MARKS * 95 - 12, y: 146, 'text-anchor': 'middle', 'font-size': 17, fill: C.soft, opacity: 0, text: TX.lmCap }))));
  const cpins = [...climb.querySelectorAll('.cpin')];

  const hLo = M.zoneLow[0] - 6, hTop = Math.max(M.maxHr + 5, M.zoneLow[4] + 17);
  const HX = m => 90 + m / Math.max(1, RUN.hr.length - 1) * 920, HY = scaleA(790, 340, hLo, hTop);
  const ZTOP = [...M.zoneLow.slice(1), hTop], zTotal = M.zoneSecs.reduce((a, b) => a + b, 0) || 1, zMax = Math.max(...M.zoneSecs, 1), mHr = RUN.marks.find(m => m.k === 'hr');
  const tMin = DUR / 60 <= 90 ? 10 : DUR / 60 <= 240 ? 30 : 60, tTicks = []; for (let k = 1; k * tMin < DUR / 60; k++) tTicks.push(k);
  const heart = art.appendChild(h('g', { id: 'heart', opacity: 0 }, ...(!HR ? [] : [
    ...M.zoneLow.map((lo, k) => h('g', { class: 'zband', opacity: 0 }, h('rect', { x: 90, y: HY(ZTOP[k]), width: 920, height: HY(lo) - HY(ZTOP[k]), fill: ZC[k + 1], 'fill-opacity': 0.13 }),
      h('text', { x: 78, y: HY(lo) - 6, 'text-anchor': 'end', 'font-size': 12, fill: ZC[k + 1], text: `Z${k + 1}` }), h('text', { x: 1018, y: HY(lo) + 4, 'font-size': 11.5, fill: C.soft, text: lo }))),
    ...tTicks.map(k => h('text', { class: 'zband', x: HX(k * tMin), y: 816, 'text-anchor': 'middle', 'font-size': 12, fill: C.soft, opacity: 0, text: tMin === 60 ? `${k} h` : `${k * tMin} min` })),
    h('path', { id: 'hLine', d: poly(RUN.hr.map((b, m) => [HX(m), HY(Math.max(hLo, b))])), fill: 'none', stroke: C.paper, 'stroke-width': 2, 'stroke-linejoin': 'round' }),
    mHr ? h('g', { id: 'hMax', opacity: 0 }, h('circle', { cx: HX(mHr.t / 60), cy: HY(M.maxHr), r: 7, fill: C.ink, stroke: ZC[5], 'stroke-width': 3 }),
      h('text', { class: HALO, x: HX(mHr.t / 60) + (mHr.t > DUR * 0.7 ? -16 : 16), y: HY(M.maxHr) + 6, 'text-anchor': mHr.t > DUR * 0.7 ? 'end' : 'start', 'font-size': 19, 'font-weight': 600, fill: ZC[5], 'stroke-width': 7, text: `${M.maxHr} ${BPM} · ${hms(mHr.t)}` })) : null,
    ...M.zoneSecs.map((s, k) => { const y = 356 + (4 - k) * 88; return h('g', { class: 'zrow' },
      h('text', { class: 'zt', x: 1090, y, 'font-size': 17, 'font-weight': 600, fill: C.paper, opacity: 0 }, h('tspan', { text: `${TX.zone} ${k + 1}` }),
        h('tspan', { dx: 14, 'font-size': 14, 'font-weight': 400, fill: C.soft, text: `${M.zoneLow[k]}${k < 4 ? '–' + (M.zoneLow[k + 1] - 1) : '+'} ${BPM}` })),
      h('rect', { class: `zbar ${GROW_X}`, x: 1090, y: y + 14, width: Math.max(4, s / zMax * 270), height: 24, rx: 5, fill: ZC[k + 1] }),
      h('text', { class: 'zt tabular-nums', x: 1090 + Math.max(4, s / zMax * 270) + 14, y: y + 32, 'font-size': 19, 'font-weight': 500, fill: C.paper, opacity: 0, text: hms(s) }),
      h('text', { class: 'zt', x: 1510, y: y + 32, 'text-anchor': 'end', 'font-size': 15, fill: C.soft, opacity: 0, text: `${Math.round(s / zTotal * 100)}%` })); })])));

  const SPL = SPLITS, NB = SPL.length, spd = SPL.map(s => 1000 / s.pace), sMin = Math.min(...spd), sMax = Math.max(...spd), iFast = spd.indexOf(sMax), iSlow = spd.indexOf(sMin);
  const slot = Math.min(80, 925 / NB), bw = slot * 0.735, dense = NB > 20, HOT = NB >= 3 && iFast !== iSlow;
  const day = art.appendChild(h('g', { id: 'day', opacity: 0 },
    h('path', { d: 'M90 770 H1010', stroke: C.line, 'stroke-width': 1.5 }),
    ...SPL.map((s, k) => { const x = 90 + k * slot, bh = 70 + (spd[k] - sMin) / (sMax - sMin || 1) * 300, hot = HOT && (k === iFast || k === iSlow), cx = x + bw / 2; return h('g', {},
      h('rect', { class: `pbar ${VBAR}`, x, y: 770 - bh, width: bw, height: bh, rx: Math.min(5, bw / 4), fill: ZC[zone(s.hr)], 'fill-opacity': hot ? 1 : 0.78 }),
      h('text', { class: 'pt tabular-nums', x: cx, y: 770 - bh - 10, 'text-anchor': 'middle', 'font-size': dense ? 11 : 14, 'font-weight': hot ? 700 : 500, fill: hot ? C.paper : C.soft, opacity: 0, text: pace(F.pu(s.pace)) }),
      !dense || k % 2 || k === NB - 1 ? h('text', { class: 'pt', x: cx, y: 794, 'text-anchor': 'middle', 'font-size': 12, fill: C.soft, opacity: 0, text: Number.isInteger(s.km) ? s.km : dec(s.km) }) : null,
      hot ? h('text', { class: 'pt', x: Math.max(134, cx), y: 770 - bh - 32, 'text-anchor': 'middle', 'font-size': TX.hotSize, 'letter-spacing': TX.hotGap, fill: C.paper, opacity: 0, text: k === iFast ? TX.fastest : TX.slowest }) : null); }),
    h('text', { class: 'pt', x: 90, y: 822, 'font-size': 12, 'letter-spacing': '.1em', fill: C.soft, opacity: 0, text: TX.dayCap })));

  const ui = add(h('div', { id: 'ui', class: `${LAYER} pointer-events-none [&_[data-char]]:inline-block [&_[data-char]]:will-change-transform [&_[data-word]]:inline-block [&_[data-word]]:will-change-transform` }));
  const U = el => ui.appendChild(el);
  const i1 = U(h('div', { id: 'i1', class: `${HIDE} top-[250px] left-[90px] w-[640px]` }, h('div', { class: EYEBROW, text: [F.DATE, M.place].filter(Boolean).join(' · ') }),
    h('h1', { class: `${DISP} mt-[22px] ${WD.NAME.length > 22 ? 'text-[68px]' : 'text-[96px]'}`, text: WD.NAME }),
    h('p', { class: `${DISP} mt-[26px] text-[26px] text-(color:--paper) opacity-85`, style: 'font-weight:400', text: M.tagline || TX.tagline })));
  const wx = U(h('div', { id: 'wx', class: `${HIDE} top-[640px] left-[90px] min-h-[22px] rounded-[9999px] border border-(--line) px-[16px] py-[10px] text-[15px]/[normal] font-medium tracking-[.04em] whitespace-nowrap text-(color:--soft)` }));
  const STATB = 'mt-[9px] block text-[38px]/none font-medium tracking-[-.02em] whitespace-nowrap', STATS = 'mt-[22px] grid grid-cols-[repeat(3,1fr)] gap-x-[24px] gap-y-0 border-t border-t-(--line) pt-[20px]';
  const stat = (label, id, unit) => h('div', { class: 'stat' }, h('small', { class: SMALL, text: label }), h('b', { class: STATB }, h('span', { id, text: '0' }), unit ? h('i', { class: UNIT, text: unit }) : null));
  const pan = U(h('div', { id: 'pan', class: `${HIDE} top-[66px] left-[850px] w-[690px]` }, h('div', { class: EYEBROW, text: WD.TITLE }),
    h('div', { id: 'dist', class: 'mt-[10px] flex items-baseline gap-[14px]' }, h('b', { id: 'km', class: 'text-[176px]/none font-semibold tracking-[-.05em]', text: dec(0) }),
      h('small', { class: 'text-[40px]/none font-medium text-(color:--soft)', text: F.DU }), h('span', { id: 'mi', class: 'ml-auto text-[26px]/none font-medium text-(color:--soft)', text: dec(0) + (F.MI ? ' km' : ' mi') })),
    h('div', { class: STATS }, stat(TX.stats[0], 'el'), stat(TX.stats[1], 'clk'), stat(TX.stats[2], 'up', F.HU)),
    h('div', { class: STATS }, h('div', { class: 'stat' }, h('small', { class: SMALL, text: TX.stats[3] }), h('b', { class: STATB }, h('span', { id: 'bpm', text: HR ? '0' : '–' }),
      h('span', { id: 'zchip', class: 'ml-[10px] inline-block rounded-[9999px] px-[9px] py-[4px] align-middle text-[13px]/none font-semibold tracking-normal text-(color:--ink)', text: 'Z1', style: HR ? '' : 'display:none' }))),
      stat(TX.stats[4], 'altv', F.HU), stat(TX.stats[5], 'pc', `/${F.DU}`)),
    h('div', { id: 'feed', class: 'mt-[24px] flex flex-col gap-[9px] border-t border-t-(--line) pt-[16px] tabular-nums' }, ...[...RUN.marks.map(m => [m.t, ...WD.mark(m)]), [DUR, WD.finish, clock(M.wall ?? DUR)]].map(([t, a, b]) =>
      h('div', { class: 'flex gap-[18px] text-[17px]/[1.2] font-medium whitespace-nowrap normal-nums' }, h('time', { class: 'w-[84px] text-(color:--soft)', text: hms(t) }), h('b', { text: a }), h('span', { class: 'ml-auto text-(color:--soft)', text: b }))))));
  const feed = [...pan.querySelectorAll('#feed div')];
  const E = Object.fromEntries(['km', 'mi', 'el', 'clk', 'up', 'bpm', 'zchip', 'altv', 'pc'].map(k => [k, pan.querySelector('#' + k)]));
  const head = (id, eyebrow, words, body) => U(h('div', { id, class: `head ${HIDE} top-[74px] left-[90px] w-[1000px]` }, h('div', { class: EYEBROW, text: eyebrow }),
    h('h2', { class: `${DISP} mt-[20px] text-[84px]` }, ...Kit.wordEls(words)), h('p', { class: 'm-0 mt-[20px] w-[820px] text-[20px] leading-[1.45] text-(color:--soft)', text: body })));
  const c1 = head('c1', TX.climbEyebrow, [h('span', { id: 'gainN', class: 'tabular-nums', text: '0' }), ...TX.climbWords], TX.climbBody);
  const zBig = M.zoneSecs.indexOf(Math.max(...M.zoneSecs)) + 1;
  const h1 = HR ? head('h1', TX.heartEyebrow, [h('span', { id: 'beatN', class: 'tabular-nums', text: '0' }), ...TX.heartWords], TX.heartBody(Math.round(zMax / zTotal * 100), zBig)) : head('h1', TX.heartEyebrow, TX.noHrWords, TX.noHr);
  const d1 = head('d1', TX.dayEyebrow, TX.dayWords, TX.dayBody({ first: iFast === 0, fast: pace(F.pu(SPL[iFast].pace)), slow: pace(F.pu(SPL[iSlow].pace)), up: SPL[iSlow].up, next: SPL[iSlow + 1] && pace(F.pu(SPL[iSlow + 1].pace)) }));
  const TILES = [M.steps && ['steps', M.steps, int, ''], M.calories && ['energy', M.calories, int, 'kcal'], ['still', Math.max(0, M.elapsed - M.movingSeconds), pace, 'min'], M.power && ['power', M.power, int, 'W'],
    M.bodyBattery != null && ['battery', M.bodyBattery, v => (v < 0 ? '−' : '') + Math.abs(Math.round(v)), ''], M.trainingLoad && ['load', M.trainingLoad, int, ''],
    M.trainingEffect && ['effect', M.trainingEffect, v => dec(v), ''], M.cadence && ['cadence', M.cadence, int, TX.spm]].filter(Boolean).slice(0, 6);
  const tiles = U(h('div', { id: 'tiles', class: `${HIDE} top-[330px] left-[1090px] grid w-[420px] grid-cols-[1fr_1fr] gap-[16px]` }, ...TILES.map(([k, , , u]) =>
    h('div', { class: 'tile box-border h-[132px] rounded-[14px] border border-(--line) bg-(--peat) px-[20px] pt-[20px] pb-0' }, h('small', { class: SMALL, text: TX.tiles[k] }),
      h('b', { class: 'mt-[16px] block text-[42px]/none font-medium tracking-[-.025em] whitespace-nowrap' }, h('span', { class: 'tv', text: '0' }), u ? h('i', { class: UNIT, text: u }) : null)))));
  const tileEls = [...tiles.children], tileV = [...tiles.querySelectorAll('.tv')];
  const end = U(h('div', { id: 'end', class: `${HIDE} top-[236px] left-0 w-[1600px] text-center` }, h('div', { class: EYEBROW, text: `${WD.TITLE} · ${F.DAY}` }),
    h('div', { id: 'fin', class: 'mt-[26px] text-[236px]/none font-semibold tracking-[-.05em]', text: '0:00:00' }),
    h('div', { id: 'endl', class: 'mt-[22px] text-[32px]/[1.2] font-medium tracking-[-.01em]', text: TX.endl }),
    h('div', { id: 'ends', class: 'mt-[16px] text-[18px] text-(color:--soft)', text: TX.ends })));
  add(h('div', { id: 'fade', class: `${LAYER} pointer-events-none bg-(--ink) opacity-0` }));

  const split = (el, o = { words: true }) => splitText(el, o);
  const W1 = split(i1.querySelector('h1')).words, W1p = split(i1.querySelector('p'), { chars: true }).chars;
  const [HC, HH, HD] = [c1, h1, d1].map(el => [...el.querySelectorAll('[data-word]')]);

  const S = { p: 0 };
  const SKY = [[7, [12, 25, 44]], [12.5, [10, 22, 40]], [18.6, [30, 22, 34]]]; // [hour of day, rgb tint]
  let lastP = -1, lastHr = M.avgHr || 140;
  function render() {
    if (S.p === lastP) return; lastP = S.p;
    const te = S.p * DUR;
    let lo = 0, hi = N - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (T.t[mid] <= te) lo = mid; else hi = mid; }
    const f = T.t[hi] > T.t[lo] ? Math.min(1, Math.max(0, (te - T.t[lo]) / (T.t[hi] - T.t[lo]))) : 0, L = k => T[k][lo] + (T[k][hi] - T[k][lo]) * f;
    const x = L('x'), y = L('y'), d = L('d'), a = L('a'), b = L('h'), v = L('v') / 100;
    dotAt.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    let curSeg = null;
    for (const s of SEGS) { const on = s.i1 <= lo; if (on !== s.on) { s.on = on; s.el.setAttribute('opacity', on ? 1 : 0); } if (!on && !curSeg && s.i0 <= lo) curSeg = s; }
    if (curSeg) { let pts = ''; for (let i = curSeg.i0; i <= lo; i++) pts += `${i === curSeg.i0 ? 'M' : 'L'}${T.x[i]} ${T.y[i]} `; headLine.setAttribute('d', pts + `L${x.toFixed(1)} ${y.toFixed(1)}`); headLine.setAttribute('stroke', ZC[curSeg.z]); }
    else headLine.setAttribute('d', 'M0 0');
    const sx = SX(d); cStripR.setAttribute('width', Math.max(0, sx - 60)); cur.setAttribute('transform', `translate(${sx.toFixed(1)} 0)`); curDot.setAttribute('cx', sx); curDot.setAttribute('cy', SY(a));
    const z = Math.max(1, zone(b)), up = UP[lo] + (UP[hi] - UP[lo]) * f;
    E.km.textContent = dec(d / F.U); E.mi.textContent = F.MI ? dec(d / 1000) + ' km' : dec(d / 1609.344) + ' mi'; E.el.textContent = hms(te); E.clk.textContent = clock(te);
    E.up.textContent = int(F.ht(up)); E.altv.textContent = Math.round(F.ht(a)); E.pc.textContent = v > 0.6 ? pace(F.U / v) : '–';
    if (HR) { E.bpm.textContent = Math.round(b); E.zchip.textContent = 'Z' + z; E.zchip.style.background = ZC[z]; lastHr = b; }
    if (L.key !== 'midnight_blue') return;
    const hr = (startSec + te) / 3600; let k = 0; while (k < SKY.length - 2 && hr > SKY[k + 1][0]) k++;
    const g = Math.min(1, Math.max(0, (hr - SKY[k][0]) / (SKY[k + 1][0] - SKY[k][0]))), c = SKY[k][1].map((q, n) => Math.round(q + (SKY[k + 1][1][n] - q) * g));
    sky.style.background = `radial-gradient(120% 90% at 30% 40%, rgb(${c.map(q => q + 14)}) 0%, rgb(${c}) 55%, ${L.edge} 100%)`;
  }

  const tl = createTimeline({ autoplay: false, loop: true, defaults: { ease: ENTER, duration: 900 } });
  const at = (t, targets, params) => tl.add(targets, params, t);
  const set = (t, targets, params) => tl.set(targets, params, t);
  const snd = (t, fn) => tl.call(fn, t);
  const count = (from, to, fmt = int) => ({ textContent: [from, to], modifier: fmt });
  const rise = (t, words, gap = 70) => { set(t, words, { translateY: '60%', opacity: 0 }); at(t, words, { translateY: ['60%', '0%'], opacity: [0, 1], duration: 1000, delay: stagger(gap) }); };
  const MAP = { intro: [760, 56, 0.78], run: [60, 30, 0.7], end: [370, 20, 0.86] };
  const placeMap = (t, k, dur = 1300) => { const [x, y, s] = MAP[k]; return at(t, map, { translateX: x, translateY: y, scale: s, duration: dur, ease: MOVE }); };
  const filmAt = sec => REPLAY0 + sec / DUR * REPLAY_D;
  const drawAt = (t, sel, params) => { at(0, sel, { opacity: [0, 0], duration: 1 }); set(t, sel, { opacity: 1 }); return at(t, svg.createDrawable(sel), { draw: ['0 0', '0 1'], ease: 'inOut(2)', ...params }); };
  const CH = [0, 6000, 29500, 38000, 46000, 53500];
  ['intro', 'run', 'climb', 'heart', 'day', 'end'].forEach((v, i) => tl.label(v, CH[i]));

  /* reset at 0; `some` drops selectors that match nothing on this run */
  const some = list => list.filter(s => typeof s !== 'string' || root.querySelector(s));
  set(0, S, { p: 0 });
  set(0, map, { translateX: MAP.intro[0], translateY: MAP.intro[1], scale: MAP.intro[2], opacity: 1 });
  set(0, [...ui.children], { opacity: 0, translateY: 0 });
  set(0, [strip, climb, heart, day, dot, legend, '#fade'], { opacity: 0 });
  set(0, some(['.tag', '.stop', '.rain', '.cpin', '.zband', '.zt', '.pt', '.lmT', '#cArea', '#hMax']), { opacity: 0 });
  set(0, feed, { opacity: 0 }); set(0, tileEls, { opacity: 0 });
  set(0, [...W1, ...W1p, ...HC, ...HH, ...HD, '.eyebrow', '.head p', '#fin', '#endl', '#ends', ...[...pan.children].slice(0, 4)], { opacity: 0 });
  if (HR) set(0, '.zbar', { scaleX: 0 });
  set(0, '.pbar', { scaleY: 0 }); set(0, grid, { opacity: 1 });
  at(0, ghost, { opacity: [0, 0], duration: 1 });

  if (RAIN) snd(300, () => sfx.rain());
  set(300, ghost, { opacity: 1 });
  at(300, svg.createDrawable(ghost), { draw: ['0 0', '0 1'], duration: 3600, ease: 'inOut(2)' });
  set(500, i1, { opacity: 1 });
  at(500, i1.querySelector('.eyebrow'), { opacity: [0, 1], duration: 700 });
  rise(700, W1, 110);
  set(1900, W1p, { opacity: 0 }); at(1900, W1p, { opacity: [0, 1], duration: 90, delay: stagger(26) });
  set(3300, wx, { opacity: 1 });
  at(3300, wx, { textContent: scrambleText({ text: TX.wx, chars: '0123456789·°%', revealRate: 70 }) });
  at(3900, startTag, { opacity: [0, 1], scale: [0.4, 1], duration: 700 });
  snd(3900, () => sfx.blip(0));
  at(5500, [i1, wx], { translateY: [0, -24], opacity: [1, 0], duration: 450, ease: EXIT, delay: stagger(60) });

  placeMap(5900, 'run');
  snd(5900, () => sfx.whoosh());
  at(6100, ghost, { opacity: 0.55, duration: 800 });
  set(6300, pan, { opacity: 1 });
  at(6300, [...pan.children].slice(0, 4), { opacity: [0, 1], translateY: [16, 0], duration: 800, delay: stagger(90) });
  at(6400, [strip, legend], { opacity: [0, 1], duration: 900 });
  at(6700, dot, { opacity: [0, 1], duration: 300 });
  at(REPLAY0, S, { p: [0, 1], duration: REPLAY_D, ease: 'linear' });
  RUN.stops.forEach((s, k) => at(filmAt(s.t), stopEls[k], { opacity: [0, 0.9], scale: [0.2, 1], duration: 500 }));
  RUN.marks.forEach((m, k) => { const t = filmAt(m.t);
    at(t, tagEls[k], { opacity: [0, 1], scale: [0.4, 1], duration: 700 });
    at(t, feed[k], { opacity: [0, 1], translateX: [-18, 0], duration: 700 });
    snd(t, () => sfx.blip(k + 1)); });
  at(filmAt(DUR), feed[feed.length - 1], { opacity: [0, 1], translateX: [-18, 0], duration: 700 });
  at(filmAt(DUR), dot, { scale: [1, 1.9, 1], duration: 900, ease: 'out(2)' });
  snd(filmAt(DUR), () => sfx.chime());

  at(29000, pan, { opacity: 0, translateY: -16, duration: 450, ease: EXIT });
  at(29000, [strip, legend, map, dot], { opacity: 0, duration: 450, ease: EXIT });
  set(29500, climb, { opacity: 1 }); snd(29500, () => sfx.whoosh());
  at(29500, '.cgrid', { opacity: [0, 1], duration: 700, delay: stagger(30) });
  set(29600, c1, { opacity: 1 }); at(29600, c1.querySelector('.eyebrow'), { opacity: [0, 1], duration: 600 });
  rise(29700, HC);
  at(29800, '#gainN', { ...count(0, F.ht(M.gain)), duration: 2600, ease: 'out(3)' });
  at(30200, c1.querySelector('p'), { opacity: [0, 1], translateY: [12, 0], duration: 800 });
  drawAt(29900, '#cLine', { duration: 2800 });
  at(31300, '#cArea', { opacity: [0, 1], duration: 1400, ease: 'linear' });
  snd(29900, () => sfx.sweep());
  [[iHigh, 0], [iLow, 1]].forEach(([i, k]) => { at(29900 + T.d[i] / DIST * 2800 + 200, cpins[k], { opacity: [0, 1], translateY: [10, 0], duration: 600 }); });
  snd(29900 + T.d[iHigh] / DIST * 2800 + 200, () => sfx.blip(2));
  if (BIG) { drawAt(33600, '#cBig', { duration: 900 }); at(34200, cpins[2], { opacity: [0, 1], translateX: [12, 0], duration: 700 }); snd(33600, () => sfx.blip(4)); }
  if (MARKS) { drawAt(31600, '.lm', { duration: 1300, delay: stagger(260) }); at(33000, '.lmT', { opacity: [0, 1], duration: 700 }); }

  at(37500, [climb, c1], { opacity: 0, duration: 450, ease: EXIT });
  set(38000, heart, { opacity: 1 }); snd(38000, () => sfx.whoosh());
  set(38000, h1, { opacity: 1 }); at(38000, h1.querySelector('.eyebrow'), { opacity: [0, 1], duration: 600 });
  rise(38100, HH);
  at(38600, h1.querySelector('p'), { opacity: [0, 1], translateY: [12, 0], duration: 800 });
  if (HR) {
    at(38200, '#beatN', { ...count(0, M.beats), duration: 3000, ease: 'out(3)' });
    at(38300, '.zband', { opacity: [0, 1], duration: 600, delay: stagger(45) });
    drawAt(38700, '#hLine', { duration: 3000, ease: 'inOut(1.5)' });
    snd(38700, () => sfx.pulse());
    if (mHr) at(38700 + mHr.t / DUR * 3000 + 300, '#hMax', { opacity: [0, 1], duration: 500 });
    at(40400, '.zbar', { scaleX: [0, 1], duration: 900, delay: stagger(110, { from: 'last' }) });
    at(40700, '.zt', { opacity: [0, 1], duration: 500, delay: stagger(28) });
    snd(40400, () => sfx.ladder());
  }

  at(45500, [heart, h1], { opacity: 0, duration: 450, ease: EXIT });
  set(46000, day, { opacity: 1 }); snd(46000, () => sfx.whoosh());
  set(46000, d1, { opacity: 1 }); at(46000, d1.querySelector('.eyebrow'), { opacity: [0, 1], duration: 600 });
  rise(46100, HD);
  at(46600, d1.querySelector('p'), { opacity: [0, 1], translateY: [12, 0], duration: 800 });
  at(46500, '.pbar', { scaleY: [0, 1], duration: 900, delay: stagger(Math.min(70, 1200 / NB)) });
  at(47100, '.pt', { opacity: [0, 1], duration: 450, delay: stagger(Math.min(24, 900 / (NB * 2))) });
  snd(46500, () => sfx.ladder());
  set(47800, tiles, { opacity: 1 });
  at(47800, tileEls, { opacity: [0, 1], translateY: [18, 0], duration: 700, delay: stagger(110) });
  TILES.forEach(([, v, fmt], k) => { at(47900 + k * 110, tileV[k], { ...count(0, v, fmt), duration: 1500, ease: 'out(3)' }); snd(47900 + k * 110, () => sfx.blip(k)); });

  at(53000, [day, d1, tiles], { opacity: 0, duration: 450, ease: EXIT });
  set(53500, map, { translateX: MAP.end[0], translateY: MAP.end[1], scale: MAP.end[2] });
  set(53500, some(['.tag', '.stop', grid, ghost]), { opacity: 0 });
  at(53500, map, { opacity: [0, 0.22], duration: 1400, ease: 'linear' });
  set(53800, end, { opacity: 1 });
  at(53800, end.querySelector('.eyebrow'), { opacity: [0, 1], duration: 700 });
  at(53900, '#fin', { opacity: [0, 1], scale: [0.94, 1], duration: 1200 });
  at(53900, '#fin', { ...count(0, DUR, hms), duration: 2400, ease: 'out(4)' });
  at(55600, '#endl', { opacity: [0, 1], translateY: [12, 0], duration: 900 });
  at(56100, '#ends', { opacity: [0, 1], duration: 900 });
  snd(53900, () => sfx.resolve());
  at(59100, '#fade', { opacity: [0, 1], duration: 800, ease: EXIT });
  set(TOTAL - 1, '#fade', { opacity: 1 });
  let tp; snd(TOTAL - 60, () => tp.finishExport());

  const au = Kit.audio(() => tl.paused);
  const sfx = {
    whoosh() { au.noise(0.9, 0.14, 200, 2200, 1.2); },
    rain() { au.noise(5, 0.05, 5200, 3800, 0.6, 'highpass'); },
    sweep() { au.noise(2.8, 0.06, 300, 1600, 2); },
    beat() { au.tone(58, 0.22, 0.2); au.tone(46, 0.26, 0.13, 'sine', 0.13); },
    pulse() { [0, 0.5, 1, 1.5, 2, 2.5].forEach(d => { au.tone(58, 0.22, 0.16, 'sine', d); au.tone(46, 0.26, 0.1, 'sine', d + 0.13); }); },
    blip(n) { au.tone([523.3, 587.3, 659.3, 784, 880, 987.8][n % 6], 0.6, 0.06); },
    ladder() { [0, 1, 2, 3, 4].forEach(k => au.tone(261.6 * Math.pow(2, k * 2 / 12), 0.4, 0.04, 'triangle', k * 0.11)); },
    chime() { [392, 523.3, 659.3, 784].forEach((x, i) => au.tone(x, 1.8, 0.07, 'sine', i * 0.08)); },
    resolve() { [196, 293.7, 392, 493.9, 587.3].forEach((x, i) => au.tone(x, 3.4, 0.06, 'sine', i * 0.07)); },
  };
  /* heartbeat at half the recorded rate during the replay */
  let nextBeat = 0;
  function heartbeat(t) {
    if (!au.ok() || t < REPLAY0 || t > REPLAY0 + REPLAY_D) return;
    if (au.AC.currentTime >= nextBeat) { sfx.beat(); nextBeat = au.AC.currentTime + 120 / Math.max(80, lastHr); }
  }

  tp = Kit.transport({ root, signal, resume, embed, look: L.key, tl, total: TOTAL, W: 1600, H: 900, chapters: TX.chapters.map((l, k) => [l, CH[k]]), frame: t => { render(); heartbeat(t); WX.draw(t); }, au, UI: WD.ui, file: WD.NAME });
  return { destroy: () => { scope.revert(); root.innerHTML = ''; }, controls: { ...tp.controls, weather: Kit.weatherControl(M) } };
}
