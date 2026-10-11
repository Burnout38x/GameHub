import { seeded, shuffled } from '@/lib/live/types';
import { canPlay, cardById, DECK, HAND_SIZE, handPoints, powerOf, type Power, type Shape } from './cards';

/** One hand of Whot!. Pure: every move returns a new hand. */

export interface Seat { id: string; name: string; hand: number[]; bot?: boolean }

export type WhotEvent =
  | { t: 'play'; seat: number; card: number; call?: Shape; power: Power | null }
  | { t: 'draw'; seat: number; count: number; reason: 'market' | 'pick' | 'general' }
  | { t: 'skip'; seat: number }
  | { t: 'last'; seat: number }
  | { t: 'shuffle' }
  | { t: 'win'; seat: number; how: 'checkup' | 'tender' };

export interface WhotHand {
  seats: Seat[];
  market: number[];
  /** Played cards, the top card last. */
  pile: number[];
  turn: number;
  called: Shape | null;
  /** Increases with every move, so screens can animate each one exactly once. */
  step: number;
  events: WhotEvent[];
  winners: number[] | null;
  /** Card points when the market ran dry for good (only for a tender finish). */
  tender: number[] | null;
  seed: number;
  /** The played pile is reshuffled into the market once; the next time it runs dry, it's tender. */
  refills: number;
}

export type WhotMove = { type: 'play'; card: number; call?: Shape } | { type: 'draw' };

const next = (hand: WhotHand, from: number, by = 1) => (from + by) % hand.seats.length;

/** Deals a hand: five cards each, and a plain number card to start the pile. */
export function deal(players: { id: string; name: string; bot?: boolean }[], seed: number, first = 0, step = 0): WhotHand {
  const deck = shuffled(DECK.map(card => card.id), seeded(seed));
  const seats = players.map((player, index) => ({ ...player, hand: deck.slice(index * HAND_SIZE, (index + 1) * HAND_SIZE) }));
  const rest = deck.slice(players.length * HAND_SIZE);
  // The opening card must not be special, so nobody starts the hand punished.
  const start = rest.findIndex(id => powerOf(cardById(id)) === null);
  const pile = [rest[start]];
  const market = [...rest.slice(0, start), ...rest.slice(start + 1)];
  return { seats, market, pile, turn: first % seats.length, called: null, step, events: [], winners: null, tender: null, seed, refills: 0 };
}

export const topCard = (hand: WhotHand) => cardById(hand.pile[hand.pile.length - 1]);

export function playable(hand: WhotHand, seat: number): number[] {
  const top = topCard(hand);
  return hand.seats[seat].hand.filter(id => canPlay(cardById(id), top, hand.called));
}

/** Draws up to `count` cards for a seat (fewer if the market runs out). */
function draw(hand: WhotHand, seat: number, count: number): { hand: WhotHand; drawn: number } {
  const drawn = Math.min(count, hand.market.length);
  const taken = hand.market.slice(0, drawn);
  const seats = hand.seats.map((entry, index) => (index === seat ? { ...entry, hand: [...entry.hand, ...taken] } : entry));
  return { hand: { ...hand, seats, market: hand.market.slice(drawn) }, drawn };
}

/** The market is empty: whoever holds the fewest points wins ("tender"). */
function tenderFinish(hand: WhotHand, events: WhotEvent[]): WhotHand {
  const totals = hand.seats.map(seat => handPoints(seat.hand));
  const best = Math.min(...totals);
  const winners = totals.flatMap((total, index) => (total === best ? [index] : []));
  return { ...hand, winners, tender: totals, events: [...events, ...winners.map((seat): WhotEvent => ({ t: 'win', seat, how: 'tender' }))] };
}

function finishStep(hand: WhotHand, events: WhotEvent[]): WhotHand {
  return { ...hand, step: hand.step + 1, events: events.slice(-12) };
}

function tendered(hand: WhotHand, events: WhotEvent[]): WhotHand {
  const done = tenderFinish(hand, events);
  return finishStep(done, done.events);
}

export const MAX_REFILLS = 1;

