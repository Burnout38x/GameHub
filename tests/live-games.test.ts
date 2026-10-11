import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bowlEngine, pickQuestions, type BowlState } from '@/lib/bowl/engine';
import { QUESTIONS, questionById } from '@/lib/bowl/bank';
import { SECTION_IDS } from '@/lib/bowl/types';
import { answerPoints, READY_MS, REVEAL_MS, type BowlView } from '@/lib/bowl/view';
import { dilemmaEngine, type DilemmaState } from '@/lib/dilemma/engine';
import { DILEMMAS } from '@/lib/dilemma/bank';
import { TOPIC_IDS } from '@/lib/dilemma/types';
import type { DilemmaView } from '@/lib/dilemma/view';
import { whotEngine, type WhotState } from '@/lib/whot/engine';
import { applyMove, deal, playable, type WhotHand } from '@/lib/whot/game';
import { chooseMove } from '@/lib/whot/bot';
import { DECK, canPlay, cardById, handPoints } from '@/lib/whot/cards';
import type { WhotView } from '@/lib/whot/view';
import { seeded, type LiveUpdate } from '@/lib/live/types';

const P = [{ id: 'ada', name: 'Ada' }, { id: 'bayo', name: 'Bayo' }, { id: 'chi', name: 'Chi' }];
const T0 = 1_000_000;
const ok = <S>(update: LiveUpdate<S>): S => {
  if ('error' in update) throw new Error(update.error);
  return update.state;
};

// ── Content ─────────────────────────────────────────────────────────────

test('the trivia bank is complete, unique and well formed', () => {
  assert.equal(QUESTIONS.length, 256);
  assert.equal(new Set(QUESTIONS.map(q => q.id)).size, QUESTIONS.length);
  for (const section of SECTION_IDS) {
    const levels = [1, 2, 3].map(level => QUESTIONS.filter(q => q.section === section && q.level === level).length);
    assert.deepEqual(levels, [10, 12, 10], section);
  }
  for (const q of QUESTIONS) {
    assert.equal(new Set(q.options.map(option => option.trim().toLowerCase())).size, 4, q.id);
    assert.ok(q.prompt.length <= 160 && q.options.every(option => option.length <= 48), q.id);
  }
});

test('the dilemma bank has twenty distinct situations per topic', () => {
  assert.equal(DILEMMAS.length, 160);
  assert.equal(new Set(DILEMMAS.map(d => d.id)).size, 160);
  assert.equal(new Set(DILEMMAS.map(d => d.scenario)).size, 160);
  for (const topic of TOPIC_IDS) assert.equal(DILEMMAS.filter(d => d.topic === topic).length, 20, topic);
  for (const d of DILEMMAS) assert.equal(new Set(d.options).size, 4, d.id);
});

// ── Brain Bowl ──────────────────────────────────────────────────────────

const bowl = (section: 'mixed' | 'science' = 'mixed', rounds = 8) =>
  ok({ state: bowlEngine.create({ players: P.slice(0, 2), setup: { section }, difficulty: 'mixed', mode: 'classic', rounds, seconds: 20, seed: 42, now: T0 }) as BowlState, changed: true });
const correctOf = (state: BowlState) => state.questions[state.index].order.indexOf(0);

test('a Brain Bowl match ramps from warm-up to champion and mixes sections', () => {
  const picked = pickQuestions('mixed', 'mixed', 16, seeded(7));
  assert.equal(picked.length, 16);
  assert.ok(new Set(picked.map(q => q.section)).size >= 8, 'every section appears');
  for (let i = 1; i < picked.length; i++) assert.ok(picked[i].level >= picked[i - 1].level);
  assert.ok(pickQuestions('science', 'hard', 30, seeded(1)).every(q => q.section === 'science' && q.level >= 2));
  assert.equal(bowlEngine.parseSetup({ section: 'nonsense' }).section, 'mixed');
});

