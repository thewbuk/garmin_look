import type { Metadata } from 'next';
import Player from '@/components/Player';

export const metadata: Metadata = { title: 'Film · Run films' };

export default function Page() {
  return <Player template="film" />;
}
