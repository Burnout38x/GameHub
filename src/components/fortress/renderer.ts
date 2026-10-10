import { CARDS, DEFENSES, FIELD_LENGTH, LANES, PAD_ROWS, PADS_PER_SIDE } from '@/lib/fortress/content';
import { padLane, padRow, padSlot, worldY, type BattleState, type Fx, type FxKind, type Side, type Structure, type Unit } from '@/lib/fortress/state';

/** Logical arena size; everything is scaled from these units to the canvas. */
export const ARENA_WIDTH = 600;
export const ARENA_RATIO = ARENA_WIDTH / FIELD_LENGTH;
const RIVER_Y = FIELD_LENGTH / 2;
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

export interface View { width: number; height: number; mySide: Side }
export interface Effect {
  type: 'shot' | 'boom' | 'float' | 'build';
  born: number; life: number; kind?: FxKind; side: Side;
  fromLane: number; fromY: number; toLane: number; toY: number; size: number; text?: string;
}
export interface DrawOptions {
  now: number; alpha: number; selectedPad: number | null; deployLane: number | null; armed: boolean;
  ghosts: { lane: number; emoji: string }[]; shake: number; reducedMotion: boolean;
}

const PALETTE = {
  ally: '#3b82f6', allyLight: '#bfdbfe', allyDark: '#1e3a8a',
  enemy: '#ef4444', enemyLight: '#fecaca', enemyDark: '#7f1d1d',
};
const colors = (side: Side, view: View) => side === view.mySide
  ? { main: PALETTE.ally, light: PALETTE.allyLight, dark: PALETTE.allyDark }
  : { main: PALETTE.enemy, light: PALETTE.enemyLight, dark: PALETTE.enemyDark };

/** Screen-space position for a lane and world distance. Your keep is always at the bottom. */
export function project(view: View, lane: number, y: number, xo = 0): { x: number; y: number } {
  const s = view.width / ARENA_WIDTH;
  const flip = view.mySide === 1;
  const viewLane = lane < 0 ? 1 : flip ? LANES - 1 - lane : lane;
  const x = ((viewLane + 0.5) / LANES) * view.width + (flip ? -xo : xo) * s;
  const sy = flip ? (y / FIELD_LENGTH) * view.height : (1 - y / FIELD_LENGTH) * view.height;
  return { x, y: sy };
}

/** Maps a tap back to a world lane (for deploying) using the same orientation. */
export function laneAt(view: View, x: number): number {
  const viewLane = Math.max(0, Math.min(LANES - 1, Math.floor((x / view.width) * LANES)));
  return view.mySide === 1 ? LANES - 1 - viewLane : viewLane;
}

/** The player's own plot (0-5) under a tap, if any. */
export function padAt(view: View, x: number, y: number): number | null {
  const s = view.width / ARENA_WIDTH;
  for (let pad = 0; pad < PADS_PER_SIDE; pad++) {
    const p = project(view, padLane(pad), worldY(view.mySide, PAD_ROWS[padRow(pad)]));
    if (Math.hypot(p.x - x, p.y - y) <= 42 * s) return pad;
  }
  return null;
}

export function effectsFromFx(fx: readonly Fx[], now: number): Effect[] {
  return fx.map((event): Effect => {
    if (event.k === 'shot') {
      const life = event.kind === 'meteor' ? 650 : event.kind === 'fire' ? 420 : event.kind === 'melee' ? 160 : 220;
      return { type: 'shot', born: now, life, kind: event.kind, side: event.side, fromLane: event.fromLane, fromY: event.fromY, toLane: event.toLane, toY: event.toY, size: 1 };
    }
    if (event.k === 'boom') {
      const life = [0, 380, 650, 700, 1400][event.size] ?? 500;
      const born = event.size === 3 ? now + 600 : now;
      return { type: 'boom', born, life, side: event.side, fromLane: event.lane, fromY: event.y, toLane: event.lane, toY: event.y, size: event.size };
    }
    if (event.k === 'damage') return { type: 'float', born: now, life: 800, side: event.side, fromLane: event.lane, fromY: event.y, toLane: event.lane, toY: event.y, size: 1, text: `-${event.amount}` };
    return { type: 'build', born: now, life: 450, side: event.side, fromLane: event.lane, fromY: event.y, toLane: event.lane, toY: event.y, size: 1 };
  });
}

let backdrop: { key: string; canvas: HTMLCanvasElement } | null = null;