test('questions stay hidden until they go live, and answers until the reveal', () => {
  const state = bowl();
  const early = bowlEngine.view(state, 'ada', T0) as BowlView;
  assert.equal(early.question, null, 'nothing to read during the countdown');
  const live = bowlEngine.view(state, 'ada', T0 + READY_MS) as BowlView;
  assert.ok(live.question && live.question.options.length === 4);
  assert.equal(live.reveal, null);
  assert.doesNotMatch(JSON.stringify(live), /"answer"/);
  assert.ok('error' in bowlEngine.act(state, 'ada', { type: 'answer', question: 0, choice: 0 }, T0 + 100), 'no early answers');
});

test('fast right answers score more, and the round reveals once everyone answers', () => {
  let state = bowl();
  const go = state.startedAt;
  const right = correctOf(state);
  const wrong = (right + 1) % 4;
  state = ok(bowlEngine.act(state, 'ada', { type: 'answer', question: 0, choice: right }, go + 1000));
  assert.equal(state.phase, 'question');
  assert.ok('error' in bowlEngine.act(state, 'ada', { type: 'answer', question: 0, choice: wrong }, go + 1200), 'one answer each');
  state = ok(bowlEngine.act(state, 'bayo', { type: 'answer', question: 0, choice: wrong }, go + 2000));
  assert.equal(state.phase, 'reveal');
  const view = bowlEngine.view(state, 'bayo', go + 2000) as BowlView;
  assert.equal(view.reveal!.answer, right);
  assert.equal(view.standings[0].id, 'ada');
  assert.equal(view.standings[0].points, answerPoints(true, 19_000, 20_000, 0, false));
  assert.equal(view.standings[1].points, 0);
  assert.ok(answerPoints(true, 19_000, 20_000, 0, false) > answerPoints(true, 2_000, 20_000, 0, false), 'speed pays');
  assert.equal(answerPoints(true, 0, 20_000, 2, false), 600, 'a third straight correct answer adds a streak bonus');
  assert.equal(answerPoints(true, 0, 20_000, 0, true), 1000, 'the final question counts double');
});

test('timers move Brain Bowl along and the match settles with the top scorer winning', () => {
  let state = bowl('science', 5);
  for (let round = 0; round < 5; round++) {
    state = ok(bowlEngine.act(state, 'ada', { type: 'answer', question: round, choice: correctOf(state) }, state.startedAt + 500));
    assert.equal(ok(bowlEngine.advance(state, state.startedAt + 600)), state, 'nothing happens before the deadline');
    state = ok(bowlEngine.advance(state, state.deadline + 1));
    assert.equal(state.phase, 'reveal');
    state = ok(bowlEngine.advance(state, state.deadline + 1));
  }
  assert.ok(state.ended);
  const settled = bowlEngine.settle(state)!;
  assert.deepEqual(settled.winners, ['ada']);
  assert.ok(settled.scores.ada > 0 && settled.scores.bayo === 0);
  assert.ok(state.deadline - REVEAL_MS > 0);
});

test('the 50/50 removes two wrong answers once per match', () => {
  let state = bowl();
  const at = state.startedAt + 100;
  state = ok(bowlEngine.act(state, 'ada', { type: 'lifeline', question: 0 }, at));
  const cut = (bowlEngine.view(state, 'ada', at) as BowlView).cut;
  assert.equal(cut.length, 2);
  assert.ok(!cut.includes(correctOf(state)));
  assert.ok('error' in bowlEngine.act(state, 'ada', { type: 'answer', question: 0, choice: cut[0] }, at + 10));
  assert.equal((bowlEngine.view(state, 'bayo', at) as BowlView).cut.length, 0, 'only for the player who used it');
  state = ok(bowlEngine.advance(ok(bowlEngine.advance(state, state.deadline + 1)), Infinity));
  assert.ok('error' in bowlEngine.act(state, 'ada', { type: 'lifeline', question: 1 }, state.startedAt + 10));
});