/** Turns the played pile (all but the top card) into a fresh market, if allowed. */
function restock(hand: WhotHand, events: WhotEvent[]): WhotHand | null {
  if (hand.refills >= MAX_REFILLS || hand.pile.length < 2) return null;
  const top = hand.pile[hand.pile.length - 1];
  const market = [...hand.market, ...shuffled(hand.pile.slice(0, -1), seeded((hand.seed + hand.step * 7919) >>> 0))];
  events.push({ t: 'shuffle' });
  return { ...hand, market, pile: [top], refills: hand.refills + 1 };
}

/** Makes sure `need` cards are available, reshuffling the pile if the market is short. */
const stocked = (hand: WhotHand, need: number, events: WhotEvent[]): WhotHand =>
  (hand.market.length >= need ? hand : restock(hand, events) ?? hand);

/** After a move: an empty market is restocked once, then the hand ends in a tender count. */
function settle(hand: WhotHand, events: WhotEvent[]): WhotHand {
  if (hand.market.length) return finishStep(hand, events);
  const refilled = restock(hand, events);
  return refilled ? finishStep(refilled, events) : tendered(hand, events);
}

export function applyMove(hand: WhotHand, seat: number, move: WhotMove): WhotHand | { error: string } {
  if (hand.winners) return { error: 'This hand is over.' };
  if (seat !== hand.turn) return { error: 'It is not your turn.' };
  const me = hand.seats[seat];
  const events: WhotEvent[] = [...hand.events];

  if (move.type === 'draw') {
    const ready = stocked(hand, 1, events);
    if (!ready.market.length) return tendered(ready, events);
    const result = draw(ready, seat, 1);
    events.push({ t: 'draw', seat, count: result.drawn, reason: 'market' });
    return settle({ ...result.hand, turn: next(hand, seat) }, events);
  }

  const card = cardById(move.card);
  if (!card || !me.hand.includes(move.card)) return { error: 'That card is not in your hand.' };
  if (!canPlay(card, topCard(hand), hand.called)) return { error: 'That card does not match the top card.' };
  const power = powerOf(card);
  if (power === 'whot' && (!move.call || !['circle', 'triangle', 'cross', 'square', 'star'].includes(move.call))) return { error: 'Call a shape for your Whot card.' };

  let after: WhotHand = {
    ...hand,
    seats: hand.seats.map((entry, index) => (index === seat ? { ...entry, hand: entry.hand.filter(id => id !== move.card) } : entry)),
    pile: [...hand.pile, move.card],
    called: power === 'whot' ? move.call! : null,
  };
  events.push({ t: 'play', seat, card: move.card, power, ...(power === 'whot' ? { call: move.call } : {}) });

  // Check up: the last card wins the hand, whatever it was.
  if (!after.seats[seat].hand.length) {
    events.push({ t: 'win', seat, how: 'checkup' });
    return finishStep({ ...after, winners: [seat] }, events);
  }
  if (after.seats[seat].hand.length === 1) events.push({ t: 'last', seat });

  const victim = next(after, seat);
  switch (power) {
    case 'hold':
      after = { ...after, turn: seat };
      break;
    case 'pick2':
    case 'pick3': {
      const count = power === 'pick2' ? 2 : 3;
      const result = draw(stocked(after, count, events), victim, count);
      events.push({ t: 'draw', seat: victim, count: result.drawn, reason: 'pick' });
      after = { ...result.hand, turn: next(after, victim) };
      break;
    }
    case 'suspend':
      events.push({ t: 'skip', seat: victim });
      after = { ...after, turn: next(after, victim) };
      break;
    case 'market': {
      after = stocked(after, after.seats.length - 1, events);
      for (let offset = 1; offset < after.seats.length; offset++) {
        const target = next(after, seat, offset);
        const result = draw(after, target, 1);
        if (result.drawn) events.push({ t: 'draw', seat: target, count: result.drawn, reason: 'general' });
        after = result.hand;
      }
      after = { ...after, turn: seat };
      break;
    }
    default:
      after = { ...after, turn: victim };
  }
  return settle(after, events);
}
