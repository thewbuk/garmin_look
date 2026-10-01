'use client';
// A template playing on the home page: the hero and the five cards. Every STEP_MS the whole page moves on to the
// next sky and colour look together: each template remounts and crossfades over its old mount, resuming in place.
import Image, { type StaticImageData } from 'next/image';
import { useEffect, useRef, useState } from 'react';
import * as Runs from '@/lib/runs';
import { TEMPLATES, type Template } from '@/components/Player';

type Mounted = { destroy: () => void; controls: { play?: (p: boolean) => void; clock?: { get: () => number } } };

export function useSiteTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  useEffect(() => {
    const read = () => setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    read();
    const mo = new MutationObserver(read); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return theme;
}

// the sample's own weather is one of these; the home page turns through all of them
const SKIES = [
  { text: 'clear', rain: false, snow: false, temp: 19, humidity: 55, wind: 10, windDir: 'NW' },
  { text: 'overcast', rain: false, snow: false, temp: 11, humidity: 78, wind: 14, windDir: 'W' },
  { text: 'light rain', rain: true, snow: false, temp: 14, humidity: 92, wind: 18, windDir: 'SW' },
  { text: 'snow', rain: false, snow: true, temp: -2, humidity: 86, wind: 12, windDir: 'N' },
];
const LOOKS = { dark: ['midnight_blue', 'heatwave', 'neon'], light: ['terracotta', 'coral'] };
const STILL = new Set<Template>(['poster', 'print']);
const STEP_MS = 8000, FADE = 1000;

// one clock for the page, so every template changes on the same beat; each visit starts on the next sky
let start: number | undefined, firstSky = 0;
function step() {
  if (start == null) {
    start = performance.now();
    try { firstSky = Number(localStorage.getItem('garminLook.heroSky')) % SKIES.length || 0; localStorage.setItem('garminLook.heroSky', String(firstSky + 1)); } catch { /* private mode */ }
  }
  const e = performance.now() - start;
  return { k: Math.floor(e / STEP_MS), wait: STEP_MS - (e % STEP_MS) };
}

/** `at`: where a moving template starts */
export default function Live({ template, still, alt = '', at, priority = false, className = '', stage = '' }: {
  template: Template; still?: { light: StaticImageData; dark: StaticImageData }; alt?: string; at?: number; priority?: boolean; className?: string; stage?: string;
}) {
  const ref = useRef<HTMLDivElement>(null), theme = useSiteTheme();
  const [live, setLive] = useState(false), t0 = useRef<number | undefined>(at);   // playback time, so a theme change resumes in place
  useEffect(() => {
    const host = ref.current, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!host || (reduced && still)) return;   // the still stays
    const ac = new AbortController(), looks = LOOKS[theme], moving = !STILL.has(template);
    // a visitor's own run, or a sky they picked, keeps its weather
    const sample = Runs.isSample() && !Runs.weather();
    let cur: { el: HTMLDivElement; m: Mounted; ac: AbortController; k: number } | null = null, inView = true, timer: ReturnType<typeof setTimeout> | undefined;
    const time = () => cur?.m.controls.clock?.get() ?? t0.current;
    TEMPLATES[template]().then(mod => {
      if (ac.signal.aborted) return;
      function swap(k: number) {
        const el = document.createElement('div'), lac = new AbortController(), t = time(), look = looks[k % looks.length];
        el.className = 'absolute inset-0'; el.style.transition = `opacity ${FADE}ms ease`; el.style.opacity = cur ? '0' : '1';
        host!.appendChild(el);
        const m = mod.mount(el, lac.signal, moving && t != null ? { t, playing: inView && !reduced } : undefined, sample ? { look, sky: SKIES[(firstSky + k) % SKIES.length] } : { look }) as Mounted;
        m.controls.play?.(inView && !reduced);
        const old = cur; cur = { el, m, ac: lac, k };
        if (old) { requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = '1'; }));
          setTimeout(() => { old.ac.abort(); old.m.destroy(); old.el.remove(); }, FADE + 100); }
        setLive(true);
      }
      // on the beat; offscreen templates skip it and catch up when they scroll back
      const tick = () => { const s = step(); if (inView && s.k !== cur?.k) swap(s.k); timer = setTimeout(tick, s.wait + 20); };
      swap(step().k);
      if (!reduced) timer = setTimeout(tick, step().wait + 20);
      const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; cur?.m.controls.play?.(inView && !reduced); if (inView && !reduced && step().k !== cur?.k) swap(step().k); });
      io.observe(host);
      ac.signal.addEventListener('abort', () => io.disconnect());
    });
    return () => { t0.current = time(); ac.abort(); clearTimeout(timer); cur?.ac.abort(); cur?.m.destroy(); host.replaceChildren(); setLive(false); };
  }, [template, theme, still]);
  return (
    <div className={`relative ${className}`}>
      {still && <Image src={still[theme]} alt={alt} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ${live ? 'opacity-0' : ''}`} />}
      <div ref={ref} aria-hidden className={`absolute inset-0 [&_#frame]:rounded-none [&_#frame]:shadow-none ${stage}`} />
    </div>
  );
}
