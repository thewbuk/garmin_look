/* Story template: 22 s, 9:16. */
import { createScope, createTimeline, stagger, svg, cubicBezier } from 'animejs';
import * as Kit from '@/lib/kit';
import * as Runs from '@/lib/runs';

// scoped to root, so several templates can share a page (the home page mounts six)
export function mount(root, signal, resume, embed) {
  const scope = createScope({ root });
  return scope.execute(() => draw(root, signal, resume, embed, scope));
}

function draw(root, signal, resume, embed, scope) {
  root.innerHTML = Kit.stageHTML('h-[1920px] w-[1080px] bg-[radial-gradient(90%_60%_at_50%_42%,var(--bg2)_0%,var(--ink)_60%,var(--edge)_100%)] font-display text-(color:--paper)');
  const { h, poly, LAYER, FB, VIEWBOX } = Kit;
  const EYEBROW = 'eyebrow text-[26px]/[1.2] font-medium tracking-[.16em] text-(color:--moss) uppercase', HIDE = 'absolute opacity-0';
  const ENTER = cubicBezier(0.16, 1, 0.3, 1), EXIT = 'in(2)', MOVE = 'inOut(3)', TOTAL = 22000, REPLAY0 = 3800, REPLAY_D = 9200;
  const { L, C, ZC } = Kit.wear(root, 'night', 'ink', embed?.look);
  const RUN = Runs.current('story'), M = RUN.meta, T = RUN.track, N = T.x.length, DIST = M.distance, DUR = M.elapsed, KMS = DIST / Kit.unitM(), HR = M.hasHr;
  const F = Kit.fmt(RUN), { hms, pace, int, dec, clock, zone } = F, WD = Kit.words(RUN, F), { BPM } = WD;
  if (!HR) ZC[0] = C.moss;
  const TX =
      { row: ['Time', 'Pace', 'Heart rate'], nums: ['Distance', 'Time', 'Climb', 'Average pace', 'Average heart rate'], chapters: ['Title', 'Run', 'Numbers', 'End'], elevation: 'ELEVATION',
        tagline: `${dec(KMS)} ${F.DU} · ${F.dur(DUR)}`, ends: `started ${clock(0)} · finished ${clock(M.wall ?? DUR)}` };

  const stage = root.querySelector('#stage'), add = el => (stage.appendChild(el), el);
  const SEGS = []; for (let i = 0, z = zone(T.h[0]), i0 = 0; i <= N; i++) { const zi = i < N ? zone(T.h[i]) : -1; if (zi !== z) { SEGS.push({ i0, i1: Math.min(N - 1, i), z }); i0 = i; z = zi; } }

  const art = add(h('svg', { id: 'art', class: `${LAYER} pointer-events-none overflow-visible [&_text]:font-display`, viewBox: '0 0 1080 1920' }));
  const WX = Kit.weatherLayer(M.weather, 1080, 1920, L.dark); add(WX.el);
  art.appendChild(h('defs', {},
    h('radialGradient', { id: 'gDot' }, h('stop', { offset: 0, 'stop-color': C.signal, 'stop-opacity': 0.55 }), h('stop', { offset: 1, 'stop-color': C.signal, 'stop-opacity': 0 })),
    h('clipPath', { id: 'cStrip' }, h('rect', { id: 'cStripR', x: 90, y: 1690, width: 0, height: 170 }))));
  const map = art.appendChild(h('g', { id: 'map', class: VIEWBOX }));
  const ghost = map.appendChild(h('path', { id: 'ghost', d: poly(T.x.map((x, i) => [x, T.y[i]])), fill: 'none', stroke: C.paper, 'stroke-opacity': 0.34, 'stroke-width': 3.2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  const trail = map.appendChild(h('g', { fill: 'none', 'stroke-width': 11, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  SEGS.forEach(s => { s.el = trail.appendChild(h('path', { d: poly(Array.from({ length: s.i1 - s.i0 + 1 }, (_, k) => [T.x[s.i0 + k], T.y[s.i0 + k]])), stroke: ZC[s.z], opacity: 0 })); s.on = false; });
  const headLine = trail.appendChild(h('path', { d: 'M0 0' }));
  const pins = RUN.marks.map(m => map.appendChild(h('g', { transform: `translate(${m.x} ${m.y})` }, h('circle', { class: `pin ${FB}`, r: 15, fill: C.ink, stroke: m.k === 'hr' ? ZC[5] : C.paper, 'stroke-width': 5, opacity: 0 }))).firstChild);
  map.appendChild(h('circle', { cx: T.x[0], cy: T.y[0], r: 13, fill: C.ink, stroke: C.moss, 'stroke-width': 5 }));
  const dotAt = map.appendChild(h('g', {}, h('g', { id: 'dot', class: FB, opacity: 0 }, h('circle', { r: 46, fill: 'url(#gDot)' }), h('circle', { r: 15, fill: C.signal, stroke: C.paper, 'stroke-width': 5 })))), dot = dotAt.firstChild;
  const SX = d => 90 + d / DIST * 900, SY = a => 1850 - (a - M.minAlt) / Math.max(M.maxAlt - M.minAlt, 60) * 130, SP = T.d.map((d, i) => [SX(d), SY(T.a[i])]);
  const strip = art.appendChild(h('g', { id: 'strip', opacity: 0 },
    h('text', { x: 90, y: 1700, 'font-size': 20, 'letter-spacing': '.14em', fill: C.soft, text: TX.elevation }),
    h('path', { d: poly(SP) + ' L990 1856 L90 1856 Z', fill: C.paper, 'fill-opacity': 0.07 }),
    h('g', { 'clip-path': 'url(#cStrip)', fill: 'none', 'stroke-width': 5, 'stroke-linejoin': 'round' },
      h('path', { d: poly(SP) + ' L990 1856 L90 1856 Z', fill: C.paper, 'fill-opacity': 0.1, stroke: 'none' }),
      ...SEGS.map(s => h('path', { d: poly(SP.slice(s.i0, s.i1 + 1)), stroke: ZC[s.z] }))),
    h('circle', { id: 'curDot', r: 8, fill: C.signal })));
  const curDot = strip.querySelector('#curDot'), cStripR = art.querySelector('#cStripR');

  const ui = add(h('div', { id: 'ui', class: `${LAYER} pointer-events-none` })), U = el => ui.appendChild(el);
  const ti = U(h('div', { id: 'ti', class: `${HIDE} top-[190px] left-[90px] w-[900px]` }, h('div', { class: EYEBROW, text: [F.DAY, M.place, Kit.weatherLine(M.weather, F)].filter(Boolean).join(' · ') }),
    h('h1', { class: `mt-[28px] font-semibold tracking-[-.035em] ${WD.NAME.length > 18 ? 'text-[92px]/none' : 'text-[128px]/none'}` }, ...Kit.wordEls(WD.NAME.split(' '))), h('p', { class: 'mt-[30px] text-[44px]/[1.25] font-normal text-(color:--soft)', text: TX.tagline })));
  const head = U(h('div', { id: 'top', class: `${HIDE} top-[120px] left-[90px] w-[900px]` }, h('div', { class: EYEBROW, text: WD.TITLE }),
    h('div', { id: 'dist', class: 'mt-[6px] flex items-baseline gap-[18px]' }, h('b', { id: 'km', class: 'text-[250px]/none font-semibold tracking-[-.05em]', text: dec(0) }), h('small', { class: 'text-[64px]/none font-medium text-(color:--soft)', text: F.DU }))));
  const cell = (label, id, unit, extra) => h('div', {}, h('small', { class: 'block text-[22px]/none font-medium tracking-[.14em] text-(color:--soft) uppercase', text: label }),
    h('b', { class: 'mt-[14px] block text-[70px]/none font-medium tracking-[-.025em] whitespace-nowrap' }, h('span', { id, text: '0' }), unit ? h('i', { class: 'ml-[8px] text-[26px]/[normal] font-medium tracking-normal text-(color:--soft) not-italic', text: unit }) : null, extra));
  const row = U(h('div', { id: 'row', class: `${HIDE} top-[1370px] left-[90px] grid w-[900px] grid-cols-[1.25fr_1fr_1.1fr] gap-x-[28px] gap-y-0 border-t-2 border-t-(--line) pt-[30px]` }, cell(TX.row[0], 'el'), cell(TX.row[1], 'pc', `/${F.DU}`), cell(TX.row[2], 'bpm', '', h('span', { id: 'zchip', class: 'ml-[14px] inline-block rounded-[9999px] px-[13px] py-[6px] align-middle text-[24px]/none font-semibold tracking-normal text-(color:--ink)', text: 'Z1', style: HR ? '' : 'display:none' }))));
  const caps = [...RUN.marks.map(m => [m.t, ...WD.mark(m)]), [DUR, WD.finish, clock(M.wall ?? DUR)]].map(([t, a, b]) => U(h('div', { class: `cap ${HIDE} top-[1590px] left-[90px] flex w-[900px] items-baseline gap-[18px] text-[44px]/[1.1] font-semibold tracking-[-.015em] whitespace-nowrap` }, h('b', { class: 'font-black', text: a }), h('span', { class: 'text-[34px] font-normal text-(color:--soft)', text: [b, hms(t)].filter(Boolean).join(' · ') }))));
  const NUMS = [[TX.nums[0], KMS, v => dec(v), F.DU], [TX.nums[1], DUR, hms, ''], [TX.nums[2], F.ht(M.gain), int, F.HU], [TX.nums[3], DUR / KMS, pace, `/${F.DU}`], HR && [TX.nums[4], M.avgHr, int, BPM]].filter(Boolean);
  const nums = U(h('div', { id: 'nums', class: `${HIDE} top-[250px] left-[90px] flex w-[900px] flex-col gap-[46px]` }, ...NUMS.map(([l, , , u]) => h('div', { class: 'nrow' },
    h('small', { class: 'block text-[26px]/none font-medium tracking-[.16em] text-(color:--moss) uppercase', text: l }),
    h('b', { class: 'mt-[12px] block text-[170px]/none font-semibold tracking-[-.045em] whitespace-nowrap' }, h('span', { class: 'nv', text: '0' }), u ? h('i', { class: 'ml-[14px] text-[56px]/[normal] font-medium tracking-normal text-(color:--soft) not-italic', text: u }) : null)))));
  const nrows = [...nums.children], nvals = [...nums.querySelectorAll('.nv')];
  const end = U(h('div', { id: 'end', class: `${HIDE} top-[640px] left-0 w-[1080px] text-center` }, h('div', { class: EYEBROW, text: WD.TITLE }),
    h('div', { id: 'fin', class: 'mt-[40px] text-[214px]/none font-semibold tracking-[-.05em]', text: '0:00:00' }),
    h('div', { id: 'endl', class: 'mt-[36px] text-[50px]/[1.2] font-medium', text: `${dec(KMS)} ${F.DU} · ${int(F.ht(M.gain))} ${F.HU} ↑` }),
    h('div', { id: 'ends', class: 'mt-[22px] text-[34px]/[1.3] font-normal text-(color:--soft)', text: `${F.DAY} · ${TX.ends}` })));
  add(h('div', { id: 'fade', class: `${LAYER} pointer-events-none bg-(--ink) opacity-0` }));
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
    const sx = SX(d); cStripR.setAttribute('width', Math.max(0, sx - 90)); curDot.setAttribute('cx', sx); curDot.setAttribute('cy', SY(a));
    E.km.textContent = dec(d / F.U); E.el.textContent = hms(te); E.pc.textContent = v > 0.6 ? pace(F.U / v) : '–';
    if (HR) { const z = Math.max(1, zone(b)); E.bpm.textContent = Math.round(b); E.zchip.textContent = 'Z' + z; E.zchip.style.background = ZC[z]; lastHr = b; } else E.bpm.textContent = '–';
  }

  const tl = createTimeline({ autoplay: false, loop: true, defaults: { ease: ENTER, duration: 900 } });
  const at = (t, targets, params) => tl.add(targets, params, t), set = (t, targets, params) => tl.set(targets, params, t), snd = (t, fn) => tl.call(fn, t);
  const count = (from, to, fmt = int) => ({ textContent: [from, to], modifier: fmt });
  const MAP = { title: [90, 720, 0.9], run: [90, 440, 0.9], back: [-60, 420, 1.2] };
  const placeMap = (t, k, dur = 1200) => { const [x, y, s] = MAP[k]; return at(t, map, { translateX: x, translateY: y, scale: s, duration: dur, ease: MOVE }); };
  const filmAt = sec => REPLAY0 + sec / DUR * REPLAY_D;
  const CH = [0, 3200, 13300, 18800];

  set(0, S, { p: 0 });
  set(0, map, { translateX: MAP.title[0], translateY: MAP.title[1], scale: MAP.title[2], opacity: 1 });
  set(0, [...ui.children], { opacity: 0, translateY: 0 });
  set(0, [strip, dot, '#fade', ...pins, ...nrows, ...W1, '#ti .eyebrow', '#ti p', '#top .eyebrow', '#dist', '#end .eyebrow', '#fin', '#endl', '#ends'], { opacity: 0 });
  at(0, ghost, { opacity: [0, 0], duration: 1 });

  set(200, ghost, { opacity: 1 });
  at(200, svg.createDrawable(ghost), { draw: ['0 0', '0 1'], duration: 2600, ease: 'inOut(2)' });
  set(300, ti, { opacity: 1 });
  at(300, '#ti .eyebrow', { opacity: [0, 1], duration: 700 });
  set(450, W1, { translateY: '60%' }); at(450, W1, { translateY: ['60%', '0%'], opacity: [0, 1], duration: 1000, delay: stagger(110) });
  at(1100, '#ti p', { opacity: [0, 1], translateY: [16, 0], duration: 800 });
  snd(300, () => sfx.blip(0));
  at(2800, ti, { opacity: 0, translateY: -30, duration: 400, ease: EXIT });

  placeMap(3000, 'run'); snd(3000, () => sfx.whoosh());
  set(3300, [head, row], { opacity: 1 });
  at(3300, ['#top .eyebrow', '#dist'], { opacity: [0, 1], translateY: [20, 0], duration: 700, delay: stagger(90) });
  at(3300, row, { opacity: [0, 1], translateY: [20, 0], duration: 700 });
  at(3400, strip, { opacity: [0, 1], duration: 800 });
  at(3500, dot, { opacity: [0, 1], duration: 300 });
  at(REPLAY0, S, { p: [0, 1], duration: REPLAY_D, ease: 'linear' });
  caps.forEach((c, k) => { const t = k < RUN.marks.length ? filmAt(RUN.marks[k].t) : filmAt(DUR), last = k === caps.length - 1;
    if (pins[k]) at(t, pins[k], { opacity: [0, 1], scale: [0.3, 1], duration: 500 });
    at(t, c, { opacity: [0, 1], translateY: [18, 0], duration: 350 });
    if (!last) at(Math.max(t + 200, Math.min(t + 1300, (k + 1 < RUN.marks.length ? filmAt(RUN.marks[k + 1].t) : filmAt(DUR)) - 120)), c, { opacity: 0, duration: 120, ease: 'linear' });
    snd(t, () => (last ? sfx.chime() : sfx.blip(k + 1))); });
  at(filmAt(DUR), dot, { scale: [1, 1.9, 1], duration: 900, ease: 'out(2)' });

  at(13300, [head, row, caps[caps.length - 1]], { opacity: 0, translateY: -24, duration: 400, ease: EXIT });
  at(13300, [strip, dot], { opacity: 0, duration: 400, ease: EXIT });
  placeMap(13300, 'back', 1400); at(13300, map, { opacity: 0.16, duration: 1000, ease: 'linear' });
  snd(13300, () => sfx.whoosh());
  set(13700, nums, { opacity: 1 });
  at(13700, nrows, { opacity: [0, 1], translateY: [40, 0], duration: 800, delay: stagger(240) });
  NUMS.forEach(([, v, fmt], k) => { at(13700 + k * 240, nvals[k], { ...count(0, v, fmt), duration: 1300, ease: 'out(3)' }); snd(13700 + k * 240, () => sfx.blip(k)); });

  at(18400, nums, { opacity: 0, translateY: -24, duration: 400, ease: EXIT });
  set(18800, end, { opacity: 1 });
  at(18800, '#end .eyebrow', { opacity: [0, 1], duration: 600 });
  at(18900, '#fin', { opacity: [0, 1], scale: [0.94, 1], duration: 1000 });
  at(18900, '#fin', { ...count(0, DUR, hms), duration: 1700, ease: 'out(4)' });
  at(20000, ['#endl', '#ends'], { opacity: [0, 1], translateY: [14, 0], duration: 700, delay: stagger(160) });
  snd(18900, () => sfx.resolve());
  at(21300, '#fade', { opacity: [0, 1], duration: 600, ease: EXIT });
  set(TOTAL - 1, '#fade', { opacity: 1 });
  let tp; snd(TOTAL - 60, () => tp.finishExport());

  const au = Kit.audio(() => tl.paused);
  const sfx = {
    whoosh() { au.noise(0.8, 0.14, 200, 2200, 1.2); },
    beat() { au.tone(58, 0.22, 0.2); au.tone(46, 0.26, 0.13, 'sine', 0.13); },
    blip(n) { au.tone([523.3, 587.3, 659.3, 784, 880, 987.8][n % 6], 0.6, 0.06); },
    chime() { [392, 523.3, 659.3, 784].forEach((x, i) => au.tone(x, 1.8, 0.07, 'sine', i * 0.08)); },
    resolve() { [196, 293.7, 392, 493.9, 587.3].forEach((x, i) => au.tone(x, 3, 0.06, 'sine', i * 0.07)); },
  };
  let nextBeat = 0;
  function heartbeat(t) { if (!au.ok() || t < REPLAY0 || t > REPLAY0 + REPLAY_D) return;
    if (au.AC.currentTime >= nextBeat) { sfx.beat(); nextBeat = au.AC.currentTime + 120 / Math.max(80, lastHr); } }

  tp = Kit.transport({ root, signal, resume, embed, look: L.key, tl, total: TOTAL, W: 1080, H: 1920, chapters: TX.chapters.map((l, k) => [l, CH[k]]), frame: t => { render(); heartbeat(t); WX.draw(t); }, au, UI: WD.ui, file: WD.NAME + ' story' });
  return { destroy: () => { scope.revert(); root.innerHTML = ''; }, controls: { ...tp.controls, weather: Kit.weatherControl(M) } };
}
