import type { Metadata } from 'next';
import ThemePicker from '@/components/ThemePicker';

export const metadata: Metadata = { title: 'Themes — GameHub' };
export default function ThemesPage() {
  return <div className="page-enter mx-auto max-w-3xl">
    <div className="mb-8"><p className="eyebrow mb-3">Make it yours</p><h1 className="text-3xl font-black sm:text-4xl">Pick your game-night look</h1><p className="mt-3 max-w-xl text-white/70">Four moods. The same great games. Set the colors for your rooms, cards, and every round you play.</p></div>
    <ThemePicker />
  </div>;
}
