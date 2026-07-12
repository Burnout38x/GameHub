'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { shuffle } from '@/lib/game-utils';
import { codeFeedback, validateNames } from '@/lib/local-games/logic';
import PlayersEditor from '@/components/local/PlayersEditor';

type Phase = 'setup' | 'play' | 'result';

interface HistoryEntry {
  player: string;
  guess: string;
  exact: number;
  misplaced: number;
}

export default function CodeCrackersPage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [names, setNames] = useState<string[]>(['Player 1', 'Player 2']);
  const [codeLength, setCodeLength] = useState('4');
  const [roundCount, setRoundCount] = useState('3');
  const [maxTurns, setMaxTurns] = useState('18');
  const [duplicates, setDuplicates] = useState('no');
  const [error, setError] = useState('');

  const [players, setPlayers] = useState<string[]>([]);
  const [scores, setScores] = useState<number[]>([]);
  const [round, setRound] = useState(1);
  const [turn, setTurn] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [secret, setSecret] = useState<number[]>([]);
  const [guess, setGuess] = useState<number[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [status, setStatus] = useState('');
  const [roundOver, setRoundOver] = useState(false);
  const nextTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const length = Number(codeLength);
  const turns = Number(maxTurns);
  const totalRounds = Number(roundCount);
  const allowDupes = duplicates === 'yes';

  function makeSecret(len: number, dupes: boolean): number[] {
    if (dupes) return Array.from({ length: len }, () => Math.floor(Math.random() * 10));
    return shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, len);
  }

  function beginRound(len: number, dupes: boolean) {
    setSecret(makeSecret(len, dupes));
    setTurn(0);
    setCurrentPlayer(0);
    setGuess([]);
    setHistory([]);
    setStatus('');
    setRoundOver(false);
  }

  function start() {
    const trimmed = names.map((n) => n.trim()).filter(Boolean);
    const err = validateNames(trimmed, 2);
    if (err) return setError(err);
    setError('');
    setPlayers(trimmed);
    setScores(trimmed.map(() => 0));
    setRound(1);
    beginRound(length, allowDupes);
    setPhase('play');
  }

  function pressKey(n: number) {
    if (roundOver || guess.length >= length) return;
    if (!allowDupes && guess.includes(n)) {
      setStatus('Repeated digits are disabled.');
      return;
    }
    setGuess([...guess, n]);
    setStatus('');
  }

  function endRound(nextScores: number[]) {
    if (round < totalRounds) {
      setRound(round + 1);
      beginRound(length, allowDupes);
    } else {
      setScores(nextScores);
      setPhase('result');
    }
  }

  function submit() {
    if (roundOver) return;
    if (guess.length !== length) {
      setStatus(`Enter all ${length} digits.`);
      return;
    }
    const result = codeFeedback(guess, secret);
    const player = players[currentPlayer];
    setHistory([{ player, guess: guess.join(''), ...result }, ...history]);

    if (result.exact === length) {
      const bonus = Math.max(0, (turns - turn) * 5);
      const nextScores = scores.map((v, i) => (i === currentPlayer ? v + 100 + bonus : v));
      setScores(nextScores);
      setStatus(`${player} cracked it! +${100 + bonus} points`);
      setRoundOver(true);
      nextTimeout.current = setTimeout(() => endRound(nextScores), 1500);
      return;
    }
    const nextTurn = turn + 1;
    if (nextTurn >= turns) {
      setStatus(`No one cracked it. The code was ${secret.join('')}.`);
      setRoundOver(true);
      nextTimeout.current = setTimeout(() => endRound(scores), 1800);
      return;
    }
    setTurn(nextTurn);
    setCurrentPlayer((currentPlayer + 1) % players.length);
    setGuess([]);
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
          <div className="pill">🔐 Pass & Play · same device</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Code Crackers</h1>
          <p className="mt-1 text-sm text-white/60">
            A secret digit code is generated. After every guess you learn how many digits are
            correct — and how many are also in the right position.
          </p>

          <span className="field-label">Players ({names.length}/6)</span>
          <PlayersEditor names={names} onChange={setNames} />

          <label className="field-label" htmlFor="len">Code length</label>
          <select id="len" className="input" value={codeLength} onChange={(e) => setCodeLength(e.target.value)}>
            <option value="4">4 digits</option>
            <option value="5">5 digits</option>
            <option value="6">6 digits</option>
          </select>

          <label className="field-label" htmlFor="rounds">Rounds</label>
          <select id="rounds" className="input" value={roundCount} onChange={(e) => setRoundCount(e.target.value)}>
            {['1', '3', '5'].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          <label className="field-label" htmlFor="turns">Maximum total turns per round</label>
          <select id="turns" className="input" value={maxTurns} onChange={(e) => setMaxTurns(e.target.value)}>
            {['12', '18', '24'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <label className="field-label" htmlFor="dupes">Repeated digits</label>
          <select id="dupes" className="input" value={duplicates} onChange={(e) => setDuplicates(e.target.value)}>
            <option value="no">Not allowed</option>
            <option value="yes">Allowed</option>
          </select>

          <div className="glass-sm mt-4 p-4 text-sm leading-relaxed text-white/70">
            <strong>Feedback:</strong> “Exact” means the right digit in the right position.
            “Misplaced” means the right digit in the wrong position.
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

  if (phase === 'result') {
    const ranked = players.map((name, i) => ({ name, score: scores[i] })).sort((a, b) => b.score - a.score);
    return (
      <div className="mx-auto mt-6 w-full max-w-xl">
        <div className="glass p-7 text-center">
          <div className="text-5xl">🔓</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Code cracked</h1>
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
          <span>Round {round} of {totalRounds}</span>
          <span>Turn {Math.min(turn + 1, turns)} of {turns}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${(turn / turns) * 100}%`, background: 'linear-gradient(90deg,#a5b4fc,#f9a8d4)' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {players.map((p, i) => (
          <div key={p} className={`glass-sm px-4 py-3 ${i === currentPlayer && !roundOver ? 'outline outline-2 outline-pink-400/70' : ''}`}>
            <div className="truncate text-xs text-white/60">
              {p}{i === currentPlayer && !roundOver ? ' 🎯' : ''}
            </div>
            <div className="mt-1 text-2xl font-black">{scores[i]}</div>
          </div>
        ))}
      </div>

      <div className="glass flex flex-col items-center gap-4 p-6 text-center">
        <div className="pill">🎯 {players[currentPlayer]}&apos;s turn — enter your guess</div>
        <div className="flex flex-wrap justify-center gap-2">
          {Array.from({ length }, (_, i) => (
            <div key={i} className="grid h-14 w-12 place-items-center rounded-2xl border border-white/[0.14] bg-black/[0.25] text-xl font-black">
              {guess[i] ?? '•'}
            </div>
          ))}
        </div>
        <div className="grid w-full max-w-sm grid-cols-5 gap-2">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              className="rounded-xl border border-white/[0.14] bg-white/10 py-3 font-black hover:border-indigo-300/60 disabled:opacity-40"
              disabled={roundOver}
              onClick={() => pressKey(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex w-full max-w-sm gap-2">
          <button className="btn-secondary flex-1 !py-3" disabled={roundOver} onClick={() => setGuess([])}>
            Clear
          </button>
          <button className="btn flex-1 !py-3" disabled={roundOver} onClick={submit}>
            Submit guess
          </button>
        </div>
        {status && <div className="text-sm font-bold text-white/80">{status}</div>}
      </div>

      {history.length > 0 && (
        <div className="glass p-5">
          <h2 className="text-lg font-black">Guess history</h2>
          <div className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
            {history.map((h, i) => (
              <div key={i} className="glass-sm px-4 py-3 text-sm">
                <strong>{h.player}</strong> guessed{' '}
                <span className="font-mono font-black tracking-widest text-indigo-200">{h.guess}</span>
                <div className="mt-1 text-xs">
                  <span className="font-bold text-emerald-300">{h.exact} exact</span>
                  <span className="text-white/40"> · </span>
                  <span className="font-bold text-amber-300">{h.misplaced} misplaced</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="btn-danger" onClick={quit}>End game</button>
    </div>
  );
}
