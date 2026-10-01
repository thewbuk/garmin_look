'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import * as Runs from '@/lib/runs';
import * as Kit from '@/lib/kit';
import { Mark } from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import LiveFilm from '@/components/LiveFilm';
import RunPreview from '@/components/RunPreview';
import type { Template } from '@/components/Player';
// imported (not /public) so each preview gets a hashed URL and stale caches can't serve an old one
import filmLight from '@/assets/previews/film-light.webp';
import filmDark from '@/assets/previews/film-dark.webp';
import storyLight from '@/assets/previews/story-light.webp';
import storyDark from '@/assets/previews/story-dark.webp';
import squareLight from '@/assets/previews/square-light.webp';
import squareDark from '@/assets/previews/square-dark.webp';
import posterLight from '@/assets/previews/poster-light.webp';
import posterDark from '@/assets/previews/poster-dark.webp';
import printLight from '@/assets/previews/print-light.webp';
import printDark from '@/assets/previews/print-dark.webp';

type Summary = { mine: boolean; name: string; title: string; line: string; route: string; profile: string; stats: [string, string | number, string][] };

const TEMPLATES = [
  { href: '/film', name: 'Film', format: '60 s · 16:9 · MP4', img: { light: filmLight, dark: filmDark }, text: 'The route draws itself, the run replays on the clock, then the climbing, heart rate, splits and the finish time.' },
  { href: '/story', name: 'Story', format: '22 s · 9:16 · MP4', img: { light: storyLight, dark: storyDark }, text: 'For a phone: the route, one big number, five figures, the time.' },
  { href: '/square', name: 'Square', format: '17 s · 1:1 · MP4', img: { light: squareLight, dark: squareDark }, text: 'For the feed: the replay beside the distance, the ground filling in below, every split as a bar.' },
  { href: '/poster', name: 'Poster', format: '4:5 · PNG', img: { light: posterLight, dark: posterDark }, text: 'One image on paper: the route, the elevation, six figures, time in zones.' },
  { href: '/print', name: 'Print', format: '3:4 · PNG', img: { light: printLight, dark: printDark }, text: 'For the wall: the route large and alone, in a glowing line, zone colours or ink on paper.' },
];

const Key = ({ children }: { children: React.ReactNode }) => <kbd className="rounded border bg-muted px-1.5 py-px font-sans text-[12px] text-foreground">{children}</kbd>;
const STEPS = [
  <>Open the run on <a href="https://connect.garmin.com/modern/activities" target="_blank" rel="noreferrer" className="text-foreground underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground">Garmin Connect</a></>,
  <>Gear icon, then <Key>Export File</Key></>,
  <>Drop the .zip on this page, as it is</>,
];

function summarise(sample = false): Summary {
  const RUN = sample ? Runs.sample() : Runs.current(), M = RUN.meta, F = Kit.fmt(RUN), W = Kit.words(RUN, F);
  const T = RUN.track, span = Math.max(M.maxAlt - M.minAlt, 8);
  const stats = ([
    ['Distance', F.dec(M.distance / F.U), F.DU], ['Time', F.hms(M.elapsed), ''], ['Pace', F.pace(M.elapsed / (M.distance / F.U)), `/${F.DU}`],
    ['Climb', F.int(F.ht(M.gain)), F.HU], M.hasHr && ['Avg heart rate', M.avgHr, 'bpm'], M.hasHr && ['Max heart rate', M.maxHr, 'bpm'],
    M.cadence && ['Cadence', M.cadence, 'spm'], M.calories && ['Energy', F.int(M.calories), 'kcal'],
  ] as ([string, string | number, string] | false | null)[]).filter(s => !!s) as [string, string | number, string][];
  return { mine: !sample && !Runs.isSample(), name: W.NAME, title: W.TITLE, line: [F.DATE, `started ${F.clock(0)}`, W.SPORT].join(' · '), stats,
    route: Kit.poly(T.x.map((x: number, i: number) => [x, T.y[i]])),
    profile: Kit.poly(T.d.map((d: number, i: number) => [d / M.distance * 400, 44 - (T.a[i] - M.minAlt) / span * 40])) };
}

