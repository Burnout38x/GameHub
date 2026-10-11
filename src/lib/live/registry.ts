import type { LiveBase, LiveEngine, LiveType } from './types';
import { bowlEngine } from '@/lib/bowl/engine';
import { dilemmaEngine } from '@/lib/dilemma/engine';
import { whotEngine } from '@/lib/whot/engine';

/** Server-only: the engines hold content banks (trivia answers) that phones must never download. */
export const ENGINES: Record<LiveType, LiveEngine<LiveBase, unknown>> = {
  bowl: bowlEngine as unknown as LiveEngine<LiveBase, unknown>,
  dilemma: dilemmaEngine as unknown as LiveEngine<LiveBase, unknown>,
  whot: whotEngine as unknown as LiveEngine<LiveBase, unknown>,
};

export const engineFor = (type: string): LiveEngine<LiveBase, unknown> | null => ENGINES[type as LiveType] ?? null;
