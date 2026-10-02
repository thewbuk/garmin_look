import { createScope, createTimeline, stagger, svg, cubicBezier } from 'animejs';
import * as Kit from '@/lib/kit';
import * as Runs from '@/lib/runs';

// scoped to root, so several templates can share a page (the home page mounts six)
export function mount(root, signal, resume, embed) {
  const scope = createScope({ root });
  return scope.execute(() => draw(root, signal, resume, embed, scope));
}

function draw(root, signal, resume, embed, scope) {
  root.innerHTML = '<svg id="poster" class="block rounded-[6px] shadow-[0_24px_80px_#000c] aspect-[4/5] h-[min(calc(100vh_-_48px),calc((100vw_-_372px)*1.25))] max-[999px]:h-[min(72vh,calc(94vw*1.25))]" viewBox="0 0 1200 1500" xmlns="http://www.w3.org/2000/svg" font-family="Inter, \'Helvetica Neue\', Arial, sans-serif"></svg>';
  const asvg = svg, { h, poly } = Kit;
  const { L, C, ZC } = Kit.wear(root, 'terracotta', 'paper', embed?.look);
  const RUN = Runs.current('poster'), M = RUN.meta, T = RUN.track, N = T.x.length, DIST = M.distance, DUR = M.elapsed, KMS = DIST / Kit.unitM(), HR = M.hasHr;
  const F = Kit.fmt(RUN), { hms, pace, int, dec, clock, zone } = F, WD = Kit.words(RUN, F), UI = WD.ui;
  if (!HR) ZC[0] = C.moss;
  const TX =
      { stats: ['Distance', 'Time', 'Climb', 'Average pace', 'Average heart rate', 'Steps', 'Energy'], elevation: 'ELEVATION', zones: 'TIME IN HEART-RATE ZONES', foot: `started ${clock(0)} · finished ${clock(M.wall ?? DUR)}`,
        save: 'Save PNG', again: 'Replay', saved: f => `Saved ${f}` };

  const P = root.querySelector('#poster');
  const SEGS = []; for (let i = 0, z = zone(T.h[0]), i0 = 0; i <= N; i++) { const zi = i < N ? zone(T.h[i]) : -1; if (zi !== z) { SEGS.push({ i0, i1: Math.min(N - 1, i), z }); i0 = i; z = zi; } }
  // SVG text doesn't wrap, so split the title by hand (two lines max)
  const lines = (text, max) => { const out = ['']; for (const w of text.split(' ')) { if (out[out.length - 1] && (out[out.length - 1] + ' ' + w).length > max) out.push(w); else out[out.length - 1] += (out[out.length - 1] ? ' ' : '') + w; } return out.slice(0, 2); };
  const title = lines(WD.NAME, 19), y0 = 150 + title.length * 96;

  P.append(h('rect', { width: 1200, height: 1500, fill: C.paper }), Kit.weatherSvg(Kit.skyOf(M, embed), 1200, 1500, L.dark),
    h('text', { class: 'in', x: 80, y: 112, 'font-size': 21, 'font-weight': 500, 'letter-spacing': '.16em', fill: C.moss, text: [F.DATE, M.place, Kit.weatherLine(Kit.skyOf(M, embed), F)].filter(Boolean).join(' · ').toUpperCase() }),
    ...title.map((l, k) => h('text', { class: 'in', x: 76, y: 210 + k * 96, 'font-size': 92, 'font-weight': 700, 'letter-spacing': '-.03em', fill: C.ink, text: l })),
    WD.EVENT ? h('text', { class: 'in', x: 80, y: y0 + 8, 'font-size': 30, fill: C.soft, text: WD.EVENT }) : '');

  const MY = y0 + 40, map = P.appendChild(h('g', { transform: `translate(80 ${MY}) scale(.7)` }));
  const BM = Kit.underlay(map, M, L, embed, { fade: 0, radius: 28 });
  if (BM) map.appendChild(h('text', { x: 986, y: 982, 'text-anchor': 'end', 'font-size': 21, fill: C.soft, text: BM.credit }));
  const KM = M.unitsPerKm * F.U / 1000, BAR = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50].filter(k => k * KM <= 300).pop() || 0.1, GRID = BAR * 0.4 * KM;
  const grid = map.appendChild(h('g', { stroke: C.ink, 'stroke-opacity': 0.06, 'stroke-width': 1.5 }));
  for (let v = 500 % GRID; v < 1000; v += GRID) grid.appendChild(h('path', { d: `M${v.toFixed(1)} 0 V1000 M0 ${v.toFixed(1)} H1000` }));
  const ghost = map.appendChild(h('path', { id: 'ghost', d: poly(T.x.map((x, i) => [x, T.y[i]])), fill: 'none', stroke: C.ink, 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  map.appendChild(h('g', { fill: 'none', 'stroke-width': 10, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' },
    ...SEGS.map(s => h('path', { class: 'seg', d: poly(Array.from({ length: s.i1 - s.i0 + 1 }, (_, k) => [T.x[s.i0 + k], T.y[s.i0 + k]])), stroke: ZC[s.z] }))));
  map.append(...RUN.stops.map(s => h('circle', { class: 'pin', cx: s.x, cy: s.y, r: 10, fill: C.paper, stroke: C.ink, 'stroke-width': 3.5 })),
    h('circle', { class: 'pin', cx: T.x[0], cy: T.y[0], r: 15, fill: C.paper, stroke: C.moss, 'stroke-width': 6 }),
    M.loop ? '' : h('circle', { class: 'pin', cx: T.x[N - 1], cy: T.y[N - 1], r: 15, fill: C.ink, stroke: C.paper, 'stroke-width': 4 }));
  P.append(h('path', { class: 'in', d: `M80 ${MY + 724} v-8 m0 4 H${(80 + KM * BAR * 0.7).toFixed(1)} m0 4 v-8`, fill: 'none', stroke: C.soft, 'stroke-width': 1.6 }),
    h('text', { class: 'in', x: 92 + KM * BAR * 0.7, y: MY + 725, 'font-size': 15, fill: C.soft, text: BAR < 1 && !F.MI ? `${BAR * 1000} m` : `${BAR} ${F.DU}` }));

  const FIG = [[TX.stats[0], KMS, v => dec(v, 2), F.DU], [TX.stats[1], DUR, hms, ''], [TX.stats[2], F.ht(M.gain), int, F.HU], [TX.stats[3], DUR / KMS, pace, `/${F.DU}`],
    HR && [TX.stats[4], M.avgHr, int, WD.BPM], M.steps && [TX.stats[5], M.steps, int, ''], M.calories && [TX.stats[6], M.calories, int, 'kcal']].filter(Boolean).slice(0, 6);
  FIG.forEach(([label, , , unit], k) => { const y = MY + 26 + k * 116; return P.appendChild(h('g', { class: 'fig' },
    h('text', { x: 850, y, 'font-size': 15, 'font-weight': 500, 'letter-spacing': '.16em', fill: C.soft, text: label.toUpperCase() }),
    h('text', { x: 848, y: y + 58, 'font-size': 58, 'font-weight': 600, 'letter-spacing': '-.03em', fill: C.ink }, h('tspan', { class: 'fv', text: '0' }), unit ? h('tspan', { dx: 8, 'font-size': 20, 'font-weight': 400, 'letter-spacing': '0', fill: C.soft, text: unit }) : null))); });
  const fvals = [...P.querySelectorAll('.fv')];

  const EY = MY + 770, SX = d => 80 + d / DIST * 1040, SY = a => EY + 130 - (a - M.minAlt) / Math.max(M.maxAlt - M.minAlt, 60) * 110, SP = T.d.map((d, i) => [SX(d), SY(T.a[i])]);
  P.append(h('text', { class: 'in', x: 80, y: EY, 'font-size': 15, 'font-weight': 500, 'letter-spacing': '.16em', fill: C.soft, text: `${TX.elevation} · ${int(F.ht(M.minAlt))}–${int(F.ht(M.maxAlt))} ${F.HU}` }),
    h('path', { class: 'in', d: poly(SP) + ` L1120 ${EY + 134} L80 ${EY + 134} Z`, fill: C.ink, 'fill-opacity': 0.06 }),
    h('g', { fill: 'none', 'stroke-width': 4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, ...SEGS.map(s => h('path', { class: 'seg', d: poly(SP.slice(s.i0, s.i1 + 1)), stroke: ZC[s.z] }))),
    h('path', { class: 'in', d: `M80 ${EY + 134} H1120`, stroke: C.line, 'stroke-width': 2 }));

  const ZY = EY + 190, zTotal = M.zoneSecs.reduce((a, b) => a + b, 0) || 1; let zx = 80;
  if (HR) { P.append(h('text', { class: 'in', x: 80, y: ZY, 'font-size': 15, 'font-weight': 500, 'letter-spacing': '.16em', fill: C.soft, text: TX.zones }));
    M.zoneSecs.forEach((s, k) => { const w = s / zTotal * 1040; if (w < 1) return;
      P.append(h('rect', { class: 'zb', x: zx, y: ZY + 16, width: Math.max(1, w - 3), height: 22, rx: 4, fill: ZC[k + 1] }),
        w > 96 ? h('text', { class: 'in', x: zx, y: ZY + 62, 'font-size': 16, fill: C.soft, text: `Z${k + 1} · ${hms(s)}` }) : ''); zx += w; }); }
  P.append(h('text', { class: 'in', x: 80, y: 1462, 'font-size': 17, fill: C.soft, text: TX.foot }),
    h('text', { class: 'in', x: 1120, y: 1462, 'text-anchor': 'end', 'font-size': 17, fill: C.soft, text: WD.SPORT }));

  const ENTER = cubicBezier(0.16, 1, 0.3, 1);
  let anim = null;
  function play() {
    anim?.pause();
    const tl = anim = createTimeline({ defaults: { ease: ENTER, duration: 800 } });
    tl.set(['.in', '.fig', '.seg', '.pin', '.zb', grid], { opacity: 0 }, 0).set(ghost, { opacity: 1 }, 0);
    tl.add('.in', { opacity: [0, 1], duration: 700, delay: stagger(40) }, 100).add(grid, { opacity: [0, 1], duration: 900 }, 300);
    tl.add(asvg.createDrawable(ghost), { draw: ['0 0', '0 1'], duration: 2200, ease: 'inOut(2)' }, 300);
    tl.add('.seg', { opacity: [0, 1], duration: 300, delay: stagger(Math.min(12, 1600 / SEGS.length / 2)) }, 2300).add(ghost, { opacity: 0, duration: 600 }, 3200);
    tl.add('.pin', { opacity: [0, 1], duration: 500, delay: stagger(60) }, 3000);
    if (HR) tl.add('.zb', { opacity: [0, 1], duration: 600, delay: stagger(90) }, 3000);
    tl.add('.fig', { opacity: [0, 1], duration: 700, delay: stagger(130) }, 1200);
    FIG.forEach(([, v, fmt], k) => { const o = { v: 0 }; tl.add(o, { v, duration: 1400, ease: 'out(3)', onUpdate: () => { fvals[k].textContent = fmt(o.v); } }, 1200 + k * 130); });
    return tl;
  }

  async function savePng() {
    anim?.seek(anim.duration); await BM?.ready;
    const cv = await Kit.rasterize(P, 2400, 3000);
    const file = `${WD.NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'run'}-poster.png`;
    cv.toBlob(b => { if (!b) return; Kit.download(b, file); st.set({ note: TX.saved(file) }); }, 'image/png');
  }

  const st = Kit.store({ note: '' });
  const controls = { kind: 'still', get: st.get, subscribe: st.subscribe, ...(embed ? {} : Kit.runControls(UI, L.key, signal, st)), saveLabel: TX.save, replayLabel: TX.again, save: savePng, replay: () => scope.execute(play), picture: async (w, h) => { anim?.seek(anim.duration); await BM?.ready; return Kit.rasterize(P, w, h); }, weather: Kit.weatherControl(M) };
  const first = play();
  if (resume || embed) first.seek(first.duration);  // remounted, or shown in a card: skip the intro
  return { destroy: () => { anim?.pause(); scope.revert(); root.innerHTML = ''; }, controls };
}
