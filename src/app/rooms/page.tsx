import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface BrowserRoom {
  id: string;
  code: string;
  status: string;
  difficulty: string;
  mode: string;
  total_rounds: number;
  host_id: string;
  is_public: boolean;
  created_at: string;
  games: { name: string; emoji: string; type: string } | null;
  room_players: { profile_id: string; display_name: string }[];
}

function RoomCard({ room, userId }: { room: BrowserRoom; userId: string }) {
  const host = room.room_players.find((p) => p.profile_id === room.host_id);
  const mine = room.room_players.some((p) => p.profile_id === userId);
  const live = room.status === 'playing';
  return (
    <div className="glass flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between">
        <div className="text-4xl">{room.games?.emoji ?? '🎮'}</div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {live ? (
            <span className="pill !text-[11px] uppercase !text-red-300">🔴 Live</span>
          ) : (
            <span className="pill !text-[11px] uppercase !text-emerald-200">Open</span>
          )}
          {room.mode === 'spotlight' && <span className="pill !text-[11px] uppercase">🎯 Spotlight</span>}
        </div>
      </div>
      <div>
        <div className="text-lg font-black">{room.games?.name ?? 'Game'}</div>
        <p className="mt-1 text-sm text-white/65">
          Hosted by <span className="font-bold">{host?.display_name ?? '…'}</span> ·{' '}
          {room.difficulty} · {room.total_rounds} rounds
        </p>
      </div>
      <div className="mt-auto flex items-center justify-between pt-2">
        <span className="text-xs font-bold text-white/45">
          {room.room_players.length}/10 players
        </span>
        {mine ? (
          <Link
            href={`/room/${room.code}`}
            className="rounded-xl px-4 py-2 text-sm font-black text-[#0a0918]"
            style={{ background: 'linear-gradient(135deg,#a5b4fc,#f9a8d4)' }}
          >
            Return →
          </Link>
        ) : live ? (
          <span className="text-xs font-bold text-white/45">In progress</span>
        ) : (
          <Link
            href={`/room/${room.code}`}
            className="rounded-xl px-4 py-2 text-sm font-black text-[#0a0918]"
            style={{ background: 'linear-gradient(135deg,#a5b4fc,#f9a8d4)' }}
          >
            Join →
          </Link>
        )}
      </div>
    </div>
  );
}

function Section({ title, rooms, userId }: { title: string; rooms: BrowserRoom[]; userId: string }) {
  if (rooms.length === 0) return null;
  return (
    <div>
      <h2 className="text-xl font-black tracking-tight">{title}</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((r) => (
          <RoomCard key={r.id} room={r} userId={userId} />
        ))}
      </div>
    </div>
  );
}

export default async function RoomsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/rooms');

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('rooms')
    .select(
      'id, code, status, difficulty, mode, total_rounds, host_id, is_public, created_at, games(name, emoji, type), room_players(profile_id, display_name)'
    )
    .in('status', ['lobby', 'playing'])
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  const rooms = (data ?? []) as unknown as BrowserRoom[];
  const mine = rooms.filter((r) => r.room_players.some((p) => p.profile_id === user.id));
  const openLobbies = rooms.filter(
    (r) =>
      r.is_public &&
      r.status === 'lobby' &&
      r.room_players.length < 10 &&
      !r.room_players.some((p) => p.profile_id === user.id)
  );
  const liveNow = rooms.filter(
    (r) => r.is_public && r.status === 'playing' && !r.room_players.some((p) => p.profile_id === user.id)
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Rooms</h1>
          <p className="mt-1 text-white/60">
            Hop into a public room, or use a code for private ones.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/rooms/join" className="btn-secondary !w-auto px-6 !py-3">
            Have a code? Join →
          </Link>
          <Link
            href="/rooms/new"
            className="rounded-2xl px-6 py-3 font-extrabold text-[#0a0918]"
            style={{ background: 'linear-gradient(135deg,#a5b4fc,#f9a8d4)' }}
          >
            Create room
          </Link>
        </div>
      </div>

      <Section title="Your rooms" rooms={mine} userId={user.id} />
      <Section title="Open lobbies" rooms={openLobbies} userId={user.id} />
      <Section title="Live now" rooms={liveNow} userId={user.id} />

      {mine.length === 0 && openLobbies.length === 0 && liveNow.length === 0 && (
        <div className="glass p-8 text-center text-white/60">
          <div className="text-4xl">🌍</div>
          <p className="mt-3">No public rooms right now — create one and let people join!</p>
        </div>
      )}
    </div>
  );
}
