import { Box, Chain, Circle, Polygon, Vec2, World, type Body, type Contact } from 'planck';
import {
  AMMO, BURN_DAMAGE, BURN_TURNS, GRAVITY, MATERIALS, MAX_ANGLE, MAX_SHOT_SECONDS, MAX_SPEED, MIN_ANGLE, MIN_SPEED, STEP, WORLD_WIDTH,
  type Ammo, type AmmoId, type MaterialId,
} from './content';
import { crater, facing, launcherPosition, type BlockState, type BodyState, type RoyalState, type Side, type WorldState } from './world';

export interface ShotInput { side: Side; angle: number; power: number; ammo: AmmoId }
export type ShotEvent =
  | { f: number; t: 'launch'; x: number; y: number }
  | { f: number; t: 'spawn'; id: number; ammo: AmmoId; r: number }
  | { f: number; t: 'gone'; id: number; x: number; y: number }
  | { f: number; t: 'boom'; x: number; y: number; r: number; fire?: boolean }
  | { f: number; t: 'split'; x: number; y: number }
  | { f: number; t: 'hit'; id: number; x: number; y: number; d: number }
  | { f: number; t: 'break'; id: number; x: number; y: number; m: MaterialId; w: number; h: number }
  | { f: number; t: 'ko'; id: number; x: number; y: number }
  | { f: number; t: 'ignite'; id: number }
  | { f: number; t: 'burn'; id: number; d: number }
  | { f: number; t: 'crater'; x: number; y: number; r: number }
  | { f: number; t: 'dust'; x: number; y: number; s: number };
/** Poses for bodies that moved during a frame: [id, x×100, y×100, angle×1000]. */
export type FramePose = [number, number, number, number];
export interface Replay { fps: number; frames: FramePose[][]; events: ShotEvent[] }
export interface ShotResult {
  world: WorldState; replay: Replay | null;
  /** Damage dealt to each side's buildings and royals during this shot. */
  damage: [number, number];
  knockouts: Side[];
}

const FRAME_EVERY = 2;
const OUT_OF_BOUNDS = 25;
const REST_SPEED = 0.6;
const REST_FRAMES = 40;
const BLOCK_DAMAGE_PER_IMPULSE = 0.9;
const ROYAL_DAMAGE_PER_IMPULSE = 0.9;
/** Rubble knocking into rubble hurts far less than a cannonball does. */
const COLLAPSE_FACTOR = 0.3;
/** Shots share a negative group so balls in a volley or cluster never collide. */
const SHOT_GROUP = -1;
const ROYAL_TOUGHNESS = 3;
const HIT_EVENT_MIN = 6;
const PIERCE_DAMAGE = 220;
/** Heavy shots slamming into the ground faster than this dig a small crater. */
const IMPACT_CRATER_SPEED = 16;
const DUST_IMPULSE = 14;
const DUST_GAP_FRAMES = 10;
const SETTLE_SECONDS = 4;
/** A blast can't fling light timber or royals faster than this (m/s): it shoves, it doesn't launch. */
const MAX_BLAST_DV = 16;
/** Anything thrown this far past either edge of the battlefield is gone for good. */
const FIELD_MARGIN = 6;

interface Shot { id: number; body: Body; ammo: Ammo; bomblet: boolean; pierce: number; detonate: boolean; rest: number; lastVy: number; pierced: Set<number>; cratered: boolean }
type Entity = { type: 'body'; state: BodyState } | { type: 'shot'; shot: Shot } | { type: 'ground' };

export function launchVelocity(side: Side, angleDeg: number, power: number, speedScale = 1): { x: number; y: number } {
  const angle = (Math.min(MAX_ANGLE, Math.max(MIN_ANGLE, angleDeg)) * Math.PI) / 180;
  const speed = (MIN_SPEED + (MAX_SPEED - MIN_SPEED) * Math.min(1, Math.max(0, power))) * speedScale;
  return { x: Math.cos(angle) * speed * facing(side), y: Math.sin(angle) * speed };
}

