import { AMMO, DAMAGE_GOLD_PERCENT, MAX_ELIXIR, REPAIR_COST, ROYAL_BOUNTY, ROYALS, SHOTS_PER_PLAYER, START_GOLD, TURN_INCOME, type AmmoId } from './content';
import { DEFAULT_DESIGN, designCost, type FortressDesign } from './design';
import { AI_LEVELS, MISSIONS, type Mission } from './missions';
import { seededRandom } from './ai';
import { simulateShot, type Replay, type ShotInput } from './physics';
import { blocksOf, createWorld, royalHealth, royalsOf, type Side, type WorldState } from './world';

export type MatchSetup =
  | { kind: 'mission'; mission: number }
  | { kind: 'skirmish'; level: number }
  | { kind: 'duel' }
  | { kind: 'coop'; level: number };

/** `shots` counts turns used (skips included); `fired` counts real launches. */
export interface MatchPlayer { name: string; side: Side; ai: boolean; gold: number; elixir: number; shots: number; fired: number; repaired: boolean }
export interface ShotRecord { turn: number; player: number; side: Side; angle: number; power: number; ammo: AmmoId; wind: number; damage: [number, number]; knockouts: Side[]; earned: number }
export interface MatchResult { winner: Side | null; reason: 'royals' | 'shots' | 'forfeit'; score: [number, number] }
export interface MatchState {
  setup: MatchSetup; seed: number; aiLevel: number;
  world: WorldState; hill: number; windMax: number; wind: number;
  players: MatchPlayer[];
  /** Player indexes in turn order; play cycles through it. */
  order: number[];
  turn: number; shotLimit: number; par: number;
  royalMax: [number, number]; royalCount: [number, number]; structureMax: [number, number];
  last: ShotRecord | null;
  result: MatchResult | null;
}

export type MatchAction =
  | { type: 'fire'; angle: number; power: number; ammo: AmmoId }
  | { type: 'repair' }
  | { type: 'skip' };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const otherSide = (side: Side): Side => (side === 0 ? 1 : 0);
export const missionById = (id: number): Mission | undefined => MISSIONS.find(mission => mission.id === id);

/** Ground rules that differ by mode: Machine level, terrain, wind, money. */
export function setupRules(setup: MatchSetup, seed: number): { aiLevel: number; hill: number; windMax: number; gold: number; par: number; enemy: FortressDesign | null } {
  const random = seededRandom(seed ^ 0x51ed);
  if (setup.kind === 'mission') {
    const mission = missionById(setup.mission) ?? MISSIONS[0];
    return { aiLevel: mission.aiLevel, hill: mission.hill, windMax: mission.windMax, gold: mission.gold ?? START_GOLD, par: mission.par, enemy: mission.enemy };
  }
  if (setup.kind === 'duel') return { aiLevel: 0, hill: 8 + Math.round(random() * 8), windMax: 1.6, gold: START_GOLD, par: SHOTS_PER_PLAYER, enemy: null };
  const level = clamp(Math.round(setup.level), 1, 5);
  return { aiLevel: level, hill: 8 + level + Math.round(random() * 4), windMax: 0.4 * level, gold: START_GOLD, par: SHOTS_PER_PLAYER, enemy: AI_LEVELS[level].design };
}

const maxRoyal = (world: WorldState, side: Side) => royalsOf(world, side).reduce((sum, royal) => sum + ROYALS[royal.role].hp, 0);
const structure = (world: WorldState, side: Side) => blocksOf(world, side).reduce((sum, block) => sum + block.hp, 0);

/**
 * Starts a battle. `designs` are each side's fortress; `names` are the human players
 * (one for solo, two for duel and co-op). Building costs come out of each builder's gold.
 */