function Route({ d, stroke, width }: { d: string; stroke: string; width: number }) {
  return <svg viewBox="-40 -40 1080 1080" className="h-full w-full" aria-hidden><path d={d} fill="none" stroke={stroke} strokeWidth={width} strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

const FRESH = 'garminLook.fresh';

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal';

export default function Landing() {
  const [run, setRun] = useState<Summary>(() => summarise(true));
  const [error, setError] = useState('');
  const [over, setOver] = useState(false);
  const [opts, setOpts] = useState({ name: '', place: '' });
  const pick = useRef<() => void>(() => {});

  useEffect(() => {
    const ac = new AbortController();
    // sessionStorage is client-only, so the visitor's run is read after hydration
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRun(summarise()); setOpts({ name: '', place: '', ...Runs.opts() });
    // after a file loads the page reloads; FRESH says to take the visitor straight to the templates
    pick.current = Runs.attach({ signal: ac.signal, onError: setError, onLoad: () => { sessionStorage.setItem(FRESH, '1'); location.reload(); } }).pick;
    if (sessionStorage.getItem(FRESH)) {
      sessionStorage.removeItem(FRESH);
      requestAnimationFrame(() => document.getElementById('templates')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
    addEventListener('dragover', () => setOver(true), { signal: ac.signal });
    addEventListener('dragleave', e => { if (!e.relatedTarget) setOver(false); }, { signal: ac.signal });
    addEventListener('drop', () => setOver(false), { signal: ac.signal });
    return () => ac.abort();
  }, []);

  const keep = (o: typeof opts) => { setOpts(o); Runs.setOpts({ name: o.name.trim(), place: o.place.trim() }); setRun(summarise()); };

  return (
    <div className="min-h-full">
      <div aria-hidden className={`pointer-events-none fixed inset-3 z-50 grid place-items-center rounded-3xl border-2 border-dashed border-signal bg-ink/85 backdrop-blur-sm transition-opacity duration-200 ${over ? 'opacity-100' : 'opacity-0'}`}>
        <div className="text-center">
          <p className="text-4xl font-semibold tracking-tight">Drop your run</p>
          <p className="mt-2 text-soft">a .fit file, or the .zip from Garmin Connect</p>
        </div>
      </div>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-8">
        {/* the landing and /maps are a different zone, so plain <a> rather than <Link> */}
        <a href="https://terraink.space/" className={`flex items-center gap-2.5 font-semibold tracking-tight ${focus}`}>
          <Mark className="h-6 w-9" /> <span>Terra<span className="text-signal">Ink</span> <span className="font-normal text-soft">Runs</span></span>
        </a>
        {/* same nav as terraink.space: Maps, Runs, then the shared theme toggle */}
        <nav className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.2em] text-soft">
          <a href="https://terraink.space/maps" className={`transition-colors hover:text-paper ${focus}`}>Maps</a>
          <Link href="/" aria-current="page" className={`text-paper ${focus}`}>Runs</Link>
          <ThemeToggle />
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <section className="grid items-center gap-10 pt-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:pt-20">
          <div>
            <h1 className="text-5xl font-semibold leading-[1.02] tracking-tight text-balance sm:text-6xl">Turn a run into a film.</h1>
            <p className="mt-5 max-w-md text-lg text-soft text-pretty">Drop the FIT file your watch recorded. The route, the pace, the heart rate and the climbing become a film you can export.</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button size="lg" onClick={() => pick.current()} className="h-12 rounded-full px-6 text-base font-semibold transition-transform hover:-translate-y-0.5">Choose a .fit file</Button>
              <Link href="/film" className={`font-medium text-paper underline decoration-line underline-offset-4 hover:decoration-signal ${focus}`}>Watch the sample →</Link>
            </div>
            <Collapsible className="group mt-4 max-w-md">
              <p className="text-sm text-soft">
                or drop it anywhere ·{' '}
                <CollapsibleTrigger className={`inline-flex items-center gap-1 rounded text-foreground/80 underline decoration-muted-foreground/60 underline-offset-4 hover:text-foreground hover:decoration-foreground ${focus}`}>
                  where&apos;s my file?<ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
                </CollapsibleTrigger>
              </p>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <ol className="mt-3 space-y-1.5 border-l pl-4 text-sm text-foreground/85">
                  {STEPS.map((s, k) => (
                    <li key={k} className="flex gap-2.5"><span className="w-3 flex-none text-muted-foreground tabular-nums">{k + 1}</span><span>{s}</span></li>
                  ))}
                </ol>
                <p className="mt-2.5 pl-4 text-xs text-muted-foreground">Other watches: any app that exports the original .fit. It needs GPS, so a treadmill run won&apos;t work.</p>
              </CollapsibleContent>
            </Collapsible>
            <p role="alert" className="mt-3 min-h-6 text-alert">{error}</p>
          </div>
          <Link href="/film" aria-label="Watch the film of the sample run" className={`group relative block overflow-hidden rounded-xl ring-1 ring-line ${focus}`}>
            <div className="transition-transform duration-500 group-hover:scale-[1.015] motion-safe:animate-[rise_.9s_cubic-bezier(.16,1,.3,1)_both]">
              <LiveFilm still={{ light: filmLight, dark: filmDark }} alt="A film of a run: the route in heart-rate colours, with distance, time and heart rate" />
            </div>
          </Link>
        </section>

        {run.mine && (
          <section aria-label="Your run" className="mt-14 rounded-2xl border bg-card p-6 motion-safe:animate-[rise_.6s_cubic-bezier(.16,1,.3,1)_both]">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="h-24 w-24 flex-none"><Route d={run.route} stroke="var(--moss)" width={24} /></div>
              <div className="min-w-[13rem] flex-1">
                <p className="text-xs font-medium uppercase tracking-[.16em] text-moss">Step 1 · Your run is loaded</p>
                <p className="mt-1 truncate text-2xl font-semibold tracking-tight">{run.title}</p>
                <p className="text-sm text-soft">{run.line}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { Runs.clear(); setRun(summarise()); setOpts({ name: '', place: '' }); }}>Back to the sample</Button>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-5 sm:grid-cols-4">
              {run.stats.map(([label, value, unit]) => (
                <div key={label}>
                  <dt className="text-xs font-medium uppercase tracking-[.14em] text-soft">{label}</dt>
                  <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}{unit && <span className="ml-1 text-sm font-normal text-soft">{unit}</span>}</dd>
                </div>
              ))}
            </dl>
            <svg viewBox="0 0 400 46" preserveAspectRatio="none" className="mt-5 h-12 w-full" aria-hidden>
              <path d={`${run.profile} L400 46 L0 46 Z`} className="fill-moss/15" />
              <path d={run.profile} fill="none" className="stroke-moss" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="mt-5 flex flex-wrap items-end gap-3 border-t pt-5">
              {(['name', 'place'] as const).map(k => (
                <label key={k} className="flex flex-col gap-1.5 text-xs uppercase tracking-widest text-soft">
                  {k === 'name' ? 'Title' : 'Place'}
                  <input type="text" name={k} maxLength={40} value={opts[k]} placeholder={k === 'name' ? run.name : 'optional'} onChange={e => keep({ ...opts, [k]: e.target.value })}
                    className={`w-56 rounded-lg border border-line bg-ink px-3 py-2.5 text-base normal-case tracking-normal text-paper ${focus}`} />
                </label>
              ))}
              <p className="pb-3 text-sm text-soft">Not in a FIT file; shown on every template.</p>
            </div>
          </section>
        )}

        <div id="templates" className="mb-5 mt-16 scroll-mt-8">
          {run.mine && <p className="text-xs font-medium uppercase tracking-[.16em] text-moss">Step 2</p>}
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{run.mine ? 'Now pick what to make' : 'Five templates'}</h2>
          {run.mine && <p className="mt-1.5 text-soft">Every preview below is drawn from your run. Open one to play it, change its look and export it.</p>}
        </div>
        <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-6">
          {TEMPLATES.map(t => (
            <Link key={t.href} href={t.href} className={`group flex flex-col ${focus} rounded-xl ${t.format.includes('PNG') ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
              <div className="flex h-72 items-center justify-center rounded-xl bg-peat p-5 ring-1 ring-line transition group-hover:ring-signal">
                {run.mine ? <RunPreview template={t.href.slice(1) as Template} /> : <>
                  <Image src={t.img.light} alt={`${t.name} template`} className="max-h-full w-auto rounded-md object-contain shadow-2xl dark:hidden" />
                  <Image src={t.img.dark} alt={`${t.name} template`} className="hidden max-h-full w-auto rounded-md object-contain shadow-2xl dark:block" />
                </>}
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-3">
                <b className="text-xl font-semibold tracking-tight">{t.name}</b>
                <span className="text-sm text-soft">{t.format}</span>
              </div>
              <p className="mt-1.5 text-[15px] text-soft text-pretty">{t.text}</p>
              <span className="mt-auto pt-3 font-semibold text-signal">{run.mine ? `Make a ${t.name.toLowerCase()} of your run` : `Open ${t.name.toLowerCase()}`} →</span>
            </Link>
          ))}
        </div>

      </main>
    </div>
  );
}
