import type { Dilemma, TopicChoice } from '../types';
import { LOVE } from './love';
import { MARRIAGE } from './marriage';
import { FAMILY } from './family';
import { MONEY } from './money';
import { WAR } from './war';
import { APOCALYPSE } from './apocalypse';
import { MORAL } from './moral';
import { WILD } from './wild';

export const DILEMMAS: Dilemma[] = [...LOVE, ...MARRIAGE, ...FAMILY, ...MONEY, ...WAR, ...APOCALYPSE, ...MORAL, ...WILD];

const byId = new Map(DILEMMAS.map(dilemma => [dilemma.id, dilemma]));
export const dilemmaById = (id: string): Dilemma | undefined => byId.get(id);
export const deckFor = (topic: TopicChoice): Dilemma[] => DILEMMAS.filter(dilemma => topic === 'mixed' || dilemma.topic === topic);
