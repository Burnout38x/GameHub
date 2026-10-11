/** What Would You Do?: life-situation dilemmas by topic. Client-safe metadata and types. */

export type TopicId = 'love' | 'marriage' | 'family' | 'money' | 'war' | 'apocalypse' | 'moral' | 'wild';
export type TopicChoice = TopicId | 'mixed';

export interface Topic { id: TopicId; name: string; emoji: string; blurb: string; color: string }

export const TOPICS: Topic[] = [
  { id: 'love', name: 'Love & Romance', emoji: '💘', blurb: 'Crushes, dates, exes and grand gestures.', color: '#f472b6' },
  { id: 'marriage', name: 'Marriage & Commitment', emoji: '💍', blurb: 'In-laws, money, trust and forever.', color: '#fb7185' },
  { id: 'family', name: 'Family & Friends', emoji: '👨‍👩‍👧', blurb: 'Loyalty, secrets and awkward gatherings.', color: '#fbbf24' },
  { id: 'money', name: 'Money & Work', emoji: '💼', blurb: 'Bosses, windfalls, debts and big breaks.', color: '#34d399' },
  { id: 'war', name: 'War & Survival', emoji: '⚔️', blurb: 'Hard calls when lives are on the line.', color: '#f97316' },
  { id: 'apocalypse', name: 'Apocalypse', emoji: '🧟', blurb: 'Zombies, blackouts, floods and the last bunker.', color: '#a3e635' },
  { id: 'moral', name: 'Moral Grey Zone', emoji: '⚖️', blurb: 'No clean answers. Only choices.', color: '#60a5fa' },
  { id: 'wild', name: 'Wild Cards', emoji: '🎲', blurb: 'Absurd, funny and completely unhinged.', color: '#c084fc' },
];
export const TOPIC_IDS = TOPICS.map(topic => topic.id);
export const topicById = (id: string): Topic | undefined => TOPICS.find(topic => topic.id === id);
export const MIXED_TOPIC = { id: 'mixed' as const, name: 'Mixed Bag', emoji: '🌀', blurb: 'A little of everything, from romance to the end of the world.', color: '#fde68a' };

/** A situation and four things you might do about it. */
export interface Dilemma { id: string; topic: TopicId; scenario: string; options: [string, string, string, string] }

/** Bank helper: `d(id, scenario, [a, b, c, d])`. */
export const bankFor = (topic: TopicId) =>
  (id: string, scenario: string, options: [string, string, string, string]): Dilemma => ({ id, topic, scenario, options });
