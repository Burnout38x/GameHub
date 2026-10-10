import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REPAIR_COST, SHOTS_PER_PLAYER, START_GOLD, TURN_INCOME } from '@/lib/fortress/content';
import { DEFAULT_DESIGN, TEMPLATE_ORDER, designCost, designProblem, dropPiece, parseDesign, templateDesign } from '@/lib/fortress/design';
import { AI_LEVELS, MISSIONS } from '@/lib/fortress/missions';
import { createWorld, crater, groundAt, royalsOf } from '@/lib/fortress/world';
import { simulateShot } from '@/lib/fortress/physics';
import { planAiShot, solvePower } from '@/lib/fortress/ai';
import { activePlayer, activePlayerIndex, applyAction, createMatch, forfeit, missionStars, shotAllowance, type MatchState } from '@/lib/fortress/match';
import { advanceSiege, createOnlineSiege, forfeitSiege, parseOnlineSiege, playerOrder, publicSiege, settleSiege, submitDesign } from '@/lib/fortress/online';
import { verifyMissionRun } from '@/lib/fortress/campaign';

const HOST = '00000000-0000-4000-8000-000000000001';
const GUEST = '00000000-0000-4000-8000-000000000002';

function play(match: MatchState, guard = 80): MatchState {
  let state = match;
  for (let i = 0; i < guard && !state.result; i++) {
    const player = activePlayer(state);
    const shot = planAiShot(state.world, player.side, state.wind, player.ai ? state.aiLevel : 3, player, state.seed + state.turn);
    const outcome = applyAction(state, { type: 'fire', angle: shot.angle, power: shot.power, ammo: shot.ammo }, { record: false });
    assert.ok(!('error' in outcome), 'error' in outcome ? outcome.error : '');
    state = outcome.state;
  }
  return state;
}

test('every template stands still once it settles, in every material', () => {
  for (const template of TEMPLATE_ORDER) for (const material of ['wood', 'stone', 'steel'] as const) {
    const design = templateDesign(template, { frame: material, floors: material, walls: material });
    assert.equal(designProblem(design, Infinity), null, `${template} ${material} is a valid design`);
    const world = createWorld(10, [design, design]);
    const settled = simulateShot(world, null, 0, { record: false });
    assert.deepEqual(settled.damage, [0, 0], 'settling never hurts anything');
    assert.equal(settled.world.bodies.length, world.bodies.length);
    for (const body of settled.world.bodies) {
      const before = world.bodies.find(entry => entry.id === body.id)!;
      assert.ok(Math.hypot(body.x - before.x, body.y - before.y) < 0.2, `${template}/${material} body ${body.id} drifted`);
    }
  }
});

test('blasts dig craters into the ground', () => {
  const world = createWorld(10, [DEFAULT_DESIGN, DEFAULT_DESIGN]);
  const before = groundAt(world.terrain, 70);
  const dug = crater(world.terrain, 70, before + 0.3, 3)!;
  assert.ok(groundAt(dug, 70) < before - 0.5, 'the middle sinks');
  assert.equal(groundAt(dug, 80), groundAt(world.terrain, 80), 'far ground is untouched');
  assert.equal(crater(world.terrain, 70, before + 10, 3), null, 'an airburst leaves the ground alone');
});

test('builder pieces drop onto whatever is below them', () => {
  const empty = { pieces: [], royals: [] };
  assert.equal(dropPiece(empty, 'block', 5), 0.6, 'a block lands on the ground');
  const stacked = { pieces: [{ kind: 'block' as const, material: 'stone' as const, x: 5, y: 0.6 }], royals: [] };
  assert.equal(dropPiece(stacked, 'block', 5.4), 1.8, 'and on top of another block');
  assert.equal(dropPiece(stacked, 'block', 7), 0.6, 'but not on a block it misses');
});

