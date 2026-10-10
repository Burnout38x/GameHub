import { AMMO, ONLINE_TURN_SECONDS, START_GOLD, type AmmoId } from './content';
import { DEFAULT_DESIGN, designCost, parseDesign, type FortressDesign } from './design';
import { planAiShot } from './ai';
import { activePlayer, activePlayerIndex, applyAction, createMatch, forfeit, type MatchAction, type MatchResult, type MatchState } from './match';
import type { Replay } from './physics';
import type { Side } from './world';

/** Long enough to build block by block on a phone. */
export const BUILD_SECONDS = 150;
/** Pause after a shot lands before the Machine may answer, so both phones see the hit. */
export const AFTER_SHOT_MS = 1500;

/** Everything a room stores about a live siege. Lives at rooms.round_state. */
export interface OnlineSiege {
  version: number;
  mode: 'duel' | 'coop';
  level: number;
  seed: number;
  /** Profile ids by seat. Seat 0 is the host. */
  players: string[];
  stage: 'build' | 'battle';
  designs: (FortressDesign | null)[];
  deadline: number;
  match: MatchState | null;
  /** The last shot's flight, served by the battle poll (never in the room snapshot). */
  replay: Replay | null;
  replayTurn: number;
  /** Side that fired the stored replay. */
  replaySide: Side;
  result: (MatchResult & { forfeitBy?: string }) | null;
}

export function createOnlineSiege(mode: 'duel' | 'coop', level: number, playerIds: string[], seed: number, now: number): OnlineSiege {
  if (playerIds.length !== 2 || new Set(playerIds).size !== 2) throw new Error('Fortress Feud needs exactly 2 players');
  return {
    version: 0, mode, level, seed, players: [...playerIds], stage: 'build',
    designs: mode === 'duel' ? [null, null] : [null], deadline: now + BUILD_SECONDS * 1000,
    match: null, replay: null, replayTurn: -1, replaySide: 0, result: null,
  };
}

/** Accepts only well-formed stored sieges; anything else is treated as corrupt. */
export function parseOnlineSiege(value: unknown): OnlineSiege | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<OnlineSiege>;
  if (raw.mode !== 'duel' && raw.mode !== 'coop') return null;
  if (!Number.isInteger(raw.version) || !Number.isInteger(raw.seed) || typeof raw.deadline !== 'number') return null;
  if (!Array.isArray(raw.players) || raw.players.length !== 2 || !raw.players.every(id => typeof id === 'string')) return null;
  if (raw.stage !== 'build' && raw.stage !== 'battle') return null;
  if (!Array.isArray(raw.designs)) return null;
  if (raw.stage === 'battle' && (!raw.match || typeof raw.match !== 'object' || !raw.match.world)) return null;
  return raw as OnlineSiege;
}

/** Match player index each seat controls. In co-op the Machine sits between the two humans. */
export const seatPlayer = (siege: Pick<OnlineSiege, 'mode'>, seat: number): number => (siege.mode === 'coop' && seat === 1 ? 2 : seat);
export const seatOf = (siege: OnlineSiege, userId: string): number => siege.players.indexOf(userId);

function startBattle(siege: OnlineSiege, now: number): OnlineSiege {
  const designs: [FortressDesign, FortressDesign | null] = [siege.designs[0] ?? DEFAULT_DESIGN, siege.mode === 'duel' ? siege.designs[1] ?? DEFAULT_DESIGN : null];
  const setup = siege.mode === 'duel' ? { kind: 'duel' as const } : { kind: 'coop' as const, level: siege.level };
  const match = createMatch(setup, siege.seed, designs, ['Player 1', 'Player 2']);
  return { ...siege, stage: 'battle', match, deadline: now + ONLINE_TURN_SECONDS * 1000 };
}

export type SiegeUpdate = { siege: OnlineSiege; changed: boolean } | { error: string };

