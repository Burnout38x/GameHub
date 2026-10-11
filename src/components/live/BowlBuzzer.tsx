'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { MIXED, SECTIONS, sectionById, type SectionChoice, type SectionId } from '@/lib/bowl/types';
import { useSfx } from './sfx';
import { LETTERS, MuteButton, TILE_COLORS } from './parts';
import s from './Live.module.css';

/** Brain Bowl Buzzer Duel: two players, one phone, first to buzz answers. */

interface DeckCard { section: SectionId; level: 1 | 2 | 3; prompt: string; options: string[]; answer: number; fact: string | null }
type Stage = 'open' | 'answer' | 'steal' | 'reveal';
interface Round { index: number; stage: Stage; holder: number | null; tried: number[]; endsAt: number; result: { player: number | null; points: number } | null }

const OPEN_MS = 15_000;
const ANSWER_MS = 8_000;
const BUZZ_RIGHT = 100;
const STEAL_RIGHT = 50;
const WRONG = -50;
const PLAYER_COLORS = ['#f59e0b', '#14b8a6'];
const KEYS = [['a', 'q'], ['l', 'p']];

export default function BowlBuzzer() {
  const [names, setNames] = useState(['Player 1', 'Player 2']);
  const [section, setSection] = useState<SectionChoice>('mixed');
  const [difficulty, setDifficulty] = useState<'easy' | 'mixed' | 'hard'>('mixed');
  const [count, setCount] = useState('10');
  const [deck, setDeck] = useState<DeckCard[] | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [scores, setScores] = useState([0, 0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(0);
  const { play, muted, toggle } = useSfx();

  const card = deck && round ? deck[round.index] : null;
  const done = !!deck && !!round && round.index >= deck.length;

  const start = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/bowl/deck?section=${section}&difficulty=${difficulty}&count=${count}`, { cache: 'no-store' });
      if (response.status === 401) { setError('Log in to play Buzzer Duel: it keeps the question bank safe for online matches.'); return; }
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.deck) || !data.deck.length) throw new Error('No questions');
      setDeck(data.deck);
      setScores([0, 0]);
      setRound({ index: 0, stage: 'open', holder: null, tried: [], endsAt: Date.now() + OPEN_MS, result: null });
      play('reveal');
    } catch {
      setError('Couldn’t load questions. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const finish = useCallback((current: Round, player: number | null, points: number): Round => {
    if (player !== null && points) setScores(previous => previous.map((score, index) => (index === player ? score + points : score)));
    play(points > 0 ? 'right' : 'wrong');
    return { ...current, stage: 'reveal', result: { player, points }, holder: null };
  }, [play]);

  // The latest round for event handlers, so the first buzz wins without side effects in an updater.
  const roundRef = useRef(round);
  useEffect(() => { roundRef.current = round; }, [round]);
  const buzz = useCallback((player: number) => {
    const current = roundRef.current;
    if (!current || current.stage !== 'open') return;
    const next: Round = { ...current, stage: 'answer', holder: player, endsAt: Date.now() + ANSWER_MS };
    roundRef.current = next;
    play('lock');
    setRound(next);
  }, [play]);

  const choose = (option: number) => {
    if (!round || !card || round.holder === null || (round.stage !== 'answer' && round.stage !== 'steal')) return;
    const player = round.holder;
    if (option === card.answer) { setRound(finish(round, player, round.stage === 'answer' ? BUZZ_RIGHT : STEAL_RIGHT)); return; }
    setScores(previous => previous.map((score, index) => (index === player ? score + WRONG : score)));
    play('wrong');
    if (round.stage === 'answer') {
      // A wrong buzz hands the rival a chance to steal.
      setRound({ ...round, stage: 'steal', holder: 1 - player, tried: [option], endsAt: Date.now() + ANSWER_MS });
    } else setRound({ ...round, stage: 'reveal', holder: null, tried: [...round.tried, option], result: { player: null, points: 0 } });
  };

  const next = () => {
    if (!round) return;
    setRound({ index: round.index + 1, stage: 'open', holder: null, tried: [], endsAt: Date.now() + OPEN_MS, result: null });
    play('reveal');
  };

  // The clock: runs out buzz windows and answer windows.
  useEffect(() => {
    if (!round || round.stage === 'reveal' || done) return;
    const id = setInterval(() => {
      const now = Date.now();
      setClock(now);
      if (now < round.endsAt) return;
      clearInterval(id);
      // Too slow to answer counts as a wrong answer, and the rival may steal.
      if (round.stage === 'answer' && round.holder !== null) {
        const holder = round.holder;
        setScores(previous => previous.map((score, index) => (index === holder ? score + WRONG : score)));
        setRound({ ...round, stage: 'steal', holder: 1 - holder, endsAt: now + ANSWER_MS });
      } else setRound(finish(round, null, 0));
    }, 200);
    return () => clearInterval(id);
  }, [round, done, finish]);

  // Keyboard buzzers for laptops: A or Q for the left player, L or P for the right.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const player = KEYS.findIndex(keys => keys.includes(key));
      if (player >= 0 && !(event.target instanceof HTMLInputElement)) buzz(player);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [buzz]);

  if (!deck || !round) {
    return (
      <section className="mx-auto flex w-full max-w-xl flex-col gap-4" aria-labelledby="buzzer-title">
        <div className="glass p-6">
          <p className="eyebrow">Same device · 2 players</p>
          <h1 id="buzzer-title" className="mt-2 text-3xl font-black">🏆 Brain Bowl: Buzzer Duel</h1>
          <p className="mt-2 text-sm text-white/70">Sit side by side. The question appears, and the first to slam their buzzer answers. Right: +{BUZZ_RIGHT}. Wrong: {WRONG}, and your rival can steal for +{STEAL_RIGHT}.</p>
          <p className="mt-1 text-xs text-white/60">On a keyboard: <kbd>A</kbd> buzzes the left player, <kbd>L</kbd> the right.</p>
        </div>
        <div className="glass grid gap-3 p-6">
          {names.map((name, index) => (
            <div key={index}>
              <label className="field-label !mt-0" htmlFor={`buzz-name-${index}`}>{index === 0 ? 'Left buzzer' : 'Right buzzer'}</label>
              <input id={`buzz-name-${index}`} className="input" maxLength={16} value={name} onChange={event => setNames(names.map((entry, k) => (k === index ? event.target.value : entry)))} />
            </div>
          ))}
          <label className="field-label" htmlFor="buzz-section">Section</label>
          <select id="buzz-section" className="input" value={section} onChange={event => setSection(event.target.value as SectionChoice)}>
            <option value="mixed">{MIXED.emoji} {MIXED.name}</option>
            {SECTIONS.map(entry => <option key={entry.id} value={entry.id}>{entry.emoji} {entry.name}</option>)}
          </select>
          <label className="field-label" htmlFor="buzz-level">Level</label>
          <select id="buzz-level" className="input" value={difficulty} onChange={event => setDifficulty(event.target.value as typeof difficulty)}>
            <option value="easy">🌱 Warm-up</option><option value="mixed">🏅 Full ladder</option><option value="hard">🔥 Champions only</option>
          </select>
          <label className="field-label" htmlFor="buzz-count">Questions</label>
          <select id="buzz-count" className="input" value={count} onChange={event => setCount(event.target.value)}>
            {['6', '10', '15', '20'].map(option => <option key={option} value={option}>{option}</option>)}
          </select>
          {error && <p role="alert" className="text-sm font-bold text-red-300">{error}</p>}
          {error.startsWith('Log in') && <Link href="/login" className="btn-secondary">Log in</Link>}
          <button type="button" className="btn mt-2" disabled={loading} onClick={() => void start()}>{loading ? 'Shuffling…' : '🔔 Start the duel'}</button>
          <Link href="/rooms/new?game=brain-bowl" className="btn-secondary">🌍 Play online with more friends</Link>
        </div>
      </section>
    );
  }

  const label = (index: number) => names[index].trim() || `Player ${index + 1}`;
  if (done) {
    const winner = scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1;
    return (
      <section className="mx-auto flex w-full max-w-xl flex-col gap-4 text-center" aria-labelledby="buzz-final">
        <div className={s.card}>
          <p className="eyebrow">Final whistle</p>
          <h1 id="buzz-final" className="mt-2 text-3xl font-black">{winner === null ? 'Dead heat! 🤝' : `${label(winner)} wins! 🏆`}</h1>
          <p className="mt-3 text-xl font-black">{label(0)} {scores[0]} · {scores[1]} {label(1)}</p>
        </div>
        <button type="button" className="btn" onClick={() => void start()}>Rematch</button>
        <button type="button" className="btn-secondary" onClick={() => { setDeck(null); setRound(null); }}>Change settings</button>
      </section>
    );
  }

  const info = card ? sectionById(card.section) : null;
  const left = Math.max(0, Math.ceil(((round.endsAt) - (clock || round.endsAt - 1)) / 1000));
  return (
    <section className={`${s.stage} mx-auto max-w-2xl`} style={{ ['--tint' as string]: info?.color } as CSSProperties} aria-label="Buzzer duel">
      <div className={s.bar}>
        <span className={s.chip} style={{ background: info?.color }}>{info?.emoji} {info?.name}</span>
        <span className={s.counter}>{round.index + 1} / {deck.length}</span>
        <MuteButton muted={muted} onToggle={toggle} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-center font-black">
        {[0, 1].map(index => <div key={index} className="glass-sm p-2" style={{ boxShadow: round.holder === index ? `0 0 0 3px ${PLAYER_COLORS[index]}` : undefined }}>{label(index)}<span className="block text-2xl">{scores[index]}</span></div>)}
      </div>
      {card && <div className={s.card}>
        <p className="eyebrow">{round.stage === 'open' ? `Buzz in! ${left}s` : round.stage === 'answer' ? `${label(round.holder!)} answers… ${left}s` : round.stage === 'steal' ? `${label(round.holder!)} can steal! ${left}s` : 'Answer'}</p>
        <h2 className={`${s.prompt} mt-2`}>{card.prompt}</h2>
      </div>}
      {card && <div className={s.answers}>
        {card.options.map((option, index) => {
          const revealed = round.stage === 'reveal';
          const right = revealed && index === card.answer;
          const tried = round.tried.includes(index);
          return (
            <button key={index} type="button" className={`${s.answer} ${right ? s.right : ''} ${tried ? s.wrongPick : ''} ${revealed && !right && !tried ? s.dim : ''}`}
              style={{ ['--tile' as string]: TILE_COLORS[index] } as CSSProperties}
              disabled={round.holder === null || tried || revealed} onClick={() => choose(index)}>
              <span className={s.letter} aria-hidden="true">{right ? '✓' : tried ? '✗' : LETTERS[index]}</span>
              <span className={s.answerText}>{option}</span>
            </button>
          );
        })}
      </div>}
      {round.stage === 'reveal' ? (
        <>
          <p className={`${s.banner} ${round.result?.points ? s.bannerWin : s.bannerLose}`} role="status">
            {round.result?.player !== null && round.result?.points ? `${label(round.result.player)} +${round.result.points}` : 'Nobody got it'}
          </p>
          {card?.fact && <p className={s.fact}>💡 {card.fact}</p>}
          <button type="button" className="btn" onClick={next}>{round.index + 1 < deck.length ? 'Next question →' : 'Final scores →'}</button>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map(index => (
            <button key={index} type="button" disabled={round.stage !== 'open'} onClick={() => buzz(index)}
              className="min-h-28 rounded-3xl text-xl font-black text-white shadow-[0_6px_0_rgb(0_0_0/.3)] transition-transform active:translate-y-1 disabled:opacity-40"
              style={{ background: PLAYER_COLORS[index] }} aria-label={`${label(index)} buzzer`}>
              🔔<span className="block text-base">{label(index)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
