import { PLATEAU_Y, type AmmoId, type MaterialId } from '@/lib/fortress/content';
import type { BlockState, RoyalState, Side } from '@/lib/fortress/world';

/** Hand-drawn look for the battlefield. Everything here draws in world metres (y up, flipped by the camera). */
export const SIDE_COLORS: Record<Side, { main: string; dark: string; light: string }> = {
  0: { main: '#3b82f6', dark: '#1e40af', light: '#93c5fd' },
  1: { main: '#ef4444', dark: '#991b1b', light: '#fca5a5' },
};

export type Theme = 'day' | 'dusk' | 'storm';
export interface Palette { skyTop: string; skyBottom: string; sun: string; glow: string; far: string; mid: string; near: string; cloud: string; water: string; waterDeep: string; grass: string; grassLight: string; dirt: string; dirtDeep: string; haze: string }
export const PALETTES: Record<Theme, Palette> = {
  day: { skyTop: '#2f6fc4', skyBottom: '#bfe3ff', sun: '#fff7cc', glow: 'rgba(255,240,180,0.55)', far: '#8fa9c9', mid: '#6d8fae', near: '#3f6b4c', cloud: 'rgba(255,255,255,0.92)', water: '#3b8fd0', waterDeep: '#1e5d99', grass: '#4f9a3a', grassLight: '#86c95a', dirt: '#7a5232', dirtDeep: '#3d2817', haze: 'rgba(220,236,255,0.35)' },
  dusk: { skyTop: '#2b2d6b', skyBottom: '#f7a35c', sun: '#ffd27a', glow: 'rgba(255,170,90,0.55)', far: '#7a5f8f', mid: '#5b4673', near: '#2f4a3a', cloud: 'rgba(255,214,190,0.85)', water: '#4b6fae', waterDeep: '#263f78', grass: '#477f36', grassLight: '#7fb455', dirt: '#6b4630', dirtDeep: '#33200f', haze: 'rgba(255,190,150,0.25)' },
  storm: { skyTop: '#273241', skyBottom: '#8a99a8', sun: '#e6edf3', glow: 'rgba(220,230,240,0.25)', far: '#5d6b7a', mid: '#4a5866', near: '#2c4237', cloud: 'rgba(200,208,218,0.9)', water: '#3c6c86', waterDeep: '#1f4357', grass: '#3f7a35', grassLight: '#6aa04f', dirt: '#5d4330', dirtDeep: '#2c1e12', haze: 'rgba(190,205,220,0.3)' },
};

/** Deterministic noise so scenery and cracks look the same every frame. */
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

const PATTERN_PX = 64; // pattern pixels per metre
type PatternKey = MaterialId | 'woodV';
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
    const shade = 0.85 + random() * 0.3;
    g.fillStyle = `rgb(${Math.round(160 * shade)},${Math.round(108 * shade)},${Math.round(60 * shade)})`;
    g.fillRect(0, row * plank, size, plank);
    g.strokeStyle = 'rgba(70,40,15,0.35)';
    g.lineWidth = 1;
    for (let line = 0; line < 4; line++) {
      const y = row * plank + 2 + random() * (plank - 4);
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= size; x += 16) g.lineTo(x, y + Math.sin(x * 0.08 + random() * 6) * 1.2);
      g.stroke();
    }
    if (random() < 0.5) {
      g.fillStyle = 'rgba(80,45,18,0.55)';
      g.beginPath();
      g.ellipse(random() * size, row * plank + plank / 2, 4, 2.2, 0, 0, Math.PI * 2);
      g.fill();
    }
    const seam = random() * size;
    g.fillStyle = 'rgba(50,28,10,0.7)';
    g.fillRect(seam, row * plank, 1.5, plank);
    g.fillRect(0, row * plank + plank - 1.5, size, 1.5);
  }
  return canvas;
}

