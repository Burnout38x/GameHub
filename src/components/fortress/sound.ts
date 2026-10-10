/** Tiny synthesized battle sounds: no audio files, nothing plays until the player interacts. */
export type SoundKind = 'deploy' | 'hit' | 'boom' | 'bigBoom' | 'build' | 'meteor' | 'win' | 'lose';

const MUTE_KEY = 'gamehub:fortress-feud:muted';
/** Minimum gap per sound so a big fight does not become noise. */
const THROTTLE_MS: Record<SoundKind, number> = { deploy: 60, hit: 90, boom: 120, bigBoom: 250, build: 120, meteor: 200, win: 0, lose: 0 };

export function readMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}
export function writeMuted(muted: boolean): void {
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* Storage blocked: the choice lasts for this battle. */ }
}

export class BattleSound {
  private ctx: AudioContext | null = null;
  private last = new Map<SoundKind, number>();
  muted = false;

  /** Must be called from a user gesture on iOS Safari. */
  unlock(): void {
    if (this.ctx || typeof window === 'undefined') return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try { this.ctx = new Ctor(); } catch { this.ctx = null; }
  }

  close(): void {
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }

  play(kind: SoundKind): void {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    const now = performance.now();
    if (now - (this.last.get(kind) ?? -Infinity) < THROTTLE_MS[kind]) return;
    this.last.set(kind, now);
    const t = ctx.currentTime;
    if (kind === 'win') return this.melody(t, [523, 659, 784, 1047]);
    if (kind === 'lose') return this.melody(t, [392, 330, 262, 196]);
    if (kind === 'boom' || kind === 'bigBoom' || kind === 'meteor') return this.noise(t, kind === 'boom' ? 0.18 : 0.5, kind === 'boom' ? 0.12 : 0.28);
    const [from, to, length, type, volume] = {
      deploy: [320, 640, 0.12, 'triangle', 0.12],
      hit: [180, 90, 0.06, 'square', 0.04],
      build: [880, 1320, 0.1, 'sine', 0.1],
    }[kind] as [number, number, number, OscillatorType, number];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + length);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + length + 0.02);
  }

  private noise(t: number, length: number, volume: number): void {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * length), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(t);
  }

  private melody(t: number, notes: number[]): void {
    const ctx = this.ctx!;
    notes.forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = t + index * 0.14;
      osc.type = 'triangle';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.32);
    });
  }
}
