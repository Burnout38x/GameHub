import type { MaterialId } from '@/lib/fortress/content';

/** Short-lived visual flourishes: smoke, sparks, splinters, fire and floating numbers. */
type Kind = 'smoke' | 'spark' | 'chunk' | 'flame' | 'flash' | 'ring' | 'text' | 'drop' | 'star' | 'dust' | 'ember';
interface Particle {
  kind: Kind; x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number; color: string;
  rot: number; spin: number; gravity: number; text?: string;
  /** Rubble that has come to rest on the ground. */
  resting?: boolean;
}

const MAX_PARTICLES = 900;
/** Rubble lingers on the ground, then fades over its last second. */
const RUBBLE_SECONDS = 6;
const DEBRIS_COLORS: Record<MaterialId, string[]> = {
  wood: ['#a06a35', '#7a4b22', '#c08a52'],
  stone: ['#9e9a90', '#7d7a72', '#b8b4aa'],
  steel: ['#9aa7b4', '#6b7a89', '#d1d9e0'],
  glass: ['#cdeeff', '#9fd5f5', '#ffffff'],
};

export class Effects {
  private particles: Particle[] = [];
  shake = 0;
  private random: () => number = Math.random;

  get count(): number { return this.particles.length; }

  clear(): void { this.particles = []; this.shake = 0; }

  private add(particle: Omit<Particle, 'rot' | 'spin'> & { rot?: number; spin?: number }): void {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
    this.particles.push({ rot: 0, spin: 0, ...particle });
  }

  puff(x: number, y: number, count: number, color = 'rgba(214,204,186,0.75)', size = 0.6, speed = 1.5): void {
    for (let i = 0; i < count; i++) {
      const a = this.random() * Math.PI * 2;
      const s = this.random() * speed;
      this.add({ kind: 'smoke', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6 + 0.6, life: 0, max: 0.9 + this.random() * 0.9, size: size * (0.6 + this.random() * 0.8), color, gravity: -0.4 });
    }
  }

  trail(x: number, y: number, fiery: boolean): void {
    this.add({ kind: fiery ? 'flame' : 'smoke', x, y, vx: (this.random() - 0.5) * 0.3, vy: 0.3, life: 0, max: fiery ? 0.35 : 0.6, size: fiery ? 0.35 : 0.22, color: fiery ? '#fb923c' : 'rgba(230,226,215,0.55)', gravity: -0.3 });
  }

  explosion(x: number, y: number, radius: number, fiery = false): void {
    this.add({ kind: 'flash', x, y, vx: 0, vy: 0, life: 0, max: 0.18, size: radius * 1.6, color: '#fff7d6', gravity: 0 });
    this.add({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0, max: 0.45, size: radius * 1.4, color: 'rgba(255,255,255,0.8)', gravity: 0 });
    for (let i = 0; i < 26; i++) {
      const a = this.random() * Math.PI * 2;
      const s = 2 + this.random() * radius * 3;
      this.add({ kind: 'flame', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 0.35 + this.random() * 0.35, size: 0.4 + this.random() * radius * 0.25, color: fiery ? '#f97316' : this.random() < 0.5 ? '#fbbf24' : '#f97316', gravity: -1 });
    }
    for (let i = 0; i < 18; i++) {
      const a = this.random() * Math.PI * 2;
      const s = 4 + this.random() * 8;
      this.add({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s + 2, life: 0, max: 0.5 + this.random() * 0.5, size: 0.08, color: '#fde68a', gravity: 9 });
    }
    this.puff(x, y + 0.3, 12, 'rgba(70,64,58,0.65)', radius * 0.55, radius * 0.9);
    this.shake = Math.max(this.shake, Math.min(1, radius / 3));
  }

  debris(x: number, y: number, material: MaterialId, w: number, h: number): void {
    const colors = DEBRIS_COLORS[material];
    const pieces = Math.min(22, 5 + Math.round(w * h * 3));
    for (let i = 0; i < pieces; i++) {
      const a = this.random() * Math.PI * 2;
      const s = 1 + this.random() * 5;
      this.add({
        kind: material === 'glass' ? 'star' : 'chunk',
        x: x + (this.random() - 0.5) * w, y: y + (this.random() - 0.5) * h,
        vx: Math.cos(a) * s, vy: Math.abs(Math.sin(a)) * s + 1, life: 0, max: material === 'glass' ? 1.2 + this.random() * 0.6 : RUBBLE_SECONDS + this.random() * 2,
        size: material === 'glass' ? 0.12 : 0.12 + this.random() * 0.22, color: colors[i % colors.length], gravity: 12,
        rot: this.random() * 6, spin: (this.random() - 0.5) * 14,
      });
    }
    this.puff(x, y, 5, material === 'wood' ? 'rgba(190,160,120,0.6)' : 'rgba(200,196,188,0.6)', 0.5, 1.2);
  }

  /** A low rolling cloud where something heavy hits the ground. */
  dust(x: number, y: number, size: number): void {
    for (let i = 0; i < 4 + Math.round(size * 3); i++) {
      const dir = this.random() < 0.5 ? -1 : 1;
      this.add({ kind: 'dust', x: x + (this.random() - 0.5) * size, y: y + 0.1, vx: dir * (0.6 + this.random() * 1.6) * size, vy: 0.2 + this.random() * 0.5, life: 0, max: 1.2 + this.random() * 1.2, size: 0.4 + this.random() * 0.5 * size, color: 'rgba(196,176,140,0.55)', gravity: -0.15 });
    }
  }

  ember(x: number, y: number): void {
    this.add({ kind: 'ember', x, y, vx: (this.random() - 0.5) * 0.8, vy: 1 + this.random() * 1.5, life: 0, max: 1 + this.random(), size: 0.05, color: '#ffb347', gravity: -0.2 });
  }

