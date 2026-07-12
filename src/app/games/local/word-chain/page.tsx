'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { normalize, validateNames } from '@/lib/local-games/logic';
import PlayersEditor from '@/components/local/PlayersEditor';

type Phase = 'setup' | 'play' | 'vote' | 'result';

const STARTERS = ['ocean', 'music', 'school', 'fire', 'dream', 'coffee', 'moon', 'travel', 'garden', 'money', 'movie', 'family', 'summer', 'phone', 'rain'];

export default function WordChainPage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [names, setNames] = useState<string[]>(['Player 1', 'Player 2', 'Player 3']);
  const [turnCount, setTurnCount] = useState('25');
  const [timerLen, setTimerLen] = useState('12');
  const [error, setError] = useState('');

  const [players, setPlayers] = useState<string[]>([]);
  const [scores, setScores] = useState<number[]>([]);
  const [{ turn, current }, setTurnState] = useState({ turn: 0, current: 0 });
  const [timeLeft, setTimeLeft] = useState(12);
  const [chain, setChain] = useState<string[]>([]);
  const [word, setWord] = useState('');
  const [status, setStatus] = useState('');
  const [paused, setPaused] = useState(false);
  const [canChallenge, setCanChallenge] = useState(false);
  const [lastSubmitter, setLastSubmitter] = useState<number | null>(null);
  const [challenger, setChallenger] = useState(0);
  const [voters, setVoters] = useState<number[]>([]);
  const [votes, setVotes] = useState<string[]>([]);
  const [voteStatus, setVoteStatus] = useState('');
  const nextTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const duration = Number(timerLen);
  const turns = Number(turnCount);

  useEffect(() => {
    if (phase !== 'play' || paused) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [phase, turn, paused]);

  useEffect(() => {
    if (phase !== 'play' || paused || timeLeft > 0) return;
    setPaused(true);
    setScores((s) => s.map((v, i) => (i === current ? Math.max(0, v - 5) : v)));
    setStatus(`Time is up. ${players[current]} loses 5 points.`);
    setCanChallenge(false);
    nextTimeout.current = setTimeout(nextTurn, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, paused]);

  useEffect(() => {
    if (phase === 'play' && !paused) inputRef.current?.focus();
  }, [phase, turn, paused]);

  useEffect(() => () => clearTimeout(nextTimeout.current ?? undefined), []);

  function start() {
    const trimmed = names.map((n) => n.trim()).filter(Boolean);
    const err = validateNames(trimmed, 2);
    if (err) return setError(err);
    setError('');
    setPlayers(trimmed);
    setScores(trimmed.map(() => 0));
    setTurnState({ turn: 0, current: 0 });
    setChain([STARTERS[Math.floor(Math.random() * STARTERS.length)]]);
    setCanChallenge(false);
    setLastSubmitter(null);
    setWord('');
    setStatus('');
    setPaused(false);
    setTimeLeft(duration);
    setPhase('play');
  }

  function nextTurn() {
    setTurnState((s) => ({ turn: s.turn + 1, current: (s.current + 1) % players.length }));
    setWord('');
    setStatus('');
    setTimeLeft(duration);
    setPaused(false);
  }

  useEffect(() => {
    if (phase === 'play' && turn >= turns) setPhase('result');
  }, [phase, turn, turns]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (paused) return;
    const w = normalize(word);
    if (w.length < 2) return setStatus('Enter a real word with at least two characters.');
    if (chain.map(normalize).includes(w)) return setStatus('That word has already been used.');
    setPaused(true);
    setChain([...chain, w]);
    setScores((s) => s.map((v, i) => (i === current ? v + 10 + timeLeft : v)));
    setLastSubmitter(current);
    setCanChallenge(true);
    nextTimeout.current = setTimeout(nextTurn, 400);
  }

  function beginChallenge() {
    setPaused(true);
    setChallenger(current);
    const v = players.map((_, i) => i).filter((i) => i !== current && i !== lastSubmitter);
    setVoters(v);
    setVotes([]);
    setVoteStatus('');
    setPhase('vote');
  }

  function castVote(vote: string) {
    const nowVotes = [...votes, vote];
    if (nowVotes.length < voters.length) {
      setVotes(nowVotes);
      return;
    }
    const weak = nowVotes.filter((v) => v === 'weak').length;
    const strong = nowVotes.length - weak;
    if (weak > strong) {
      const removed = chain[chain.length - 1];
      setChain(chain.slice(0, -1));
      setScores((s) =>
        s.map((v, i) => {
          if (i === lastSubmitter) return Math.max(0, v - 10);
          if (i === challenger) return v + 10;
          return v;
        })
      );
      setVoteStatus(`Challenge succeeds. “${removed}” is removed.`);
    } else {
      setScores((s) =>
        s.map((v, i) => {
          if (i === challenger) return Math.max(0, v - 10);
          if (i === lastSubmitter) return v + 5;
          return v;
        })
      );
      setVoteStatus('Challenge fails. The connection stays.');
    }
    setVotes(nowVotes);
    setCanChallenge(false);
    nextTimeout.current = setTimeout(() => {
      setPhase('play');
      setWord('');
      setStatus('');
      setTimeLeft(duration);
      setPaused(false);
    }, 1300);
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
          <div className="pill">🔗 Pass & Play · same device</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Word Association Chain</h1>
          <p className="mt-1 text-sm text-white/60">
            Enter a word connected to the previous one before time runs out. Repeats are blocked —
            and weak connections can be challenged.
          </p>

          <span className="field-label">Players ({names.length}/6)</span>
          <PlayersEditor names={names} onChange={setNames} />

          <label className="field-label" htmlFor="turns">Turns</label>
          <select id="turns" className="input" value={turnCount} onChange={(e) => setTurnCount(e.target.value)}>
            {['15', '25', '40'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <label className="field-label" htmlFor="timer">Seconds per turn</label>
          <select id="timer" className="input" value={timerLen} onChange={(e) => setTimerLen(e.target.value)}>
            {['8', '12', '20'].map((t) => <option key={t} value={t}>{t} seconds</option>)}
          </select>

          <div className="glass-sm mt-4 p-4 text-sm leading-relaxed text-white/70">
            A challenge opens a vote (3+ players). If most non-involved players vote “weak”, the
            word is removed and the challenger scores. Otherwise the challenger loses points.
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

  if (phase === 'vote') {
    const voter = voters[votes.length];
    return (
      <div className="mx-auto mt-10 w-full max-w-xl">
        <div className="glass p-8 text-center">
          <div className="text-5xl">⚖️</div>
          <div className="pill mx-auto mt-3">Challenge vote</div>
          {voteStatus ? (
            <h1 className="mt-3 text-2xl font-black tracking-tight">{voteStatus}</h1>
          ) : (
            <>
              <h1 className="mt-3 text-2xl font-black tracking-tight">
                {players[voter]}, cast your vote
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                Is “{chain[chain.length - 1]}” a reasonable association with “{chain[chain.length - 2]}”?
              </p>
              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button className="option-btn !border-emerald-400/50 text-center" onClick={() => castVote('strong')}>
                  💪 Strong connection
                </button>
                <button className="option-btn !border-red-400/50 text-center" onClick={() => castVote('weak')}>
                  🥴 Weak connection
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    const ranked = players.map((name, i) => ({ name, score: scores[i] })).sort((a, b) => b.score - a.score);
    return (
      <div className="mx-auto mt-6 w-full max-w-xl">
        <div className="glass p-7 text-center">
          <div className="text-5xl">🔗</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Chain complete</h1>
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

  const showChallenge = canChallenge && players.length >= 3 && current !== lastSubmitter;
  return (
    <div className="mx-auto mt-4 flex w-full max-w-xl flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-[13px] font-bold text-white/55">
            <span>Turn {Math.min(turn + 1, turns)} of {turns}</span>
            <span>🎯 {players[current]}&apos;s turn</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(turn / turns) * 100}%`, background: 'linear-gradient(90deg,#a5b4fc,#f9a8d4)' }}
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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {players.map((p, i) => (
          <div key={p} className={`glass-sm px-4 py-3 ${i === current ? 'outline outline-2 outline-pink-400/70' : ''}`}>
            <div className="truncate text-xs text-white/60">{p}{i === current ? ' 🎯' : ''}</div>
            <div className="mt-1 text-2xl font-black">{scores[i]}</div>
          </div>
        ))}
      </div>

      <div className="glass flex flex-col items-center gap-4 p-6 text-center">
        <div className="pill">Previous word</div>
        <div className="text-2xl font-black tracking-tight">{chain[chain.length - 1]}</div>
        <form className="flex w-full max-w-sm flex-col gap-2" onSubmit={submit}>
          <input
            ref={inputRef}
            className="input"
            maxLength={28}
            autoComplete="off"
            placeholder="Type a connected word"
            value={word}
            disabled={paused}
            onChange={(e) => setWord(e.target.value)}
          />
          <button className="btn !py-3" disabled={paused}>Submit word</button>
        </form>
        {status && <div className="text-sm font-bold text-white/80">{status}</div>}
      </div>

      <div className="glass p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-black">Chain</h2>
          {showChallenge && (
            <button className="btn-danger !w-auto px-4 !py-2 text-sm" onClick={beginChallenge}>
              Challenge last word
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {chain.map((w, i) => (
            <span key={`${w}-${i}`} className="pill !py-1.5">{w}</span>
          ))}
        </div>
      </div>

      <button className="btn-danger" onClick={quit}>End game</button>
    </div>
  );
}
