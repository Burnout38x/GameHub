'use client';
import type { RoomBundle } from './RoomClient';
import { isTurnBased } from '@/lib/game-utils';

export default function Scoreboard({ room, game, players, userId }: RoomBundle) {
  const turnBased = isTurnBased(game.slug, game.type);
  const progress =
    game.type === 'memory'
      ? ((room.round_state?.matched ?? 0) / room.total_rounds) * 100
      : (room.current_round / room.total_rounds) * 100;

  return (
    <div className="mt-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {players.map((p) => {
          const isTurn = turnBased && room.turn_player_id === p.profile_id;
          return (
            <div
              key={p.id}
              className={`glass-sm px-4 py-3 ${isTurn ? 'outline outline-2 outline-pink-400/70' : ''}`}
            >
              <div className="truncate text-xs text-white/60">
                {p.display_name}
                {p.profile_id === userId ? ' (you)' : ''}
                {isTurn ? ' 🎯' : ''}
              </div>
              <div className="mt-1 text-2xl font-black">{p.score}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#a5b4fc,#f9a8d4)' }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[13px] font-bold text-white/55">
        <span>
          {game.emoji} {game.name}
        </span>
        <span>
          {game.type === 'memory'
            ? `${room.round_state?.matched ?? 0} / ${room.total_rounds} pairs`
            : `Round ${Math.min(room.current_round + 1, room.total_rounds)} of ${room.total_rounds}`}
        </span>
      </div>
    </div>
  );
}
