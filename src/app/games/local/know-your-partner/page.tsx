'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { shuffle } from '@/lib/game-utils';
import {
  PARTNER_CATEGORIES,
  PARTNER_QUESTIONS,
  type PartnerCategory,
  type PartnerQuestion,
} from '@/lib/local-games/partner-questions';

type Phase = 'setup' | 'question' | 'pass' | 'round' | 'final';

export default function KnowYourPartnerPage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [p1, setP1] = useState('Player 1');
  const [p2, setP2] = useState('Player 2');
  const [count, setCount] = useState('10');
  const [reveal, setReveal] = useState<'end' | 'instant'>('end');
  const [cats, setCats] = useState<PartnerCategory[]>(PARTNER_CATEGORIES.map((c) => c.id));
  const [error, setError] = useState('');

  const [players, setPlayers] = useState<string[]>([]);
  const [questions, setQuestions] = useState<PartnerQuestion[]>([]);
  const [round, setRound] = useState(1);
  const [answerer, setAnswerer] = useState(0);
  const [qPhase, setQPhase] = useState<'answer' | 'guess'>('answer');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [roundScores, setRoundScores] = useState([0, 0]);
  const [waiting, setWaiting] = useState(false);
  const [pickedGuess, setPickedGuess] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const waitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const guesser = 1 - answerer;
  const perRound = Number(count);
  const roundQuestions = questions.slice((round - 1) * perRound, round * perRound);
  const q = roundQuestions[index];

  function toggleCat(id: PartnerCategory) {
    setCats((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  function start() {
    const a = p1.trim();
    const b = p2.trim();
    if (!a || !b) return setError('Enter both partner names.');
    if (a.toLowerCase() === b.toLowerCase()) return setError('Use two different names.');
    if (!cats.length) return setError('Choose at least one category.');
    const pool = PARTNER_QUESTIONS.filter((item) => cats.includes(item.category));
    const n = Number(count);
    if (pool.length < n * 2) {
      return setError(
        `The selected categories contain ${pool.length} questions. Choose more categories or reduce the question count.`
      );
    }
    setError('');
    setPlayers([a, b]);
    setQuestions(shuffle(pool).slice(0, n * 2).map((item) => ({ ...item, options: shuffle(item.options) })));
    setRound(1);
    setAnswerer(0);
    setQPhase('answer');
    setIndex(0);
    setAnswers([]);
    setRoundScores([0, 0]);
    setWaiting(false);
    setPickedGuess(null);
    setFeedback('');
    setPhase('question');
  }

  function nextGuess() {
    setPickedGuess(null);
    setFeedback('');
    setIndex((i) => {
      if (i + 1 < perRound) return i + 1;
      setPhase('round');
      return i;
    });
  }

  function choose(answer: string) {
    if (waiting) return;
    if (qPhase === 'answer') {
      setAnswers((arr) => {
        const copy = [...arr];
        copy[index] = answer;
        return copy;
      });
      if (index + 1 < perRound) setIndex(index + 1);
      else {
        setQPhase('guess');
        setIndex(0);
        setPhase('pass');
      }
      return;
    }
    const correct = answers[index];
    const isCorrect = answer === correct;
    if (isCorrect) setRoundScores((s) => s.map((v, i) => (i === guesser ? v + 1 : v)));
    if (reveal === 'instant') {
      setWaiting(true);
      setPickedGuess(answer);
      setFeedback(isCorrect ? 'Correct guess! 🎉' : `The selected answer was: ${correct}`);
      waitTimeout.current = setTimeout(() => {
        setWaiting(false);
        nextGuess();
      }, 1300);
    } else {
      nextGuess();
    }
  }

  function switchRoles() {
    if (round === 2) return setPhase('final');
    setRound(2);
    setAnswerer(1);
    setQPhase('answer');
    setIndex(0);
    setAnswers([]);
    setPhase('question');
  }

  function quit() {
    if (!confirm('End this game and return to setup?')) return;
    clearTimeout(waitTimeout.current ?? undefined);
    setWaiting(false);
    setPhase('setup');
  }

  if (phase === 'setup') {
    return (
      <div className="mx-auto mt-6 w-full max-w-xl">
        <div className="glass p-7">
          <div className="pill">💞 Pass & Play · exactly 2 players</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Know Your Partner</h1>
          <p className="mt-1 text-sm text-white/60">
            One partner answers privately, then the other guesses those answers — roles switch
            automatically afterwards.
          </p>

          <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="p1">Partner 1</label>
              <input id="p1" className="input" maxLength={18} value={p1} onChange={(e) => setP1(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="p2">Partner 2</label>
              <input id="p2" className="input" maxLength={18} value={p2} onChange={(e) => setP2(e.target.value)} />
            </div>
          </div>

          <label className="field-label" htmlFor="count">Questions per partner</label>
          <select id="count" className="input" value={count} onChange={(e) => setCount(e.target.value)}>
            {['5', '10', '15', '20', '30'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label className="field-label" htmlFor="reveal">Reveal answers</label>
          <select id="reveal" className="input" value={reveal} onChange={(e) => setReveal(e.target.value as 'end' | 'instant')}>
            <option value="end">At the end of each partner&apos;s round</option>
            <option value="instant">After every guess</option>
          </select>

          <span className="field-label">Question categories</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PARTNER_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`option-btn !p-3 text-center text-sm ${cats.includes(c.id) ? 'border-indigo-300/70 bg-indigo-400/[0.15]' : 'opacity-70'}`}
                onClick={() => toggleCat(c.id)}
              >
                {cats.includes(c.id) ? '✓ ' : ''}{c.label}
              </button>
            ))}
          </div>

          <div className="glass-sm mt-4 p-4 text-sm leading-relaxed text-white/70">
            The screen hides private answers before the device is handed to the guessing partner.
          </div>

          {error && <p className="mt-3 text-sm font-bold text-red-300">{error}</p>}
          <div className="mt-6 flex flex-col gap-2">
            <button className="btn" onClick={start}>Start game</button>
            <Link href="/games" className="btn-secondary text-center">Back to games</Link>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'pass') {
    return (
      <div className="mx-auto mt-10 w-full max-w-xl">
        <div className="glass p-8 text-center">
          <div className="text-5xl">🔒</div>
          <div className="pill mx-auto mt-3">Private answers saved</div>
          <h1 className="mt-3 text-2xl font-black tracking-tight">
            Hand the device to {players[guesser]}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            {players[answerer]} has finished answering. {players[guesser]} will now guess all{' '}
            {perRound} answers.
          </p>
          <button className="btn mt-6" onClick={() => setPhase('question')}>
            I&apos;m ready
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'round') {
    const score = roundScores[guesser];
    return (
      <div className="mx-auto mt-10 w-full max-w-xl">
        <div className="glass p-8 text-center">
          <div className="text-5xl">💡</div>
          <div className="pill mx-auto mt-3">Round complete</div>
          <h1 className="mt-3 text-2xl font-black tracking-tight">
            {players[guesser]} guessed {score} of {perRound}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            {round === 1
              ? 'The first half is complete. Now switch roles with a new set of questions.'
              : 'Both partners have completed their turns.'}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="glass-sm px-4 py-4">
              <div className="text-3xl font-black text-indigo-200">{score}</div>
              <div className="mt-1 text-xs text-white/60">Correct guesses</div>
            </div>
            <div className="glass-sm px-4 py-4">
              <div className="text-3xl font-black text-indigo-200">
                {Math.round((score / perRound) * 100)}%
              </div>
              <div className="mt-1 text-xs text-white/60">Accuracy</div>
            </div>
          </div>
          <button className="btn mt-6" onClick={switchRoles}>
            {round === 1 ? 'Switch roles' : 'See final result'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'final') {
    const total = roundScores[0] + roundScores[1];
    const pct = Math.round((total / (perRound * 2)) * 100);
    const tier =
      pct >= 85
        ? { emoji: '🏆', title: 'Almost perfectly in sync', body: 'You predicted each other extremely well.' }
        : pct >= 65
          ? { emoji: '🥰', title: 'Strong connection', body: "You know a lot about each other's preferences and habits." }
          : pct >= 45
            ? { emoji: '😊', title: 'Good start', body: 'You know each other well, with plenty left to discover.' }
            : { emoji: '🌱', title: 'More to discover', body: 'The surprising answers are perfect conversation starters.' };
    return (
      <div className="mx-auto mt-6 w-full max-w-xl">
        <div className="glass p-7 text-center">
          <div className="pill mx-auto">Final match result</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">
            How well do you know each other?
          </h1>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {players.map((p, i) => (
              <div key={p} className="glass-sm px-4 py-4">
                <div className="text-3xl font-black text-indigo-200">
                  {roundScores[i]}/{perRound}
                </div>
                <div className="mt-1 truncate font-bold">{p}</div>
                <div className="text-xs text-white/60">Correct guesses</div>
              </div>
            ))}
          </div>
          <div className="glass-sm mt-4 p-6">
            <div className="text-5xl">{tier.emoji}</div>
            <div className="mt-2 text-xl font-black">{tier.title}</div>
            <p className="mt-1 text-sm leading-relaxed text-white/70">
              {tier.body} Combined accuracy: <strong>{pct}%</strong>.
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <button className="btn" onClick={() => setPhase('setup')}>Play again</button>
            <Link href="/games" className="btn-secondary text-center">All games</Link>
          </div>
        </div>
      </div>
    );
  }

  const actor = qPhase === 'answer' ? players[answerer] : players[guesser];
  return (
    <div className="mx-auto mt-4 flex w-full max-w-xl flex-col gap-4">
      <div>
        <div className="flex justify-between text-[13px] font-bold text-white/55">
          <span>
            {qPhase === 'answer'
              ? `${actor} answers privately`
              : `${actor} guesses ${players[answerer]}'s answer`}
          </span>
          <span>
            {index + 1} of {perRound}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${(index / perRound) * 100}%`, background: 'linear-gradient(90deg,#a5b4fc,#f9a8d4)' }}
          />
        </div>
      </div>

      <div className="glass flex min-h-[140px] flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="pill capitalize">{q.category}</div>
        <div className="text-xl font-black leading-snug tracking-tight sm:text-2xl">{q.text}</div>
      </div>

      <div className="grid gap-2.5">
        {q.options.map((option, oi) => {
          const cls =
            waiting && qPhase === 'guess'
              ? option === answers[index]
                ? 'option-correct'
                : pickedGuess === option
                  ? 'option-wrong'
                  : ''
              : '';
          return (
            <button
              key={option}
              className={`option-btn ${cls}`}
              disabled={waiting}
              onClick={() => choose(option)}
            >
              {String.fromCharCode(65 + oi)}. {option}
            </button>
          );
        })}
      </div>

      {feedback && <div className="glass-sm p-4 text-center text-sm font-bold text-white/80">{feedback}</div>}

      <button className="btn-danger" onClick={quit}>End game</button>
    </div>
  );
}
