'use client';
import { useEffect, useState } from 'react';
import type { RoomBundle } from './RoomClient';
import { callRoomApi } from '@/lib/room-api';

export default function MemoryPlay({ room, players, userId, refresh }: RoomBundle) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [settledPair, setSettledPair] = useState<string | null>(null);

  const state = room.round_state as {
    theme: string;
    cards: { emoji: string; name: string; matched: boolean }[];
    flipped: number[];
    lastPair: { a: number; b: number; matched: boolean } | null;
    moves: number;
  };
  const isMyTurn = room.turn_player_id === userId;
  const turnPlayer = players.find((p) => p.profile_id === room.turn_player_id);

  // Derive visibility from the current pair; only the expiry changes local state.
  // Equivalent polling snapshots keep the same identity and never restart the peek.
  const pairKey = state?.lastPair && !state.lastPair.matched
    ? `${state.moves}:${state.lastPair.a}:${state.lastPair.b}` : null;
  const peek = pairKey && pairKey !== settledPair ? state.lastPair : null;
  useEffect(() => {
    if (!pairKey) return;
    const timer = setTimeout(() => setSettledPair(pairKey), 1100);
    return () => clearTimeout(timer);
  }, [pairKey]);

  if (!state?.cards) return <div className="glass p-6 text-white/60">Setting up the board…</div>;

  const cols = state.cards.length <= 12 ? 'grid-cols-3' : state.cards.length <= 24 ? 'grid-cols-4' : 'grid-cols-5';

  async function flip(index: number) {
    if (!isMyTurn || busy) return;
    setBusy(true);
    setError('');
    try {
      await callRoomApi(room.code, 'memory', { fromRound: room.current_round, index });
      refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="pill">
          {isMyTurn ? '🎯 Your turn — flip two cards' : `${turnPlayer?.display_name ?? '…'}'s turn`}
        </div>
        <div className="pill">🃏 {state.theme} · {state.moves} moves</div>
      </div>

      <div className={`grid gap-2 ${cols}`}>
        {state.cards.map((card, i) => {
          const faceUp = card.matched || state.flipped.includes(i) || peek?.a === i || peek?.b === i;
          return (
            <button
              key={i}
              onClick={() => flip(i)}
              aria-label={faceUp ? `${card.name ?? card.emoji}${card.matched ? ", matched" : ""}` : `Face-down card ${i + 1}`}
              disabled={!isMyTurn || faceUp || busy || !!peek || state.flipped.length >= 2}
              className={`aspect-square rounded-2xl border text-3xl transition-colors sm:text-4xl ${
                card.matched
                  ? 'border-emerald-400/60 bg-emerald-400/[0.15]'
                  : faceUp
                    ? 'border-white/[0.2] bg-white/[0.14]'
                    : 'border-white/[0.13] bg-gradient-to-br from-indigo-300/25 to-pink-300/15 hover:from-indigo-300/35'
              } ${!isMyTurn && !faceUp ? 'cursor-not-allowed opacity-80' : ''}`}
            >
              {faceUp ? card.emoji : '❓'}
            </button>
          );
        })}
      </div>

      {error && <p role="alert" className="text-sm font-bold text-red-300">{error}</p>}
      {state.lastPair && (
        <div className="glass-sm p-3 text-center text-sm text-white/70">
          {state.lastPair.matched ? 'Match found! Turn continues 🎉' : 'No match — turn passes.'}
        </div>
      )}
    </div>
  );
}
