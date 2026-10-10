'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CARDS, TICK_MS } from '@/lib/fortress/content';
import { applyCommand, commandError, type BattleCommand, type CommandBody } from '@/lib/fortress/commands';
import { stepBattle } from '@/lib/fortress/sim';
import { createBattle, type BattleSetup, type BattleState, type Fx, type Outcome } from '@/lib/fortress/state';
import { hudChanged, readHud, type BattleDriver, type Ghost, type Hud } from './driver';

const COUNTDOWN_MS = 3000;
/** Never simulate more than this many ticks in one frame (e.g. after a long stall). */
const MAX_CATCH_UP = 20;

/**
 * Runs a battle against the Machine entirely in the browser. Every accepted command is
 * logged with its tick so the server can replay the exact match before saving progress.
 */
export function useLocalBattle(setup: BattleSetup, seed: number, onFinish: (state: BattleState, log: BattleCommand[]) => void): BattleDriver {
  const stateRef = useRef<BattleState | null>(null);
  const fxRef = useRef<Fx[]>([]);
  const lastStepRef = useRef(0);
  const logRef = useRef<BattleCommand[]>([]);
  const queueRef = useRef<BattleCommand[]>([]);
  const pausedRef = useRef(false);
  const finishRef = useRef(onFinish);
  const [hud, setHud] = useState<Hud | null>(null);
  const [countdown, setCountdown] = useState(Math.ceil(COUNTDOWN_MS / 1000));
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [paused, setPaused] = useState(false);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);

  useEffect(() => { finishRef.current = onFinish; }, [onFinish]);

  useEffect(() => {
    const state = createBattle(setup, seed);
    stateRef.current = state;
    logRef.current = [];
    queueRef.current = [];
    fxRef.current = [];
    let lastHud: Hud | null = null;
    const startAt = performance.now() + COUNTDOWN_MS;
    let clock = 0;
    let previous = performance.now();
    let frame = 0;
    let done = false;
    const loop = (now: number) => {
      const delta = Math.min(now - previous, TICK_MS * MAX_CATCH_UP);
      previous = now;
      if (now < startAt) {
        setCountdown(Math.ceil((startAt - now) / 1000));
      } else if (!pausedRef.current && !done) {
        setCountdown(0);
        clock += delta;
        while (clock >= TICK_MS && !state.outcome) {
          clock -= TICK_MS;
          const commands = queueRef.current.filter(command => command.t <= state.tick).map(command => ({ ...command, t: state.tick }));
          queueRef.current = queueRef.current.filter(command => command.t > state.tick);
          logRef.current.push(...commands);
          stepBattle(state, commands);
          fxRef.current.push(...state.fx);
          lastStepRef.current = now;
        }
        const next = readHud(state, 0, 0);
        if (hudChanged(lastHud, next)) { lastHud = next; setHud(next); }
        if (state.outcome) {
          done = true;
          setOutcome(state.outcome);
          finishRef.current(state, [...logRef.current]);
        }
      }
      if (!done) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    // A hidden tab pauses the battle rather than letting the Machine win unopposed.
    const onHide = () => { if (document.visibilityState === 'hidden') { pausedRef.current = true; setPaused(true); } };
    document.addEventListener('visibilitychange', onHide);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', onHide); };
  }, [setup, seed]);

  const send = useCallback(async (body: CommandBody): Promise<string | null> => {
    const state = stateRef.current;
    if (!state) return 'The battle is loading.';
    if (pausedRef.current) return 'Resume the battle first.';
    // Validate against the state as it will be once already-queued orders land.
    const projected = structuredClone(state);
    for (const queued of queueRef.current) applyCommand(projected, 0, queued);
    const error = commandError(projected, 0, body);
    if (error) return error;
    queueRef.current.push({ ...body, t: state.tick, p: 0 });
    if (body.k === 'deploy' && !CARDS[body.card].spell) {
      const ghost = { id: Date.now() + Math.random(), lane: body.lane, emoji: CARDS[body.card].emoji, until: performance.now() + 200 };
      setGhosts(current => [...current.filter(g => g.until > performance.now()), ghost]);
    }
    return null;
  }, []);

  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  }, []);

  return { stateRef, fxRef, lastStepRef, hud, mySide: 0, myPlayer: 0, countdown, outcome, ghosts, connection: 'live', paused, canPause: true, togglePause, send };
}