/** Grass, lanes, river and bridges never change mid-battle, so they are painted once per size. */
function paintBackdrop(view: View, dpr: number): HTMLCanvasElement {
  const key = `${view.width}x${view.height}@${dpr}:${view.mySide}`;
  if (backdrop?.key === key) return backdrop.canvas;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(view.width * dpr);
  canvas.height = Math.round(view.height * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  const { width: w, height: h } = view;
  const s = w / ARENA_WIDTH;
  const grass = ctx.createLinearGradient(0, 0, 0, h);
  grass.addColorStop(0, '#3f8f4a'); grass.addColorStop(0.5, '#56a457'); grass.addColorStop(1, '#3f8f4a');
  ctx.fillStyle = grass;
  ctx.fillRect(0, 0, w, h);
  // Soft team tint: enemy half warm, your half cool.
  ctx.fillStyle = 'rgba(239,68,68,0.07)'; ctx.fillRect(0, 0, w, h / 2);
  ctx.fillStyle = 'rgba(59,130,246,0.07)'; ctx.fillRect(0, h / 2, w, h / 2);
  // Deterministic grass tufts.
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,40,0,0.08)';
    ctx.beginPath(); ctx.ellipse(rand() * w, rand() * h, (2 + rand() * 5) * s, (1 + rand() * 2) * s, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Dirt roads down each lane.
  for (let lane = 0; lane < LANES; lane++) {
    const top = project(view, lane, view.mySide === 0 ? FIELD_LENGTH - 30 : 30);
    const bottom = project(view, lane, view.mySide === 0 ? 30 : FIELD_LENGTH - 30);
    const roadW = 58 * s;
    ctx.fillStyle = '#b98f58';
    roundRect(ctx, top.x - roadW / 2 - 3 * s, top.y, roadW + 6 * s, bottom.y - top.y, 18 * s); ctx.fill();
    ctx.fillStyle = '#d8b47c';
    roundRect(ctx, top.x - roadW / 2, top.y, roadW, bottom.y - top.y, 16 * s); ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,40,0.25)'; ctx.lineWidth = 2 * s; ctx.setLineDash([10 * s, 14 * s]);
    ctx.beginPath(); ctx.moveTo(top.x, top.y + 20 * s); ctx.lineTo(bottom.x, bottom.y - 20 * s); ctx.stroke(); ctx.setLineDash([]);
  }
  // River with bridges.
  const river = project(view, 1, RIVER_Y).y;
  const riverH = 54 * s;
  const water = ctx.createLinearGradient(0, river - riverH / 2, 0, river + riverH / 2);
  water.addColorStop(0, '#2b7fc0'); water.addColorStop(0.5, '#4fb3e8'); water.addColorStop(1, '#2b7fc0');
  ctx.fillStyle = '#2f6b3a'; ctx.fillRect(0, river - riverH / 2 - 4 * s, w, riverH + 8 * s);
  ctx.fillStyle = water; ctx.fillRect(0, river - riverH / 2, w, riverH);
  for (let lane = 0; lane < LANES; lane++) {
    const { x } = project(view, lane, RIVER_Y);
    const bw = 76 * s;
    ctx.fillStyle = '#7a4e2a'; roundRect(ctx, x - bw / 2 - 4 * s, river - riverH / 2 - 8 * s, bw + 8 * s, riverH + 16 * s, 6 * s); ctx.fill();
    ctx.fillStyle = '#a8703f'; roundRect(ctx, x - bw / 2, river - riverH / 2 - 6 * s, bw, riverH + 12 * s, 5 * s); ctx.fill();
    ctx.strokeStyle = 'rgba(70,40,15,0.45)'; ctx.lineWidth = 1.5 * s;
    for (let plank = -2; plank <= 3; plank++) {
      const py = river + plank * 11 * s - 5 * s;
      ctx.beginPath(); ctx.moveTo(x - bw / 2, py); ctx.lineTo(x + bw / 2, py); ctx.stroke();
    }
  }
  backdrop = { key, canvas };
  return canvas;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function emoji(ctx: CanvasRenderingContext2D, glyph: string, x: number, y: number, size: number) {
  ctx.font = `${Math.round(size)}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, x, y + size * 0.05);
}

function healthBar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, ratio: number, color: string, s: number) {
  const h = 5 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; roundRect(ctx, x - width / 2 - s, y - s, width + 2 * s, h + 2 * s, 3 * s); ctx.fill();
  ctx.fillStyle = color; roundRect(ctx, x - width / 2, y, Math.max(0, width * ratio), h, 2.5 * s); ctx.fill();
}

function drawRiverShimmer(ctx: CanvasRenderingContext2D, view: View, now: number, reduced: boolean) {
  if (reduced) return;
  const s = view.width / ARENA_WIDTH;
  const river = project(view, 1, RIVER_Y).y;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5 * s;
  for (let i = 0; i < 9; i++) {
    const x = ((i * 97 + now * 0.03) % (view.width + 60)) - 30;
    const y = river + ((i % 3) - 1) * 13 * s;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 10 * s, y - 4 * s, x + 20 * s, y); ctx.stroke();
  }
}

function drawKeep(ctx: CanvasRenderingContext2D, view: View, keep: Structure, now: number) {
  const s = view.width / ARENA_WIDTH;
  const { x, y } = project(view, -1, keep.y);
  const c = colors(keep.side, view);
  const w = 170 * s; const h = 66 * s;
  const facingUp = (keep.side === view.mySide);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + h * 0.42, w * 0.55, h * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#9ca3af'; roundRect(ctx, x - w / 2, y - h / 2, w, h, 8 * s); ctx.fill();
  ctx.fillStyle = '#6b7280'; roundRect(ctx, x - w / 2, y + h * 0.15, w, h * 0.35, 6 * s); ctx.fill();
  // Crenellations on the battlefield side.
  const cy = facingUp ? y - h / 2 - 9 * s : y + h / 2;
  ctx.fillStyle = '#9ca3af';
  for (let i = 0; i < 7; i++) ctx.fillRect(x - w / 2 + i * (w / 6.5), cy, w / 11, 10 * s);
  // Towers.
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#8b939e'; roundRect(ctx, x + side * (w / 2) - 16 * s, y - h / 2 - 16 * s, 32 * s, h + 24 * s, 7 * s); ctx.fill();
    ctx.fillStyle = c.main; ctx.beginPath();
    const tx = x + side * (w / 2); const ty = y - h / 2 - 16 * s;
    ctx.moveTo(tx - 18 * s, ty); ctx.lineTo(tx, ty - 22 * s); ctx.lineTo(tx + 18 * s, ty); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#3f2a1d'; roundRect(ctx, x - 16 * s, y - 4 * s, 32 * s, 30 * s, 12 * s); ctx.fill();
  // Waving flag.
  const wave = Math.sin(now / 260) * 4 * s;
  ctx.strokeStyle = '#3f2a1d'; ctx.lineWidth = 2.5 * s;
  ctx.beginPath(); ctx.moveTo(x, y - h / 2 - 4 * s); ctx.lineTo(x, y - h / 2 - 44 * s); ctx.stroke();
  ctx.fillStyle = c.main; ctx.beginPath();
  ctx.moveTo(x, y - h / 2 - 44 * s); ctx.quadraticCurveTo(x + 14 * s, y - h / 2 - 40 * s + wave, x + 28 * s, y - h / 2 - 36 * s);
  ctx.lineTo(x, y - h / 2 - 28 * s); ctx.closePath(); ctx.fill();
  emoji(ctx, '👑', x, y - 16 * s, 22 * s);
  healthBar(ctx, x, facingUp ? y + h / 2 + 10 * s : y - h / 2 - 22 * s, w * 0.8, keep.hp / keep.maxHp, c.main, s);
}

function drawPad(ctx: CanvasRenderingContext2D, view: View, side: Side, pad: number, structure: Structure | null, opts: DrawOptions) {
  const s = view.width / ARENA_WIDTH;
  const { x, y } = project(view, padLane(pad), worldY(side, PAD_ROWS[padRow(pad)]));
  const mine = side === view.mySide;
  const selected = mine && opts.selectedPad === pad;
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(x, y + 8 * s, 30 * s, 13 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = structure ? '#a3a3a3' : 'rgba(120,113,108,0.75)';
  ctx.beginPath(); ctx.ellipse(x, y, 30 * s, 22 * s, 0, 0, Math.PI * 2); ctx.fill();
  if (selected) {
    ctx.strokeStyle = '#fde047'; ctx.lineWidth = 4 * s;
    ctx.beginPath(); ctx.ellipse(x, y, 36 * s, 27 * s, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (!structure) {
    if (!mine) return;
    const pulse = opts.reducedMotion ? 0.6 : 0.45 + Math.sin(opts.now / 400 + pad) * 0.2;
    ctx.strokeStyle = `rgba(255,255,255,${pulse})`; ctx.lineWidth = 2 * s; ctx.setLineDash([5 * s, 5 * s]);
    ctx.beginPath(); ctx.ellipse(x, y, 24 * s, 17 * s, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = `rgba(255,255,255,${pulse + 0.2})`; ctx.font = `bold ${Math.round(20 * s)}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('+', x, y + s);
    return;
  }
  const c = colors(side, view);
  const def = DEFENSES[structure.def as keyof typeof DEFENSES];
  ctx.fillStyle = c.dark; roundRect(ctx, x - 22 * s, y - 34 * s, 44 * s, 40 * s, 10 * s); ctx.fill();
  ctx.fillStyle = c.main; roundRect(ctx, x - 20 * s, y - 32 * s, 40 * s, 36 * s, 9 * s); ctx.fill();
  emoji(ctx, def.emoji, x, y - 14 * s, 26 * s + structure.level * 2 * s);
  for (let i = 0; i < structure.level; i++) emoji(ctx, '⭐', x - (structure.level - 1) * 7 * s + i * 14 * s, y + 14 * s, 11 * s);
  if (structure.hp < structure.maxHp) healthBar(ctx, x, y - 46 * s, 46 * s, structure.hp / structure.maxHp, c.main, s);
}

