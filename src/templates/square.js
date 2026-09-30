/* Square template: 17 s, 1:1. */
import { createScope, createTimeline, stagger, svg, cubicBezier } from 'animejs';
import * as Kit from '@/lib/kit';
import * as Runs from '@/lib/runs';

// scoped to root, so several templates can share a page (the home page mounts six)
export function mount(root, signal, resume, embed) {
  const scope = createScope({ root });
  return scope.execute(() => draw(root, signal, resume, embed, scope));
}

function draw(root, signal, resume, embed, scope) {
  root.innerHTML = Kit.stageHTML('h-[1080px] w-[1080px] bg-[radial-gradient(80%_70%_at_70%_35%,var(--bg2)_0%,var(--paper)_55%,var(--edge)_100%)] font-display text-(color:--ink)');
  const { h, poly, LAYER, FB, VIEWBOX } = Kit;
  const EYEBROW = 'eyebrow text-[19px]/[1.25] font-medium tracking-[.16em] text-(color:--moss) uppercase', HIDE = 'absolute opacity-0';
  const ENTER = cubicBezier(0.16, 1, 0.3, 1), EXIT = 'in(2)', MOVE = 'inOut(3)', TOTAL = 17000, REPLAY0 = 3600, REPLAY_D = 7400;
  const { L, C, ZC } = Kit.wear(root, 'paper', 'paper', embed?.look);
  const RUN = Runs.current('square'), M = RUN.meta, T = RUN.track, N = T.x.length, DIST = M.distance, DUR = M.elapsed, KMS = DIST / Kit.unitM(), HR = M.hasHr;
  const F = Kit.fmt(RUN), { hms, pace, int, dec, clock, zone } = F, WD = Kit.words(RUN, F), { BPM } = WD;
  if (!HR) ZC[0] = C.moss;
  const { splits: SPLITS, size: SK } = Kit.splits(RUN, F);
  const TX =
      { row: ['Time', 'Pace', 'Heart rate'], nums: ['Distance', 'Time', 'Climb', 'Average pace'], chapters: ['Title', 'Run', 'Numbers', 'End'], elevation: 'ELEVATION',
        splits: `PACE FOR EACH ${SK === 1 ? '' : SK + ' '}${F.MI ? (SK === 1 ? 'MILE' : 'MILES') : 'KM'}` + (HR ? ' · COLOUR IS HEART-RATE ZONE' : ''),
        tagline: `${dec(KMS)} ${F.DU} · ${F.dur(DUR)}`, ends: `started ${clock(0)} · finished ${clock(M.wall ?? DUR)}` };

  const stage = root.querySelector('#stage'), add = el => (stage.appendChild(el), el);
  const SEGS = []; for (let i = 0, z = zone(T.h[0]), i0 = 0; i <= N; i++) { const zi = i < N ? zone(T.h[i]) : -1; if (zi !== z) { SEGS.push({ i0, i1: Math.min(N - 1, i), z }); i0 = i; z = zi; } }

  const art = add(h('svg', { id: 'art', class: `${LAYER} pointer-events-none overflow-visible [&_text]:font-display`, viewBox: '0 0 1080 1080' }));
  const WX = Kit.weatherLayer(M.weather, 1080, 1080, L.dark); add(WX.el);
  art.appendChild(h('defs', {}, h('clipPath', { id: 'cBand' }, h('rect', { id: 'cBandR', x: 70, y: 820, width: 0, height: 200 }))));
  const map = art.appendChild(h('g', { id: 'map', class: VIEWBOX }));
  const ghost = map.appendChild(h('path', { id: 'ghost', d: poly(T.x.map((x, i) => [x, T.y[i]])), fill: 'none', stroke: C.ink, 'stroke-opacity': 0.28, 'stroke-width': 4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  const trail = map.appendChild(h('g', { fill: 'none', 'stroke-width': 13, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  SEGS.forEach(s => { s.el = trail.appendChild(h('path', { d: poly(Array.from({ length: s.i1 - s.i0 + 1 }, (_, k) => [T.x[s.i0 + k], T.y[s.i0 + k]])), stroke: ZC[s.z], opacity: 0 })); s.on = false; });
  const headLine = trail.appendChild(h('path', { d: 'M0 0' }));
  const pins = RUN.marks.map(m => map.appendChild(h('g', { transform: `translate(${m.x} ${m.y})` }, h('circle', { class: `pin ${FB}`, r: 16, fill: C.paper, stroke: m.k === 'hr' ? ZC[5] : C.ink, 'stroke-width': 6, opacity: 0 }))).firstChild);
  map.appendChild(h('circle', { cx: T.x[0], cy: T.y[0], r: 15, fill: C.paper, stroke: C.moss, 'stroke-width': 7 }));
  const dotAt = map.appendChild(h('g', {}, h('g', { id: 'dot', class: FB, opacity: 0 }, h('circle', { r: 40, fill: C.signal, 'fill-opacity': 0.18 }), h('circle', { r: 17, fill: C.signal, stroke: C.paper, 'stroke-width': 6 })))), dot = dotAt.firstChild;

  const SX = d => 70 + d / DIST * 940, SY = a => 1010 - (a - M.minAlt) / Math.max(M.maxAlt - M.minAlt, 60) * 150, SP = T.d.map((d, i) => [SX(d), SY(T.a[i])]);
  const band = art.appendChild(h('g', { id: 'band', opacity: 0 },
    h('text', { x: 70, y: 812, 'font-size': 17, 'font-weight': 500, 'letter-spacing': '.16em', fill: C.soft, text: `${TX.elevation} · ${int(F.ht(M.minAlt))}–${int(F.ht(M.maxAlt))} ${F.HU}` }),
    h('path', { d: poly(SP) + ' L1010 1014 L70 1014 Z', fill: C.ink, 'fill-opacity': 0.06 }),
    h('g', { 'clip-path': 'url(#cBand)', fill: 'none', 'stroke-width': 5, 'stroke-linejoin': 'round' },
      h('path', { d: poly(SP) + ' L1010 1014 L70 1014 Z', fill: C.ink, 'fill-opacity': 0.08, stroke: 'none' }),
      ...SEGS.map(s => h('path', { d: poly(SP.slice(s.i0, s.i1 + 1)), stroke: ZC[s.z] }))),
    h('path', { d: 'M70 1014 H1010', stroke: C.line, 'stroke-width': 2 }),
    h('circle', { id: 'curDot', r: 9, fill: C.signal, stroke: C.paper, 'stroke-width': 3 })));
  const curDot = band.querySelector('#curDot'), cBandR = art.querySelector('#cBandR');

  /* taller is faster; the 28 px base keeps the slowest split visible */
  const SPL = SPLITS, [pMin, pMax] = SPL.reduce(([a, b], s) => [Math.min(a, s.pace), Math.max(b, s.pace)], [Infinity, 0]), BW = 940 / SPL.length;
  const bars = art.appendChild(h('g', { id: 'bars', opacity: 0 },
    h('text', { x: 70, y: 812, 'font-size': 17, 'font-weight': 500, 'letter-spacing': '.16em', fill: C.soft, text: TX.splits }),
    ...SPL.map((s, k) => { const bh = 28 + (pMax - s.pace) / Math.max(1, pMax - pMin) * 150;
      return h('rect', { class: 'vbar origin-bottom [transform-box:fill-box]', x: (70 + k * BW + Math.min(4, BW * 0.12)).toFixed(1), y: (1014 - bh).toFixed(1), width: Math.max(2, BW - Math.min(8, BW * 0.24)).toFixed(1), height: bh.toFixed(1), rx: Math.min(6, BW * 0.2), fill: HR ? ZC[Math.max(1, zone(s.hr))] : C.moss }); }),
    h('path', { d: 'M70 1014 H1010', stroke: C.line, 'stroke-width': 2 })));
  const vbars = [...bars.querySelectorAll('.vbar')];

  const ui = add(h('div', { id: 'ui', class: `${LAYER} pointer-events-none` })), U = el => ui.appendChild(el);
  const ti = U(h('div', { id: 'ti', class: `${HIDE} top-[300px] left-[70px] w-[400px]` }, h('div', { class: EYEBROW, text: [F.DAY, M.place, Kit.weatherLine(M.weather, F)].filter(Boolean).join(' · ') }),
    h('h1', { class: `mt-[22px] font-bold tracking-[-.04em] ${WD.NAME.length > 18 ? 'text-[74px]/[.98]' : 'text-[96px]/[.98]'}` }, ...Kit.wordEls(WD.NAME.split(' '))), h('p', { class: 'mt-[26px] text-[32px]/[1.25] font-normal text-(color:--soft)', text: TX.tagline })));
  const head = U(h('div', { id: 'top', class: `${HIDE} top-[90px] left-[70px] w-[400px]` }, h('div', { class: EYEBROW, text: WD.TITLE }),
    h('div', { id: 'dist', class: 'mt-[8px] flex items-baseline gap-[12px]' }, h('b', { id: 'km', class: 'text-[132px]/none font-bold tracking-[-.05em]', text: dec(0) }), h('small', { class: 'text-[40px]/none font-medium text-(color:--soft)', text: F.DU }))));
  const cell = (label, id, unit, extra) => h('div', {}, h('small', { class: 'block text-[17px]/none font-medium tracking-[.14em] text-(color:--soft) uppercase', text: label }),
    h('b', { class: 'mt-[10px] block text-[56px]/none font-semibold tracking-[-.03em] whitespace-nowrap' }, h('span', { id, text: '0' }), unit ? h('i', { class: 'ml-[6px] text-[22px]/[normal] font-medium tracking-normal text-(color:--soft) not-italic', text: unit }) : null, extra));
  const row = U(h('div', { id: 'row', class: `${HIDE} top-[330px] left-[70px] flex w-[400px] flex-col gap-[26px] border-t-2 border-t-(--line) pt-[26px]` }, cell(TX.row[0], 'el'), cell(TX.row[1], 'pc', `/${F.DU}`), cell(TX.row[2], 'bpm', '', h('span', { id: 'zchip', class: 'ml-[12px] inline-block rounded-[9999px] px-[11px] py-[5px] align-middle text-[19px]/none font-semibold tracking-normal text-white', text: 'Z1', style: HR ? '' : 'display:none' }))));
  const caps = [...RUN.marks.map(m => [m.t, ...WD.mark(m)]), [DUR, WD.finish, clock(M.wall ?? DUR)]].map(([t, a, b]) => U(h('div', { class: `cap ${HIDE} top-[724px] left-[70px] flex w-[940px] items-baseline gap-[16px] text-[36px]/[1.1] font-semibold tracking-[-.015em] whitespace-nowrap` }, h('b', { class: 'font-black', text: a }), h('span', { class: 'text-[27px] font-normal text-(color:--soft)', text: [b, hms(t)].filter(Boolean).join(' · ') }))));
  const NUMS = [[TX.nums[0], KMS, v => dec(v), F.DU], [TX.nums[1], DUR, hms, ''], [TX.nums[2], F.ht(M.gain), int, F.HU], [TX.nums[3], DUR / KMS, pace, `/${F.DU}`]];
  const nums = U(h('div', { id: 'nums', class: `${HIDE} top-[100px] left-[70px] grid w-[940px] grid-cols-2 gap-x-[40px] gap-y-[54px]` }, ...NUMS.map(([l, , , u]) => h('div', { class: 'nrow' },
    h('small', { class: 'block text-[19px]/none font-medium tracking-[.16em] text-(color:--moss) uppercase', text: l }),
    h('b', { class: 'mt-[12px] block text-[94px]/none font-bold tracking-[-.045em] whitespace-nowrap' }, h('span', { class: 'nv', text: '0' }), u ? h('i', { class: 'ml-[10px] text-[32px]/[normal] font-medium tracking-normal text-(color:--soft) not-italic', text: u }) : null)))));
  const nrows = [...nums.children], nvals = [...nums.querySelectorAll('.nv')];
  const end = U(h('div', { id: 'end', class: `${HIDE} top-[300px] left-0 w-[1080px] text-center` }, h('div', { class: EYEBROW, text: WD.TITLE }),
    h('div', { id: 'fin', class: 'mt-[34px] text-[190px]/none font-bold tracking-[-.05em]', text: '0:00:00' }),
    h('div', { id: 'endl', class: 'mt-[30px] text-[38px]/[1.2] font-medium', text: `${dec(KMS)} ${F.DU} · ${int(F.ht(M.gain))} ${F.HU} ↑` + (HR ? ` · ${M.avgHr} ${BPM}` : '') }),
    h('div', { id: 'ends', class: 'mt-[18px] text-[26px]/[1.3] font-normal text-(color:--soft)', text: `${F.DAY} · ${TX.ends}` })));
  add(h('div', { id: 'fade', class: `${LAYER} pointer-events-none bg-(--paper) opacity-0` }));
  const E = Object.fromEntries(['km', 'el', 'pc', 'bpm', 'zchip'].map(k => [k, ui.querySelector('#' + k)])), W1 = [...ti.querySelectorAll('[data-word]')];

  const S = { p: 0 }; let lastP = -1, lastHr = M.avgHr || 140;
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
    const sx = SX(d); cBandR.setAttribute('width', Math.max(0, sx - 70)); curDot.setAttribute('cx', sx); curDot.setAttribute('cy', SY(a));
    E.km.textContent = dec(d / F.U); E.el.textContent = hms(te); E.pc.textContent = v > 0.6 ? pace(F.U / v) : '–';
    if (HR) { const z = Math.max(1, zone(b)); E.bpm.textContent = Math.round(b); E.zchip.textContent = 'Z' + z; E.zchip.style.background = ZC[z]; lastHr = b; } else E.bpm.textContent = '–';
  }

  const tl = createTimeline({ autoplay: false, loop: true, defaults: { ease: ENTER, duration: 900 } });
  const at = (t, targets, params) => tl.add(targets, params, t), set = (t, targets, params) => tl.set(targets, params, t), snd = (t, fn) => tl.call(fn, t);
  const count = (from, to, fmt = int) => ({ textContent: [from, to], modifier: fmt });
  const MAP = { title: [440, 230, 0.59], run: [480, 70, 0.54], back: [300, 40, 0.74] };
  const placeMap = (t, k, dur = 1100) => { const [x, y, s] = MAP[k]; return at(t, map, { translateX: x, translateY: y, scale: s, duration: dur, ease: MOVE }); };
  const filmAt = sec => REPLAY0 + sec / DUR * REPLAY_D;
  const CH = [0, 3000, 11300, 14600];

  set(0, S, { p: 0 });
  set(0, map, { translateX: MAP.title[0], translateY: MAP.title[1], scale: MAP.title[2], opacity: 1 });
  set(0, [...ui.children], { opacity: 0, translateY: 0 });
  set(0, [band, bars, dot, '#fade', ...pins, ...nrows, ...W1, '#ti .eyebrow', '#ti p', '#top .eyebrow', '#dist', '#end .eyebrow', '#fin', '#endl', '#ends'], { opacity: 0 });
  set(0, vbars, { scaleY: 0 });
  at(0, ghost, { opacity: [0, 0], duration: 1 });

  set(150, ghost, { opacity: 1 });
  at(150, svg.createDrawable(ghost), { draw: ['0 0', '0 1'], duration: 2500, ease: 'inOut(2)' });
  set(250, ti, { opacity: 1 });
  at(250, '#ti .eyebrow', { opacity: [0, 1], duration: 700 });
  set(400, W1, { translateY: '60%' }); at(400, W1, { translateY: ['60%', '0%'], opacity: [0, 1], duration: 1000, delay: stagger(100) });
  at(1000, '#ti p', { opacity: [0, 1], translateY: [14, 0], duration: 800 });
  snd(250, () => sfx.blip(0));
  at(2600, ti, { opacity: 0, translateY: -24, duration: 400, ease: EXIT });

  placeMap(2900, 'run'); snd(2900, () => sfx.whoosh());
  set(3100, [head, row], { opacity: 1 });
  at(3100, ['#top .eyebrow', '#dist'], { opacity: [0, 1], translateY: [18, 0], duration: 700, delay: stagger(90) });
  at(3200, row, { opacity: [0, 1], translateY: [18, 0], duration: 700 });
  at(3200, band, { opacity: [0, 1], duration: 700 });
  at(3350, dot, { opacity: [0, 1], duration: 300 });
  at(REPLAY0, S, { p: [0, 1], duration: REPLAY_D, ease: 'linear' });
  caps.forEach((c, k) => { const t = k < RUN.marks.length ? filmAt(RUN.marks[k].t) : filmAt(DUR), last = k === caps.length - 1;
    if (pins[k]) at(t, pins[k], { opacity: [0, 1], scale: [0.3, 1], duration: 500 });
    at(t, c, { opacity: [0, 1], translateY: [14, 0], duration: 350 });
    if (!last) at(Math.max(t + 200, Math.min(t + 1100, (k + 1 < RUN.marks.length ? filmAt(RUN.marks[k + 1].t) : filmAt(DUR)) - 120)), c, { opacity: 0, duration: 120, ease: 'linear' });
    snd(t, () => (last ? sfx.chime() : sfx.blip(k + 1))); });
  at(filmAt(DUR), dot, { scale: [1, 1.8, 1], duration: 900, ease: 'out(2)' });

  at(11300, [head, row, caps[caps.length - 1]], { opacity: 0, translateY: -20, duration: 400, ease: EXIT });
  at(11300, [band, dot], { opacity: 0, duration: 400, ease: EXIT });
  placeMap(11300, 'back', 1300); at(11300, map, { opacity: 0.1, duration: 900, ease: 'linear' });
  snd(11300, () => sfx.whoosh());
  set(11600, nums, { opacity: 1 });
  at(11600, nrows, { opacity: [0, 1], translateY: [30, 0], duration: 800, delay: stagger(180) });
  NUMS.forEach(([, v, fmt], k) => { at(11600 + k * 180, nvals[k], { ...count(0, v, fmt), duration: 1200, ease: 'out(3)' }); snd(11600 + k * 180, () => sfx.blip(k)); });
  set(11800, bars, { opacity: 1 });
  at(11800, vbars, { scaleY: [0, 1], duration: 700, delay: stagger(Math.min(60, 1400 / SPL.length)) });

  at(14200, [nums, bars], { opacity: 0, translateY: -20, duration: 400, ease: EXIT });
  set(14600, end, { opacity: 1 });
  at(14600, '#end .eyebrow', { opacity: [0, 1], duration: 600 });
  at(14700, '#fin', { opacity: [0, 1], scale: [0.94, 1], duration: 900 });
  at(14700, '#fin', { ...count(0, DUR, hms), duration: 1400, ease: 'out(4)' });
  at(15500, ['#endl', '#ends'], { opacity: [0, 1], translateY: [12, 0], duration: 700, delay: stagger(140) });
  snd(14700, () => sfx.resolve());
  at(16400, '#fade', { opacity: [0, 1], duration: 550, ease: EXIT });
  set(TOTAL - 1, '#fade', { opacity: 1 });
  let tp; snd(TOTAL - 60, () => tp.finishExport());

  const au = Kit.audio(() => tl.paused);
  const sfx = {
    whoosh() { au.noise(0.7, 0.12, 240, 2400, 1.2); },
    beat() { au.tone(62, 0.2, 0.18); au.tone(49, 0.24, 0.12, 'sine', 0.12); },
    blip(n) { au.tone([587.3, 659.3, 784, 880, 987.8, 1174.7][n % 6], 0.5, 0.06); },
    chime() { [440, 587.3, 740, 880].forEach((x, i) => au.tone(x, 1.6, 0.07, 'sine', i * 0.07)); },
    resolve() { [220, 329.6, 440, 554.4, 659.3].forEach((x, i) => au.tone(x, 2.6, 0.06, 'sine', i * 0.07)); },
  };
  let nextBeat = 0;
  function heartbeat(t) { if (!au.ok() || t < REPLAY0 || t > REPLAY0 + REPLAY_D) return;
    if (au.AC.currentTime >= nextBeat) { sfx.beat(); nextBeat = au.AC.currentTime + 120 / Math.max(80, lastHr); } }

  tp = Kit.transport({ root, signal, resume, embed, look: L.key, tl, total: TOTAL, W: 1080, H: 1080, chapters: TX.chapters.map((l, k) => [l, CH[k]]), frame: t => { render(); heartbeat(t); WX.draw(t); }, au, UI: WD.ui, file: WD.NAME + ' square' });
  return { destroy: () => { scope.revert(); root.innerHTML = ''; }, controls: { ...tp.controls, weather: Kit.weatherControl(M) } };
}