function stoneTexture(): HTMLCanvasElement {
  const size = PATTERN_PX * 2;
  const canvas = makeCanvas(size, size);
  const g = canvas.getContext('2d')!;
  const random = hash(3);
  g.fillStyle = '#5f5d58';
  g.fillRect(0, 0, size, size);
  const bh = PATTERN_PX * 0.32;
  const bw = PATTERN_PX * 0.64;
  for (let row = 0; row * bh < size; row++) {
    const offset = row % 2 ? bw / 2 : 0;
    for (let col = -1; col * bw < size; col++) {
      const x = col * bw + offset;
      const shade = 0.8 + random() * 0.35;
      const gradient = g.createLinearGradient(x, row * bh, x, row * bh + bh);
      gradient.addColorStop(0, `rgb(${Math.round(176 * shade)},${Math.round(172 * shade)},${Math.round(160 * shade)})`);
      gradient.addColorStop(1, `rgb(${Math.round(136 * shade)},${Math.round(132 * shade)},${Math.round(122 * shade)})`);
      g.fillStyle = gradient;
      g.fillRect(x + 1.5, row * bh + 1.5, bw - 3, bh - 3);
      for (let speck = 0; speck < 6; speck++) {
        g.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
        g.fillRect(x + random() * bw, row * bh + random() * bh, 2, 2);
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
    gradient.addColorStop(0, '#b9c4cf');
    gradient.addColorStop(0.5, '#8695a4');
    gradient.addColorStop(1, '#6b7a89');
    g.fillStyle = gradient;
    g.fillRect(x, y, plate, plate);
    g.strokeStyle = '#4a5663';
    g.lineWidth = 2;
    g.strokeRect(x + 1, y + 1, plate - 2, plate - 2);
    for (const [rx, ry] of [[6, 6], [plate - 6, 6], [6, plate - 6], [plate - 6, plate - 6]]) {
      g.fillStyle = '#3d4853';
      g.beginPath(); g.arc(x + rx, y + ry, 2.6, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.beginPath(); g.arc(x + rx - 0.8, y + ry - 0.8, 1, 0, Math.PI * 2); g.fill();
    }
  }
  return canvas;
}

function texture(key: PatternKey): HTMLCanvasElement | null {
  if (key === 'glass') return null;
  let canvas = patternCache.get(key);
  if (!canvas) {
    canvas = key === 'wood' ? woodTexture(false) : key === 'woodV' ? woodTexture(true) : key === 'stone' ? stoneTexture() : steelTexture();
    patternCache.set(key, canvas);
  }
  return canvas;
}

const contextPatterns = new WeakMap<CanvasRenderingContext2D, Map<PatternKey, CanvasPattern>>();
function pattern(ctx: CanvasRenderingContext2D, key: PatternKey): CanvasPattern | null {
  let cache = contextPatterns.get(ctx);
  if (!cache) { cache = new Map(); contextPatterns.set(ctx, cache); }
  const cached = cache.get(key);
  if (cached) return cached;
  const source = texture(key);
  if (!source) return null;
  const made = ctx.createPattern(source, 'repeat');
  if (!made) return null;
  made.setTransform(new DOMMatrix().scale(1 / PATTERN_PX, -1 / PATTERN_PX));
  cache.set(key, made);
  return made;
}

/** A block in its own frame: centred on the origin and already rotated. */
export function drawBlock(ctx: CanvasRenderingContext2D, block: Pick<BlockState, 'id' | 'material' | 'w' | 'h' | 'hp' | 'maxHp' | 'burn'>, flash = 0): void {
  const { w, h } = block;
  const x = -w / 2;
  const y = -h / 2;
  if (block.material === 'glass') {
    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, 'rgba(190,232,255,0.55)');
    gradient.addColorStop(1, 'rgba(120,180,230,0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y + h * 0.85); ctx.lineTo(x + w * 0.55, y + h * 0.2);
    ctx.moveTo(x + w * 0.45, y + h * 0.9); ctx.lineTo(x + w * 0.75, y + h * 0.4);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(40,80,120,0.8)';
    ctx.lineWidth = 0.06;
    ctx.strokeRect(x, y, w, h);
  } else {
    const key: PatternKey = block.material === 'wood' && h > w * 1.4 ? 'woodV' : block.material;
    ctx.fillStyle = pattern(ctx, key) ?? '#888';
    ctx.fillRect(x, y, w, h);
    // Bevel: light along the top and left, shadow along the bottom and right.
    ctx.lineWidth = 0.07;
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.moveTo(x + 0.04, y + 0.04); ctx.lineTo(x + 0.04, y + h - 0.04); ctx.lineTo(x + w - 0.04, y + h - 0.04); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.moveTo(x + w - 0.04, y + h - 0.04); ctx.lineTo(x + w - 0.04, y + 0.04); ctx.lineTo(x + 0.04, y + 0.04); ctx.stroke();
    ctx.strokeStyle = 'rgba(20,12,6,0.85)';
    ctx.lineWidth = 0.045;
    ctx.strokeRect(x, y, w, h);
  }
  const health = block.maxHp > 0 ? block.hp / block.maxHp : 1;
  if (health < 0.8) drawCracks(ctx, block.id, w, h, health);
  if (block.burn > 0) {
    ctx.fillStyle = 'rgba(30,10,0,0.35)';
    ctx.fillRect(x, y, w, h);
  }
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.7, flash)})`;
    ctx.fillRect(x, y, w, h);
  }
}

function drawCracks(ctx: CanvasRenderingContext2D, id: number, w: number, h: number, health: number): void {
  const random = hash(id * 97 + 13);
  const count = health < 0.3 ? 5 : health < 0.55 ? 3 : 1;
  ctx.strokeStyle = 'rgba(15,8,4,0.8)';
  ctx.lineWidth = 0.035;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    let px = (random() - 0.5) * w;
    let py = (random() < 0.5 ? -1 : 1) * h / 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    const steps = 3 + Math.floor(random() * 3);
    for (let s = 0; s < steps; s++) {
      px = Math.max(-w / 2, Math.min(w / 2, px + (random() - 0.5) * Math.min(w, 0.9)));
      py = py * 0.55 + (random() - 0.5) * h * 0.3;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
}

/** A royal standing upright at the origin. `look` is −1 or 1. */
export function drawRoyal(ctx: CanvasRenderingContext2D, royal: Pick<RoyalState, 'role' | 'side' | 'r' | 'hp' | 'maxHp'>, time: number, look: number, flash = 0): void {
  const r = royal.r;
  const colors = SIDE_COLORS[royal.side];
  // Tunic and body.
  ctx.fillStyle = colors.main;
  ctx.beginPath();
  ctx.moveTo(-r * 0.85, -r);
  ctx.quadraticCurveTo(-r * 1.05, r * 0.1, -r * 0.55, r * 0.35);
  ctx.lineTo(r * 0.55, r * 0.35);
  ctx.quadraticCurveTo(r * 1.05, r * 0.1, r * 0.85, -r);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = colors.dark;
  ctx.lineWidth = 0.06;
  ctx.stroke();
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-r * 0.75, -r * 0.45, r * 1.5, r * 0.14);
  // Head.
  const headY = r * 0.42;
  const head = r * 0.5;
  ctx.fillStyle = '#f1c9a0';
  ctx.beginPath(); ctx.arc(0, headY, head, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#9a6b45';
  ctx.lineWidth = 0.04;
  ctx.stroke();
  // Eyes blink now and then and look towards the enemy.
  const blink = Math.sin(time * 1.7 + royal.side * 3 + r * 10) > 0.985;
  ctx.fillStyle = '#1f2937';
  for (const ex of [-0.17, 0.17]) {
    if (blink) ctx.fillRect(ex * r * 2 + look * 0.05 - 0.07, headY + 0.03, 0.14, 0.025);
    else { ctx.beginPath(); ctx.arc(ex * r * 2 + look * 0.06, headY + 0.04, 0.055, 0, Math.PI * 2); ctx.fill(); }
  }
  const worried = royal.hp < royal.maxHp * 0.5;
  ctx.strokeStyle = '#7c2d12';
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  if (worried) ctx.arc(look * 0.04, headY - 0.2, 0.09, 0.15 * Math.PI, 0.85 * Math.PI);
  else ctx.arc(look * 0.04, headY - 0.1, 0.1, 1.15 * Math.PI, 1.85 * Math.PI);
  ctx.stroke();
  if (royal.role === 'king') {
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#a16207';
    ctx.lineWidth = 0.035;
    const base = headY + head * 0.62;
    ctx.beginPath();
    ctx.moveTo(-head * 0.85, base);
    ctx.lineTo(-head * 0.95, base + head * 0.75);
    ctx.lineTo(-head * 0.42, base + head * 0.38);
    ctx.lineTo(0, base + head * 0.95);
    ctx.lineTo(head * 0.42, base + head * 0.38);
    ctx.lineTo(head * 0.95, base + head * 0.75);
    ctx.lineTo(head * 0.85, base);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e11d48';
    ctx.beginPath(); ctx.arc(0, base + head * 0.28, 0.06, 0, Math.PI * 2); ctx.fill();
  } else {
    // Helmet with a plume in the team colour.
    ctx.fillStyle = '#a3b1bf';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    ctx.arc(0, headY + 0.02, head * 1.04, 0.05 * Math.PI, 0.95 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = colors.light;
    ctx.beginPath();
    ctx.ellipse(-look * head * 0.3, headY + head * 1.1, head * 0.55, head * 0.22, -look * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.75, flash)})`;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2); ctx.fill();
  }
}

