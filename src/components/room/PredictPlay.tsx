'use client';
import { useState } from 'react';
import type { RoomBundle } from './RoomClient';
import { callRoomApi } from './RoomClient';

/** Know Your Partner (multiple choice) and Who Remembers It Better (free text). */
export default function PredictPlay({ room, game, players, answers, prompt, userId, refresh }: RoomBundle) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('');

  const freeText = !!game.config?.freeText;
  const content = prompt?.content ?? {};
  const state = room.round_state ?? {};
  const stage: string = state.stage ?? (freeText ? 'collect' : 'subject');
  const revealed = room.round_phase === 'revealed';
  const result = state.result ?? null;
  const isTurn = room.turn_player_id === userId;
  const partner = players.find((p) => p.profile_id !== userId);
  const turnPlayer = players.find((p) => p.profile_id === room.turn_player_id);
  const myAnswer = answers.find((a) => a.profile_id === userId);

  async function act(body: Record<string, any>) {
    setBusy(true);
    setError('');
    try {
      await callRoomApi(room.code, 'predict', body);
      setText('');
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
  }

  if (!prompt) return <div className="glass p-6 text-white/60">Loading question…</div>;

  const advanceButton = revealed && (
    <button className="btn" disabled={busy} onClick={next}>
      {room.current_round + 1 >= room.total_rounds ? 'Finish game 🏁' : 'Next question →'}
    </button>
  );

  // ---------- Who Remembers It Better ----------
  if (freeText) {
    return (
      <div className="flex flex-col gap-3">
        <div className="glass flex min-h-[140px] flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="pill">📸 Answer from memory — matches score for both of you</div>
          <div className="text-xl font-black leading-snug tracking-tight sm:text-2xl">
            {content.question}
          </div>
        </div>

        {!revealed && stage === 'collect' && (
          myAnswer ? (
            <div className="glass-sm p-4 text-sm text-white/70">
              Answer locked in ✔ Waiting for {partner?.display_name ?? 'your partner'} to answer…
            </div>
          ) : (
            <div className="glass-sm flex flex-col gap-2 p-4">
              <textarea
                className="input min-h-[90px]"
                maxLength={180}
                placeholder="Type your private answer"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button className="btn !py-3" disabled={busy || !text.trim()} onClick={() => act({ answer: text })}>
                Save private answer 🔒
              </button>
            </div>
          )
        )}

        {(stage === 'decide' || revealed) && result?.answers && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {result.answers.map((a: { name: string; value: string }) => (
              <div key={a.name} className="glass-sm px-4 py-3 text-left">
                <div className="text-xs font-bold text-white/60">{a.name}</div>
                <div className="mt-1 font-bold">{a.value}</div>
              </div>
            ))}
          </div>
        )}

        {!revealed && stage === 'decide' && (
          isTurn ? (
            <div className="flex flex-col gap-2">
              <p className="text-center text-sm font-bold text-white/75">
                The answers differ — do they mean the same thing?
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  className="option-btn !border-emerald-400/50 text-center"
                  disabled={busy}
                  onClick={() => act({ decision: 'same' })}
                >
                  🤝 Same memory
                </button>
                <button
                  className="option-btn !border-red-400/50 text-center"
                  disabled={busy}
                  onClick={() => act({ decision: 'different' })}
                >
                  💬 Different memories
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-sm p-4 text-sm text-white/70">
              {turnPlayer?.display_name ?? 'Your partner'} is deciding whether they match…
            </div>
          )
        )}

        {revealed && (
          <div className="glass-sm p-4 text-center text-sm font-bold text-white/85">
            {result?.match
              ? result?.auto
                ? 'Automatic match — you both earn a point! ✅'
                : 'Counted as the same memory — a point for each of you! 🤝'
              : 'Different memories — perfect conversation starter. 💬'}
          </div>
        )}

        {error && <p className="text-sm font-bold text-red-300">{error}</p>}
        {advanceButton}
      </div>
    );
  }

  // ---------- Know Your Partner ----------
  const options: string[] = content.options ?? [];
  const showOptions = revealed || (stage === 'subject' && isTurn) || (stage === 'guess' && !isTurn);
  const roleLabel = revealed
    ? null
    : stage === 'subject'
      ? isTurn
        ? '🔒 Your question — answer privately, your partner will guess it'
        : `${turnPlayer?.display_name ?? '…'} is answering privately…`
      : isTurn
        ? `✓ Answer locked. ${partner?.display_name ?? 'Your partner'} is guessing…`
        : `🎯 Guess ${turnPlayer?.display_name ?? 'your partner'}'s answer!`;

  return (
    <div className="flex flex-col gap-3">
      {roleLabel && <div className="pill">{roleLabel}</div>}
      <div className="glass flex min-h-[140px] flex-col items-center justify-center gap-3 p-6 text-center">
        {content.category && <div className="pill capitalize">{content.category}</div>}
        <div className="text-xl font-black leading-snug tracking-tight sm:text-2xl">
          {content.question}
        </div>
      </div>

      {showOptions ? (
        <div className="grid gap-2.5">
          {options.map((option) => {
            const cls = revealed
              ? option === result?.subjectAnswer
                ? 'option-correct'
                : option === result?.guess
                  ? 'option-wrong'
                  : ''
              : '';
            const canPick = !revealed && !busy;
            return (
              <button
                key={option}
                className={`option-btn ${cls}`}
                disabled={!canPick}
                onClick={() => act({ answer: option })}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="glass-sm p-4 text-sm text-white/70">
          {stage === 'subject'
            ? `Waiting for ${turnPlayer?.display_name ?? 'your partner'} to answer privately…`
            : `Waiting for ${partner?.display_name ?? 'your partner'} to guess…`}
        </div>
      )}

      {revealed && result && (
        <div className="glass-sm p-4 text-center text-sm font-bold text-white/85">
          {result.correct
            ? `${result.guesserName} read ${result.subjectName}'s mind — +1 point! 🎉`
            : `${result.guesserName} guessed “${result.guess}”, but ${result.subjectName} said “${result.subjectAnswer}”.`}
        </div>
      )}

      {error && <p className="text-sm font-bold text-red-300">{error}</p>}
      {advanceButton}
    </div>
  );
}