test('a player leaving Brain Bowl mid-question no longer holds up the reveal', () => {
  let state = bowl();
  state = ok(bowlEngine.act(state, 'ada', { type: 'answer', question: 0, choice: 1 }, state.startedAt + 100));
  state = ok(bowlEngine.remove(state, 'bayo', state.startedAt + 200));
  assert.equal(state.phase, 'reveal');
  assert.deepEqual(state.players.map(p => p.id), ['ada']);
  assert.ok(questionById(state.questions[0].id));
});

// ── What Would You Do? ──────────────────────────────────────────────────

const dilemma = (mode: 'classic' | 'spotlight', rounds = 6) =>
  dilemmaEngine.create({ players: P, setup: { topic: 'love' }, difficulty: 'mixed', mode, rounds, seconds: 45, seed: 9, now: T0 }) as DilemmaState;

test('Read the Room: predicting the favourite scores, and picks stay secret until the reveal', () => {
  let state = dilemma('classic');
  assert.equal(state.mode, 'room');
  assert.ok(state.cards.every(id => id.startsWith('love-')));
  assert.ok('error' in dilemmaEngine.act(state, 'ada', { type: 'pick', round: 0, choice: 0 }, T0), 'a prediction is required');
  state = ok(dilemmaEngine.act(state, 'ada', { type: 'pick', round: 0, choice: 0, guess: 0 }, T0));
  state = ok(dilemmaEngine.act(state, 'bayo', { type: 'pick', round: 0, choice: 0, guess: 2 }, T0));
  const hidden = dilemmaEngine.view(state, 'chi', T0) as DilemmaView;
  assert.equal(hidden.reveal, null);
  assert.deepEqual(hidden.answered.sort(), ['ada', 'bayo']);
  state = ok(dilemmaEngine.act(state, 'chi', { type: 'pick', round: 0, choice: 1, guess: 0 }, T0));
  const view = dilemmaEngine.view(state, 'chi', T0) as DilemmaView;
  assert.deepEqual(view.reveal!.counts, [2, 1, 0, 0]);
  assert.deepEqual(view.reveal!.top, [0]);
  assert.deepEqual(Object.fromEntries(view.standings.map(s => [s.id, s.points])), { ada: 100, chi: 100, bayo: 0 });
});

test('the reveal waits until everyone taps next (or the long timer runs out)', () => {
  let state = dilemma('classic');
  for (const p of P) state = ok(dilemmaEngine.act(state, p.id, { type: 'pick', round: 0, choice: 1, guess: 1 }, T0));
  state = ok(dilemmaEngine.act(state, 'ada', { type: 'next', round: 0 }, T0 + 5));
  assert.equal(state.phase, 'reveal');
  state = ok(dilemmaEngine.act(state, 'bayo', { type: 'next', round: 0 }, T0 + 6));
  state = ok(dilemmaEngine.act(state, 'chi', { type: 'next', round: 0 }, T0 + 7));
  assert.equal(state.index, 1);
  assert.equal(state.phase, 'choose');
  state = ok(dilemmaEngine.advance(state, state.deadline + 1));
  assert.equal(state.phase, 'reveal', 'nobody answered: reveal anyway');
  state = ok(dilemmaEngine.advance(state, state.deadline + 1));
  assert.equal(state.index, 2);
});

test('Hot Seat: guessers score for reading the seat, the seat scores for being read', () => {
  let state = dilemma('spotlight', 7);
  assert.equal(state.mode, 'hotseat');
  assert.equal(state.cards.length % P.length, 0, 'everyone gets equal turns');
  assert.equal((dilemmaEngine.view(state, 'bayo', T0) as DilemmaView).seat, 'ada');
  assert.ok('error' in dilemmaEngine.act(state, 'ada', { type: 'pick', round: 0, guess: 1 }, T0), 'the seat must choose');
  state = ok(dilemmaEngine.act(state, 'ada', { type: 'pick', round: 0, choice: 3 }, T0));
  state = ok(dilemmaEngine.act(state, 'bayo', { type: 'pick', round: 0, guess: 3 }, T0));
  state = ok(dilemmaEngine.act(state, 'chi', { type: 'pick', round: 0, guess: 0 }, T0));
  const points = Object.fromEntries(state.standings.map(s => [s.id, s.points]));
  assert.deepEqual(points, { ada: 50, bayo: 100, chi: 0 });
  // The seat leaving mid-round skips the round.
  for (const p of P) state = ok(dilemmaEngine.act(state, p.id, { type: 'next', round: 0 }, T0));
  assert.equal(dilemmaEngine.view(state, 'ada', T0) && (dilemmaEngine.view(state, 'ada', T0) as DilemmaView).seat, 'bayo');
  state = ok(dilemmaEngine.remove(state, 'bayo', T0 + 1));
  assert.equal(state.index, 2);
  assert.deepEqual(dilemmaEngine.settle({ ...state, ended: true })!.winners, ['ada']);
});

