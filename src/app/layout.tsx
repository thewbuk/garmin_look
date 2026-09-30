import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { THEME_SCRIPT } from '@/lib/theme';
import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Run films · turn a run into a film',
  description: 'Drop the FIT file your watch recorded and get a film, a story, a square, a poster or a print drawn from the real data. Everything runs in your browser.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
