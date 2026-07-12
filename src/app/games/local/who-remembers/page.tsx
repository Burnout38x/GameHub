'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { shuffle } from '@/lib/game-utils';
import { levenshtein, normalize } from '@/lib/local-games/logic';
import { MEMORY_CATEGORIES, MEMORY_PROMPTS, type MemoryPrompt } from '@/lib/local-games/who-remembers-bank';

type Phase = 'setup' | 'answer' | 'pass' | 'compare' | 'result';

export default function WhoRemembersPage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [p1, setP1] = useState('Partner 1');
  const [p2, setP2] = useState('Partner 2');
  const [count, setCount] = useState('10');
  const [category, setCategory] = useState('mixed');
  const [custom, setCustom] = useState('');
  const [error, setError] = useState('');

  const [players, setPlayers] = useState<string[]>([]);
  const [questions, setQuestions] = useState<MemoryPrompt[]>([]);
  const [index, setIndex] = useState(0);
  const [answerer, setAnswerer] = useState(0);
  const [answers, setAnswers] = useState<string[]>(['', '']);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('');
  const [passText, setPassText] = useState({ title: '', text: '' });
  const [autoMatch, setAutoMatch] = useState(false);
  const [matches, setMatches] = useState(0);
  const [disagreements, setDisagreements] = useState(0);
  const autoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const total = questions.length;
  const q = questions[index];

  useEffect(() => {
    if (phase === 'answer') inputRef.current?.focus();
  }, [phase, index, answerer]);

  useEffect(() => () => clearTimeout(autoTimeout.current ?? undefined), []);

  function start() {
    const a = p1.trim();
    const b = p2.trim();
    if (!a || !b || a.toLowerCase() === b.toLowerCase()) {
      return setError('Enter two different partner names.');
    }
    const n = Number(count);
    let pool = MEMORY_PROMPTS.filter((item) => category === 'mixed' || item.category === category);
    const customQs = custom
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean)
      .map((text) => ({ category: 'custom', text }));
    pool = shuffle([...pool, ...customQs]);
    if (pool.length < n) {
      return setError('Not enough questions in that category. Choose fewer questions or add custom ones.');
    }
    setError('');
    setPlayers([a, b]);
    setQuestions(pool.slice(0, n));
    setIndex(0);
    setAnswerer(0);
    setAnswers(['', '']);
    setInput('');
    setStatus('');
    setMatches(0);
    setDisagreements(0);
    setPhase('answer');
  }

  function save() {
    const a = input.trim();
    if (!a) return setStatus('Enter an answer before continuing.');
    setStatus('');
    if (answerer === 0) {
      setAnswers([a, '']);
      setAnswerer(1);
      setInput('');
      setPassText({
        title: `Hand the device to ${players[1]}`,
        text: `${players[0]}'s answer is hidden. ${players[1]} should answer the same question privately.`,
      });
      setPhase('pass');
    } else {
      const both = [answers[0], a];
      setAnswers(both);
      setInput('');
      const na = normalize(both[0]);
      const nb = normalize(both[1]);
      const max = Math.max(na.length, nb.length, 1);
      const similarity = 1 - levenshtein(na, nb) / max;
      const auto = na === nb || similarity >= 0.84;
      setAutoMatch(auto);
      setPhase('compare');
      if (auto) autoTimeout.current = setTimeout(() => record(true), 1500);
    }
  }

  function record(match: boolean) {
    clearTimeout(autoTimeout.current ?? undefined);
    if (match) setMatches((m) => m + 1);
    else setDisagreements((d) => d + 1);
    const next = index + 1;
    setAnswers(['', '']);
    setAnswerer(0);
    if (next >= total) {
      setPhase('result');
      return;
    }
    setIndex(next);
    setPassText({
      title: `Next question: ${players[0]} goes first`,
      text: 'Pass the device back before continuing.',
    });
    setPhase('pass');
  }

  function quit() {
    if (!confirm('End this game?')) return;
    clearTimeout(autoTimeout.current ?? undefined);
    setPhase('setup');
  }

  if (phase === 'setup') {
    return (
      <div className="mx-auto mt-6 w-full max-w-xl">
        <div className="glass p-7">
          <div className="pill">📸 Pass & Play · exactly 2 players</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Who Remembers It Better?</h1>
          <p className="mt-1 text-sm text-white/60">
            Both partners answer the same question privately. Matching answers score — different
            answers become a quick discussion round.
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

          <label className="field-label" htmlFor="count">Questions</label>
          <select id="count" className="input" value={count} onChange={(e) => setCount(e.target.value)}>
            {['5', '10', '15', '20'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <label className="field-label" htmlFor="category">Category</label>
          <select id="category" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {MEMORY_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>

          <label className="field-label" htmlFor="custom">Optional custom questions, one per line</label>
          <textarea
            id="custom"
            className="input min-h-[96px]"
            placeholder={'What was the first concert we attended together?\nWho chose our favourite restaurant?'}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />

          <div className="glass-sm mt-4 p-4 text-sm leading-relaxed text-white/70">
            Close spelling differences are automatically treated as matches. When answers differ,
            you decide together whether they mean the same thing.
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
          <div className="pill mx-auto mt-3">Answer hidden</div>
          <h1 className="mt-3 text-2xl font-black tracking-tight">{passText.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">{passText.text}</p>
          <button className="btn mt-6" onClick={() => setPhase('answer')}>I&apos;m ready</button>
        </div>
      </div>
    );
  }

  if (phase === 'compare') {
    return (
      <div className="mx-auto mt-10 w-full max-w-xl">
        <div className="glass p-8 text-center">
          <div className="text-5xl">🧠</div>
          <div className="pill mx-auto mt-3">Compare the memory</div>
          <h1 className="mt-3 text-xl font-black tracking-tight">{q?.text}</h1>
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {players.map((p, i) => (
              <div key={p} className="glass-sm px-4 py-4 text-left">
                <div className="text-xs font-bold text-white/60">{p}</div>
                <div className="mt-1 font-bold">{answers[i]}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm font-bold text-white/75">
            {autoMatch
              ? 'Automatic match — both partners earn a point. ✅'
              : 'The answers differ. Decide whether they mean the same thing.'}
          </p>
          {!autoMatch && (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button className="option-btn !border-emerald-400/50 text-center" onClick={() => record(true)}>
                🤝 These mean the same thing
              </button>
              <button className="option-btn !border-red-400/50 text-center" onClick={() => record(false)}>
                💬 Different memories
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    const pct = Math.round((matches / Math.max(total, 1)) * 100);
    const tier =
      pct >= 85
        ? { emoji: '🏆', title: 'Memory champions', body: 'Your shared memories matched almost perfectly.' }
        : pct >= 60
          ? { emoji: '🥰', title: 'Strong shared history', body: 'You remembered most moments in very similar ways.' }
          : pct >= 35
            ? { emoji: '😊', title: 'Some great matches', body: 'You agreed on several memories and uncovered some different perspectives.' }
            : { emoji: '💬', title: 'Plenty to discuss', body: 'The differences are ready-made conversation starters.' };
    return (
      <div className="mx-auto mt-6 w-full max-w-xl">
        <div className="glass p-7 text-center">
          <div className="pill mx-auto">Final memory score</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">
            How closely did your memories match?
          </h1>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="glass-sm px-4 py-4">
              <div className="text-3xl font-black text-indigo-200">{matches}/{total}</div>
              <div className="mt-1 text-xs text-white/60">Matching memories</div>
            </div>
            <div className="glass-sm px-4 py-4">
              <div className="text-3xl font-black text-indigo-200">{disagreements}</div>
              <div className="mt-1 text-xs text-white/60">Discussion rounds</div>
            </div>
          </div>
          <div className="glass-sm mt-4 p-6">
            <div className="text-5xl">{tier.emoji}</div>
            <div className="mt-2 text-xl font-black">{tier.title}</div>
            <p className="mt-1 text-sm leading-relaxed text-white/70">
              {tier.body} Match rate: <strong>{pct}%</strong>.
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

  return (
    <div className="mx-auto mt-4 flex w-full max-w-xl flex-col gap-4">
      <div>
        <div className="flex justify-between text-[13px] font-bold text-white/55">
          <span>Question {index + 1} of {total}</span>
          <span>🔒 {players[answerer]} answers privately</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${(index / Math.max(total, 1)) * 100}%`, background: 'linear-gradient(90deg,#a5b4fc,#f9a8d4)' }}
          />
        </div>
      </div>

      <div className="glass flex flex-col items-center gap-4 p-6 text-center">
        <div className="pill capitalize">{q?.category}</div>
        <div className="text-xl font-black leading-snug tracking-tight sm:text-2xl">{q?.text}</div>
        <textarea
          ref={inputRef}
          className="input min-h-[96px] max-w-lg"
          maxLength={180}
          placeholder="Type your private answer"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn w-full max-w-lg !py-3" onClick={save}>Save private answer</button>
        {status && <div className="text-sm font-bold text-white/80">{status}</div>}
      </div>

      <button className="btn-danger" onClick={quit}>End game</button>
    </div>
  );
}