test('an aimed shot lands on the enemy fortress and records a replay', () => {
  const world = createWorld(10, [DEFAULT_DESIGN, DEFAULT_DESIGN]);
  const king = royalsOf(world, 1).find(royal => royal.role === 'king')!;
  const power = solvePower(0, 45, { x: king.x, y: king.y }, 0);
  assert.ok(power !== null && power > 0 && power <= 1);
  const result = simulateShot(world, { side: 0, angle: 45, power: power!, ammo: 'iron' }, 0);
  assert.ok(result.damage[1] > 0, 'enemy took damage');
  assert.equal(result.damage[0], 0, 'own fortress untouched');
  assert.ok(result.replay && result.replay.frames.length > 10);
  assert.ok(result.replay.events.some(event => event.t === 'launch'));
  assert.ok(JSON.stringify(result.replay).length < 120_000, 'replay stays small enough for a room poll');
});

test('cluster shells split into bomblets that explode', () => {
  const world = createWorld(10, [DEFAULT_DESIGN, DEFAULT_DESIGN]);
  const result = simulateShot(world, { side: 0, angle: 50, power: 0.72, ammo: 'cluster' }, 0);
  const events = result.replay!.events;
  assert.equal(events.filter(event => event.t === 'split').length, 1);
  assert.ok(events.filter(event => event.t === 'boom').length >= 2);
});

test('turns alternate, income arrives each turn and ammo costs are paid', () => {
  const match = createMatch({ kind: 'skirmish', level: 1 }, 42, [DEFAULT_DESIGN, null], ['You']);
  assert.equal(activePlayerIndex(match), 0);
  assert.equal(match.players[0].gold, START_GOLD - designCost(DEFAULT_DESIGN));
  assert.equal(match.players[0].elixir, 1);
  const refused = applyAction(match, { type: 'fire', angle: 45, power: 0.7, ammo: 'titan' });
  assert.ok('error' in refused, 'titan needs 5 elixir');
  const fired = applyAction(match, { type: 'fire', angle: 45, power: 0.7, ammo: 'iron' }, { record: false });
  assert.ok(!('error' in fired));
  const next = fired.state;
  assert.equal(activePlayerIndex(next), 1, 'the Machine shoots next');
  assert.equal(next.players[0].shots, 1);
  assert.equal(next.players[0].gold, match.players[0].gold - 40 + next.last!.earned);
  assert.equal(next.players[1].gold, START_GOLD, 'no income before a first shot');
  const back = applyAction(next, { type: 'skip' });
  assert.ok(!('error' in back));
  assert.equal(back.state.players[0].gold, next.players[0].gold + TURN_INCOME);
});

test('patching up costs gold, heals royals and only works once a turn', () => {
  let match = createMatch({ kind: 'skirmish', level: 1 }, 7, [DEFAULT_DESIGN, null], ['You']);
  match = { ...match, world: { ...match.world, bodies: match.world.bodies.map(body => body.kind === 'royal' && body.side === 0 ? { ...body, hp: 10 } : body) } };
  const healed = applyAction(match, { type: 'repair' });
  assert.ok(!('error' in healed));
  assert.equal(healed.state.players[0].gold, match.players[0].gold - REPAIR_COST);
  assert.ok(royalsOf(healed.state.world, 0).every(royal => royal.hp === 40));
  assert.ok('error' in applyAction(healed.state, { type: 'repair' }));
});

test('a battle always ends, and co-op gives the Machine a shot after each human', () => {
  const solo = play(createMatch({ kind: 'skirmish', level: 3 }, 99, [AI_LEVELS[3].design, null], ['You']));
  assert.ok(solo.result);
  const coop = createMatch({ kind: 'coop', level: 3 }, 5, [DEFAULT_DESIGN, null], ['A', 'B']);
  assert.deepEqual(coop.order, [0, 1, 2, 1]);
  assert.equal(shotAllowance(coop, 1), SHOTS_PER_PLAYER * 2);
  const done = play(coop, 200);
  assert.ok(done.result);
});

