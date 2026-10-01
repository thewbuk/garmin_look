import type { Metadata } from 'next';
import Player from '@/components/Player';

export const metadata: Metadata = { title: 'Print · TerraInk Runs' };

export default function Page() {
  return <Player template="print" />;
}