// ── Whot! ───────────────────────────────────────────────────────────────

const card = (suit: string, value: number) => DECK.find(c => c.suit === suit && c.value === value)!.id;
/** A hand with chosen cards: seat 0 holds `mine`, seat 1 holds `theirs`, `top` starts the pile. */
function rigged(mine: number[], theirs: number[], top: number, market = 20, seats = 2): WhotHand {
  const used = new Set([...mine, ...theirs, top]);
  const rest = DECK.map(c => c.id).filter(id => !used.has(id));
  const others = Array.from({ length: seats - 2 }, (_, i) => rest.slice(market + i * 5, market + i * 5 + 5));
  return {
    seats: [{ id: 'ada', name: 'Ada', hand: mine }, { id: 'bayo', name: 'Bayo', hand: theirs }, ...others.map((hand, i) => ({ id: `x${i}`, name: 'X', hand }))],
    market: rest.slice(0, market), pile: [top], turn: 0, called: null, step: 0, events: [], winners: null, tender: null, seed: 5, refills: 0,
  };
}
const play = (hand: WhotHand, seat: number, cardId: number, call?: 'circle' | 'star') => {
  const result = applyMove(hand, seat, { type: 'play', card: cardId, ...(call ? { call } : {}) });
  if ('error' in result) throw new Error(result.error);
  return result;
};

test('the Whot deck has 54 cards and matching follows shape or number', () => {
  assert.equal(DECK.length, 54);
  assert.equal(DECK.filter(c => c.suit === 'whot').length, 5);
  assert.ok(canPlay(cardById(card('circle', 3)), cardById(card('square', 3)), null));
  assert.ok(canPlay(cardById(card('circle', 3)), cardById(card('circle', 13)), null));
  assert.ok(!canPlay(cardById(card('circle', 3)), cardById(card('square', 13)), null));
  assert.ok(canPlay(cardById(card('whot', 20)), cardById(card('square', 13)), null));
  assert.equal(handPoints([card('star', 7), card('circle', 4)]), 18, 'stars count double in a tender');
  const fresh = deal(P, 3);
  assert.equal(fresh.seats.every(seat => seat.hand.length === 5), true);
  assert.equal(fresh.market.length + fresh.pile.length + 15, 54);
});

test('special cards: hold on, pick two, pick three, suspension and general market', () => {
  let hand = play(rigged([card('circle', 1), card('circle', 3)], [card('square', 7)], card('circle', 10)), 0, card('circle', 1));
  assert.equal(hand.turn, 0, 'Hold On: play again');
  hand = play(rigged([card('circle', 2), card('circle', 3)], [card('square', 7)], card('circle', 10)), 0, card('circle', 2));
  assert.equal(hand.seats[1].hand.length, 3, 'Pick Two');
  assert.equal(hand.turn, 0, 'and they miss their turn');
  hand = play(rigged([card('circle', 5), card('circle', 3)], [card('square', 7)], card('circle', 10)), 0, card('circle', 5));
  assert.equal(hand.seats[1].hand.length, 4, 'Pick Three');
  hand = play(rigged([card('circle', 8), card('circle', 3)], [card('square', 7)], card('circle', 10), 20, 3), 0, card('circle', 8));
  assert.equal(hand.turn, 2, 'Suspension skips the next player');
  hand = play(rigged([card('circle', 14), card('circle', 3)], [card('square', 7)], card('circle', 10), 20, 3), 0, card('circle', 14));
  assert.deepEqual(hand.seats.map(s => s.hand.length), [1, 2, 6], 'General Market: everyone else picks one');
  assert.equal(hand.turn, 0, 'and you go again');
});

