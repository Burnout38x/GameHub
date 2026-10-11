import type { Metadata } from 'next';
import WhotSolo from '@/components/whot/WhotSolo';
export const metadata: Metadata = { title: 'Whot! · GameHub', description: 'The Naija card classic. Play Whot! against the Machine or friends online: Hold On, Pick Two, Suspension, General Market and Whot calls.' };
export default function Page() { return <WhotSolo />; }
