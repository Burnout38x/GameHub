import { FORT_OFFSET, LAUNCHER_HEIGHT, LAUNCHER_OFFSET, MATERIALS, PLATEAU_Y, ROYALS, WORLD_WIDTH, type MaterialId, type RoyalRole } from './content';
import { PIECES, pieceArea, type FortressDesign, type PieceKind, type PieceShape } from './design';

/** The persistent battlefield between shots. Plain JSON so it can live in a room row. */
export type Side = 0 | 1;
export interface BlockState {
  id: number; kind: 'block'; side: Side; piece: PieceKind; shape: PieceShape; material: MaterialId;
  w: number; h: number; x: number; y: number; a: number; hp: number; maxHp: number; burn: number;
}
export interface RoyalState { id: number; kind: 'royal'; side: Side; role: RoyalRole; r: number; x: number; y: number; a: number; hp: number; maxHp: number }
export type BodyState = BlockState | RoyalState;
/** `terrain` is a flattened polyline [x0, y0, x1, y1, …] sampled every metre so blasts can dig craters. */
export interface WorldState { terrain: number[]; bodies: BodyState[]; nextId: number }

const VALLEY_Y = 1;
const TERRAIN_FROM = -30;
const TERRAIN_TO = WORLD_WIDTH + 30;
const LOWEST_GROUND = -3;
const round = (value: number, places = 1000) => Math.round(value * places) / places;

/** Height of the untouched landscape: a plateau at each end and a hill in the middle. */
function baseHeight(x: number, hill: number): number {
  const edge = WORLD_WIDTH - 38;
  const slope = (from: number, to: number, a: number, b: number) => a + ((x - from) / (to - from)) * (b - a);
  if (x <= 38 || x >= edge) return PLATEAU_Y;
  if (x < 44) return slope(38, 44, PLATEAU_Y, VALLEY_Y + 1);
  if (x < 48) return slope(44, 48, VALLEY_Y + 1, VALLEY_Y);
  if (x > WORLD_WIDTH - 44) return slope(WORLD_WIDTH - 44, edge, VALLEY_Y + 1, PLATEAU_Y);
  if (x > WORLD_WIDTH - 48) return slope(WORLD_WIDTH - 48, WORLD_WIDTH - 44, VALLEY_Y, VALLEY_Y + 1);
  if (x < 50 || x > 90) return VALLEY_Y;
  const t = (x - 50) / 40;
  return VALLEY_Y + ((1 - Math.cos(t * Math.PI * 2)) / 2) * (hill - VALLEY_Y);
}

export function buildTerrain(hill: number): number[] {
  const points: number[] = [];
  for (let x = TERRAIN_FROM; x <= TERRAIN_TO; x += 1) points.push(x, round(baseHeight(x, hill)));
  return points;
}

/** Ground height at x, by walking the terrain polyline. */
export function groundAt(terrain: readonly number[], x: number): number {
  if (terrain.length >= 4 && terrain[2] - terrain[0] === 1) {
    // Evenly spaced: jump straight to the segment.
    const index = Math.max(0, Math.min(terrain.length / 2 - 2, Math.floor(x - terrain[0]))) * 2;
    const [x1, y1, x2, y2] = [terrain[index], terrain[index + 1], terrain[index + 2], terrain[index + 3]];
    return y1 + ((x - x1) / (x2 - x1)) * (y2 - y1);
  }
  for (let i = 0; i < terrain.length - 2; i += 2) {
    const [x1, y1, x2, y2] = [terrain[i], terrain[i + 1], terrain[i + 2], terrain[i + 3]];
    if (x >= x1 && x <= x2) return y1 + ((x - x1) / (x2 - x1)) * (y2 - y1);
  }
  return PLATEAU_Y;
}

/**
 * Digs a bowl where a blast or a heavy impact meets the ground. Deeper the closer the blast
 * was to the surface. Returns a new terrain, or the same one when nothing changed.
 */
export function crater(terrain: readonly number[], x: number, y: number, radius: number): number[] | null {
  const surface = groundAt(terrain, x);
  const closeness = 1 - Math.max(0, y - surface) / radius;
  if (closeness <= 0) return null;
  const depth = radius * 0.42 * Math.min(1, closeness);
  const next = [...terrain];
  let changed = false;
  for (let i = 0; i < next.length; i += 2) {
    const dx = Math.abs(next[i] - x);
    if (dx >= radius) continue;
    const lowered = round(Math.max(LOWEST_GROUND, next[i + 1] - depth * (1 - (dx / radius) ** 2)));
    if (lowered < next[i + 1]) { next[i + 1] = lowered; changed = true; }
  }
  return changed ? next : null;
}

export const facing = (side: Side): number => (side === 0 ? 1 : -1);
export const fortX = (side: Side, local: number): number => (side === 0 ? FORT_OFFSET + local : WORLD_WIDTH - FORT_OFFSET - local);
export const launcherPosition = (side: Side): { x: number; y: number } => ({
  x: side === 0 ? LAUNCHER_OFFSET : WORLD_WIDTH - LAUNCHER_OFFSET,
  y: PLATEAU_Y + LAUNCHER_HEIGHT,
});

export function placeFortress(world: WorldState, side: Side, design: FortressDesign): void {
  for (const piece of design.pieces) {
    const spec = PIECES[piece.kind];
    const hp = Math.max(20, Math.round(pieceArea(piece.kind) * MATERIALS[piece.material].hpPerArea));
    world.bodies.push({
      id: world.nextId++, kind: 'block', side, piece: piece.kind, shape: spec.shape, material: piece.material,
      w: spec.w, h: spec.h, x: fortX(side, piece.x), y: PLATEAU_Y + piece.y, a: 0, hp, maxHp: hp, burn: 0,
    });
  }
  for (const royal of design.royals) {
    const spec = ROYALS[royal.role];
    world.bodies.push({ id: world.nextId++, kind: 'royal', side, role: royal.role, r: spec.radius, x: fortX(side, royal.x), y: PLATEAU_Y + royal.y, a: 0, hp: spec.hp, maxHp: spec.hp });
  }
}

export function createWorld(hill: number, designs: [FortressDesign | null, FortressDesign | null]): WorldState {
  const world: WorldState = { terrain: buildTerrain(hill), bodies: [], nextId: 1 };
  if (designs[0]) placeFortress(world, 0, designs[0]);
  if (designs[1]) placeFortress(world, 1, designs[1]);
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