test('a Whot card calls a shape; the last card checks up and wins', () => {
  const start = rigged([card('whot', 20), card('star', 3)], [card('circle', 4), card('square', 7)], card('cross', 10));
  assert.ok('error' in applyMove(start, 0, { type: 'play', card: card('whot', 20) }), 'a call is required');
  let hand = play(start, 0, card('whot', 20), 'circle');
  assert.equal(hand.called, 'circle');
  assert.deepEqual(playable(hand, 1), [card('circle', 4)]);
  assert.ok('error' in applyMove(hand, 1, { type: 'play', card: card('square', 7) }));
  hand = play(hand, 1, card('circle', 4));
  assert.equal(hand.called, null);
  assert.ok('error' in applyMove(hand, 1, { type: 'draw' }), 'not your turn');
  const finish = play(rigged([card('star', 3)], [card('circle', 4)], card('star', 7)), 0, card('star', 3));
  assert.deepEqual(finish.winners, [0]);
  assert.deepEqual(finish.events.at(-1), { t: 'win', seat: 0, how: 'checkup' });
});

test('an empty market reshuffles once, then the hand ends in a tender count', () => {
  let hand = rigged([card('circle', 3), card('square', 13)], [card('star', 4)], card('cross', 10), 1);
  hand = { ...hand, pile: [card('cross', 11), card('cross', 10)] };
  hand = ok({ state: applyMove(hand, 0, { type: 'draw' }) as WhotHand, changed: true });
  assert.equal(hand.refills, 1, 'the pile became the market');
  assert.equal(hand.pile.length, 1);
  assert.ok(hand.events.some(event => event.t === 'shuffle'));
  hand = { ...hand, market: [], turn: 1 };
  hand = applyMove(hand, 1, { type: 'draw' }) as WhotHand;
  assert.ok(hand.tender && hand.winners);
  assert.deepEqual(hand.winners, [1], 'Bayo holds the fewest points');
});

test('bots always finish a hand without losing or inventing cards', () => {
  for (let game = 0; game < 300; game++) {
    const seats = 2 + (game % 3);
    let hand = deal(P.concat({ id: 'dee', name: 'Dee' }).slice(0, seats), game);
    const random = seeded(game);
    for (let step = 0; !hand.winners; step++) {
      assert.ok(step < 500, 'hand finished');
      const next = applyMove(hand, hand.turn, chooseMove(hand, hand.turn, ((game % 3) + 1) as 1 | 2 | 3, random));
      assert.ok(!('error' in next));
      hand = next as WhotHand;
      assert.equal(hand.market.length + hand.pile.length + hand.seats.reduce((sum, seat) => sum + seat.hand.length, 0), 54);
    }
  }
});

test('online Whot: only your own cards are visible, slow players go to market, best of three', () => {
  let state = whotEngine.create({ players: P.slice(0, 2), setup: {}, difficulty: 'mixed', mode: 'classic', rounds: 3, seconds: 30, seed: 11, now: T0 }) as WhotState;
  const view = whotEngine.view(state, 'ada', T0) as WhotView;
  assert.equal(view.seats[0].cards?.length, 5);
  assert.equal(view.seats[1].cards, null, 'opponent hand hidden');
  assert.equal(view.seats[1].count, 5);
  assert.ok('error' in whotEngine.act(state, 'bayo', { type: 'draw', step: 0 }, T0), 'not your turn');
  assert.ok('error' in whotEngine.act(state, 'ada', { type: 'draw', step: 9 }, T0), 'stale step');
  state = ok(whotEngine.advance(state, state.deadline + 1));
  assert.equal(state.deal.seats[0].hand.length, 6, 'timed out: picked from market');
  assert.equal(state.deal.turn, 1);
  // Play the hands out with bots until the match is decided.
  const random = seeded(4);
  for (let guard = 0; !state.ended && guard < 2000; guard++) {
    if (state.phase === 'between') { state = ok(whotEngine.advance(state, state.deadline + 1)); continue; }
    const seat = state.deal.turn;
    state = ok(whotEngine.act(state, state.deal.seats[seat].id, { ...chooseMove(state.deal, seat, 2, random), step: state.deal.step }, T0));
  }
  assert.ok(state.ended);
  const settled = whotEngine.settle(state)!;
  assert.equal(Math.max(...Object.values(settled.scores)), 2, 'first to two hands');
  assert.equal(settled.winners.length, 1);
});

