'use client';
import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { DILEMMAS } from '@/lib/dilemma/bank';
import { MIXED_TOPIC, TOPICS, topicById, type Dilemma, type TopicChoice } from '@/lib/dilemma/types';
import { shuffle } from '@/lib/game-utils';
import PlayersEditor from '@/components/local/PlayersEditor';
import { useSfx } from './sfx';
import { LETTERS, MuteButton, Podium, TILE_COLORS } from './parts';
import s from './Live.module.css';

/** What Would You Do? on one phone: the hot seat picks in secret, everyone else guesses out loud. */

type Phase = 'card' | 'secret' | 'guess' | 'reveal';
interface Game { players: string[]; cards: Dilemma[]; index: number; phase: Phase; pick: number | null; right: number[]; scores: number[] }

function deal(topic: TopicChoice, count: number): Dilemma[] {
  const pool = topic === 'mixed' ? DILEMMAS : DILEMMAS.filter(card => card.topic === topic);
  return shuffle(pool).slice(0, count);
}

export default function DilemmaLocal() {
  const [names, setNames] = useState(['Player 1', 'Player 2', 'Player 3']);
  const [topic, setTopic] = useState<TopicChoice>('mixed');
  const [turns, setTurns] = useState('2');
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState('');
  const { play, muted, toggle } = useSfx();

  const start = () => {
    const players = names.map((name, index) => name.trim() || `Player ${index + 1}`);
    if (new Set(players.map(name => name.toLowerCase())).size !== players.length) { setError('Give everyone a different name.'); return; }
    const cards = deal(topic, Math.min(players.length * Number(turns), 40));
    const rounds = Math.floor(cards.length / players.length) * players.length;
    setError('');
    setGame({ players, cards: cards.slice(0, rounds), index: 0, phase: 'card', pick: null, right: [], scores: players.map(() => 0) });
  };

  if (!game) {
    return (
      <section className="mx-auto flex w-full max-w-xl flex-col gap-4" aria-labelledby="wwyd-title">
        <div className="glass p-6">
          <p className="eyebrow">Same device · 2–8 players</p>
          <h1 id="wwyd-title" className="mt-2 text-3xl font-black">🤔 What Would You Do?</h1>
          <p className="mt-2 text-sm text-white/70">Each round one player takes the hot seat and secretly picks what they would really do. Everyone else calls out a guess. Read them right and score.</p>
        </div>
        <div className="glass grid gap-3 p-6">
          <p className="field-label !mt-0">Players</p>
          <PlayersEditor names={names} onChange={setNames} max={8} />
          <label className="field-label" htmlFor="wwyd-topic">Topic</label>
          <select id="wwyd-topic" className="input" value={topic} onChange={event => setTopic(event.target.value as TopicChoice)}>
            <option value="mixed">{MIXED_TOPIC.emoji} {MIXED_TOPIC.name}</option>
            {TOPICS.map(entry => <option key={entry.id} value={entry.id}>{entry.emoji} {entry.name}</option>)}
          </select>
          <label className="field-label" htmlFor="wwyd-turns">Turns in the hot seat each</label>
          <select id="wwyd-turns" className="input" value={turns} onChange={event => setTurns(event.target.value)}>
            {['1', '2', '3', '4'].map(option => <option key={option} value={option}>{option}</option>)}
          </select>
          {error && <p role="alert" className="text-sm font-bold text-red-300">{error}</p>}
          <button type="button" className="btn mt-2" onClick={start}>🔥 Start the hot seat</button>
          <Link href="/rooms/new?game=what-would-you-do" className="btn-secondary">🌍 Play online, everyone on their own phone</Link>
        </div>
      </section>
    );
  }

  if (game.index >= game.cards.length) {
    const rows = game.players.map((name, index) => ({ id: String(index), name, points: game.scores[index] })).sort((a, b) => b.points - a.points);
    return (
      <section className="mx-auto flex w-full max-w-xl flex-col gap-4" aria-label="Final scores">
        <Podium rows={rows} unit="reads" />
        <p className="text-center text-sm text-white/70">Best mind-reader: <b>{rows[0].name}</b>.</p>
        <button type="button" className="btn" onClick={start}>Play again</button>
        <button type="button" className="btn-secondary" onClick={() => setGame(null)}>Change players or topic</button>
      </section>
    );
  }

  const card = game.cards[game.index];
  const info = topicById(card.topic) ?? MIXED_TOPIC;
  const seat = game.index % game.players.length;
  const seatName = game.players[seat];
  const guessers = game.players.map((name, index) => ({ name, index })).filter(entry => entry.index !== seat);
  const set = (patch: Partial<Game>) => setGame({ ...game, ...patch });

  return (
    <section className={`${s.stage} mx-auto max-w-2xl`} style={{ ['--tint' as string]: info.color } as CSSProperties} aria-label="What would you do?">
      <div className={s.bar}>
        <span className={s.chip} style={{ background: info.color }}>{info.emoji} {info.name}</span>
        <span className={s.counter}>{game.index + 1} / {game.cards.length}</span>
        <MuteButton muted={muted} onToggle={toggle} />
      </div>
      <div className={s.card}>
        <p className="eyebrow">🔥 {seatName} is in the hot seat</p>
        <h2 className={`${s.prompt} mt-2`}>{card.scenario}</h2>
      </div>

      {game.phase === 'card' && <>
        <ol className={s.answers}>{card.options.map((option, index) => (
          <li key={index} className={s.answer} style={{ ['--tile' as string]: TILE_COLORS[index] } as CSSProperties}><span className={s.letter} aria-hidden="true">{LETTERS[index]}</span><span className={s.answerText}>{option}</span></li>
        ))}</ol>
        <button type="button" className="btn" onClick={() => { play('flip'); set({ phase: 'secret' }); }}>📱 Hand the phone to {seatName}</button>
      </>}

      {game.phase === 'secret' && <>
        <p className={`${s.banner} ${s.bannerLose}`}>{seatName}, pick honestly. Everyone else, look away! 🙈</p>
        <div className={s.answers}>{card.options.map((option, index) => (
          <button key={index} type="button" className={s.answer} style={{ ['--tile' as string]: TILE_COLORS[index] } as CSSProperties}
            onClick={() => { play('lock'); set({ phase: 'guess', pick: index }); }}>
            <span className={s.letter} aria-hidden="true">{LETTERS[index]}</span><span className={s.answerText}>{option}</span>
          </button>
        ))}</div>
      </>}

      {game.phase === 'guess' && <>
        <div className={`${s.card} text-center`}>
          <p className="text-2xl font-black">🔒 {seatName} has chosen</p>
          <p className={s.sub}>Everyone else: call out A, B, C or D. Argue your case! Then reveal.</p>
        </div>
        <button type="button" className="btn" onClick={() => { play('reveal'); set({ phase: 'reveal' }); }}>🎭 Reveal {seatName}’s answer</button>
      </>}

      {game.phase === 'reveal' && game.pick !== null && <>
        <div className={`${s.answer} ${s.right}`} role="status">
          <span className={s.letter} aria-hidden="true">{LETTERS[game.pick]}</span>
          <span className={s.answerText}>{seatName} would: {card.options[game.pick]}</span>
        </div>
        <fieldset className={`${s.card}`}>
          <legend className="sr-only">Who guessed right?</legend>
          <p className="mb-3 text-sm font-black">Tap everyone who guessed right</p>
          <div className="flex flex-wrap gap-2">
            {guessers.map(({ name, index }) => {
              const on = game.right.includes(index);
              return <button key={index} type="button" className={on ? 'btn !w-auto !px-4' : 'btn-secondary !w-auto !px-4'} aria-pressed={on}
                onClick={() => set({ right: on ? game.right.filter(id => id !== index) : [...game.right, index] })}>{on ? '✓ ' : ''}{name}</button>;
            })}
          </div>
        </fieldset>
        <button type="button" className="btn" onClick={() => {
          play(game.right.length ? 'right' : 'pick');
          setGame({ ...game, scores: game.scores.map((score, index) => score + (game.right.includes(index) ? 1 : 0)), index: game.index + 1, phase: 'card', pick: null, right: [] });
        }}>Score it &amp; next →</button>
        <p className="text-center text-xs text-white/60">{game.players.map((name, index) => `${name} ${game.scores[index]}`).join(' · ')}</p>
      </>}
    </section>
  );
}
