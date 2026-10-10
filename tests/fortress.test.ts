import test from 'node:test';
import assert from 'node:assert/strict';
import { aiDecisions } from '../src/lib/fortress/ai';
import { applyCommand, commandError, meteorTarget, parseCommandBody, type BattleCommand } from '../src/lib/fortress/commands';
import { CARDS, COMMAND_DELAY_TICKS, DEFENSES, MAX_LEVEL, MILLI, MISSIONS, TICK_MS, upgradeCost } from '../src/lib/fortress/content';
import { battleScores, missionStars, parseBattleLog, replayBattle, stepBattle } from '../src/lib/fortress/sim';
import { cloneBattle, createBattle, padSlot, type BattleSetup, type BattleState } from '../src/lib/fortress/state';
import { COUNTDOWN_MS, createOnlineBattle, forfeitBattle, parseOnlineBattle, scheduleCommand, settleBattle } from '../src/lib/fortress/online';
import { campaignRank, mergeProgress, missionUnlocked, parseProgress, verifyMissionRun } from '../src/lib/fortress/campaign';
import { battleAiLevel } from '../src/lib/fortress/rooms';

/** Plays a full battle where wallet 0 is driven by a bot that plans on a copy of the state, logging every order. */
function botBattle(setup: BattleSetup, seed: number, level: number): { state: BattleState; log: BattleCommand[] } {
  const state = createBattle(setup, seed);
  const log: BattleCommand[] = [];
  while (!state.outcome) {
    const probe = cloneBattle(state);
    probe.aiLevel = level;
    probe.aiBoost = 100;
    const orders = aiDecisions(probe, 0).map(body => ({ ...body, t: state.tick, p: 0 }) as BattleCommand);
    log.push(...orders);
    stepBattle(state, orders);
  }
  return { state, log };
}
const strip = (state: BattleState) => JSON.stringify({ ...state, fx: [] });

test('battles are deterministic and replay identically from their order log', () => {
  const first = botBattle({ kind: 'skirmish', level: 3 }, 99, 3);
  const second = botBattle({ kind: 'skirmish', level: 3 }, 99, 3);
  assert.equal(strip(first.state), strip(second.state));
  assert.ok(first.log.length > 10, 'the bot should issue orders');
  const replayed = replayBattle({ kind: 'skirmish', level: 3 }, 99, first.log);
  assert.equal(strip(replayed), strip(first.state));
  assert.ok(first.state.outcome);
});

test('setups and seeds are validated', () => {
  assert.throws(() => createBattle({ kind: 'mission', mission: 99 }, 1));
  assert.throws(() => createBattle({ kind: 'skirmish', level: 0 }, 1));
  assert.throws(() => createBattle({ kind: 'duel' }, 1.5));
  const duel = createBattle({ kind: 'duel' }, 5);
  assert.equal(duel.wallets.length, 2);
  assert.deepEqual(duel.wallets.map(w => w.side), [0, 1]);
  const coop = createBattle({ kind: 'coop', level: 3 }, 5);
  assert.deepEqual(coop.wallets.map(w => [w.side, w.ai]), [[0, false], [0, false], [1, true]]);
  assert.ok(coop.keeps[1].maxHp > coop.keeps[0].maxHp, 'the Machine gets a bigger keep in co-op');
});

test('orders respect elixir, gold, plots and levels without changing state when refused', () => {
  const state = createBattle({ kind: 'skirmish', level: 1 }, 3);
  state.wallets[0].elixir = 2 * MILLI;
  const before = JSON.stringify(state);
  assert.match(commandError(state, 0, { k: 'deploy', card: 'giant', lane: 1 })!, /Need 5 elixir/);
  assert.equal(applyCommand(state, 0, { k: 'deploy', card: 'giant', lane: 1 }), false);
  assert.equal(JSON.stringify(state), before);
  assert.equal(applyCommand(state, 0, { k: 'deploy', card: 'goblins', lane: 0 }), true);
  assert.equal(state.units.length, CARDS.goblins.count);
  state.wallets[0].gold = 1000;
  assert.equal(applyCommand(state, 0, { k: 'build', pad: 4, def: 'cannon' }), true);
  assert.match(commandError(state, 0, { k: 'build', pad: 4, def: 'wall' })!, /taken/);
  for (let level = 1; level < MAX_LEVEL; level++) assert.equal(applyCommand(state, 0, { k: 'upgrade', pad: 4 }), true);
  assert.match(commandError(state, 0, { k: 'upgrade', pad: 4 })!, /max level/i);
  const spent = DEFENSES.cannon.cost + upgradeCost('cannon', 1) + upgradeCost('cannon', 2);
  const gold = state.wallets[0].gold;
  assert.equal(applyCommand(state, 0, { k: 'sell', pad: 4 }), true);
  assert.equal(state.wallets[0].gold, gold + Math.floor(spent / 2));
  assert.equal(state.pads[padSlot(0, 4)], null);
  assert.equal(commandError(state, 5, { k: 'sell', pad: 0 }), 'You are not commanding this battle.');
});

