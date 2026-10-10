import type { Difficulty } from '@/lib/types';

/** Co-op rooms reuse the difficulty column to choose how tough the Machine plays. */
export function battleAiLevel(difficulty: Difficulty | string): number {
  return difficulty === 'easy' ? 2 : difficulty === 'hard' ? 4 : 3;
}

export const BATTLE_DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '🛡️ Knight — a fair fight',
  mixed: '⚔️ Captain — smart and steady',
  hard: '🔥 Warlord — deadly accurate',
};
