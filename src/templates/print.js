import { createScope, createTimeline, stagger, svg, cubicBezier } from 'animejs';
import * as Kit from '@/lib/kit';
import * as Runs from '@/lib/runs';

const KEY = 'garminLook.printRoute';

// scoped to root, so several templates can share a page (the home page mounts six)
export function mount(root, signal, resume, embed) {
  const scope = createScope({ root });
  return scope.execute(() => draw(root, signal, resume, embed, scope));
}

function draw(root, signal, resume, embed, scope) {
  root.innerHTML = '<svg id="print" class="block rounded-[6px] shadow-[0_24px_80px_#000c] aspect-[3/4] h-[min(calc(100vh_-_48px),calc((100vw_-_372px)*4/3))] max-[999px]:h-[min(72vh,calc(94vw*4/3))]" viewBox="0 0 1200 1600" xmlns="http://www.w3.org/2000/svg" font-family="Inter, \'Helvetica Neue\', Arial, sans-serif"></svg>';
  const { h, poly } = Kit, G = Kit.wear(root, 'midnight_blue', 'ink', embed?.look).L;
  const RUN = Runs.current('print'), M = RUN.meta, T = RUN.track, N = T.x.length, DIST = M.distance, DUR = M.elapsed, KMS = DIST / Kit.unitM(), HR = M.hasHr;
  const F = Kit.fmt(RUN), { hms, pace, int, dec, clock, zone } = F, WD = Kit.words(RUN, F), UI = WD.ui;
  const TX =
      { stats: ['Distance', 'Time', 'Climb', 'Average pace'], foot: `started ${clock(0)} · finished ${clock(M.wall ?? DUR)}`,
        routes: { line: 'Line', zones: 'Zones' }, route: 'Route', save: 'Save PNG', again: 'Replay', saved: f => `Saved ${f}` };

  const P = root.querySelector('#print');
  const SEGS = []; for (let i = 0, z = zone(T.h[0]), i0 = 0; i <= N; i++) { const zi = i < N ? zone(T.h[i]) : -1; if (zi !== z) { SEGS.push({ i0, i1: Math.min(N - 1, i), z }); i0 = i; z = zi; } }
  const ROUTE = poly(T.x.map((x, i) => [x, T.y[i]]));
  // SVG text doesn't wrap, so split the title by hand (two lines max)
  const lines = (text, max) => { const out = ['']; for (const w of text.split(' ')) { if (out[out.length - 1] && (out[out.length - 1] + ' ' + w).length > max) out.push(w); else out[out.length - 1] += (out[out.length - 1] ? ' ' : '') + w; } return out.slice(0, 2); };
  const title = lines(WD.NAME.toUpperCase(), 22);
  const FIG = [[TX.stats[0], KMS, v => dec(v, 2), F.DU], [TX.stats[1], DUR, hms, ''], [TX.stats[2], F.ht(M.gain), int, F.HU], [TX.stats[3], DUR / KMS, pace, `/${F.DU}`]];
  let route = Kit.stored(KEY) === 'zones' ? 'zones' : 'line', fvals = [], anim = null, BM = null;

  function draw() {
    const zoned = route === 'zones', ZC = [...G.zones];
    const L = { bg: G.bg, ink: G.fg, soft: G.soft, line: G.line, route: G.fg, glow: G.dark ? (zoned ? 0.35 : 0.5) : 0, start: zoned ? G.fg : G.accent };
    if (!HR) ZC[0] = L.ink;
    P.replaceChildren();

    const MS = 900 - (title.length - 1) * 76, MX = (1200 - MS) / 2, MY = 110, k = MS / 1000, sw = 5.5 / k;
    P.append(h('defs', {}, h('filter', { id: 'glow', x: '-10%', y: '-10%', width: '120%', height: '120%' }, h('feGaussianBlur', { stdDeviation: 9 / k }))),
      h('rect', { width: 1200, height: 1600, fill: L.bg }), Kit.weatherSvg(Kit.skyOf(M, embed), 1200, 1600, G.dark));
    const map = P.appendChild(h('g', { transform: `translate(${MX} ${MY}) scale(${k})` }));
    BM = Kit.underlay(map, M, G, embed, { fade: 0, radius: 18 / k });
    if (BM) map.appendChild(h('text', { x: 1000 - 12 / k, y: 1000 - 12 / k, 'text-anchor': 'end', 'font-size': 15 / k, fill: L.soft, text: BM.credit }));
    const glow = L.glow ? map.appendChild(h('path', { class: 'draw', d: ROUTE, fill: 'none', stroke: zoned ? ZC[3] : L.route, 'stroke-opacity': L.glow, 'stroke-width': sw * 2.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', filter: 'url(#glow)' })) : null;
    const line = map.appendChild(h('path', { class: 'draw', d: ROUTE, fill: 'none', stroke: zoned ? L.ink : L.route, 'stroke-width': zoned ? sw * 0.5 : sw, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    if (zoned) map.appendChild(h('g', { fill: 'none', 'stroke-width': sw, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' },
      ...SEGS.map(s => h('path', { class: 'seg', d: poly(Array.from({ length: s.i1 - s.i0 + 1 }, (_, j) => [T.x[s.i0 + j], T.y[s.i0 + j]])), stroke: ZC[s.z] }))));
    map.append(h('circle', { class: 'pin', cx: T.x[0], cy: T.y[0], r: 9 / k, fill: L.bg, stroke: L.start, 'stroke-width': 3.5 / k }),
      M.loop ? '' : h('circle', { class: 'pin', cx: T.x[N - 1], cy: T.y[N - 1], r: 9 / k, fill: L.ink, stroke: L.bg, 'stroke-width': 3 / k }));

    const EY = MY + MS + 44, EH = 64, SX = d => 120 + d / DIST * 960, SY = a => EY + EH - (a - M.minAlt) / Math.max(M.maxAlt - M.minAlt, 60) * EH, SP = T.d.map((d, i) => [SX(d), SY(T.a[i])]);
    P.append(h('path', { class: 'in', d: poly(SP) + ` L1080 ${EY + EH} L120 ${EY + EH} Z`, fill: L.ink, 'fill-opacity': 0.06 }),
      zoned ? h('g', { fill: 'none', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, ...SEGS.map(s => h('path', { class: 'seg', d: poly(SP.slice(s.i0, s.i1 + 1)), stroke: ZC[s.z] })))
        : h('path', { class: 'in', d: poly(SP), fill: 'none', stroke: L.ink, 'stroke-opacity': 0.7, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }),
      h('text', { class: 'in', x: 1080, y: EY - 12, 'text-anchor': 'end', 'font-size': 14, 'letter-spacing': '.18em', fill: L.soft, text: `${int(F.ht(M.minAlt))}–${int(F.ht(M.maxAlt))} ${F.HU.toUpperCase()}` }));

    const TY = EY + EH + 110;
    P.append(...title.map((l, j) => h('text', { class: 'in', x: 600, y: TY + j * 76, 'text-anchor': 'middle', 'font-size': 66, 'font-weight': 700, 'letter-spacing': '.06em', fill: L.ink, text: l })),
      h('text', { class: 'in', x: 600, y: TY + (title.length - 1) * 76 + 50, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 500, 'letter-spacing': '.28em', fill: L.soft,
        text: [F.DAY, M.place, WD.EVENT, Kit.weatherLine(Kit.skyOf(M, embed), F)].filter(Boolean).join(' · ').toUpperCase() }));
    const FY = TY + (title.length - 1) * 76 + 130, CW = 960 / FIG.length;
    P.append(h('path', { class: 'in', d: `M120 ${FY - 34} H1080`, stroke: L.line, 'stroke-width': 1.5 }),
      ...FIG.slice(1).map((_, j) => h('path', { class: 'in', d: `M${120 + CW * (j + 1)} ${FY - 10} v84`, stroke: L.line, 'stroke-width': 1.5 })));
    FIG.forEach(([label, , , unit], j) => { const cx = 120 + CW * (j + 0.5);
      P.append(h('g', { class: 'fig' },
        h('text', { x: cx, y: FY + 8, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 500, 'letter-spacing': '.2em', fill: L.soft, text: label.toUpperCase() }),
        h('text', { x: cx, y: FY + 62, 'text-anchor': 'middle', 'font-size': 42, 'font-weight': 600, 'letter-spacing': '-.02em', fill: L.ink }, h('tspan', { class: 'fv', text: '0' }), unit ? h('tspan', { dx: 6, 'font-size': 17, 'font-weight': 400, 'letter-spacing': '0', fill: L.soft, text: unit }) : null))); });
    fvals = [...P.querySelectorAll('.fv')];
    P.append(h('text', { class: 'in', x: 120, y: 1560, 'font-size': 14, 'letter-spacing': '.12em', fill: L.soft, text: TX.foot.toUpperCase() }),
      h('text', { class: 'in', x: 1080, y: 1560, 'text-anchor': 'end', 'font-size': 14, 'letter-spacing': '.12em', fill: L.soft, text: [WD.SPORT, HR && `${M.avgHr} ${WD.BPM} avg`].filter(Boolean).join(' · ').toUpperCase() }));
    return { glow, line, zoned };
  }

  const ENTER = cubicBezier(0.16, 1, 0.3, 1);
  function play() {
    anim?.pause();
    const { glow, line, zoned } = draw(), tl = anim = createTimeline({ defaults: { ease: ENTER, duration: 800 } });
    tl.set(['.in', '.fig', '.seg', '.pin'], { opacity: 0 }, 0);
    tl.add([line, glow].filter(Boolean).map(p => svg.createDrawable(p)), { draw: ['0 0', '0 1'], duration: 2600, ease: 'inOut(2)' }, 150);
    if (zoned) tl.add('.seg', { opacity: [0, 1], duration: 300, delay: stagger(Math.min(12, 1600 / SEGS.length / 2)) }, 2200);
    tl.add('.pin', { opacity: [0, 1], duration: 500 }, 2600);
    tl.add('.in', { opacity: [0, 1], duration: 900, delay: stagger(50) }, 900);
    tl.add('.fig', { opacity: [0, 1], translateY: [10, 0], duration: 700, delay: stagger(110) }, 1500);
    FIG.forEach(([, v, fmt], j) => { const o = { v: 0 }; tl.add(o, { v, duration: 1500, ease: 'out(3)', onUpdate: () => { fvals[j].textContent = fmt(o.v); } }, 1500 + j * 110); });
    return tl;
  }

  async function savePng() {
    anim?.seek(anim.duration); await BM?.ready;
    const cv = await Kit.rasterize(P, 2400, 3200);
    const file = `${WD.NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'run'}-print-${G.key}.png`;
    cv.toBlob(b => { if (!b) return; Kit.download(b, file); st.set({ note: TX.saved(file) }); }, 'image/png');
  }

  const st = Kit.store({ note: '', route });
  const controls = { kind: 'still', get: st.get, subscribe: st.subscribe, ...(embed ? {} : Kit.runControls(UI, G.key, signal, st)), saveLabel: TX.save, replayLabel: TX.again, save: savePng, replay: () => scope.execute(play), picture: async (w, h) => { anim?.seek(anim.duration); await BM?.ready; return Kit.rasterize(P, w, h); }, weather: Kit.weatherControl(M),
    options: [{ key: 'route', label: TX.route, choices: Object.entries(TX.routes), set: v => { route = v; Kit.remember(KEY, v); st.set({ route: v }); scope.execute(play); } }] };
  const first = play();
  if (resume || embed) first.seek(first.duration);  // remounted, or shown in a card: skip the intro
  return { destroy: () => { anim?.pause(); scope.revert(); root.innerHTML = ''; }, controls };
}
