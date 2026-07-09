'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { RoomBundle } from './RoomClient';

export default function EndScreen({ room, game, players, userId }: RoomBundle) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winners = players.filter((p) => room.winner_ids.includes(p.profile_id));
  const iWon = room.winner_ids.includes(userId);
  const solo = players.length === 1;
  const isHost = room.host_id === userId;

  const title = solo
    ? 'Solo round complete 🎉'
    : winners.length > 1
      ? "It's a tie! 🤝"
      : `${winners[0]?.display_name ?? 'Someone'} wins ${game.emoji}`;

  async function rematch() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: room.game_id,
          difficulty: room.difficulty,
          totalRounds: room.total_rounds,
          mode: room.mode,
          isPublic: room.is_public,
          rematchOf: room.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create rematch');
      router.push(`/room/${data.code}`);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-4 text-center">
      <div className="glass flex flex-col items-center gap-5 p-8">
        <div className="pill">🏁 Game Complete</div>
        <h1 className="text-4xl font-black leading-tight tracking-tight">{title}</h1>
        {!solo && (
          <p className="text-white/60">{iWon ? 'You took the crown 👑' : 'Better luck next round!'}</p>
        )}
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          {sorted.map((p, i) => (
            <div key={p.id} className="glass-sm p-5">
              <div className="text-sm text-white/60">
                {i === 0 && !solo ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}
                {p.display_name}
                {p.profile_id === userId ? ' (you)' : ''}
              </div>
              <div className="mt-1 text-4xl font-black">{p.score}</div>
            </div>
          ))}
        </div>
        {error && <p className="text-sm font-bold text-red-300">{error}</p>}
        {room.round_state?.nextRoomCode && !isHost && (
          <Link href={`/room/${room.round_state.nextRoomCode}`} className="btn">
            🔁 Host started a rematch — join it!
          </Link>
        )}
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          {isHost && (
            <button className="btn" disabled={busy} onClick={rematch}>
              {busy ? 'Creating…' : '🔁 Rematch (new room)'}
            </button>
          )}
          <Link href="/games" className="btn-secondary">
            Pick another game
          </Link>
        </div>
        <Link href="/leaderboard" className="text-sm font-bold text-indigo-300">
          See the global leaderboard →
        </Link>
      </div>
    </div>
  );
}