export function createMatch(setup: MatchSetup, seed: number, designs: [FortressDesign, FortressDesign | null], names: string[]): MatchState {
  const rules = setupRules(setup, seed);
  const enemyDesign = setup.kind === 'duel' ? designs[1] ?? DEFAULT_DESIGN : rules.enemy ?? DEFAULT_DESIGN;
  // Freshly built fortresses settle under gravity before the first shot.
  const world = simulateShot(createWorld(rules.hill, [designs[0], enemyDesign]), null, 0, { record: false }).world;
  const purse = (design: FortressDesign | null) => Math.max(0, rules.gold - (design ? designCost(design) : 0));
  let players: MatchPlayer[];
  let order: number[];
  if (setup.kind === 'duel') {
    players = [
      { name: names[0] ?? 'Player 1', side: 0, ai: false, gold: purse(designs[0]), elixir: 0, shots: 0, fired: 0, repaired: false },
      { name: names[1] ?? 'Player 2', side: 1, ai: false, gold: purse(enemyDesign), elixir: 0, shots: 0, fired: 0, repaired: false },
    ];
    order = [0, 1];
  } else if (setup.kind === 'coop') {
    const share = Math.round(designCost(designs[0]) / 2);
    players = [
      { name: names[0] ?? 'Player 1', side: 0, ai: false, gold: Math.max(0, rules.gold - share), elixir: 0, shots: 0, fired: 0, repaired: false },
      { name: 'The Machine', side: 1, ai: true, gold: rules.gold, elixir: 0, shots: 0, fired: 0, repaired: false },
      { name: names[1] ?? 'Player 2', side: 0, ai: false, gold: Math.max(0, rules.gold - share), elixir: 0, shots: 0, fired: 0, repaired: false },
    ];
    order = [0, 1, 2, 1];
  } else {
    players = [
      { name: names[0] ?? 'You', side: 0, ai: false, gold: purse(designs[0]), elixir: 0, shots: 0, fired: 0, repaired: false },
      { name: 'The Machine', side: 1, ai: true, gold: rules.gold, elixir: 0, shots: 0, fired: 0, repaired: false },
    ];
    order = [0, 1];
  }
  const state: MatchState = {
    setup, seed, aiLevel: rules.aiLevel, world, hill: rules.hill, windMax: rules.windMax, wind: 0,
    players, order, turn: 0, shotLimit: SHOTS_PER_PLAYER * (order.length / new Set(order).size), par: rules.par,
    royalMax: [maxRoyal(world, 0), maxRoyal(world, 1)], royalCount: [royalsOf(world, 0).length, royalsOf(world, 1).length], structureMax: [structure(world, 0), structure(world, 1)],
    last: null, result: null,
  };
  return beginTurn(state);
}

export const activePlayerIndex = (state: MatchState): number => state.order[state.turn % state.order.length];
export const activePlayer = (state: MatchState): MatchPlayer => state.players[activePlayerIndex(state)];

/** Shots a player gets: the Machine in co-op fires after each human, so it gets two allowances. */
export function shotAllowance(state: MatchState, index: number): number {
  return SHOTS_PER_PLAYER * state.order.filter(entry => entry === index).length;
}

function windFor(state: MatchState): number {
  const random = seededRandom((state.seed ^ Math.imul(state.turn + 1, 0x9e3779b1)) >>> 0);
  return Math.round((random() * 2 - 1) * state.windMax * 10) / 10;
}

/** Income and elixir arrive at the start of each turn, and the wind shifts. */
function beginTurn(state: MatchState): MatchState {
  const index = activePlayerIndex(state);
  const players = state.players.map((player, i) => i !== index ? player : {
    ...player,
    gold: player.gold + (player.shots > 0 ? TURN_INCOME : 0),
    elixir: Math.min(MAX_ELIXIR, player.elixir + 1),
    repaired: false,
  });
  return { ...state, players, wind: windFor(state) };
}

export function canAfford(player: MatchPlayer, ammo: AmmoId): boolean {
  return player.gold >= AMMO[ammo].gold && player.elixir >= AMMO[ammo].elixir;
}

/** Scores 0–300: royals count double, standing walls once. */
export function sideScore(state: MatchState, side: Side): number {
  const royals = royalHealth(state.world, side, state.royalMax[side]);
  const walls = state.structureMax[side] > 0 ? Math.round((structure(state.world, side) * 100) / state.structureMax[side]) : 0;
  return royals * 2 + walls;
}

function settle(state: MatchState): MatchState {
  const fallen = ([0, 1] as Side[]).filter(side => royalsOf(state.world, side).length === 0);
  const score: [number, number] = [sideScore(state, 0), sideScore(state, 1)];
  if (fallen.length === 2) return { ...state, result: { winner: null, reason: 'royals', score } };
  if (fallen.length === 1) return { ...state, result: { winner: otherSide(fallen[0]), reason: 'royals', score } };
  const outOfShots = state.players.every((player, index) => player.shots >= shotAllowance(state, index));
  if (!outOfShots) return state;
  const winner = score[0] === score[1] ? null : score[0] > score[1] ? 0 : 1;
  return { ...state, result: { winner, reason: 'shots', score } };
}

