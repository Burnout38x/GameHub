'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { MIXED, sectionById, type Level } from '@/lib/bowl/types';
import { READY_MS, type BowlView } from '@/lib/bowl/view';
import { useLiveRoom, secondsLeft } from './useLiveRoom';
import { useSfx } from './sfx';
import { CountdownRing, LETTERS, MuteButton, Standings, TILE_COLORS } from './parts';
import s from './Live.module.css';

const LEVEL_NAMES: Record<Level, string> = { 1: 'Warm-up', 2: 'Contender', 3: 'Champion' };

interface Props { code: string; initial: BowlView; userId: string; onFinished: () => void }

/** Brain Bowl: a game-show trivia round on every phone. */
export default function BowlPlay({ code, initial, userId, onFinished }: Props) {
  const { view, now, busy, error, send, refresh } = useLiveRoom(code, initial, onFinished);
  const { play, muted, toggle } = useSfx();
  const [pending, setPending] = useState<{ index: number; choice: number } | null>(null);
  const section = view.question ? sectionById(view.question.section) : view.section === 'mixed' ? MIXED : sectionById(view.section);
  const tint = section?.color ?? '#fde68a';
  const live = !!view.question && view.phase === 'question';
  const revealed = view.phase === 'reveal' && view.reveal;
  const mine = view.mine?.choice ?? (pending?.index === view.index ? pending.choice : null);
  const myResult = view.reveal?.results.find(result => result.id === userId);
  const names = new Map(view.standings.map(standing => [standing.id, standing.name]));

  // The question is hidden during the countdown: fetch it the moment it goes live.
  useEffect(() => {
    if (view.question || view.phase !== 'question') return;
    const wait = Math.max(0, view.startedAt - Date.now()) + 40;
    const id = setTimeout(refresh, Math.min(wait, READY_MS + 500));
    return () => clearTimeout(id);
  }, [view.question, view.phase, view.startedAt, view.version, refresh]);

  // Sounds: a ping when a question appears, the verdict at the reveal.
  const heard = useRef('');
  useEffect(() => {
    const key = `${view.index}:${view.phase}:${!!view.question}`;
    if (heard.current === key) return;
    heard.current = key;
    if (view.phase === 'question' && view.question) play('reveal');
    if (view.phase === 'reveal' && view.reveal) play(myResult?.correct ? 'right' : 'wrong');
  }, [view.index, view.phase, view.question, view.reveal, myResult?.correct, play]);

  const answer = async (choice: number) => {
    if (mine !== null || !live || busy) return;
    setPending({ index: view.index, choice });
    play('lock');
    const ok = await send({ type: 'answer', question: view.index, choice });
    if (!ok) setPending(null);
  };

  const left = secondsLeft(view.startedAt, now, Math.ceil(READY_MS / 1000));
  const tileStyle = (index: number) => ({ ['--tile' as string]: TILE_COLORS[index] }) as CSSProperties;
  const rows = view.standings.map(standing => ({
    id: standing.id, name: standing.name, points: standing.points,
    gain: revealed ? view.reveal!.results.find(result => result.id === standing.id)?.points : undefined,
    note: standing.streak >= 3 ? `🔥${standing.streak}` : undefined,
  }));

  return (
    <div className={s.stage} style={{ ['--tint' as string]: tint } as CSSProperties}>
      <div className={s.bar}>
        <span className={s.chip} style={{ background: tint }}>{section?.emoji} {section?.name}</span>
        <span className={s.counter}>Question {view.index + 1} / {view.total}</span>
        <MuteButton muted={muted} onToggle={toggle} />
      </div>

      {!view.question && view.phase === 'question' && (
        <div className={`${s.card} ${s.splash}`} role="status" aria-live="polite">
          <div>
            <p className="eyebrow">{view.index === view.total - 1 ? 'Last one' : 'Get ready'}</p>
            <p className={s.splashNumber}>Q{view.index + 1}</p>
            {view.index === view.total - 1 && <span className={s.double}>⚡ Final question · double points</span>}
            <p className={s.splashCount} aria-hidden="true">{left || 'Go!'}</p>
          </div>
        </div>
      )}

      {view.question && (
        <div className={s.card}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="pill">{LEVEL_NAMES[view.question.level]}{view.question.double ? ' · ⚡ double points' : ''}</span>
            {live ? <CountdownRing deadline={view.deadline} seconds={view.seconds} now={now} color={tint} /> : <span className="text-sm font-black text-white/70">Time!</span>}
          </div>
          <h2 className={s.prompt}>{view.question.prompt}</h2>
        </div>
      )}

      {view.question && (
        <div className={s.answers} role="group" aria-label="Answers">
          {view.question.options.map((option, index) => {
            const isCut = view.cut.includes(index);
            const isMine = mine === index;
            const isRight = revealed && view.reveal!.answer === index;
            const isWrongPick = revealed && isMine && !isRight;
            const total = view.reveal ? Math.max(1, view.reveal.counts.reduce((a, b) => a + b, 0)) : 1;
            const className = [s.answer, isMine && !revealed ? s.picked : '', isCut ? s.cut : '', isRight ? s.right : '', isWrongPick ? s.wrongPick : '',
              (revealed && !isRight && !isWrongPick) || (!revealed && mine !== null && !isMine) ? s.dim : ''].join(' ');
            return (
              <button key={index} type="button" className={className} style={tileStyle(index)} disabled={!live || mine !== null || isCut || busy}
                aria-pressed={isMine} onClick={() => void answer(index)}
                aria-label={`${LETTERS[index]}: ${option}${isCut ? ' (removed by 50/50)' : ''}${isRight ? ' — correct answer' : ''}${isMine ? ' — your answer' : ''}`}>
                {revealed && <span className={s.share} style={{ width: `${(view.reveal!.counts[index] / total) * 100}%` }} aria-hidden="true" />}
                <span className={`${s.letter} relative`} aria-hidden="true">{isRight ? '✓' : isWrongPick ? '✗' : LETTERS[index]}</span>
                <span className={`${s.answerText} relative`}>{option}</span>
                {revealed && view.reveal!.counts[index] > 0 && <span className={s.tally} aria-hidden="true">{view.reveal!.counts[index]}</span>}
              </button>
            );
          })}
        </div>
      )}

      {live && (
        <div className={s.status}>
          <button type="button" className={s.lifeline} disabled={!view.lifeline || mine !== null || busy}
            onClick={() => { play('pick'); void send({ type: 'lifeline', question: view.index }); }}>
            ✂️ 50/50 {view.lifeline ? '' : '(used)'}
          </button>
          <span aria-live="polite">{mine !== null ? '🔒 Locked in. Waiting for the others…' : 'Fastest right answers score most.'}</span>
          <div className={s.dots} aria-label={`${view.answered.length} of ${view.standings.length} answered`}>
            {view.standings.map(standing => (
              <span key={standing.id} className={`${s.dot} ${view.answered.includes(standing.id) ? s.dotDone : ''}`} title={standing.name} aria-hidden="true">{standing.name.slice(0, 1).toUpperCase()}</span>
            ))}
          </div>
        </div>
      )}

      {revealed && (
        <>
          <div className={`${s.banner} ${myResult?.correct ? s.bannerWin : s.bannerLose}`} role="status">
            <span className={s.bannerBig}>{myResult?.correct ? `+${myResult.points.toLocaleString()}` : myResult?.choice === null ? 'Too slow!' : 'Not this time'}</span>
            {myResult?.correct ? `Right in ${((myResult.ms ?? 0) / 1000).toFixed(1)}s` : `The answer was ${LETTERS[view.reveal!.answer]}: ${view.question?.options[view.reveal!.answer]}`}
          </div>
          {view.reveal!.fact && <p className={s.fact}>💡 {view.reveal!.fact}</p>}
          <Standings rows={rows} me={userId} />
          <p className="text-center text-xs text-white/60" aria-live="polite">
            {view.index + 1 < view.total ? `Next question in ${secondsLeft(view.deadline, now, 9)}s…` : 'Final results coming up…'}
            {view.reveal!.results.filter(result => result.correct).length > 0 && ` · Fastest: ${names.get([...view.reveal!.results].filter(result => result.correct).sort((a, b) => (a.ms ?? 0) - (b.ms ?? 0))[0].id) ?? ''}`}
          </p>
        </>
      )}

      {error && <p role="alert" className="text-center text-sm font-bold text-red-300">{error}</p>}
    </div>
  );
}
