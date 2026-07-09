import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const NOTICES: Record<string, string> = {
  host_left: 'Room closed by the host.',
  not_enough_players: 'Room closed — not enough players to keep playing.',
  removed: "You're no longer in that room.",
};

export default async function GamesPage({
  searchParams,
}: {
  searchParams?: { notice?: string };
}) {
  const notice = searchParams?.notice ? NOTICES[searchParams.notice] : null;
  const supabase = createClient();
  const { data: games } = await supabase
    .from('games')
    .select('id, slug, name, description, emoji, type')
    .eq('is_active', true)
    .order('sort_order');
  const { data: prompts } = await supabase.from('prompts').select('game_id');
  const counts = new Map<string, number>();
  for (const p of prompts ?? []) counts.set(p.game_id, (counts.get(p.game_id) ?? 0) + 1);

  return (
    <div className="flex flex-col gap-6">
      {notice && (
        <div className="glass-sm border-amber-300/40 bg-amber-400/10 p-4 text-sm font-bold text-amber-200">
          ⚠️ {notice}
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Game Library</h1>
          <p className="mt-1 text-white/60">Pick a game, create a room, share the code.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/rooms" className="btn-secondary !w-auto px-6 !py-3">
            Browse rooms →
          </Link>
          <Link href="/rooms/join" className="btn-secondary !w-auto px-6 !py-3">
            Have a code? Join →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(games ?? []).map((g) => (
          <div key={g.id} className="glass flex flex-col gap-3 p-5">
            <div className="flex items-start justify-between">
              <div className="text-4xl">{g.emoji}</div>
              <span className="pill !text-[11px] uppercase">
                {g.type === 'quiz'
                  ? 'Trivia'
                  : g.type === 'prompt'
                    ? 'Party'
                    : g.type === 'memory'
                      ? 'Board'
                      : 'Duel'}
              </span>
            </div>
            <div>
              <div className="text-lg font-black">{g.name}</div>
              <p className="mt-1 text-sm leading-relaxed text-white/65">{g.description}</p>
            </div>
            <div className="mt-auto flex items-center justify-between pt-2">
              <span className="text-xs font-bold text-white/45">
                {g.type === 'quiz' || g.type === 'prompt'
                  ? `${counts.get(g.id) ?? 0} prompts`
                  : 'Built-in content'}
              </span>
              <Link
                href={`/rooms/new?game=${g.slug}`}
                className="rounded-xl px-4 py-2 text-sm font-black text-[#0a0918]"
                style={{ background: 'linear-gradient(135deg,#a5b4fc,#f9a8d4)' }}
              >
                Play →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
