import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import ProgressTracker from './ProgressTracker';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: earned }, { data: all }, { data: history }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('profile_achievements').select('achievement_id, earned_at').eq('profile_id', user.id),
    supabase.from('achievements').select('*'),
    supabase
      .from('match_history')
      .select('id, score, won, played_at, games(name, emoji)')
      .eq('profile_id', user.id)
      .order('played_at', { ascending: false })
      .limit(10),
  ]);

  const earnedIds = new Set((earned ?? []).map((e) => e.achievement_id));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="glass p-7">
        <div className="pill">{profile?.role === 'admin' ? '👑 Admin' : '🎮 Player'}</div>
        <h1 className="mt-3 text-3xl font-black tracking-tight">{profile?.username}</h1>
        <p className="mt-2 text-white/65">Your game-night journey, one game at a time.</p>
        <Link href="/friends" className="btn-secondary mt-4 sm:w-auto">Friends & invitations →</Link>
      </div>

      <ProgressTracker />

      <div className="glass p-7">
        <h2 className="text-xl font-black">Achievements</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(all ?? []).map((a) => {
            const got = earnedIds.has(a.id);
            return (
              <div key={a.id} className={`glass-sm flex items-center gap-3 px-4 py-3 ${got ? '' : 'border-dashed'}`}>
                <span className="text-2xl">{got ? a.emoji : '🔒'}</span>
                <div>
                  <div className="text-sm font-black">{a.name}</div>
                  <div className="text-xs text-white/55">{a.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass p-7">
        <h2 className="text-xl font-black">Recent games</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {(history ?? []).map((h: any) => (
            <li key={h.id} className="glass-sm flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span className="font-bold">
                {h.games?.emoji} {h.games?.name}
              </span>
              <span className="text-white/60">
                {h.score} pts · {h.won ? '🏆 won' : 'played'} ·{' '}
                {new Date(h.played_at).toLocaleDateString()}
              </span>
            </li>
          ))}
          {(history ?? []).length === 0 && (
            <li className="py-4 text-center text-white/50">No games yet — go start one!</li>
          )}
        </ul>
      </div>
    </div>
  );
}
