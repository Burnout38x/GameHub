import { AMMO, GRAVITY, MAX_ANGLE, MIN_ANGLE, type AmmoId } from './content';
import { AI_LEVELS } from './missions';
import { launchVelocity, simulateShot, type ShotInput } from './physics';
import { launcherPosition, royalsOf, blocksOf, type Side, type WorldState } from './world';

export interface AiPurse { gold: number; elixir: number }
export interface AiCandidate { angle: number; power: number }

/** Small seeded generator so the Machine's wobble is repeatable for a given turn. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Height of an unobstructed shot as it passes x, on the way down, or null if it never gets there. */
function heightAt(side: Side, angle: number, power: number, wind: number, targetX: number, speedScale: number): number | null {
  const origin = launcherPosition(side);
  const v = launchVelocity(side, angle, power, speedScale);
  const dt = 0.02;
  let x = origin.x;
  let y = origin.y;
  for (let t = dt; t < 14; t += dt) {
    const nx = origin.x + v.x * t + 0.5 * wind * t * t;
    const ny = origin.y + v.y * t - 0.5 * GRAVITY * t * t;
    if ((nx - targetX) * (x - targetX) <= 0 && nx !== x) {
      return y + ((targetX - x) / (nx - x)) * (ny - y);
    }
    x = nx;
    y = ny;
    if (y < -5) return null;
  }
  return null;
}

/** Finds the launch power that drops a shot at this angle onto (x, y), ignoring collisions. */
export function solvePower(side: Side, angle: number, target: { x: number; y: number }, wind: number, speedScale = 1): number | null {
  let low = 0;
  let high = 1;
  if ((heightAt(side, angle, high, wind, target.x, speedScale) ?? -Infinity) < target.y) return null;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    const y = heightAt(side, angle, mid, wind, target.x, speedScale);
    if (y === null || y < target.y) low = mid; else high = mid;
  }
  return (low + high) / 2;
}

/** Spots worth hitting: every royal still standing, plus the tallest blocks that hold them up. */
function targets(world: WorldState, enemy: Side): { x: number; y: number; weight: number }[] {
  const royals = royalsOf(world, enemy).map(royal => ({ x: royal.x, y: royal.y, weight: 3 }));
  const blocks = blocksOf(world, enemy)
    .sort((a, b) => b.y + b.h / 2 - (a.y + a.h / 2))
    .slice(0, 3)
    .map(block => ({ x: block.x, y: block.y + block.h / 2, weight: 1 }));
  return [...royals, ...blocks];
}

export function chooseAiAmmo(level: number, purse: AiPurse, world: WorldState, enemy: Side, random: () => number): AmmoId {
  const profile = AI_LEVELS[level] ?? AI_LEVELS[3];
  if (purse.elixir >= AMMO.titan.elixir && random() < profile.premium) return 'titan';
  if (purse.elixir >= AMMO.barrage.elixir && random() < profile.premium * 0.7) return 'barrage';
  if (random() >= profile.premium) return purse.gold >= AMMO.iron.gold && random() < 0.5 ? 'iron' : 'stone';
  const hasTimber = blocksOf(world, enemy).some(block => block.material === 'wood' && block.burn === 0);
  const options: AmmoId[] = ['bomb', 'cluster', 'buster', ...(hasTimber ? ['fire' as const] : [])];
  const affordable = options.filter(id => AMMO[id].gold <= purse.gold);
  if (!affordable.length) return purse.gold >= AMMO.iron.gold ? 'iron' : 'stone';
  return affordable[Math.floor(random() * affordable.length)];
}

/** Candidate aims for the Machine, before it tests them in the physics world. */
export function aiCandidates(world: WorldState, side: Side, wind: number, level: number, ammo: AmmoId, random: () => number): AiCandidate[] {
  const profile = AI_LEVELS[level] ?? AI_LEVELS[3];
  const enemy: Side = side === 0 ? 1 : 0;
  const spots = targets(world, enemy);
  const candidates: AiCandidate[] = [];
  for (let attempt = 0; candidates.length < profile.candidates && attempt < profile.candidates * 4; attempt++) {
    const spot = spots[Math.floor(random() * spots.length)];
    if (!spot) break;
    const angle = 28 + random() * 44;
    const power = solvePower(side, angle, { x: spot.x, y: spot.y }, wind, AMMO[ammo].speedScale);
    if (power !== null) candidates.push({ angle: Math.round(angle * 10) / 10, power });
  }
  if (!candidates.length) candidates.push({ angle: 45, power: 0.7 });
  return candidates;
}

/** How much the Machine likes the outcome of a test shot. */
export function scoreOutcome(world: WorldState, after: WorldState, side: Side, damage: [number, number], knockouts: Side[]): number {
  const enemy: Side = side === 0 ? 1 : 0;
  const royalBefore = royalsOf(world, enemy).reduce((sum, royal) => sum + royal.hp, 0);
  const royalAfter = royalsOf(after, enemy).reduce((sum, royal) => sum + royal.hp, 0);
  const kills = knockouts.filter(target => target === enemy).length;
  const ownLosses = knockouts.filter(target => target === side).length;
  return (royalBefore - royalAfter) * 4 + kills * 250 + damage[enemy] - damage[side] * 2 - ownLosses * 400;
}

/** Adds the Machine's hand-wobble, scaled by its level. */
export function wobble(choice: AiCandidate, level: number, random: () => number): AiCandidate {
  const profile = AI_LEVELS[level] ?? AI_LEVELS[3];
  const angle = choice.angle + (random() * 2 - 1) * profile.angleNoise;
  const power = choice.power + (random() * 2 - 1) * profile.powerNoise;
  return {
    angle: Math.round(Math.min(MAX_ANGLE, Math.max(MIN_ANGLE, angle)) * 10) / 10,
    power: Math.round(Math.min(1, Math.max(0, power)) * 1000) / 1000,
  };
}

/**
 * Plans one Machine shot, yielding after each test shot so a browser can spread the work
 * across frames. The server simply runs it to completion with `planAiShot`.
 */
export function* aiPlanner(world: WorldState, side: Side, wind: number, level: number, purse: AiPurse, seed: number): Generator<void, ShotInput> {
  const random = seededRandom(seed);
  const enemy: Side = side === 0 ? 1 : 0;
  const ammo = chooseAiAmmo(level, purse, world, enemy, random);
  const candidates = aiCandidates(world, side, wind, level, ammo, random);
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const outcome = simulateShot(world, { side, ...candidate, ammo }, wind, { record: false });
    const score = scoreOutcome(world, outcome.world, side, outcome.damage, outcome.knockouts);
    if (score > bestScore) { bestScore = score; best = candidate; }
    yield;
  }
  return { side, ammo, ...wobble(best, level, random) };
}

export function planAiShot(world: WorldState, side: Side, wind: number, level: number, purse: AiPurse, seed: number): ShotInput {
  const planner = aiPlanner(world, side, wind, level, purse, seed);
  for (;;) {
    const step = planner.next();
    if (step.done) return step.value;
  }
}
