import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const supabase = createClient();
  const { data: players } = await supabase
    .from('profiles')
    .select('id, username, games_played, games_won, total_points, best_streak')
    .gt('games_played', 0)
    .order('total_points', { ascending: false })
    .limit(50);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-3xl font-black tracking-tight">🏆 Leaderboard</h1>
      <p className="mt-1 text-white/60">Ranked by lifetime points across all games.</p>

      <div className="glass mt-6 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/45">
              <th className="px-5 py-4">#</th>
              <th className="px-3 py-4">Player</th>
              <th className="px-3 py-4 text-right">Points</th>
              <th className="px-3 py-4 text-right">Wins</th>
              <th className="px-3 py-4 text-right">Played</th>
              <th className="px-5 py-4 text-right">Best streak</th>
            </tr>
          </thead>
          <tbody>
            {(players ?? []).map((p, i) => (
              <tr key={p.id} className="border-b border-white/5 last:border-0">
                <td className="px-5 py-3.5 font-black">{medals[i] ?? i + 1}</td>
                <td className="px-3 py-3.5 font-bold">{p.username}</td>
                <td className="px-3 py-3.5 text-right font-black text-amber-300">
                  {p.total_points.toLocaleString()}
                </td>
                <td className="px-3 py-3.5 text-right">{p.games_won}</td>
                <td className="px-3 py-3.5 text-right">{p.games_played}</td>
                <td className="px-5 py-3.5 text-right">🔥 {p.best_streak}</td>
              </tr>
            ))}
            {(players ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-white/50">
                  Nobody has played yet. Be the first! 🎮
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
