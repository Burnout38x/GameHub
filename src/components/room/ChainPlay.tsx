'use client';
import { useEffect, useRef, useState } from 'react';
import type { RoomBundle } from './RoomClient';
import { callRoomApi } from './RoomClient';

/** Word Association Chain — keep the chain alive; weak links go to a vote. */
export default function ChainPlay({ room, players, userId, refresh }: RoomBundle) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [word, setWord] = useState('');

  const state = room.round_state ?? {};
  const chain: { word: string; by: string | null; name: string | null }[] = state.chain ?? [];
  const challenge = state.challenge ?? null;
  const isMyTurn = room.turn_player_id === userId;
  const turnPlayer = players.find((p) => p.profile_id === room.turn_player_id);
  const lastWord = chain[chain.length - 1];

  // Countdown to the server deadline (timed rooms only, paused during votes).
  const deadline = room.answer_seconds && !challenge ? state.deadline : null;
  const [now, setNow] = useState(() => Date.now());
  const timedOutRef = useRef<string | null>(null);
  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [deadline]);
  const secondsLeft = deadline ? Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000)) : null;
  useEffect(() => {
    if (!deadline || secondsLeft !== 0 || timedOutRef.current === deadline) return;
    timedOutRef.current = deadline;
    callRoomApi(room.code, 'chain', { timeout: true }).catch(() => {}).finally(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, deadline]);

  async function act(body: Record<string, any>) {
    setBusy(true);
    setError('');
    try {
      await callRoomApi(room.code, 'chain', body);
      setWord('');
      refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  }

  const canChallenge =
    isMyTurn && !challenge && players.length >= 3 && chain.length >= 2 && lastWord?.by && lastWord.by !== userId;

  if (challenge) {
    const involved = userId === challenge.submitterId || userId === challenge.challengerId;
    const voted = !!challenge.votes?.[userId];
    return (
      <div className="flex flex-col gap-3">
        <div className="glass p-7 text-center">
          <div className="text-5xl">⚖️</div>
          <div className="pill mx-auto mt-3">Challenge vote</div>
          <h2 className="mt-3 text-xl font-black tracking-tight">
            Is “{challenge.word}” a reasonable association with “{challenge.prev}”?
          </h2>
          <p className="mt-2 text-sm text-white/60">
            {challenge.challengerName} challenged {challenge.submitterName}&apos;s word.
          </p>
          {involved ? (
            <div className="glass-sm mt-5 p-4 text-sm text-white/70">
              You&apos;re involved — the other players are voting…
            </div>
          ) : voted ? (
            <div className="glass-sm mt-5 p-4 text-sm text-white/70">Vote cast ✔ Waiting for the rest…</div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                className="option-btn !border-emerald-400/50 text-center"
                disabled={busy}
                onClick={() => act({ vote: 'strong' })}
              >
                💪 Strong connection
              </button>
              <button
                className="option-btn !border-red-400/50 text-center"
                disabled={busy}
                onClick={() => act({ vote: 'weak' })}
              >
                🥴 Weak connection
              </button>
            </div>
          )}
          {error && <p className="mt-3 text-sm font-bold text-red-300">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="pill">
          {isMyTurn ? '🎯 Your turn!' : `${turnPlayer?.display_name ?? '…'}'s turn`}
        </div>
        <div className="pill">
          Turn {Math.min((state.turnIndex ?? 0) + 1, room.total_rounds)} of {room.total_rounds}
        </div>
        {secondsLeft !== null && (
          <div className={`pill ${secondsLeft <= 4 ? '!border-red-400/60 !text-red-300' : ''}`}>
            ⏱ {secondsLeft}s
          </div>
        )}
      </div>

      {state.lastChallenge && (
        <div className="glass-sm p-4 text-center text-sm font-bold text-white/85">
          {state.lastChallenge.succeeded
            ? `Challenge succeeded — “${state.lastChallenge.word}” was removed. ${state.lastChallenge.challengerName} +1`
            : `Challenge failed — “${state.lastChallenge.word}” stays. ${state.lastChallenge.challengerName} −1`}
        </div>
      )}

      <div className="glass flex flex-col items-center gap-4 p-6 text-center">
        <div className="pill">Previous word</div>
        <div className="text-2xl font-black tracking-tight">{lastWord?.word}</div>
        <form
          className="flex w-full max-w-sm flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (word.trim()) act({ word });
          }}
        >
          <input
            className="input"
            maxLength={28}
            autoComplete="off"
            placeholder="Type a connected word"
            value={word}
            disabled={!isMyTurn || busy}
            onChange={(e) => setWord(e.target.value)}
          />
          <button type="submit" className="btn !py-3" disabled={!isMyTurn || busy || !word.trim()}>
            Submit word (+1)
          </button>
        </form>
        {canChallenge && (
          <button className="btn-danger !w-auto px-4 !py-2 text-sm" disabled={busy} onClick={() => act({ challenge: true })}>
            ⚖️ Challenge “{lastWord?.word}” instead
          </button>
        )}
        {error && <div className="text-sm font-bold text-red-300">{error}</div>}
      </div>

      <div className="glass p-5">
        <h2 className="text-lg font-black">Chain ({chain.length})</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {chain.map((c, i) => (
            <span key={`${c.word}-${i}`} className="pill !py-1.5" title={c.name ?? 'starter'}>
              {c.word}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
