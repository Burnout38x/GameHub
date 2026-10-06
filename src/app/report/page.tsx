import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ReportForm from './report-form';
export const dynamic = 'force-dynamic';
export default async function ReportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return <div className="mx-auto w-full max-w-2xl"><div className="glass p-6 sm:p-8">
    <span className="pill">Help improve game night</span>
    <h1 className="mt-4 text-3xl font-black">Send a report</h1>
    <p className="mt-3 text-sm text-white/65">Found a bug, a player issue, or have an idea? Your report and account ID are visible only to admins. Please avoid passwords or other sensitive information.</p>
    <ReportForm />
  </div></div>;
}
