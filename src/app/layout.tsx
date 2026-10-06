import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import { THEME_BOOTSTRAP } from '@/lib/themes';
import localFont from 'next/font/local';

const geist = localFont({ src: './fonts/GeistVF.woff', display: 'swap' });

export const metadata: Metadata = {
  title: 'GameHub — Play Games With Friends',
  description:
    'Live multiplayer game nights for couples, friends, and family: trivia, riddles, emoji movies, challenges and more. Create a room, share the code, play together anywhere.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#10151b',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} /></head>
      <body className={`${geist.className} antialiased`}>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <Navbar />
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
