import type { ReactNode } from 'react';
import { Inter, Roboto_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import { Toaster } from '../shared/ui/toaster';
import '../shared/styles/globals.css';

export const metadata = { title: 'Platform Admin' };

const generalSans = localFont({
  src: '../shared/fonts/general-sans/GeneralSans-Variable.woff2',
  variable: '--font-general-sans',
  weight: '200 700',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
  display: 'swap',
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${generalSans.variable} ${inter.variable} ${robotoMono.variable}`}
    >
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
