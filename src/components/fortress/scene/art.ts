import { PLATEAU_Y, type AmmoId, type MaterialId } from '@/lib/fortress/content';
import type { BlockState, RoyalState, Side } from '@/lib/fortress/world';

/** Hand-drawn look for the battlefield. Everything here draws in world metres (y up, flipped by the camera). */
export const SIDE_COLORS: Record<Side, { main: string; dark: string; light: string; trim: string }> = {
  0: { main: '#2f6fe0', dark: '#1a3d8f', light: '#9cc3ff', trim: '#f5c542' },
  1: { main: '#d93a3a', dark: '#8a1c1c', light: '#ffaaa0', trim: '#f5c542' },
};

export type Theme = 'day' | 'dusk' | 'storm' | 'night';
export interface Palette {
  skyTop: string; skyBottom: string; sun: string; glow: string; far: string; mid: string; near: string; cloud: string;
  water: string; waterDeep: string; grass: string; grassLight: string; dirt: string; dirtDeep: string; haze: string;
  /** How dark the world is drawn before lights are added (0 = broad daylight). */
  darkness: number; moon: boolean;
}
export const PALETTES: Record<Theme, Palette> = {
  day: { skyTop: '#2f6fc4', skyBottom: '#bfe3ff', sun: '#fff7cc', glow: 'rgba(255,240,180,0.55)', far: '#8fa9c9', mid: '#6d8fae', near: '#3f6b4c', cloud: 'rgba(255,255,255,0.92)', water: '#3b8fd0', waterDeep: '#1e5d99', grass: '#4f9a3a', grassLight: '#86c95a', dirt: '#7a5232', dirtDeep: '#3d2817', haze: 'rgba(220,236,255,0.35)', darkness: 0, moon: false },
  dusk: { skyTop: '#2b2d6b', skyBottom: '#f7a35c', sun: '#ffd27a', glow: 'rgba(255,170,90,0.55)', far: '#7a5f8f', mid: '#5b4673', near: '#2f4a3a', cloud: 'rgba(255,214,190,0.85)', water: '#4b6fae', waterDeep: '#263f78', grass: '#477f36', grassLight: '#7fb455', dirt: '#6b4630', dirtDeep: '#33200f', haze: 'rgba(255,190,150,0.25)', darkness: 0.14, moon: false },
  storm: { skyTop: '#273241', skyBottom: '#8a99a8', sun: '#e6edf3', glow: 'rgba(220,230,240,0.25)', far: '#5d6b7a', mid: '#4a5866', near: '#2c4237', cloud: 'rgba(200,208,218,0.9)', water: '#3c6c86', waterDeep: '#1f4357', grass: '#3f7a35', grassLight: '#6aa04f', dirt: '#5d4330', dirtDeep: '#2c1e12', haze: 'rgba(190,205,220,0.3)', darkness: 0.2, moon: false },
  night: { skyTop: '#070d24', skyBottom: '#273a6e', sun: '#f4f1de', glow: 'rgba(190,205,255,0.28)', far: '#26345a', mid: '#1d2a4a', near: '#14261f', cloud: 'rgba(110,122,160,0.55)', water: '#1d3c66', waterDeep: '#0d2142', grass: '#2d5a2a', grassLight: '#4c7d41', dirt: '#47321f', dirtDeep: '#1f140a', haze: 'rgba(30,45,90,0.25)', darkness: 0.45, moon: true },
};

/** Deterministic noise so scenery, cracks and moss look the same every frame. */
export function hash(seed: number): () => number {
  let state = (seed * 2654435761) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Material textures ─────────────────────────────────────────────────

const PATTERN_PX = 64;
type PatternKey = 'wood' | 'woodV' | 'stone' | 'steel' | 'roofWood' | 'roofStone' | 'roofSteel';
const patternCache = new Map<PatternKey, HTMLCanvasElement>();

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function woodTexture(vertical: boolean): HTMLCanvasElement {
  const size = PATTERN_PX * 2;
  const canvas = makeCanvas(size, size);
  const g = canvas.getContext('2d')!;
  const random = hash(vertical ? 11 : 7);
  if (vertical) { g.translate(size, 0); g.rotate(Math.PI / 2); }
  const plank = PATTERN_PX * 0.25;
  for (let row = 0; row * plank < size; row++) {
    const shade = 0.82 + random() * 0.32;
    const base = g.createLinearGradient(0, row * plank, 0, row * plank + plank);
    base.addColorStop(0, `rgb(${Math.round(176 * shade)},${Math.round(120 * shade)},${Math.round(68 * shade)})`);
    base.addColorStop(1, `rgb(${Math.round(140 * shade)},${Math.round(92 * shade)},${Math.round(50 * shade)})`);
    g.fillStyle = base;
    g.fillRect(0, row * plank, size, plank);
    g.strokeStyle = 'rgba(70,40,15,0.33)';
    g.lineWidth = 1;
    for (let line = 0; line < 5; line++) {
      const y = row * plank + 2 + random() * (plank - 4);
      const phase = random() * 6;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= size; x += 8) g.lineTo(x, y + Math.sin(x * 0.07 + phase) * 1.4);
      g.stroke();
    }
    if (random() < 0.55) {
      const kx = random() * size;
      const ky = row * plank + plank / 2;
      g.fillStyle = 'rgba(85,48,18,0.6)';
      g.beginPath(); g.ellipse(kx, ky, 4.5, 2.4, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(85,48,18,0.35)';
      g.beginPath(); g.ellipse(kx, ky, 7, 3.6, 0, 0, Math.PI * 2); g.stroke();
    }
    const seam = random() * size;
    g.fillStyle = 'rgba(45,25,10,0.75)';
    g.fillRect(seam, row * plank, 1.5, plank);
    g.fillRect(0, row * plank + plank - 1.5, size, 1.5);
    g.fillStyle = 'rgba(30,20,12,0.85)';
    for (const nx of [seam - 5, seam + 6]) { g.beginPath(); g.arc(nx, row * plank + 4, 1.3, 0, Math.PI * 2); g.arc(nx, row * plank + plank - 5, 1.3, 0, Math.PI * 2); g.fill(); }
  }
  return canvas;
}

function stoneTexture(): HTMLCanvasElement {
  const size = PATTERN_PX * 2;
  const canvas = makeCanvas(size, size);
  const g = canvas.getContext('2d')!;
  const random = hash(3);
  g.fillStyle = '#5a5751';
  g.fillRect(0, 0, size, size);
  const bh = PATTERN_PX * 0.32;
  const bw = PATTERN_PX * 0.64;
  for (let row = 0; row * bh < size; row++) {
    const offset = row % 2 ? bw / 2 : 0;
    for (let col = -1; col * bw < size; col++) {
      const x = col * bw + offset;
      const y = row * bh;
      const shade = 0.78 + random() * 0.36;
      const warm = random() * 10;
      const gradient = g.createLinearGradient(x, y, x, y + bh);
      gradient.addColorStop(0, `rgb(${Math.round(182 * shade + warm)},${Math.round(176 * shade)},${Math.round(162 * shade)})`);
      gradient.addColorStop(1, `rgb(${Math.round(132 * shade + warm)},${Math.round(127 * shade)},${Math.round(116 * shade)})`);
      g.fillStyle = gradient;
      g.beginPath();
      g.roundRect(x + 1.5, y + 1.5, bw - 3, bh - 3, 2.5);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.16)';
      g.fillRect(x + 2.5, y + 2, bw - 5, 1.5);
      for (let speck = 0; speck < 7; speck++) {
        g.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)';
        g.fillRect(x + random() * bw, y + random() * bh, 1.6, 1.6);
      }
    }
  }
  return canvas;
}

