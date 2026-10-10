import type { Metadata } from 'next';
import FortressFeud from '@/components/fortress/FortressFeud';
export const metadata: Metadata = { title: 'Fortress Feud · GameHub', description: 'Build a fortress from timber, stone and steel, then drag, aim and launch to topple your rival’s. Real physics, twelve missions, quick battles and online duels.' };
export default function Page() { return <FortressFeud />; }
