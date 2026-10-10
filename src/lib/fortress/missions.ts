import type { MaterialId } from './content';
import { templateDesign, type FortressDesign, type TemplateId } from './design';

/** Machine opponents and the solo campaign. */
const design = (template: TemplateId, frame: MaterialId, floors: MaterialId, walls: MaterialId): FortressDesign => templateDesign(template, { frame, floors, walls });

export interface AiProfile { candidates: number; angleNoise: number; powerNoise: number; premium: number; design: FortressDesign }
export const AI_LEVELS: Record<number, AiProfile> = {
  1: { candidates: 1, angleNoise: 12, powerNoise: 0.12, premium: 0, design: design('keep', 'wood', 'wood', 'wood') },
  2: { candidates: 3, angleNoise: 7.5, powerNoise: 0.075, premium: 0.2, design: design('keep', 'wood', 'stone', 'stone') },
  3: { candidates: 8, angleNoise: 4, powerNoise: 0.04, premium: 0.45, design: design('bastion', 'stone', 'stone', 'stone') },
  4: { candidates: 12, angleNoise: 2.5, powerNoise: 0.025, premium: 0.7, design: design('bastion', 'stone', 'steel', 'steel') },
  5: { candidates: 16, angleNoise: 1.4, powerNoise: 0.014, premium: 0.9, design: design('spire', 'steel', 'steel', 'steel') },
};

export interface Mission {
  id: number; name: string; emoji: string; briefing: string; tip: string;
  aiLevel: number; enemy: FortressDesign; windMax: number; hill: number; par: number; gold?: number;
}
export const MISSIONS: Mission[] = [
  { id: 1, name: 'Target Practice', emoji: '🎯', aiLevel: 1, enemy: design('outpost', 'wood', 'wood', 'wood'), windMax: 0, hill: 8, par: 5, briefing: 'A timber outpost and a sleepy guard. Knock out the King and both Knights.', tip: 'Drag back from anywhere, aim, and let go. The dots show your launch.' },
  { id: 2, name: 'Stone Cold', emoji: '🧱', aiLevel: 1, enemy: design('outpost', 'wood', 'wood', 'stone'), windMax: 0.6, hill: 9, par: 6, briefing: 'Their walls are stone now. Lob over them.', tip: 'A high arc drops straight onto the roof.' },
  { id: 3, name: 'Windy Ridge', emoji: '🌬️', aiLevel: 2, enemy: design('keep', 'wood', 'wood', 'stone'), windMax: 2.2, hill: 11, par: 6, briefing: 'A gale howls across the ridge. Watch the flag.', tip: 'Wind pushes harder on long, high shots.' },
  { id: 4, name: 'The Spire', emoji: '🗼', aiLevel: 2, enemy: design('spire', 'wood', 'wood', 'wood'), windMax: 1, hill: 9, par: 6, briefing: 'A tall, thin tower. Take out its legs.', tip: 'Iron balls snap timber pillars.' },
  { id: 5, name: 'Iron Bastion', emoji: '🛡️', aiLevel: 3, enemy: design('bastion', 'stone', 'stone', 'steel'), windMax: 1.2, hill: 10, par: 7, briefing: 'A squat bunker with a steel face. Go over the top.', tip: 'Bombs ignore armour: blast damage hits everything nearby.' },
  { id: 6, name: 'Fire Season', emoji: '🔥', aiLevel: 3, enemy: design('keep', 'wood', 'wood', 'wood'), windMax: 1.5, hill: 12, par: 5, gold: 750, briefing: 'Dry timber everywhere. One spark could do it.', tip: 'Fire keeps burning for three turns.' },
  { id: 7, name: 'High Ground', emoji: '⛰️', aiLevel: 3, enemy: design('keep', 'stone', 'stone', 'stone'), windMax: 1, hill: 17, par: 7, briefing: 'A mountain stands between you. Only steep arcs will clear it.', tip: 'Aim above 55° to clear the peak.' },
  { id: 8, name: 'Glass Palace', emoji: '💎', aiLevel: 4, enemy: design('spire', 'stone', 'steel', 'stone'), windMax: 1.6, hill: 11, par: 7, briefing: 'A steel-floored spire. Find the weak pillars.', tip: 'Clusters rain down on every floor at once.' },
  { id: 9, name: 'Storm Front', emoji: '⛈️', aiLevel: 4, enemy: design('bastion', 'stone', 'steel', 'stone'), windMax: 3, hill: 12, par: 8, briefing: 'The fiercest winds in the realm.', tip: 'Heavy shots drift less in the wind.' },
  { id: 10, name: 'Siege Lord', emoji: '⚔️', aiLevel: 4, enemy: design('bastion', 'steel', 'steel', 'steel'), windMax: 1.5, hill: 11, par: 8, gold: 800, briefing: 'An all-steel bunker and a sharp-eyed gunner.', tip: 'Bunker Busters punch through three blocks.' },
  { id: 11, name: 'Twin Peaks', emoji: '🏔️', aiLevel: 5, enemy: design('keep', 'steel', 'stone', 'steel'), windMax: 2, hill: 18, par: 8, briefing: 'A towering peak and a gunner who rarely misses.', tip: 'Save elixir for a Titan Boulder.' },
  { id: 12, name: 'Machine King', emoji: '🤖', aiLevel: 5, enemy: design('spire', 'steel', 'steel', 'steel'), windMax: 2.4, hill: 14, par: 9, gold: 850, briefing: 'The Machine King hides at the top of a steel spire. End this.', tip: 'Topple the spire and gravity does the rest.' },
];

export const SKIRMISH_LEVELS = [
  { level: 1, label: 'Squire', detail: 'Wild, hopeful shots' },
  { level: 2, label: 'Knight', detail: 'Finds the range' },
  { level: 3, label: 'Captain', detail: 'Steady and stubborn' },
  { level: 4, label: 'Warlord', detail: 'Deadly accurate' },
  { level: 5, label: 'Machine King', detail: 'Rarely misses' },
] as const;