function steelTexture(): HTMLCanvasElement {
  const size = PATTERN_PX * 2;
  const canvas = makeCanvas(size, size);
  const g = canvas.getContext('2d')!;
  const plate = PATTERN_PX;
  for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
    const x = col * plate;
    const y = row * plate;
    const gradient = g.createLinearGradient(x, y, x + plate, y + plate);
    gradient.addColorStop(0, '#c3ccd6');
    gradient.addColorStop(0.45, '#8c99a7');
    gradient.addColorStop(1, '#68778a');
    g.fillStyle = gradient;
    g.fillRect(x, y, plate, plate);
    g.strokeStyle = 'rgba(255,255,255,0.18)';
    g.lineWidth = 1;
    for (let line = 0; line < 6; line++) { g.beginPath(); g.moveTo(x, y + 8 + line * 10); g.lineTo(x + plate, y + 4 + line * 10); g.stroke(); }
    g.strokeStyle = '#46525f';
    g.lineWidth = 2.2;
    g.strokeRect(x + 1, y + 1, plate - 2, plate - 2);
    for (const [rx, ry] of [[6, 6], [plate - 6, 6], [6, plate - 6], [plate - 6, plate - 6], [plate / 2, 6], [plate / 2, plate - 6]]) {
      g.fillStyle = '#3a444f';
      g.beginPath(); g.arc(x + rx, y + ry, 2.6, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.beginPath(); g.arc(x + rx - 0.8, y + ry - 0.8, 0.9, 0, Math.PI * 2); g.fill();
    }
  }
  return canvas;
}

/** Overlapping roof tiles: timber shingles, slate or riveted sheet. */
function roofTexture(kind: 'roofWood' | 'roofStone' | 'roofSteel'): HTMLCanvasElement {
  const size = PATTERN_PX * 2;
  const canvas = makeCanvas(size, size);
  const g = canvas.getContext('2d')!;
  const random = hash(kind.length * 31);
  const colors = { roofWood: [[150, 92, 52], [120, 70, 38]], roofStone: [[108, 116, 132], [76, 84, 100]], roofSteel: [[150, 160, 172], [104, 114, 128]] }[kind];
  g.fillStyle = `rgb(${colors[1].join(',')})`;
  g.fillRect(0, 0, size, size);
  const tileW = PATTERN_PX * 0.32;
  const tileH = PATTERN_PX * 0.22;
  for (let row = 0; row * tileH < size + tileH; row++) {
    for (let col = -1; col * tileW < size; col++) {
      const x = col * tileW + (row % 2 ? tileW / 2 : 0);
      const y = row * tileH;
      const shade = 0.82 + random() * 0.3;
      g.fillStyle = `rgb(${colors[0].map(c => Math.round(c * shade)).join(',')})`;
      g.beginPath();
      if (kind === 'roofSteel') g.rect(x + 1, y, tileW - 2, tileH - 1);
      else { g.moveTo(x + 1, y); g.lineTo(x + tileW - 1, y); g.lineTo(x + tileW - 1, y + tileH * 0.6); g.quadraticCurveTo(x + tileW / 2, y + tileH * 1.15, x + 1, y + tileH * 0.6); g.closePath(); }
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(x + 1, y + tileH - 2, tileW - 2, 1.5);
    }
  }
  return canvas;
}

function texture(key: PatternKey): HTMLCanvasElement {
  let canvas = patternCache.get(key);
  if (!canvas) {
    canvas = key === 'wood' ? woodTexture(false) : key === 'woodV' ? woodTexture(true) : key === 'stone' ? stoneTexture() : key === 'steel' ? steelTexture() : roofTexture(key);
    patternCache.set(key, canvas);
  }
  return canvas;
}

const contextPatterns = new WeakMap<CanvasRenderingContext2D, Map<PatternKey, CanvasPattern>>();
function pattern(ctx: CanvasRenderingContext2D, key: PatternKey): CanvasPattern | string {
  let cache = contextPatterns.get(ctx);
  if (!cache) { cache = new Map(); contextPatterns.set(ctx, cache); }
  const cached = cache.get(key);
  if (cached) return cached;
  const made = ctx.createPattern(texture(key), 'repeat');
  if (!made) return '#888';
  made.setTransform(new DOMMatrix().scale(1 / PATTERN_PX, -1 / PATTERN_PX));
  cache.set(key, made);
  return made;
}

// ── Blocks ─────────────────────────────────────────────────────────────

type BlockLook = Pick<BlockState, 'id' | 'piece' | 'shape' | 'material' | 'w' | 'h' | 'hp' | 'maxHp' | 'burn'>;

