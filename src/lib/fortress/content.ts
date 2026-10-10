/** Fortress Feud: drag-and-launch siege battles. All distances are metres, y points up. */

export const WORLD_WIDTH = 140;
export const PLATEAU_Y = 4;
/** Fortress origin (its back edge) measured from each side's own end of the world. */
export const FORT_OFFSET = 14;
/** The trebuchet stands in front of its own walls so low shots never clip home. */
export const LAUNCHER_OFFSET = 34;
/** Shots leave from the tip of the trebuchet arm as it swings up. */
export const LAUNCHER_HEIGHT = 5.8;
export const GRAVITY = 9.8;
export const MIN_SPEED = 12;
export const MAX_SPEED = 40;
export const MIN_ANGLE = 5;
export const MAX_ANGLE = 85;
export const STEP = 1 / 60;
export const MAX_SHOT_SECONDS = 12;

export const START_GOLD = 450;
export const TURN_INCOME = 30;
export const DAMAGE_GOLD_PERCENT = 10;
export const ROYAL_BOUNTY = 80;
export const MAX_ELIXIR = 6;
export const REPAIR_COST = 100;
export const SHOTS_PER_PLAYER = 10;
export const ONLINE_TURN_SECONDS = 45;

export type MaterialId = 'wood' | 'stone' | 'steel' | 'glass';
export interface Material {
  id: MaterialId; name: string; density: number; hpPerArea: number; friction: number; restitution: number;
  /** Gold per square metre when building. */
  costPerArea: number;
  /** Impulse a block shrugs off before taking damage. */
  toughness: number;
}
export const MATERIALS: Record<MaterialId, Material> = {
  wood: { id: 'wood', name: 'Timber', density: 0.7, hpPerArea: 42, friction: 0.7, restitution: 0.08, costPerArea: 0, toughness: 2 },
  stone: { id: 'stone', name: 'Stone', density: 2.2, hpPerArea: 85, friction: 0.85, restitution: 0.03, costPerArea: 6, toughness: 5 },
  steel: { id: 'steel', name: 'Steel', density: 3.4, hpPerArea: 160, friction: 0.5, restitution: 0.05, costPerArea: 15, toughness: 9 },
  glass: { id: 'glass', name: 'Glass', density: 1, hpPerArea: 16, friction: 0.4, restitution: 0.1, costPerArea: 0, toughness: 1 },
};
export const BUILD_MATERIALS: MaterialId[] = ['wood', 'stone', 'steel'];

export type PartId = 'frame' | 'floors' | 'walls';
export const PART_NAMES: Record<PartId, string> = { frame: 'Pillars', floors: 'Floors & roof', walls: 'Front walls' };
export type RoyalRole = 'king' | 'knight';
export const ROYALS: Record<RoyalRole, { hp: number; radius: number; name: string }> = {
  king: { hp: 180, radius: 0.65, name: 'King' },
  knight: { hp: 120, radius: 0.6, name: 'Knight' },
};

export interface BlueprintBlock { x: number; y: number; w: number; h: number; part: PartId; glass?: boolean }
export interface Blueprint { id: BlueprintId; name: string; emoji: string; blurb: string; blocks: BlueprintBlock[]; royals: { x: number; y: number; role: RoyalRole }[] }
export type BlueprintId = 'keep' | 'bastion' | 'spire';

const b = (x: number, y: number, w: number, h: number, part: PartId, glass = false): BlueprintBlock => ({ x, y, w, h, part, ...(glass ? { glass } : {}) });

