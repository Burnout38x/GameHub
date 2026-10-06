'use client';
import type { RoomBundle } from './RoomClient';
import { isTurnBased } from '@/lib/game-utils';

export default function Scoreboard({ room, game, players, userId }: RoomBundle) {
  const turnBased = isTurnBased(game.slug, game.type, room.mode);
  const progress = game.type === 'memory'
    ? ((room.round_state?.matched ?? 0) / room.total_rounds) * 100
    : (room.current_round / room.total_rounds) * 100;
  return (
    <section className="glass mt-2 p-4 sm:p-5" aria-label="Game scores and progress">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-2xl">{game.emoji}</span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-white/65">Live scores</p>
            <h2 className="mt-0.5 font-black [overflow-wrap:anywhere]">{game.name}</h2>
          </div>
        </div>
        <span className="pill !py-1.5">{game.type === 'memory'
          ? `${room.round_state?.matched ?? 0} / ${room.total_rounds} pairs`
          : `Round ${Math.min(room.current_round + 1, room.total_rounds)} of ${room.total_rounds}`}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {players.map((p) => {
          const isTurn = turnBased && room.turn_player_id === p.profile_id;
          return <div key={p.id} className="glass-sm min-w-0 !rounded-2xl px-3 py-3 sm:px-4"
            style={isTurn ? { borderColor: 'var(--accent-cool)', boxShadow: 'inset 0 0 0 1px var(--accent-cool)' } : undefined}>
            <div className="text-sm font-bold text-white/80 [overflow-wrap:anywhere]">{p.display_name}{p.profile_id === userId ? ' (you)' : ''}</div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5">
              <strong key={p.score} className="score-change text-3xl font-black tabular-nums">{p.score}</strong>
              <span className="text-xs font-semibold text-white/65">pts</span>
            </div>
            {isTurn && <p className="mt-2 text-xs font-bold" style={{ color: 'var(--accent-cool)' }}>{p.profile_id === userId ? 'Your turn' : 'Current turn'}</p>}
          </div>;
        })}
      </div>
      <div role="progressbar" aria-label="Game progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="progress-fill h-full w-full origin-left rounded-full" style={{ transform: `scaleX(${Math.max(0, Math.min(1, progress / 100))})`, background: 'linear-gradient(90deg,var(--accent-cool),var(--accent))' }} />
      </div>
    </section>
  );
}