/** Where a shot would fly ignoring collisions — the aiming guide uses the first part of this. */
export function trajectory(side: Side, angleDeg: number, power: number, wind: number, seconds: number, points: number): { x: number; y: number }[] {
  const origin = launcherPosition(side);
  const v = launchVelocity(side, angleDeg, power);
  return Array.from({ length: points }, (_, i) => {
    const t = (seconds * (i + 1)) / points;
    return { x: origin.x + v.x * t + 0.5 * wind * t * t, y: origin.y + v.y * t - 0.5 * GRAVITY * t * t };
  });
}

/**
 * Runs one shot to rest on a fresh physics world built from `world`. The server is the
 * authority online, so the result is stored rather than re-simulated on each phone.
 * With `input` null nothing is fired: the world just settles, without damage, so a newly
 * built fortress finds its feet before battle.
 */
export function simulateShot(world: WorldState, input: ShotInput | null, wind: number, options: { record?: boolean; maxSeconds?: number } = {}): ShotResult {
  const settling = input === null;
  const record = options.record ?? true;
  const maxSteps = Math.round((options.maxSeconds ?? (settling ? SETTLE_SECONDS : MAX_SHOT_SECONDS)) / STEP);
  const next: WorldState = structuredClone(world);
  const physics = new World({ gravity: new Vec2(0, -GRAVITY) });
  const entities = new Map<Body, Entity>();
  let ground: Body | null = null;
  const buildGround = () => {
    if (ground) { entities.delete(ground); physics.destroyBody(ground); }
    const points: Vec2[] = [];
    for (let i = 0; i < next.terrain.length; i += 2) points.push(new Vec2(next.terrain[i], next.terrain[i + 1]));
    ground = physics.createBody({ type: 'static' });
    ground.createFixture(new Chain(points, false), { friction: 0.9 });
    entities.set(ground, { type: 'ground' });
  };
  buildGround();

  const bodies = new Map<number, Body>();
  for (const state of next.bodies) {
    // Royals stay upright and slide rather than rolling off floors like marbles.
    const body = physics.createBody({ type: 'dynamic', position: new Vec2(state.x, state.y), angle: state.a, awake: false, angularDamping: 0.1, fixedRotation: state.kind === 'royal' });
    if (state.kind === 'block') {
      const material = MATERIALS[state.material];
      const shape = state.shape === 'tri'
        ? new Polygon([new Vec2(-state.w / 2, -state.h / 2), new Vec2(state.w / 2, -state.h / 2), new Vec2(0, state.h / 2)])
        : new Box(state.w / 2, state.h / 2);
      body.createFixture(shape, { density: material.density, friction: material.friction, restitution: material.restitution });
    } else {
      body.createFixture(new Circle(state.r), { density: 1.1, friction: 0.8, restitution: 0.05 });
    }
    body.setAwake(false);
    entities.set(body, { type: 'body', state });
    bodies.set(state.id, body);
  }

  const replay: Replay | null = record ? { fps: 1 / (STEP * FRAME_EVERY), frames: [], events: [] } : null;
  const damage: [number, number] = [0, 0];
  const knockouts: Side[] = [];
  const pending = new Map<number, number>();
  const lastHitFrame = new Map<number, number>();
  const shots: Shot[] = [];
  const blasts: { x: number; y: number; ammo: Ammo }[] = [];
  const impacts: { x: number; y: number; r: number }[] = [];
  const lastDust = new Map<number, number>();
  let frame = 0;
  let destroyedSomething = false;
  const emit = (event: ShotEvent) => replay?.events.push(event);

  const hurt = (state: BodyState, amount: number) => {
    if (settling || amount <= 0 || state.hp <= 0) return;
    pending.set(state.id, (pending.get(state.id) ?? 0) + amount);
  };

  function spawnShot(ammo: Ammo, x: number, y: number, vx: number, vy: number, bomblet: boolean) {
    const radius = bomblet ? 0.26 : ammo.radius;
    const body = physics.createBody({ type: 'dynamic', position: new Vec2(x, y), bullet: true, angularDamping: 0.3 });
    body.createFixture(new Circle(radius), { density: ammo.density, friction: 0.6, restitution: 0.15, filterGroupIndex: SHOT_GROUP });
    body.setLinearVelocity(new Vec2(vx, vy));
    const shot: Shot = { id: next.nextId++, body, ammo, bomblet, pierce: ammo.pierce ?? 0, detonate: false, rest: 0, lastVy: vy, pierced: new Set(), cratered: false };
    shots.push(shot);
    entities.set(body, { type: 'shot', shot });
    emit({ f: frame, t: 'spawn', id: shot.id, ammo: ammo.id, r: radius });
  }

  if (input) {
    // Fires burning from earlier turns flare up before the new shot lands.
    for (const state of next.bodies) {
      if (state.kind !== 'block' || state.burn <= 0) continue;
      state.burn--;
      hurt(state, BURN_DAMAGE);
      emit({ f: 0, t: 'burn', id: state.id, d: BURN_DAMAGE });
    }
    const ammo = AMMO[input.ammo];
    const origin = launcherPosition(input.side);
    emit({ f: 0, t: 'launch', x: origin.x, y: origin.y });
    const offsets = ammo.volley ? [-3.5, 0, 3.5] : [0];
    for (const offset of offsets) {
      const v = launchVelocity(input.side, input.angle + offset, input.power, ammo.speedScale);
      spawnShot(ammo, origin.x, origin.y, v.x, v.y, false);
    }
  } else {
    for (const body of entities.keys()) body.setAwake(true);
  }

  const entityOf = (contact: Contact, which: 'A' | 'B') => entities.get((which === 'A' ? contact.getFixtureA() : contact.getFixtureB()).getBody());

  physics.on('pre-solve', (contact: Contact) => {
    for (const [mine, other] of [['A', 'B'], ['B', 'A']] as const) {
      const a = entityOf(contact, mine);
      const b = entityOf(contact, other);
      if (a?.type !== 'shot' || b?.type !== 'body' || b.state.kind !== 'block') continue;
      const shot = a.shot;
      if (shot.pierce <= 0 || shot.pierced.has(b.state.id)) continue;
      shot.pierced.add(b.state.id);
      shot.pierce--;
      const lethal = b.state.hp - (pending.get(b.state.id) ?? 0) <= PIERCE_DAMAGE;
      hurt(b.state, PIERCE_DAMAGE);
      // A block the buster will smash does not slow it down.
      if (lethal) contact.setEnabled(false);
    }
  });

  physics.on('begin-contact', (contact: Contact) => {
    for (const [mine, other] of [['A', 'B'], ['B', 'A']] as const) {
      const entity = entityOf(contact, mine);
      if (entity?.type !== 'shot') continue;
      const shot = entity.shot;
      if (shot.ammo.blast && !shot.detonate) { shot.detonate = true; continue; }
      // A heavy ball slamming into the earth leaves a dent.
      if (!shot.cratered && entityOf(contact, other)?.type === 'ground' && shot.body.getLinearVelocity().length() > IMPACT_CRATER_SPEED) {
        shot.cratered = true;
        const p = shot.body.getPosition();
        impacts.push({ x: p.x, y: p.y, r: 0.9 + shot.body.getFixtureList()!.getShape().getRadius() * 1.6 });
      }
    }
  });

  physics.on('post-solve', (contact: Contact, impulse) => {
    const total = impulse.normalImpulses.reduce((sum, value) => sum + value, 0);
    for (const [mine, other] of [['A', 'B'], ['B', 'A']] as const) {
      const entity = entityOf(contact, mine);
      if (entity?.type !== 'body') continue;
      const state = entity.state;
      const otherType = entityOf(contact, other)?.type;
      if (otherType === 'ground' && total > DUST_IMPULSE && frame - (lastDust.get(state.id) ?? -99) > DUST_GAP_FRAMES) {
        lastDust.set(state.id, frame);
        const p = (mine === 'A' ? contact.getFixtureA() : contact.getFixtureB()).getBody().getPosition();
        emit({ f: frame, t: 'dust', x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100, s: Math.min(3, Math.round(total / DUST_IMPULSE * 10) / 10) });
      }
      const factor = otherType === 'shot' ? 1 : COLLAPSE_FACTOR;
      const amount = state.kind === 'block'
        ? (total - MATERIALS[state.material].toughness) * BLOCK_DAMAGE_PER_IMPULSE
        : (total - ROYAL_TOUGHNESS) * ROYAL_DAMAGE_PER_IMPULSE;
      hurt(state, amount * factor);
    }
  });

  function explode(x: number, y: number, blastAmmo: Ammo) {
    const blast = blastAmmo.blast!;
    emit({ f: frame, t: 'boom', x, y, r: blast.radius, ...(blastAmmo.ignite ? { fire: true } : {}) });
    for (const [body, entity] of entities) {
      if (entity.type !== 'body') continue;
      const p = body.getPosition();
      const dx = p.x - x;
      const dy = p.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > blast.radius) continue;
      const falloff = 1 - distance / blast.radius;
      hurt(entity.state, blast.damage * (0.35 + 0.65 * falloff));
      const push = (blast.force * falloff) / Math.max(0.3, distance);
      body.setAwake(true);
      const impulse = new Vec2(dx * push, dy * push + blast.force * falloff * 0.3);
      const limit = body.getMass() * MAX_BLAST_DV;
      if (impulse.length() > limit) impulse.mul(limit / impulse.length());
      body.applyLinearImpulse(impulse, body.getWorldCenter(), true);
      if (blastAmmo.ignite && entity.state.kind === 'block' && entity.state.material === 'wood') {
        entity.state.burn = BURN_TURNS;
        emit({ f: frame, t: 'ignite', id: entity.state.id });
      }
    }
    dig(x, y, blast.radius * 0.8);
  }

  /** Lowers the ground under a blast and rebuilds the static terrain so bodies settle into it. */
  function dig(x: number, y: number, radius: number) {
    const dug = crater(next.terrain, x, y, radius);
    if (!dug) return;
    next.terrain = dug;
    buildGround();
    for (const body of bodies.values()) body.setAwake(true);
    emit({ f: frame, t: 'crater', x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, r: Math.round(radius * 100) / 100 });
  }

  function removeShot(shot: Shot) {
    const p = shot.body.getPosition();
    emit({ f: frame, t: 'gone', id: shot.id, x: p.x, y: p.y });
    entities.delete(shot.body);
    physics.destroyBody(shot.body);
    shots.splice(shots.indexOf(shot), 1);
  }

  function settleDamage() {
    for (const [id, amount] of pending) {
      const body = bodies.get(id);
      if (!body) continue;
      const entity = entities.get(body);
      if (entity?.type !== 'body') continue;
      const state = entity.state;
      const dealt = Math.min(state.hp, amount);
      if (dealt <= 0) continue;
      state.hp -= dealt;
      damage[state.side] += dealt;
      const p = body.getPosition();
      if (dealt >= HIT_EVENT_MIN && frame - (lastHitFrame.get(id) ?? -99) > 6) {
        lastHitFrame.set(id, frame);
        emit({ f: frame, t: 'hit', id, x: p.x, y: p.y, d: Math.round(dealt) });
      }
      if (state.hp <= 0) destroy(body, state);
    }
    pending.clear();
  }

  function destroy(body: Body, state: BodyState) {
    const p = body.getPosition();
    state.hp = 0;
    if (state.kind === 'royal') { knockouts.push(state.side); emit({ f: frame, t: 'ko', id: state.id, x: p.x, y: p.y }); }
    else emit({ f: frame, t: 'break', id: state.id, x: p.x, y: p.y, m: state.material, w: state.w, h: state.h });
    entities.delete(body);
    bodies.delete(state.id);
    physics.destroyBody(body);
    destroyedSomething = true;
  }

  settleDamage();
  for (let step = 0; step < maxSteps; step++) {
    for (const shot of shots) {
      // Wind is a steady sideways push on everything in flight.
      shot.body.applyForceToCenter(new Vec2(wind * shot.body.getMass(), 0), true);
    }
    physics.step(STEP, 8, 3);
    if (step % FRAME_EVERY === 0) frame = step / FRAME_EVERY;

    for (const shot of [...shots]) {
      const p = shot.body.getPosition();
      const v = shot.body.getLinearVelocity();
      if (shot.detonate) { blasts.push({ x: p.x, y: p.y, ammo: shot.ammo }); removeShot(shot); continue; }
      if (shot.ammo.split && !shot.bomblet && shot.lastVy > 0 && v.y <= 0) {
        emit({ f: frame, t: 'split', x: p.x, y: p.y });
        removeShot(shot);
        for (let i = 0; i < shot.ammo.split; i++) {
          const spread = (i - (shot.ammo.split - 1) / 2) * 2.2;
          spawnShot(shot.ammo, p.x + spread * 0.15, p.y - (i % 2) * 0.3, v.x + spread, v.y - 1 + (i % 2), true);
        }
        continue;
      }
      shot.lastVy = v.y;
      if (p.x < -OUT_OF_BOUNDS || p.x > WORLD_WIDTH + OUT_OF_BOUNDS || p.y < -10) { removeShot(shot); continue; }
      shot.rest = v.length() < REST_SPEED ? shot.rest + 1 : 0;
      if (shot.rest > REST_FRAMES) removeShot(shot);
    }
    for (const blast of blasts.splice(0)) explode(blast.x, blast.y, blast.ammo);
    for (const impact of impacts.splice(0)) dig(impact.x, impact.y, impact.r);

    settleDamage();
    for (const [body, entity] of [...entities]) {
      if (entity.type !== 'body') continue;
      const p = body.getPosition();
      if (p.y < -10 || p.x < -FIELD_MARGIN || p.x > WORLD_WIDTH + FIELD_MARGIN) destroy(body, entity.state);
    }
    if (destroyedSomething) {
      for (const body of bodies.values()) body.setAwake(true);
      destroyedSomething = false;
    }

    if (replay && step % FRAME_EVERY === 0) {
      const poses: FramePose[] = [];
      for (const [body, entity] of entities) {
        if (entity.type === 'ground' || !body.isAwake()) continue;
        const p = body.getPosition();
        const id = entity.type === 'shot' ? entity.shot.id : entity.state.id;
        poses.push([id, Math.round(p.x * 100), Math.round(p.y * 100), Math.round(body.getAngle() * 1000)]);
      }
      replay.frames.push(poses);
    }

    const moving = [...bodies.values()].some(body => body.isAwake());
    if (!shots.length && !moving && step > 30) break;
  }
  for (const shot of [...shots]) removeShot(shot);

  next.bodies = next.bodies.filter(state => state.hp > 0 && bodies.has(state.id));
  for (const state of next.bodies) {
    const body = bodies.get(state.id)!;
    const p = body.getPosition();
    state.x = Math.round(p.x * 10000) / 10000;
    state.y = Math.round(p.y * 10000) / 10000;
    state.a = Math.round(body.getAngle() * 10000) / 10000;
    state.hp = Math.round(state.hp * 10) / 10;
  }
  return { world: next, replay, damage: [Math.round(damage[0]), Math.round(damage[1])], knockouts };
}

export const isRoyal = (body: BodyState): body is RoyalState => body.kind === 'royal';
export const isBlock = (body: BodyState): body is BlockState => body.kind === 'block';