/** Local fortress coordinates: x grows towards the enemy, y from the plateau. Values are block centres. */
export const BLUEPRINTS: Record<BlueprintId, Blueprint> = {
  keep: {
    id: 'keep', name: 'Royal Keep', emoji: '🏰', blurb: 'Balanced two-storey hall behind a tall wall.',
    blocks: [
      b(1, 1.5, 0.8, 3, 'frame'), b(6, 1.5, 0.8, 3, 'frame'), b(11, 1.5, 0.8, 3, 'frame'),
      b(6, 3.3, 11.2, 0.6, 'floors'),
      b(2.5, 4.9, 0.7, 2.6, 'frame'), b(9.5, 4.9, 0.7, 2.6, 'frame'), b(6, 4.2, 1.4, 1.2, 'frame', true),
      b(6, 6.45, 8.4, 0.5, 'floors'), b(6, 7.2, 2, 1, 'floors'),
      b(13.5, 1, 1.2, 2, 'walls'), b(13.5, 3, 1.2, 2, 'walls'), b(13.5, 5, 1.2, 2, 'walls'), b(15.2, 0.8, 1, 1.6, 'walls'),
    ],
    royals: [{ x: 3.5, y: 0.66, role: 'king' }, { x: 8.5, y: 0.61, role: 'knight' }, { x: 4.1, y: 4.21, role: 'knight' }],
  },
  bastion: {
    id: 'bastion', name: 'Iron Bastion', emoji: '🛡️', blurb: 'Low and wide with a double front wall.',
    blocks: [
      b(1, 1.25, 1, 2.5, 'frame'), b(5.5, 1.25, 1, 2.5, 'frame'), b(10, 1.25, 1, 2.5, 'frame'),
      b(5.5, 2.8, 10, 0.6, 'floors'),
      b(3, 3.85, 0.8, 1.5, 'frame'), b(8, 3.85, 0.8, 1.5, 'frame'),
      b(5.5, 4.85, 6.5, 0.5, 'floors'),
      b(12.2, 0.9, 1.4, 1.8, 'walls'), b(12.2, 2.7, 1.4, 1.8, 'walls'), b(12.2, 4.5, 1.4, 1.8, 'walls'),
      b(14, 0.9, 1.2, 1.8, 'walls'), b(14, 2.7, 1.2, 1.8, 'walls'),
    ],
    royals: [{ x: 3.25, y: 0.66, role: 'king' }, { x: 7.75, y: 0.61, role: 'knight' }, { x: 5.5, y: 3.71, role: 'knight' }],
  },
  spire: {
    id: 'spire', name: 'Sky Spire', emoji: '🗼', blurb: 'Three floors high. Hard to reach, harder to topple.',
    blocks: [
      b(2, 1.5, 0.8, 3, 'frame'), b(7, 1.5, 0.8, 3, 'frame'), b(4.5, 3.3, 6.2, 0.6, 'floors'),
      b(2.5, 4.6, 0.7, 2, 'frame'), b(6.5, 4.6, 0.7, 2, 'frame'), b(4.5, 5.85, 5, 0.5, 'floors'),
      b(3, 7.1, 0.6, 2, 'frame'), b(6, 7.1, 0.6, 2, 'frame'), b(4.5, 8.35, 4, 0.5, 'floors'), b(4.5, 9.3, 1.2, 1.4, 'floors'),
      b(10, 1, 1, 2, 'walls'), b(10, 3, 1, 2, 'walls'), b(11.6, 0.75, 1, 1.5, 'walls'),
    ],
    royals: [{ x: 4.5, y: 0.61, role: 'knight' }, { x: 4.5, y: 4.26, role: 'king' }, { x: 4.5, y: 6.71, role: 'knight' }],
  },
};
export const BLUEPRINT_ORDER: BlueprintId[] = ['keep', 'bastion', 'spire'];

export interface FortressDesign { blueprint: BlueprintId; materials: Record<PartId, MaterialId> }
export const DEFAULT_DESIGN: FortressDesign = { blueprint: 'keep', materials: { frame: 'wood', floors: 'wood', walls: 'stone' } };

export function designCost(design: FortressDesign): number {
  let cost = 0;
  for (const block of BLUEPRINTS[design.blueprint].blocks) {
    if (block.glass) continue;
    cost += block.w * block.h * MATERIALS[design.materials[block.part]].costPerArea;
  }
  return Math.round(cost);
}

