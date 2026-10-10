import {
  BASE_INCOME_PER_SECOND, BOUNTY_PER_ELIXIR, CARDS, DEFENSES, ELIXIR_PER_TICK, KEEP_COOLDOWN, KEEP_DAMAGE, KEEP_RANGE, KEEP_REACH, KEEP_SPLASH,
  LANES, MAX_ELIXIR, SIGHT, TICKS_PER_SECOND, levelScale,
} from './content';
import { aiDecisions } from './ai';
import { applyCommand, damageStructure, hurtUnit, parseCommandBody, type BattleCommand } from './commands';
import {
  aiProfile, createBattle, enemyOf, forward, humanSides, padSlot,
  type BattleSetup, type BattleState, type FxKind, type Outcome, type Side, type Structure, type Unit,
} from './state';

type Target = { unit: Unit; structure?: undefined } | { structure: Structure; unit?: undefined };

const MELEE_RANGE = 30;
const attackFx = (card: Unit['card']): FxKind => (card === 'archers' ? 'arrow' : card === 'wizard' ? 'magic' : 'melee');

function structureDistance(unit: Unit, structure: Structure): number {
  const gap = Math.abs(structure.y - unit.y);
  return structure.def === 'keep' ? Math.max(0, gap - KEEP_REACH) : gap;
}

function findTarget(state: BattleState, unit: Unit): Target | null {
  const card = CARDS[unit.card];
  const enemy = enemyOf(unit.side);
  if (!card.buildingsOnly) {
    let best: Unit | null = null;
    let bestGap = Math.max(SIGHT, card.range) + 1;
    for (const other of state.units) {
      if (other.side !== enemy || other.lane !== unit.lane || other.hp <= 0) continue;
      const gap = Math.abs(other.y - unit.y);
      if (gap < bestGap) { best = other; bestGap = gap; }
    }
    if (best) return { unit: best };
  }
  const dir = forward(unit.side);
  // Troops meet the enemy's front plot, then the back plot, then the keep.
  for (const pad of [unit.lane + LANES, unit.lane]) {
    const structure = state.pads[padSlot(enemy, pad)];
    if (structure && structure.hp > 0 && dir * (structure.y - unit.y) >= -card.range) return { structure };
  }
  const keep = state.keeps[enemy];
  return keep.hp > 0 ? { structure: keep } : null;
}

function strikeUnit(state: BattleState, attacker: Unit, target: Unit): void {
  const card = CARDS[attacker.card];
  if (card.splash > 0) {
    for (const other of state.units) {
      if (other.side === target.side && other.lane === target.lane && Math.abs(other.y - target.y) <= card.splash) hurtUnit(other, card.damage);
    }
  } else hurtUnit(target, card.damage);
}

function updateUnit(state: BattleState, unit: Unit): void {
  unit.py = unit.y;
  if (unit.hp <= 0) return;
  if (unit.cd > 0) unit.cd--;
  if (unit.slow > 0) unit.slow--;
  const target = findTarget(state, unit);
  if (!target) return;
  const card = CARDS[unit.card];
  const targetY = target.unit ? target.unit.y : target.structure.y;
  const distance = target.unit ? Math.abs(target.unit.y - unit.y) : structureDistance(unit, target.structure);
  if (distance <= card.range) {
    if (unit.cd > 0) return;
    unit.cd = card.cooldown;
    if (target.unit) strikeUnit(state, unit, target.unit);
    else damageStructure(state, target.structure, card.damage, unit.side);
    state.fx.push({ k: 'shot', kind: card.range <= MELEE_RANGE ? 'melee' : attackFx(unit.card), side: unit.side, fromLane: unit.lane, fromY: unit.y, toLane: target.unit ? target.unit.lane : unit.lane, toY: targetY });
    return;
  }
  const speed = unit.slow > 0 ? card.speed / 2 : card.speed;
  const step = Math.min(speed, distance - card.range);
  unit.y += Math.sign(targetY - unit.y) * step;
}

function defenseFx(def: Structure['def']): FxKind {
  if (def === 'keep') return 'keep';
  if (def === 'frost') return 'frost';
  if (def === 'mortar') return 'fire';
  if (def === 'cannon') return 'ball';
  return 'arrow';
}

