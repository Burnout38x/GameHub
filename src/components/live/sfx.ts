'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Game-show sounds for the live games, synthesized so there are no audio files to load.
 * Nothing plays until the player has interacted with the page (a browser rule anyway).
 */
export type Cue = 'tick' | 'lock' | 'right' | 'wrong' | 'reveal' | 'deal' | 'flip' | 'pick' | 'whot' | 'win' | 'lose';

const MUTE_KEY = 'gamehub:live-games:muted';

function readMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}

/** [frequency Hz, start s, duration s, wave] notes for each cue. */
const SCORES: Record<Cue, [number, number, number, OscillatorType][]> = {
  tick: [[880, 0, 0.05, 'square']],
  lock: [[520, 0, 0.08, 'triangle'], [780, 0.06, 0.1, 'triangle']],
  right: [[660, 0, 0.12, 'triangle'], [880, 0.1, 0.12, 'triangle'], [1320, 0.2, 0.22, 'triangle']],
  wrong: [[220, 0, 0.18, 'sawtooth'], [165, 0.14, 0.26, 'sawtooth']],
  reveal: [[392, 0, 0.1, 'sine'], [523, 0.09, 0.1, 'sine'], [659, 0.18, 0.18, 'sine']],
  deal: [[1400, 0, 0.03, 'square'], [1200, 0.05, 0.03, 'square'], [1000, 0.1, 0.03, 'square']],
  flip: [[1100, 0, 0.04, 'triangle'], [1500, 0.03, 0.05, 'triangle']],
  pick: [[600, 0, 0.06, 'square'], [450, 0.07, 0.08, 'square']],
  whot: [[523, 0, 0.1, 'square'], [659, 0.08, 0.1, 'square'], [784, 0.16, 0.1, 'square'], [1047, 0.24, 0.2, 'square']],
  win: [[523, 0, 0.14, 'triangle'], [659, 0.13, 0.14, 'triangle'], [784, 0.26, 0.14, 'triangle'], [1047, 0.39, 0.4, 'triangle']],
  lose: [[392, 0, 0.2, 'sine'], [330, 0.18, 0.2, 'sine'], [262, 0.36, 0.45, 'sine']],
};

class Sfx {
  private ctx: AudioContext | null = null;
  muted = readMuted();

  unlock(): void {
    if (this.ctx || typeof window === 'undefined') return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try { this.ctx = new Ctor(); } catch { this.ctx = null; }
  }

  play(cue: Cue): void {
    if (this.muted || !this.ctx) return;
    const ctx = this.ctx;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    const start = ctx.currentTime;
    for (const [frequency, offset, duration, wave] of SCORES[cue]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(cue === 'tick' ? 0.05 : 0.12, start + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start + offset);
      osc.stop(start + offset + duration + 0.02);
    }
  }
}

/** One sound kit per screen, plus a remembered mute switch. */
export function useSfx() {
  const ref = useRef<Sfx | null>(null);
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    const sfx = new Sfx();
    ref.current = sfx;
    const unlock = () => sfx.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    const stored = sfx.muted;
    queueMicrotask(() => setMuted(stored));
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  }, []);
  const play = useCallback((cue: Cue) => ref.current?.play(cue), []);
  const toggle = useCallback(() => {
    const sfx = ref.current;
    if (!sfx) return;
    sfx.muted = !sfx.muted;
    sfx.unlock();
    try { localStorage.setItem(MUTE_KEY, sfx.muted ? '1' : '0'); } catch { /* storage blocked: lasts for this page */ }
    setMuted(sfx.muted);
  }, []);
  return { play, muted, toggle };
}
