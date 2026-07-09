'use client';
import { useMemo, useState } from 'react';
import type { RoomBundle } from './RoomClient';
import { callRoomApi } from './RoomClient';
import { shuffle } from '@/lib/game-utils';

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

  async function submit(option: string) {
    if (myAnswer || revealed || busy) return;
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
          const mine = myAnswer?.answer?.value === option;
          const cls = revealed
            ? option === content.answer
              ? 'option-correct'
              : mine
                ? 'option-wrong'
                : ''
            : mine
              ? 'border-indigo-300/70 bg-indigo-400/[0.15]'
              : '';
          return (
            <button
              key={option}
              className={`option-btn ${cls}`}
              disabled={!!myAnswer || revealed || busy}
              onClick={() => submit(option)}
            >
              {option}
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm font-bold text-red-300">{error}</p>}

      {!revealed && myAnswer && (
        <div className="glass-sm p-4 text-sm text-white/70">
          Answer locked in ✔ Waiting for {waitingFor} more player{waitingFor === 1 ? '' : 's'}…
        </div>
      )}

      {revealed && (
        <div className="glass-sm p-4 text-sm leading-relaxed text-white/85">
          <strong>{myAnswer?.is_correct ? 'Correct! 🎉' : `The answer was: ${content.answer}`}</strong>
          {game.config?.showFact && content.fact && (
            <p className="mt-1 text-white/70">💡 {content.fact}</p>
          )}
          <div className="mt-2 text-xs text-white/50">
            {answers.filter((a) => a.is_correct).length} of {players.length} got it right
          </div>
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
