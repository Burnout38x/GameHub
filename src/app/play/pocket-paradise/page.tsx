import type { Metadata } from 'next';
import PocketParadise from '@/components/games/PocketParadise';
export const metadata: Metadata = { title: 'Pocket Paradise · GameHub', description: 'Build a cozy miniature neighborhood in twenty thoughtful moves. Play solo, try the daily neighborhood, and save your postcard.' };
export default function Page() { return <PocketParadise />; }
