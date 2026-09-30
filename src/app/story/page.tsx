import type { Metadata } from 'next';
import Player from '@/components/Player';

export const metadata: Metadata = { title: 'Story · Run films' };

export default function Page() {
  return <Player template="story" />;
}
