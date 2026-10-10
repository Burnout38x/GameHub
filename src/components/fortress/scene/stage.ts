import { FORT_OFFSET, LAUNCHER_HEIGHT, PLATEAU_Y, WORLD_WIDTH, type AmmoId, type MaterialId, type RoyalRole } from '@/lib/fortress/content';
import { BUILD_HEIGHT, BUILD_WIDTH, PIECES, type PieceKind } from '@/lib/fortress/design';
import { trajectory, type Replay, type ShotEvent } from '@/lib/fortress/physics';
import { crater, facing, fortX, groundAt, launcherPosition, type BodyState, type RoyalState, type Side, type WorldState } from '@/lib/fortress/world';
import { MATERIAL_SOUND, PALETTES, drawBanner, drawBlock, drawGlow, drawHealthBar, drawProjectile, drawRoyal, drawTrebuchet, hasTorch, hash, type Mood, type Palette, type Theme } from './art';
import { Effects } from './effects';

export type SoundCue = 'launch' | 'hit' | 'boom' | 'break' | 'ko' | 'split' | 'splash' | 'thud' | 'thunder';
export type SoundMaterial = 'wood' | 'stone' | 'metal' | 'glass' | null;
export type CameraMode = 'auto' | 'overview' | 'home' | 'enemy' | 'build';
export interface AimGuide { side: Side; angle: number; power: number; wind: number; ammo: AmmoId; seconds: number }
/** The slingshot band while a finger or mouse is pulling, in CSS pixels. */
export interface DragLine { ax: number; ay: number; px: number; py: number; power: number }
export type Ghost =
  | { type: 'piece'; piece: PieceKind; material: MaterialId; x: number; y: number; valid: boolean }
  | { type: 'royal'; role: RoyalRole; x: number; y: number; valid: boolean };
export interface BuildOverlay { ghost: Ghost | null; selected: number | null }

type Display = BodyState & { flash: number; px: number; py: number; pa: number; hurt: number };
interface LiveShot { id: number; ammo: AmmoId; r: number; x: number; y: number; a: number; px: number; py: number; pa: number; trail: number; vx: number }
interface Playback {
  replay: Replay; after: WorldState; side: Side; clock: number; applied: number; event: number;
  shots: Map<number, LiveShot>; moved: Set<number>; hold: number; focus: { x: number; y: number } | null;
  path: { x: number; y: number }[]; primary: number | null; resolve: () => void;
}
interface Fallen { royal: RoyalState; x: number; y: number; vx: number; vy: number; rot: number; vr: number; life: number; landed: boolean }
interface Scorch { x: number; r: number }
interface Bird { x: number; y: number; speed: number; phase: number; size: number }

const WATER_LEVEL = 1.55;
const RELEASE_ANGLE = (75 * Math.PI) / 180;
const REST_ANGLE = (210 * Math.PI) / 180;
const FOLLOW_THROUGH = (35 * Math.PI) / 180;
const SWING_SECONDS = 0.32;
const END_HOLD_SECONDS = 1.1;
const MAX_DT = 1 / 20;
const SLOWMO_SECONDS = 1.1;
const SLOWMO_SPEED = 0.3;
const FALLEN_SECONDS = 3.2;
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 1.9;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Owns the battlefield canvas: camera, scenery, bodies, replays, weather, light and effects. */
export class Stage {
  private ctx: CanvasRenderingContext2D;
  private palette: Palette;
  private bodies = new Map<number, Display>();
  private terrain: number[] = [];
  private wind = 0;
  private time = 0;
  private last = 0;
  private frame = 0;
  private cam = { x: WORLD_WIDTH / 2, y: 20, w: 170 };
  private size = { w: 1, h: 1, dpr: 1 };
  private playback: Playback | null = null;
  private effects = new Effects();
  private arms: [number, number] = [REST_ANGLE, REST_ANGLE];
  private swing: [number, number] = [-1, -1];
  private crew: [number, number] = [0, 0];
  private loaded: [AmmoId, AmmoId] = ['stone', 'stone'];
  private paths: [{ x: number; y: number }[], { x: number; y: number }[]] = [[], []];
  private fallen: Fallen[] = [];
  private scorches: Scorch[] = [];
  private slowmo = 0;
  private slowFocus: { x: number; y: number } | null = null;
  private lightning = 0;
  private nextLightning = 6;
  private rain: { x: number; y: number; speed: number }[] = [];
  private birds: Bird[] = [];
  private resize: ResizeObserver;
  private destroyed = false;
  aim: AimGuide | null = null;
  drag: DragLine | null = null;
  build: BuildOverlay | null = null;
  focusSide: Side = 0;
  mode: CameraMode = 'auto';
  zoom = 1;
  speed = 1;
  reducedMotion = false;
  onSound: ((cue: SoundCue, strength: number, material: SoundMaterial) => void) | null = null;

