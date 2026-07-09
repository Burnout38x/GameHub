'use client';
import { useEffect, useRef, useState } from 'react';
import type { RoomBundle } from './RoomClient';
import { callRoomApi } from './RoomClient';
import { isTurnBased } from '@/lib/game-utils';

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function PromptPlay({ room, game, players, answers, prompt, userId, refresh }: RoomBundle) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cfg = game.config ?? {};
  const content = prompt?.content ?? {};
  const turnBased = isTurnBased(game.slug, game.type);
  const isMyTurn = room.turn_player_id === userId;
  const turnPlayer = players.find((p) => p.profile_id === room.turn_player_id);
  const myAnswer = answers.find((a) => a.profile_id === userId);
  const revealed = room.round_phase === 'revealed';
  const canAnswer = !revealed && !myAnswer && (!turnBased || isMyTurn);
  const choices: string[] = cfg.optionsFromContent ? (content.choices ?? []) : (cfg.choices ?? []);

  // Optional local timer (2-Minute Challenge)
  const timerLength = Number(cfg.timerSeconds) || 0;
  const [timeLeft, setTimeLeft] = useState(timerLength);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    setTimeLeft(timerLength);
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [room.current_round, timerLength]);
  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setRunning(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  async function submit(choice: string) {
    if (!canAnswer || busy) return;
    setBusy(true);
    setError('');
    try {
      await callRoomApi(room.code, 'answer', { answer: choice });
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

  if (!prompt) return <div className="glass p-6 text-white/60">Loading prompt…</div>;

  const isWyr = !!cfg.optionsFromContent;

  return (
    <div className="flex flex-col gap-3">
      {turnBased && (
        <div className="pill mx-auto">
          {isMyTurn ? '🎯 Your turn!' : `${turnPlayer?.display_name ?? '…'}'s turn`}
        </div>
      )}

      <div className="glass flex min-h-[220px] flex-col items-center justify-center gap-4 p-7 text-center">
        {content.category && <div className="pill">{content.category}</div>}
        <div className="text-2xl font-black leading-snug tracking-tight">{content.text}</div>
        {timerLength > 0 && (
          <div
            className={`text-5xl font-black tracking-tight ${
              timeLeft === 0 ? 'text-red-400' : timeLeft <= 10 ? 'text-orange-300' : 'text-emerald-300'
            }`}
          >
            {formatTime(timeLeft)}
          </div>
        )}
        {timerLength > 0 && !revealed && (!turnBased || isMyTurn) && (
          <div className="flex w-full max-w-xs gap-2">
            <button className="btn-secondary !py-2.5 text-sm" onClick={() => setRunning(true)} disabled={running || timeLeft === 0}>
              ▶ Start
            </button>
            <button
              className="btn-secondary !py-2.5 text-sm"
              onClick={() => {
                setRunning(false);
                setTimeLeft(timerLength);
              }}
            >
              ↺ Reset
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {choices.map((choice) => {
          const mine = myAnswer?.answer?.value === choice;
          return (
            <button
              key={choice}
              className={`option-btn text-center ${mine ? 'border-pink-400/70 bg-pink-400/[0.15]' : ''}`}
              disabled={!canAnswer || busy}
              onClick={() => submit(choice)}
            >
              {choice}
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm font-bold text-red-300">{error}</p>}

      {!revealed && !turnBased && myAnswer && (
        <div className="glass-sm p-4 text-sm text-white/70">
          Locked in ✔ Waiting for {players.length - answers.length} more…
        </div>
      )}
      {!revealed && turnBased && !isMyTurn && (
        <div className="glass-sm p-4 text-sm text-white/70">
          Waiting for {turnPlayer?.display_name ?? 'the other player'} to answer…
        </div>
      )}

      {revealed && (
        <div className="glass-sm p-4 text-sm leading-relaxed text-white/85">
          {isWyr && players.length > 1 ? (
            answers.length === players.length && new Set(answers.map((a) => a.answer?.value)).size === 1 ? (
              <strong>Great minds! 💞 Everyone picked the same — +1 point each.</strong>
            ) : (
              <>
                <strong>Split decision!</strong>
                <ul className="mt-1 text-white/70">
                  {answers.map((a) => {
                    const p = players.find((pl) => pl.profile_id === a.profile_id);
                    return (
                      <li key={a.id}>
                        {p?.display_name}: {a.answer?.value}
                      </li>
                    );
                  })}
                </ul>
              </>
            )
          ) : (
            answers.map((a) => {
              const p = players.find((pl) => pl.profile_id === a.profile_id);
              return (
                <p key={a.id}>
                  <strong>{p?.display_name}</strong> said: <strong>{a.answer?.value}</strong>
                  {a.points > 0 ? ' (+1 point)' : ''}
                </p>
              );
            })
          )}
        </div>
      )}

      {revealed && (
        <button className="btn" disabled={busy} onClick={next}>
          {room.current_round + 1 >= room.total_rounds ? 'Finish game 🏁' : 'Next →'}
        </button>
      )}
    </div>
  );
}
