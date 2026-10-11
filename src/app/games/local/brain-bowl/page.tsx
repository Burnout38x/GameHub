import type { Metadata } from 'next';
import BowlBuzzer from '@/components/live/BowlBuzzer';
export const metadata: Metadata = { title: 'Brain Bowl Buzzer Duel · GameHub', description: 'Two players, one phone: race to buzz in on trivia from eight sections.' };
export default function Page() { return <BowlBuzzer />; }