test('mission stars reward a win, a full court and finishing within par', () => {
  const base = createMatch({ kind: 'mission', mission: 1 }, 3, [DEFAULT_DESIGN, null], ['You']);
  const enemyGone = { ...base.world, bodies: base.world.bodies.filter(body => !(body.kind === 'royal' && body.side === 1)) };
  const won: MatchState = { ...base, world: enemyGone, players: base.players.map((player, index) => index === 0 ? { ...player, shots: 3 } : player), result: { winner: 0, reason: 'royals', score: [300, 0] } };
  assert.equal(missionStars(won), 3);
  const slow = { ...won, players: won.players.map((player, index) => index === 0 ? { ...player, shots: MISSIONS[0].par + 1 } : player) };
  assert.equal(missionStars(slow), 2);
  assert.equal(missionStars(forfeit(base, 0)), 0);
});

test('designs from the network are validated', () => {
  const valid = JSON.parse(JSON.stringify(DEFAULT_DESIGN));
  assert.deepEqual(parseDesign(valid, START_GOLD), DEFAULT_DESIGN);
  assert.equal(parseDesign({ ...valid, pieces: [...valid.pieces, { kind: 'toString', material: 'wood', x: 1, y: 1 }] }, START_GOLD), null, 'unknown pieces');
  assert.equal(parseDesign({ ...valid, pieces: [{ ...valid.pieces[0], material: 'glass' }, ...valid.pieces.slice(1)] }, START_GOLD), null, 'glass posts');
  assert.equal(parseDesign({ ...valid, pieces: [...valid.pieces, valid.pieces[0]] }, START_GOLD), null, 'overlapping pieces');
  assert.equal(parseDesign({ ...valid, pieces: [{ ...valid.pieces[0], x: 40 }, ...valid.pieces.slice(1)] }, START_GOLD), null, 'outside the plot');
  assert.equal(parseDesign({ ...valid, royals: valid.royals.slice(1) }, START_GOLD), null, 'missing a royal');
  assert.equal(parseDesign({ ...valid, royals: [...valid.royals.slice(0, 2), { role: 'king', x: 15, y: 0.7 }] }, START_GOLD), null, 'two kings');
  assert.equal(parseDesign(valid, designCost(DEFAULT_DESIGN) - 1), null, 'over budget');
  assert.equal(parseDesign(null, START_GOLD), null);
});

test('online duel: build, take turns, refuse out-of-turn shots, settle the result', () => {
  const now = 1_000_000;
  let siege = createOnlineSiege('duel', 3, [HOST, GUEST], 1234, now);
  assert.equal(siege.stage, 'build');
  const first = submitDesign(siege, HOST, DEFAULT_DESIGN, now);
  assert.ok(!('error' in first));
  siege = first.siege;
  assert.ok('error' in submitDesign(siege, HOST, DEFAULT_DESIGN, now), 'cannot rebuild');
  const second = submitDesign(siege, GUEST, templateDesign('bastion', { frame: 'stone', floors: 'stone', walls: 'stone' }), now);
  assert.ok(!('error' in second));
  siege = second.siege;
  assert.equal(siege.stage, 'battle');
  assert.ok('error' in playerOrder(siege, GUEST, { type: 'fire', angle: 45, power: 0.7, ammo: 'stone' }, now), 'guest waits for the host');
  assert.ok('error' in playerOrder(siege, HOST, { type: 'fire', angle: 45, power: 0.7, ammo: 'nuke' }, now), 'unknown ammo is refused');
  const shot = playerOrder(siege, HOST, { type: 'fire', angle: 45, power: 0.7, ammo: 'stone' }, now);
  assert.ok(!('error' in shot));
  siege = shot.siege;
  assert.equal(siege.replayTurn, 0);
  assert.ok(siege.replay);
  assert.equal(siege.replaySide, 0);
  const visible = publicSiege(siege);
  assert.equal('replay' in visible, false);
  assert.deepEqual(visible.designs, [], 'designs never reach phones');
  assert.deepEqual(visible.built, [true, true]);
  assert.ok(parseOnlineSiege(JSON.parse(JSON.stringify(siege))));
  assert.equal(forfeitSiege(siege, HOST), null, 'walking out before both sides fire records nothing');
  const timedOut = advanceSiege(siege, siege.deadline + 1);
  assert.ok(!('error' in timedOut) && timedOut.changed, 'an idle player is skipped');
  assert.equal(forfeitSiege(timedOut.siege, GUEST), null, 'a skipped turn is not a shot');
  const answered = playerOrder(siege, GUEST, { type: 'fire', angle: 45, power: 0.7, ammo: 'stone' }, now);
  assert.ok(!('error' in answered));
  assert.equal(answered.siege.replaySide, 1);
  const forfeited = forfeitSiege(answered.siege, GUEST);
  assert.ok(forfeited);
  assert.deepEqual(forfeited.winners, [HOST]);
  assert.ok(forfeited.scores[HOST] > forfeited.scores[GUEST]);
});