export type ActionResult = { state: MatchState; replay: Replay | null } | { error: string };

/** Applies one action for the active player. Physics runs here, so online this only runs on the server. */
export function applyAction(state: MatchState, action: MatchAction, options: { record?: boolean } = {}): ActionResult {
  if (state.result) return { error: 'This battle is over.' };
  const index = activePlayerIndex(state);
  const player = state.players[index];
  if (action.type === 'repair') {
    if (player.repaired) return { error: 'You already patched up this turn.' };
    if (player.gold < REPAIR_COST) return { error: `Patching up costs ${REPAIR_COST} gold.` };
    const world = structuredClone(state.world);
    for (const body of world.bodies) {
      if (body.side !== player.side) continue;
      if (body.kind === 'royal') body.hp = Math.min(body.maxHp, body.hp + 30);
      else body.burn = 0;
    }
    const players = state.players.map((entry, i) => i === index ? { ...entry, gold: entry.gold - REPAIR_COST, repaired: true } : entry);
    return { state: { ...state, world, players }, replay: null };
  }
  if (action.type === 'skip') {
    const players = state.players.map((entry, i) => i === index ? { ...entry, shots: entry.shots + 1 } : entry);
    return { state: advance(settle({ ...state, players, last: null })), replay: null };
  }
  if (!Object.hasOwn(AMMO, action.ammo)) return { error: 'Unknown ammo.' };
  if (!Number.isFinite(action.angle) || !Number.isFinite(action.power)) return { error: 'Invalid aim.' };
  if (!canAfford(player, action.ammo)) return { error: `You can't afford ${AMMO[action.ammo].name} yet.` };
  const shot: ShotInput = { side: player.side, angle: clamp(action.angle, 0, 90), power: clamp(action.power, 0, 1), ammo: action.ammo };
  const outcome = simulateShot(state.world, shot, state.wind, { record: options.record ?? true });
  const enemy = otherSide(player.side);
  const kills = outcome.knockouts.filter(side => side === enemy).length;
  const earned = Math.round((outcome.damage[enemy] * DAMAGE_GOLD_PERCENT) / 100) + kills * ROYAL_BOUNTY;
  const players = state.players.map((entry, i) => i !== index ? entry : {
    ...entry,
    gold: entry.gold - AMMO[action.ammo].gold + earned,
    elixir: entry.elixir - AMMO[action.ammo].elixir,
    shots: entry.shots + 1,
    fired: entry.fired + 1,
  });
  const last: ShotRecord = {
    turn: state.turn, player: index, side: player.side, angle: shot.angle, power: shot.power, ammo: shot.ammo,
    wind: state.wind, damage: outcome.damage, knockouts: outcome.knockouts, earned,
  };
  return { state: advance(settle({ ...state, world: outcome.world, players, last })), replay: outcome.replay };
}

/** Moves to the next player who still has shots left. */
function advance(state: MatchState): MatchState {
  if (state.result) return state;
  let next = { ...state, turn: state.turn + 1 };
  for (let guard = 0; guard < state.order.length; guard++) {
    const index = activePlayerIndex(next);
    if (next.players[index].shots < shotAllowance(next, index)) break;
    next = { ...next, turn: next.turn + 1 };
  }
  return beginTurn(next);
}

/** Ends the battle for someone walking out: the other side wins. */
export function forfeit(state: MatchState, side: Side): MatchState {
  if (state.result) return state;
  return { ...state, result: { winner: otherSide(side), reason: 'forfeit', score: [sideScore(state, 0), sideScore(state, 1)] } };
}

/** Mission stars: a win, every royal still standing, and finishing within par shots. */
export function missionStars(state: MatchState): number {
  if (!state.result || state.result.winner !== 0) return 0;
  const human = state.players.find(player => !player.ai);
  const royalsSafe = royalsOf(state.world, 0).length === state.royalCount[0];
  return 1 + (royalsSafe ? 1 : 0) + ((human?.shots ?? Infinity) <= state.par ? 1 : 0);
}

export const burningBlocks = (state: MatchState, side: Side): number => blocksOf(state.world, side).filter(block => block.burn > 0).length;
