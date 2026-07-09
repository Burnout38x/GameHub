import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const supabase = createClient();
  const [{ data: games }, { data: prompts }, { count: playerCount }, { count: matchCount }, { count: roomCount }] =
    await Promise.all([
      supabase.from('games').select('id, name, emoji, type, is_active').order('sort_order'),
      supabase.from('prompts').select('game_id, difficulty'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('match_history').select('*', { count: 'exact', head: true }),
      supabase.from('rooms').select('*', { count: 'exact', head: true }),
    ]);

  const counts = new Map<string, { easy: number; hard: number }>();
  for (const p of prompts ?? []) {
    const c = counts.get(p.game_id) ?? { easy: 0, hard: 0 };
    c[p.difficulty as 'easy' | 'hard']++;
    counts.set(p.game_id, c);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['🎮 Games', games?.length ?? 0],
          ['👥 Players', playerCount ?? 0],
          ['🚪 Rooms created', roomCount ?? 0],
          ['🏁 Matches finished', matchCount ?? 0],
        ].map(([name, value]) => (
          <div key={name as string} className="glass p-5">
            <div className="text-sm text-white/60">{name}</div>
            <div className="mt-1 text-3xl font-black">{value}</div>
          </div>
        ))}
      </div>

      <div className="glass overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/45">
              <th className="px-5 py-4">Game</th>
              <th className="px-3 py-4">Type</th>
              <th className="px-3 py-4 text-right">Easy prompts</th>
              <th className="px-3 py-4 text-right">Hard prompts</th>
              <th className="px-3 py-4 text-right">Total</th>
              <th className="px-5 py-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {(games ?? []).map((g) => {
              const c = counts.get(g.id) ?? { easy: 0, hard: 0 };
              const usesPrompts = g.type === 'quiz' || g.type === 'prompt';
              return (
                <tr key={g.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3.5 font-bold">
                    {g.emoji} {g.name}
                  </td>
                  <td className="px-3 py-3.5 text-white/60">{g.type}</td>
                  <td className="px-3 py-3.5 text-right">{usesPrompts ? c.easy : '—'}</td>
                  <td className="px-3 py-3.5 text-right">{usesPrompts ? c.hard : '—'}</td>
                  <td className="px-3 py-3.5 text-right font-black">
                    {usesPrompts ? c.easy + c.hard : 'built-in'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={g.is_active ? 'text-emerald-300' : 'text-white/40'}>
                      {g.is_active ? '● live' : '○ hidden'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/prompts" className="btn !w-auto px-6">➕ Add prompts</Link>
        <Link href="/admin/games" className="btn-secondary !w-auto px-6">🎮 Manage / create games</Link>
      </div>
    </div>
  );
}
