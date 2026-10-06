'use client';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import Link from 'next/link';
import { shuffle } from '@/lib/game-utils';
import { sampleQuestions, validateNames } from '@/lib/local-games/logic';
import { REVERSE_CLUES, type ReverseClue } from '@/lib/local-games/reverse-definition-bank';
import { rankPlayers } from '@/lib/local-games/logic';
import PlayersEditor from '@/components/local/PlayersEditor';

type Phase = 'setup' | 'play' | 'result';

export default function ReverseDefinitionPage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [names, setNames] = useState<string[]>(['Player 1', 'Player 2', 'Player 3']);
  const [difficulty, setDifficulty] = useState('mixed');
  const [questionCount, setQuestionCount] = useState('15');
  const [timerLen, setTimerLen] = useState('8');
  const [error, setError] = useState('');

  const [players, setPlayers] = useState<string[]>([]);
  const [scores, setScores] = useState<number[]>([]);
  const [questions, setQuestions] = useState<ReverseClue[]>([]);
  const [index, setIndex] = useState(0);
  const [locked, setLocked] = useState<number[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [opts, setOpts] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(8);
  const [chosen, setChosen] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [status, setStatus] = useState('');
  const nextTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const duration = Number(timerLen);
  const q = questions[index];

  useEffect(() => () => clearTimeout(nextTimeout.current ?? undefined), []);

  function start() {
    const trimmed = names.map((n) => n.trim());
    const err = validateNames(trimmed, 2);
    if (err) return setError(err);
    setError('');
    const pool = REVERSE_CLUES.filter((c) => difficulty === 'mixed' || c.difficulty === difficulty);
    setPlayers(trimmed);
    setScores(trimmed.map(() => 0));
    setQuestions(sampleQuestions(pool, Number(questionCount)));
    setIndex(0);
    resetRound();
    setPhase('play');
  }

  function resetRound() {
    setLocked([]);
    setActive(null);
    setOpts([]);
    setChosen(null);
    setDone(false);
    setStatus('');
  }

  function next() {
    if (index + 1 >= questions.length) {
      setPhase('result');
      return;
    }
    setIndex(index + 1);
    resetRound();
  }

  function buzz(i: number) {
    if (active !== null || locked.includes(i) || done) return;
    setActive(i);
    setOpts(shuffle(q.options));
    setChosen(null);
    setTimeLeft(duration);
  }

  function miss(reason: string) {
    const player = active!;
    const nowLocked = [...locked, player];
    setScores((s) => s.map((v, i) => (i === player ? Math.max(0, v - 10) : v)));
    setActive(null);
    setOpts([]);
    if (nowLocked.length >= players.length) {
      setLocked(nowLocked);
      setDone(true);
      setStatus(`No one solved it. The answer was ${q.answer}.`);
      nextTimeout.current = setTimeout(next, 1500);
    } else {
      setLocked(nowLocked);
      setStatus(`${reason} ${players[player]} is locked out — buzz again!`);
    }
  }

  function answer(option: string) {
    if (done || active === null) return;
    if (option === q.answer) {
      const pts = 100 + timeLeft * 5;
      setScores((s) => s.map((v, i) => (i === active ? v + pts : v)));
      setChosen(option);
      setDone(true);
      setStatus(`Correct! ${players[active]} earns ${pts} points.`);
      nextTimeout.current = setTimeout(next, 1300);
    } else {
      miss('Wrong answer.');
    }
  }

  function quit() {
    if (!confirm('End this game?')) return;
    clearTimeout(nextTimeout.current ?? undefined);
    setPhase('setup');
  }

  // The clock owns ticks; input edits and score updates must not restart it.
  const onTick = useEffectEvent(() => {
    if (timeLeft > 1) setTimeLeft(timeLeft - 1);
    else if (active !== null && !done) {
      setTimeLeft(0);
      miss('Time is up.');
    }
  });
  useEffect(() => {
    if (phase !== 'play' || active === null || done) return;
    const timer = setInterval(() => onTick(), 1000);
    return () => clearInterval(timer);
  }, [phase, active, done]);

  if (phase === 'setup') {
    return (
      <div className="mx-auto mt-6 w-full max-w-xl">
        <div className="glass p-7">
          <div className="pill">🧠 Pass & Play · same device</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Reverse Definition</h1>
          <p className="mt-1 text-sm text-white/60">
            A familiar word described in an unfamiliar way. Buzz first, then pick the right answer
            before your personal timer runs out.
          </p>

          <span className="field-label">Players ({names.length}/6)</span>
          <PlayersEditor names={names} onChange={setNames} />

          <label className="field-label" htmlFor="difficulty">Difficulty</label>
          <select id="difficulty" className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="mixed">🎲 Mixed</option>
            <option value="easy">😌 Easy</option>
            <option value="medium">🙂 Medium</option>
            <option value="hard">🔥 Hard</option>
            <option value="expert">🧠 Expert</option>
          </select>

          <label className="field-label" htmlFor="count">Questions</label>
          <p className="text-sm text-white/60">Longer games reshuffle the selected difficulty after all clues have been played.</p>
          <select id="count" className="input" value={questionCount} onChange={(e) => setQuestionCount(e.target.value)}>
            {['10', '15', '20'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <label className="field-label" htmlFor="timer">Answer timer after buzzing</label>
          <select id="timer" className="input" value={timerLen} onChange={(e) => setTimerLen(e.target.value)}>
            {['5', '8', '12'].map((t) => <option key={t} value={t}>{t} seconds</option>)}
          </select>

          {error && <p role="alert" className="mt-3 text-sm font-bold text-red-300">{error}</p>}
          <div className="mt-6 flex flex-col gap-2">
            <button className="btn" onClick={start}>Start game</button>
            <Link href="/games" className="btn-secondary text-center">Back to games</Link>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    const ranked = rankPlayers(players, scores);
    return (
      <div className="mx-auto mt-6 w-full max-w-xl">
        <div className="glass p-7 text-center">
          <div className="text-5xl">🧠</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Definitions decoded</h1>
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ranked.map((r) => (
              <div key={r.name} className="glass-sm px-4 py-4">
                <div className="text-3xl">{r.rank === 1 ? '🏆' : `#${r.rank}`}
                {r.rank === 1 && ranked.filter((p) => p.rank === 1).length > 1 && <div className="text-sm">Joint winner</div>}</div>
                <div className="mt-1 font-black">{r.name}</div>
                <div className="text-sm text-white/60">{r.score} points</div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <button className="btn" onClick={() => setPhase('setup')}>Play again</button>
            <Link href="/games" className="btn-secondary text-center">All games</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-4 flex w-full max-w-xl flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-[13px] font-bold text-white/55">
            <span>Question {index + 1} of {questions.length}</span>
            <span>{active === null ? '🔔 Buzz now' : `${players[active]} is answering`}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="progress-fill h-full w-full origin-left rounded-full"
              style={{ transform: `scaleX(${(index / questions.length)})`, background: 'linear-gradient(90deg,var(--accent-cool),var(--accent))' }}
            />
          </div>
        </div>
        <div
          className={`grid h-16 w-16 shrink-0 place-items-center rounded-full border-[3px] bg-black/[0.25] text-xl font-black ${
            active !== null && timeLeft <= 3 ? 'border-red-400/80 text-red-300' : 'border-indigo-300/70'
          }`}
        >
          {active === null ? '∞' : Math.max(0, timeLeft)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {players.map((p, i) => (
          <div key={p} className={`glass-sm px-4 py-3 ${active === i ? 'outline outline-2 outline-pink-400/70' : ''}`}>
            <div className="truncate text-xs text-white/60">
              {p}{active === i ? ' 🎤' : ''}{locked.includes(i) ? ' 🔒' : ''}
            </div>
            <div className="mt-1 text-2xl font-black">{scores[i]}</div>
          </div>
        ))}
      </div>

      <div className="glass flex min-h-[140px] flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="pill capitalize">{q.difficulty}</div>
        <div className="text-xl font-black leading-snug tracking-tight sm:text-2xl">{q.clue}</div>
      </div>

      {active === null && !done && (
        <div className="grid grid-cols-2 gap-2">
          {players.map((p, i) => (
            <button
              key={p}
              className="option-btn text-center disabled:opacity-30"
              disabled={locked.includes(i)}
              onClick={() => buzz(i)}
            >
              🔔 {p}
            </button>
          ))}
        </div>
      )}

      {(active !== null || (done && chosen)) && (
        <div className="grid gap-2.5">
          {opts.map((option, oi) => {
            const cls = done ? (option === q.answer ? 'option-correct' : chosen === option ? 'option-wrong' : '') : '';
            return (
              <button key={option} className={`option-btn ${cls}`} disabled={done} onClick={() => answer(option)}>
                {String.fromCharCode(65 + oi)}. {option}
              </button>
            );
          })}
        </div>
      )}

      {status && <div role="status" className="glass-sm p-4 text-center text-sm font-bold text-white/80">{status}</div>}

      <button className="btn-danger" onClick={quit}>End game</button>
    </div>
  );
}