  constructor(private canvas: HTMLCanvasElement, private theme: Theme) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported on this device.');
    this.ctx = ctx;
    this.palette = PALETTES[theme];
    const random = hash(theme.length * 17 + 3);
    if (theme === 'storm') this.rain = Array.from({ length: 140 }, () => ({ x: random(), y: random(), speed: 0.8 + random() * 0.6 }));
    if (theme === 'day' || theme === 'dusk') this.birds = Array.from({ length: 5 }, () => ({ x: random() * 300 - 80, y: 22 + random() * 12, speed: 2 + random() * 2, phase: random() * 6, size: 0.5 + random() * 0.4 }));
    this.resize = new ResizeObserver(() => this.measure());
    this.resize.observe(canvas);
    this.measure();
    this.frame = requestAnimationFrame(this.tick);
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.resize.disconnect();
    this.playback?.resolve();
  }

  private measure(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.size = { w: Math.max(1, rect.width), h: Math.max(1, rect.height), dpr };
    this.canvas.width = Math.round(this.size.w * dpr);
    this.canvas.height = Math.round(this.size.h * dpr);
  }

  /** Shows a settled battlefield (no animation). */
  setWorld(world: WorldState, wind: number): void {
    this.wind = wind;
    if (this.playback) return;
    this.terrain = [...world.terrain];
    const previous = this.bodies;
    this.bodies = new Map(world.bodies.map(body => [body.id, { ...body, flash: previous.get(body.id)?.flash ?? 0, hurt: previous.get(body.id)?.hurt ?? 0, px: body.x, py: body.y, pa: body.a }]));
  }

  setLoaded(side: Side, ammo: AmmoId): void { this.loaded[side] = ammo; }
  zoomBy(factor: number): void { this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom * factor)); }

  /** Animates one recorded shot, then settles on `after`. Resolves when the dust clears. */
  play(replay: Replay, after: WorldState, side: Side): Promise<void> {
    this.playback?.resolve();
    return new Promise(resolve => {
      this.paths[side] = [];
      this.playback = {
        replay, after, side, clock: 0, applied: 0, event: 0, shots: new Map(), moved: new Set(), hold: 0, focus: null,
        path: this.paths[side], primary: null, resolve: () => { this.playback = null; resolve(); },
      };
    });
  }

  /** Jumps straight to the end of the current replay. */
  skip(): void {
    const playback = this.playback;
    if (!playback) return;
    while (playback.event < playback.replay.events.length) {
      const event = playback.replay.events[playback.event++];
      if (event.t === 'crater') this.scorch(event.x, event.r);
    }
    this.finish(playback);
  }

  get playing(): boolean { return this.playback !== null; }

  private finish(playback: Playback): void {
    this.terrain = [...playback.after.terrain];
    this.bodies = new Map(playback.after.bodies.map(body => [body.id, { ...body, flash: 0, hurt: 0, px: body.x, py: body.y, pa: body.a }]));
    this.slowmo = 0;
    playback.resolve();
  }

  private scorch(x: number, r: number): void {
    this.scorches.push({ x, r: r * 0.9 });
    if (this.scorches.length > 30) this.scorches.shift();
  }

  private dig(x: number, y: number, r: number): void {
    const dug = crater(this.terrain, x, y, r);
    if (dug) this.terrain = dug;
    this.scorch(x, r);
  }

  private ground = (x: number): number => groundAt(this.terrain, x);

  // ── Playback ───────────────────────────────────────────────────────────

  private soundOf(body: Display | undefined): SoundMaterial {
    if (!body) return null;
    return body.kind === 'block' ? MATERIAL_SOUND[body.material] : 'metal';
  }

  private handle(event: ShotEvent, playback: Playback): void {
    const fx = this.effects;
    const viewer = this.focusSide;
    switch (event.t) {
      case 'launch': {
        const side: Side = event.x < WORLD_WIDTH / 2 ? 0 : 1;
        this.swing[side] = 0;
        this.crew[side] = 1;
        fx.puff(event.x - facing(side) * 1.6, this.ground(event.x) + 0.4, 10, 'rgba(214,204,186,0.7)', 0.6, 2.2);
        this.onSound?.('launch', 1, 'wood');
        break;
      }
      case 'spawn':
        playback.shots.set(event.id, { id: event.id, ammo: event.ammo, r: event.r, x: NaN, y: NaN, a: 0, px: NaN, py: NaN, pa: 0, trail: 0, vx: 0 });
        if (playback.primary === null) playback.primary = event.id;
        break;
      case 'gone': {
        playback.shots.delete(event.id);
        if (event.y < WATER_LEVEL + 0.5 && event.x > 38 && event.x < WORLD_WIDTH - 38 && this.ground(event.x) < WATER_LEVEL) { fx.splash(event.x, WATER_LEVEL); this.onSound?.('splash', 0.6, null); }
        if (!playback.focus) playback.focus = { x: event.x, y: event.y };
        break;
      }
      case 'boom':
        fx.explosion(event.x, event.y, event.r, event.fire);
        playback.focus = { x: event.x, y: event.y };
        if (event.r >= 3) this.startSlowmo(event.x, event.y);
        this.onSound?.('boom', Math.min(1, event.r / 3.4), null);
        break;
      case 'crater':
        this.dig(event.x, event.y, event.r);
        fx.dust(event.x, this.ground(event.x), Math.min(3, event.r));
        break;
      case 'dust':
        fx.dust(event.x, this.ground(event.x), event.s);
        this.onSound?.('thud', Math.min(1, event.s / 2), null);
        break;
      case 'split':
        fx.explosion(event.x, event.y, 0.8);
        this.onSound?.('split', 0.6, null);
        break;
      case 'hit': {
        const body = this.bodies.get(event.id);
        if (!body) break;
        body.hp = Math.max(1, body.hp - event.d);
        body.flash = 1;
        body.hurt = 1.2;
        if (!playback.focus) playback.focus = { x: event.x, y: event.y };
        if (event.d >= 10 || body.kind === 'royal') fx.text(event.x, event.y + 0.9, `-${event.d}`, body.side === viewer ? '#fca5a5' : '#fde68a', body.kind === 'royal' ? 1.2 : 0.9);
        if (event.d >= 25) fx.puff(event.x, event.y, 4, 'rgba(200,190,170,0.6)', 0.4, 1.4);
        this.onSound?.('hit', Math.min(1, event.d / 80), this.soundOf(body));
        break;
      }
      case 'break': {
        const body = this.bodies.get(event.id);
        this.bodies.delete(event.id);
        fx.debris(event.x, event.y, event.m, event.w, event.h);
        this.onSound?.('break', Math.min(1, (event.w * event.h) / 4), this.soundOf(body) ?? MATERIAL_SOUND[event.m]);
        break;
      }
      case 'ko': {
        const body = this.bodies.get(event.id);
        this.bodies.delete(event.id);
        const away = event.x < WORLD_WIDTH / 2 ? -1 : 1;
        if (body?.kind === 'royal') this.fallen.push({ royal: { ...body }, x: event.x, y: event.y, vx: away * 2.5, vy: 4, rot: 0, vr: -away * 5, life: 0, landed: false });
        fx.stars(event.x, event.y);
        fx.text(event.x, event.y + 1.8, body?.kind === 'royal' && body.role === 'king' ? 'KING DOWN!' : 'KNOCKED OUT!', '#fde047', 1.4);
        fx.shake = Math.max(fx.shake, 0.6);
        this.startSlowmo(event.x, event.y);
        this.onSound?.('ko', 1, null);
        break;
      }
      case 'ignite': {
        const body = this.bodies.get(event.id);
        if (body?.kind === 'block') body.burn = 3;
        break;
      }
      case 'burn': {
        const body = this.bodies.get(event.id);
        if (!body) break;
        body.hp = Math.max(1, body.hp - event.d);
        fx.text(body.x, body.y + 0.8, `🔥-${event.d}`, '#fdba74', 0.8);
        break;
      }
    }
  }

  private startSlowmo(x: number, y: number): void {
    if (this.reducedMotion) return;
    this.slowmo = SLOWMO_SECONDS;
    this.slowFocus = { x, y };
  }

  private applyFrame(playback: Playback): void {
    for (const id of playback.moved) {
      const body = this.bodies.get(id);
      if (body) { body.px = body.x; body.py = body.y; body.pa = body.a; }
      const shot = playback.shots.get(id);
      if (shot) { shot.px = shot.x; shot.py = shot.y; shot.pa = shot.a; }
    }
    playback.moved.clear();
    for (const [id, x100, y100, a1000] of playback.replay.frames[playback.applied]) {
      const x = x100 / 100;
      const y = y100 / 100;
      const a = a1000 / 1000;
      const body = this.bodies.get(id);
      if (body) { body.px = body.x; body.py = body.y; body.pa = body.a; body.x = x; body.y = y; body.a = a; playback.moved.add(id); continue; }
      const shot = playback.shots.get(id);
      if (!shot) continue;
      if (Number.isNaN(shot.x)) { shot.px = x; shot.py = y; } else { shot.px = shot.x; shot.py = shot.y; }
      shot.pa = shot.a;
      shot.vx = Number.isNaN(shot.x) ? 0 : x - shot.x;
      shot.x = x; shot.y = y; shot.a = a;
      playback.moved.add(id);
      if (id === playback.primary) playback.path.push({ x, y });
    }
    playback.applied++;
  }

  private advancePlayback(playback: Playback, dt: number): number {
    const { replay } = playback;
    playback.clock += dt * this.speed;
    const target = Math.min(replay.frames.length, Math.floor(playback.clock * replay.fps));
    const events = replay.events;
    while (playback.applied < target) {
      while (playback.event < events.length && events[playback.event].f <= playback.applied) this.handle(events[playback.event++], playback);
      this.applyFrame(playback);
    }
    if (playback.applied >= replay.frames.length) {
      while (playback.event < events.length) this.handle(events[playback.event++], playback);
      playback.hold += dt;
      if (playback.hold > END_HOLD_SECONDS) this.finish(playback);
      return 1;
    }
    return playback.clock * replay.fps - Math.floor(playback.clock * replay.fps);
  }

  // ── Camera ─────────────────────────────────────────────────────────────

  private cameraTarget(): { x: number; w: number; follow: number | null; floor: number } {
    const wide = this.size.w / this.size.h >= 1.55 && this.size.w >= 820;
    // Phones held upright get a tighter home view so the fortress isn't lost in the sky.
    const portrait = this.size.h > this.size.w;
    const close = portrait ? Math.min(46, Math.max(34, this.size.w / 10)) : Math.min(64, Math.max(46, this.size.w / 7.5));
    const playback = this.playback;
    if (this.mode === 'build') {
      const plot = Math.max(BUILD_WIDTH + 6, (BUILD_HEIGHT + 4) * (this.size.w / this.size.h));
      // Leave a band of ground under the plot so the hint bar never hides the bottom row.
      return { x: FORT_OFFSET + BUILD_WIDTH / 2 + 1, w: plot, follow: null, floor: PLATEAU_Y - 4.2 };
    }
    if (this.slowmo > 0 && this.slowFocus) return { x: this.slowFocus.x, w: (wide ? 50 : 34) * this.zoom, follow: null, floor: -2.5 };
    if (playback && this.mode === 'auto') {
      const live = [...playback.shots.values()].filter(shot => !Number.isNaN(shot.x));
      if (live.length) {
        const x = live.reduce((sum, shot) => sum + shot.x, 0) / live.length;
        const y = Math.max(...live.map(shot => shot.y));
        return { x, w: (wide ? 110 : 66) * this.zoom, follow: y, floor: -2.5 };
      }
      if (playback.focus) return { x: playback.focus.x, w: (wide ? 90 : 52) * this.zoom, follow: null, floor: -2.5 };
    }
    const home = (side: Side) => (side === 0 ? 9 + close / 2 : WORLD_WIDTH - 9 - close / 2);
    const mode = this.mode === 'auto' ? (wide ? 'overview' : 'home') : this.mode;
    if (mode === 'overview') return { x: WORLD_WIDTH / 2, w: (WORLD_WIDTH + 24) * Math.min(1, this.zoom), follow: null, floor: -2.5 };
    if (mode === 'enemy') return { x: home(this.focusSide === 0 ? 1 : 0), w: close * this.zoom, follow: null, floor: -2.5 };
    return { x: home(this.focusSide), w: close * this.zoom, follow: null, floor: -2.5 };
  }

  private updateCamera(dt: number): void {
    const target = this.cameraTarget();
    const aspect = this.size.h / this.size.w;
    const snapNow = this.reducedMotion || this.mode === 'build';
    const k = snapNow ? 1 : 1 - Math.exp(-dt * (this.slowmo > 0 ? 5 : 3.2));
    // Ease the bottom edge rather than the centre, so zooming never shoves the ground off screen.
    const bottomNow = this.cam.y - (this.cam.w * aspect) / 2;
    this.cam.w = lerp(this.cam.w, target.w, k);
    this.cam.x = lerp(this.cam.x, target.x, k);
    const viewH = this.cam.w * aspect;
    let bottom = target.floor;
    if (this.slowmo > 0 && this.slowFocus) bottom = Math.max(bottom, this.slowFocus.y - viewH * 0.6);
    if (target.follow !== null) bottom = Math.max(bottom, target.follow - viewH + 6);
    this.cam.y = lerp(bottomNow, bottom, snapNow ? 1 : 1 - Math.exp(-dt * 4)) + viewH / 2;
    const half = this.cam.w / 2;
    this.cam.x = Math.min(WORLD_WIDTH + 20 - half, Math.max(-20 + half, this.cam.x));
    if (this.cam.w > WORLD_WIDTH + 40) this.cam.x = WORLD_WIDTH / 2;
  }

  /** Converts a screen point (CSS pixels, relative to the canvas) into world metres. */
  toWorld(px: number, py: number): { x: number; y: number } {
    const scale = this.size.w / this.cam.w;
    return { x: this.cam.x + (px - this.size.w / 2) / scale, y: this.cam.y - (py - this.size.h / 2) / scale };
  }

  // ── Frame loop ─────────────────────────────────────────────────────────

  private tick = (now: number): void => {
    if (this.destroyed) return;
    const real = Math.min(MAX_DT, this.last ? (now - this.last) / 1000 : 0);
    this.last = now;
    this.slowmo = Math.max(0, this.slowmo - real);
    const dt = this.slowmo > 0 ? real * SLOWMO_SPEED : real;
    this.time += dt;
    let alpha = 1;
    if (this.playback) alpha = this.advancePlayback(this.playback, dt);
    for (const side of [0, 1] as Side[]) { this.animateArm(side, dt); this.crew[side] = Math.max(0, this.crew[side] - dt * 1.5); }
    for (const body of this.bodies.values()) {
      body.flash = Math.max(0, body.flash - dt * 4);
      body.hurt = Math.max(0, body.hurt - dt);
      if (body.kind === 'block' && body.burn > 0 && !this.reducedMotion) {
        if (Math.random() < dt * 14) this.effects.fire(body.x, body.y + body.h / 2, body.w);
        if (Math.random() < dt * 3) this.effects.ember(body.x, body.y + body.h / 2);
      }
    }
    for (const shot of this.playback?.shots.values() ?? []) {
      if (Number.isNaN(shot.x)) continue;
      shot.trail += dt;
      if (shot.trail > 0.025) { shot.trail = 0; this.effects.trail(shot.x, shot.y, shot.ammo === 'fire'); }
    }
    this.updateFallen(dt);
    this.updateWeather(real);
    this.effects.update(dt, this.ground);
    this.updateCamera(real);
    this.draw(alpha);
    this.frame = requestAnimationFrame(this.tick);
  };

  /** The arm sweeps up over the top from behind, follows through, then drops back to reload. */
  private animateArm(side: Side, dt: number): void {
    if (this.swing[side] >= 0) {
      this.swing[side] += dt;
      const t = Math.min(1, this.swing[side] / SWING_SECONDS);
      this.arms[side] = lerp(REST_ANGLE, RELEASE_ANGLE, t * t);
      if (t >= 1) this.swing[side] = -1;
      return;
    }
    const resting = this.playback?.side === side ? FOLLOW_THROUGH : REST_ANGLE;
    this.arms[side] = lerp(this.arms[side], resting, 1 - Math.exp(-dt * 2.5));
  }

  private updateFallen(dt: number): void {
    for (const body of this.fallen) {
      body.life += dt;
      if (body.landed) continue;
      body.vy -= 9.8 * dt;
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.rot += body.vr * dt;
      const floor = this.ground(body.x) + body.royal.r * 0.5;
      if (body.y < floor) {
        body.y = floor;
        body.landed = true;
        body.rot = Math.sign(body.vr || 1) * Math.PI / 2;
        this.effects.dust(body.x, floor - body.royal.r * 0.5, 0.6);
      }
    }
    this.fallen = this.fallen.filter(body => body.life < FALLEN_SECONDS);
  }

  private updateWeather(dt: number): void {
    if (this.theme === 'storm' && !this.reducedMotion) {
      this.lightning = Math.max(0, this.lightning - dt * 2.5);
      this.nextLightning -= dt;
      if (this.nextLightning <= 0) {
        this.lightning = 1;
        this.nextLightning = 7 + Math.random() * 9;
        this.onSound?.('thunder', 0.8, null);
      }
      for (const drop of this.rain) {
        drop.y += dt * drop.speed * 1.4;
        drop.x += dt * this.wind * 0.02;
        if (drop.y > 1) { drop.y -= 1; drop.x = Math.random(); }
        if (drop.x > 1) drop.x -= 1;
        if (drop.x < 0) drop.x += 1;
      }
    }
    for (const bird of this.birds) {
      bird.x += dt * (bird.speed + this.wind * 0.5);
      if (bird.x > 260) bird.x = -100;
    }
  }

  // ── Drawing ────────────────────────────────────────────────────────────

  private draw(alpha: number): void {
    const { ctx } = this;
    const { w, h, dpr } = this.size;
    const scale = w / this.cam.w;
    const shake = this.reducedMotion ? 0 : this.effects.shake;
    const sx = shake ? (Math.random() - 0.5) * shake * 10 : 0;
    const sy = shake ? (Math.random() - 0.5) * shake * 10 : 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawSky(w, h);
    this.drawLayers(w, h, scale);
    ctx.setTransform(dpr * scale, 0, 0, -dpr * scale, dpr * (w / 2 - this.cam.x * scale + sx), dpr * (h / 2 + this.cam.y * scale + sy));
    this.drawWater();
    this.drawTerrain();
    if (this.mode !== 'build') for (const side of [0, 1] as Side[]) drawBanner(ctx, side, fortX(side, -1.6), this.wind, this.time, this.ground(fortX(side, -1.6)));
    this.drawShadows();
    this.drawBodies(alpha);
    this.drawFallen();
    if (this.mode !== 'build') this.drawLaunchers();
    else this.drawBuildOverlay(scale);
    this.drawGuide(scale);
    this.drawShots(alpha);
    this.effects.draw(ctx, 1 / scale);
    this.drawLight();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawWeather(w, h);
    this.drawDrag();
  }

  private drawSky(w: number, h: number): void {
    const { ctx, palette } = this;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, palette.skyTop);
    sky.addColorStop(1, palette.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    if (palette.moon) {
      const random = hash(99);
      for (let i = 0; i < 90; i++) {
        const twinkle = 0.5 + Math.sin(this.time * (1 + random() * 2) + i) * 0.5;
        ctx.fillStyle = `rgba(255,255,255,${(0.3 + twinkle * 0.6).toFixed(2)})`;
        const size = random() < 0.1 ? 2 : 1.2;
        ctx.fillRect((((random() * 1.3 - this.cam.x * 0.0008) % 1.3) + 1.3) % 1.3 * w, random() * h * 0.6, size, size);
      }
    }
    const sunX = w * 0.78 - this.cam.x * 0.4;
    const sunY = h * 0.2;
    const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, Math.max(w, h) * 0.35);
    glow.addColorStop(0, palette.glow);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    const radius = Math.max(14, Math.min(w, h) * 0.05);
    ctx.fillStyle = palette.sun;
    ctx.beginPath(); ctx.arc(sunX, sunY, radius, 0, Math.PI * 2); ctx.fill();
    if (palette.moon) {
      ctx.fillStyle = 'rgba(160,170,200,0.35)';
      for (const [cx, cy, cr] of [[-0.3, -0.2, 0.22], [0.25, 0.3, 0.15], [0.1, -0.4, 0.1]]) { ctx.beginPath(); ctx.arc(sunX + cx * radius, sunY + cy * radius, cr * radius, 0, Math.PI * 2); ctx.fill(); }
    }
    if (this.lightning > 0) {
      ctx.fillStyle = `rgba(230,240,255,${(this.lightning * 0.55).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
      if (this.lightning > 0.7) {
        const random = hash(Math.floor(this.nextLightning * 100));
        let bx = w * (0.2 + random() * 0.6);
        let by = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(bx, by);
        while (by < h * 0.45) { bx += (random() - 0.5) * 40; by += 15 + random() * 25; ctx.lineTo(bx, by); }
        ctx.stroke();
      }
    }
  }

  /** Mountains, hills, tree lines, birds and clouds, each drifting at its own depth. */
  private drawLayers(w: number, h: number, scale: number): void {
    const { ctx, palette } = this;
    const { dpr } = this.size;
    const layer = (depth: number, sizeFactor: number) => {
      const s = scale * sizeFactor;
      ctx.setTransform(dpr * s, 0, 0, -dpr * s, dpr * (w / 2 - this.cam.x * depth * s), dpr * (h / 2 + this.cam.y * depth * s));
    };
    layer(0.15, 0.6);
    const random = hash(42);
    ctx.fillStyle = palette.cloud;
    for (let i = 0; i < 9; i++) {
      const baseX = random() * 400 - 120;
      const y = 26 + random() * 26;
      const size = 3 + random() * 4;
      const x = ((baseX + this.time * (0.4 + this.wind * 1.2) + 1e5) % 400) - 120;
      for (let puff = 0; puff < 5; puff++) {
        ctx.beginPath();
        ctx.ellipse(x + puff * size * 0.7, y + Math.sin(puff * 1.7) * size * 0.25, size * 0.9, size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (this.birds.length) {
      layer(0.4, 0.8);
      ctx.strokeStyle = this.theme === 'dusk' ? 'rgba(40,25,40,0.8)' : 'rgba(30,40,55,0.75)';
      ctx.lineWidth = 0.12;
      for (const bird of this.birds) {
        const flap = Math.sin(this.time * 9 + bird.phase) * 0.5 * bird.size;
        ctx.beginPath();
        ctx.moveTo(bird.x - bird.size, bird.y + flap); ctx.quadraticCurveTo(bird.x - bird.size * 0.4, bird.y + 0.2, bird.x, bird.y);
        ctx.quadraticCurveTo(bird.x + bird.size * 0.4, bird.y + 0.2, bird.x + bird.size, bird.y + flap);
        ctx.stroke();
      }
    }
    const ridge = (seed: number, depth: number, sizeFactor: number, base: number, height: number, roughness: number, color: string, trees: boolean) => {
      layer(depth, sizeFactor);
      const noise = hash(seed);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-300, -60);
      let y = base;
      const points: [number, number][] = [];
      for (let x = -300; x <= 450; x += roughness) {
        y = Math.max(base - height * 0.3, Math.min(base + height, y + (noise() - 0.5) * height * 0.6));
        points.push([x, y]);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(450, -60);
      ctx.closePath();
      ctx.fill();
      if (!trees) return;
      for (const [x, ty] of points) {
        if (noise() < 0.35) continue;
        const th = 1.6 + noise() * 1.6;
        ctx.beginPath();
        ctx.moveTo(x - th * 0.35, ty - 0.2); ctx.lineTo(x, ty + th); ctx.lineTo(x + th * 0.35, ty - 0.2);
        ctx.closePath();
        ctx.fill();
      }
    };
    ridge(1, 0.12, 0.55, 12, 16, 9, palette.far, false);
    ridge(2, 0.3, 0.7, 7, 8, 6, palette.mid, false);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = palette.haze;
    ctx.fillRect(0, 0, w, h);
    ridge(3, 0.55, 0.85, 4, 3, 2.5, palette.near, true);
  }

  private drawWater(): void {
    const { ctx, palette } = this;
    const gradient = ctx.createLinearGradient(0, WATER_LEVEL, 0, -1);
    gradient.addColorStop(0, palette.water);
    gradient.addColorStop(1, palette.waterDeep);
    ctx.fillStyle = gradient;
    ctx.fillRect(36, -3, WORLD_WIDTH - 72, WATER_LEVEL + 3);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 0.08;
    for (let x = 38; x < WORLD_WIDTH - 38; x += 2.2) {
      const wave = Math.sin(this.time * 2 + x) * 0.3;
      ctx.beginPath(); ctx.moveTo(x + wave, WATER_LEVEL - 0.05); ctx.lineTo(x + wave + 0.9, WATER_LEVEL - 0.05); ctx.stroke();
    }
  }

  private drawTerrain(): void {
    const { ctx, palette, terrain } = this;
    if (terrain.length < 4) return;
    const dirt = ctx.createLinearGradient(0, 20, 0, -12);
    dirt.addColorStop(0, palette.dirt);
    dirt.addColorStop(1, palette.dirtDeep);
    ctx.fillStyle = dirt;
    ctx.beginPath();
    ctx.moveTo(terrain[0], -40);
    for (let i = 0; i < terrain.length; i += 2) ctx.lineTo(terrain[i], terrain[i + 1]);
    ctx.lineTo(terrain[terrain.length - 2], -40);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    // Strata, rocks and scorch marks in the soil.
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 0.35;
    for (const depth of [2.5, 5.5]) {
      ctx.beginPath();
      for (let x = -30; x <= WORLD_WIDTH + 30; x += 2) { const y = this.ground(x) - depth + Math.sin(x * 0.3) * 0.3; if (x === -30) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
    }
    const random = hash(77);
    for (let i = 0; i < 90; i++) {
      const x = random() * (WORLD_WIDTH + 60) - 30;
      const top = this.ground(x);
      const rx = 0.25 + random() * 0.55;
      const ry = 0.18 + random() * 0.3;
      const y = top - 0.8 - random() * 7;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, random(), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath(); ctx.ellipse(x - rx * 0.2, y + ry * 0.3, rx * 0.5, ry * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    }
    for (const scorch of this.scorches) {
      const top = this.ground(scorch.x);
      const burn = ctx.createRadialGradient(scorch.x, top, 0, scorch.x, top, scorch.r);
      burn.addColorStop(0, 'rgba(20,12,6,0.65)');
      burn.addColorStop(1, 'rgba(20,12,6,0)');
      ctx.fillStyle = burn;
      ctx.fillRect(scorch.x - scorch.r, top - scorch.r, scorch.r * 2, scorch.r * 2);
    }
    ctx.restore();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const [color, width, offset] of [[palette.grass, 0.6, -0.15], [palette.grassLight, 0.16, 0.08]] as const) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (let i = 0; i < terrain.length; i += 2) {
        if (i === 0) ctx.moveTo(terrain[i], terrain[i + 1] + offset); else ctx.lineTo(terrain[i], terrain[i + 1] + offset);
      }
      ctx.stroke();
    }
    const tufts = hash(5);
    ctx.strokeStyle = palette.grass;
    ctx.lineWidth = 0.07;
    const sway = Math.sin(this.time * 2) * 0.05 + this.wind * 0.04;
    ctx.beginPath();
    for (let x = -28; x < WORLD_WIDTH + 28; x += 0.55 + tufts() * 0.6) {
      const y = this.ground(x);
      if (y < WATER_LEVEL) continue;
      const height = 0.25 + tufts() * 0.35;
      ctx.moveTo(x - 0.12, y); ctx.lineTo(x - 0.2 + sway, y + height);
      ctx.moveTo(x, y); ctx.lineTo(x + 0.05 + sway, y + height * 1.2);
      ctx.moveTo(x + 0.12, y); ctx.lineTo(x + 0.24 + sway, y + height * 0.9);
    }
    ctx.stroke();
    // Wildflowers on the plateaus.
    const flowers = hash(23);
    for (let i = 0; i < 40; i++) {
      const x = flowers() < 0.5 ? flowers() * 36 - 4 : WORLD_WIDTH - flowers() * 36 + 4;
      const y = this.ground(x);
      if (y < PLATEAU_Y - 0.5) continue;
      ctx.fillStyle = ['#fef08a', '#f9a8d4', '#ffffff', '#c4b5fd'][i % 4];
      ctx.beginPath(); ctx.arc(x, y + 0.3 + flowers() * 0.2, 0.08, 0, Math.PI * 2); ctx.fill();
    }
  }

  private drawShadows(): void {
    const { ctx } = this;
    for (const body of this.bodies.values()) {
      const bottom = body.kind === 'block' ? body.y - body.h / 2 : body.y - body.r;
      const top = this.ground(body.x);
      const height = bottom - top;
      if (height > 5 || height < -1) continue;
      const width = (body.kind === 'block' ? body.w : body.r * 2) * 0.6 + height * 0.15;
      ctx.fillStyle = `rgba(0,0,0,${(0.28 * (1 - Math.max(0, height) / 5)).toFixed(3)})`;
      ctx.beginPath(); ctx.ellipse(body.x, top + 0.05, width, 0.18, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  private moodOf(body: Display): Mood {
    if (body.hurt > 0) return 'hurt';
    for (const shot of this.playback?.shots.values() ?? []) {
      if (Number.isNaN(shot.x)) continue;
      const dx = body.x - shot.x;
      if (Math.abs(dx) < 16 && Math.sign(dx) === Math.sign(shot.vx || dx)) return 'scared';
    }
    return 'calm';
  }

  private drawBodies(alpha: number): void {
    const { ctx } = this;
    const moving = this.playback?.moved;
    const lit = this.palette.darkness > 0.1;
    const pose = (body: Display) => moving?.has(body.id)
      ? { x: lerp(body.px, body.x, alpha), y: lerp(body.py, body.y, alpha), a: lerp(body.pa, body.a, alpha) }
      : { x: body.x, y: body.y, a: body.a };
    const selected = this.build?.selected ?? null;
    for (const body of this.bodies.values()) {
      if (body.kind !== 'block') continue;
      const p = pose(body);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      drawBlock(ctx, body, body.flash, this.time, lit);
      if (selected === body.id) this.outline(body.w, body.h, body.shape === 'tri');
      ctx.restore();
    }
    for (const body of this.bodies.values()) {
      if (body.kind !== 'royal') continue;
      const p = pose(body);
      ctx.save();
      ctx.translate(p.x, p.y);
      drawRoyal(ctx, body, this.time, facing(body.side), body.flash, this.moodOf(body));
      if (selected === body.id) this.outline(body.r * 2, body.r * 2.6, false);
      ctx.restore();
      if (body.hp < body.maxHp) drawHealthBar(ctx, p.x, p.y + body.r * 1.6 + 0.45, body.hp / body.maxHp);
    }
  }

  private outline(w: number, h: number, tri: boolean): void {
    const { ctx } = this;
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 0.1;
    ctx.setLineDash([0.3, 0.2]);
    ctx.beginPath();
    if (tri) { ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(0, h / 2); ctx.closePath(); } else ctx.rect(-w / 2 - 0.05, -h / 2 - 0.05, w + 0.1, h + 0.1);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawFallen(): void {
    const { ctx } = this;
    for (const body of this.fallen) {
      const fade = Math.min(1, (FALLEN_SECONDS - body.life) / 0.8);
      ctx.save();
      ctx.globalAlpha = Math.max(0, fade);
      ctx.translate(body.x, body.y);
      ctx.rotate(body.rot);
      drawRoyal(ctx, body.royal, 0, facing(body.royal.side), 0, 'hurt');
      ctx.restore();
      if (!body.landed) continue;
      // The royal's spirit drifts off the battlefield.
      const rise = (body.life - 0.6) * 1.4;
      if (rise <= 0) continue;
      ctx.globalAlpha = Math.max(0, 0.7 * fade);
      ctx.fillStyle = '#eef6ff';
      const gx = body.x + Math.sin(body.life * 3) * 0.3;
      const gy = body.y + 0.6 + rise;
      ctx.beginPath(); ctx.arc(gx, gy + 0.25, 0.28, Math.PI, 0); ctx.lineTo(gx + 0.28, gy - 0.2); ctx.lineTo(gx + 0.1, gy - 0.08); ctx.lineTo(gx, gy - 0.22); ctx.lineTo(gx - 0.1, gy - 0.08); ctx.lineTo(gx - 0.28, gy - 0.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1f2937';
      ctx.beginPath(); ctx.arc(gx - 0.09, gy + 0.25, 0.04, 0, Math.PI * 2); ctx.arc(gx + 0.09, gy + 0.25, 0.04, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 0.05;
      ctx.beginPath(); ctx.ellipse(gx, gy + 0.62, 0.2, 0.06, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  private drawLaunchers(): void {
    const { ctx } = this;
    for (const side of [0, 1] as Side[]) {
      const launcher = launcherPosition(side);
      // The arm tip at release sits right on the physics launch point.
      const pivotOffset = Math.cos(RELEASE_ANGLE) * 3.2;
      const baseX = launcher.x - facing(side) * pivotOffset;
      ctx.save();
      ctx.translate(baseX, Math.min(launcher.y - LAUNCHER_HEIGHT, this.ground(baseX)));
      const loaded = !(this.playback?.side === side) && this.swing[side] < 0;
      const ammo = this.aim?.side === side ? this.aim.ammo : this.loaded[side];
      drawTrebuchet(ctx, side, this.arms[side], loaded, ammo, this.crew[side], this.time);
      ctx.restore();
    }
  }

  private drawBuildOverlay(scale: number): void {
    const { ctx } = this;
    const x0 = FORT_OFFSET;
    const y0 = PLATEAU_Y;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(x0, y0, BUILD_WIDTH, BUILD_HEIGHT);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1 / scale;
    ctx.beginPath();
    for (let x = 0; x <= BUILD_WIDTH; x += 1) { ctx.moveTo(x0 + x, y0); ctx.lineTo(x0 + x, y0 + BUILD_HEIGHT); }
    for (let y = 0; y <= BUILD_HEIGHT; y += 1) { ctx.moveTo(x0, y0 + y); ctx.lineTo(x0 + BUILD_WIDTH, y0 + y); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(253,224,71,0.8)';
    ctx.lineWidth = 2 / scale;
    ctx.setLineDash([6 / scale, 4 / scale]);
    ctx.strokeRect(x0, y0, BUILD_WIDTH, BUILD_HEIGHT);
    ctx.setLineDash([]);
    const ghost = this.build?.ghost;
    if (!ghost) return;
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.translate(x0 + ghost.x, y0 + ghost.y);
    ctx.strokeStyle = ghost.valid ? '#4ade80' : '#f87171';
    if (ghost.type === 'piece') {
      const spec = PIECES[ghost.piece];
      drawBlock(ctx, { id: 0, piece: ghost.piece, shape: spec.shape, material: ghost.material, w: spec.w, h: spec.h, hp: 1, maxHp: 1, burn: 0 }, 0, this.time);
      ctx.globalAlpha = 1;
      ctx.lineWidth = 3 / scale;
      ctx.strokeRect(-spec.w / 2, -spec.h / 2, spec.w, spec.h);
    } else {
      const r = ghost.role === 'king' ? 0.65 : 0.6;
      drawRoyal(ctx, { id: 0, role: ghost.role, side: 0, r, hp: 1, maxHp: 1 }, this.time, 1);
      ctx.globalAlpha = 1;
      ctx.lineWidth = 3 / scale;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  private drawGuide(scale: number): void {
    const { ctx } = this;
    const pixel = 1 / scale;
    const previous = this.paths[this.focusSide];
    if (previous.length > 2 && !this.playback && this.mode !== 'build') {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < previous.length; i += 3) { ctx.beginPath(); ctx.arc(previous[i].x, previous[i].y, pixel * 2, 0, Math.PI * 2); ctx.fill(); }
      const end = previous[previous.length - 1];
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = pixel * 2.5;
      ctx.beginPath(); ctx.moveTo(end.x - 0.5, end.y - 0.5); ctx.lineTo(end.x + 0.5, end.y + 0.5); ctx.moveTo(end.x - 0.5, end.y + 0.5); ctx.lineTo(end.x + 0.5, end.y - 0.5); ctx.stroke();
    }
    const aim = this.aim;
    if (!aim || this.playback) return;
    // Elevation dial at the launch point; the needle grows and warms with power.
    const origin = launcherPosition(aim.side);
    const dir = facing(aim.side);
    const angle = (aim.angle * Math.PI) / 180;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = pixel * 2;
    ctx.beginPath();
    for (let a = 0; a <= 90; a += 3) { const r = (a * Math.PI) / 180; const px = origin.x + Math.cos(r) * 2.4 * dir; const py = origin.y + Math.sin(r) * 2.4; if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
    ctx.stroke();
    ctx.strokeStyle = `hsl(${120 - aim.power * 120}, 90%, 60%)`;
    ctx.lineWidth = pixel * 4;
    ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(origin.x + Math.cos(angle) * (1.2 + aim.power * 2.4) * dir, origin.y + Math.sin(angle) * (1.2 + aim.power * 2.4)); ctx.stroke();
    const points = trajectory(aim.side, aim.angle, aim.power, aim.wind, aim.seconds, 18);
    points.forEach((point, index) => {
      const fade = 1 - index / points.length;
      ctx.fillStyle = `rgba(255,255,255,${0.25 + fade * 0.7})`;
      ctx.beginPath(); ctx.arc(point.x, point.y, pixel * (2 + fade * 3.5), 0, Math.PI * 2); ctx.fill();
    });
  }

  private drawShots(alpha: number): void {
    const playback = this.playback;
    if (!playback) return;
    const { ctx } = this;
    for (const shot of playback.shots.values()) {
      if (Number.isNaN(shot.x)) continue;
      const moving = playback.moved.has(shot.id);
      const x = moving ? lerp(shot.px, shot.x, alpha) : shot.x;
      const y = moving ? lerp(shot.py, shot.y, alpha) : shot.y;
      const heading = shot.ammo === 'buster' ? Math.atan2(shot.y - shot.py, shot.x - shot.px) : lerp(shot.pa, shot.a, alpha);
      ctx.save();
      ctx.translate(x, y);
      drawProjectile(ctx, shot.ammo, shot.r, heading, this.time);
      ctx.restore();
    }
  }

  /** Darkens the world for dusk, storms and night, then adds light from fire, torches and windows. */
  private drawLight(): void {
    const { ctx, palette } = this;
    const dark = palette.darkness;
    const lights: [number, number, number, string, number][] = [];
    for (const body of this.bodies.values()) {
      if (body.kind !== 'block') continue;
      if (body.burn > 0) lights.push([body.x, body.y, 3.2, 'rgba(255,140,40,ALPHA)', 0.45 + Math.sin(this.time * 11 + body.id) * 0.08]);
      if (Math.abs(body.a) > 0.6) continue;
      if (hasTorch(body)) {
        const tx = body.x - Math.sin(body.a) * body.h * 0.34;
        const ty = body.y + Math.cos(body.a) * body.h * 0.34;
        lights.push([tx, ty, 2.4, 'rgba(255,190,90,ALPHA)', 0.18 + dark * 0.7 + Math.sin(this.time * 13 + body.id) * 0.05]);
      }
      if (body.material === 'glass' && dark > 0.1) lights.push([body.x, body.y, 1.8, 'rgba(255,210,120,ALPHA)', dark * 0.9]);
    }
    if (dark > 0) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = `rgba(8,12,35,${dark.toFixed(3)})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.restore();
    }
    if (!lights.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r, color, alpha] of lights) drawGlow(ctx, x, y, r, color, alpha);
    ctx.restore();
  }

  private drawWeather(w: number, h: number): void {
    const { ctx } = this;
    if (this.rain.length && !this.reducedMotion) {
      ctx.strokeStyle = 'rgba(200,215,235,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const slant = this.wind * 6;
      for (const drop of this.rain) {
        const x = drop.x * w;
        const y = drop.y * h;
        ctx.moveTo(x, y); ctx.lineTo(x + slant, y + 14 * drop.speed);
      }
      ctx.stroke();
    }
    if (this.theme === 'night') {
      const random = hash(321);
      for (let i = 0; i < 14; i++) {
        const fx = ((random() * w + Math.sin(this.time * 0.7 + i) * 30) % w + w) % w;
        const fy = h * (0.55 + random() * 0.35) + Math.cos(this.time * 0.9 + i * 2) * 12;
        const glow = 0.4 + Math.sin(this.time * 3 + i) * 0.4;
        ctx.fillStyle = `rgba(220,255,140,${Math.max(0, glow).toFixed(2)})`;
        ctx.beginPath(); ctx.arc(fx, fy, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (this.slowmo > 0) {
      const strength = Math.min(1, this.slowmo / 0.3) * 0.35;
      const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, `rgba(0,0,0,${strength.toFixed(3)})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    }
  }

  /** The rubber band from where the pull started to the finger. */
  private drawDrag(): void {
    const drag = this.drag;
    if (!drag) return;
    const { ctx } = this;
    const color = `hsl(${120 - drag.power * 120}, 90%, 60%)`;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(drag.ax, drag.ay); ctx.lineTo(drag.px, drag.py); ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(drag.ax, drag.ay); ctx.lineTo(drag.px, drag.py); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(drag.ax, drag.ay, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(drag.px, drag.py, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
