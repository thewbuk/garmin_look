'use client';
import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { ArrowLeft, Cloud, CloudRain, Download, Pause, Play, RotateCcw, Snowflake, Square, Sun, Upload, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type Look = { name: string; bg: string; line: string; signal: string };
type Words = Record<string, string>;
type State = { t?: number; playing?: boolean; sound?: boolean; exporting?: boolean; note: string; [k: string]: unknown };
type Weather = { text?: string; temp?: number; rain?: boolean; snow?: boolean };
type Common = {
  get: () => State; subscribe: (fn: () => void) => () => void;
  UI: Words; look: string; looks: Record<string, Look>; setLook: (k: string) => void; units: 'km' | 'mi'; setUnits: (u: 'km' | 'mi') => void;
  weather?: { now: Weather | null; set: (w: Weather) => void };
  isSample: boolean; pickRun: () => void; backToSample: () => void;
};
export type Controls = Common & ({
  kind: 'film'; total: number; chapters: [string, number][]; exportLabel: string; clock: { get: () => number; subscribe: (fn: () => void) => () => void };
  toggle: () => void; scrub: (ms: number) => void; jump: (ms: number) => void; toggleSound: () => void; exportVideo: (withSound: boolean) => void;
} | {
  kind: 'still'; saveLabel: string; replayLabel: string; save: () => void; replay: () => void; picture: (w: number, h: number) => Promise<HTMLCanvasElement>;
  options?: { key: string; label: string; choices: [string, string][]; set: (v: string) => void }[];
});

const SKIES = [
  { k: 'clear', label: 'Clear', Icon: Sun, w: { text: 'clear', rain: false, snow: false } },
  { k: 'cloud', label: 'Cloudy', Icon: Cloud, w: { text: 'cloudy', rain: false, snow: false } },
  { k: 'rain', label: 'Rain', Icon: CloudRain, w: { text: 'rain', rain: true, snow: false } },
  { k: 'snow', label: 'Snow', Icon: Snowflake, w: { text: 'snow', rain: false, snow: true } },
] as const;
const skyOf = (w: Weather | null) => (!w ? '' : w.snow ? 'snow' : w.rain ? 'rain' : /cloud|overcast|fog|mist/i.test(w.text ?? '') ? 'cloud' : 'clear');

function WeatherControl({ weather, UI, imperial }: { weather: NonNullable<Controls['weather']>; UI: Words; imperial: boolean }) {
  const now = weather.now, [temp, setTemp] = useState(now?.temp ?? 12);
  return (
    <Section title={UI.weather}>
      <ToggleGroup type="single" variant="outline" size="sm" className="w-full" value={skyOf(now)} onValueChange={v => { const s = SKIES.find(x => x.k === v); if (s) weather.set({ ...s.w, temp }); }}>
        {SKIES.map(({ k, label, Icon }) => <ToggleGroupItem key={k} value={k} aria-label={label} title={label} className="flex-1"><Icon /></ToggleGroupItem>)}
      </ToggleGroup>
      <div className="flex items-center gap-3">
        <Slider aria-label="Temperature" min={-10} max={35} step={1} value={[temp]} onValueChange={([v]) => setTemp(v)}
          onValueCommit={([v]) => weather.set({ ...(SKIES.find(x => x.k === skyOf(now))?.w ?? SKIES[0].w), temp: v })} />
        <span className="w-12 text-right text-sm text-muted-foreground tabular-nums">{imperial ? `${Math.round(temp * 9 / 5 + 32)}°F` : `${temp}°C`}</span>
      </div>
    </Section>
  );
}

type Film = Extract<Controls, { kind: 'film' }>;
const useClock = (c: Film) => useSyncExternalStore(c.clock.subscribe, c.clock.get, c.clock.get);
const chapterAt = (c: Film, t: number) => c.chapters.reduce((k, [, at], i) => (t >= at ? i : k), 0);
function Time({ c }: { c: Film }) {
  return <span className="ml-auto text-sm text-muted-foreground tabular-nums">{mmss(useClock(c))} / {mmss(c.total)}</span>;
}
function Chapters({ c }: { c: Film }) {
  return (
    <ToggleGroup type="single" variant="outline" size="sm" className="w-full flex-wrap" value={String(chapterAt(c, useClock(c)))}
      onValueChange={v => { if (v !== '') c.jump(c.chapters[+v][1]); }}>
      {c.chapters.map(([label], i) => <ToggleGroupItem key={label} value={String(i)} className="flex-1 text-xs">{label}</ToggleGroupItem>)}
    </ToggleGroup>
  );
}
function Scrubber({ c }: { c: Film }) {
  return <Slider aria-label="Position" min={0} max={c.total} step={10} value={[useClock(c)]} onValueChange={([v]) => c.scrub(v)} />;
}

const mmss = (ms: number) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-[10.5px] font-semibold tracking-[.16em] text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Hint({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('text-xs text-muted-foreground', className)}>{children}</p>;
}

export default function Panel({ c }: { c: Controls }) {
  const s = useSyncExternalStore(c.subscribe, c.get, c.get);
  const [withSound, setWithSound] = useState(true);
  const UI = c.UI;

  return (
    <TooltipProvider delayDuration={300}>
      <aside id="side" className="flex w-[300px] flex-none flex-col gap-5 overflow-auto rounded-2xl border bg-card p-5 text-card-foreground shadow-2xl max-h-[calc(100vh-48px)] max-[999px]:max-h-none max-[999px]:w-[min(560px,94vw)]">
        <Button asChild variant="ghost" size="sm" className="-ml-2 self-start text-muted-foreground">
          <Link href="/"><ArrowLeft /> {UI.templates}</Link>
        </Button>

        {c.kind === 'film' ? (
          <Section title={UI.playback}>
            <div className="flex items-center gap-2">
              <Button size="icon-lg" className="rounded-full bg-foreground text-background hover:bg-foreground/90" onClick={c.toggle} aria-label={s.playing ? UI.pause : UI.play}>
                {s.playing ? <Pause className="fill-current" /> : <Play className="fill-current" />}
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-lg" className="rounded-full" onClick={c.toggleSound} aria-label={s.sound ? UI.mute : UI.sound}>
                    {s.sound ? <Volume2 /> : <VolumeX />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{s.sound ? UI.mute : UI.sound}</TooltipContent>
              </Tooltip>
              <Time c={c} />
            </div>
            <Scrubber c={c} />
            <Chapters c={c} />
          </Section>
        ) : (
          <Section title={UI.picture}>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={c.save}><Download /> {c.saveLabel}</Button>
              <Button variant="outline" onClick={c.replay}><RotateCcw /> {c.replayLabel}</Button>
            </div>
            {c.options?.map(o => (
              <div key={o.key} className="flex items-center justify-between gap-3">
                <Label className="text-muted-foreground">{o.label}</Label>
                <ToggleGroup type="single" variant="outline" size="sm" value={String(s[o.key])} onValueChange={v => v && o.set(v)}>
                  {o.choices.map(([k, label]) => <ToggleGroupItem key={k} value={k} className="px-3 text-xs">{label}</ToggleGroupItem>)}
                </ToggleGroup>
              </div>
            ))}
          </Section>
        )}

        {c.weather && <><Separator /><WeatherControl weather={c.weather} UI={UI} imperial={c.units === 'mi'} /></>}

        <Separator />
        <Section title={UI.units}>
          <ToggleGroup type="single" variant="outline" size="sm" className="w-full" value={c.units} onValueChange={v => v && v !== c.units && c.setUnits(v as 'km' | 'mi')}>
            <ToggleGroupItem value="km" className="flex-1">Metric</ToggleGroupItem>
            <ToggleGroupItem value="mi" className="flex-1">Imperial</ToggleGroupItem>
          </ToggleGroup>
        </Section>

        <Separator />
        <Section title={UI.colours}>
          <div role="radiogroup" aria-label={UI.colours} className="flex flex-wrap gap-2.5">
            {Object.entries(c.looks).map(([k, L]) => (
              <Tooltip key={k}>
                <TooltipTrigger asChild>
                  <button type="button" role="radio" aria-checked={k === c.look} aria-label={L.name} onClick={() => k !== c.look && c.setLook(k)}
                    className={cn('size-8 rounded-full border ring-offset-2 ring-offset-card transition-transform outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring',
                      k === c.look && 'ring-2 ring-foreground')}
                    style={{ background: `radial-gradient(circle, ${L.signal} 0 5px, ${L.bg} 6px)`, borderColor: L.line }} />
                </TooltipTrigger>
                <TooltipContent>{L.name}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </Section>

        {c.kind === 'film' && (
          <>
            <Separator />
            <Section title={UI.export}>
              <Button size="lg" variant={s.exporting ? 'destructive' : 'default'} onClick={() => c.exportVideo(withSound)}>
                {s.exporting ? <><Square className="fill-current" /> {UI.stop}</> : <><Download /> {c.exportLabel}</>}
              </Button>
              <div className="flex items-center gap-2">
                <Checkbox id="with-sound" checked={withSound} onCheckedChange={v => setWithSound(v === true)} />
                <Label htmlFor="with-sound" className="font-normal text-muted-foreground">{UI.withSound}</Label>
              </div>
            </Section>
          </>
        )}
        {s.note && <p role="status" className="text-sm text-foreground/85">{s.note}</p>}

        <Separator />
        <Section title={UI.run}>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={c.pickRun}><Upload /> {UI.yours}</Button>
            {!c.isSample && <Button variant="ghost" onClick={c.backToSample}>{UI.sample}</Button>}
          </div>
          <Hint className="[@media(hover:none)]:hidden">{UI.drop}</Hint>
        </Section>
      </aside>
    </TooltipProvider>
  );
}
