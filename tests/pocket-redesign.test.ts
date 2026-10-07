import test from 'node:test';
import assert from 'node:assert/strict';
import { createPocketRun, placePocketTile, pocketOffers, pocketServices, scorePocketBoard, replayPocketRun, validatePocketSave, POCKET_TILES, POCKET_GATE, type PocketRun, type PocketTile } from '../src/lib/pocket-paradise';

const GOLD: PocketTile[] = ['stall','home','park','home','stall','path','path','home','path','path','home','path','path','path','home','park','home','stall','home','park'];
const SILVER = [...GOLD]; SILVER[0] = 'home'; SILVER[1] = 'stall';
const BRONZE = [...GOLD]; BRONZE[12] = 'stall';
const empty = (): (PocketTile | null)[] => Array(20).fill(null);
const score = (board: (PocketTile | null)[]) => scorePocketBoard(board, 'rules', 2);

/** Only this turn and the visible next delivery are consulted. Layout, not hindsight, does the work. */
function planned(seed: string, blueprint = GOLD): PocketRun {
  let run = createPocketRun(seed, 'practice', 2);
  for (let turn = 0; turn < 20; turn++) {
    const offers = pocketOffers(seed, turn, 2), next = pocketOffers(seed, turn + 1, 2);
    const need = Object.fromEntries(POCKET_TILES.map(tile => [tile, blueprint.filter((v, i) => v === tile && !run.board[i]).length]));
    const available = offers.filter(tile => need[tile] > 0).sort((a, b) => need[b] - need[a] + (!next.includes(b) ? .5 : 0) - (!next.includes(a) ? .5 : 0));
    if (available.length) {
      const tile = available[0];
      const cells = blueprint.flatMap((v, i) => v === tile && !run.board[i] ? [i] : []).sort((a, b) => (b === POCKET_GATE ? 100 : 0) - (a === POCKET_GATE ? 100 : 0));
      run = placePocketTile(run, { cell: cells[0], offer: offers.indexOf(tile) });
    } else run = greedy(run);
  }
  return run;
}
function greedy(run: PocketRun): PocketRun {
  let best = -Infinity, result = run;
  for (let cell = 0; cell < 20; cell++) if (!run.board[cell]) for (let offer = 0; offer < 3; offer++) {
    const next = placePocketTile(run, { cell, offer });
    const value = score(next.board).total;
    if (value > best) { best = value; result = next; }
  }
  return result;
}

test('Gate access is an orthogonal network; a late bridge activates residents and their stall', () => {
  const board = empty(); board[6] = 'path'; board[1] = 'home'; board[2] = 'park'; board[0] = 'stall';
  assert.deepEqual(pocketServices(board), { connected: [], happyHomes: [], openStalls: [], isolated: [0, 1] });
  board[POCKET_GATE] = 'path';
  assert.deepEqual(pocketServices(board), { connected: [5, 6], happyHomes: [1], openStalls: [0], isolated: [] });
  assert.equal(score(board).total, 13);
  board[POCKET_GATE] = 'park';
  assert.equal(score(board).happyHomes.length, 0);
  assert.equal(score(board).openStalls.length, 0);
});

test('Road access and park access are both required; open stalls also need a happy neighbor', () => {
  const board = empty(); board[5] = 'path'; board[6] = 'path'; board[1] = 'home'; board[0] = 'stall';
  assert.equal(score(board).homes, 0); assert.equal(score(board).stalls, 0);
  board[2] = 'park';
  assert.equal(score(board).homes, 6); assert.equal(score(board).stalls, 5);
  board[10] = 'stall'; // Has a road, but no adjacent happy home.
  assert.equal(score(board).stalls, 5);
  board[7] = 'park'; // Diagonal park does not substitute for the adjacent one.
  board[2] = null;
  assert.equal(score(board).homes, 0);
});

test('A scarce plot creates mutually exclusive access and green-space choices', () => {
  const base = empty(); base[5] = 'path'; base[6] = 'path'; base[1] = 'home'; base[3] = 'path'; base[4] = 'home'; base[9] = 'park';
  const garden = [...base]; garden[2] = 'park';
  const road = [...base]; road[2] = 'path';
  assert.deepEqual(score(garden).happyHomes, [1]);
  // Row 1 col 3 cannot connect diagonally to row 2 col 2.
  assert.equal(score(road).happyHomes.length, 0);
  const bridge = [...base]; bridge[7] = 'path'; bridge[2] = 'path';
  assert.deepEqual(score(bridge).happyHomes, [4]);
  assert.equal(bridge[2], 'path'); assert.equal(garden[2], 'park');
});

