/** Fortress Feud rules data. Every number here is shared by the browser and the server replay. */

export const TICK_MS = 100;
export const TICKS_PER_SECOND = 10;
export const MATCH_TICKS = 180 * TICKS_PER_SECOND;
/** Elixir doubles for the final minute. */
export const OVERDRIVE_TICKS = 60 * TICKS_PER_SECOND;
/** Online commands land this far in the future so both players simulate them on time. */
export const COMMAND_DELAY_TICKS = 12;

export const FIELD_LENGTH = 1000;
export const LANES = 3;
export const KEEP_Y = 40;
export const SPAWN_Y = 75;
/** Pad rows measured from each side's own baseline: back row then front row. */
export const PAD_ROWS = [125, 205] as const;
export const PADS_PER_SIDE = LANES * PAD_ROWS.length;
export const KEEP_REACH = 60;
/** Must out-range every troop standing at the keep's edge (range + KEEP_REACH). */
export const KEEP_RANGE = 230;
export const KEEP_DAMAGE = 85;
export const KEEP_SPLASH = 40;
export const KEEP_COOLDOWN = 6;
export const SIGHT = 110;

/** Elixir and gold are stored in milli-units so the simulation never relies on fractions. */
export const MILLI = 1000;
export const MAX_ELIXIR = 10 * MILLI;
/** One elixir every two seconds (50 milli-elixir per tick). */
export const ELIXIR_PER_TICK = 50;
export const START_ELIXIR = 5 * MILLI;
export const START_GOLD = 250;
export const BASE_INCOME_PER_SECOND = 3;
export const BOUNTY_PER_ELIXIR = 3;
export const SELL_REFUND_PERCENT = 50;
export const MAX_LEVEL = 3;

export type CardId = 'knight' | 'archers' | 'goblins' | 'ram' | 'giant' | 'wizard' | 'meteor';
export type DefenseId = 'wall' | 'archer' | 'cannon' | 'frost' | 'mortar' | 'mine';

export interface TroopCard {
  id: CardId;
  name: string;
  emoji: string;
  cost: number;
  blurb: string;
  count: number;
  hp: number;
  damage: number;
  range: number;
  cooldown: number;
  speed: number;
  splash: number;
  buildingsOnly: boolean;
  spell?: { structureDamage: number; unitDamage: number; radius: number };
}

const troop = (card: Omit<TroopCard, 'splash' | 'buildingsOnly'> & Partial<Pick<TroopCard, 'splash' | 'buildingsOnly'>>): TroopCard =>
  ({ splash: 0, buildingsOnly: false, ...card });

export const CARDS: Record<CardId, TroopCard> = {
  knight: troop({ id: 'knight', name: 'Knight', emoji: '⚔️', cost: 3, blurb: 'Sturdy melee fighter. Great all-rounder.', count: 1, hp: 1100, damage: 110, range: 24, cooldown: 12, speed: 4 }),
  archers: troop({ id: 'archers', name: 'Archers', emoji: '🏹', cost: 3, blurb: 'Two ranged shooters that hang back.', count: 2, hp: 300, damage: 55, range: 150, cooldown: 11, speed: 4 }),
  goblins: troop({ id: 'goblins', name: 'Goblin Gang', emoji: '👺', cost: 2, blurb: 'Three quick stabbers. Cheap swarm.', count: 3, hp: 200, damage: 70, range: 20, cooldown: 9, speed: 7 }),
  ram: troop({ id: 'ram', name: 'Battering Ram', emoji: '🐏', cost: 4, blurb: 'Fast siege. Ignores troops, smashes buildings.', count: 1, hp: 1300, damage: 240, range: 22, cooldown: 18, speed: 6, buildingsOnly: true }),
  giant: troop({ id: 'giant', name: 'Giant', emoji: '🗿', cost: 5, blurb: 'Huge tank that only hits buildings.', count: 1, hp: 3200, damage: 160, range: 24, cooldown: 15, speed: 3, buildingsOnly: true }),
  wizard: troop({ id: 'wizard', name: 'Wizard', emoji: '🧙', cost: 5, blurb: 'Fireballs hit every enemy in a small area.', count: 1, hp: 600, damage: 140, range: 140, cooldown: 14, speed: 4, splash: 45 }),
  meteor: troop({ id: 'meteor', name: 'Meteor', emoji: '☄️', cost: 4, blurb: 'Crashes on the first enemy building in a lane.', count: 0, hp: 0, damage: 0, range: 0, cooldown: 0, speed: 0, spell: { structureDamage: 520, unitDamage: 320, radius: 60 } }),
};
export const CARD_ORDER: CardId[] = ['goblins', 'knight', 'archers', 'ram', 'meteor', 'giant', 'wizard'];

