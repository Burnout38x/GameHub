'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { MIXED_TOPIC, topicById } from '@/lib/dilemma/types';
import type { DilemmaView } from '@/lib/dilemma/view';
import { useLiveRoom } from './useLiveRoom';
import { useSfx } from './sfx';
import { CountdownRing, LETTERS, MuteButton, Standings, TILE_COLORS } from './parts';
import s from './Live.module.css';

interface Props { code: string; initial: DilemmaView; userId: string; onFinished: () => void }

/** What Would You Do?: choose secretly, read the room, then argue about the reveal. */
export default function DilemmaPlay({ code, initial, userId, onFinished }: Props) {
  const { view, now, busy, error, send } = useLiveRoom(code, initial, onFinished);
  const { play, muted, toggle } = useSfx();
  const [draft, setDraft] = useState<{ round: number; choice: number | null; guess: number | null }>({ round: initial.index, choice: null, guess: null });
  const topic = topicById(view.card.topic) ?? MIXED_TOPIC;
  const room = view.mode === 'room';
  const seat = view.seat;
  const inSeat = seat === userId;
  const names = new Map(view.standings.map(standing => [standing.id, standing.name]));
  const seatName = seat ? names.get(seat) ?? 'them' : '';
  const needsChoice = room || inSeat;
  const needsGuess = room || !inSeat;
  const current = draft.round === view.index ? draft : { round: view.index, choice: null, guess: null };
  const locked = !!view.mine;
  const choosing = view.phase === 'choose' && !view.ended;
  const ready = (!needsChoice || current.choice !== null) && (!needsGuess || current.guess !== null);
  const reveal = view.phase === 'reveal' ? view.reveal : null;
  const myPick = reveal?.picks.find(entry => entry.id === userId);
  const iAmReady = view.ready.includes(userId);

  const heard = useRef('');
  useEffect(() => {
    const key = `${view.index}:${view.phase}`;
    if (heard.current === key) return;
    heard.current = key;
    if (view.phase === 'reveal') play((myPick?.points ?? 0) > 0 ? 'right' : 'reveal');
  }, [view.index, view.phase, myPick?.points, play]);

  const set = (patch: Partial<typeof current>) => { play('flip'); setDraft({ ...current, ...patch }); };
  const lock = async () => {
    if (!ready || busy) return;
    play('lock');
    await send({ type: 'pick', round: view.index, ...(needsChoice ? { choice: current.choice } : {}), ...(needsGuess ? { guess: current.guess } : {}) });
  };

  const question = room ? 'What would you do?' : inSeat ? '🔥 You’re in the hot seat. What would you really do?' : `What would ${seatName} do?`;
  const optionButtons = (field: 'choice' | 'guess', label: string) => (
    <fieldset className="mt-1">
      <legend className="mb-2 text-sm font-black">{label}</legend>
      <div className={s.answers}>
        {view.card.options.map((option, index) => {
          const selected = current[field] === index;
          return (
            <button key={index} type="button" className={`${s.answer} ${selected ? s.picked : ''} ${current[field] !== null && !selected ? s.dim : ''}`}
              style={{ ['--tile' as string]: TILE_COLORS[index] } as CSSProperties} aria-pressed={selected} disabled={locked || !choosing}
              onClick={() => set({ [field]: index })}>
              <span className={s.letter} aria-hidden="true">{LETTERS[index]}</span>
              <span className={s.answerText}>{option}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );

  const total = reveal ? Math.max(1, reveal.counts.reduce((a, b) => a + b, 0)) : 1;
  const seatChoice = reveal && seat ? reveal.picks.find(entry => entry.id === seat)?.choice ?? null : null;
  const rows = view.standings.map(standing => ({ id: standing.id, name: standing.name, points: standing.points, gain: reveal?.picks.find(entry => entry.id === standing.id)?.points || undefined }));

  return (
    <div className={s.stage} style={{ ['--tint' as string]: topic.color } as CSSProperties}>
      <div className={s.bar}>
        <span className={s.chip} style={{ background: topic.color }}>{topic.emoji} {topic.name}</span>
        <span className={s.counter}>{room ? '👀 Read the Room' : '🔥 Hot Seat'} · {view.index + 1} / {view.total}</span>
        <MuteButton muted={muted} onToggle={toggle} />
      </div>

      <div className={s.card}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="eyebrow">{choosing ? question : 'The verdict'}</p>
          {choosing && <CountdownRing deadline={view.deadline} seconds={view.seconds} now={now} color={topic.color} />}
        </div>
        <h2 className={s.prompt}>{view.card.scenario}</h2>
        {!room && seat && <p className={s.sub}>{inSeat ? 'Everyone else is guessing your answer. Be honest!' : `${seatName} is in the hot seat.`}</p>}
      </div>

      {choosing && !locked && <>
        {needsChoice && optionButtons('choice', room ? '1. What would YOU do?' : 'Your honest answer')}
        {needsGuess && optionButtons('guess', room ? '2. What will most people pick?' : `Your guess for ${seatName}`)}
        <button type="button" className="btn" disabled={!ready || busy} onClick={() => void lock()}>{busy ? 'Locking in…' : '🔒 Lock it in'}</button>
      </>}

      {choosing && locked && (
        <div className={`${s.card} text-center`} role="status">
          <p className="text-lg font-black">🔒 Locked in</p>
          <p className={s.sub}>Waiting for {view.standings.filter(standing => !view.answered.includes(standing.id)).map(standing => standing.name).join(', ') || 'the reveal'}…</p>
          <div className={`${s.dots} mt-3 justify-center`} aria-hidden="true">
            {view.standings.map(standing => <span key={standing.id} className={`${s.dot} ${view.answered.includes(standing.id) ? s.dotDone : ''}`} title={standing.name}>{standing.name.slice(0, 1).toUpperCase()}</span>)}
          </div>
        </div>
      )}

      {reveal && <>
        <div className={`${s.banner} ${(myPick?.points ?? 0) > 0 ? s.bannerWin : s.bannerLose}`} role="status">
          <span className={s.bannerBig}>{(myPick?.points ?? 0) > 0 ? `+${myPick!.points}` : room ? 'Missed the room' : inSeat ? 'Nobody read you' : 'Wrong read'}</span>
          {room ? (myPick?.points ? 'You read the room perfectly.' : 'The room surprised you.') : inSeat ? `${(myPick?.points ?? 0) / 50} friend(s) read you right.` : seatChoice !== null ? `${seatName} would: ${view.card.options[seatChoice]}` : `${seatName} didn’t answer.`}
        </div>
        <div className={s.answers} role="list" aria-label="How everyone chose">
          {view.card.options.map((option, index) => {
            const choosers = reveal.picks.filter(entry => entry.choice === index).map(entry => names.get(entry.id) ?? '?');
            const top = reveal.top.includes(index) || seatChoice === index;
            return (
              <div key={index} role="listitem" className={`${s.answer} ${top ? s.right : ''}`} style={{ ['--tile' as string]: TILE_COLORS[index] } as CSSProperties}>
                <span className={s.share} style={{ width: `${(reveal.counts[index] / total) * 100}%` }} aria-hidden="true" />
                <span className={`${s.letter} relative`} aria-hidden="true">{top ? '👑' : LETTERS[index]}</span>
                <span className={`${s.answerText} relative`}>{option}<span className="block text-xs font-bold">{choosers.length ? choosers.join(', ') : 'Nobody'}</span></span>
                <span className={s.tally}>{Math.round((reveal.counts[index] / total) * 100)}%</span>
              </div>
            );
          })}
        </div>
        <Standings rows={rows} me={userId} />
        <button type="button" className="btn" disabled={iAmReady || busy} onClick={() => { play('pick'); void send({ type: 'next', round: view.index }); }}>
          {iAmReady ? `Waiting for others (${view.ready.length}/${view.standings.length})` : view.index + 1 < view.total ? 'Next situation →' : 'See final results →'}
        </button>
        <p className="text-center text-xs text-white/60">Argue it out first. Moves on when everyone taps next.</p>
      </>}

      {error && <p role="alert" className="text-center text-sm font-bold text-red-300">{error}</p>}
    </div>
  );
}
