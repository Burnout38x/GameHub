import {
  AI_LEVELS, COOP_KEEP_HP, DEFAULT_KEEP_HP, DEFENSES, FIELD_LENGTH, KEEP_Y, LANES, MATCH_TICKS, MISSIONS, OVERDRIVE_TICKS,
  PAD_ROWS, PADS_PER_SIDE, START_ELIXIR, START_GOLD, TICKS_PER_SECOND, levelScale,
  type AiProfile, type CardId, type DefenseId,
} from './content';

/**
 * Battle state is plain JSON so it can be cloned for rollback and replayed on the server.
 * The simulation advances it in place for speed; callers clone before keeping history.
 */
export type Side = 0 | 1;
export type BattleSetup =
  | { kind: 'mission'; mission: number }
  | { kind: 'skirmish'; level: number }
  | { kind: 'duel' }
  | { kind: 'coop'; level: number };

/** `pushLane`/`pushUntil` remember an AI wave so it commits several cards to one lane. */
export interface Wallet { side: Side; elixir: number; gold: number; ai: boolean; pushLane: number; pushUntil: number }
export interface Structure {
  id: number; side: Side; pad: number; def: DefenseId | 'keep'; level: number;
  hp: number; maxHp: number; cd: number; lane: number; y: number; spent: number;
}
export interface Unit {
  id: number; side: Side; card: CardId; lane: number; y: number; py: number;
  hp: number; maxHp: number; cd: number; slow: number; xo: number; owner: number;
}
export type FxKind = 'arrow' | 'ball' | 'frost' | 'fire' | 'magic' | 'melee' | 'meteor' | 'keep';
export type Fx =
  | { k: 'shot'; kind: FxKind; side: Side; fromLane: number; fromY: number; toLane: number; toY: number }
  | { k: 'boom'; lane: number; y: number; size: number; side: Side }
  | { k: 'build'; lane: number; y: number; side: Side }
  | { k: 'damage'; lane: number; y: number; amount: number; side: Side };
export interface Outcome { winner: Side | null; tick: number; reason: 'keep' | 'time' }
export interface SideStats { damage: number; destroyed: number; deployed: number; kills: number }

export interface BattleState {
  setup: BattleSetup;
  seed: number;
  tick: number;
  endTick: number;
  overdriveFrom: number;
  incomeBonus: number;
  rng: number;
  nextId: number;
  /** Human wallets come first in player order; an AI wallet, if any, is last. */
  wallets: Wallet[];
  aiLevel: number;
  aiBoost: number;
  aiCards: CardId[] | null;
  pads: (Structure | null)[];
  keeps: [Structure, Structure];
  units: Unit[];
  fx: Fx[];
  stats: [SideStats, SideStats];
  outcome: Outcome | null;
}

export const worldY = (side: Side, distance: number): number => (side === 0 ? distance : FIELD_LENGTH - distance);
export const forward = (side: Side): number => (side === 0 ? 1 : -1);
export const padLane = (pad: number): number => pad % LANES;
export const padRow = (pad: number): number => Math.floor(pad / LANES);
export const padY = (side: Side, pad: number): number => worldY(side, PAD_ROWS[padRow(pad)]);
export const padSlot = (side: Side, pad: number): number => side * PADS_PER_SIDE + pad;
export const enemyOf = (side: Side): Side => (side === 0 ? 1 : 0);

/** Mulberry32: tiny, fast and identical in every JavaScript engine. */
export function nextRandom(state: BattleState): number {
  state.rng = (state.rng + 0x6d2b79f5) | 0;
  let t = state.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) % 1_000_000;
}
export const randomInt = (state: BattleState, max: number): number => (max <= 0 ? 0 : nextRandom(state) % max);

