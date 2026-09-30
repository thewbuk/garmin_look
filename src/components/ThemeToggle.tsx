'use client';
// THEME_SCRIPT in layout.tsx <head> applies the saved theme before first paint (no flash).
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { THEME_KEY } from '@/lib/theme';

type Theme = 'light' | 'dark';

const OPTIONS: { k: Theme; label: string; Icon: typeof Sun }[] = [
  { k: 'light', label: 'Light', Icon: Sun },
  { k: 'dark', label: 'Dark', Icon: Moon },
];

export default function ThemeToggle() {
  const [picked, setPicked] = useState<Theme | null>(null), [system, setSystem] = useState<Theme>('dark');

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY), mq = matchMedia('(prefers-color-scheme: light)');
    const follow = () => setSystem(mq.matches ? 'light' : 'dark');
    // localStorage and matchMedia only exist after hydration
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === 'light' || saved === 'dark') setPicked(saved);
    follow(); mq.addEventListener('change', follow);
    return () => mq.removeEventListener('change', follow);
  }, []);

  const theme = picked ?? system;
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  const pick = (k: Theme) => { setPicked(k); localStorage.setItem(THEME_KEY, k); };

  return (
    <ToggleGroup type="single" variant="outline" size="sm" aria-label="Theme" value={theme} onValueChange={v => v && pick(v as Theme)}>
      {OPTIONS.map(({ k, label, Icon }) => (
        <ToggleGroupItem key={k} value={k} aria-label={label} title={label}><Icon /></ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
