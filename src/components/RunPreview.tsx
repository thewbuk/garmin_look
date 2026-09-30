'use client';
// A template drawn from the visitor's run, frozen on one frame, for a card on the home page.
import { useEffect, useRef } from 'react';
import { TEMPLATES, type Template } from '@/components/Player';
import { useSiteTheme } from '@/components/LiveFilm';

const AT: Partial<Record<Template, number>> = { film: 27600, story: 12700, square: 10700 };
const BOX: Record<Template, string> = {
  film: 'aspect-video w-full',
  story: 'aspect-[9/16] h-full',
  square: 'aspect-square h-full',
  poster: 'aspect-[4/5] h-full [&_svg]:!h-full [&_svg]:!w-full',
  print: 'aspect-[3/4] h-full [&_svg]:!h-full [&_svg]:!w-full',
};

export default function RunPreview({ template }: { template: Template }) {
  const ref = useRef<HTMLDivElement>(null), theme = useSiteTheme();
  useEffect(() => {
    const ac = new AbortController();
    let m: { destroy: () => void } | undefined;
    TEMPLATES[template]().then(mod => {
      if (ac.signal.aborted || !ref.current) return;
      const at = AT[template];
      m = mod.mount(ref.current, ac.signal, at != null ? { t: at, playing: false } : undefined, { look: theme === 'light' ? 'paper' : 'night' });
    });
    return () => { ac.abort(); m?.destroy(); };
  }, [template, theme]);
  return <div ref={ref} aria-hidden className={`${BOX[template]} pointer-events-none max-h-full max-w-full overflow-hidden rounded-md shadow-2xl`} />;
}
