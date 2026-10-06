'use client';
import { useState } from 'react';

export type AccountRow = {
  id: string; email: string; username: string; role: string; status: string;
  createdAt: string; lastSignIn: string | null; providers: string[];
  played: number; won: number; points: number;
};
function date(value: string | null) {
  return value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value)) : 'Never';
}
export default function AccountDirectory({ accounts }: { accounts: AccountRow[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const filtered = accounts.filter(account => `${account.username} ${account.email} ${account.id}`.toLowerCase().includes(query.trim().toLowerCase()) && (status === 'all' || account.status === status));
  return <div className="flex flex-col gap-4">
    <div className="glass flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
      <div className="flex-1"><label htmlFor="account-search" className="mb-2 block text-sm font-bold">Search accounts on this page</label><input id="account-search" className="input" type="search" placeholder="Name, email or account ID" value={query} onChange={e => setQuery(e.target.value)} /></div>
      <div><label htmlFor="account-status" className="mb-2 block text-sm font-bold">Account status</label><select id="account-status" className="input" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option><option>Confirmed</option><option>Unconfirmed</option><option>Suspended</option><option>Anonymous</option></select></div>
    </div>
    <p role="status" className="text-sm text-white/65">Showing {filtered.length} of {accounts.length} accounts on this page. Dates are in UTC.</p>
    <div className="grid gap-4 lg:grid-cols-2">{filtered.map(a => <article key={a.id} className="glass min-w-0 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-lg font-bold">{a.username}</h3><p className="mt-1 break-all text-sm text-white/70">{a.email || 'No email address'}</p></div><span className="pill">{a.role === 'admin' ? 'Admin' : 'Player'} · {a.status}</span></div>
      <dl className="mt-5 grid grid-cols-3 gap-2">{[['Games', a.played], ['Wins', a.won], ['Points', a.points]].map(([name, value]) => <div key={name} className="glass-sm p-3"><dt className="text-xs text-white/65">{name}</dt><dd className="mt-1 text-xl font-black">{value}</dd></div>)}</dl>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-white/60">Joined</dt><dd>{date(a.createdAt)}</dd></div><div><dt className="text-white/60">Last sign-in</dt><dd>{date(a.lastSignIn)}</dd></div><div><dt className="text-white/60">Sign-in method</dt><dd className="break-words">{a.providers.join(', ') || 'Unknown'}</dd></div></dl>
      <details className="mt-4 text-xs text-white/65"><summary className="cursor-pointer py-2">Account ID</summary><p className="break-all select-all py-2">{a.id}</p></details>
    </article>)}</div>
    {!filtered.length && <div className="glass p-8 text-center"><h3 className="font-bold">No matching accounts</h3><p className="mt-2 text-sm text-white/65">Try a different search or visit another page.</p>{(query || status !== 'all') && <button className="btn-secondary mt-4 !w-auto" onClick={() => { setQuery(''); setStatus('all'); }}>Clear filters</button>}</div>}
  </div>;
}
