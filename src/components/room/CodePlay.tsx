'use client';
import { useState } from 'react';
import type { RoomBundle } from './RoomClient';
import { callRoomApi } from './RoomClient';

/** Code Crackers — the secret code is server-side; take turns, use the clues. */
export default function CodePlay({ room, players, userId, refresh }: RoomBundle) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [digits, setDigits] = useState<number[]>([]);

  const state = room.round_state ?? {};
  const length: number = state.length ?? 4;
  const guesses: { by: string; name: string; guess: string; exact: number; misplaced: number }[] =
    state.guesses ?? [];
  const maxTurns: number = state.maxTurns ?? 18;
  const turnCount: number = state.turnCount ?? 0;
  const lastResult = state.lastResult ?? null;
  const isMyTurn = room.turn_player_id === userId;
  const turnPlayer = players.find((p) => p.profile_id === room.turn_player_id);

  function press(n: number) {
    if (!isMyTurn || busy || digits.length >= length) return;
    if (digits.includes(n)) {
      setError('No repeated digits in this code.');
      return;
    }
    setError('');
    setDigits([...digits, n]);
  }

  async function submit() {
    if (!isMyTurn || busy) return;
    if (digits.length !== length) {
      setError(`Enter all ${length} digits.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await callRoomApi(room.code, 'crack', { guess: digits.join('') });
      setDigits([]);
      refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="pill">
          {isMyTurn ? '🎯 Your turn — crack the code' : `${turnPlayer?.display_name ?? '…'}'s turn`}
        </div>
        <div className="pill">
          Code {(state.guessRound ?? 0) + 1} of {room.total_rounds} · turn {Math.min(turnCount + 1, maxTurns)}/{maxTurns}
        </div>
      </div>

      {lastResult && (
        <div className="glass-sm p-4 text-center text-sm font-bold text-white/85">
          {lastResult.name
            ? `${lastResult.name} cracked ${lastResult.code}! +${lastResult.points} points 🔓`
            : `No one cracked it — the code was ${lastResult.code}.`}
        </div>
      )}

      <div className="glass flex flex-col items-center gap-4 p-6 text-center">
        <div className="flex flex-wrap justify-center gap-2">
          {Array.from({ length }, (_, i) => (
            <div
              key={i}
              className="grid h-14 w-12 place-items-center rounded-2xl border border-white/[0.14] bg-black/[0.25] text-xl font-black"
            >
              {digits[i] ?? '•'}
            </div>
          ))}
        </div>
        <div className="grid w-full max-w-sm grid-cols-5 gap-2">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              className="rounded-xl border border-white/[0.14] bg-white/10 py-3 font-black hover:border-indigo-300/60 disabled:opacity-40"
              disabled={!isMyTurn || busy}
              onClick={() => press(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex w-full max-w-sm gap-2">
          <button className="btn-secondary flex-1 !py-3" disabled={!isMyTurn || busy} onClick={() => setDigits([])}>
            Clear
          </button>
          <button className="btn flex-1 !py-3" disabled={!isMyTurn || busy} onClick={submit}>
            Submit guess
          </button>
        </div>
        {error && <div className="text-sm font-bold text-red-300">{error}</div>}
        <div className="text-xs text-white/50">
          Exact = right digit, right spot · Misplaced = right digit, wrong spot
        </div>
      </div>

      {guesses.length > 0 && (
        <div className="glass p-5">
          <h2 className="text-lg font-black">Guess history</h2>
          <div className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
            {guesses.map((h, i) => (
              <div key={i} className="glass-sm px-4 py-3 text-sm">
                <strong>{h.name}</strong> guessed{' '}
                <span className="font-mono font-black tracking-widest text-indigo-200">{h.guess}</span>
                <div className="mt-1 text-xs">
                  <span className="font-bold text-emerald-300">{h.exact} exact</span>
                  <span className="text-white/40"> · </span>
                  <span className="font-bold text-amber-300">{h.misplaced} misplaced</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
