import type { TopicChoice, TopicId } from './types';

/** What Would You Do? timing and scoring, shared by the server engine and the screens. */
export const DEFAULT_CHOOSE_SECONDS = 45;
/** The reveal waits for everyone to tap Next, up to this long, so arguments can happen. */
export const REVEAL_MAX_MS = 90_000;
export const READ_POINTS = 100;
export const OPEN_BOOK_POINTS = 50;
export const MIN_ROUNDS = 3;
export const MAX_ROUNDS = 30;
export const POINTS_PER_SCORE = 100;

export type DilemmaMode = 'room' | 'hotseat';

export interface DilemmaStanding { id: string; name: string; points: number; reads: number }
export interface DilemmaPick { id: string; choice: number | null; guess: number | null; points: number }

export interface DilemmaView {
  kind: 'dilemma';
  version: number;
  mode: DilemmaMode;
  topic: TopicChoice;
  index: number;
  total: number;
  phase: 'choose' | 'reveal';
  seconds: number;
  deadline: number;
  ended: boolean;
  card: { topic: TopicId; scenario: string; options: string[] };
  /** Hot Seat: whose choice everyone else is guessing. */
  seat: string | null;
  mine: { choice: number | null; guess: number | null } | null;
  answered: string[];
  ready: string[];
  standings: DilemmaStanding[];
  reveal: { picks: DilemmaPick[]; counts: number[]; top: number[] } | null;
}

/** The most chosen options this round (all of them when tied). */
export function topChoices(counts: number[]): number[] {
  const best = Math.max(...counts);
  return best > 0 ? counts.flatMap((count, index) => (count === best ? [index] : [])) : [];
}
