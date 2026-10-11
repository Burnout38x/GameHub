'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { seeded } from '@/lib/live/types';
import { applyMove, deal, type WhotHand } from '@/lib/whot/game';
import { chooseMove, type BotLevel } from '@/lib/whot/bot';
import type { Shape } from '@/lib/whot/cards';
import WhotTable, { type TableState } from './WhotTable';
import { CardFace } from './WhotCard';
import { useSfx } from '@/components/live/sfx';

/** Whot! against the Machine, entirely in this browser. */

const BOTS = [
  { name: 'Aunty Bisi', emoji: '👵🏾' },
  { name: 'Oga Emeka', emoji: '🧔🏿' },
  { name: 'Baba Sule', emoji: '👴🏾' },
];
const LEVELS: { level: BotLevel; label: string; detail: string }[] = [
  { level: 1, label: 'Easy going', detail: 'Plays whatever is handy' },
  { level: 2, label: 'Sharp', detail: 'Saves Whot and punishes' },
  { level: 3, label: 'Ruthless', detail: 'Counts every card' },
];
const BOT_THINK_MS = 950;
const STATS_KEY = 'gamehub:whot:solo-stats';

interface Setup { opponents: 1 | 2 | 3; level: BotLevel; hands: 1 | 3 | 5 }
interface Match { setup: Setup; seed: number; handNo: number; wins: number[]; hand: WhotHand }

function readStats(): { played: number; won: number } {
  try { return { played: 0, won: 0, ...JSON.parse(localStorage.getItem(STATS_KEY) ?? '{}') }; } catch { return { played: 0, won: 0 }; }
}

function newHand(setup: Setup, seed: number, handNo: number): WhotHand {
  const players = [{ id: 'you', name: 'You' }, ...BOTS.slice(0, setup.opponents).map((bot, index) => ({ id: `bot${index}`, name: bot.name, bot: true }))];
  return deal(players, (seed + handNo * 7919) >>> 0, (handNo - 1) % players.length);
}