test('meteor strikes the frontmost enemy building, then the keep', () => {
  const state = createBattle({ kind: 'mission', mission: 3 }, 1);
  assert.equal(meteorTarget(state, 0, 1)?.pad, 4, 'front wall first');
  state.wallets[0].elixir = 10 * MILLI;
  const wall = state.pads[padSlot(1, 4)]!;
  const hp = wall.hp;
  applyCommand(state, 0, { k: 'deploy', card: 'meteor', lane: 1 });
  assert.equal(wall.hp, hp - CARDS.meteor.spell!.structureDamage);
  const open = createBattle({ kind: 'skirmish', level: 1 }, 1);
  assert.equal(meteorTarget(open, 0, 0)?.def, 'keep');
});

test('untrusted orders and logs are rejected', () => {
  for (const bad of [null, {}, { k: 'deploy', card: 'dragon', lane: 1 }, { k: 'deploy', card: 'knight', lane: 3 }, { k: 'build', pad: 6, def: 'wall' }, { k: 'build', pad: 0, def: 'laser' }, { k: 'sell', pad: -1 }, { k: 'deploy', card: 'toString', lane: 0 }]) {
    assert.equal(parseCommandBody(bad), null, JSON.stringify(bad));
  }
  const setup: BattleSetup = { kind: 'mission', mission: 1 };
  assert.equal(parseBattleLog('nope', setup), null);
  assert.equal(parseBattleLog([{ k: 'deploy', card: 'knight', lane: 0, t: 5, p: 1 }], setup), null, 'missions have one player');
  assert.equal(parseBattleLog([{ k: 'deploy', card: 'knight', lane: 0, t: 5, p: 0 }, { k: 'deploy', card: 'knight', lane: 0, t: 4, p: 0 }], setup), null, 'ticks must not go backwards');
  assert.equal(parseBattleLog(Array.from({ length: 2000 }, () => ({ k: 'sell', pad: 0, t: 1, p: 0 })), setup), null);
});

test('an idle commander loses, and the clock always ends a battle', () => {
  const idle = createBattle({ kind: 'skirmish', level: 3 }, 11);
  while (!idle.outcome) stepBattle(idle);
  assert.equal(idle.outcome.winner, 1);
  assert.ok(idle.outcome.tick <= idle.endTick);
  const duel = createBattle({ kind: 'duel' }, 2);
  while (!duel.outcome) stepBattle(duel);
  assert.deepEqual(duel.outcome, { winner: null, tick: duel.endTick, reason: 'time' });
  assert.deepEqual(battleScores(duel), [5, 5]);
});

test('campaign victories are verified by replay and earn stars', () => {
  let win: { state: BattleState; log: BattleCommand[]; seed: number } | null = null;
  for (const seed of [1, 2, 3, 4, 5]) {
    const run = botBattle({ kind: 'mission', mission: 1 }, seed, 5);
    if (run.state.outcome?.winner === 0) { win = { ...run, seed }; break; }
  }
  assert.ok(win, 'a capable commander can clear mission 1');
  const verified = verifyMissionRun({ mission: 1, seed: win.seed, log: win.log });
  assert.ok(!('error' in verified));
  assert.equal(verified.stars, missionStars(win.state));
  assert.equal(verified.seconds, Math.floor(win.state.outcome!.tick / 10));
  assert.deepEqual(verifyMissionRun({ mission: 1, seed: win.seed, log: [] }), { error: 'Only victories can be saved.' });
  assert.deepEqual(verifyMissionRun({ mission: 1, seed: 'x', log: [] }), { error: 'Invalid battle seed' });
  assert.deepEqual(verifyMissionRun({ mission: 13, seed: 1, log: [] }), { error: 'Unknown mission' });
});

test('campaign progress unlocks missions in order and merges best results', () => {
  const progress = parseProgress({ stars: { 1: 3, 2: 9, 3: 1.5 }, best: { 1: 140, 2: -4 } });
  assert.deepEqual(progress, { stars: { 1: 3 }, best: { 1: 140 } });
  assert.equal(missionUnlocked(progress, 2), true);
  assert.equal(missionUnlocked(progress, 3), false);
  assert.deepEqual(mergeProgress({ stars: { 1: 2 }, best: { 1: 150 } }, { stars: { 1: 1, 2: 3 }, best: { 1: 120 } }), { stars: { 1: 2, 2: 3 }, best: { 1: 120 } });
  assert.equal(campaignRank(0).title, 'Recruit');
  assert.equal(campaignRank(MISSIONS.length * 3).title, 'Fortress Legend');
  assert.equal(campaignRank(13).next, 14);
});