  splash(x: number, y: number): void {
    for (let i = 0; i < 16; i++) {
      this.add({ kind: 'drop', x: x + (this.random() - 0.5) * 0.6, y, vx: (this.random() - 0.5) * 3, vy: 3 + this.random() * 5, life: 0, max: 0.8 + this.random() * 0.4, size: 0.1 + this.random() * 0.1, color: '#cfe9ff', gravity: 12 });
    }
    this.add({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0, max: 0.6, size: 1.6, color: 'rgba(220,240,255,0.7)', gravity: 0 });
  }

  fire(x: number, y: number, width: number): void {
    this.add({ kind: 'flame', x: x + (this.random() - 0.5) * width, y, vx: (this.random() - 0.5) * 0.4, vy: 1 + this.random(), life: 0, max: 0.4 + this.random() * 0.4, size: 0.25 + this.random() * 0.25, color: this.random() < 0.5 ? '#f97316' : '#fbbf24', gravity: -1.5 });
    if (this.random() < 0.15) this.add({ kind: 'smoke', x: x + (this.random() - 0.5) * width, y: y + 0.4, vx: 0.2, vy: 1, life: 0, max: 1.6, size: 0.45, color: 'rgba(60,56,52,0.4)', gravity: -0.4 });
  }

  stars(x: number, y: number): void {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      this.add({ kind: 'star', x, y, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3 + 2, life: 0, max: 0.9, size: 0.18, color: '#fde047', gravity: 3, rot: a, spin: 6 });
    }
    this.puff(x, y, 10, 'rgba(255,255,255,0.8)', 0.6, 2);
  }

  text(x: number, y: number, text: string, color: string, size = 0.9): void {
    this.add({ kind: 'text', x, y, vx: 0, vy: 1.6, life: 0, max: 1.4, size, color, gravity: 0, text });
  }

  /** Advances everything; with `ground`, rubble bounces and comes to rest on the terrain. */
  update(dt: number, ground?: (x: number) => number): void {
    this.shake = Math.max(0, this.shake - dt * 2.2);
    for (const p of this.particles) {
      p.life += dt;
      if (p.resting) continue;
      p.vy -= p.gravity * dt;
      if (p.kind === 'smoke' || p.kind === 'flame' || p.kind === 'dust') { p.vx *= 1 - dt * 1.5; p.vy *= 1 - dt * 0.8; }
      if (p.kind === 'ember') p.vx += Math.sin(p.life * 7 + p.x) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      if (ground && (p.kind === 'chunk' || p.kind === 'drop' || p.kind === 'spark')) {
        const floor = ground(p.x) + p.size * 0.6;
        if (p.y < floor && p.vy < 0) {
          p.y = floor;
          if (p.kind !== 'chunk') { p.life = p.max; continue; }
          p.vy = -p.vy * 0.28;
          p.vx *= 0.55;
          p.spin *= 0.5;
          if (Math.abs(p.vy) < 0.6 && Math.abs(p.vx) < 0.4) { p.resting = true; p.vx = 0; p.vy = 0; }
        }
      }
    }
    this.particles = this.particles.filter(p => p.life < p.max);
  }

  /** Draws in world space; `pixel` is the size of one screen pixel in metres. */
  draw(ctx: CanvasRenderingContext2D, pixel: number): void {
    for (const p of this.particles) {
      const t = p.life / p.max;
      const fade = p.kind === 'chunk' ? Math.min(1, p.max - p.life) : 1 - t;
      ctx.globalAlpha = Math.max(0, fade);
      switch (p.kind) {
        case 'smoke':
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + t * 1.5), 0, Math.PI * 2); ctx.fill();
          break;
        case 'dust':
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * (1 + t * 2), p.size * (0.6 + t), 0, 0, Math.PI * 2); ctx.fill();
          break;
        case 'ember':
          ctx.fillStyle = Math.sin(p.life * 20) > 0 ? '#ffd27a' : p.color;
          ctx.fillRect(p.x - Math.max(p.size, pixel), p.y - Math.max(p.size, pixel), Math.max(p.size, pixel) * 2, Math.max(p.size, pixel) * 2);
          break;
        case 'flame':
          ctx.fillStyle = t < 0.3 ? '#fff3c4' : p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - t * 0.6), 0, Math.PI * 2); ctx.fill();
          break;
        case 'spark':
        case 'drop':
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(p.size, pixel * 1.5);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
          break;
        case 'chunk':
          ctx.save();
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size, -p.size * 0.6, p.size * 2, p.size * 1.2);
          ctx.restore();
          break;
        case 'star':
          ctx.save();
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, p.size * 1.6); ctx.lineTo(p.size * 0.5, 0); ctx.lineTo(0, -p.size * 1.6); ctx.lineTo(-p.size * 0.5, 0);
          ctx.closePath(); ctx.fill();
          ctx.restore();
          break;
        case 'flash': {
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          gradient.addColorStop(0, 'rgba(255,250,220,0.95)');
          gradient.addColorStop(1, 'rgba(255,180,80,0)');
          ctx.fillStyle = gradient;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'ring':
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(0.08, 0.3 * fade);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.3 + t), 0, Math.PI * 2); ctx.stroke();
          break;
        case 'text':
          // Text draws in screen pixels so tiny world-sized fonts stay crisp.
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.scale(pixel, -pixel);
          ctx.font = `900 ${Math.round(Math.max(13, p.size / pixel))}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(0,0,0,0.75)';
          ctx.strokeText(p.text ?? '', 0, 0);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text ?? '', 0, 0);
          ctx.restore();
          break;
      }
    }
    ctx.globalAlpha = 1;
  }
}