/** A player locks in their fortress. Co-op partners share one, so the first design builds it. */
export function submitDesign(siege: OnlineSiege, userId: string, input: unknown, now: number): SiegeUpdate {
  const seat = seatOf(siege, userId);
  if (seat < 0) return { error: 'You are not in this battle.' };
  if (siege.stage !== 'build') return { error: 'The battle has already begun.' };
  // Shape-check the untrusted design first; only then is it safe to price it.
  const design = parseDesign(input, Infinity);
  if (!design) return { error: 'That fortress design is not valid.' };
  if (designCost(design) > START_GOLD) return { error: 'That fortress costs more gold than you have.' };
  const slot = siege.mode === 'coop' ? 0 : seat;
  if (siege.designs[slot]) return { error: siege.mode === 'coop' ? 'Your partner already built the fortress.' : 'Your fortress is already built.' };
  const designs = siege.designs.map((entry, index) => index === slot ? design : entry);
  let next: OnlineSiege = { ...siege, designs, version: siege.version + 1 };
  if (designs.every(Boolean)) next = startBattle(next, now);
  return { siege: next, changed: true };
}

const replaySeconds = (replay: Replay | null) => (replay ? replay.frames.length / replay.fps : 0);

function afterAction(siege: OnlineSiege, match: MatchState, replay: Replay | null, now: number, fired: boolean): OnlineSiege {
  const deadline = now + (replaySeconds(replay) * 1000) + (fired ? AFTER_SHOT_MS : 0) + ONLINE_TURN_SECONDS * 1000;
  return {
    ...siege, match, version: siege.version + 1,
    ...(fired && match.last ? { replay, replayTurn: match.last.turn, replaySide: match.last.side } : {}),
    deadline: fired ? deadline : siege.deadline,
    result: match.result ? { ...match.result } : siege.result,
  };
}

/** Parses a fire/repair order from a phone. */
export function parseOrder(input: unknown): MatchAction | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  if (raw.type === 'repair') return { type: 'repair' };
  if (raw.type !== 'fire') return null;
  if (typeof raw.ammo !== 'string' || !Object.hasOwn(AMMO, raw.ammo)) return null;
  if (typeof raw.angle !== 'number' || typeof raw.power !== 'number' || !Number.isFinite(raw.angle) || !Number.isFinite(raw.power)) return null;
  return { type: 'fire', ammo: raw.ammo as AmmoId, angle: raw.angle, power: raw.power };
}

/** A human order. Only the seat whose turn it is may act. */
export function playerOrder(siege: OnlineSiege, userId: string, input: unknown, now: number): SiegeUpdate {
  const seat = seatOf(siege, userId);
  if (seat < 0) return { error: 'You are not in this battle.' };
  if (siege.stage !== 'battle' || !siege.match) return { error: 'Build your fortress first.' };
  if (siege.match.result) return { error: 'The battle is over.' };
  if (activePlayerIndex(siege.match) !== seatPlayer(siege, seat)) return { error: 'Wait for your turn.' };
  const order = parseOrder(input);
  if (!order) return { error: 'That order is not recognised.' };
  const outcome = applyAction(siege.match, order);
  if ('error' in outcome) return { error: outcome.error };
  return { siege: afterAction(siege, outcome.state, outcome.replay, now, order.type === 'fire'), changed: true };
}

/**
 * Moves the battle along when nobody else will: starts it once build time is up, lets the
 * Machine take its shot, or skips a player who ran out of time. Safe to call repeatedly.
 */