test('leaving Whot returns the cards to the market and passes the turn on', () => {
  const players = P.concat({ id: 'dee', name: 'Dee' });
  let state = whotEngine.create({ players, setup: {}, difficulty: 'mixed', mode: 'classic', rounds: 1, seconds: 30, seed: 2, now: T0 }) as WhotState;
  const market = state.deal.market.length;
  state = ok(whotEngine.remove(state, 'ada', T0));
  assert.equal(state.deal.seats.length, 3);
  assert.equal(state.deal.market.length, market + 5);
  assert.equal(state.deal.seats[state.deal.turn].id, 'bayo');
  state = ok(whotEngine.remove(ok(whotEngine.remove(state, 'bayo', T0)), 'chi', T0));
  assert.ok(state.ended, 'one player left ends the match');
});

// ── Review fixes ────────────────────────────────────────────────────────

test('Brain Bowl leaderboard points are one per right answer, like the other quizzes', () => {
  let state = bowl('science', 5);
  for (let round = 0; round < 5; round++) {
    state = ok(bowlEngine.act(state, 'ada', { type: 'answer', question: round, choice: correctOf(state) }, state.startedAt + 100));
    state = ok(bowlEngine.advance(ok(bowlEngine.advance(state, state.deadline + 1)), Infinity));
  }
  assert.deepEqual(bowlEngine.settle(state)!.scores, { ada: 5, bayo: 0 });
  assert.ok(bowlEngine.progressed(state));
});

test('Hot Seat keeps the same seat when someone else leaves mid-round', () => {
  let state = dilemma('spotlight', 6);
  for (const p of P) state = ok(dilemmaEngine.act(state, p.id, { type: 'pick', round: 0, ...(p.id === 'ada' ? { choice: 1 } : { guess: 1 }) }, T0));
  for (const p of P) state = ok(dilemmaEngine.act(state, p.id, { type: 'next', round: 0 }, T0));
  assert.equal(state.seat, 'bayo');
  state = ok(dilemmaEngine.act(state, 'bayo', { type: 'pick', round: 1, choice: 2 }, T0));
  state = ok(dilemmaEngine.remove(state, 'ada', T0));
  assert.equal(state.seat, 'bayo', 'the seat did not move');
  state = ok(dilemmaEngine.act(state, 'chi', { type: 'pick', round: 1, guess: 2 }, T0));
  assert.equal(state.phase, 'reveal', 'the round finishes instead of stalling');
});

test('a Whot leaver between hands keeps the result pointing at the right seats', () => {
  const players = P.concat({ id: 'dee', name: 'Dee' });
  let state = whotEngine.create({ players, setup: {}, difficulty: 'mixed', mode: 'classic', rounds: 3, seconds: 30, seed: 8, now: T0 }) as WhotState;
  state = { ...state, phase: 'between', deal: { ...state.deal, winners: [2], tender: [10, 20, 5, 30] } };
  state = ok(whotEngine.remove(state, 'ada', T0));
  assert.deepEqual(state.deal.winners, [1]);
  assert.equal(state.deal.seats[1].id, 'chi');
  assert.deepEqual(state.deal.tender, [20, 5, 30]);
  const before = state.deal.step;
  state = ok(whotEngine.advance(state, Infinity));
  assert.ok(state.deal.step > before, 'move numbers never repeat across hands');
});
