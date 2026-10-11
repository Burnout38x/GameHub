import type { Metadata } from 'next';
import DilemmaLocal from '@/components/live/DilemmaLocal';
export const metadata: Metadata = { title: 'What Would You Do? · GameHub', description: 'Pass-and-play dilemmas: love, marriage, money, war, the apocalypse and more. Guess what your friends would really do.' };
export default function Page() { return <DilemmaLocal />; }