test('online orders are stamped ahead on the server clock and validated by replay', () => {
  const now = 1_000_000;
  const battle = createOnlineBattle('duel', 3, ['host', 'guest'], 42, now);
  assert.equal(battle.startAt, now + COUNTDOWN_MS);
  assert.throws(() => createOnlineBattle('duel', 3, ['solo'], 1, now));
  assert.throws(() => createOnlineBattle('coop', 3, ['same', 'same'], 1, now));
  const deploy = { k: 'deploy', card: 'knight', lane: 1 };
  assert.match((scheduleCommand(battle, 'host', deploy, now) as { error: string }).error, /not started/);
  assert.match((scheduleCommand(battle, 'stranger', deploy, battle.startAt) as { error: string }).error, /not in this battle/);
  assert.match((scheduleCommand(battle, 'host', { k: 'nuke' }, battle.startAt) as { error: string }).error, /not recognised/);
  const at = battle.startAt + 50 * TICK_MS;
  const first = scheduleCommand(battle, 'host', deploy, at);
  assert.ok('command' in first);
  assert.equal(first.command.t, 50 + COMMAND_DELAY_TICKS);
  assert.equal(first.command.p, 0);
  assert.equal(first.battle.version, 1);
  // A slightly earlier clock on another server instance can never reorder the log.
  const second = scheduleCommand(first.battle, 'guest', { k: 'build', pad: 4, def: 'archer' }, at - 5 * TICK_MS);
  assert.ok('command' in second);
  assert.equal(second.command.t, first.command.t);
  assert.equal(second.command.p, 1);
  // Elixir is checked at the scheduled tick, counting orders already queued for it.
  let spender = second.battle;
  let refused = '';
  for (let i = 0; i < 6 && !refused; i++) {
    const result = scheduleCommand(spender, 'host', { k: 'deploy', card: 'giant', lane: 0 }, at);
    if ('error' in result) refused = result.error; else spender = result.battle;
  }
  assert.match(refused, /Need 5 elixir/);
  assert.equal(parseOnlineBattle(JSON.parse(JSON.stringify(spender)))?.log.length, spender.log.length);
  assert.equal(parseOnlineBattle({ ...spender, players: ['only-one'] }), null);
});

test('online battles settle only once over, with explicit winners for every mode', () => {
  const now = 0;
  const duel = createOnlineBattle('duel', 3, ['a', 'b'], 9, now);
  assert.equal(settleBattle(duel, duel.startAt + 100 * TICK_MS), null);
  const end = duel.startAt + 181 * 1000;
  const draw = settleBattle(duel, end)!;
  assert.equal(draw.battle.result?.reason, 'time');
  assert.deepEqual(draw.winners, [], 'a draw records no winner');
  assert.equal(settleBattle(draw.battle, end), null, 'already settled');
  const coop = createOnlineBattle('coop', battleAiLevel('mixed'), ['a', 'b'], 9, now);
  const lost = settleBattle(coop, coop.startAt + 181 * 1000)!;
  assert.equal(lost.battle.result?.winner, 1);
  assert.deepEqual(lost.winners, [], 'nobody wins a co-op loss');
  assert.deepEqual(lost.scores, { a: lost.scores.b, b: lost.scores.a });
  assert.equal(forfeitBattle(duel, 'b', duel.startAt + 5 * 1000), null, 'an instant walk-out abandons the battle without a result');
  assert.deepEqual(forfeitBattle(duel, 'a', end)!.battle.result?.reason, 'time', 'a battle already decided keeps its real result');
  const conceded = forfeitBattle(duel, 'b', duel.startAt + 40 * 1000)!;
  assert.deepEqual(conceded.winners, ['a']);
  assert.equal(conceded.battle.result?.forfeitBy, 'b');
  assert.ok(conceded.scores.a > conceded.scores.b);
  assert.equal(forfeitBattle(coop, 'a', coop.startAt), null, 'co-op closes instead of forfeiting');
  assert.deepEqual([battleAiLevel('easy'), battleAiLevel('mixed'), battleAiLevel('hard')], [2, 3, 4]);
});

test('every mission starts cleanly and the Machine plays within the rules', () => {
  for (const mission of MISSIONS) {
    const state = createBattle({ kind: 'mission', mission: mission.id }, mission.id);
    assert.equal(state.keeps[1].maxHp, mission.enemyKeep);
    for (const [pad, def, level] of mission.enemyStart ?? []) {
      assert.equal(state.pads[padSlot(1, pad)]?.def, def, `${mission.name} ${def}`);
      assert.equal(state.pads[padSlot(1, pad)]?.level, level);
    }
    for (let tick = 0; tick < 300 && !state.outcome; tick++) stepBattle(state);
    const ai = state.wallets[state.wallets.length - 1];
    assert.ok(ai.gold >= 0 && ai.elixir >= 0, `${mission.name} AI never overspends`);
    assert.ok(state.stats[1].deployed > 0, `${mission.name} AI attacks`);
  }
});
