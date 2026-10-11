/** Brain Bowl: a sectioned trivia championship. Client-safe: no questions or answers live here. */

export type SectionId = 'science' | 'history' | 'geography' | 'naija' | 'sports' | 'screen' | 'tech' | 'brain';
export type SectionChoice = SectionId | 'mixed';
/** 1 = warm-up, 2 = contender, 3 = champion. */
export type Level = 1 | 2 | 3;

export interface Section { id: SectionId; name: string; emoji: string; blurb: string; color: string }

export const SECTIONS: Section[] = [
  { id: 'science', name: 'Science & Nature', emoji: '🔬', blurb: 'Atoms, animals, space and the human body.', color: '#34d399' },
  { id: 'history', name: 'History & Politics', emoji: '🏛️', blurb: 'Empires, wars, leaders and turning points.', color: '#f59e0b' },
  { id: 'geography', name: 'Geography & World', emoji: '🌍', blurb: 'Countries, capitals, rivers and landmarks.', color: '#38bdf8' },
  { id: 'naija', name: 'Naija Know-How', emoji: '🇳🇬', blurb: 'Nigeria: history, culture, places and people.', color: '#22c55e' },
  { id: 'sports', name: 'Sports & Games', emoji: '⚽', blurb: 'Football, athletics, legends and records.', color: '#f97316' },
  { id: 'screen', name: 'Film, Music & TV', emoji: '🎬', blurb: 'Movies, Afrobeats, hit shows and stars.', color: '#f472b6' },
  { id: 'tech', name: 'Tech & Internet', emoji: '💻', blurb: 'Gadgets, apps, inventors and the web.', color: '#a78bfa' },
  { id: 'brain', name: 'Brain Teasers', emoji: '🧠', blurb: 'Logic, number puzzles and trick questions.', color: '#facc15' },
];
export const SECTION_IDS = SECTIONS.map(section => section.id);
export const sectionById = (id: string): Section | undefined => SECTIONS.find(section => section.id === id);
export const MIXED = { id: 'mixed' as const, name: 'Mixed Championship', emoji: '🏆', blurb: 'Every section, one question after another.', color: '#fde68a' };

/**
 * A bank question. The correct option is always written first; the game shuffles
 * the options for every match, so authors never leave a pattern behind.
 */
export interface BowlQuestion {
  id: string;
  section: SectionId;
  level: Level;
  prompt: string;
  options: [string, string, string, string];
  fact?: string;
}

/** Bank helper: `q(id, level, prompt, [correct, wrong, wrong, wrong], fact?)`. */
export const bankFor = (section: SectionId) =>
  (id: string, level: Level, prompt: string, options: [string, string, string, string], fact?: string): BowlQuestion =>
    ({ id, section, level, prompt, options, ...(fact ? { fact } : {}) });
