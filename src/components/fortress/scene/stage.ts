import { LAUNCHER_HEIGHT, PLATEAU_Y, WORLD_WIDTH, type AmmoId } from '@/lib/fortress/content';
import { trajectory, type Replay, type ShotEvent } from '@/lib/fortress/physics';
import { facing, fortX, launcherPosition, type BodyState, type Side, type WorldState } from '@/lib/fortress/world';
import { PALETTES, drawBanner, drawBlock, drawHealthBar, drawProjectile, drawRoyal, drawTrebuchet, hash, type Palette, type Theme } from './art';
import { Effects } from './effects';

export type SoundCue = 'launch' | 'hit' | 'boom' | 'break' | 'ko' | 'split' | 'splash';
export type CameraMode = 'auto' | 'overview' | 'home' | 'enemy';
export interface AimGuide { side: Side; angle: number; power: number; wind: number; ammo: AmmoId; seconds: number }

type Display = BodyState & { flash: number; px: number; py: number; pa: number };
interface LiveShot { id: number; ammo: AmmoId; r: number; x: number; y: number; a: number; px: number; py: number; pa: number; trail: number }
interface Playback {
  replay: Replay; after: WorldState; side: Side; clock: number; applied: number; event: number;
  shots: Map<number, LiveShot>; moved: Set<number>; hold: number; focus: { x: number; y: number } | null;
  path: { x: number; y: number }[]; primary: number | null; resolve: () => void;
}

