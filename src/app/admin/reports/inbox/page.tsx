import Link from 'next/link';
import { requireAdmin } from '@/lib/server/admin-access';
import ReportInbox from './report-inbox';
export const dynamic = 'force-dynamic';
export default async function ReportInboxPage() {
  await requireAdmin();
  return <div className="space-y-6"><div><Link href="/admin/reports" className="text-sm text-white/60">← Usage reports</Link><h2 className="mt-3 text-3xl font-black">Player reports</h2><p className="mt-2 text-sm text-white/65">Review bugs, player issues, and feedback. Resolving a report records its status; it does not change player accounts.</p></div><ReportInbox /></div>;
}
