'use client';
import { useEffect, useState } from 'react';
import type { RoomBundle } from './RoomClient';
import { callRoomApi } from '@/lib/room-api';
import { isTurnBased } from '@/lib/game-utils';
import { cardText, hasPicked, pickPoints, TRUTH_OR_DARE_VIBES, type DareKind } from '@/lib/truth-or-dare';

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function PromptPlay({ room, game, players, answers, prompt, userId, refresh }: RoomBundle) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cfg = game.config ?? {};
  const content = prompt?.content ?? {};
  const turnBased = isTurnBased(game.slug, game.type, room.mode);
  const isMyTurn = room.turn_player_id === userId;
  const turnPlayer = players.find((p) => p.profile_id === room.turn_player_id);
  const myAnswer = answers.find((a) => a.profile_id === userId);
  const revealed = room.round_phase === 'revealed';
  const picking = !!cfg.pickTruthOrDare;
  const picked = !picking || hasPicked(room.round_state, room.current_round);
  const pickedKind: DareKind | null = picking && picked ? room.round_state.pick.kind : null;
  const vibe = TRUTH_OR_DARE_VIBES[room.difficulty] ?? TRUTH_OR_DARE_VIBES.easy;
  const canAnswer = picked && !revealed && !myAnswer && (!turnBased || isMyTurn);
  const choices: string[] = cfg.optionsFromContent ? (content.choices ?? []) : (cfg.choices ?? []);

  // The active player controls one shared deadline, preserved across reloads.
  const timerLength = Number(cfg.timerSeconds) || 0;
  const deadline = room.round_state?.challengeDeadline as string | null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline || revealed) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [deadline, revealed]);
  const timeLeft = deadline ? Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000)) : timerLength;
  const running = !!deadline && timeLeft > 0;
  async function controlTimer(action: 'start' | 'reset') {
    setBusy(true);
    setError('');
    try {
      await callRoomApi(room.code, 'timer', { action, fromRound: room.current_round });
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the timer.');
    } finally { setBusy(false); }
  }

  async function submit(choice: string) {
    if (!canAnswer || busy) return;
    setBusy(true);
    setError('');
    try {
      await callRoomApi(room.code, 'answer', { fromRound: room.current_round, answer: choice });
      refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function pick(kind: DareKind) {
    if (busy || !isMyTurn) return;
    setBusy(true);
    setError('');
    try {
      await callRoomApi(room.code, 'pick', { fromRound: room.current_round, kind });
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

  if (picking && !picked) {
    return (
      <div className="flex flex-col gap-3">
        <div className="pill mx-auto">{isMyTurn ? '🎯 Your turn!' : `${turnPlayer?.display_name ?? '…'}'s turn`}</div>
        <section className="glass flex flex-col items-center gap-4 p-6 text-center sm:p-8" aria-labelledby="pick-title">
          <span className="pill">{vibe.short}</span>
          {vibe.adults && <p className="text-sm text-white/65">18+ · Agree on boundaries. Only involve willing adults; you can always skip.</p>}
          <h2 id="pick-title" className="text-2xl font-black tracking-tight">{isMyTurn ? 'Truth or dare?' : `${turnPlayer?.display_name ?? 'The other player'} is choosing…`}</h2>
          <p className="text-sm text-white/65">Truths earn 1 point. Dares are braver and earn 2.</p>
          {isMyTurn && <div className="grid w-full max-w-md grid-cols-2 gap-3">
            <button className="option-btn !min-h-28 text-center" disabled={busy} onClick={() => pick('truth')}><span aria-hidden="true" className="block text-4xl">😇</span><strong className="mt-2 block text-lg">Truth</strong><span className="text-xs text-white/60">+1 point</span></button>
            <button className="option-btn !min-h-28 border-pink-400/50 text-center" disabled={busy} onClick={() => pick('dare')}><span aria-hidden="true" className="block text-4xl">😈</span><strong className="mt-2 block text-lg">Dare</strong><span className="text-xs text-white/60">+2 points</span></button>
          </div>}
        </section>
        {error && <p role="alert" className="text-sm font-bold text-red-300">{error}</p>}
      </div>
    );
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
        {pickedKind ? <div className="flex flex-wrap justify-center gap-2"><span className="pill">{pickedKind === 'dare' ? '😈 Dare' : '😇 Truth'} · +{pickPoints(pickedKind)}</span>{content.heat && <span className="pill">{content.heat}</span>}</div> : content.category && <div className="pill">{content.category}</div>}
        {(cfg.adultsOnly || (picking && content.deck === 'after-dark')) && <p className="text-sm text-white/65">18+ · Agree on boundaries. Only involve willing adults; you can always skip.</p>}
        {picking && room.round_state?.pick?.fallback && <p className="text-sm text-amber-200">That deck ran out, so here is a {pickedKind} instead.</p>}
        <div className="text-2xl font-black leading-snug tracking-tight">{picking ? cardText(content.text) : content.text}</div>
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
            <button className="btn-secondary !py-2.5 text-sm" onClick={() => controlTimer('start')} disabled={busy || running || timeLeft === 0}>
              ▶ Start
            </button>
            <button
              className="btn-secondary !py-2.5 text-sm"
              disabled={busy}
              onClick={() => controlTimer('reset')}
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

      {error && <p role="alert" className="text-sm font-bold text-red-300">{error}</p>}

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
                  {a.points > 0 ? ` (+${a.points} ${a.points === 1 ? 'point' : 'points'})` : ''}
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
