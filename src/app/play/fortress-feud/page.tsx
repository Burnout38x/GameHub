import type { Metadata } from 'next';
import FortressFeud from '@/components/fortress/FortressFeud';
export const metadata: Metadata = { title: 'Fortress Feud · GameHub', description: 'Build a fortress with gold, send elixir-powered troops down three lanes and smash the enemy keep. Twelve missions, quick battles and live duels.' };
export default function Page() { return <FortressFeud />; }
