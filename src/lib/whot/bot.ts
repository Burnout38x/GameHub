import { cardById, cardPoints, powerOf, SHAPES, type Shape } from './cards';
import { playable, type WhotHand, type WhotMove } from './game';

/** The Machine's Whot! player. Level 1 plays loosely; level 3 counts cards and punishes. */
export type BotLevel = 1 | 2 | 3;

/** The shape the bot holds most of, so a Whot call keeps its own options open. */
export function bestCall(hand: number[], random: () => number): Shape {
  const counts = SHAPES.map(shape => hand.filter(id => cardById(id).suit === shape).length);
  const best = Math.max(...counts);
  const options = SHAPES.filter((_, index) => counts[index] === best);
  return options[Math.floor(random() * options.length)];
}

export function chooseMove(hand: WhotHand, seat: number, level: BotLevel, random: () => number): WhotMove {
  const options = playable(hand, seat);
  if (!options.length) return { type: 'draw' };
  const mine = hand.seats[seat].hand;
  if (level === 1 && random() < 0.45) {
    const card = options[Math.floor(random() * options.length)];
    return powerOf(cardById(card)) === 'whot' ? { type: 'play', card, call: bestCall(mine.filter(id => id !== card), random) } : { type: 'play', card };
  }
  const nextSeat = (seat + 1) % hand.seats.length;
  const danger = hand.seats[nextSeat].hand.length <= (level === 3 ? 3 : 2);
  const suitCount = (suit: string) => mine.filter(id => cardById(id).suit === suit).length;
  const scored = options.map(id => {
    const card = cardById(id);
    const power = powerOf(card);
    let score = cardPoints(card) * 0.4 + suitCount(card.suit) * 2;
    if (power === 'whot') score = mine.length === 1 ? 100 : -30; // keep the joker for emergencies
    if (power === 'hold' || power === 'market') score += mine.length > 1 ? 14 : 0; // free extra move
    if (power === 'pick2') score += danger ? 30 : 10;
    if (power === 'pick3') score += danger ? 36 : 12;
    if (power === 'suspend') score += danger ? 24 : 6;
    if (level === 3 && hand.market.length < 6) score += cardPoints(card); // shed points before a tender count
    return { id, score: score + random() * (level === 3 ? 1 : 4) };
  });
  const card = scored.sort((a, b) => b.score - a.score)[0].id;
  if (powerOf(cardById(card)) === 'whot') return { type: 'play', card, call: bestCall(mine.filter(id => id !== card), random) };
  return { type: 'play', card };
}
