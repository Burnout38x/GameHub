import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

function accountStatus(user: User) {
  const bannedUntil = (user as User & { banned_until?: string }).banned_until;
  return bannedUntil && Date.parse(bannedUntil) > Date.now() ? 'Suspended' : user.is_anonymous ? 'Anonymous' : user.email_confirmed_at || user.phone_confirmed_at ? 'Confirmed' : 'Unconfirmed';
}
import AccountDirectory, { type AccountRow } from '@/components/admin/AccountDirectory';
import { requireAdmin } from '@/lib/server/admin-access';

export const dynamic = 'force-dynamic';
export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { admin } = await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Math.min(100000, Math.floor(Number(params.page) || 1)));
  const perPage = 24;
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
  const ids = data?.users.map(user => user.id) ?? [];
  const profiles = ids.length ? await admin.from('profiles').select('id,username,role,games_played,games_won,total_points').in('id', ids) : { data: [], error: null };
  if (error || profiles.error) return <section className="glass p-6" role="alert"><h2 className="text-xl font-bold">Accounts could not be loaded</h2><p className="mt-2 text-white/65">Please try again. No account information has been changed.</p><Link className="btn-secondary mt-4 !w-auto" href="/admin/users">Retry</Link></section>;
  const byId = new Map((profiles.data ?? []).map(p => [p.id, p]));
  const accounts: AccountRow[] = data.users.map(user => {
    const p = byId.get(user.id);
    return { id: user.id, email: user.email ?? '', username: p?.username ?? 'Profile unavailable', role: p?.role ?? 'player',
      status: accountStatus(user),
      createdAt: user.created_at, lastSignIn: user.last_sign_in_at ?? null, providers: (user.identities ?? []).map(i => i.provider), played: p?.games_played ?? 0, won: p?.games_won ?? 0, points: p?.total_points ?? 0 };
  });
  const total = data.total ?? accounts.length;
  return <section className="flex flex-col gap-5"><div><p className="eyebrow">Your community</p><h2 className="mt-2 text-2xl font-black">Users & accounts</h2><p className="mt-2 text-sm text-white/65">{total} registered accounts. Email and sign-in details are visible only to admins.</p></div>
    <AccountDirectory accounts={accounts} />
    <nav aria-label="Account pages" className="flex items-center justify-between gap-3">{page > 1 ? <Link className="btn-secondary !w-auto" href={`/admin/users?page=${page - 1}`}>← Previous</Link> : <span />}<span className="text-sm text-white/65">Page {page}</span>{page * perPage < total ? <Link className="btn-secondary !w-auto" href={`/admin/users?page=${page + 1}`}>Next →</Link> : <span />}</nav>
  </section>;
}
