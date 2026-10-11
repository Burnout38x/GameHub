'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { canPlay, cardById, handPoints, powerOf, POWER_HELP, POWER_NAMES, SHAPE_NAMES, SHAPES, type Shape } from '@/lib/whot/cards';
import type { WhotEvent } from '@/lib/whot/game';
import type { WhotSeatView } from '@/lib/whot/view';
import { CardBack, CardFace, ShapeGlyph, cardLabel } from './WhotCard';
import { CountdownRing, MuteButton } from '@/components/live/parts';
import type { Cue } from '@/components/live/sfx';
import s from './Whot.module.css';

/** Everything the table needs, whether the game runs on the server or in this browser. */
export interface TableState {
  seats: WhotSeatView[];
  me: number;
  turn: number;
  pile: number[];
  market: number;
  called: Shape | null;
  step: number;
  events: WhotEvent[];
  winners: number[] | null;
  tender: number[] | null;
  phase: 'play' | 'between';
  deadline: number;
  turnSeconds: number;
  hands: number;
  handNo: number;
  wins: Record<string, number>;
}

interface Props {
  table: TableState;
  now: number;
  busy: boolean;
  error?: string | null;
  muted: boolean;
  onToggleMute: () => void;
  play: (cue: Cue) => void;
  onPlay: (card: number, call?: Shape) => void;
  onDraw: () => void;
  /** Solo games have no turn clock. */
  timed?: boolean;
  nextLabel?: string;
  onNext?: () => void;
}

function describe(event: WhotEvent | undefined, name: (seat: number) => string, me: number): string {
  if (!event) return 'Match the shape or the number. Can’t? Go to market.';
  const who = name('seat' in event ? event.seat : -1);
  switch (event.t) {
    case 'play': {
      const card = cardById(event.card);
      if (event.power === 'whot') return `${who} played WHOT and called ${SHAPE_NAMES[event.call!]}!`;
      if (event.power) return `${who} played ${POWER_NAMES[event.power]}! ${POWER_HELP[event.power]}`;
      return `${who} played ${SHAPE_NAMES[card.suit]} ${card.value}.`;
    }
    case 'draw':
      if (event.reason === 'pick') return `${event.seat === me ? 'You pick' : `${who} picks`} ${event.count}!`;
      if (event.reason === 'general') return 'General market: everyone picks one!';
      return `${who} went to market.`;
    case 'skip': return `${event.seat === me ? 'You are' : `${who} is`} suspended!`;
    case 'last': return `${who}: “Last card!”`;
    case 'shuffle': return 'The market ran dry, so the played cards were reshuffled.';
    case 'win': return event.how === 'checkup' ? `${who}: “Check up!”` : `Tender! ${who} holds the fewest points.`;
  }
}

