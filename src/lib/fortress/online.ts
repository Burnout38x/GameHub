import { COMMAND_DELAY_TICKS, TICK_MS } from './content';
import { applyCommand, commandError, parseCommandBody, type BattleCommand, type CommandBody } from './commands';
import { battleScores, crowns, parseBattleLog, replayBattle } from './sim';
import { createBattle, humanSides, keepPercent, validSetup, type BattleSetup, type BattleState, type Side } from './state';

/** Seconds of "Get ready" before tick zero, so both phones start together. */
export const COUNTDOWN_MS = 4000;
export const MAX_COMMANDS_PER_PLAYER = 400;
/** Walking out this early abandons the battle with no result, so instant forfeits cannot farm wins. */
export const MIN_FORFEIT_TICKS = 300;

export interface BattleResult {
  winner: Side | null;
  reason: 'keep' | 'time' | 'forfeit';
  tick: number;
  crowns: [number, number];
  keeps: [number, number];
  forfeitBy?: string;
}

/** Everything a room stores about a live battle. Lives at rooms.round_state. */
export interface OnlineBattle {
  setup: BattleSetup;
  seed: number;
  startAt: number;
  /** Profile ids in wallet order. */
  players: string[];
  log: BattleCommand[];
  version: number;
  result: BattleResult | null;
}

export function createOnlineBattle(mode: 'duel' | 'coop', level: number, playerIds: string[], seed: number, now: number): OnlineBattle {
  const setup: BattleSetup = mode === 'duel' ? { kind: 'duel' } : { kind: 'coop', level };
  if (playerIds.length !== humanSides(setup).length || new Set(playerIds).size !== playerIds.length) throw new Error('Fortress Feud needs exactly 2 players');
  createBattle(setup, seed);
  return { setup, seed, startAt: now + COUNTDOWN_MS, players: [...playerIds], log: [], version: 0, result: null };
}

/** Accepts only well-formed stored battles; anything else is treated as corrupt. */
export function parseOnlineBattle(value: unknown): OnlineBattle | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (!validSetup(raw.setup) || !Number.isInteger(raw.seed) || typeof raw.startAt !== 'number' || !Number.isInteger(raw.version)) return null;
  if (!Array.isArray(raw.players) || !raw.players.every(id => typeof id === 'string')) return null;
  if (raw.players.length !== humanSides(raw.setup).length) return null;
  const log = parseBattleLog(raw.log, raw.setup, MAX_COMMANDS_PER_PLAYER * 2);
  if (!log) return null;
  return {
    setup: raw.setup, seed: raw.seed as number, startAt: raw.startAt, players: raw.players as string[], log,
    version: raw.version as number, result: (raw.result as BattleResult | null) ?? null,
  };
}

export const serverTick = (battle: OnlineBattle, now: number): number => Math.floor((now - battle.startAt) / TICK_MS);

/** State at the start of `tick`, with commands already scheduled for that tick applied. */
function stateBefore(battle: OnlineBattle, tick: number): BattleState {
  const state = replayBattle(battle.setup, battle.seed, battle.log, tick);
  if (!state.outcome) for (const command of battle.log) if (command.t === tick) applyCommand(state, command.p, command);
  return state;
}

export type ScheduleResult = { battle: OnlineBattle; command: BattleCommand } | { error: string };

/** Stamps a player's command a little in the future and validates it against the replayed state. */
export function scheduleCommand(battle: OnlineBattle, playerId: string, input: unknown, now: number): ScheduleResult {
  const player = battle.players.indexOf(playerId);
  if (player < 0) return { error: 'You are not in this battle.' };
  if (battle.result) return { error: 'The battle is over.' };
  const body: CommandBody | null = parseCommandBody(input);
  if (!body) return { error: 'That move is not recognised.' };
  const current = serverTick(battle, now);
  if (current < 0) return { error: 'Get ready — the battle has not started yet.' };
  if (battle.log.filter(command => command.p === player).length >= MAX_COMMANDS_PER_PLAYER) return { error: 'Command limit reached for this battle.' };
  const lastTick = battle.log.length ? battle.log[battle.log.length - 1].t : 0;
  const tick = Math.max(current + COMMAND_DELAY_TICKS, lastTick);
  const state = stateBefore(battle, tick);
  if (state.outcome || tick >= state.endTick) return { error: 'The battle is over.' };
  const error = commandError(state, player, body);
  if (error) return { error };
  const command: BattleCommand = { ...body, t: tick, p: player };
  return { command, battle: { ...battle, log: [...battle.log, command], version: battle.version + 1 } };
}

function resultFrom(state: BattleState): BattleResult {
  return {
    winner: state.outcome!.winner, reason: state.outcome!.reason, tick: state.outcome!.tick,
    crowns: [crowns(state, 0), crowns(state, 1)], keeps: [keepPercent(state, 0), keepPercent(state, 1)],
  };
}

function winnersFor(battle: OnlineBattle, winner: Side | null): string[] {
  const sides = humanSides(battle.setup);
  if (battle.setup.kind === 'coop') return winner === 0 ? [...battle.players] : [];
  // A drawn duel has no winner, so two idle accounts cannot farm wins.
  if (winner === null) return [];
  return battle.players.filter((_, index) => sides[index] === winner);
}

export interface Settlement { battle: OnlineBattle; scores: Record<string, number>; winners: string[] }

function settlement(battle: OnlineBattle, state: BattleState, result: BattleResult): Settlement {
  const points = battleScores(state);
  const scores = Object.fromEntries(battle.players.map((id, index) => [id, points[index]]));
  return { battle: { ...battle, result, version: battle.version + 1 }, scores, winners: winnersFor(battle, result.winner) };
}

/** The authoritative result once the battle has ended in server time; null while it is still running. */
export function settleBattle(battle: OnlineBattle, now: number): Settlement | null {
  if (battle.result) return null;
  const tick = serverTick(battle, now);
  if (tick < 0) return null;
  const state = replayBattle(battle.setup, battle.seed, battle.log, tick);
  if (!state.outcome) return null;
  return settlement(battle, state, resultFrom(state));
}

/**
 * Leaving a duel concedes it. Returns null when there is nothing to record: co-op battles,
 * strangers, or a duel abandoned in its first moments. A battle the replay has already
 * decided keeps its real result, so a winner who leaves early is never marked as the loser.
 */
export function forfeitBattle(battle: OnlineBattle, leaverId: string, now: number): Settlement | null {
  if (battle.result || battle.setup.kind !== 'duel') return null;
  const index = battle.players.indexOf(leaverId);
  if (index < 0) return null;
  const decided = settleBattle(battle, now);
  if (decided) return decided;
  if (serverTick(battle, now) < MIN_FORFEIT_TICKS) return null;
  const state = replayBattle(battle.setup, battle.seed, battle.log, Math.max(0, serverTick(battle, now)));
  const winner: Side = humanSides(battle.setup)[index] === 0 ? 1 : 0;
  state.outcome = { winner, tick: state.tick, reason: 'keep' };
  const base = resultFrom(state);
  return settlement(battle, state, { ...base, reason: 'forfeit', forfeitBy: leaverId });
}
