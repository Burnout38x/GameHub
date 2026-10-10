import {
  BLUEPRINTS, FORT_OFFSET, LAUNCHER_HEIGHT, LAUNCHER_OFFSET, MATERIALS, PLATEAU_Y, ROYALS, WORLD_WIDTH,
  type FortressDesign, type MaterialId, type RoyalRole,
} from './content';

/** The persistent battlefield between shots. Plain JSON so it can live in a room row. */
export type Side = 0 | 1;
export interface BlockState { id: number; kind: 'block'; side: Side; material: MaterialId; w: number; h: number; x: number; y: number; a: number; hp: number; maxHp: number; burn: number }
export interface RoyalState { id: number; kind: 'royal'; side: Side; role: RoyalRole; r: number; x: number; y: number; a: number; hp: number; maxHp: number }
export type BodyState = BlockState | RoyalState;
export interface WorldState { terrain: number[]; bodies: BodyState[]; nextId: number }

const VALLEY_Y = 1;
const round = (value: number, places = 1000) => Math.round(value * places) / places;

/** A plateau at each end and a hill in the middle that forces lobbed shots. */
export function buildTerrain(hill: number): number[] {
  const points: number[] = [-30, PLATEAU_Y, 38, PLATEAU_Y, 44, VALLEY_Y + 1, 48, VALLEY_Y];
  for (let x = 50; x <= 90; x += 2) {
    const t = (x - 50) / 40;
    const bump = (1 - Math.cos(t * Math.PI * 2)) / 2;
    points.push(x, round(VALLEY_Y + bump * (hill - VALLEY_Y)));
  }
  points.push(92, VALLEY_Y, 96, VALLEY_Y + 1, WORLD_WIDTH - 38, PLATEAU_Y, WORLD_WIDTH + 30, PLATEAU_Y);
  return points;
}

/** Ground height at x, by walking the terrain polyline. */
export function groundAt(terrain: readonly number[], x: number): number {
  for (let i = 0; i < terrain.length - 2; i += 2) {
    const [x1, y1, x2, y2] = [terrain[i], terrain[i + 1], terrain[i + 2], terrain[i + 3]];
    if (x >= x1 && x <= x2) return y1 + ((x - x1) / (x2 - x1)) * (y2 - y1);
  }
  return PLATEAU_Y;
}

export const facing = (side: Side): number => (side === 0 ? 1 : -1);
export const fortX = (side: Side, local: number): number => (side === 0 ? FORT_OFFSET + local : WORLD_WIDTH - FORT_OFFSET - local);
export const launcherPosition = (side: Side): { x: number; y: number } => ({
  x: side === 0 ? LAUNCHER_OFFSET : WORLD_WIDTH - LAUNCHER_OFFSET,
  y: PLATEAU_Y + LAUNCHER_HEIGHT,
});

export function placeFortress(world: WorldState, side: Side, design: FortressDesign): void {
  const blueprint = BLUEPRINTS[design.blueprint];
  for (const block of blueprint.blocks) {
    const material: MaterialId = block.glass ? 'glass' : design.materials[block.part];
    const hp = Math.max(20, Math.round(block.w * block.h * MATERIALS[material].hpPerArea));
    world.bodies.push({ id: world.nextId++, kind: 'block', side, material, w: block.w, h: block.h, x: fortX(side, block.x), y: PLATEAU_Y + block.y, a: 0, hp, maxHp: hp, burn: 0 });
  }
  for (const royal of blueprint.royals) {
    const spec = ROYALS[royal.role];
    world.bodies.push({ id: world.nextId++, kind: 'royal', side, role: royal.role, r: spec.radius, x: fortX(side, royal.x), y: PLATEAU_Y + royal.y, a: 0, hp: spec.hp, maxHp: spec.hp });
  }
}

export function createWorld(hill: number, designs: [FortressDesign, FortressDesign]): WorldState {
  const world: WorldState = { terrain: buildTerrain(hill), bodies: [], nextId: 1 };
  placeFortress(world, 0, designs[0]);
  placeFortress(world, 1, designs[1]);
  return world;
}

export const royalsOf = (world: WorldState, side: Side): RoyalState[] =>
  world.bodies.filter((body): body is RoyalState => body.kind === 'royal' && body.side === side);
export const blocksOf = (world: WorldState, side: Side): BlockState[] =>
  world.bodies.filter((body): body is BlockState => body.kind === 'block' && body.side === side);

/** Share of a side's starting royal health still standing, 0–100. */
export function royalHealth(world: WorldState, side: Side, maxTotal: number): number {
  const total = royalsOf(world, side).reduce((sum, royal) => sum + Math.max(0, royal.hp), 0);
  return maxTotal > 0 ? Math.round((total * 100) / maxTotal) : 0;
}
