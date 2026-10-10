/** Fortress Feud: drag-and-launch siege battles. All distances are metres, y points up. */

export const WORLD_WIDTH = 140;
export const PLATEAU_Y = 4;
/** Fortress origin (its back edge) measured from each side's own end of the world. */
export const FORT_OFFSET = 14;
/** The trebuchet stands in front of its own walls so low shots never clip home. */
export const LAUNCHER_OFFSET = 36;
/** Shots leave from the tip of the trebuchet arm as it swings up. */
export const LAUNCHER_HEIGHT = 5.8;
export const GRAVITY = 9.8;
export const MIN_SPEED = 12;
export const MAX_SPEED = 40;
export const MIN_ANGLE = 5;
export const MAX_ANGLE = 85;
export const STEP = 1 / 60;
export const MAX_SHOT_SECONDS = 12;

export const START_GOLD = 600;
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
  wood: { id: 'wood', name: 'Timber', density: 0.7, hpPerArea: 42, friction: 0.7, restitution: 0.08, costPerArea: 3, toughness: 2 },
  stone: { id: 'stone', name: 'Stone', density: 2.2, hpPerArea: 85, friction: 0.85, restitution: 0.03, costPerArea: 8, toughness: 5 },
  steel: { id: 'steel', name: 'Steel', density: 3.4, hpPerArea: 160, friction: 0.5, restitution: 0.05, costPerArea: 18, toughness: 9 },
  glass: { id: 'glass', name: 'Glass', density: 1, hpPerArea: 16, friction: 0.4, restitution: 0.1, costPerArea: 4, toughness: 1 },
};
export const BUILD_MATERIALS: MaterialId[] = ['wood', 'stone', 'steel'];

export type RoyalRole = 'king' | 'knight';
export const ROYALS: Record<RoyalRole, { hp: number; radius: number; name: string }> = {
  king: { hp: 180, radius: 0.65, name: 'King' },
  knight: { hp: 120, radius: 0.6, name: 'Knight' },
};

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