function nearestEnemy(state: BattleState, structure: Structure, range: number, minRange: number): Unit | null {
  let best: Unit | null = null;
  let bestGap = range + 1;
  for (const unit of state.units) {
    if (unit.side === structure.side || unit.hp <= 0) continue;
    if (structure.def !== 'keep' && unit.lane !== structure.lane) continue;
    const gap = Math.abs(unit.y - structure.y);
    if (gap >= minRange && gap < bestGap) { best = unit; bestGap = gap; }
  }
  return best;
}

function updateStructure(state: BattleState, structure: Structure): void {
  if (structure.hp <= 0) return;
  if (structure.cd > 0) { structure.cd--; return; }
  const isKeep = structure.def === 'keep';
  const def = isKeep ? null : DEFENSES[structure.def as keyof typeof DEFENSES];
  if (def && def.damage === 0) return;
  const target = nearestEnemy(state, structure, def ? def.range : KEEP_RANGE, def ? def.minRange : 0);
  if (!target) return;
  const damage = def ? levelScale(def.damage, structure.level) : KEEP_DAMAGE;
  const splash = def ? def.splash : KEEP_SPLASH;
  if (splash > 0) {
    for (const unit of state.units) {
      if (unit.side !== target.side || unit.lane !== target.lane || Math.abs(unit.y - target.y) > splash) continue;
      hurtUnit(unit, damage);
      if (def?.slowTicks) unit.slow = Math.max(unit.slow, def.slowTicks);
    }
  } else hurtUnit(target, damage);
  structure.cd = def ? def.cooldown : KEEP_COOLDOWN;
  state.fx.push({ k: 'shot', kind: defenseFx(structure.def), side: structure.side, fromLane: isKeep ? 1 : structure.lane, fromY: structure.y, toLane: target.lane, toY: target.y });
}

function economy(state: BattleState): void {
  const overdrive = state.tick >= state.overdriveFrom;
  const payday = state.tick % TICKS_PER_SECOND === TICKS_PER_SECOND - 1;
  const profile = state.wallets.some(w => w.ai) ? aiProfile(state) : null;
  const mineIncome: [number, number] = [0, 0];
  if (payday) {
    for (const structure of state.pads) {
      if (structure && structure.def === 'mine' && structure.hp > 0) mineIncome[structure.side] += DEFENSES.mine.income * structure.level;
    }
  }
  for (const wallet of state.wallets) {
    const rate = wallet.ai && profile ? Math.floor((ELIXIR_PER_TICK * profile.elixirRate) / 100) : ELIXIR_PER_TICK;
    wallet.elixir = Math.min(MAX_ELIXIR, wallet.elixir + (overdrive ? rate * 2 : rate));
    if (payday) wallet.gold += (wallet.ai && profile ? profile.goldIncome : BASE_INCOME_PER_SECOND) + state.incomeBonus + mineIncome[wallet.side];
  }
}

function payBounty(state: BattleState, unit: Unit): void {
  const card = CARDS[unit.card];
  const killer = enemyOf(unit.side);
  state.stats[killer].kills++;
  const bounty = Math.floor((card.cost * BOUNTY_PER_ELIXIR) / Math.max(1, card.count));
  for (const wallet of state.wallets) if (wallet.side === killer) wallet.gold += bounty;
  state.fx.push({ k: 'boom', lane: unit.lane, y: unit.y, size: 1, side: unit.side });
}

function cleanup(state: BattleState): void {
  const survivors: Unit[] = [];
  for (const unit of state.units) {
    if (unit.hp > 0) survivors.push(unit);
    else payBounty(state, unit);
  }
  state.units = survivors;
  state.pads.forEach((structure, slot) => {
    if (!structure || structure.hp > 0) return;
    state.stats[enemyOf(structure.side)].destroyed++;
    state.fx.push({ k: 'boom', lane: structure.lane, y: structure.y, size: 2, side: structure.side });
    state.pads[slot] = null;
  });
  const [blue, red] = state.keeps;
  if (blue.hp <= 0 || red.hp <= 0) {
    const winner: Side | null = blue.hp <= 0 && red.hp <= 0 ? null : blue.hp <= 0 ? 1 : 0;
    state.outcome = { winner, tick: state.tick, reason: 'keep' };
    for (const keep of [blue, red]) if (keep.hp <= 0) state.fx.push({ k: 'boom', lane: 1, y: keep.y, size: 4, side: keep.side });
  }
}

