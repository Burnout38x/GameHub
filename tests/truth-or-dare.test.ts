import test from 'node:test';
import assert from 'node:assert/strict';
import { cardText, dealPick, hasPicked, pickPoints, promptKind, TRUTH_OR_DARE_VIBES, type DareKind } from '../src/lib/truth-or-dare';
import { sanitizeSnapshot } from '../src/lib/server/room-snapshot';
import type { Game, Prompt, Room } from '../src/lib/types';

const kinds = new Map<string, DareKind>([['t1', 'truth'], ['t2', 'truth'], ['d1', 'dare'], ['d2', 'dare'], ['r1', 'dare'], ['r2', 'truth']]);

test('a pick deals the next card of that kind from the round deck, then the reserve', () => {
  assert.deepEqual(dealPick(['t1', 'd1', 't2'], 0, [], kinds, 'truth'), { promptIds: ['t1', 'd1', 't2'], reserve: [], fallback: false });
  assert.deepEqual(dealPick(['t1', 'd1', 't2'], 0, [], kinds, 'dare'), { promptIds: ['d1', 't1', 't2'], reserve: [], fallback: false });
  assert.deepEqual(dealPick(['d1', 't1'], 1, ['r1'], kinds, 'dare'), { promptIds: ['d1', 'r1'], reserve: ['t1'], fallback: false });
  // Played rounds are never reused, even when they match.
  assert.deepEqual(dealPick(['d1', 't1'], 1, [], kinds, 'dare'), { promptIds: ['d1', 't1'], reserve: [], fallback: true });
});

test('card kinds, labels and points', () => {
  assert.equal(promptKind({ kind: 'dare' }), 'dare');
  assert.equal(promptKind({ category: 'Dare · Bold' }), 'dare');
  assert.equal(promptKind({ category: 'Truth · Flirty' }), 'truth');
  assert.equal(promptKind({ text: 'Dare: sing' }), 'dare');
  assert.equal(promptKind(null), 'truth');
  assert.equal(cardText('Truth: What is it?'), 'What is it?');
  assert.equal(cardText('dare:Sing'), 'Sing');
  assert.equal(cardText(5), '');
  assert.equal(pickPoints('dare'), 2);
  assert.equal(pickPoints('truth'), 1);
  assert.equal(hasPicked({ pick: { round: 2, kind: 'dare' } }, 2), true);
  assert.equal(hasPicked({ pick: { round: 1, kind: 'dare' } }, 2), false);
  assert.equal(hasPicked({ pick: { round: 2, kind: 'spicy' } }, 2), false);
  assert.equal(TRUTH_OR_DARE_VIBES.easy.adults, false);
  assert.equal(TRUTH_OR_DARE_VIBES.hard.adults && TRUTH_OR_DARE_VIBES.mixed.adults, true);
});

test('snapshots keep the card face down until picked and never expose the reserve', () => {
  const game = { id: 'g', slug: 'truth-or-dare', type: 'prompt', config: { pickTruthOrDare: true } } as unknown as Game;
  const room = { id: 'r', code: 'ABCDEF', current_round: 0, round_phase: 'answering', round_state: { reserve: ['x', 'y'] } } as unknown as Room;
  const prompt = { id: 'p', content: { text: 'Dare: dance', kind: 'dare' } } as unknown as Prompt;
  const hidden = sanitizeSnapshot({ room, game, players: [], answers: [], prompt }, 'u');
  assert.equal(hidden.prompt, null);
  assert.equal('reserve' in hidden.room.round_state, false);
  const picked = sanitizeSnapshot({ room: { ...room, round_state: { ...room.round_state, pick: { round: 0, kind: 'dare' } } }, game, players: [], answers: [], prompt }, 'u');
  assert.equal(picked.prompt?.content.text, 'Dare: dance');
  assert.deepEqual(room.round_state.reserve, ['x', 'y'], 'the stored room is not mutated');
});
