'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RoomBundle } from './RoomClient';
import { callRoomApi } from './RoomClient';
import { shuffle, isTurnBased } from '@/lib/game-utils';

export default function QuizPlay({ room, game, players, answers, prompt, userId, refresh }: RoomBundle) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showHint, setShowHint] = useState(false);

  const content = prompt?.content ?? {};
  // Stable shuffle per prompt so options don't jump around on refetches.
  const options: string[] = useMemo(
    () => shuffle(content.options ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prompt?.id]
  );

  const myAnswer = answers.find((a) => a.profile_id === userId);
  const revealed = room.round_phase === 'revealed';
  const waitingFor = players.length - answers.length;

  const turnBased = isTurnBased(game.slug, game.type, room.mode);
  const isMyTurn = room.turn_player_id === userId;
  const turnPlayer = players.find((p) => p.profile_id === room.turn_player_id);
  const turnAnswer = answers.find((a) => a.profile_id === room.turn_player_id);

  // Timed rooms: count down to the server deadline; when it passes, ask the
  // server to reveal the round (any client may do it — the server race-guards).
  const deadline = room.answer_seconds ? room.round_state?.deadline : null;
  const [now, setNow] = useState(() => Date.now());
  const timedOutRef = useRef<string | null>(null);
  useEffect(() => {
    if (!deadline || revealed) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [deadline, revealed]);
  const secondsLeft = deadline ? Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000)) : null;
  const expired = secondsLeft === 0;
  useEffect(() => {
    if (!deadline || revealed || !expired || timedOutRef.current === deadline) return;
    timedOutRef.current = deadline;
    callRoomApi(room.code, 'advance', { fromRound: room.current_round })
      .catch(() => {})
      .finally(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired, deadline, revealed]);

  const canAnswer = !revealed && !myAnswer && (!turnBased || isMyTurn) && !expired;

  async function submit(option: string) {
    if (!canAnswer || busy) return;
    setBusy(true);
    setError('');
    try {
      await callRoomApi(room.code, 'answer', { answer: option });
      refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function next() {
    setBusy(true);
    setError('');
    try {
      await callRoomApi(room.code, 'advance', { fromRound: room.current_round });
      refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
    setShowHint(false);
  }

  if (!prompt) return <div className="glass p-6 text-white/60">Loading question…</div>;

  return (
    <div className="flex flex-col gap-3">
      {(turnBased || secondsLeft !== null) && (
        <div className="flex items-center gap-2">
          {turnBased && (
            <div className="pill">
              {isMyTurn ? '🎯 Your turn!' : `${turnPlayer?.display_name ?? '…'}'s turn`}
            </div>
          )}
          {secondsLeft !== null && !revealed && (
            <div className={`pill ${secondsLeft <= 5 ? '!border-red-400/60 !text-red-300' : ''}`}>
              ⏱ {secondsLeft}s
            </div>
          )}
        </div>
      )}
      <div className="glass flex min-h-[180px] flex-col items-center justify-center gap-3 p-6 text-center">
        {content.emoji && <div className="text-6xl leading-tight drop-shadow-lg">{content.emoji}</div>}
        <div className="text-xl font-black leading-snug tracking-tight sm:text-2xl">
          {content.question}
        </div>
        {game.config?.showHint && content.hint && !revealed && (
          <button className="text-sm font-black text-amber-200" onClick={() => setShowHint(!showHint)}>
            {showHint ? content.hint : 'Show hint 💡'}
          </button>
        )}
      </div>

      <div className="grid gap-2.5">
        {options.map((option) => {
          const picked = (turnBased ? turnAnswer : myAnswer)?.answer?.value === option;
          const cls = revealed
            ? option === content.answer
              ? 'option-correct'
              : picked
                ? 'option-wrong'
                : ''
            : picked
              ? 'border-indigo-300/70 bg-indigo-400/[0.15]'
              : '';
          return (
            <button
              key={option}
              className={`option-btn ${cls}`}
              disabled={!canAnswer || busy}
              onClick={() => submit(option)}
            >
              {option}
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm font-bold text-red-300">{error}</p>}

      {!revealed && !turnBased && myAnswer && (
        <div className="glass-sm p-4 text-sm text-white/70">
          Answer locked in ✔ Waiting for {waitingFor} more player{waitingFor === 1 ? '' : 's'}…
        </div>
      )}

      {!revealed && turnBased && !isMyTurn && (
        <div className="glass-sm p-4 text-sm text-white/70">
          Waiting for {turnPlayer?.display_name ?? '…'} to answer…
        </div>
      )}

      {revealed && (
        <div className="glass-sm p-4 text-sm leading-relaxed text-white/85">
          {turnBased ? (
            <strong>
              {turnAnswer?.is_correct
                ? `${isMyTurn ? 'You' : turnPlayer?.display_name ?? 'They'} got it right! 🎉`
                : `${isMyTurn ? 'You' : turnPlayer?.display_name ?? 'They'} picked "${turnAnswer?.answer?.value ?? '…'}" — the answer was: ${content.answer}`}
            </strong>
          ) : (
            <strong>{myAnswer?.is_correct ? 'Correct! 🎉' : `The answer was: ${content.answer}`}</strong>
          )}
          {game.config?.showFact && content.fact && (
            <p className="mt-1 text-white/70">💡 {content.fact}</p>
          )}
          {!turnBased && (
            <div className="mt-2 text-xs text-white/50">
              {answers.filter((a) => a.is_correct).length} of {players.length} got it right
            </div>
          )}
        </div>
      )}

      {revealed && (
        <button className="btn" disabled={busy} onClick={next}>
          {room.current_round + 1 >= room.total_rounds ? 'Finish game 🏁' : 'Next question →'}
        </button>
      )}
    </div>
  );
}