export default function WhotSolo() {
  const [setup, setSetup] = useState<Setup>({ opponents: 1, level: 2, hands: 3 });
  const [match, setMatch] = useState<Match | null>(null);
  const [stats, setStats] = useState({ played: 0, won: 0 });
  const { play, muted, toggle } = useSfx();

  useEffect(() => { queueMicrotask(() => setStats(readStats())); }, []);

  const start = () => {
    const seed = Math.floor(Math.random() * 2147483647);
    setMatch({ setup, seed, handNo: 1, wins: Array(setup.opponents + 1).fill(0), hand: newHand(setup, seed, 1) });
  };

  const apply = (current: Match, seat: number, move: Parameters<typeof applyMove>[2]): Match => {
    const hand = applyMove(current.hand, seat, move);
    if ('error' in hand) return current;
    const wins = hand.winners ? current.wins.map((count, index) => count + (hand.winners!.includes(index) ? 1 : 0)) : current.wins;
    return { ...current, hand, wins };
  };

  // The Machine takes its turns with a short, human-feeling pause.
  const botTurn = match && !match.hand.winners && match.hand.turn !== 0 ? match.hand.step : null;
  useEffect(() => {
    if (botTurn === null) return;
    const id = setTimeout(() => {
      setMatch(current => {
        if (!current || current.hand.winners || current.hand.turn === 0 || current.hand.step !== botTurn) return current;
        const random = seeded((current.seed ^ (current.hand.step * 2654435761)) >>> 0);
        return apply(current, current.hand.turn, chooseMove(current.hand, current.hand.turn, current.setup.level, random));
      });
    }, BOT_THINK_MS);
    return () => clearTimeout(id);
  }, [botTurn]);

  const decided = match ? match.wins.some(count => count > match.setup.hands / 2) || match.handNo >= match.setup.hands : false;
  const over = !!match?.hand.winners && decided;

  // Count the finished match once.
  const finishedKey = over && match ? `${match.seed}` : null;
  useEffect(() => {
    if (!finishedKey || !match) return;
    const won = match.wins.every((count, index) => index === 0 || match.wins[0] > count);
    const next = { played: stats.played + 1, won: stats.won + (won ? 1 : 0) };
    try { localStorage.setItem(STATS_KEY, JSON.stringify(next)); } catch { /* stats are a nicety */ }
    queueMicrotask(() => setStats(next));
    // Stats depend only on the match finishing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishedKey]);

  const table: TableState | null = useMemo(() => {
    if (!match) return null;
    const hand = match.hand;
    return {
      seats: hand.seats.map((seat, index) => ({ id: seat.id, name: seat.name, count: seat.hand.length, cards: index === 0 || hand.winners ? seat.hand : null })),
      me: 0, turn: hand.turn, pile: hand.pile.slice(-6), market: hand.market.length, called: hand.called, step: hand.step,
      events: hand.events, winners: hand.winners, tender: hand.tender, phase: 'play', deadline: 0, turnSeconds: 0,
      hands: match.setup.hands, handNo: match.handNo, wins: Object.fromEntries(hand.seats.map((seat, index) => [seat.id, match.wins[index]])),
    };
  }, [match]);

  if (!match || !table) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-5" aria-labelledby="whot-title">
        <div className="glass p-6 sm:p-8">
          <p className="eyebrow">Naija card classic</p>
          <h1 id="whot-title" className="mt-2 text-4xl font-black tracking-tight">🃏 Whot!</h1>
          <p className="mt-2 text-white/70">Match the shape or the number, hit them with Pick Two, and shout “Check up!” when your last card lands.</p>
          <div className="mt-5 flex justify-center" aria-hidden="true">{[0, 21, 33, 46, 49].map((id, k) => <span key={id} style={{ marginLeft: k ? -14 : 0, transform: `rotate(${(k - 2) * 7}deg) translateY(${Math.abs(k - 2) * 6}px)` }}><CardFace id={id} width={58} /></span>)}</div>
          <p className="mt-4 text-center text-sm text-white/60">{stats.played ? `You’ve won ${stats.won} of ${stats.played} matches against the Machine.` : 'Your first match against the Machine awaits.'}</p>
        </div>

        <div className="glass grid gap-5 p-6 sm:p-8">
          <fieldset>
            <legend className="text-sm font-black">Opponents</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([1, 2, 3] as const).map(count => (
                <button key={count} type="button" className={`game-card !gap-1 !p-3 text-center ${setup.opponents === count ? '!border-[#fde047]' : ''}`} aria-pressed={setup.opponents === count} onClick={() => setSetup({ ...setup, opponents: count })}>
                  <span className="text-2xl" aria-hidden="true">{BOTS.slice(0, count).map(bot => bot.emoji).join('')}</span>
                  <span className="text-sm font-black">{count === 1 ? '1 v 1' : `${count + 1} players`}</span>
                  <span className="text-xs text-white/60">{BOTS.slice(0, count).map(bot => bot.name).join(', ')}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-black">How the Machine plays</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {LEVELS.map(entry => (
                <button key={entry.level} type="button" className={`game-card !gap-1 !p-3 text-center ${setup.level === entry.level ? '!border-[#fde047]' : ''}`} aria-pressed={setup.level === entry.level} onClick={() => setSetup({ ...setup, level: entry.level })}>
                  <span className="text-sm font-black">{entry.label}</span>
                  <span className="text-xs text-white/60">{entry.detail}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-black">Match length</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([1, 3, 5] as const).map(hands => (
                <button key={hands} type="button" className={`btn-secondary !min-h-11 !py-2 ${setup.hands === hands ? '!border-[#fde047]' : ''}`} aria-pressed={setup.hands === hands} onClick={() => setSetup({ ...setup, hands })}>
                  {hands === 1 ? 'One hand' : `Best of ${hands}`}
                </button>
              ))}
            </div>
          </fieldset>
          <button type="button" className="btn" onClick={start}>🃏 Deal me in</button>
          <details className="text-sm text-white/70">
            <summary className="cursor-pointer font-bold">House rules</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Five cards each. Match the top card’s shape or number.</li>
              <li><b>1 Hold On</b>: play again. <b>2 Pick Two</b> / <b>5 Pick Three</b>: the next player picks and misses a turn.</li>
              <li><b>8 Suspension</b>: the next player misses a turn. <b>14 General Market</b>: everyone else picks one and you go again.</li>
              <li><b>20 Whot</b>: play it on anything and call the shape you need.</li>
              <li>Can’t play? Go to market. When the market runs dry it is reshuffled once; after that, lowest card total wins the tender (stars count double).</li>
            </ul>
          </details>
          <Link href="/rooms/new?game=whot" className="btn-secondary">🌍 Play friends online instead</Link>
        </div>
      </section>
    );
  }

  const youWon = match.wins.every((count, index) => index === 0 || match.wins[0] > count);
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-3" aria-label="Whot table">
      <h1 className="sr-only">Whot! against the Machine</h1>
      <WhotTable
        table={table} now={0} busy={false} muted={muted} onToggleMute={toggle} play={play} timed={false}
        onPlay={(card: number, call?: Shape) => setMatch(current => (current && current.hand.turn === 0 ? apply(current, 0, { type: 'play', card, ...(call ? { call } : {}) }) : current))}
        onDraw={() => setMatch(current => (current && current.hand.turn === 0 ? apply(current, 0, { type: 'draw' }) : current))}
        nextLabel={over ? (youWon ? '🏆 You win the match! Play again' : 'Run it back') : 'Deal the next hand →'}
        onNext={() => {
          if (over) { start(); return; }
          setMatch(current => (current ? { ...current, handNo: current.handNo + 1, hand: newHand(current.setup, current.seed, current.handNo + 1) } : current));
        }}
      />
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="btn-secondary !w-auto !px-5" onClick={() => setMatch(null)}>Leave the table</button>
      </div>
    </section>
  );
}
