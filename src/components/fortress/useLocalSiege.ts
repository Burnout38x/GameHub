'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { aiPlanner } from '@/lib/fortress/ai';
import type { FortressDesign } from '@/lib/fortress/design';
import { activePlayer, applyAction, createMatch, type MatchAction, type MatchSetup, type MatchState } from '@/lib/fortress/match';
import type { ShotInput } from '@/lib/fortress/physics';
import type { SiegePlayback } from './SiegeBattle';

/** The Machine always takes at least this long, so its turn reads as a turn. */
const AI_MIN_THINK_MS = 1100;
const AI_SLICE_MS = 12;

export interface LocalSiege {
  match: MatchState;
  playback: SiegePlayback | null;
  error: string | null;
  thinking: boolean;
  act: (action: MatchAction) => void;
  done: (key: number) => void;
}

/** A battle against the Machine, run entirely in this browser. */
export function useLocalSiege(setup: MatchSetup, design: FortressDesign, seed: number, playerName: string, onFinish: (match: MatchState) => void): LocalSiege {
  const [match, setMatch] = useState(() => createMatch(setup, seed, [design, null], [playerName]));
  const [playback, setPlayback] = useState<SiegePlayback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const matchRef = useRef(match);
  const playbackRef = useRef<SiegePlayback | null>(null);
  const keyRef = useRef(0);
  const finishRef = useRef(onFinish);
  useEffect(() => { finishRef.current = onFinish; }, [onFinish]);

  const commit = useCallback((next: MatchState) => {
    matchRef.current = next;
    setMatch(next);
    if (next.result) finishRef.current(next);
  }, []);

  const act = useCallback((action: MatchAction) => {
    if (playbackRef.current) return;
    const current = matchRef.current;
    const outcome = applyAction(current, action);
    if ('error' in outcome) { setError(outcome.error); return; }
    setError(null);
    if (!outcome.replay) { commit(outcome.state); return; }
    const next: SiegePlayback = { key: ++keyRef.current, replay: outcome.replay, after: outcome.state, side: activePlayer(current).side };
    playbackRef.current = next;
    setPlayback(next);
  }, [commit]);

  const done = useCallback((key: number) => {
    const current = playbackRef.current;
    if (!current || current.key !== key) return;
    playbackRef.current = null;
    setPlayback(null);
    commit(current.after);
  }, [commit]);

  const thinking = !playback && !match.result && activePlayer(match).ai;

  // The Machine plans in small slices between frames so the page never stutters.
  useEffect(() => {
    if (!thinking) return;
    const player = activePlayer(match);
    const planner = aiPlanner(match.world, player.side, match.wind, match.aiLevel, player, (match.seed + match.turn * 7919) >>> 0);
    const started = performance.now();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      if (cancelled) return;
      const sliceStart = performance.now();
      let result: IteratorResult<void, ShotInput> | null = null;
      do { result = planner.next(); } while (!result.done && performance.now() - sliceStart < AI_SLICE_MS);
      if (!result.done) { timer = setTimeout(step, 0); return; }
      const shot = result.value;
      timer = setTimeout(() => {
        if (!cancelled) act({ type: 'fire', angle: shot.angle, power: shot.power, ammo: shot.ammo });
      }, Math.max(0, AI_MIN_THINK_MS - (performance.now() - started)));
    };
    timer = setTimeout(step, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [thinking, match, act]);

  return { match, playback, error, thinking, act, done };
}
