import test from 'node:test';
import assert from 'node:assert/strict';
import { pocketLife } from '../src/lib/pocket-life';
import { pocketNeighbors, pocketServices, scorePocketBoard, type PocketTile } from '../src/lib/pocket-paradise';

const empty = (): (PocketTile | null)[] => Array(20).fill(null);
const town: PocketTile[] = ['stall', 'home', 'park', 'home', 'stall', 'path', 'path', 'home', 'path', 'path', 'home', 'path', 'path', 'path', 'home', 'park', 'home', 'stall', 'home', 'park'];

test('Visitors follow connected roads to an actual home and shop, never cut across a plot', () => {
  const board = empty();
  board[5] = 'path'; board[6] = 'path'; board[1] = 'home'; board[2] = 'park'; board[0] = 'stall';
  const life = pocketLife(board);
  assert.deepEqual(life.issues, []);
  assert.deepEqual(life.journeys.map(j => [j.destination, j.cells, j.action]), [
    [0, [5, 0], 'shop'], [1, [5, 6, 1], 'arrive-home'],
  ]);
  assert.ok(life.journeys.every(j => !j.newlyServiced));
});

test('Missing connections and service requirements are diagnosed independently', () => {
  const board = empty(); board[6] = 'path'; board[1] = 'home'; board[0] = 'stall';
  assert.equal(pocketLife(board).journeys.length, 0);
  assert.deepEqual(pocketLife(board).issues.map(i => [i.cell, i.reasons]), [
    [0, ['no-gate-access', 'missing-happy-home']], [1, ['no-gate-access', 'missing-park']], [6, ['no-gate-access']],
  ]);
  board[5] = 'path';
  assert.deepEqual(pocketLife(board).issues.map(i => [i.cell, i.reasons]), [
    [0, ['missing-happy-home']], [1, ['missing-park']],
  ]);
  board[2] = 'park';
  assert.equal(pocketLife(board).issues.length, 0);
});

test('Diagonal roads cannot carry visitors, and a blocked gate prevents all journeys', () => {
  const board = empty(); board[5] = 'path'; board[1] = 'path'; board[2] = 'home'; board[3] = 'park';
  assert.equal(pocketLife(board).journeys.length, 0);
  assert.deepEqual(pocketLife(board).issues.find(i => i.cell === 2)?.reasons, ['no-gate-access']);
  const blocked = [...town]; blocked[5] = 'park';
  assert.equal(pocketLife(blocked).journeys.length, 0);
});

test('At most three representative residents appear, newly serviced destinations first', () => {
  const ordinary = pocketLife(town);
  assert.equal(ordinary.journeys.length, 3);
  assert.equal(new Set(ordinary.journeys.map(j => j.tile)).size, 2);
  const before = [...town]; before[19] = 'path';
  const next = pocketLife(town, before);
  assert.equal(next.journeys[0].destination, 14);
  assert.equal(next.journeys[0].newlyServiced, true);
  assert.deepEqual(next, pocketLife(town, before));
  assert.equal(new Set(next.journeys.map(j => j.destination)).size, next.journeys.length);
});

test('Routes take the shortest connected road to the destination, with no wraparound', () => {
  const board = empty();
  for (const cell of [5, 6, 7, 10, 11, 12]) board[cell] = 'path';
  board[8] = 'home'; board[9] = 'park';
  assert.deepEqual(pocketLife(board).journeys[0].cells, [5, 6, 7, 8]);
  board[8] = null; board[4] = 'home';
  assert.equal(pocketLife(board).journeys.length, 0);
});

test('A late bridge activates both resident and shop; model does not mutate boards or scores', () => {
  const before = empty(); before[6] = 'path'; before[1] = 'home'; before[2] = 'park'; before[0] = 'stall';
  const after = [...before]; after[5] = 'path';
  const snapshot = JSON.stringify([before, after]);
  const score = scorePocketBoard(after, 'test', 2);
  const result = pocketLife(after, before);
  assert.ok(result.journeys.every(j => j.newlyServiced));
  assert.equal(JSON.stringify([before, after]), snapshot);
  assert.deepEqual(scorePocketBoard(after, 'test', 2), score);
});

test('Sampled layouts always agree with authoritative services and legal orthogonal routes', () => {
  let seed = 311;
  for (let sample = 0; sample < 300; sample++) {
    const board = empty().map(() => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return ([null, 'home', 'stall', 'park', 'path'] as const)[seed % 5];
    });
    const services = pocketServices(board), result = pocketLife(board);
    assert.ok(result.journeys.length <= 3);
    for (const j of result.journeys) {
      assert.ok((j.tile === 'home' ? services.happyHomes : services.openStalls).includes(j.destination));
      assert.equal(j.cells[0], 5);
      assert.equal(j.cells.at(-1), j.destination);
      j.cells.slice(0, -1).forEach(cell => assert.ok(services.connected.includes(cell)));
      j.cells.slice(1).forEach((cell, i) => assert.ok(pocketNeighbors(j.cells[i]).includes(cell)));
    }
    const troubled = result.issues.filter(i => i.tile !== 'path').map(i => i.cell);
    assert.deepEqual(troubled, services.isolated);
  }
});