export function advanceSiege(siege: OnlineSiege, now: number): SiegeUpdate {
  if (siege.result) return { siege, changed: false };
  if (siege.stage === 'build') {
    if (now < siege.deadline) return { siege, changed: false };
    return { siege: { ...startBattle(siege, now), version: siege.version + 1 }, changed: true };
  }
  const match = siege.match!;
  const player = activePlayer(match);
  if (player.ai) {
    const readyAt = siege.deadline - ONLINE_TURN_SECONDS * 1000;
    if (now < readyAt) return { siege, changed: false };
    const shot = planAiShot(match.world, player.side, match.wind, match.aiLevel, player, (match.seed + match.turn * 7919) >>> 0);
    const outcome = applyAction(match, { type: 'fire', angle: shot.angle, power: shot.power, ammo: shot.ammo });
    if ('error' in outcome) {
      const fallback = applyAction(match, { type: 'fire', angle: shot.angle, power: shot.power, ammo: 'stone' });
      if ('error' in fallback) return { error: fallback.error };
      return { siege: afterAction(siege, fallback.state, fallback.replay, now, true), changed: true };
    }
    return { siege: afterAction(siege, outcome.state, outcome.replay, now, true), changed: true };
  }
  if (now < siege.deadline) return { siege, changed: false };
  const skipped = applyAction(match, { type: 'skip' });
  if ('error' in skipped) return { error: skipped.error };
  // A Machine up next still waits a moment, so phones show the skip before it fires.
  const pause = !skipped.state.result && activePlayer(skipped.state).ai ? AFTER_SHOT_MS : 0;
  return { siege: { ...afterAction(siege, skipped.state, null, now, false), deadline: now + pause + ONLINE_TURN_SECONDS * 1000 }, changed: true };
}

const humanSide = (siege: OnlineSiege, seat: number): Side => (siege.mode === 'coop' ? 0 : (seat as Side));

export interface Settlement { siege: OnlineSiege; scores: Record<string, number>; winners: string[] }

const firedBySeat = (siege: OnlineSiege, seat: number): number => siege.match?.players[seatPlayer(siege, seat)]?.fired ?? 0;

/**
 * Points for the room: up to 100 for what is left standing, plus 50 for a win. Only players
 * who actually fired earn anything, and a duel only has a winner once both sides have fired,
 * so idle or throwaway matches between two accounts pay nothing.
 */
export function settleSiege(siege: OnlineSiege): Settlement | null {
  const result = siege.result;
  if (!result) return null;
  const everyoneFired = siege.players.every((_, seat) => firedBySeat(siege, seat) > 0);
  const scores: Record<string, number> = {};
  const winners: string[] = [];
  siege.players.forEach((id, seat) => {
    const side = humanSide(siege, seat);
    const active = firedBySeat(siege, seat) > 0;
    const won = active && result.winner === side && (siege.mode === 'coop' || everyoneFired);
    scores[id] = active ? Math.round(result.score[side] / 3) + (won ? 50 : 0) : 0;
    // A drawn duel has no winner, so two idle accounts cannot farm wins.
    if (won) winners.push(id);
  });
  return { siege, scores, winners };
}

/**
 * Leaving a duel concedes it once both sides have really fired. Co-op battles and duels
 * abandoned before that record nothing.
 */
export function forfeitSiege(siege: OnlineSiege, leaverId: string): Settlement | null {
  if (siege.result || siege.mode !== 'duel' || siege.stage !== 'battle' || !siege.match) return null;
  const seat = seatOf(siege, leaverId);
  if (seat < 0 || !siege.players.every((_, index) => firedBySeat(siege, index) > 0)) return null;
  const match = forfeit(siege.match, humanSide(siege, seat));
  return settleSiege({ ...siege, match, version: siege.version + 1, result: { ...match.result!, forfeitBy: leaverId } });
}

/** What phones may see: no bulky replay, and nobody's fortress design before the battle. */
export type PublicSiege = Omit<OnlineSiege, 'replay' | 'designs'> & { designs: never[]; built: boolean[] };

export function publicSiege(siege: OnlineSiege): PublicSiege {
  const copy: Partial<OnlineSiege> = { ...siege };
  delete copy.replay;
  return { ...(copy as Omit<OnlineSiege, 'replay'>), designs: [], built: siege.designs.map(Boolean) };
}