test('idle accounts earn nothing and over-budget fortresses are refused', () => {
  const siege = createOnlineSiege('duel', 3, [HOST, GUEST], 4, 0);
  const steel = templateDesign('bastion', { frame: 'steel', floors: 'steel', walls: 'steel' });
  assert.ok(designCost(steel) > START_GOLD);
  const refused = submitDesign(siege, HOST, steel, 0);
  assert.ok('error' in refused && /more gold/.test(refused.error));
  // Malformed designs are refused cleanly, never thrown.
  for (const junk of [{}, { pieces: 'x' }, { pieces: [null] }, { pieces: [{ kind: 'zzz' }], royals: [] }, []]) {
    assert.ok('error' in submitDesign(siege, HOST, junk, 0), JSON.stringify(junk));
  }
  const idle = advanceSiege(siege, siege.deadline + 1);
  assert.ok(!('error' in idle));
  let state = idle.siege;
  for (let i = 0; i < 40 && !state.result; i++) {
    const step = advanceSiege(state, state.deadline + 1);
    assert.ok(!('error' in step));
    state = step.siege;
  }
  assert.ok(state.result, 'a fully idle duel still ends');
  const settled = settleSiege(state)!;
  assert.deepEqual(settled.winners, []);
  assert.deepEqual(Object.values(settled.scores), [0, 0]);
});

test('online co-op: one shared fortress and the server fires for the Machine', () => {
  const now = 5_000;
  let siege = createOnlineSiege('coop', 2, [HOST, GUEST], 77, now);
  const built = submitDesign(siege, GUEST, DEFAULT_DESIGN, now);
  assert.ok(!('error' in built));
  siege = built.siege;
  assert.equal(siege.stage, 'battle', 'the first design builds the shared fortress');
  const shot = playerOrder(siege, HOST, { type: 'fire', angle: 40, power: 0.6, ammo: 'stone' }, now);
  assert.ok(!('error' in shot));
  siege = shot.siege;
  assert.ok(activePlayer(siege.match!).ai);
  const early = advanceSiege(siege, now);
  assert.ok(!('error' in early) && !early.changed, 'the Machine waits for the shot to land on every phone');
  const machine = advanceSiege(siege, siege.deadline);
  assert.ok(!('error' in machine) && machine.changed);
  assert.equal(activePlayerIndex(machine.siege.match!), 2, 'then the second human fires');
  const settled = settleSiege({ ...machine.siege, result: { winner: 1, reason: 'royals', score: [10, 200] } });
  assert.deepEqual(settled?.winners, [], 'a co-op loss has no winners');
});

test('build time running out starts the battle with the standard keep', () => {
  const siege = createOnlineSiege('duel', 3, [HOST, GUEST], 9, 0);
  const update = advanceSiege(siege, siege.deadline + 1);
  assert.ok(!('error' in update));
  assert.equal(update.siege.stage, 'battle');
});

test('campaign reports must be self-consistent', () => {
  assert.deepEqual(verifyMissionRun({ mission: 1, stars: 3, shots: 4 }), { mission: 1, stars: 3, shots: 4 });
  assert.ok('error' in verifyMissionRun({ mission: 1, stars: 3, shots: MISSIONS[0].par + 1 }));
  assert.ok('error' in verifyMissionRun({ mission: 13, stars: 1, shots: 4 }));
  assert.ok('error' in verifyMissionRun({ mission: 2, stars: 0, shots: 4 }));
  assert.ok('error' in verifyMissionRun({ mission: 2, stars: 1, shots: SHOTS_PER_PLAYER + 1 }));
});