const WATER_LEVEL = 1.55;
const RELEASE_ANGLE = (75 * Math.PI) / 180;
const REST_ANGLE = (210 * Math.PI) / 180;
const FOLLOW_THROUGH = (35 * Math.PI) / 180;
const SWING_SECONDS = 0.32;
const END_HOLD_SECONDS = 0.9;
const MAX_DT = 1 / 20;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Owns the battlefield canvas: camera, scenery, bodies, replays and effects. */
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
  private loaded: [AmmoId, AmmoId] = ['stone', 'stone'];
  private paths: [{ x: number; y: number }[], { x: number; y: number }[]] = [[], []];
  private resize: ResizeObserver;
  private destroyed = false;
  aim: AimGuide | null = null;
  focusSide: Side = 0;
  mode: CameraMode = 'auto';
  speed = 1;
  reducedMotion = false;
  onSound: ((cue: SoundCue, strength: number) => void) | null = null;

  constructor(private canvas: HTMLCanvasElement, theme: Theme) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported on this device.');
    this.ctx = ctx;
    this.palette = PALETTES[theme];
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
    this.terrain = world.terrain;
    this.wind = wind;
    if (this.playback) return;
    const previous = this.bodies;
    this.bodies = new Map(world.bodies.map(body => [body.id, { ...body, flash: previous.get(body.id)?.flash ?? 0, px: body.x, py: body.y, pa: body.a }]));
  }

  setLoaded(side: Side, ammo: AmmoId): void { this.loaded[side] = ammo; }

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
    this.finish(playback);
  }

  get playing(): boolean { return this.playback !== null; }

  private finish(playback: Playback): void {
    this.bodies = new Map(playback.after.bodies.map(body => [body.id, { ...body, flash: 0, px: body.x, py: body.y, pa: body.a }]));
    playback.resolve();
  }

  // ── Playback ───────────────────────────────────────────────────────────

  private handle(event: ShotEvent, playback: Playback): void {
    const fx = this.effects;
    const viewer = this.focusSide;
    switch (event.t) {
      case 'launch': {
        const side: Side = event.x < WORLD_WIDTH / 2 ? 0 : 1;
        this.swing[side] = 0;
        fx.puff(event.x - facing(side) * 1.2, PLATEAU_Y + 0.5, 8, 'rgba(214,204,186,0.7)', 0.6, 2);
        this.onSound?.('launch', 1);
        break;
      }
      case 'spawn':
        playback.shots.set(event.id, { id: event.id, ammo: event.ammo, r: event.r, x: NaN, y: NaN, a: 0, px: NaN, py: NaN, pa: 0, trail: 0 });
        if (playback.primary === null) playback.primary = event.id;
        break;
      case 'gone': {
        playback.shots.delete(event.id);
        if (event.y < WATER_LEVEL + 0.5 && event.x > 38 && event.x < WORLD_WIDTH - 38) { fx.splash(event.x, WATER_LEVEL); this.onSound?.('splash', 0.6); }
        if (!playback.focus) playback.focus = { x: event.x, y: event.y };
        break;
      }
      case 'boom':
        fx.explosion(event.x, event.y, event.r, event.fire);
        playback.focus = { x: event.x, y: event.y };
        this.onSound?.('boom', Math.min(1, event.r / 3.4));
        break;
      case 'split':
        fx.explosion(event.x, event.y, 0.8);
        this.onSound?.('split', 0.6);
        break;
      case 'hit': {
        const body = this.bodies.get(event.id);
        if (!body) break;
        body.hp = Math.max(1, body.hp - event.d);
        body.flash = 1;
        if (!playback.focus) playback.focus = { x: event.x, y: event.y };
        if (event.d >= 10 || body.kind === 'royal') fx.text(event.x, event.y + 0.9, `-${event.d}`, body.side === viewer ? '#fca5a5' : '#fde68a', body.kind === 'royal' ? 1.2 : 0.9);
        if (event.d >= 25) fx.puff(event.x, event.y, 4, 'rgba(200,190,170,0.6)', 0.4, 1.4);
        this.onSound?.('hit', Math.min(1, event.d / 80));
        break;
      }
      case 'break':
        this.bodies.delete(event.id);
        fx.debris(event.x, event.y, event.m, event.w, event.h);
        this.onSound?.('break', Math.min(1, (event.w * event.h) / 4));
        break;
      case 'ko': {
        const body = this.bodies.get(event.id);
        this.bodies.delete(event.id);
        fx.stars(event.x, event.y);
        fx.text(event.x, event.y + 1.6, body?.kind === 'royal' && body.role === 'king' ? 'KING DOWN!' : 'KNOCKED OUT!', '#fde047', 1.4);
        fx.shake = Math.max(fx.shake, 0.6);
        this.onSound?.('ko', 1);
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

  private cameraTarget(): { x: number; w: number; follow: number | null } {
    const wide = this.size.w / this.size.h >= 1.55 && this.size.w >= 820;
    const playback = this.playback;
    if (playback && this.mode === 'auto') {
      const live = [...playback.shots.values()].filter(shot => !Number.isNaN(shot.x));
      if (live.length) {
        const x = live.reduce((sum, shot) => sum + shot.x, 0) / live.length;
        const y = Math.max(...live.map(shot => shot.y));
        return { x, w: wide ? 110 : 66, follow: y };
      }
      if (playback.focus) return { x: playback.focus.x, w: wide ? 90 : 52, follow: null };
    }
    // Narrow phones frame a little tighter so the fortress reads clearly.
    const close = Math.min(64, Math.max(46, this.size.w / 7.5));
    const home = (side: Side) => (side === 0 ? 9 + close / 2 : WORLD_WIDTH - 9 - close / 2);
    const mode = this.mode === 'auto' ? (wide ? 'overview' : 'home') : this.mode;
    if (mode === 'overview') return { x: WORLD_WIDTH / 2, w: WORLD_WIDTH + 24, follow: null };
    if (mode === 'enemy') return { x: home(this.focusSide === 0 ? 1 : 0), w: close, follow: null };
    return { x: home(this.focusSide), w: close, follow: null };
  }

  private updateCamera(dt: number): void {
    const target = this.cameraTarget();
    const aspect = this.size.h / this.size.w;
    const k = this.reducedMotion ? 1 : 1 - Math.exp(-dt * 3.2);
    this.cam.w = lerp(this.cam.w, target.w, k);
    this.cam.x = lerp(this.cam.x, target.x, k);
    const viewH = this.cam.w * aspect;
    let y = -2.5 + viewH / 2;
    if (target.follow !== null) y = Math.max(y, target.follow - viewH / 2 + 6);
    this.cam.y = lerp(this.cam.y, y, this.reducedMotion ? 1 : 1 - Math.exp(-dt * 4));
    const half = this.cam.w / 2;
    this.cam.x = Math.min(WORLD_WIDTH + 20 - half, Math.max(-20 + half, this.cam.x));
    if (this.cam.w > WORLD_WIDTH + 40) this.cam.x = WORLD_WIDTH / 2;
  }

  /** Converts a screen point (CSS pixels) into world metres. */
  toWorld(px: number, py: number): { x: number; y: number } {
    const scale = this.size.w / this.cam.w;
    return { x: this.cam.x + (px - this.size.w / 2) / scale, y: this.cam.y - (py - this.size.h / 2) / scale };
  }

  // ── Drawing ────────────────────────────────────────────────────────────

  private tick = (now: number): void => {
    if (this.destroyed) return;
    const dt = Math.min(MAX_DT, this.last ? (now - this.last) / 1000 : 0);
    this.last = now;
    this.time += dt;
    let alpha = 1;
    if (this.playback) alpha = this.advancePlayback(this.playback, dt);
    for (const side of [0, 1] as Side[]) this.animateArm(side, dt);
    for (const body of this.bodies.values()) {
      body.flash = Math.max(0, body.flash - dt * 4);
      if (body.kind === 'block' && body.burn > 0 && !this.reducedMotion && Math.random() < dt * 14) this.effects.fire(body.x, body.y + body.h / 2, body.w);
    }
    for (const shot of this.playback?.shots.values() ?? []) {
      if (Number.isNaN(shot.x)) continue;
      shot.trail += dt;
      if (shot.trail > 0.025) { shot.trail = 0; this.effects.trail(shot.x, shot.y, shot.ammo === 'fire'); }
    }
    this.effects.update(dt);
    this.updateCamera(dt);
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
    // World transform: metres, y up.
    const worldMatrix = (s: number, cx: number, cy: number) =>
      ctx.setTransform(dpr * s, 0, 0, -dpr * s, dpr * (w / 2 - cx * s + sx), dpr * (h / 2 + cy * s + sy));
    worldMatrix(scale, this.cam.x, this.cam.y);
    this.drawWater();
    this.drawTerrain();
    for (const side of [0, 1] as Side[]) drawBanner(ctx, side, fortX(side, -1.6), this.wind, this.time);
    this.drawBodies(alpha);
    this.drawLaunchers();
    this.drawGuide(scale);
    this.drawShots(alpha);
    this.effects.draw(ctx, 1 / scale);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private drawSky(w: number, h: number): void {
    const { ctx, palette } = this;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, palette.skyTop);
    sky.addColorStop(1, palette.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    const sunX = w * 0.78 - this.cam.x * 0.4;
    const sunY = h * 0.2;
    const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, Math.max(w, h) * 0.35);
    glow.addColorStop(0, palette.glow);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = palette.sun;
    ctx.beginPath(); ctx.arc(sunX, sunY, Math.max(14, Math.min(w, h) * 0.05), 0, Math.PI * 2); ctx.fill();
  }

  /** Mountains, hills, tree lines and clouds, each drifting at its own depth. */
  private drawLayers(w: number, h: number, scale: number): void {
    const { ctx, palette } = this;
    const { dpr } = this.size;
    const layer = (depth: number, sizeFactor: number) => {
      const s = scale * sizeFactor;
      ctx.setTransform(dpr * s, 0, 0, -dpr * s, dpr * (w / 2 - this.cam.x * depth * s), dpr * (h / 2 + this.cam.y * depth * s));
      return s;
    };
    // Clouds drift with the wind.
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
    ctx.fillRect(36, -2, WORLD_WIDTH - 72, WATER_LEVEL + 2);
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
    // Rocks in the soil.
    const random = hash(77);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = 0; i < 70; i++) {
      const x = random() * (WORLD_WIDTH + 60) - 30;
      const top = this.groundY(x);
      ctx.beginPath(); ctx.ellipse(x, top - 0.8 - random() * 6, 0.25 + random() * 0.5, 0.18 + random() * 0.25, random(), 0, Math.PI * 2); ctx.fill();
    }
    // Grass cap, then a highlight.
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
    ctx.strokeStyle = palette.grass;
    ctx.lineWidth = 0.07;
    const tufts = hash(5);
    ctx.beginPath();
    for (let x = -28; x < WORLD_WIDTH + 28; x += 0.55 + tufts() * 0.6) {
      const y = this.groundY(x);
      if (y < WATER_LEVEL) continue;
      const height = 0.25 + tufts() * 0.35;
      ctx.moveTo(x - 0.12, y); ctx.lineTo(x - 0.2, y + height);
      ctx.moveTo(x, y); ctx.lineTo(x + 0.05, y + height * 1.2);
      ctx.moveTo(x + 0.12, y); ctx.lineTo(x + 0.24, y + height * 0.9);
    }
    ctx.stroke();
  }

  private groundY(x: number): number {
    const terrain = this.terrain;
    for (let i = 0; i < terrain.length - 2; i += 2) {
      if (x >= terrain[i] && x <= terrain[i + 2]) return terrain[i + 1] + ((x - terrain[i]) / (terrain[i + 2] - terrain[i])) * (terrain[i + 3] - terrain[i + 1]);
    }
    return PLATEAU_Y;
  }

  private drawBodies(alpha: number): void {
    const { ctx } = this;
    const moving = this.playback?.moved;
    const pose = (body: Display) => moving?.has(body.id)
      ? { x: lerp(body.px, body.x, alpha), y: lerp(body.py, body.y, alpha), a: lerp(body.pa, body.a, alpha) }
      : { x: body.x, y: body.y, a: body.a };
    for (const body of this.bodies.values()) {
      if (body.kind !== 'block') continue;
      const p = pose(body);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      drawBlock(ctx, body, body.flash);
      ctx.restore();
    }
    for (const body of this.bodies.values()) {
      if (body.kind !== 'royal') continue;
      const p = pose(body);
      ctx.save();
      ctx.translate(p.x, p.y);
      drawRoyal(ctx, body, this.time, facing(body.side), body.flash);
      ctx.restore();
      if (body.hp < body.maxHp) drawHealthBar(ctx, p.x, p.y + body.r + 0.75, body.hp / body.maxHp);
    }
  }

  private drawLaunchers(): void {
    const { ctx } = this;
    for (const side of [0, 1] as Side[]) {
      const launcher = launcherPosition(side);
      // The arm tip at release sits right on the physics launch point.
      const pivotOffset = Math.cos(RELEASE_ANGLE) * 3.2;
      ctx.save();
      ctx.translate(launcher.x - facing(side) * pivotOffset, launcher.y - LAUNCHER_HEIGHT);
      const loaded = !(this.playback?.side === side) && this.swing[side] < 0;
      const ammo = this.aim?.side === side ? this.aim.ammo : this.loaded[side];
      drawTrebuchet(ctx, side, this.arms[side], loaded, ammo);
      ctx.restore();
    }
  }

  private drawGuide(scale: number): void {
    const { ctx } = this;
    const pixel = 1 / scale;
    // Faint trace of this side's previous shot, to adjust from.
    const previous = this.paths[this.focusSide];
    if (previous.length > 2 && !this.playback) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < previous.length; i += 3) { ctx.beginPath(); ctx.arc(previous[i].x, previous[i].y, pixel * 2, 0, Math.PI * 2); ctx.fill(); }
      const end = previous[previous.length - 1];
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = pixel * 2.5;
      ctx.beginPath(); ctx.moveTo(end.x - 0.5, end.y - 0.5); ctx.lineTo(end.x + 0.5, end.y + 0.5); ctx.moveTo(end.x - 0.5, end.y + 0.5); ctx.lineTo(end.x + 0.5, end.y - 0.5); ctx.stroke();
    }
    const aim = this.aim;
    if (!aim || this.playback) return;
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
}
