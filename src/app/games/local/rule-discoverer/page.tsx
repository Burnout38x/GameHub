'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { shuffle } from '@/lib/game-utils';
import { validateNames } from '@/lib/local-games/logic';
import { RULES, ruleAccepts, type HiddenRule } from '@/lib/local-games/rule-bank';
import PlayersEditor from '@/components/local/PlayersEditor';

type Phase = 'setup' | 'play' | 'guess' | 'result';

interface Evidence {
  value: string;
  accepted: boolean;
  system: boolean;
}

export default function RuleDiscovererPage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [names, setNames] = useState<string[]>(['Player 1', 'Player 2', 'Player 3']);
  const [ruleType, setRuleType] = useState('mixed');
  const [roundCount, setRoundCount] = useState('3');
  const [error, setError] = useState('');

  const [players, setPlayers] = useState<string[]>([]);
  const [scores, setScores] = useState<number[]>([]);
  const [round, setRound] = useState(1);
  const [current, setCurrent] = useState(0);
  const [rule, setRule] = useState<HiddenRule | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [choices, setChoices] = useState<HiddenRule[]>([]);
  const [guessStatus, setGuessStatus] = useState('');
  const usedRef = useRef<Set<string>>(new Set());
  const nextTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rounds = Number(roundCount);

  function pickRule(): HiddenRule {
    const pool = RULES.filter((r) => ruleType === 'mixed' || r.kind === ruleType);
    let available = pool.filter((r) => !usedRef.current.has(r.id));
    if (!available.length) {
      usedRef.current.clear();
      available = pool;
    }
    const chosen = available[Math.floor(Math.random() * available.length)];
    usedRef.current.add(chosen.id);
    return chosen;
  }

  function beginRound() {
    const r = pickRule();
    setRule(r);
    setEvidence([
      ...r.examples.slice(0, 2).map((value) => ({ value, accepted: true, system: true })),
      ...r.rejects.slice(0, 2).map((value) => ({ value, accepted: false, system: true })),
    ]);
    setInput('');
    setStatus('');
    setBusy(false);
  }

  function start() {
    const trimmed = names.map((n) => n.trim()).filter(Boolean);
    const err = validateNames(trimmed, 2);
    if (err) return setError(err);
    setError('');
    usedRef.current.clear();
    setPlayers(trimmed);
    setScores(trimmed.map(() => 0));
    setRound(1);
    setCurrent(0);
    beginRound();
    setPhase('play');
  }

  function testExample(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy || !rule) return;
    const value = input.trim();
    if (!value) return setStatus('Enter an example first.');
    const accepted = ruleAccepts(rule, value);
    setEvidence((ev) => [...ev, { value, accepted, system: false }]);
    setStatus(`${value} is ${accepted ? 'accepted ✅' : 'rejected ❌'}.`);
    setBusy(true);
    nextTimeout.current = setTimeout(() => {
      setCurrent((c) => (c + 1) % players.length);
      setInput('');
      setStatus('');
      setBusy(false);
    }, 900);
  }

  function openGuess() {
    if (busy || !rule) return;
    const same = RULES.filter((r) => r.kind === rule.kind && r.id !== rule.id);
    setChoices(shuffle([rule, ...shuffle(same).slice(0, 3)]));
    setGuessStatus('');
    setPhase('guess');
  }

  function submitGuess(id: string) {
    if (!rule || guessStatus) return;
    if (id === rule.id) {
      setScores((s) => s.map((v, i) => (i === current ? v + 100 : v)));
      setGuessStatus(`Correct! The rule was “${rule.name}”. +100 points`);
      nextTimeout.current = setTimeout(() => {
        if (round < rounds) {
          setRound(round + 1);
          setCurrent((current + 1) % players.length);
          beginRound();
          setPhase('play');
        } else {
          setPhase('result');
        }
      }, 1400);
    } else {
      setScores((s) => s.map((v, i) => (i === current ? Math.max(0, v - 10) : v)));
      setGuessStatus('Wrong rule — you lose 10 points.');
      nextTimeout.current = setTimeout(() => {
        setCurrent((current + 1) % players.length);
        setStatus('');
        setPhase('play');
      }, 1200);
    }
  }

  function quit() {
    if (!confirm('End this game?')) return;
    clearTimeout(nextTimeout.current ?? undefined);
    setPhase('setup');
  }

  if (phase === 'setup') {
    return (
      <div className="mx-auto mt-6 w-full max-w-xl">
        <div className="glass p-7">
          <div className="pill">🧩 Pass & Play · same device</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Rule Discoverer</h1>
          <p className="mt-1 text-sm text-white/60">
            The system secretly picks a word or number rule. Test examples, study the evidence,
            then identify the rule before anyone else.
          </p>

          <span className="field-label">Players ({names.length}/6)</span>
          <PlayersEditor names={names} onChange={setNames} />

          <label className="field-label" htmlFor="type">Rule type</label>
          <select id="type" className="input" value={ruleType} onChange={(e) => setRuleType(e.target.value)}>
            <option value="mixed">🎲 Mixed</option>
            <option value="number">🔢 Numbers</option>
            <option value="word">🔤 Words</option>
          </select>

          <label className="field-label" htmlFor="rounds">Rounds</label>
          <select id="rounds" className="input" value={roundCount} onChange={(e) => setRoundCount(e.target.value)}>
            {['3', '5', '7'].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          <div className="glass-sm mt-4 p-4 text-sm leading-relaxed text-white/70">
            On your turn, either test one example or guess the hidden rule. A wrong rule guess
            costs 10 points and passes the turn.
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

  if (phase === 'guess') {
    return (
      <div className="mx-auto mt-10 w-full max-w-xl">
        <div className="glass p-8 text-center">
          <div className="text-5xl">💡</div>
          <div className="pill mx-auto mt-3">Choose carefully</div>
          <h1 className="mt-3 text-2xl font-black tracking-tight">
            {players[current]}, which rule fits the evidence?
          </h1>
          <div className="mt-5 grid gap-2.5">
            {choices.map((r) => (
              <button
                key={r.id}
                className="option-btn"
                disabled={!!guessStatus}
                onClick={() => submitGuess(r.id)}
              >
                <strong>{r.name}</strong>
                <div className="mt-0.5 text-sm font-normal text-white/60">{r.desc}</div>
              </button>
            ))}
          </div>
          {guessStatus && <div className="mt-4 text-sm font-bold text-white/85">{guessStatus}</div>}
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    const ranked = players.map((name, i) => ({ name, score: scores[i] })).sort((a, b) => b.score - a.score);
    return (
      <div className="mx-auto mt-6 w-full max-w-xl">
        <div className="glass p-7 text-center">
          <div className="text-5xl">🧩</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Rules discovered</h1>
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
      <div>
        <div className="flex justify-between text-[13px] font-bold text-white/55">
          <span>Round {round} of {rounds}</span>
          <span>🎯 {players[current]}&apos;s turn</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${((round - 1) / rounds) * 100}%`, background: 'linear-gradient(90deg,#a5b4fc,#f9a8d4)' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {players.map((p, i) => (
          <div key={p} className={`glass-sm px-4 py-3 ${i === current ? 'outline outline-2 outline-pink-400/70' : ''}`}>
            <div className="truncate text-xs text-white/60">{p}{i === current ? ' 🎯' : ''}</div>
            <div className="mt-1 text-2xl font-black">{scores[i]}</div>
          </div>
        ))}
      </div>

      <div className="glass flex flex-col items-center gap-4 p-6 text-center">
        <div className="pill capitalize">{rule?.kind} rule</div>
        <div className="text-xl font-black tracking-tight sm:text-2xl">Discover the hidden rule</div>
        <form className="flex w-full max-w-sm flex-col gap-2" onSubmit={testExample}>
          <input
            className="input"
            autoComplete="off"
            placeholder="Enter a word or number to test"
            value={input}
            disabled={busy}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="btn-secondary !py-3" disabled={busy}>Test example</button>
        </form>
        <button className="btn !py-3 w-full max-w-sm" disabled={busy} onClick={openGuess}>
          💡 Guess the rule
        </button>
        {status && <div className="text-sm font-bold text-white/80">{status}</div>}
      </div>

      <div className="glass p-5">
        <h2 className="text-lg font-black">Evidence</h2>
        <div className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
          {evidence.map((e, i) => (
            <div key={i} className="glass-sm flex items-center justify-between gap-2 px-4 py-3 text-sm">
              <span className="font-bold">{e.value}</span>
              <span className="flex items-center gap-2">
                <span className={`font-black ${e.accepted ? 'text-emerald-300' : 'text-red-300'}`}>
                  {e.accepted ? 'Accepted' : 'Rejected'}
                </span>
                {e.system && <span className="pill !px-2.5 !py-1 !text-[11px]">starter clue</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button className="btn-danger" onClick={quit}>End game</button>
    </div>
  );
}