test('The only gate cannot be substituted by a nearby or diagonal path', () => {
  for (const nearby of [0, 6, 10, 11]) { const board = empty(); board[nearby] = 'path'; assert.deepEqual(score(board).connected, []); }
  const board = empty(); board[5] = 'path'; board[1] = 'path'; board[4] = 'path'; board[9] = 'path';
  assert.deepEqual(score(board).connected, [5]);
});

test('Charter failure cannot buy a medal with decorative park points; all three tiers are earned', () => {
  const failure = score(Array(20).fill('park'));
  assert.equal(failure.total, 31); assert.equal(failure.won, false); assert.equal(failure.medal, 'none');
  for (const [board, medal, total] of [[BRONZE, 'bronze', 37], [SILVER, 'silver', 53], [GOLD, 'gold', 64]] as const) {
    const result = score(board);
    assert.equal(result.medal, medal); assert.equal(result.won, true); assert.equal(result.total, total);
    assert.equal(result.total, result.homes + result.stalls + result.paths + result.parks);
    assert.equal(result.bonuses, 0);
  }
  const noCharter = [...GOLD]; noCharter[0] = 'home'; noCharter[4] = 'home';
  assert.ok(score(noCharter).total >= 36); assert.equal(score(noCharter).won, false);
});

test('Classic saves replay original offers and scores, while new saves carry their explicit rule version', () => {
  const legacy = createPocketRun('compatibility', 'standard');
  const next = placePocketTile(legacy, { cell: 0, offer: 0 });
  assert.equal(next.rulesVersion, undefined); assert.deepEqual(validatePocketSave(next), next);
  const oldBoard = empty(); oldBoard[0] = 'home'; oldBoard[1] = 'park'; oldBoard[5] = 'park';
  assert.equal(scorePocketBoard(oldBoard, 'compatibility').homes, 4);
  assert.equal(scorePocketBoard(oldBoard, 'compatibility', 2).homes, 0);
  const modern = planned('new-rules');
  assert.equal(modern.rulesVersion, 2);
  assert.deepEqual(replayPocketRun(modern.seed, modern.mode, modern.moves, 2), modern);
  assert.deepEqual(validatePocketSave({ ...modern, board: Array(20).fill('park'), total: 9999 }), modern);
  assert.equal(validatePocketSave({ ...modern, rulesVersion: 3 }), null);
  assert.equal(validatePocketSave({ ...modern, rulesVersion: 1 }), null);
  assert.throws(() => replayPocketRun('new-rules', 'practice', [...modern.moves, { cell: 0, offer: 0 }], 2));
  assert.throws(() => placePocketTile(modern, { cell: 0, offer: 0 }));
});

test('Bounded strategy simulation: 200 seeds support planned charters; immediate points do not solve the objective', () => {
  let plannedWins = 0, golds = 0, greedyWins = 0;
  for (let seed = 0; seed < 200; seed++) {
    const plannedRun = planned(`simulation-${seed}`);
    const plannedScore = score(plannedRun.board);
    plannedWins += Number(plannedScore.won); golds += Number(plannedScore.medal === 'gold');
    assert.deepEqual(replayPocketRun(plannedRun.seed, plannedRun.mode, plannedRun.moves, 2), plannedRun);
    let greedyRun = createPocketRun(`simulation-${seed}`, 'practice', 2);
    for (let turn = 0; turn < 20; turn++) greedyRun = greedy(greedyRun);
    greedyWins += Number(score(greedyRun.board).won);
  }
  assert.equal(plannedWins, 200); assert.equal(golds, 198); assert.equal(greedyWins, 9);
});

test('Several distinct layouts and actual offered moves attain different medals', () => {
  for (const [blueprint, medal] of [[BRONZE, 'bronze'], [SILVER, 'silver'], [GOLD, 'gold']] as const) {
    const run = planned('pocket-medals', [...blueprint]);
    assert.deepEqual(run.board, blueprint);
    assert.equal(score(run.board).medal, medal);
  }
});


test('Modern offers avalanche the whole seed into genuinely varied deliveries; legacy sequences stay stable', () => {
  const modern = new Set<string>(), legacy = new Set<string>();
  for (let seed = 0; seed < 100; seed++) {
    modern.add(Array.from({ length: 20 }, (_, turn) => pocketOffers(String(seed), turn, 2).join(',')).join('|'));
    legacy.add(Array.from({ length: 20 }, (_, turn) => pocketOffers(String(seed), turn).join(',')).join('|'));
  }
  assert.ok(modern.size >= 50, `Only ${modern.size} distinct modern sequences`);
  assert.equal(legacy.size, 4);
});
