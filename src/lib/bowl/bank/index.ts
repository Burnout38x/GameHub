import type { BowlQuestion, Level, SectionChoice } from '../types';
import { SCIENCE } from './science';
import { HISTORY } from './history';
import { GEOGRAPHY } from './geography';
import { NAIJA } from './naija';
import { SPORTS } from './sports';
import { SCREEN } from './screen';
import { TECH } from './tech';
import { BRAIN } from './brain';

/** Server-side question bank. Never import this from a client component: it holds the answers. */
export const QUESTIONS: BowlQuestion[] = [...SCIENCE, ...HISTORY, ...GEOGRAPHY, ...NAIJA, ...SPORTS, ...SCREEN, ...TECH, ...BRAIN];

const byId = new Map(QUESTIONS.map(question => [question.id, question]));
export const questionById = (id: string): BowlQuestion | undefined => byId.get(id);

/** Levels each room difficulty draws from. */
export const LEVELS: Record<'easy' | 'hard' | 'mixed', Level[]> = { easy: [1, 2], mixed: [1, 2, 3], hard: [2, 3] };

export function poolFor(section: SectionChoice, difficulty: 'easy' | 'hard' | 'mixed'): BowlQuestion[] {
  const levels = LEVELS[difficulty];
  return QUESTIONS.filter(question => (section === 'mixed' || question.section === section) && levels.includes(question.level));
}
