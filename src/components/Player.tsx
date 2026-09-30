'use client';
import { useEffect, useRef, useState } from 'react';
import Panel, { type Controls } from '@/components/Panel';

export const TEMPLATES = {
  film: () => import('@/templates/film'),
  story: () => import('@/templates/story'),
  square: () => import('@/templates/square'),
  poster: () => import('@/templates/poster'),
  print: () => import('@/templates/print'),
};
export type Template = keyof typeof TEMPLATES;

export default function Player({ template }: { template: Template }) {
  const ref = useRef<HTMLDivElement>(null);
  const [look, setLook] = useState(0);
  const [controls, setControls] = useState<Controls | null>(null);
  const live = useRef<Controls | null>(null), resume = useRef<ReturnType<Controls['get']> | null>(null);
  // lib/kit.js fires 'garminlook:look' on a look change; remount the template, resuming its state
  useEffect(() => {
    const again = () => { resume.current = live.current ? { ...live.current.get(), t: live.current.kind === 'film' ? live.current.clock.get() : undefined } : null; setLook(n => n + 1); };
    addEventListener('garminlook:look', again);
    return () => removeEventListener('garminlook:look', again);
  }, []);
  useEffect(() => {
    const ac = new AbortController();
    let destroy: (() => void) | undefined;
    TEMPLATES[template]().then(mod => {
      if (ac.signal.aborted || !ref.current) return;
      const from = resume.current; resume.current = null;
      const m = mod.mount(ref.current, ac.signal, from ?? undefined) as { destroy: () => void; controls: Controls };
      destroy = m.destroy; live.current = m.controls; setControls(m.controls);
      if (process.env.NODE_ENV === 'development') Object.assign(window, { __runFilms: m.controls });   // dev only: inspect controls from the console
    });
    return () => { ac.abort(); destroy?.(); live.current = null; setControls(null); };
  }, [template, look]);
  // template pages are always dark, whatever the site theme
  return (
    <div data-theme="dark" className={`tpl fixed inset-0 flex items-center justify-center overflow-auto bg-background font-display text-[13px]/[1.5] text-muted-foreground max-[999px]:items-start`}>
      <div className="flex items-center gap-6 p-6 max-[999px]:w-full max-[999px]:flex-col max-[999px]:gap-4 max-[999px]:px-0 max-[999px]:pt-4 max-[999px]:pb-8">
        <div ref={ref} className={`tpl-${template} contents`} />
        {controls && <Panel c={controls} />}
      </div>
    </div>
  );
}