export type AmmoId = 'stone' | 'iron' | 'bomb' | 'cluster' | 'fire' | 'buster' | 'barrage' | 'titan';
export interface Ammo {
  id: AmmoId; name: string; emoji: string; blurb: string;
  gold: number; elixir: number;
  radius: number; density: number; speedScale: number;
  blast?: { radius: number; damage: number; force: number };
  /** Splits into this many bomblets at the top of its arc. */
  split?: number;
  ignite?: boolean;
  pierce?: number;
  /** Fires this many balls in a spread. */
  volley?: number;
}
export const AMMO: Record<AmmoId, Ammo> = {
  stone: { id: 'stone', name: 'Stone', emoji: '🪨', blurb: 'Free, honest and reliable.', gold: 0, elixir: 0, radius: 0.45, density: 9, speedScale: 1 },
  iron: { id: 'iron', name: 'Iron Ball', emoji: '⚫', blurb: 'Heavy. Topples pillars and walls.', gold: 40, elixir: 0, radius: 0.42, density: 16, speedScale: 1 },
  bomb: { id: 'bomb', name: 'Bomb', emoji: '💣', blurb: 'Explodes on impact.', gold: 90, elixir: 0, radius: 0.45, density: 8, speedScale: 1, blast: { radius: 3.4, damage: 95, force: 60 } },
  cluster: { id: 'cluster', name: 'Cluster', emoji: '🎆', blurb: 'Bursts into four bomblets at its peak.', gold: 120, elixir: 0, radius: 0.4, density: 8, speedScale: 1, split: 4, blast: { radius: 2.2, damage: 48, force: 32 } },
  fire: { id: 'fire', name: 'Fire Pot', emoji: '🔥', blurb: 'Sets timber ablaze for three turns.', gold: 70, elixir: 0, radius: 0.45, density: 7, speedScale: 1, ignite: true, blast: { radius: 2.4, damage: 30, force: 15 } },
  buster: { id: 'buster', name: 'Bunker Buster', emoji: '🗡️', blurb: 'Punches straight through blocks.', gold: 140, elixir: 0, radius: 0.32, density: 30, speedScale: 1.1, pierce: 3 },
  barrage: { id: 'barrage', name: 'Barrage', emoji: '☄️', blurb: 'Three iron balls at once.', gold: 0, elixir: 3, radius: 0.42, density: 14, speedScale: 1, volley: 3 },
  titan: { id: 'titan', name: 'Titan Boulder', emoji: '🌑', blurb: 'An enormous crushing boulder.', gold: 0, elixir: 5, radius: 1.05, density: 12, speedScale: 0.92 },
};
export const AMMO_ORDER: AmmoId[] = ['stone', 'iron', 'bomb', 'cluster', 'fire', 'buster', 'barrage', 'titan'];
export const BURN_TURNS = 3;
export const BURN_DAMAGE = 22;

export interface AiProfile { candidates: number; angleNoise: number; powerNoise: number; premium: number; design: FortressDesign }
export const AI_LEVELS: Record<number, AiProfile> = {
  1: { candidates: 1, angleNoise: 12, powerNoise: 0.12, premium: 0, design: { blueprint: 'keep', materials: { frame: 'wood', floors: 'wood', walls: 'wood' } } },
  2: { candidates: 3, angleNoise: 7.5, powerNoise: 0.075, premium: 0.2, design: { blueprint: 'keep', materials: { frame: 'wood', floors: 'stone', walls: 'stone' } } },
  3: { candidates: 8, angleNoise: 4, powerNoise: 0.04, premium: 0.45, design: { blueprint: 'bastion', materials: { frame: 'stone', floors: 'stone', walls: 'stone' } } },
  4: { candidates: 12, angleNoise: 2.5, powerNoise: 0.025, premium: 0.7, design: { blueprint: 'bastion', materials: { frame: 'stone', floors: 'steel', walls: 'steel' } } },
  5: { candidates: 16, angleNoise: 1.4, powerNoise: 0.014, premium: 0.9, design: { blueprint: 'spire', materials: { frame: 'steel', floors: 'steel', walls: 'steel' } } },
};

