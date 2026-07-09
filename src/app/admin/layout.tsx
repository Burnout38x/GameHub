import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/games');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black tracking-tight">👑 Admin Console</h1>
        <nav className="flex flex-wrap gap-2">
          <Link href="/admin" className="pill">Dashboard</Link>
          <Link href="/admin/games" className="pill">Games</Link>
          <Link href="/admin/prompts" className="pill">Prompts</Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
