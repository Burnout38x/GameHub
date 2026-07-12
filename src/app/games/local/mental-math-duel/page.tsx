'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { makeProblem, type MathProblem } from '@/lib/local-games/math-gen';

type Phase = 'setup' | 'play' | 'result';

export default function MentalMathDuelPage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [p1, setP1] = useState('Player 1');
  const [p2, setP2] = useState('Player 2');
  const [difficulty, setDifficulty] = useState('mixed');
  const [roundCount, setRoundCount] = useState('15');
  const [timerLen, setTimerLen] = useState('15');
  const [error, setError] = useState('');

  const [players, setPlayers] = useState<string[]>([]);
  const [scores, setScores] = useState<number[]>([0, 0]);
  const [round, setRound] = useState(0);
  const [problem, setProblem] = useState<MathProblem | null>(null);
  const [locked, setLocked] = useState([false, false]);
  const [picked, setPicked] = useState<(number | null)[]>([null, null]);
  const [done, setDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [status, setStatus] = useState('');
  const doneRef = useRef(false);
  const nextTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const duration = Number(timerLen);
  const rounds = Number(roundCount);

  useEffect(() => {
    if (phase !== 'play' || done) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [phase, round, done]);

  useEffect(() => {
    if (phase === 'play' && !done && timeLeft <= 0 && problem) {
      finishRound(`Time is up. The answer was ${problem.answer}.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, done]);

  useEffect(
    () => () => {
      clearTimeout(nextTimeout.current ?? undefined);
      lockTimeouts.current.forEach(clearTimeout);
    },
    []
  );

  function markDone(value: boolean) {
    doneRef.current = value;
    setDone(value);
  }

  function start() {
    const a = p1.trim();
    const b = p2.trim();
    if (!a || !b || a.toLowerCase() === b.toLowerCase()) {
      return setError('Enter two different player names.');
    }
    setError('');
    setPlayers([a, b]);
    setScores([0, 0]);
    beginRound(0);
    setPhase('play');
  }

  function beginRound(r: number) {
    if (r >= rounds) {
      setPhase('result');
      return;
    }
    setRound(r);
    setProblem(makeProblem(difficulty));
    setLocked([false, false]);
    setPicked([null, null]);
    markDone(false);
    setStatus('');
    setTimeLeft(duration);
  }

  function finishRound(message: string) {
    markDone(true);
    setStatus(message);
    nextTimeout.current = setTimeout(() => beginRound(round + 1), 1200);
  }

  function answer(player: number, value: number) {
    if (done || locked[player] || !problem) return;
    if (value === problem.answer) {
      markDone(true);
      const pts = 100 + timeLeft * 5;
      setScores((s) => s.map((v, i) => (i === player ? v + pts : v)));
      setPicked((p) => p.map((v, i) => (i === player ? value : v)));
      setStatus(`${players[player]} wins the round! +${pts} points`);
      nextTimeout.current = setTimeout(() => beginRound(round + 1), 1100);
    } else {
      setScores((s) => s.map((v, i) => (i === player ? Math.max(0, v - 10) : v)));
      setLocked((l) => l.map((v, i) => (i === player ? true : v)));
      setPicked((p) => p.map((v, i) => (i === player ? value : v)));
      lockTimeouts.current.push(
        setTimeout(() => {
          if (!doneRef.current) {
            setLocked((l) => l.map((v, i) => (i === player ? false : v)));
            setPicked((p) => p.map((v, i) => (i === player ? null : v)));
          }
        }, 3000)
      );
    }
  }

  function quit() {
    if (!confirm('End this duel?')) return;
    clearTimeout(nextTimeout.current ?? undefined);
    setPhase('setup');
  }

  if (phase === 'setup') {
    return (
      <div className="mx-auto mt-6 w-full max-w-xl">
        <div className="glass p-7">
          <div className="pill">⚡ Pass & Play · exactly 2 players</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Mental Math Duel</h1>
          <p className="mt-1 text-sm text-white/60">
            Both players see the same puzzle — first correct tap scores. A wrong answer locks you
            out for three seconds.
          </p>

          <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="p1">Player 1</label>
              <input id="p1" className="input" maxLength={18} value={p1} onChange={(e) => setP1(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="p2">Player 2</label>
              <input id="p2" className="input" maxLength={18} value={p2} onChange={(e) => setP2(e.target.value)} />
            </div>
          </div>

          <label className="field-label" htmlFor="difficulty">Difficulty</label>
          <select id="difficulty" className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="mixed">🎲 Mixed</option>
            <option value="easy">😌 Easy</option>
            <option value="medium">🙂 Medium</option>
            <option value="hard">🔥 Hard</option>
          </select>

          <label className="field-label" htmlFor="rounds">Rounds</label>
          <select id="rounds" className="input" value={roundCount} onChange={(e) => setRoundCount(e.target.value)}>
            {['10', '15', '25'].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          <label className="field-label" htmlFor="timer">Seconds per puzzle</label>
          <select id="timer" className="input" value={timerLen} onChange={(e) => setTimerLen(e.target.value)}>
            {['10', '15', '20'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          {error && <p className="mt-3 text-sm font-bold text-red-300">{error}</p>}
          <div className="mt-6 flex flex-col gap-2">
            <button className="btn" onClick={start}>Start duel</button>
            <Link href="/games" className="btn-secondary text-center">Back to games</Link>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    const winner = scores[0] === scores[1] ? -1 : scores[0] > scores[1] ? 0 : 1;
    return (
      <div className="mx-auto mt-6 w-full max-w-xl">
        <div className="glass p-7 text-center">
          <div className="text-5xl">⚡</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Duel complete</h1>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {players.map((p, i) => (
              <div key={p} className="glass-sm px-4 py-4">
                <div className="text-3xl">{winner === i ? '🏆' : winner === -1 ? '🤝' : '💪'}</div>
                <div className="mt-1 truncate font-black">{p}</div>
                <div className="text-sm text-white/60">{scores[i]} points</div>
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
    <div className="mx-auto mt-4 flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-[13px] font-bold text-white/55">
            <span>Round {round + 1} of {rounds}</span>
            <span>
              {players[0]} {scores[0]} — {scores[1]} {players[1]}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(round / rounds) * 100}%`, background: 'linear-gradient(90deg,#a5b4fc,#f9a8d4)' }}
            />
          </div>
        </div>
        <div
          className={`grid h-16 w-16 shrink-0 place-items-center rounded-full border-[3px] bg-black/[0.25] text-xl font-black ${
            timeLeft <= 4 ? 'border-red-400/80 text-red-300' : 'border-indigo-300/70'
          }`}
        >
          {Math.max(0, timeLeft)}
        </div>
      </div>

      <div className="glass flex min-h-[110px] flex-col items-center justify-center gap-2 p-6 text-center">
        <div className="pill">{problem?.type}</div>
        <div className="text-2xl font-black tracking-tight sm:text-3xl">{problem?.text}</div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[0, 1].map((pi) => (
          <div
            key={pi}
            className={`glass-sm flex flex-col gap-3 p-4 ${locked[pi] && !done ? 'opacity-50' : ''}`}
          >
            <div className="text-center font-black">{players[pi]}</div>
            <div className="grid grid-cols-2 gap-2">
              {problem?.options.map((o) => {
                const mine = picked[pi] === o;
                const cls = mine ? (o === problem.answer ? 'option-correct' : 'option-wrong') : '';
                return (
                  <button
                    key={o}
                    className={`option-btn !p-3 text-center ${cls}`}
                    disabled={done || locked[pi]}
                    onClick={() => answer(pi, o)}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
            {locked[pi] && !done && (
              <div className="text-center text-xs font-bold text-red-300">Locked for 3 seconds</div>
            )}
          </div>
        ))}
      </div>

      {status && <div className="glass-sm p-4 text-center text-sm font-bold text-white/80">{status}</div>}

      <button className="btn-danger" onClick={quit}>End duel</button>
    </div>
  );
}
