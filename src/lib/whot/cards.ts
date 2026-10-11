/** Whot! deck, rules and helpers. Pure and client-safe: used by the server, the bots and solo play. */

export type Shape = 'circle' | 'triangle' | 'cross' | 'square' | 'star';
export type Suit = Shape | 'whot';
export interface Card { id: number; suit: Suit; value: number }

export const SHAPES: Shape[] = ['circle', 'triangle', 'cross', 'square', 'star'];
export const SHAPE_NAMES: Record<Suit, string> = { circle: 'Circle', triangle: 'Triangle', cross: 'Cross', square: 'Square', star: 'Star', whot: 'Whot' };

/** The standard 54-card Nigerian Whot deck. */
const DECK_SPEC: [Suit, number[]][] = [
  ['circle', [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14]],
  ['triangle', [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14]],
  ['cross', [1, 2, 3, 5, 7, 10, 11, 13, 14]],
  ['square', [1, 2, 3, 5, 7, 10, 11, 13, 14]],
  ['star', [1, 2, 3, 4, 5, 7, 8]],
  ['whot', [20, 20, 20, 20, 20]],
];

export const DECK: Card[] = DECK_SPEC.flatMap(([suit, values]) => values.map(value => ({ suit, value }))).map((card, id) => ({ id, ...card }));
export const cardById = (id: number): Card => DECK[id];

export type Power = 'hold' | 'pick2' | 'pick3' | 'suspend' | 'market' | 'whot';
/** Special cards: 1 Hold On, 2 Pick Two, 5 Pick Three, 8 Suspension, 14 General Market, 20 Whot. */
export function powerOf(card: Card): Power | null {
  if (card.suit === 'whot') return 'whot';
  switch (card.value) {
    case 1: return 'hold';
    case 2: return 'pick2';
    case 5: return 'pick3';
    case 8: return 'suspend';
    case 14: return 'market';
    default: return null;
  }
}

export const POWER_NAMES: Record<Power, string> = {
  hold: 'Hold On', pick2: 'Pick Two', pick3: 'Pick Three', suspend: 'Suspension', market: 'General Market', whot: 'Whot!',
};
export const POWER_HELP: Record<Power, string> = {
  hold: 'Play again straight away.',
  pick2: 'The next player picks two cards and misses their turn.',
  pick3: 'The next player picks three cards and misses their turn.',
  suspend: 'The next player misses a turn.',
  market: 'Everyone else picks one card from the market; you play again.',
  whot: 'Wild card: play it on anything and call the shape you want next.',
};

/** Whot's tender count when the market runs dry: stars count double, Whot cards count 20. */
export const cardPoints = (card: Card): number => (card.suit === 'star' ? card.value * 2 : card.value);
export const handPoints = (hand: number[]): number => hand.reduce((sum, id) => sum + cardPoints(cardById(id)), 0);

/** Can `card` go on `top` (with a called shape after a Whot)? */
export function canPlay(card: Card, top: Card, called: Shape | null): boolean {
  if (card.suit === 'whot') return true;
  if (top.suit === 'whot') return called === null || card.suit === called;
  return card.suit === top.suit || card.value === top.value;
}

export const HAND_SIZE = 5;
