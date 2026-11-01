import type { Metadata, Viewport } from 'next';
import { Anton, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const display = Anton({ subsets: ['latin'], weight: '400', variable: '--font-display' });
const sans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: { default: 'Benson YC Media', template: '%s · Benson YC Media' },
  description: 'Onboarding, roster and content plan for the MFM Benson Youth Church media unit.',
};

export const viewport: Viewport = { themeColor: '#2B0A2C', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh font-sans text-[15px]">{children}</body>
    </html>
  );
}
