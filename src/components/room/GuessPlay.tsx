'use client';
import { useState } from 'react';
import type { RoomBundle } from './RoomClient';
import { callRoomApi } from './RoomClient';

export default function GuessPlay({ room, players, userId, refresh }: RoomBundle) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [value, setValue] = useState('');

  const state = room.round_state as {
    min: number;
    max: number;
    guesses: { by: string; name: string; value: number; dir: string }[];
    guessRound: number;
    lastWin?: { name: string; secret: number; points: number };
  };
  const isMyTurn = room.turn_player_id === userId;
  const turnPlayer = players.find((p) => p.profile_id === room.turn_player_id);

  // Narrow the live range from guess history so players see the closing window.
  let lo = state.min;
  let hi = state.max;
  for (const g of state.guesses) {
    if (g.dir === 'higher' && g.value + 1 > lo) lo = g.value + 1;
    if (g.dir === 'lower' && g.value - 1 < hi) hi = g.value - 1;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isMyTurn || busy) return;
    setBusy(true);
    setError('');
    try {
      await callRoomApi(room.code, 'guess', { value: Number(value) });
      setValue('');
      refresh();
    } catch (err: any) {
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {state.lastWin && (
        <div className="glass-sm p-3 text-center text-sm text-emerald-300">
          🎉 {state.lastWin.name} found {state.lastWin.secret} and scored +{state.lastWin.points}!
        </div>
      )}

      <div className="glass flex flex-col items-center gap-4 p-7 text-center">
        <div className="pill">Round {state.guessRound + 1} of {room.total_rounds}</div>
        <div className="text-2xl font-black tracking-tight">
          I’m thinking of a number between
          <div className="mt-2 text-4xl text-indigo-300">
            {lo} – {hi}
          </div>
        </div>
        <p className="text-sm text-white/60">Fewer guesses = more points (up to 10).</p>

        {isMyTurn ? (
          <form onSubmit={submit} className="flex w-full max-w-xs gap-2">
            <input
              type="number"
              min={lo}
              max={hi}
              required
              className="input text-center text-xl font-black"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`${lo}–${hi}`}
            />
            <button className="btn !w-auto px-6" disabled={busy}>
              Guess
            </button>
          </form>
        ) : (
          <div className="pill">⏳ {turnPlayer?.display_name ?? '…'} is guessing…</div>
        )}
        {error && <p className="text-sm font-bold text-red-300">{error}</p>}
      </div>

      {state.guesses.length > 0 && (
        <div className="glass-sm p-4">
          <div className="text-xs font-black uppercase tracking-wide text-white/50">This round</div>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {[...state.guesses].reverse().map((g, i) => (
              <li key={i} className="flex items-center justify-between">
                <span className="text-white/70">
                  {g.name} guessed <strong className="text-white">{g.value}</strong>
                </span>
                <span className={g.dir === 'correct' ? 'font-black text-emerald-300' : 'text-white/50'}>
                  {g.dir === 'correct' ? '✔ correct!' : g.dir === 'higher' ? '↑ higher' : '↓ lower'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