/** The shared Whot! table: opponents across the top, piles in the middle, your hand below. */
export default function WhotTable({ table, now, busy, error, muted, onToggleMute, play, onPlay, onDraw, timed = true, nextLabel, onNext }: Props) {
  const [calling, setCalling] = useState<number | null>(null);
  const mine = table.seats[table.me]?.cards ?? [];
  const myTurn = table.phase === 'play' && table.turn === table.me && !table.winners;
  const topId = table.pile[table.pile.length - 1];
  const top = cardById(topId);
  const name = (seat: number) => (seat === table.me ? 'You' : table.seats[seat]?.name ?? 'Someone');
  const lastEvent = [...table.events].reverse().find(event => event.t !== 'last') ?? table.events[table.events.length - 1];
  const lastPlay = [...table.events].reverse().find((event): event is Extract<WhotEvent, { t: 'play' }> => event.t === 'play');
  const others = table.seats.map((seat, index) => ({ seat, index })).filter(entry => entry.index !== table.me);
  const isPlayable = (id: number) => myTurn && canPlay(cardById(id), top, table.called);
  const anyPlayable = mine.some(isPlayable);

  // Sounds for whatever just happened at the table.
  const heard = useRef(-1);
  useEffect(() => {
    if (heard.current === table.step) return;
    const first = heard.current === -1;
    heard.current = table.step;
    if (first) { play('deal'); return; }
    const event = table.events[table.events.length - 1];
    if (!event) return;
    if (event.t === 'win') play(table.winners?.includes(table.me) ? 'win' : 'lose');
    else if (event.t === 'draw' || event.t === 'shuffle') play('deal');
    else if (event.t === 'play' && event.power === 'whot') play('whot');
    else if (event.t === 'play' && event.power) play('pick');
    else play('flip');
  }, [table.step, table.events, table.winners, table.me, play]);

  const choose = (id: number) => {
    if (!isPlayable(id) || busy) return;
    if (powerOf(cardById(id)) === 'whot') { setCalling(id); return; }
    onPlay(id);
  };

  // Played cards fly in from the player who played them.
  const landFrom = lastPlay && lastPlay.card === topId ? (lastPlay.seat === table.me ? '170px' : '-170px') : '0px';

  return (
    <div className={s.wrap}>
      <div className={s.table}>
        <div className={s.opponents}>
          {others.map(({ seat, index }) => (
            <div key={seat.id} className={`${s.pod} ${table.turn === index && !table.winners ? s.podTurn : ''}`}>
              <div className={s.podHead}>
                <span className={s.avatar} aria-hidden="true">{seat.name.slice(0, 1).toUpperCase()}</span>
                <span className={s.podName}>{seat.name}</span>
                {timed && table.turn === index && table.phase === 'play' && !table.winners && <CountdownRing deadline={table.deadline} seconds={table.turnSeconds} now={now} color="#fde047" />}
              </div>
              <div className={s.fan} aria-hidden="true">
                {(seat.cards ?? Array.from({ length: Math.min(seat.count, 8) }, () => -1)).slice(0, 8).map((id, k) => (id >= 0 ? <CardFace key={k} id={id} width={36} /> : <CardBack key={k} width={36} />))}
              </div>
              <div className="flex items-center gap-2">
                <span className={s.count}>{seat.count} card{seat.count === 1 ? '' : 's'}</span>
                {seat.count === 1 && !table.winners && <span className={s.last}>LAST CARD!</span>}
              </div>
              {table.hands > 1 && <Pips wins={table.wins[seat.id] ?? 0} needed={Math.floor(table.hands / 2) + 1} />}
            </div>
          ))}
        </div>

        <div>
          <div className={s.center}>
            <button type="button" className={s.market} onClick={() => { if (myTurn && !busy) onDraw(); }} disabled={!myTurn || busy}
              aria-label={myTurn ? `Go to market: draw a card (${table.market} left)` : `Market: ${table.market} cards left`}>
              <span className={`${s.marketStack} ${myTurn && !anyPlayable ? s.marketGlow : ''}`}>
                {[0, 1, 2].filter(k => k < Math.max(1, Math.min(3, table.market))).map(k => <span key={k} style={{ transform: `translate(${k * 3}px, ${-k * 3}px)` }}><CardBack width={74} /></span>)}
              </span>
              <span className={s.marketLabel}>Market · {table.market}</span>
            </button>
            <div className={s.pile} role="img" aria-label={`Top card: ${cardLabel(topId)}${table.called ? `, called shape ${SHAPE_NAMES[table.called]}` : ''}`}>
              {table.pile.slice(-3, -1).map((id, k) => <span key={`${id}-${k}`} style={{ transform: `rotate(${k === 0 ? -9 : 6}deg) translate(${k === 0 ? -6 : 5}px, 2px)` }}><CardFace id={id} width={100} /></span>)}
              <span key={`top-${topId}-${table.step}`} className={s.land} style={{ ['--from' as string]: landFrom } as CSSProperties}><CardFace id={topId} width={100} /></span>
              {table.called && <span className={s.called} title={`Called: ${SHAPE_NAMES[table.called]}`}><ShapeGlyph shape={table.called} size={26} /></span>}
            </div>
          </div>
          <p className={`${s.ticker} mt-8`} aria-live="polite">{describe(lastEvent, name, table.me)}</p>
        </div>

        <div className={s.me}>
          <div className={s.meBar}>
            <div className="flex items-center gap-2 text-sm font-black">
              <span className={s.avatar} aria-hidden="true">{table.seats[table.me]?.name.slice(0, 1).toUpperCase()}</span>
              {myTurn ? (anyPlayable ? 'Your turn: tap a glowing card' : 'No match. Tap the market to draw') : table.winners ? 'Hand over' : `${name(table.turn)}’s turn`}
              {mine.length === 1 && !table.winners && <span className={s.last}>LAST CARD!</span>}
            </div>
            <div className="flex items-center gap-2">
              {table.hands > 1 && <Pips wins={table.wins[table.seats[table.me]?.id] ?? 0} needed={Math.floor(table.hands / 2) + 1} />}
              {timed && myTurn && <CountdownRing deadline={table.deadline} seconds={table.turnSeconds} now={now} color="#fde047" />}
              <MuteButton muted={muted} onToggle={onToggleMute} />
            </div>
          </div>
          <div className={s.hand} role="group" tabIndex={0} aria-label={`Your hand: ${mine.length} cards`}>
            {mine.map(id => {
              const can = isPlayable(id);
              return (
                <button key={id} type="button" className={`${s.handCard} ${can ? s.playable : myTurn ? s.blocked : ''}`} disabled={!can || busy}
                  onClick={() => choose(id)} aria-label={`${cardLabel(id)}${can ? ', playable' : ''}`}>
                  <CardFace id={id} width={74} />
                </button>
              );
            })}
          </div>
        </div>

        {calling !== null && (
          <div className={s.overlay} role="dialog" aria-modal="true" aria-labelledby="whot-call-title">
            <div className={s.sheet}>
              <h2 id="whot-call-title">I need…</h2>
              <p className="text-sm font-bold opacity-75">Call the shape the next player must play.</p>
              <div className={s.shapes}>
                {SHAPES.map(shape => (
                  <button key={shape} type="button" className={s.shapeBtn} autoFocus={shape === 'circle'}
                    onClick={() => { const card = calling; setCalling(null); onPlay(card, shape); }}>
                    <ShapeGlyph shape={shape} size={28} />{SHAPE_NAMES[shape]}
                  </button>
                ))}
              </div>
              <button type="button" className="mt-4 text-sm font-black underline" onClick={() => setCalling(null)}>Keep my Whot card</button>
            </div>
          </div>
        )}

        {table.winners && (
          <div className={s.overlay} role="dialog" aria-modal="true" aria-labelledby="whot-hand-title">
            <div className={s.sheet}>
              <p className="text-xs font-black uppercase tracking-widest opacity-70">Hand {table.handNo}{table.hands > 1 ? ` of up to ${table.hands}` : ''}</p>
              <h2 id="whot-hand-title">{table.winners.includes(table.me) ? (table.tender ? 'You win the tender! 🎉' : 'Check up! You win! 🎉') : `${table.winners.map(name).join(' & ')} ${table.winners.length > 1 ? 'share' : 'wins'} the hand`}</h2>
              {table.tender && <p className="text-sm font-bold opacity-75">The market ran dry. Lowest card total wins (stars count double).</p>}
              <div className={s.tally}>
                {table.seats.map((seat, index) => (
                  <div key={seat.id} className={`${s.tallyRow} ${table.winners!.includes(index) ? s.tallyWin : ''}`}>
                    <span>{index === table.me ? 'You' : seat.name}</span>
                    <span className={s.mini} aria-hidden="true">{(seat.cards ?? []).slice(0, 6).map(id => <CardFace key={id} id={id} width={22} />)}</span>
                    <span>{seat.cards ? `${handPoints(seat.cards)} pts` : `${seat.count} cards`}</span>
                  </div>
                ))}
              </div>
              {onNext ? <button type="button" className="btn mt-4" onClick={onNext}>{nextLabel ?? 'Next hand →'}</button>
                : <p className="mt-4 text-sm font-bold opacity-75" aria-live="polite">{nextLabel ?? 'Next hand coming up…'}</p>}
            </div>
          </div>
        )}
      </div>
      {error && <p role="alert" className="text-center text-sm font-bold text-red-300">{error}</p>}
    </div>
  );
}

function Pips({ wins, needed }: { wins: number; needed: number }) {
  return (
    <span className={s.pips} aria-label={`${wins} of ${needed} hands won`} role="img">
      {Array.from({ length: needed }, (_, index) => <span key={index} className={`${s.pip} ${index < wins ? s.pipOn : ''}`} />)}
    </span>
  );
}