export interface DefenseDef {
  id: DefenseId;
  name: string;
  emoji: string;
  cost: number;
  blurb: string;
  hp: number;
  damage: number;
  range: number;
  minRange: number;
  cooldown: number;
  splash: number;
  slowTicks: number;
  income: number;
}

const defense = (def: Pick<DefenseDef, 'id' | 'name' | 'emoji' | 'cost' | 'blurb' | 'hp'> & Partial<DefenseDef>): DefenseDef =>
  ({ damage: 0, range: 0, minRange: 0, cooldown: 0, splash: 0, slowTicks: 0, income: 0, ...def });

export const DEFENSES: Record<DefenseId, DefenseDef> = {
  wall: defense({ id: 'wall', name: 'Stone Wall', emoji: '🧱', cost: 80, blurb: 'Tough and simple. Stops troops in their tracks.', hp: 1200 }),
  archer: defense({ id: 'archer', name: 'Archer Tower', emoji: '🏹', cost: 120, blurb: 'Fast, reliable single-target arrows.', hp: 750, damage: 55, range: 175, cooldown: 8 }),
  cannon: defense({ id: 'cannon', name: 'Cannon', emoji: '💣', cost: 160, blurb: 'Heavy hits. Shreds tanks up close.', hp: 950, damage: 160, range: 135, cooldown: 15 }),
  frost: defense({ id: 'frost', name: 'Frost Tower', emoji: '❄️', cost: 140, blurb: 'Chills groups of troops to half speed.', hp: 700, damage: 28, range: 150, cooldown: 10, splash: 45, slowTicks: 22 }),
  mortar: defense({ id: 'mortar', name: 'Mortar', emoji: '🔥', cost: 200, blurb: 'Long-range splash. Blind spot up close.', hp: 850, damage: 110, range: 270, minRange: 70, cooldown: 24, splash: 55 }),
  mine: defense({ id: 'mine', name: 'Gold Mine', emoji: '⛏️', cost: 150, blurb: '+3 gold every second. Protect it!', hp: 600, income: 3 }),
};
export const DEFENSE_ORDER: DefenseId[] = ['wall', 'archer', 'cannon', 'frost', 'mortar', 'mine'];

/** Each level adds 35% to health and damage. */
export function levelScale(value: number, level: number): number {
  return Math.floor((value * (100 + (level - 1) * 35)) / 100);
}
export function upgradeCost(def: DefenseId, level: number): number {
  return level >= MAX_LEVEL ? Infinity : Math.floor((DEFENSES[def].cost * (level + 1)) / 2) + 20;
}

export interface AiProfile {
  /** Percent of normal elixir regeneration. */
  elixirRate: number;
  goldIncome: number;
  startGold: number;
  thinkEvery: number;
  /** Elixir the AI banks before spending, in whole elixir. */
  bank: number;
  cards: CardId[];
  builds: DefenseId[];
  /** Chance (0-100) to answer a push in the threatened lane rather than its plan. */
  defendChance: number;
}

export const AI_LEVELS: Record<number, AiProfile> = {
  1: { elixirRate: 70, goldIncome: 3, startGold: 120, thinkEvery: 22, bank: 3, cards: ['knight', 'goblins', 'archers'], builds: ['archer', 'wall'], defendChance: 30 },
  2: { elixirRate: 85, goldIncome: 4, startGold: 200, thinkEvery: 16, bank: 4, cards: ['knight', 'goblins', 'archers', 'ram'], builds: ['archer', 'wall', 'cannon'], defendChance: 50 },
  3: { elixirRate: 100, goldIncome: 4, startGold: 250, thinkEvery: 12, bank: 5, cards: ['knight', 'goblins', 'archers', 'ram', 'giant', 'wizard'], builds: ['archer', 'cannon', 'wall', 'frost'], defendChance: 65 },
  4: { elixirRate: 115, goldIncome: 5, startGold: 320, thinkEvery: 9, bank: 6, cards: ['knight', 'goblins', 'archers', 'ram', 'giant', 'wizard', 'meteor'], builds: ['cannon', 'archer', 'frost', 'mortar', 'wall', 'mine'], defendChance: 80 },
  5: { elixirRate: 135, goldIncome: 6, startGold: 400, thinkEvery: 7, bank: 7, cards: ['knight', 'goblins', 'archers', 'ram', 'giant', 'wizard', 'meteor'], builds: ['cannon', 'mortar', 'frost', 'archer', 'mine', 'wall'], defendChance: 92 },
};

export interface Mission {
  id: number;
  name: string;
  emoji: string;
  briefing: string;
  tip: string;
  aiLevel: number;
  enemyKeep: number;
  playerKeep?: number;
  /** Buildings already standing on the enemy side: [pad, defense, level]. */
  enemyStart?: [number, DefenseId, number][];
  aiCards?: CardId[];
  playerGold?: number;
  incomeBonus?: number;
  overdriveAll?: boolean;
  seconds?: number;
}

