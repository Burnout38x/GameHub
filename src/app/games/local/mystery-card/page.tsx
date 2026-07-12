'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { shuffle } from '@/lib/game-utils';
import { MYSTERY_QUESTIONS, type MysteryQuestion } from '@/lib/local-games/mystery-questions';

type Phase = 'setup' | 'play' | 'result';
type Mode = 'race' | 'turn';

function pickQuestions(pool: MysteryQuestion[], count: number): MysteryQuestion[] {
  const out: MysteryQuestion[] = [];
  let bag = shuffle(pool);
  while (out.length < count) {
    if (!bag.length) bag = shuffle(pool);
    const next = bag.pop()!;
    if (out.length && out[out.length - 1].clue === next.clue) continue;
    out.push({ ...next, options: shuffle(next.options) });
  }
  return out;
}

export default function MysteryCardPage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [mode, setMode] = useState<Mode>('race');
  const [names, setNames] = useState<string[]>(['Player 1', 'Player 2']);
  const [difficulty, setDifficulty] = useState('mixed');
  const [category, setCategory] = useState('all');
  const [rounds, setRounds] = useState('10');
  const [timerLen, setTimerLen] = useState('15');
  const [error, setError] = useState('');

  const [players, setPlayers] = useState<string[]>([]);
  const [scores, setScores] = useState<number[]>([]);
  const [questions, setQuestions] = useState<MysteryQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [locked, setLocked] = useState<number[]>([]);
  const [roundOver, setRoundOver] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const nextTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = questions[current];
  const duration = Number(timerLen);
  const turnPlayer = players.length ? current % players.length : 0;

  useEffect(() => {
    if (phase !== 'play' || roundOver) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [phase, current, roundOver]);

  useEffect(() => {
    if (phase === 'play' && !roundOver && timeLeft <= 0 && q) {
      setRoundOver(true);
      setStatus(`Time is up. The answer was ${q.answer}.`);
      nextTimeout.current = setTimeout(advance, 1800);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, roundOver]);

  useEffect(() => () => clearTimeout(nextTimeout.current ?? undefined), []);

  function switchMode(m: Mode) {
    setMode(m);
    setRounds(m === 'race' ? '10' : '3');
  }

  function start() {
    const trimmed = names.map((n) => n.trim()).filter(Boolean);
    if (trimmed.length < 2) return setError('Add at least two player names.');
    if (new Set(trimmed.map((n) => n.toLowerCase())).size !== trimmed.length)
      return setError('Each player needs a different name.');
    setError('');
    let pool = MYSTERY_QUESTIONS.filter(
      (item) =>
        (difficulty === 'mixed' || item.difficulty === difficulty) &&
        (category === 'all' || item.category === category)
    );
    if (!pool.length) pool = MYSTERY_QUESTIONS;
    const count = Number(rounds) * (mode === 'turn' ? trimmed.length : 1);
    setPlayers(trimmed);
    setScores(trimmed.map(() => 0));
    setQuestions(pickQuestions(pool, count));
    setCurrent(0);
    setTimeLeft(Number(timerLen));
    setLocked([]);
    setRoundOver(false);
    setPicked(null);
    setStatus('');
    setPhase('play');
  }

  function advance() {
    setCurrent((c) => {
      if (c + 1 >= questions.length) {
        setPhase('result');
        return c;
      }
      setTimeLeft(duration);
      setLocked([]);
      setRoundOver(false);
      setPicked(null);
      setStatus('');
      return c + 1;
    });
  }

  function submitRace(playerIndex: number, answer: string) {
    if (roundOver || locked.includes(playerIndex)) return;
    if (answer === q.answer) {
      const bonus = Math.max(0, timeLeft * 2);
      setScores((s) => s.map((v, i) => (i === playerIndex ? v + 100 + bonus : v)));
      setStatus(`${players[playerIndex]} wins the round! +${100 + bonus} points`);
      setRoundOver(true);
      nextTimeout.current = setTimeout(advance, 1500);
    } else {
      const nowLocked = [...locked, playerIndex];
      setLocked(nowLocked);
      setScores((s) => s.map((v, i) => (i === playerIndex ? Math.max(0, v - 10) : v)));
      if (nowLocked.length === players.length) {
        setStatus(`Everyone missed it. The answer was ${q.answer}.`);
        setRoundOver(true);
        nextTimeout.current = setTimeout(advance, 1800);
      } else {
        setStatus(`${players[playerIndex]} is locked out for this round.`);
      }
    }
  }

  function submitTurn(answer: string) {
    if (roundOver) return;
    setPicked(answer);
    setRoundOver(true);
    if (answer === q.answer) {
      const bonus = Math.max(0, timeLeft * 2);
      setScores((s) => s.map((v, i) => (i === turnPlayer ? v + 100 + bonus : v)));
      setStatus(`Correct! +${100 + bonus} points`);
    } else {
      setStatus(`Not quite. The answer was ${q.answer}.`);
    }
    nextTimeout.current = setTimeout(advance, 1500);
  }

  function quit() {
    if (!confirm('End this game and return to setup?')) return;
    clearTimeout(nextTimeout.current ?? undefined);
    setPhase('setup');
  }

  if (phase === 'setup') {
    return (
      <div className="mx-auto mt-6 w-full max-w-xl">
        <div className="glass p-7">
          <div className="pill">🕵️ Pass & Play · same device</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Mystery Card</h1>
          <p className="mt-1 text-sm text-white/60">
            A hidden card is described — race to identify it before the timer runs out.
          </p>

          <span className="field-label">Game mode</span>
          <div className="grid grid-cols-2 gap-2">
            {(['race', 'turn'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={`option-btn text-center ${mode === m ? 'border-indigo-300/70 bg-indigo-400/[0.15]' : ''}`}
                onClick={() => switchMode(m)}
              >
                {m === 'race' ? '⚡ Everyone at once' : '🔄 Player by player'}
              </button>
            ))}
          </div>

          <span className="field-label">Players ({names.length}/6)</span>
          <div className="flex flex-col gap-2">
            {names.map((n, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input"
                  maxLength={18}
                  value={n}
                  placeholder={`Player ${i + 1}`}
                  onChange={(e) => setNames(names.map((v, j) => (j === i ? e.target.value : v)))}
                />
                {names.length > 2 && (
                  <button
                    type="button"
                    className="btn-danger !w-auto px-4"
                    onClick={() => setNames(names.filter((_, j) => j !== i))}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {names.length < 6 && (
            <button type="button" className="btn-secondary mt-2 !py-3" onClick={() => setNames([...names, ''])}>
              + Add player
            </button>
          )}

          <label className="field-label" htmlFor="difficulty">Difficulty</label>
          <select id="difficulty" className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="mixed">🎲 Mixed</option>
            <option value="easy">😌 Easy</option>
            <option value="medium">🙂 Medium</option>
            <option value="hard">🔥 Hard</option>
            <option value="expert">🧠 Expert</option>
          </select>

          <label className="field-label" htmlFor="category">Card type</label>
          <select id="category" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">Living and non-living</option>
            <option value="living">Living only</option>
            <option value="nonliving">Non-living only</option>
          </select>

          <label className="field-label" htmlFor="rounds">
            {mode === 'race' ? 'Number of rounds' : 'Questions per player'}
          </label>
          <select id="rounds" className="input" value={rounds} onChange={(e) => setRounds(e.target.value)}>
            {(mode === 'race' ? ['5', '10', '15', '20'] : ['2', '3', '5', '7']).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <label className="field-label" htmlFor="timer">Timer per question</label>
          <select id="timer" className="input" value={timerLen} onChange={(e) => setTimerLen(e.target.value)}>
            {['10', '15', '20', '30'].map((t) => (
              <option key={t} value={t}>{t} seconds</option>
            ))}
          </select>

          {mode === 'race' && (
            <div className="glass-sm mt-4 p-4 text-sm leading-relaxed text-white/70">
              <strong>Everyone at once:</strong> each answer shows a button for every player — tap your
              name under the answer you choose. A wrong answer locks you out for the round; the first
              correct answer wins.
            </div>
          )}

          {error && <p className="mt-3 text-sm font-bold text-red-300">{error}</p>}
          <div className="mt-6 flex flex-col gap-2">
            <button className="btn" onClick={start}>Start game</button>
            <Link href="/games" className="btn-secondary text-center">Back to games</Link>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    const ranked = players
      .map((name, i) => ({ name, score: scores[i] }))
      .sort((a, b) => b.score - a.score);
    return (
      <div className="mx-auto mt-6 w-full max-w-xl">
        <div className="glass p-7 text-center">
          <div className="text-5xl">🎉</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Game complete</h1>
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ranked.map((r, i) => (
              <div key={r.name} className="glass-sm px-4 py-4">
                <div className="text-3xl">{i === 0 ? '🏆' : `#${i + 1}`}</div>
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
            <span>
              {mode === 'race'
                ? `Round ${current + 1} of ${questions.length}`
                : `Question ${current + 1} of ${questions.length}`}
            </span>
            <span>{mode === 'race' ? '⚡ Everyone at once' : '🔄 Player by player'}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(current / questions.length) * 100}%`, background: 'linear-gradient(90deg,#a5b4fc,#f9a8d4)' }}
            />
          </div>
        </div>
        <div
          className={`grid h-16 w-16 shrink-0 place-items-center rounded-full border-[3px] bg-black/[0.25] text-xl font-black ${
            timeLeft <= 5 ? 'border-red-400/80 text-red-300' : 'border-indigo-300/70'
          }`}
        >
          {Math.max(0, timeLeft)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {players.map((p, i) => (
          <div
            key={p}
            className={`glass-sm px-4 py-3 ${mode === 'turn' && i === turnPlayer ? 'outline outline-2 outline-pink-400/70' : ''}`}
          >
            <div className="truncate text-xs text-white/60">
              {p}
              {mode === 'turn' && i === turnPlayer ? ' 🎯' : ''}
              {locked.includes(i) ? ' 🔒' : ''}
            </div>
            <div className="mt-1 text-2xl font-black">{scores[i]}</div>
          </div>
        ))}
      </div>

      <div className="glass flex min-h-[140px] flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="pill">
          {q.category === 'living' ? '🌱 Living' : '🧱 Non-living'} · {q.difficulty}
        </div>
        {mode === 'turn' && <div className="pill">🎯 {players[turnPlayer]}&apos;s turn</div>}
        <div className="text-xl font-black leading-snug tracking-tight sm:text-2xl">{q.clue}</div>
      </div>

      {mode === 'race' ? (
        <div className="grid gap-2.5">
          {q.options.map((option, oi) => (
            <div
              key={option}
              className={`glass-sm p-4 ${roundOver && option === q.answer ? '!border-emerald-400/75 bg-emerald-400/[0.12]' : ''}`}
            >
              <div className="font-bold">
                {String.fromCharCode(65 + oi)}. {option}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {players.map((p, pi) => (
                  <button
                    key={p}
                    className="rounded-xl border border-white/[0.14] bg-white/10 px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-30"
                    disabled={roundOver || locked.includes(pi)}
                    onClick={() => submitRace(pi, option)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-2.5">
          {q.options.map((option, oi) => {
            const cls = roundOver
              ? option === q.answer
                ? 'option-correct'
                : picked === option
                  ? 'option-wrong'
                  : ''
              : '';
            return (
              <button
                key={option}
                className={`option-btn ${cls}`}
                disabled={roundOver}
                onClick={() => submitTurn(option)}
              >
                {String.fromCharCode(65 + oi)}. {option}
              </button>
            );
          })}
        </div>
      )}

      {status && <div className="glass-sm p-4 text-center text-sm font-bold text-white/80">{status}</div>}

      <button className="btn-danger" onClick={quit}>End game</button>
    </div>
  );
}
