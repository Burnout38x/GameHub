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

const FLIGHT_MS = 640;
const CARD_GAP_MS = 190;
const SEAT_GAP_MS = 160;
/** How long a played card takes to travel from its player to the pile. */
const PLAY_LAND_MS = 650;
/** Extra time a special card's call-out stays on screen. */
const CALLOUT_MS = 1000;

const freshPlays = (events: WhotEvent[], after: number) =>
  events.filter((event): event is Extract<WhotEvent, { t: 'play' }> => event.t === 'play' && (event.s ?? 0) > after);

/** When each draw since `after` starts flying: after any card lands, one card at a time. */
export function drawPlan(events: WhotEvent[], after: number): { seat: number; count: number; delay: number }[] {
  const plays = freshPlays(events, after);
  let delay = plays.length ? PLAY_LAND_MS + (plays.some(play => play.power && play.power !== 'whot') ? 250 : 0) : 0;
  return events.filter((event): event is Extract<WhotEvent, { t: 'draw' }> => event.t === 'draw' && (event.s ?? 0) > after && event.count > 0).map(event => {
    const entry = { seat: event.seat, count: event.count, delay };
    delay += event.count * CARD_GAP_MS + SEAT_GAP_MS;
    return entry;
  });
}

/** How long the table needs to show everything that happened on move `step`, so the next move waits for it. */
export function settleTime(events: WhotEvent[], step: number): number {
  const plays = freshPlays(events, step - 1);
  const draws = drawPlan(events, step - 1);
  const last = draws[draws.length - 1];
  const drawn = last ? last.delay + last.count * CARD_GAP_MS + FLIGHT_MS : 0;
  const played = plays.length ? PLAY_LAND_MS + (plays.some(play => play.power) ? CALLOUT_MS : 0) : 0;
  return Math.max(drawn, played);
}

const CALLOUTS: Record<string, string> = { hold: 'HOLD ON!', pick2: 'PICK TWO!', pick3: 'PICK THREE!', suspend: 'SUSPENSION!', market: 'GENERAL MARKET!' };