function shapePath(ctx: CanvasRenderingContext2D, block: Pick<BlockLook, 'shape' | 'w' | 'h'>): void {
  const { w, h } = block;
  ctx.beginPath();
  if (block.shape === 'tri') { ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(0, h / 2); ctx.closePath(); }
  else ctx.rect(-w / 2, -h / 2, w, h);
}

/** Does this block carry a torch? (Decorative; a third of walls and columns.) */
export const hasTorch = (block: Pick<BlockLook, 'id' | 'piece' | 'material'>): boolean =>
  (block.piece === 'wall' || block.piece === 'column') && block.id % 3 === 0;

/** A block in its own frame: centred on the origin and already rotated. */
export function drawBlock(ctx: CanvasRenderingContext2D, block: BlockLook, flash = 0, time = 0, lit = false): void {
  const { w, h } = block;
  const x = -w / 2;
  const y = -h / 2;
  ctx.save();
  shapePath(ctx, block);
  ctx.clip();
  if (block.material === 'glass') drawWindow(ctx, w, h, block.id, lit);
  else {
    const key: PatternKey = block.shape === 'tri'
      ? (block.material === 'wood' ? 'roofWood' : block.material === 'stone' ? 'roofStone' : 'roofSteel')
      : block.material === 'wood' && h > w * 1.4 ? 'woodV' : block.material;
    ctx.fillStyle = pattern(ctx, key);
    ctx.fillRect(x, y, w, h);
    const random = hash(block.id * 13 + 5);
    // Each block is a slightly different shade, and lit from above.
    ctx.fillStyle = `rgba(${random() < 0.5 ? '0,0,0' : '255,240,220'},${(random() * 0.09).toFixed(3)})`;
    ctx.fillRect(x, y, w, h);
    const shading = ctx.createLinearGradient(0, y + h, 0, y);
    shading.addColorStop(0, 'rgba(255,250,235,0.16)');
    shading.addColorStop(0.5, 'rgba(0,0,0,0)');
    shading.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = shading;
    ctx.fillRect(x, y, w, h);
    drawDetail(ctx, block, random);
  }
  const health = block.maxHp > 0 ? block.hp / block.maxHp : 1;
  if (health < 0.8) drawCracks(ctx, block.id, w, h, health);
  if (block.burn > 0) {
    const char = ctx.createLinearGradient(0, y, 0, y + h);
    char.addColorStop(0, 'rgba(20,8,0,0.25)');
    char.addColorStop(1, 'rgba(20,8,0,0.6)');
    ctx.fillStyle = char;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = `rgba(255,${120 + Math.round(Math.sin(time * 9 + block.id) * 40)},40,0.35)`;
    const random = hash(block.id);
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x + random() * w, y + random() * h, 0.05 + random() * 0.05, 0, Math.PI * 2); ctx.fill(); }
  }
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.7, flash)})`;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
  // Outline and bevel drawn outside the clip so edges stay crisp.
  shapePath(ctx, block);
  ctx.strokeStyle = block.material === 'glass' ? 'rgba(30,40,55,0.9)' : 'rgba(20,12,6,0.85)';
  ctx.lineWidth = 0.05;
  ctx.stroke();
  if (block.shape === 'box' && block.material !== 'glass') {
    ctx.lineWidth = 0.06;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.moveTo(x + 0.05, y + 0.05); ctx.lineTo(x + 0.05, y + h - 0.05); ctx.lineTo(x + w - 0.05, y + h - 0.05); ctx.stroke();
  }
  if (hasTorch(block)) drawTorch(ctx, block, time);
}

/** Piece-specific craftsmanship: arrow slits, iron bands, cap stones, moss and rust. */
function drawDetail(ctx: CanvasRenderingContext2D, block: BlockLook, random: () => number): void {
  const { w, h, piece, material } = block;
  const x = -w / 2;
  const y = -h / 2;
  const metal = material === 'steel' ? '#3a444f' : '#2c2a28';
  if (piece === 'wall') {
    // Arrow slit with a lit inner edge.
    ctx.fillStyle = 'rgba(12,10,8,0.92)';
    ctx.beginPath(); ctx.roundRect(-w * 0.07, -h * 0.22, w * 0.14, h * 0.42, w * 0.07); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(w * 0.07, -h * 0.2, 0.03, h * 0.38);
  }
  if (piece === 'post' || piece === 'column') {
    ctx.fillStyle = material === 'wood' ? 'rgba(40,40,44,0.85)' : 'rgba(0,0,0,0.22)';
    for (const band of [y + h * 0.08, y + h * 0.88]) ctx.fillRect(x, band, w, Math.min(0.14, h * 0.05));
    if (material === 'stone') { ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(x - 0.02, y + h - 0.16, w + 0.04, 0.16); }
  }
  if (piece === 'beam' || piece === 'span') {
    ctx.fillStyle = metal;
    for (const end of [x + 0.25, x + w - 0.25]) {
      ctx.fillRect(end - 0.08, y, 0.16, h);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.arc(end, 0, 0.04, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = metal;
    }
  }
  if (piece === 'block' && material !== 'wood') {
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x, y + h - 0.12, w, 0.12);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x, y + h - 0.16, w, 0.04);
  }
  if (material === 'stone') {
    // Moss creeping up from the bottom.
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = `rgba(${70 + Math.round(random() * 30)},${110 + Math.round(random() * 30)},50,0.5)`;
      ctx.beginPath(); ctx.ellipse(x + random() * w, y + random() * Math.min(0.5, h * 0.3), 0.1 + random() * 0.15, 0.05 + random() * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (material === 'steel') {
    // Rust runs down from the rivets.
    for (let i = 0; i < 3; i++) {
      const rx = x + random() * w;
      const top = y + h * (0.4 + random() * 0.5);
      const streak = ctx.createLinearGradient(0, top, 0, top - 0.6);
      streak.addColorStop(0, 'rgba(140,70,30,0.45)');
      streak.addColorStop(1, 'rgba(140,70,30,0)');
      ctx.fillStyle = streak;
      ctx.fillRect(rx, top - 0.6, 0.06 + random() * 0.05, 0.6);
    }
  }
}

function drawWindow(ctx: CanvasRenderingContext2D, w: number, h: number, id: number, lit: boolean): void {
  const x = -w / 2;
  const y = -h / 2;
  ctx.fillStyle = '#3b2a1a';
  ctx.fillRect(x, y, w, h);
  const inset = 0.12;
  const inner = { x: x + inset, y: y + inset, w: w - inset * 2, h: h - inset * 2 };
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(inner.x, inner.y);
  ctx.lineTo(inner.x + inner.w, inner.y);
  ctx.lineTo(inner.x + inner.w, inner.y + inner.h * 0.6);
  ctx.arc(0, inner.y + inner.h * 0.6, inner.w / 2, 0, Math.PI);
  ctx.closePath();
  ctx.clip();
  const colors = lit ? ['#ffd27a', '#ffb347', '#ffe9a8', '#ff9b5c'] : ['#5aa2e8', '#c2384a', '#f2c94c', '#3fae78'];
  const random = hash(id * 7);
  const pane = inner.w / 3;
  for (let cx = 0; cx < 3; cx++) for (let cy = 0; cy < 4; cy++) {
    ctx.fillStyle = colors[Math.floor(random() * colors.length)];
    ctx.globalAlpha = lit ? 0.95 : 0.75;
    ctx.fillRect(inner.x + cx * pane, inner.y + cy * (inner.h / 3), pane, inner.h / 3);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#1d1a17';
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(0, inner.y); ctx.lineTo(0, inner.y + inner.h);
  ctx.moveTo(inner.x, inner.y + inner.h * 0.45); ctx.lineTo(inner.x + inner.w, inner.y + inner.h * 0.45);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.moveTo(inner.x + 0.08, inner.y + 0.1); ctx.lineTo(inner.x + 0.2, inner.y + 0.1); ctx.lineTo(inner.x + inner.w * 0.6, inner.y + inner.h); ctx.lineTo(inner.x + inner.w * 0.45, inner.y + inner.h); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawTorch(ctx: CanvasRenderingContext2D, block: Pick<BlockLook, 'w' | 'h' | 'id'>, time: number): void {
  const tx = 0;
  const ty = block.h * 0.18;
  ctx.fillStyle = '#2b2522';
  ctx.fillRect(tx - 0.05, ty - 0.35, 0.1, 0.35);
  ctx.fillStyle = '#4a3a2c';
  ctx.beginPath(); ctx.moveTo(tx - 0.1, ty); ctx.lineTo(tx + 0.1, ty); ctx.lineTo(tx + 0.06, ty - 0.12); ctx.lineTo(tx - 0.06, ty - 0.12); ctx.closePath(); ctx.fill();
  const flicker = 0.85 + Math.sin(time * 13 + block.id) * 0.1 + Math.sin(time * 7.3 + block.id * 2) * 0.05;
  ctx.fillStyle = '#ff8c2a';
  ctx.beginPath(); ctx.ellipse(tx, ty + 0.16 * flicker, 0.1, 0.2 * flicker, Math.sin(time * 5 + block.id) * 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe9a0';
  ctx.beginPath(); ctx.ellipse(tx, ty + 0.1, 0.05, 0.1 * flicker, 0, 0, Math.PI * 2); ctx.fill();
}

function drawCracks(ctx: CanvasRenderingContext2D, id: number, w: number, h: number, health: number): void {
  const random = hash(id * 97 + 13);
  const count = health < 0.3 ? 6 : health < 0.55 ? 3 : 1;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    let px = (random() - 0.5) * w;
    let py = (random() < 0.5 ? -1 : 1) * h / 2;
    const path: [number, number][] = [[px, py]];
    const steps = 3 + Math.floor(random() * 3);
    for (let s = 0; s < steps; s++) {
      px = Math.max(-w / 2, Math.min(w / 2, px + (random() - 0.5) * Math.min(w, 0.9)));
      py = py * 0.55 + (random() - 0.5) * h * 0.3;
      path.push([px, py]);
    }
    for (const [color, width, dy] of [['rgba(255,255,255,0.22)', 0.03, -0.025], ['rgba(15,8,4,0.85)', 0.035, 0]] as const) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      path.forEach(([cx, cy], index) => (index ? ctx.lineTo(cx, cy + dy) : ctx.moveTo(cx, cy + dy)));
      ctx.stroke();
    }
  }
}

// ── Characters ─────────────────────────────────────────────────────────

export type Mood = 'calm' | 'scared' | 'hurt';

/**
 * A royal standing at the origin: feet at −r, head above. `look` is −1 or 1. Knights carry
 * a sword and a heater shield in their colours; the King wears a crown, beard and cape.
 */
export function drawRoyal(ctx: CanvasRenderingContext2D, royal: Pick<RoyalState, 'role' | 'side' | 'r' | 'hp' | 'maxHp' | 'id'>, time: number, look: number, flash = 0, mood: Mood = 'calm'): void {
  const r = royal.r;
  const colors = SIDE_COLORS[royal.side];
  const king = royal.role === 'king';
  const bob = Math.sin(time * 2.2 + royal.id) * 0.025 + (mood === 'scared' ? Math.sin(time * 40) * 0.015 : 0);
  ctx.save();
  ctx.scale(look, 1);
  ctx.translate(0, bob);
  const feet = -r;
  const hip = feet + r * 0.62;
  const shoulder = hip + r * 0.72;
  const headY = shoulder + r * 0.42;
  const head = r * 0.4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (king) {
    // Royal cape with ermine trim, flowing a little.
    const sway = Math.sin(time * 1.6 + royal.id) * 0.05;
    ctx.fillStyle = colors.dark;
    ctx.beginPath();
    ctx.moveTo(-r * 0.42, shoulder);
    ctx.quadraticCurveTo(-r * 0.95 - sway, hip, -r * 0.8 - sway, feet + 0.05);
    ctx.lineTo(r * 0.15, feet + 0.05);
    ctx.lineTo(r * 0.3, shoulder);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f4f1ea';
    ctx.fillRect(-r * 0.82 - sway, feet + 0.03, r * 0.98, 0.09);
    ctx.fillStyle = '#1f1f1f';
    for (let i = 0; i < 4; i++) ctx.fillRect(-r * 0.75 - sway + i * r * 0.24, feet + 0.05, 0.03, 0.05);
  }
  // Legs and boots.
  ctx.fillStyle = '#3b3a44';
  ctx.fillRect(-r * 0.3, feet + 0.08, r * 0.22, hip - feet);
  ctx.fillRect(r * 0.06, feet + 0.08, r * 0.22, hip - feet);
  ctx.fillStyle = '#4a2f1d';
  ctx.beginPath(); ctx.roundRect(-r * 0.36, feet, r * 0.34, 0.12, 0.04); ctx.roundRect(r * 0.02, feet, r * 0.36, 0.12, 0.04); ctx.fill();
  // Body: mail shirt under a tabard in the team colour.
  ctx.fillStyle = king ? '#d9b44a' : '#8d97a3';
  ctx.beginPath(); ctx.roundRect(-r * 0.4, hip - 0.04, r * 0.8, shoulder - hip + 0.06, 0.12); ctx.fill();
  ctx.fillStyle = colors.main;
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, shoulder);
  ctx.lineTo(r * 0.32, shoulder);
  ctx.lineTo(r * 0.36, hip - 0.06);
  ctx.lineTo(0, hip - 0.16);
  ctx.lineTo(-r * 0.36, hip - 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = colors.trim;
  ctx.lineWidth = 0.03;
  ctx.stroke();
  // Emblem on the chest.
  ctx.fillStyle = colors.trim;
  ctx.beginPath(); ctx.moveTo(-0.07, shoulder - 0.1); ctx.lineTo(0.07, shoulder - 0.1); ctx.lineTo(0.07, shoulder - 0.2); ctx.lineTo(0, shoulder - 0.27); ctx.lineTo(-0.07, shoulder - 0.2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3a2416';
  ctx.fillRect(-r * 0.4, hip + 0.02, r * 0.8, 0.07);
  ctx.fillStyle = '#e5c158';
  ctx.fillRect(-0.04, hip + 0.015, 0.08, 0.08);
  // Back arm holds a shield (knights) or rests (king).
  const raise = mood === 'scared' ? 0.15 : 0;
  if (!king) {
    ctx.save();
    ctx.translate(-r * 0.42, shoulder - r * 0.42 + raise);
    ctx.fillStyle = colors.main;
    ctx.strokeStyle = '#d7dde3';
    ctx.lineWidth = 0.05;
    ctx.beginPath(); ctx.moveTo(-0.2, 0.22); ctx.lineTo(0.2, 0.22); ctx.lineTo(0.2, -0.02); ctx.quadraticCurveTo(0.18, -0.22, 0, -0.32); ctx.quadraticCurveTo(-0.18, -0.22, -0.2, -0.02); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = colors.trim;
    ctx.fillRect(-0.03, -0.24, 0.06, 0.42);
    ctx.fillRect(-0.16, 0.04, 0.32, 0.06);
    ctx.restore();
  }
  // Front arm: sword or sceptre.
  ctx.strokeStyle = king ? '#d9b44a' : '#8d97a3';
  ctx.lineWidth = 0.13;
  const handX = r * 0.55;
  const handY = shoulder - r * 0.45 + raise;
  ctx.beginPath(); ctx.moveTo(r * 0.3, shoulder - 0.05); ctx.lineTo(handX, handY); ctx.stroke();
  ctx.fillStyle = '#f0c9a0';
  ctx.beginPath(); ctx.arc(handX, handY, 0.07, 0, Math.PI * 2); ctx.fill();
  if (king) {
    ctx.strokeStyle = '#c9a033';
    ctx.lineWidth = 0.05;
    ctx.beginPath(); ctx.moveTo(handX, handY - 0.25); ctx.lineTo(handX, handY + 0.5); ctx.stroke();
    ctx.fillStyle = '#e23b5a';
    ctx.beginPath(); ctx.arc(handX, handY + 0.55, 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd86b';
    ctx.beginPath(); ctx.arc(handX - 0.02, handY + 0.57, 0.025, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate(mood === 'scared' ? -0.2 : 0.45 + Math.sin(time * 1.3 + royal.id) * 0.05);
    ctx.fillStyle = '#e8edf2';
    ctx.beginPath(); ctx.moveTo(-0.035, 0.08); ctx.lineTo(0.035, 0.08); ctx.lineTo(0.02, 0.62); ctx.lineTo(0, 0.68); ctx.lineTo(-0.02, 0.62); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c9a033';
    ctx.fillRect(-0.11, 0.05, 0.22, 0.045);
    ctx.fillStyle = '#4a2f1d';
    ctx.fillRect(-0.025, -0.08, 0.05, 0.13);
    ctx.restore();
  }
  // Head.
  ctx.fillStyle = '#f0c9a0';
  ctx.beginPath(); ctx.arc(0, headY, head, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(120,70,40,0.6)';
  ctx.lineWidth = 0.025;
  ctx.stroke();
  ctx.fillStyle = 'rgba(230,120,110,0.35)';
  ctx.beginPath(); ctx.arc(head * 0.45, headY - head * 0.15, head * 0.2, 0, Math.PI * 2); ctx.fill();
  if (king) {
    ctx.fillStyle = '#e9e4da';
    ctx.beginPath();
    ctx.moveTo(-head * 0.75, headY - head * 0.05);
    ctx.quadraticCurveTo(-head * 0.6, headY - head * 1.25, head * 0.15, headY - head * 1.35);
    ctx.quadraticCurveTo(head * 0.9, headY - head * 0.9, head * 0.85, headY - head * 0.1);
    ctx.quadraticCurveTo(head * 0.3, headY - head * 0.55, -head * 0.75, headY - head * 0.05);
    ctx.fill();
  }
  // Eyes: wide when scared, squeezed when hurt, blinking now and then.
  const blink = Math.sin(time * 1.7 + royal.id * 3) > 0.985;
  ctx.fillStyle = '#1f2937';
  const eyeY = headY + head * 0.12;
  for (const ex of [head * 0.05, head * 0.5]) {
    if (mood === 'hurt' || blink) { ctx.lineWidth = 0.025; ctx.strokeStyle = '#1f2937'; ctx.beginPath(); ctx.moveTo(ex - 0.05, eyeY + (mood === 'hurt' ? 0.03 : 0)); ctx.lineTo(ex + 0.05, eyeY); ctx.stroke(); continue; }
    const size = mood === 'scared' ? 0.06 : 0.042;
    ctx.fillStyle = '#ffffff';
    if (mood === 'scared') { ctx.beginPath(); ctx.arc(ex, eyeY, size, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#1f2937';
    ctx.beginPath(); ctx.arc(ex + 0.015, eyeY, mood === 'scared' ? 0.03 : size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#5b3a24';
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  if (mood === 'calm' && royal.hp > royal.maxHp * 0.5) ctx.arc(head * 0.3, headY - head * 0.35, head * 0.22, 1.15 * Math.PI, 1.85 * Math.PI);
  else if (mood === 'scared') ctx.ellipse(head * 0.3, headY - head * 0.42, 0.04, 0.06, 0, 0, Math.PI * 2);
  else ctx.arc(head * 0.3, headY - head * 0.6, head * 0.2, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  if (mood === 'scared') {
    ctx.fillStyle = 'rgba(150,200,255,0.9)';
    ctx.beginPath(); ctx.moveTo(-head * 0.6, headY + head * 0.4); ctx.quadraticCurveTo(-head * 0.75, headY + head * 0.1, -head * 0.6, headY); ctx.quadraticCurveTo(-head * 0.45, headY + head * 0.1, -head * 0.6, headY + head * 0.4); ctx.fill();
  }
  if (king) {
    const base = headY + head * 0.62;
    ctx.fillStyle = '#f5c542';
    ctx.strokeStyle = '#9a6b0c';
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    ctx.moveTo(-head * 0.85, base);
    ctx.lineTo(-head * 0.95, base + head * 0.8);
    ctx.lineTo(-head * 0.45, base + head * 0.42);
    ctx.lineTo(0, base + head * 1.0);
    ctx.lineTo(head * 0.45, base + head * 0.42);
    ctx.lineTo(head * 0.95, base + head * 0.8);
    ctx.lineTo(head * 0.85, base);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    for (const [gx, color] of [[-head * 0.5, '#2f9dfa'], [0, '#e23b5a'], [head * 0.5, '#3fbf6f']] as const) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(gx, base + head * 0.22, 0.04, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    // Great helm with a visor slit and a plume.
    ctx.fillStyle = '#b4bec9';
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(-head * 1.02, headY - head * 0.15);
    ctx.lineTo(-head * 1.02, headY + head * 0.55);
    ctx.quadraticCurveTo(0, headY + head * 1.45, head * 1.02, headY + head * 0.55);
    ctx.lineTo(head * 1.02, headY + head * 0.25);
    ctx.lineTo(head * 0.2, headY + head * 0.25);
    ctx.lineTo(head * 0.2, headY - head * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(-head * 0.85, headY + head * 0.3, 0.04, head * 0.5);
    const sway = Math.sin(time * 3 + royal.id) * 0.08;
    ctx.fillStyle = colors.light;
    ctx.beginPath();
    ctx.moveTo(-head * 0.1, headY + head * 1.05);
    ctx.quadraticCurveTo(-head * 1.2, headY + head * 1.9 + sway, -head * 1.9, headY + head * 0.9 + sway);
    ctx.quadraticCurveTo(-head * 1.0, headY + head * 1.2, -head * 0.3, headY + head * 0.85);
    ctx.closePath();
    ctx.fill();
  }
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.6, flash)})`;
    ctx.beginPath(); ctx.ellipse(0, (feet + headY + head) / 2, r * 0.75, (headY + head - feet) / 2, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Health bar over a royal, in world units. */
export function drawHealthBar(ctx: CanvasRenderingContext2D, x: number, y: number, fraction: number): void {
  const w = 1.3;
  const h = 0.16;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath(); ctx.roundRect(x - w / 2 - 0.05, y - 0.05, w + 0.1, h + 0.1, 0.08); ctx.fill();
  ctx.fillStyle = fraction > 0.5 ? '#4ade80' : fraction > 0.25 ? '#facc15' : '#f87171';
  ctx.beginPath(); ctx.roundRect(x - w / 2, y, w * Math.max(0, fraction), h, 0.06); ctx.fill();
}

// ── Siege engine ───────────────────────────────────────────────────────

/**
 * Trebuchet at ground level, facing +x (mirrored for side 1). `arm` is the throwing arm's
 * angle in radians; `crew` animates the crewman (0 idle, 1 pulling the release).
 */
export function drawTrebuchet(ctx: CanvasRenderingContext2D, side: Side, arm: number, loaded: boolean, ammo: AmmoId, crew: number, time: number): void {
  ctx.save();
  if (side === 1) ctx.scale(-1, 1);
  const pivotY = 2.7;
  const wood = '#7a4f28';
  const woodDark = '#553419';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Back frame (darker, for depth).
  ctx.strokeStyle = woodDark;
  ctx.lineWidth = 0.18;
  ctx.beginPath(); ctx.moveTo(-1.25, 0.8); ctx.lineTo(0.1, pivotY + 0.05); ctx.lineTo(1.25, 0.8); ctx.stroke();
  // Base with chocked wheels.
  ctx.fillStyle = '#5b3a1e';
  ctx.beginPath(); ctx.roundRect(-2.2, 0.45, 4.4, 0.36, 0.06); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(-2.15, 0.72, 4.3, 0.06);
  for (const wx of [-1.55, 1.55]) {
    ctx.fillStyle = '#3f2814';
    ctx.beginPath(); ctx.arc(wx, 0.48, 0.47, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#6d6f73';
    ctx.lineWidth = 0.07;
    ctx.stroke();
    ctx.strokeStyle = '#a07a4a';
    ctx.lineWidth = 0.05;
    for (let spoke = 0; spoke < 6; spoke++) {
      const a = (spoke / 6) * Math.PI;
      ctx.beginPath(); ctx.moveTo(wx + Math.cos(a) * 0.4, 0.48 + Math.sin(a) * 0.4); ctx.lineTo(wx - Math.cos(a) * 0.4, 0.48 - Math.sin(a) * 0.4); ctx.stroke();
    }
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath(); ctx.arc(wx, 0.48, 0.09, 0, Math.PI * 2); ctx.fill();
  }
  // Front A-frame and braces.
  ctx.strokeStyle = wood;
  ctx.lineWidth = 0.22;
  ctx.beginPath();
  ctx.moveTo(-1.45, 0.78); ctx.lineTo(0, pivotY); ctx.lineTo(1.45, 0.78);
  ctx.moveTo(-0.85, 1.55); ctx.lineTo(0.85, 1.55);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 0.05;
  ctx.beginPath(); ctx.moveTo(-1.4, 0.72); ctx.lineTo(0.02, pivotY - 0.08); ctx.stroke();
  // Winch drum with rope.
  ctx.fillStyle = '#6b4423';
  ctx.beginPath(); ctx.arc(-0.9, 1.0, 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d6c7a1';
  ctx.lineWidth = 0.03;
  for (let coil = -0.15; coil <= 0.15; coil += 0.06) { ctx.beginPath(); ctx.moveTo(-0.9 - 0.2, 1.0 + coil); ctx.lineTo(-0.9 + 0.2, 1.0 + coil); ctx.stroke(); }
  // Throwing arm: the long end carries the sling, the short end a hanging counterweight.
  const long = 3.2;
  const short = 1.1;
  const tipX = Math.cos(arm) * long;
  const tipY = pivotY + Math.sin(arm) * long;
  const backX = -Math.cos(arm) * short;
  const backY = pivotY - Math.sin(arm) * short;
  if (loaded) {
    ctx.strokeStyle = '#d6c7a1';
    ctx.lineWidth = 0.025;
    ctx.beginPath(); ctx.moveTo(-0.9, 1.0); ctx.lineTo(tipX * 0.55, pivotY + Math.sin(arm) * long * 0.55); ctx.stroke();
  }
  ctx.strokeStyle = '#8b5a2b';
  ctx.lineWidth = 0.2;
  ctx.beginPath(); ctx.moveTo(backX, backY); ctx.lineTo(tipX, tipY); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 0.05;
  ctx.beginPath(); ctx.moveTo(backX, backY + 0.06); ctx.lineTo(tipX, tipY + 0.06); ctx.stroke();
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 0.22;
  for (const t of [0.25, 0.7]) { const bx = backX + (tipX - backX) * t; const by = backY + (tipY - backY) * t; ctx.beginPath(); ctx.moveTo(bx - 0.03, by); ctx.lineTo(bx + 0.03, by); ctx.stroke(); }
  // The counterweight hangs straight down from its hinge.
  ctx.strokeStyle = '#2b2b2b';
  ctx.lineWidth = 0.05;
  ctx.beginPath(); ctx.moveTo(backX, backY); ctx.lineTo(backX, backY - 0.35); ctx.stroke();
  ctx.fillStyle = '#5f6670';
  ctx.beginPath(); ctx.roundRect(backX - 0.45, backY - 1.15, 0.9, 0.8, 0.06); ctx.fill();
  ctx.strokeStyle = '#2f343a';
  ctx.lineWidth = 0.05;
  ctx.stroke();
  ctx.strokeStyle = '#3a3f45';
  for (const band of [-0.55, -0.95]) { ctx.beginPath(); ctx.moveTo(backX - 0.45, backY + band); ctx.lineTo(backX + 0.45, backY + band); ctx.stroke(); }
  ctx.fillStyle = '#d4a017';
  ctx.beginPath(); ctx.arc(0, pivotY, 0.13, 0, Math.PI * 2); ctx.fill();
  // Sling: two ropes to a leather pouch.
  const pouchX = loaded ? Math.min(tipX, -0.6) - 0.3 : tipX + Math.cos(arm + 0.9) * 0.9;
  const pouchY = loaded ? 0.95 : tipY + Math.sin(arm + 0.9) * 0.9;
  ctx.strokeStyle = '#d6c7a1';
  ctx.lineWidth = 0.03;
  ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(pouchX - 0.15, pouchY); ctx.moveTo(tipX, tipY); ctx.lineTo(pouchX + 0.15, pouchY); ctx.stroke();
  ctx.fillStyle = '#6b3f1f';
  ctx.beginPath(); ctx.ellipse(pouchX, pouchY - 0.05, 0.28, 0.12, 0, 0, Math.PI); ctx.fill();
  if (loaded) {
    ctx.save();
    ctx.translate(pouchX, pouchY + (ammo === 'titan' ? 0.45 : 0.25));
    drawProjectile(ctx, ammo, ammo === 'titan' ? 0.6 : 0.34, 0, time);
    ctx.restore();
  }
  drawCrewman(ctx, side, crew, time);
  ctx.restore();
}

/** The crewman who pulls the release. */
function drawCrewman(ctx: CanvasRenderingContext2D, side: Side, pull: number, time: number): void {
  const colors = SIDE_COLORS[side];
  ctx.save();
  ctx.translate(-2.55, 0);
  const lean = pull * 0.35;
  ctx.rotate(lean * 0.4);
  ctx.fillStyle = '#3b3a44';
  ctx.fillRect(-0.16, 0, 0.12, 0.42);
  ctx.fillRect(0.04, 0, 0.12, 0.42);
  ctx.fillStyle = colors.main;
  ctx.beginPath(); ctx.roundRect(-0.22, 0.4, 0.44, 0.5, 0.08); ctx.fill();
  ctx.fillStyle = '#3a2416';
  ctx.fillRect(-0.22, 0.48, 0.44, 0.05);
  ctx.strokeStyle = '#f0c9a0';
  ctx.lineWidth = 0.09;
  ctx.beginPath(); ctx.moveTo(0.1, 0.8); ctx.lineTo(0.42 + pull * 0.1, 0.62 - pull * 0.15); ctx.stroke();
  ctx.fillStyle = '#f0c9a0';
  ctx.beginPath(); ctx.arc(0, 1.08, 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7a5a33';
  ctx.beginPath(); ctx.ellipse(0, 1.2, 0.24, 0.08, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 1.22, 0.14, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#1f2937';
  ctx.beginPath(); ctx.arc(0.07, 1.1 + Math.sin(time * 1.3) * 0.005, 0.025, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#4a2f1d';
  ctx.lineWidth = 0.06;
  ctx.beginPath(); ctx.moveTo(-2.1, 0.75); ctx.lineTo(-2.1 + 0.3 - pull * 0.15, 0.62 + pull * 0.1); ctx.stroke();
}

/** A projectile centred on the origin. */
export function drawProjectile(ctx: CanvasRenderingContext2D, ammo: AmmoId, r: number, angle: number, time: number): void {
  ctx.save();
  ctx.rotate(angle);
  const shade = (inner: string, outer: string) => {
    const gradient = ctx.createRadialGradient(-r * 0.35, r * 0.35, r * 0.1, 0, 0, r);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(1, outer);
    return gradient;
  };
  if (ammo === 'stone' || ammo === 'titan') {
    const random = hash(ammo === 'titan' ? 5 : 9);
    ctx.fillStyle = shade(ammo === 'titan' ? '#a8a29e' : '#b8b5ad', ammo === 'titan' ? '#44403c' : '#57534e');
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const rr = r * (0.85 + random() * 0.25);
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = r * 0.08;
    ctx.stroke();
    if (ammo === 'titan') {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (const [cx, cy, cr] of [[0.3, 0.2, 0.18], [-0.35, -0.25, 0.14], [0.1, -0.45, 0.1]]) { ctx.beginPath(); ctx.arc(cx * r, cy * r, cr * r, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = 'rgba(90,140,70,0.5)';
      ctx.beginPath(); ctx.ellipse(-0.2 * r, 0.5 * r, 0.25 * r, 0.12 * r, 0.4, 0, Math.PI * 2); ctx.fill();
    }
  } else if (ammo === 'buster') {
    ctx.fillStyle = shade('#e5e7eb', '#4b5563');
    ctx.beginPath();
    ctx.moveTo(r * 2.2, 0); ctx.lineTo(-r * 1.1, r * 0.75); ctx.lineTo(-r * 0.6, 0); ctx.lineTo(-r * 1.1, -r * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = r * 0.1;
    ctx.stroke();
  } else if (ammo === 'fire') {
    ctx.fillStyle = shade('#d97745', '#7c2d12');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(60,20,5,0.6)';
    ctx.lineWidth = r * 0.1;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.7, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-r * 0.35, r * 0.75, r * 0.7, r * 0.35);
    const flicker = 0.8 + Math.sin(time * 30) * 0.2;
    ctx.fillStyle = 'rgba(253,186,116,0.9)';
    ctx.beginPath(); ctx.ellipse(0, r * 1.25, r * 0.35 * flicker, r * 0.6 * flicker, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    const colors: Record<string, [string, string]> = { iron: ['#6b7280', '#0b0f14'], bomb: ['#4b5563', '#111827'], cluster: ['#fb923c', '#7c2d12'], barrage: ['#6b7280', '#0b0f14'] };
    const [inner, outer] = colors[ammo] ?? colors.iron;
    ctx.fillStyle = shade(inner, outer);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(-r * 0.35, r * 0.35, r * 0.2, 0, Math.PI * 2); ctx.fill();
    if (ammo === 'bomb' || ammo === 'cluster') {
      ctx.strokeStyle = '#d6c7a1';
      ctx.lineWidth = r * 0.12;
      ctx.beginPath(); ctx.moveTo(0, r); ctx.quadraticCurveTo(r * 0.4, r * 1.4, r * 0.2, r * 1.6); ctx.stroke();
      ctx.fillStyle = Math.sin(time * 40) > 0 ? '#fde047' : '#fb923c';
      ctx.beginPath(); ctx.arc(r * 0.2, r * 1.65, r * 0.18, 0, Math.PI * 2); ctx.fill();
    }
    if (ammo === 'cluster') {
      ctx.strokeStyle = 'rgba(254,215,170,0.9)';
      ctx.lineWidth = r * 0.14;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.restore();
}

/** Banner on a pole behind each fortress; it streams with the wind. */
export function drawBanner(ctx: CanvasRenderingContext2D, side: Side, x: number, wind: number, time: number, groundY = PLATEAU_Y): void {
  const top = groundY + 9;
  ctx.strokeStyle = '#3f2a14';
  ctx.lineWidth = 0.14;
  ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x, top); ctx.stroke();
  ctx.fillStyle = '#d4a017';
  ctx.beginPath(); ctx.arc(x, top + 0.1, 0.16, 0, Math.PI * 2); ctx.fill();
  const direction = wind === 0 ? (side === 0 ? 1 : -1) : Math.sign(wind);
  const length = 2.4 + Math.min(1.2, Math.abs(wind) * 0.4);
  const colors = SIDE_COLORS[side];
  const speed = 4 + Math.abs(wind) * 2;
  ctx.fillStyle = colors.main;
  ctx.beginPath();
  ctx.moveTo(x, top);
  const segments = 10;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    ctx.lineTo(x + direction * length * t, top - 0.1 * t + Math.sin(time * speed - t * 5) * 0.18 * t);
  }
  for (let i = segments; i >= 0; i--) {
    const t = i / segments;
    ctx.lineTo(x + direction * length * t, top - 1.3 + 0.25 * t + Math.sin(time * speed - t * 5) * 0.18 * t);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = colors.dark;
  ctx.lineWidth = 0.05;
  ctx.stroke();
  ctx.fillStyle = colors.trim;
  const cx = x + direction * length * 0.42;
  const cy = top - 0.62 + Math.sin(time * speed - 2) * 0.08;
  ctx.beginPath(); ctx.moveTo(cx - 0.25, cy + 0.25); ctx.lineTo(cx + 0.25, cy + 0.25); ctx.lineTo(cx + 0.25, cy); ctx.lineTo(cx, cy - 0.3); ctx.lineTo(cx - 0.25, cy); ctx.closePath(); ctx.fill();
}

/** Soft additive glow, for fire, torches, windows and blasts. */
export function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number): void {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color.replace('ALPHA', alpha.toFixed(3)));
  gradient.addColorStop(1, color.replace('ALPHA', '0'));
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

export const MATERIAL_SOUND: Record<MaterialId, 'wood' | 'stone' | 'metal' | 'glass'> = { wood: 'wood', stone: 'stone', steel: 'metal', glass: 'glass' };
