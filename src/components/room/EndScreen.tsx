'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { RoomBundle } from './RoomClient';

export default function EndScreen({ room, game, players, userId, controlsOnly = false }: RoomBundle & { controlsOnly?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winners = players.filter((p) => room.winner_ids.includes(p.profile_id));
  const iWon = room.winner_ids.includes(userId);
  const solo = players.length === 1;
  const isHost = room.host_id === userId;

  const coopBattle = game.type === 'battle' && room.mode === 'coop';
  const title = coopBattle
    ? (room.winner_ids.length ? 'Team victory! The Machine falls 🏆' : 'The Machine wins this time 🤖')
    : solo
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
          answerSeconds: room.answer_seconds,
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
      <div className="result-enter glass flex min-w-0 flex-col items-center gap-5 p-5 sm:p-8">
        {!controlsOnly && <>
        <div aria-hidden="true" className="grid h-24 w-24 place-items-center rounded-[2rem] border border-white/15 text-5xl shadow-lg" style={{ background: 'linear-gradient(135deg, var(--surface), var(--surface-end))', boxShadow: 'inset 0 0 0 5px var(--surface), 0 10px 28px #00000015' }}>{solo ? '⭐' : winners.length > 1 ? '🤝' : '🏆'}</div>
        <div className="pill">{game.emoji} {game.name} · Complete</div>
        <h1 className="min-w-0 max-w-full text-3xl font-black sm:text-4xl leading-tight tracking-tight [overflow-wrap:anywhere]">{title}</h1>
        {!solo && (
          <p className="max-w-sm text-sm text-white/70">{coopBattle ? (iWon ? 'Teamwork makes the dream work 🤝' : 'Regroup and storm it again!') : iWon ? 'You took the crown 👑' : 'Better luck next round!'}</p>
        )}
        <section className="w-full min-w-0" aria-labelledby="final-scores-title">
          <h2 id="final-scores-title" className="mb-3 text-left text-sm font-bold text-white/70">Final scores</h2>
          <ol className="grid w-full gap-2.5">
            {sorted.map((p) => {
              const rank = sorted.findIndex(other => other.score === p.score) + 1;
              const winner = room.winner_ids.includes(p.profile_id);
              return <li key={p.id} className="glass-sm flex min-w-0 items-center gap-3 !rounded-2xl p-4 text-left" style={winner ? { borderColor: 'var(--accent-cool)' } : undefined}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-xl" aria-label={solo ? 'Player' : `Rank ${rank}`}>{solo ? '⭐' : ['🥇', '🥈', '🥉'][rank - 1] ?? `#${rank}`}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold [overflow-wrap:anywhere]">{p.display_name}{p.profile_id === userId ? ' (you)' : ''}</p>
                  {winner && !solo && <p className="mt-0.5 text-xs font-semibold" style={{ color: 'var(--accent-cool)' }}>{winners.length > 1 ? 'Joint winner' : 'Winner'}</p>}
                </div>
                <div className="shrink-0 text-right"><strong className="text-3xl font-black tabular-nums">{p.score}</strong><span className="ml-1 text-xs text-white/65">pts</span></div>
              </li>;
            })}
          </ol>
        </section>
        </>}
        {error && <p role="alert" className="text-sm font-bold text-red-300">{error}</p>}
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
