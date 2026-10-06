import Link from 'next/link';
import { LOCAL_GAMES } from '@/lib/local-games/catalog';
import GameLibrary from '@/components/GameLibrary';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const NOTICES: Record<string, string> = {
  host_left: 'Room closed by the host.',
  not_enough_players: 'Room closed — not enough players to keep playing.',
  removed: "You're no longer in that room.",
};

// Same-device games — no room/code needed, everyone plays on one screen.

export default async function GamesPage({
  searchParams,
}: {
  searchParams?: Promise<{ notice?: string; q?: string | string[] }>;
}) {
  const query = await searchParams;
  const notice = query?.notice ? NOTICES[query.notice] : null;
  const search = typeof query?.q === 'string' ? query.q.trim().slice(0, 100) : '';
  const supabase = await createClient();
  const { data: games } = await supabase
    .from('games')
    .select('id, slug, name, description, emoji, type')
    .eq('is_active', true)
    .order('sort_order');

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
          <p className="mt-1 text-white/60">Find something for your people. Play on your own phones or share one screen.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/rooms" className="btn-secondary !w-auto px-6 !py-3">
            Browse rooms →
          </Link>
          <Link href="/rooms/join" className="btn-secondary !w-auto px-6 !py-3">
            Have a code? Join →
          </Link>
        </div>
      </div>

      <GameLibrary key={search} online={games ?? []} local={LOCAL_GAMES} initialSearch={search} />
    </div>
  );
}
