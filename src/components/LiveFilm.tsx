'use client';
import Image, { type StaticImageData } from 'next/image';
import { useEffect, useRef, useState } from 'react';

type Film = { destroy: () => void; controls: { play: (p: boolean) => void; clock: { get: () => number } } };

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

export default function LiveFilm({ still, alt }: { still: { light: StaticImageData; dark: StaticImageData }; alt: string }) {
  const ref = useRef<HTMLDivElement>(null), theme = useSiteTheme();
  const [live, setLive] = useState(false), at = useRef<number | undefined>(undefined);   // playback time, so a theme change resumes in place
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ac = new AbortController();
    let film: Film | undefined, io: IntersectionObserver | undefined;
    import('@/templates/film').then(mod => {
      if (ac.signal.aborted || !ref.current) return;
      film = mod.mount(ref.current, ac.signal, at.current != null ? { t: at.current, playing: true } : undefined, { look: theme === 'light' ? 'terracotta' : 'midnight_blue' }) as Film;
      io = new IntersectionObserver(([e]) => film?.controls.play(e.isIntersecting)); io.observe(ref.current);
      setLive(true);
    });
    return () => { at.current = film?.controls.clock.get(); ac.abort(); io?.disconnect(); film?.destroy(); setLive(false); };
  }, [theme]);
  return (
    <div className="relative aspect-video">
      <Image src={still[theme]} alt={alt} loading="eager" fetchPriority="high" className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${live ? 'opacity-0' : ''}`} />
      <div ref={ref} aria-hidden className="absolute inset-0 [&_#frame]:rounded-none [&_#frame]:shadow-none" />
    </div>
  );
}