const prefersStill = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Flies one face-down card from the market to a hand. Imperative, so React never re-renders mid-flight. */
function flyCard(root: HTMLElement, from: Element, to: Element, template: Element, delay: number, mine: boolean): Animation {
  const box = root.getBoundingClientRect();
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const width = mine ? 74 : 40;
  const el = document.createElement('div');
  el.className = s.flyer;
  el.innerHTML = template.innerHTML;
  el.style.width = `${width}px`;
  const x0 = a.left - box.left + a.width / 2 - width / 2;
  const y0 = a.top - box.top + a.height / 2 - width * 0.7;
  // Your cards land at the end of your hand; opponents' cards drop into their fan.
  const x1 = mine ? Math.min(b.right - box.left - width - 16, b.left - box.left + b.width / 2 + 40) : b.left - box.left + b.width / 2 - width / 2;
  const y1 = mine ? b.bottom - box.top - width * 1.4 - 8 : b.top - box.top;
  el.style.left = `${x0}px`;
  el.style.top = `${y0}px`;
  root.appendChild(el);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const animation = el.animate([
    { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 0 },
    { offset: 0.12, opacity: 1 },
    { offset: 0.55, transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 46}px) rotate(${mine ? -10 : 10}deg) scale(1.1)` },
    { offset: 0.9, opacity: 1 },
    { transform: `translate(${dx}px, ${dy}px) rotate(${mine ? 4 : -4}deg) scale(${mine ? 1 : 0.55})`, opacity: 0 },
  ], { duration: FLIGHT_MS, delay, easing: 'cubic-bezier(.3,.7,.35,1)', fill: 'both' });
  animation.onfinish = () => el.remove();
  animation.oncancel = () => el.remove();
  return animation;
}

/** A "+2" that pops up from a card counter. */
function popCount(root: HTMLElement, badge: Element, text: string, delay: number): Animation {
  const box = root.getBoundingClientRect();
  const b = badge.getBoundingClientRect();
  const el = document.createElement('span');
  el.className = s.pop;
  el.textContent = text;
  el.style.left = `${b.left - box.left + b.width / 2}px`;
  el.style.top = `${b.top - box.top - 4}px`;
  root.appendChild(el);
  const animation = el.animate([
    { transform: 'translate(-50%, 6px) scale(.6)', opacity: 0 },
    { offset: 0.25, transform: 'translate(-50%, -10px) scale(1.15)', opacity: 1 },
    { transform: 'translate(-50%, -34px) scale(1)', opacity: 0 },
  ], { duration: 1100, delay, easing: 'ease-out', fill: 'both' });
  animation.onfinish = () => el.remove();
  animation.oncancel = () => el.remove();
  return animation;
}

/** The shared Whot! table: opponents across the top, piles in the middle, your hand below. */
export default function WhotTable({ table, now, busy, error, muted, onToggleMute, play, onPlay, onDraw, timed = true, nextLabel, onNext }: Props) {
  const [calling, setCalling] = useState<number | null>(null);
  const mine = table.seats[table.me]?.cards ?? [];
  const myTurn = table.phase === 'play' && table.turn === table.me && !table.winners;
  const topId = table.pile[table.pile.length - 1];
  const top = cardById(topId);
  const name = (seat: number) => (seat === table.me ? 'You' : table.seats[seat]?.name ?? 'Someone');
  // The last few things that happened, newest first, so nobody misses a move.
  const history = [...table.events].reverse().slice(0, 3);
  const callout = freshPlays(table.events, table.step - 1).find(play => play.power);
  const calloutText = callout?.power === 'whot' ? `WHOT! ${SHAPE_NAMES[callout.call!]}` : callout?.power ? CALLOUTS[callout.power] : null;
  const lastPlay = [...table.events].reverse().find((event): event is Extract<WhotEvent, { t: 'play' }> => event.t === 'play');
  const others = table.seats.map((seat, index) => ({ seat, index })).filter(entry => entry.index !== table.me);
  const isPlayable = (id: number) => myTurn && canPlay(cardById(id), top, table.called);
  const anyPlayable = mine.some(isPlayable);
  // Cards you just picked arrive face-up once their flight lands.
  const myDraw = drawPlan(table.events, table.step - 1).find(entry => entry.seat === table.me);
  const arriving = myDraw ? myDraw.count : 0;

  const rootRef = useRef<HTMLDivElement>(null);
  const marketRef = useRef<HTMLSpanElement>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLSpanElement>(null);
  const flownRef = useRef<number | null>(null);

  // Cards fly from the market to whoever picked them up, and the counters pop.
  useEffect(() => {
    const last = flownRef.current;
    flownRef.current = table.step;
    const root = rootRef.current;
    const market = marketRef.current;
    const template = backRef.current;
    if (last === null || table.step <= last || !root || !market || !template || prefersStill()) return;
    const animations: Animation[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const draw of drawPlan(table.events, last)) {
      const mine = draw.seat === table.me;
      const target = mine ? handRef.current : root.querySelector(`[data-seat="${draw.seat}"] [data-fan]`);
      const badge = root.querySelector(mine ? '[data-my-count]' : `[data-seat="${draw.seat}"] [data-count]`);
      if (!target) continue;
      for (let k = 0; k < draw.count; k++) animations.push(flyCard(root, market, target, template, draw.delay + k * CARD_GAP_MS, mine));
      if (badge) animations.push(popCount(root, badge, `+${draw.count}`, draw.delay + draw.count * CARD_GAP_MS + FLIGHT_MS - 200));
      if (mine) timers.push(setTimeout(() => handRef.current?.scrollTo({ left: handRef.current.scrollWidth, behavior: 'smooth' }), draw.delay + FLIGHT_MS));
    }
    return () => { animations.forEach(animation => animation.cancel()); timers.forEach(clearTimeout); };
  }, [table.step, table.events, table.me]);

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

  // Played cards fly in from the seat of whoever played them.
  const landStyle = (() => {
    if (!lastPlay || lastPlay.card !== topId) return { ['--from-x' as string]: '0px', ['--from-y' as string]: '0px' } as CSSProperties;
    if (lastPlay.seat === table.me) return { ['--from-x' as string]: '0px', ['--from-y' as string]: '240px', ['--spin' as string]: '14deg' } as CSSProperties;
    const order = others.findIndex(entry => entry.index === lastPlay.seat);
    const offset = (order - (others.length - 1) / 2) * 190;
    return { ['--from-x' as string]: `${offset}px`, ['--from-y' as string]: '-230px', ['--spin' as string]: '-16deg' } as CSSProperties;
  })();

  return (
    <div className={s.wrap}>
      <div className={s.table} ref={rootRef}>
        {/* Template for flying cards. Kept rendered (not display:none) so its SVG pattern still paints in clones. */}
        <span ref={backRef} aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}><CardBack width={74} /></span>
        <div className={s.opponents}>
          {others.map(({ seat, index }) => (
            <div key={seat.id} data-seat={index} className={`${s.pod} ${table.turn === index && !table.winners ? s.podTurn : ''}`}>
              <div className={s.podHead}>
                <span className={s.avatar} aria-hidden="true">{seat.name.slice(0, 1).toUpperCase()}</span>
                <span className={s.podName}>{seat.name}</span>
                {timed && table.turn === index && table.phase === 'play' && !table.winners && <CountdownRing deadline={table.deadline} seconds={table.turnSeconds} now={now} color="#fde047" />}
              </div>
              {table.turn === index && table.phase === 'play' && !table.winners && <span className={s.thinking}>thinking<span aria-hidden="true">…</span></span>}
              <div className={s.fan} data-fan aria-hidden="true">
                {(seat.cards ?? Array.from({ length: Math.min(seat.count, 8) }, () => -1)).slice(0, 8).map((id, k) => (id >= 0 ? <CardFace key={k} id={id} width={36} /> : <CardBack key={k} width={36} />))}
              </div>
              <div className="flex items-center gap-2">
                <span className={s.count} data-count>{seat.count} card{seat.count === 1 ? '' : 's'}</span>
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
              <span ref={marketRef} className={`${s.marketStack} ${myTurn && !anyPlayable ? s.marketGlow : ''}`}>
                {[0, 1, 2].filter(k => k < Math.max(1, Math.min(3, table.market))).map(k => <span key={k} style={{ transform: `translate(${k * 3}px, ${-k * 3}px)` }}><CardBack width={74} /></span>)}
              </span>
              <span className={s.marketLabel}>Market · {table.market}</span>
            </button>
            <div className={s.pile} role="img" aria-label={`Top card: ${cardLabel(topId)}${table.called ? `, called shape ${SHAPE_NAMES[table.called]}` : ''}`}>
              {table.pile.slice(-3, -1).map((id, k) => <span key={`${id}-${k}`} style={{ transform: `rotate(${k === 0 ? -9 : 6}deg) translate(${k === 0 ? -6 : 5}px, 2px)` }}><CardFace id={id} width={100} /></span>)}
              <span key={`top-${topId}-${lastPlay?.s ?? 0}`} className={s.land} style={landStyle}><CardFace id={topId} width={100} /></span>
              {table.called && <span className={s.called} title={`Called: ${SHAPE_NAMES[table.called]}`}><ShapeGlyph shape={table.called} size={26} /></span>}
            </div>
          </div>
          <ol className={`${s.history} mt-8`} aria-label="What just happened">
            {history.length ? history.map((event, index) => (
              <li key={`${event.s}-${index}-${event.t}`} className={index === 0 ? s.historyNew : s.historyOld} aria-live={index === 0 ? 'polite' : undefined}>{describe(event, name, table.me)}</li>
            )) : <li className={s.historyNew}>{describe(undefined, name, table.me)}</li>}
          </ol>
          {calloutText && <div key={`callout-${table.step}`} className={s.callout} aria-hidden="true">{calloutText}</div>}
        </div>

        <div className={s.me}>
          <div className={s.meBar}>
            <div className="flex items-center gap-2 text-sm font-black">
              <span className={s.avatar} aria-hidden="true">{table.seats[table.me]?.name.slice(0, 1).toUpperCase()}</span>
              <span className={s.myCount} data-my-count aria-label={`You hold ${mine.length} card${mine.length === 1 ? '' : 's'}`}>🃏 {mine.length}</span>
              <span>{myTurn ? (anyPlayable ? 'Your turn: tap a glowing card' : 'No match. Tap the market to draw') : table.winners ? 'Hand over' : `${name(table.turn)}’s turn`}</span>
              {mine.length === 1 && !table.winners && <span className={s.last}>LAST CARD!</span>}
            </div>
            <div className="flex items-center gap-2">
              {table.hands > 1 && <Pips wins={table.wins[table.seats[table.me]?.id] ?? 0} needed={Math.floor(table.hands / 2) + 1} />}
              {timed && myTurn && <CountdownRing deadline={table.deadline} seconds={table.turnSeconds} now={now} color="#fde047" />}
              <MuteButton muted={muted} onToggle={onToggleMute} />
            </div>
          </div>
          <div className={s.hand} ref={handRef} role="group" tabIndex={0} aria-label={`Your hand: ${mine.length} cards`}>
            {mine.map((id, index) => {
              const can = isPlayable(id);
              const fresh = index >= mine.length - arriving ? index - (mine.length - arriving) : -1;
              const arrival = fresh >= 0 && myDraw ? { animationDelay: `${myDraw.delay + fresh * CARD_GAP_MS + FLIGHT_MS - 140}ms` } : undefined;
              return (
                <button key={id} type="button" style={arrival} className={`${s.handCard} ${fresh >= 0 ? s.drawn : ''} ${can ? s.playable : myTurn ? s.blocked : ''}`} disabled={!can || busy}
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
          <div className={`${s.overlay} ${s.late}`} role="dialog" aria-modal="true" aria-labelledby="whot-hand-title">
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
