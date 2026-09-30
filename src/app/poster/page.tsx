import type { Metadata } from 'next';
import Player from '@/components/Player';

export const metadata: Metadata = { title: 'Poster · Run films' };

export default function Page() {
  return <Player template="poster" />;
}
