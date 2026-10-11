import type { Level, SectionChoice, SectionId } from './types';

/** Brain Bowl timing and scoring, shared by the server engine and the screens. */
export const READY_MS = 2600;
export const REVEAL_MS = 7000;
export const DEFAULT_SECONDS = 20;
export const BASE_POINTS = 500;
export const SPEED_POINTS = 500;
/** Points per step once a streak reaches three, up to three steps. */
export const STREAK_STEP = 100;
export const MIN_QUESTIONS = 5;
export const MAX_QUESTIONS = 30;

export function answerPoints(correct: boolean, msLeft: number, msTotal: number, streakBefore: number, double: boolean): number {
  if (!correct) return 0;
  const speed = Math.round(SPEED_POINTS * Math.max(0, Math.min(1, msLeft / Math.max(1, msTotal))));
  const streak = streakBefore + 1;
  const bonus = streak >= 3 ? STREAK_STEP * Math.min(streak - 2, 3) : 0;
  return (BASE_POINTS + speed + bonus) * (double ? 2 : 1);
}

export interface BowlStanding { id: string; name: string; points: number; streak: number; best: number; correct: number }
export interface BowlResult { id: string; choice: number | null; correct: boolean; points: number; ms: number | null }

export interface BowlView {
  kind: 'bowl';
  version: number;
  section: SectionChoice;
  index: number;
  total: number;
  phase: 'question' | 'reveal';
  seconds: number;
  startedAt: number;
  deadline: number;
  ended: boolean;
  /** Hidden until the question goes live. */
  question: { section: SectionId; level: Level; prompt: string; options: string[]; double: boolean } | null;
  /** Options your 50/50 removed this question. */
  cut: number[];
  lifeline: boolean;
  mine: { choice: number } | null;
  answered: string[];
  standings: BowlStanding[];
  reveal: { answer: number; fact: string | null; results: BowlResult[]; counts: number[] } | null;
}