function drawUnit(ctx: CanvasRenderingContext2D, view: View, unit: Unit, alpha: number) {
  const s = view.width / ARENA_WIDTH;
  const card = CARDS[unit.card];
  const y = unit.py + (unit.y - unit.py) * alpha;
  const { x, y: sy } = project(view, unit.lane, y, unit.xo);
  const c = colors(unit.side, view);
  const big = unit.card === 'giant' || unit.card === 'ram';
  const r = (big ? 19 : 13) * s;
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(x, sy + r * 0.8, r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.main; ctx.beginPath(); ctx.arc(x, sy, r + 2 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.light; ctx.beginPath(); ctx.arc(x, sy, r, 0, Math.PI * 2); ctx.fill();
  if (unit.slow > 0) { ctx.strokeStyle = '#a5f3fc'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.arc(x, sy, r + 5 * s, 0, Math.PI * 2); ctx.stroke(); }
  emoji(ctx, card.emoji, x, sy, r * 1.35);
  if (unit.hp < unit.maxHp) healthBar(ctx, x, sy - r - 9 * s, r * 2.2, unit.hp / unit.maxHp, c.main, s);
}

const SHOT_COLORS: Record<FxKind, string> = {
  arrow: '#fef3c7', ball: '#1f2937', frost: '#67e8f9', fire: '#fb923c', magic: '#c084fc', melee: '#ffffff', meteor: '#f97316', keep: '#fde047',
};

function drawEffect(ctx: CanvasRenderingContext2D, view: View, effect: Effect, now: number) {
  const t = (now - effect.born) / effect.life;
  if (t < 0 || t > 1) return;
  const s = view.width / ARENA_WIDTH;
  const from = project(view, effect.fromLane, effect.fromY);
  const to = project(view, effect.toLane, effect.toY);
  if (effect.type === 'shot') {
    const color = SHOT_COLORS[effect.kind ?? 'arrow'];
    if (effect.kind === 'melee') {
      ctx.strokeStyle = `rgba(255,255,255,${1 - t})`; ctx.lineWidth = 3 * s;
      ctx.beginPath(); ctx.arc(to.x, to.y, (10 + t * 10) * s, -1.2, 0.6); ctx.stroke();
      return;
    }
    if (effect.kind === 'meteor') {
      const sx = to.x + 120 * s * (1 - t); const sy = to.y - 260 * s * (1 - t);
      ctx.strokeStyle = 'rgba(251,146,60,0.55)'; ctx.lineWidth = 10 * s * (1 - t * 0.5);
      ctx.beginPath(); ctx.moveTo(sx + 40 * s, sy - 90 * s); ctx.lineTo(sx, sy); ctx.stroke();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(sx, sy, 13 * s, 0, Math.PI * 2); ctx.fill();
      emoji(ctx, '☄️', sx, sy, 26 * s);
      return;
    }
    const x = from.x + (to.x - from.x) * t;
    const lob = effect.kind === 'fire' ? Math.sin(t * Math.PI) * 60 * s : 0;
    const y = from.y + (to.y - from.y) * t - lob;
    ctx.fillStyle = color;
    if (effect.kind === 'arrow') {
      ctx.strokeStyle = color; ctx.lineWidth = 2.5 * s;
      const back = 0.12;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - (to.x - from.x) * back, y - (to.y - from.y) * back); ctx.stroke();
      return;
    }
    ctx.beginPath(); ctx.arc(x, y, (effect.kind === 'ball' ? 6 : effect.kind === 'keep' ? 5 : 7) * s, 0, Math.PI * 2); ctx.fill();
    return;
  }
  if (effect.type === 'boom') {
    const radius = [0, 18, 46, 70, 130][effect.size] * s * (0.4 + t * 0.8);
    ctx.fillStyle = effect.size >= 2 ? `rgba(251,146,60,${0.75 * (1 - t)})` : `rgba(255,255,255,${0.7 * (1 - t)})`;
    ctx.beginPath(); ctx.arc(from.x, from.y, radius, 0, Math.PI * 2); ctx.fill();
    if (effect.size >= 2) {
      ctx.strokeStyle = `rgba(254,240,138,${1 - t})`; ctx.lineWidth = 4 * s;
      ctx.beginPath(); ctx.arc(from.x, from.y, radius * 1.25, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.fillStyle = `rgba(87,83,78,${1 - t})`;
        ctx.fillRect(from.x + Math.cos(angle) * radius * 1.3, from.y + Math.sin(angle) * radius * 1.3, 5 * s, 5 * s);
      }
    }
    return;
  }
  if (effect.type === 'float') {
    ctx.font = `800 ${Math.round(15 * s)}px system-ui, sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 3 * s; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    const y = from.y - 30 * s - t * 34 * s;
    ctx.strokeText(effect.text ?? '', from.x + 18 * s, y);
    ctx.fillStyle = effect.side === view.mySide ? `rgba(254,202,202,${1 - t * 0.6})` : `rgba(254,240,138,${1 - t * 0.6})`;
    ctx.fillText(effect.text ?? '', from.x + 18 * s, y);
    return;
  }
  ctx.strokeStyle = `rgba(253,224,71,${1 - t})`; ctx.lineWidth = 3 * s;
  ctx.beginPath(); ctx.arc(from.x, from.y - 10 * s, (18 + t * 30) * s, 0, Math.PI * 2); ctx.stroke();
}

function drawDeployGuide(ctx: CanvasRenderingContext2D, view: View, opts: DrawOptions) {
  if (!opts.armed) return;
  const s = view.width / ARENA_WIDTH;
  for (let lane = 0; lane < LANES; lane++) {
    const { x } = project(view, lane, 0);
    const active = opts.deployLane === lane;
    ctx.fillStyle = active ? 'rgba(253,224,71,0.22)' : 'rgba(255,255,255,0.08)';
    roundRect(ctx, x - view.width / 6 + 6 * s, view.height / 2 + 30 * s, view.width / 3 - 12 * s, view.height / 2 - 40 * s, 18 * s); ctx.fill();
    ctx.fillStyle = active ? 'rgba(253,224,71,0.9)' : 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    const ay = view.height * 0.62;
    ctx.moveTo(x, ay - 22 * s); ctx.lineTo(x - 16 * s, ay); ctx.lineTo(x + 16 * s, ay); ctx.closePath(); ctx.fill();
  }
}

export function drawBattle(ctx: CanvasRenderingContext2D, state: BattleState, view: View, effects: readonly Effect[], opts: DrawOptions, dpr: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, view.width, view.height);
  ctx.save();
  if (opts.shake > 0 && !opts.reducedMotion) ctx.translate((Math.random() - 0.5) * opts.shake, (Math.random() - 0.5) * opts.shake);
  ctx.drawImage(paintBackdrop(view, dpr), 0, 0, view.width, view.height);
  drawRiverShimmer(ctx, view, opts.now, opts.reducedMotion);
  drawDeployGuide(ctx, view, opts);
  for (const side of [0, 1] as Side[]) {
    for (let pad = 0; pad < PADS_PER_SIDE; pad++) drawPad(ctx, view, side, pad, state.pads[padSlot(side, pad)], opts);
  }
  for (const keep of state.keeps) drawKeep(ctx, view, keep, opts.now);
  const units = [...state.units].sort((a, b) => project(view, a.lane, a.y).y - project(view, b.lane, b.y).y);
  for (const unit of units) drawUnit(ctx, view, unit, opts.alpha);
  for (const ghost of opts.ghosts) {
    const p = project(view, ghost.lane, worldY(view.mySide, 80));
    ctx.globalAlpha = 0.45 + Math.sin(opts.now / 120) * 0.15;
    emoji(ctx, ghost.emoji, p.x, p.y, 26 * (view.width / ARENA_WIDTH));
    ctx.globalAlpha = 1;
  }
  for (const effect of effects) drawEffect(ctx, view, effect, opts.now);
  ctx.restore();
}