/** When time runs out the healthier keep (by percentage) wins, then the bigger siege total. */
export function timeOutcome(state: BattleState): Outcome {
  const [blue, red] = state.keeps;
  const blueShare = blue.hp * red.maxHp;
  const redShare = red.hp * blue.maxHp;
  let winner: Side | null = blueShare > redShare ? 0 : redShare > blueShare ? 1 : null;
  if (winner === null && state.stats[0].damage !== state.stats[1].damage) winner = state.stats[0].damage > state.stats[1].damage ? 0 : 1;
  return { winner, tick: state.tick, reason: 'time' };
}

/** Advances exactly one tick. `commands` are the ones scheduled for this tick, in log order. */
export function stepBattle(state: BattleState, commands: readonly BattleCommand[] = []): void {
  if (state.outcome) return;
  state.fx = [];
  for (const command of commands) applyCommand(state, command.p, command);
  state.wallets.forEach((wallet, index) => {
    if (wallet.ai) for (const body of aiDecisions(state, index)) applyCommand(state, index, body);
  });
  economy(state);
  for (const unit of state.units) updateUnit(state, unit);
  for (const structure of state.pads) if (structure) updateStructure(state, structure);
  for (const keep of state.keeps) updateStructure(state, keep);
  cleanup(state);
  state.tick++;
  if (!state.outcome && state.tick >= state.endTick) state.outcome = timeOutcome(state);
}

/**
 * Steps `state` forward until `untilTick` (exclusive) using a tick-ordered log.
 * Returns the index of the first log entry not yet consumed.
 */
export function advanceBattle(state: BattleState, log: readonly BattleCommand[], cursor: number, untilTick: number): number {
  let index = cursor;
  while (state.tick < untilTick && !state.outcome) {
    while (index < log.length && log[index].t < state.tick) index++;
    const start = index;
    while (index < log.length && log[index].t === state.tick) index++;
    stepBattle(state, log.slice(start, index));
  }
  return index;
}

export function replayBattle(setup: BattleSetup, seed: number, log: readonly BattleCommand[], untilTick = Infinity): BattleState {
  const state = createBattle(setup, seed);
  advanceBattle(state, log, 0, Math.min(untilTick, state.endTick));
  return state;
}

/** Validates an untrusted command log (from a campaign submission or a stored room). */
export function parseBattleLog(value: unknown, setup: BattleSetup, maxEntries = 1500): BattleCommand[] | null {
  if (!Array.isArray(value) || value.length > maxEntries) return null;
  const players = humanSides(setup).length;
  const log: BattleCommand[] = [];
  let lastTick = 0;
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') return null;
    const entry = raw as Record<string, unknown>;
    const body = parseCommandBody(entry);
    if (!body || !Number.isInteger(entry.t) || !Number.isInteger(entry.p)) return null;
    const t = entry.t as number;
    const p = entry.p as number;
    if (t < lastTick || t > 100_000 || p < 0 || p >= players) return null;
    lastTick = t;
    log.push({ ...body, t, p });
  }
  return log;
}

/** Buildings destroyed, with the keep worth three. */
export function crowns(state: BattleState, side: Side): number {
  return state.stats[side].destroyed + (state.keeps[enemyOf(side)].hp <= 0 ? 3 : 0);
}

/** Campaign stars for the human side: win, keep above half health, and a knockout. */
export function missionStars(state: BattleState): number {
  const outcome = state.outcome;
  if (!outcome || outcome.winner !== 0) return 0;
  let stars = 1;
  if (state.keeps[0].hp * 2 >= state.keeps[0].maxHp) stars++;
  if (outcome.reason === 'keep') stars++;
  return stars;
}

const WIN_POINTS = 10;
const DRAW_POINTS = 5;
/** Points per human player: a win bonus plus crowns earned by their side. */
export function battleScores(state: BattleState): number[] {
  return humanSides(state.setup).map(side => {
    const outcome = state.outcome;
    const bonus = !outcome ? 0 : outcome.winner === side ? WIN_POINTS : outcome.winner === null ? DRAW_POINTS : 0;
    return bonus + crowns(state, side);
  });
}