export interface Mission {
  id: number; name: string; emoji: string; briefing: string; tip: string;
  aiLevel: number; enemy: FortressDesign; windMax: number; hill: number; par: number; gold?: number;
}
const design = (blueprint: BlueprintId, frame: MaterialId, floors: MaterialId, walls: MaterialId): FortressDesign => ({ blueprint, materials: { frame, floors, walls } });
export const MISSIONS: Mission[] = [
  { id: 1, name: 'Target Practice', emoji: '🎯', aiLevel: 1, enemy: design('keep', 'wood', 'wood', 'wood'), windMax: 0, hill: 8, par: 5, briefing: 'A timber keep and a sleepy guard. Knock out the King and both Knights.', tip: 'Drag back from anywhere, aim, and let go. The dots show your launch.' },
  { id: 2, name: 'Stone Cold', emoji: '🧱', aiLevel: 1, enemy: design('keep', 'wood', 'stone', 'stone'), windMax: 0.6, hill: 9, par: 6, briefing: 'Their walls are stone now. Lob over them.', tip: 'A high arc drops straight onto the roof.' },
  { id: 3, name: 'Windy Ridge', emoji: '🌬️', aiLevel: 2, enemy: design('keep', 'wood', 'wood', 'stone'), windMax: 2.2, hill: 11, par: 6, briefing: 'A gale howls across the ridge. Watch the flag.', tip: 'Wind pushes harder on long, high shots.' },
  { id: 4, name: 'The Spire', emoji: '🗼', aiLevel: 2, enemy: design('spire', 'wood', 'stone', 'wood'), windMax: 1, hill: 9, par: 6, briefing: 'A tall, thin tower. Take out its legs.', tip: 'Iron balls snap timber pillars.' },
  { id: 5, name: 'Iron Bastion', emoji: '🛡️', aiLevel: 3, enemy: design('bastion', 'stone', 'stone', 'steel'), windMax: 1.2, hill: 10, par: 7, briefing: 'A squat bunker with a steel face. Go over the top.', tip: 'Bombs ignore armour: blast damage hits everything nearby.' },
  { id: 6, name: 'Fire Season', emoji: '🔥', aiLevel: 3, enemy: design('keep', 'wood', 'wood', 'wood'), windMax: 1.5, hill: 12, par: 5, gold: 600, briefing: 'Dry timber everywhere. One spark could do it.', tip: 'Fire keeps burning for three turns.' },
  { id: 7, name: 'High Ground', emoji: '⛰️', aiLevel: 3, enemy: design('keep', 'stone', 'stone', 'stone'), windMax: 1, hill: 17, par: 7, briefing: 'A mountain stands between you. Only steep arcs will clear it.', tip: 'Aim above 55° to clear the peak.' },
  { id: 8, name: 'Glass Palace', emoji: '💎', aiLevel: 4, enemy: design('spire', 'stone', 'steel', 'stone'), windMax: 1.6, hill: 11, par: 7, briefing: 'A steel-floored spire. Find the weak pillars.', tip: 'Clusters rain down on every floor at once.' },
  { id: 9, name: 'Storm Front', emoji: '⛈️', aiLevel: 4, enemy: design('bastion', 'stone', 'steel', 'stone'), windMax: 3, hill: 12, par: 8, briefing: 'The fiercest winds in the realm.', tip: 'Heavy shots drift less in the wind.' },
  { id: 10, name: 'Siege Lord', emoji: '⚔️', aiLevel: 4, enemy: design('bastion', 'steel', 'steel', 'steel'), windMax: 1.5, hill: 11, par: 8, gold: 650, briefing: 'An all-steel bunker and a sharp-eyed gunner.', tip: 'Bunker Busters punch through three blocks.' },
  { id: 11, name: 'Twin Peaks', emoji: '🏔️', aiLevel: 5, enemy: design('keep', 'steel', 'stone', 'steel'), windMax: 2, hill: 18, par: 8, briefing: 'A towering peak and a gunner who rarely misses.', tip: 'Save elixir for a Titan Boulder.' },
  { id: 12, name: 'Machine King', emoji: '🤖', aiLevel: 5, enemy: design('spire', 'steel', 'steel', 'steel'), windMax: 2.4, hill: 14, par: 9, gold: 700, briefing: 'The Machine King hides at the top of a steel spire. End this.', tip: 'Topple the spire and gravity does the rest.' },
];

export const SKIRMISH_LEVELS = [
  { level: 1, label: 'Squire', detail: 'Wild, hopeful shots' },
  { level: 2, label: 'Knight', detail: 'Finds the range' },
  { level: 3, label: 'Captain', detail: 'Steady and stubborn' },
  { level: 4, label: 'Warlord', detail: 'Deadly accurate' },
  { level: 5, label: 'Machine King', detail: 'Rarely misses' },
] as const;
