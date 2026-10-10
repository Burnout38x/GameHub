/**
 * Synthesized siege sounds: no audio files, nothing plays until the player interacts.
 * Impacts are voiced by material, so timber cracks, stone thuds, steel rings and glass shatters.
 */
export type SoundKind = 'launch' | 'wood' | 'stone' | 'metal' | 'glass' | 'thud' | 'boom' | 'split' | 'splash' | 'ko' | 'thunder' | 'win' | 'lose';

const MUTE_KEY = 'gamehub:fortress-feud:muted';
/** Minimum gap per sound so a big collapse does not become noise. */
const THROTTLE_MS: Record<SoundKind, number> = { launch: 200, wood: 70, stone: 80, metal: 90, glass: 90, thud: 110, boom: 120, split: 200, splash: 200, ko: 300, thunder: 2000, win: 0, lose: 0 };

export function readMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}
export function writeMuted(muted: boolean): void {
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* Storage blocked: the choice lasts for this battle. */ }
}

export class BattleSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private last = new Map<SoundKind, number>();
  muted = false;

  /** Must be called from a user gesture on iOS Safari. */
  unlock(): void {
    if (this.ctx || typeof window === 'undefined') return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      const compressor = this.ctx.createDynamicsCompressor();
      this.master.connect(compressor).connect(this.ctx.destination);
      const length = Math.floor(this.ctx.sampleRate * 2);
      this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  close(): void {
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.master = null;
  }

  /** `strength` 0–1 scales loudness (and pitch for impacts). */
  play(kind: SoundKind, strength = 1): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    const now = performance.now();
    if (now - (this.last.get(kind) ?? -Infinity) < THROTTLE_MS[kind]) return;
    this.last.set(kind, now);
    const t = ctx.currentTime;
    const s = Math.max(0.15, Math.min(1, strength));
    switch (kind) {
      case 'launch':
        this.noise(t, 0.12, 0.08 * s, 'bandpass', 300, 1.5); // creak of the release
        this.tone(t, 'sawtooth', 90, 60, 0.18, 0.05 * s);
        this.noise(t + 0.08, 0.45, 0.16 * s, 'bandpass', 900, 0.8, 2400); // whoosh
        break;
      case 'wood':
        this.noise(t, 0.08, 0.3 * s, 'highpass', 1400, 0.7);
        this.tone(t, 'triangle', 210 - s * 60, 110, 0.12, 0.18 * s);
        break;
      case 'stone':
        this.tone(t, 'sine', 120 - s * 30, 55, 0.25, 0.35 * s);
        this.noise(t, 0.18, 0.25 * s, 'lowpass', 700, 0.7);
        break;
      case 'metal':
        for (const [frequency, volume] of [[520, 0.12], [1340, 0.07], [2310, 0.05], [3720, 0.03]] as const) this.tone(t, 'sine', frequency, frequency * 0.98, 0.7, volume * s);
        this.noise(t, 0.04, 0.2 * s, 'highpass', 3000, 0.7);
        break;
      case 'glass':
        this.noise(t, 0.3, 0.22 * s, 'highpass', 4000, 0.6);
        for (let i = 0; i < 4; i++) this.tone(t + i * 0.03, 'sine', 2400 + Math.random() * 2600, 2200, 0.25, 0.04 * s);
        break;
      case 'thud':
        this.tone(t, 'sine', 80, 40, 0.3, 0.3 * s);
        this.noise(t, 0.25, 0.18 * s, 'lowpass', 400, 0.7);
        break;
      case 'boom':
        this.tone(t, 'sine', 130, 35, 0.9, 0.55 * s);
        this.noise(t, 1.1, 0.5 * s, 'lowpass', 900, 0.6, 180);
        this.noise(t, 0.08, 0.3 * s, 'highpass', 2000, 0.6);
        break;
      case 'split':
        this.noise(t, 0.2, 0.25 * s, 'bandpass', 1200, 1.2);
        this.tone(t, 'square', 700, 350, 0.12, 0.05 * s);
        break;
      case 'splash':
        this.noise(t, 0.5, 0.2 * s, 'bandpass', 900, 0.5, 300);
        break;
      case 'thunder':
        this.noise(t + 0.3, 2.2, 0.35 * s, 'lowpass', 260, 0.6, 90);
        break;
      case 'ko':
        this.melody(t, [392, 523, 659], 0.11, 'triangle', 0.12);
        this.tone(t, 'sine', 160, 60, 0.4, 0.3);
        break;
      case 'win':
        this.melody(t, [523, 659, 784, 1047, 784, 1047], 0.13, 'triangle', 0.14);
        break;
      case 'lose':
        this.melody(t, [392, 330, 262, 196], 0.18, 'triangle', 0.14);
        break;
    }
  }

  private tone(t: number, type: OscillatorType, from: number, to: number, length: number, volume: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + length);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(gain).connect(this.master!);
    osc.start(t);
    osc.stop(t + length + 0.05);
  }

  private noise(t: number, length: number, volume: number, type: BiquadFilterType, frequency: number, q: number, sweepTo?: number): void {
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, t);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, t + length);
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    source.connect(filter).connect(gain).connect(this.master!);
    source.start(t, Math.random() * 0.5);
    source.stop(t + length + 0.05);
  }

  private melody(t: number, notes: number[], gap: number, type: OscillatorType, volume: number): void {
    notes.forEach((frequency, index) => this.tone(t + index * gap, type, frequency, frequency, 0.28, volume));
  }
}
