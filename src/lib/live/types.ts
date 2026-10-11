/**
 * Live room games (Brain Bowl, What Would You Do?, Whot!) share one server contract:
 * the whole game lives in `rooms.round_state`, every change bumps `version`, and each
 * phone only ever sees `view(state, viewer)`. Client-safe: no content banks here.
 */

export type LiveType = 'bowl' | 'dilemma' | 'whot';
export const LIVE_TYPES: readonly LiveType[] = ['bowl', 'dilemma', 'whot'];
export const isLiveType = (type: string | null | undefined): type is LiveType => LIVE_TYPES.includes(type as LiveType);

export interface LivePlayer { id: string; name: string }

export interface LiveBase {
  kind: LiveType;
  version: number;
  players: LivePlayer[];
  /** Set once the match is over; the route then records the result. */
  ended: boolean;
}

export type LiveUpdate<S> = { state: S; changed: boolean } | { error: string };

export interface CreateInput<Setup> {
  players: LivePlayer[];
  setup: Setup;
  difficulty: 'easy' | 'hard' | 'mixed';
  mode: string;
  rounds: number;
  seconds: number | null;
  seed: number;
  now: number;
}

export interface Settlement { scores: Record<string, number>; winners: string[] }

export interface LiveEngine<S extends LiveBase = LiveBase, Setup = unknown> {
  type: LiveType;
  /** Room-creation options from the browser; anything odd falls back to defaults. */
  parseSetup(raw: unknown): Setup;
  /** Player limits for starting a match. */
  minPlayers: number;
  maxPlayers: number;
  create(input: CreateInput<Setup>): S | { error: string };
  parse(raw: unknown): S | null;
  view(state: S, viewer: string, now: number): unknown;
  act(state: S, userId: string, action: unknown, now: number): LiveUpdate<S>;
  /** Moves timed phases along; any player's phone may ask once a deadline passes. */
  advance(state: S, now: number): LiveUpdate<S>;
  remove(state: S, userId: string, now: number): LiveUpdate<S>;
  settle(state: S): Settlement | null;
  /** Rounds in the match, for the room record (questions, situations or hands). */
  rounds(state: S): number;
  /** Has enough of the match been played that walking out should count as a forfeit? */
  progressed(state: S): boolean;
}

/** Small, fast, seedable PRNG (mulberry32): the same seed always deals the same match. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Scores to winners: everyone tied on the top score, provided it is above zero and 2+ played. */
export function topScorers(scores: Record<string, number>): string[] {
  const entries = Object.entries(scores);
  if (entries.length < 2) return [];
  const best = Math.max(...entries.map(([, score]) => score));
  return best > 0 ? entries.filter(([, score]) => score === best).map(([id]) => id) : [];
}

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