/** Health bar over a royal, in world units. */
export function drawHealthBar(ctx: CanvasRenderingContext2D, x: number, y: number, fraction: number): void {
  const w = 1.3;
  const h = 0.16;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x - w / 2 - 0.04, y - 0.04, w + 0.08, h + 0.08);
  ctx.fillStyle = fraction > 0.5 ? '#4ade80' : fraction > 0.25 ? '#facc15' : '#f87171';
  ctx.fillRect(x - w / 2, y, w * Math.max(0, fraction), h);
}

/** Trebuchet at ground level. `arm` is radians from horizontal, pointing at the enemy for positive values. */
export function drawTrebuchet(ctx: CanvasRenderingContext2D, side: Side, arm: number, loaded: boolean, ammo: AmmoId): void {
  ctx.save();
  if (side === 1) ctx.scale(-1, 1);
  const pivotY = 2.7;
  ctx.lineCap = 'round';
  // Wheels and base.
  ctx.fillStyle = '#5b3a1e';
  ctx.fillRect(-2.1, 0.45, 4.2, 0.35);
  for (const wx of [-1.5, 1.5]) {
    ctx.fillStyle = '#3f2814';
    ctx.beginPath(); ctx.arc(wx, 0.45, 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a07a4a';
    ctx.lineWidth = 0.06;
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx - 0.4, 0.45); ctx.lineTo(wx + 0.4, 0.45); ctx.moveTo(wx, 0.05); ctx.lineTo(wx, 0.85); ctx.stroke();
  }
  // A-frame.
  ctx.strokeStyle = '#7a4f28';
  ctx.lineWidth = 0.22;
  ctx.beginPath();
  ctx.moveTo(-1.4, 0.75); ctx.lineTo(0, pivotY); ctx.lineTo(1.4, 0.75);
  ctx.moveTo(-0.8, 1.5); ctx.lineTo(0.8, 1.5);
  ctx.stroke();
  // Throwing arm: long end carries the sling, short end the counterweight.
  const long = 3.2;
  const short = 1.1;
  const tipX = Math.cos(arm) * long;
  const tipY = pivotY + Math.sin(arm) * long;
  const backX = -Math.cos(arm) * short;
  const backY = pivotY - Math.sin(arm) * short;
  ctx.strokeStyle = '#8b5a2b';
  ctx.lineWidth = 0.18;
  ctx.beginPath(); ctx.moveTo(backX, backY); ctx.lineTo(tipX, tipY); ctx.stroke();
  ctx.fillStyle = '#4b5563';
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 0.05;
  ctx.fillRect(backX - 0.42, backY - 0.75, 0.84, 0.75);
  ctx.strokeRect(backX - 0.42, backY - 0.75, 0.84, 0.75);
  ctx.fillStyle = '#d4a017';
  ctx.beginPath(); ctx.arc(0, pivotY, 0.13, 0, Math.PI * 2); ctx.fill();
  if (loaded) {
    ctx.strokeStyle = '#d6c7a1';
    ctx.lineWidth = 0.04;
    const slingX = tipX + 0.15;
    const slingY = tipY - 0.55;
    ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(slingX, slingY); ctx.stroke();
    ctx.save();
    ctx.translate(slingX, slingY);
    drawProjectile(ctx, ammo, ammo === 'titan' ? 0.7 : 0.38, 0, 0);
    ctx.restore();
  }
  ctx.restore();
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
export function drawBanner(ctx: CanvasRenderingContext2D, side: Side, x: number, wind: number, time: number): void {
  const top = PLATEAU_Y + 9;
  ctx.strokeStyle = '#3f2a14';
  ctx.lineWidth = 0.14;
  ctx.beginPath(); ctx.moveTo(x, PLATEAU_Y); ctx.lineTo(x, top); ctx.stroke();
  ctx.fillStyle = '#d4a017';
  ctx.beginPath(); ctx.arc(x, top + 0.1, 0.16, 0, Math.PI * 2); ctx.fill();
  const direction = wind === 0 ? (side === 0 ? 1 : -1) : Math.sign(wind);
  const length = 2.4 + Math.min(1.2, Math.abs(wind) * 0.4);
  const colors = SIDE_COLORS[side];
  ctx.fillStyle = colors.main;
  ctx.beginPath();
  ctx.moveTo(x, top);
  const segments = 8;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    ctx.lineTo(x + direction * length * t, top - 0.1 * t + Math.sin(time * 6 - t * 5) * 0.18 * t);
  }
  for (let i = segments; i >= 0; i--) {
    const t = i / segments;
    ctx.lineTo(x + direction * length * t, top - 1.3 + 0.25 * t + Math.sin(time * 6 - t * 5) * 0.18 * t);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = colors.dark;
  ctx.lineWidth = 0.05;
  ctx.stroke();
  ctx.fillStyle = '#fde68a';
  ctx.beginPath(); ctx.arc(x + direction * length * 0.42, top - 0.6 + Math.sin(time * 6 - 2) * 0.08, 0.28, 0, Math.PI * 2); ctx.fill();
}