export function validSetup(value: unknown): value is BattleSetup {
  if (!value || typeof value !== 'object') return false;
  const setup = value as Record<string, unknown>;
  const level = (n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 5;
  if (setup.kind === 'mission') return Number.isInteger(setup.mission) && MISSIONS.some(m => m.id === setup.mission);
  if (setup.kind === 'skirmish' || setup.kind === 'coop') return level(setup.level);
  return setup.kind === 'duel';
}

export function humanCount(setup: BattleSetup): number {
  return setup.kind === 'duel' || setup.kind === 'coop' ? 2 : 1;
}
/** Which side each human player controls, in player order. */
export function humanSides(setup: BattleSetup): Side[] {
  if (setup.kind === 'duel') return [0, 1];
  if (setup.kind === 'coop') return [0, 0];
  return [0];
}

export function aiProfile(state: BattleState): AiProfile {
  const base = AI_LEVELS[state.aiLevel] ?? AI_LEVELS[3];
  const boost = state.aiBoost;
  return {
    ...base,
    elixirRate: Math.floor((base.elixirRate * boost) / 100),
    goldIncome: Math.floor((base.goldIncome * boost) / 100),
    startGold: Math.floor((base.startGold * boost) / 100),
    cards: state.aiCards ?? base.cards,
  };
}

function makeStructure(state: BattleState, side: Side, pad: number, def: DefenseId | 'keep', level: number, keepHp = DEFAULT_KEEP_HP): Structure {
  const isKeep = def === 'keep';
  const hp = isKeep ? keepHp : levelScale(DEFENSES[def].hp, level);
  return {
    id: state.nextId++, side, pad, def, level, hp, maxHp: hp, cd: 0,
    lane: isKeep ? -1 : padLane(pad), y: isKeep ? worldY(side, KEEP_Y) : padY(side, pad),
    spent: isKeep ? 0 : DEFENSES[def].cost,
  };
}
export function placeStructure(state: BattleState, side: Side, pad: number, def: DefenseId, level = 1): Structure {
  const structure = makeStructure(state, side, pad, def, level);
  state.pads[padSlot(side, pad)] = structure;
  return structure;
}

export function createBattle(setup: BattleSetup, seed: number): BattleState {
  if (!validSetup(setup)) throw new Error('Unknown battle setup');
  if (!Number.isInteger(seed)) throw new Error('Invalid battle seed');
  const mission = setup.kind === 'mission' ? MISSIONS.find(m => m.id === setup.mission)! : null;
  const sides = humanSides(setup);
  const hasAi = setup.kind !== 'duel';
  const state: BattleState = {
    setup: { ...setup }, seed, tick: 0,
    endTick: mission?.seconds ? mission.seconds * TICKS_PER_SECOND : MATCH_TICKS,
    overdriveFrom: 0, incomeBonus: mission?.incomeBonus ?? 0,
    rng: seed | 0, nextId: 1, wallets: [],
    aiLevel: mission?.aiLevel ?? (setup.kind === 'skirmish' || setup.kind === 'coop' ? setup.level : 0),
    aiBoost: setup.kind === 'coop' ? 165 : 100,
    aiCards: mission?.aiCards ?? null,
    pads: Array.from({ length: PADS_PER_SIDE * 2 }, () => null),
    keeps: [null, null] as unknown as [Structure, Structure],
    units: [], fx: [],
    stats: [{ damage: 0, destroyed: 0, deployed: 0, kills: 0 }, { damage: 0, destroyed: 0, deployed: 0, kills: 0 }],
    outcome: null,
  };
  state.overdriveFrom = mission?.overdriveAll ? 0 : Math.max(0, state.endTick - OVERDRIVE_TICKS);
  const coop = setup.kind === 'coop';
  const humanKeep = mission?.playerKeep ?? (coop ? COOP_KEEP_HP : DEFAULT_KEEP_HP);
  const enemyKeep = mission?.enemyKeep ?? (coop ? COOP_KEEP_HP + 2000 : DEFAULT_KEEP_HP);
  state.keeps = [makeStructure(state, 0, -1, 'keep', 1, humanKeep), makeStructure(state, 1, -1, 'keep', 1, enemyKeep)];
  for (const side of sides) state.wallets.push({ side, elixir: START_ELIXIR, gold: mission?.playerGold ?? START_GOLD, ai: false, pushLane: -1, pushUntil: 0 });
  if (hasAi) {
    const profile = aiProfile(state);
    state.wallets.push({ side: 1, elixir: START_ELIXIR, gold: profile.startGold, ai: true, pushLane: -1, pushUntil: 0 });
  }
  for (const [pad, def, level] of mission?.enemyStart ?? []) placeStructure(state, 1, pad, def, level);
  return state;
}

export function cloneBattle(state: BattleState): BattleState {
  return structuredClone(state);
}

export function keepPercent(state: BattleState, side: Side): number {
  const keep = state.keeps[side];
  return Math.max(0, Math.ceil((keep.hp * 100) / keep.maxHp));
}
