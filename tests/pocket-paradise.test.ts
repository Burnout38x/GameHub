import test from 'node:test';
import assert from 'node:assert/strict';
import { createPocketRun, placePocketTile, pocketNeighbors, pocketOffers, replayPocketRun, scorePocketBoard, validatePocketSave, type PocketTile } from '../src/lib/pocket-paradise';

test('Pocket replay deterministically reconstructs every placement and score', () => {
  let run = createPocketRun('2026-10-06', 'daily');
  for (let cell = 0; cell < 20; cell++) run = placePocketTile(run, { cell, offer: cell % 3 });
  assert.deepEqual(replayPocketRun(run.seed, run.mode, run.moves), run);
  assert.deepEqual(scorePocketBoard(run.board, run.seed), scorePocketBoard(replayPocketRun(run.seed, run.mode, run.moves).board, run.seed));
  assert.throws(() => placePocketTile(run, { cell: 0, offer: 0 }));
});
test('Pocket rejects occupied, out of bounds, fractional and unoffered moves', () => {
  const run = placePocketTile(createPocketRun('test', 'standard'), { cell: 0, offer: 0 });
  for (const move of [{ cell: 0, offer: 1 }, { cell: -1, offer: 0 }, { cell: 20, offer: 0 }, { cell: 1.5, offer: 0 }, { cell: 1, offer: 3 }, { cell: 1, offer: NaN }]) assert.throws(() => placePocketTile(run, move));
});
test('Pocket adjacency does not wrap rows or count diagonals and counts edges once', () => {
  assert.deepEqual(pocketNeighbors(4), [9, 3]);
  const board: (PocketTile | null)[] = Array(20).fill(null);
  board[0] = 'home'; board[1] = 'park'; board[5] = 'park'; board[6] = 'park';
  board[3] = 'stall'; board[4] = 'path'; board[9] = 'path';
  const score = scorePocketBoard(board, 'test');
  assert.equal(score.homes, 4); assert.equal(score.parks, 2); assert.equal(score.stalls, 2); assert.equal(score.paths, 1);
});
test('Pocket save replays history instead of trusting forged boards or totals', () => {
  const run = createPocketRun('test', 'practice');
  assert.deepEqual(validatePocketSave({ ...run, board: Array(20).fill('home'), total: 9000 }), run);
  assert.equal(validatePocketSave({ ...run, moves: [{ cell: 0, offer: 0 }, { cell: 0, offer: 1 }] }), null);
  for (const value of [null, {}, { ...run, seed: '<script>' }, { ...run, mode: 'ranked' }, { ...run, version: 2 }, { ...run, moves: Array(21).fill({ cell: 0, offer: 0 }) }]) assert.equal(validatePocketSave(value), null);
});
test('Pocket offers always contain three distinct valid choices for twenty moves', () => {
  for (let seed = 0; seed < 100; seed++) for (let turn = 0; turn < 20; turn++) {
    const offers = pocketOffers(String(seed), turn);
    assert.equal(offers.length, 3); assert.equal(new Set(offers).size, 3);
    assert.deepEqual(offers, pocketOffers(String(seed), turn));
  }
});
test('Pocket requests grant each bonus only once', () => {
  const board: PocketTile[] = Array.from({ length: 20 }, (_, i) => (['home', 'stall', 'park', 'path'] as const)[i % 4]);
  const score = scorePocketBoard(board, 'test');
  assert.equal(score.bonuses, 20); assert.equal(score.requests.filter(r => r.complete).length, 2);
  assert.equal(score.total, score.homes + score.stalls + score.parks + score.paths + 20);
});