export const MISSIONS: Mission[] = [
  { id: 1, name: 'First Watch', emoji: '🌅', aiLevel: 1, enemyKeep: 2000, briefing: 'A scout camp tests your gates. Send troops down any lane and knock over their keep.', tip: 'Pick a troop, then tap a lane. Elixir refills on its own.' },
  { id: 2, name: 'Archer Hill', emoji: '🏹', aiLevel: 1, enemyKeep: 2400, enemyStart: [[4, 'archer', 1]], briefing: 'Archers guard the centre bridge. Find the open lane.', tip: 'Undefended lanes are a fast road to the keep.' },
  { id: 3, name: 'Iron Gate', emoji: '🧱', aiLevel: 2, enemyKeep: 2800, enemyStart: [[3, 'wall', 1], [4, 'wall', 1], [5, 'wall', 1]], briefing: 'Walls block every road. Siege power wins here.', tip: 'Rams and Meteors crack walls quickly.' },
  { id: 4, name: 'Goblin Rush', emoji: '👺', aiLevel: 2, enemyKeep: 2800, aiCards: ['goblins', 'goblins', 'knight'], briefing: 'Swarms of goblins pour over the river. Hold the line.', tip: 'Frost Towers and Wizards make swarms melt.' },
  { id: 5, name: 'Gold Rush', emoji: '⛏️', aiLevel: 3, enemyKeep: 3000, incomeBonus: 4, enemyStart: [[0, 'mine', 1], [2, 'mine', 1]], briefing: 'Both sides earn extra gold. Spend it faster than they do.', tip: 'A Gold Mine pays for itself in under a minute.' },
  { id: 6, name: 'Siege Engines', emoji: '🐏', aiLevel: 3, enemyKeep: 3200, aiCards: ['ram', 'giant', 'knight', 'archers'], briefing: 'The enemy brings rams and giants. Build defenses that hit hard.', tip: 'Cannons and walls stop tanks; troops do too.' },
  { id: 7, name: 'Frozen Front', emoji: '❄️', aiLevel: 3, enemyKeep: 3400, enemyStart: [[3, 'frost', 1], [5, 'frost', 1], [1, 'cannon', 1]], briefing: 'Frost towers slow everything you send. Push with tough troops.', tip: 'Giants shrug off slow; goblins do not.' },
  { id: 8, name: "Wizard's Tower", emoji: '🧙', aiLevel: 4, enemyKeep: 3600, aiCards: ['wizard', 'knight', 'giant', 'archers'], briefing: 'Their wizards burn swarms. Spread your attack across lanes.', tip: 'Knights and Rams survive splash better than goblins.' },
  { id: 9, name: 'Double Trouble', emoji: '⚡', aiLevel: 4, enemyKeep: 3800, overdriveAll: true, briefing: 'Elixir flows twice as fast all battle. Chaos is guaranteed.', tip: 'Spend constantly. Banked elixir is wasted elixir.' },
  { id: 10, name: 'The Bastion', emoji: '🏰', aiLevel: 4, enemyKeep: 4800, enemyStart: [[3, 'cannon', 2], [4, 'mortar', 1], [5, 'cannon', 2], [0, 'archer', 2], [2, 'archer', 2]], playerGold: 500, briefing: 'A fully built fortress. Bring everything you have.', tip: 'Meteor the cannon, then send a Giant behind it.' },
  { id: 11, name: 'Blitz', emoji: '⏱️', aiLevel: 5, enemyKeep: 3200, seconds: 100, briefing: 'Only 100 seconds on the clock. Strike first and strike hard.', tip: 'Win on keep health if the timer runs out.' },
  { id: 12, name: 'Machine King', emoji: '🤖', aiLevel: 5, enemyKeep: 5600, playerKeep: 3600, enemyStart: [[3, 'cannon', 1], [5, 'frost', 1]], briefing: 'The Machine King commands everything. Prove you are the true ruler.', tip: 'Balance gold for defense with a steady stream of attacks.' },
];

export const SKIRMISH_LEVELS = [
  { level: 1, label: 'Squire', detail: 'Relaxed practice' },
  { level: 2, label: 'Knight', detail: 'A fair fight' },
  { level: 3, label: 'Captain', detail: 'Smart and steady' },
  { level: 4, label: 'Warlord', detail: 'Hits hard, builds fast' },
  { level: 5, label: 'Machine King', detail: 'Merciless' },
] as const;

export const DEFAULT_KEEP_HP = 4000;
export const COOP_KEEP_HP = 5000;
