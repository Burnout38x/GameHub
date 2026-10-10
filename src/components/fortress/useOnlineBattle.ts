'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CARDS, TICK_MS } from '@/lib/fortress/content';
import { commandError, type BattleCommand, type CommandBody } from '@/lib/fortress/commands';
import { stepBattle } from '@/lib/fortress/sim';
import { createBattle, cloneBattle, humanSides, type BattleState, type Fx, type Outcome } from '@/lib/fortress/state';
import type { OnlineBattle } from '@/lib/fortress/online';
import { hudChanged, readHud, type BattleDriver, type Ghost, type Hud } from './driver';

const POLL_MS = 650;
const SNAPSHOT_EVERY = 20;
const FINISH_RETRY_MS = 1500;
/** Catch-up larger than this (a backgrounded tab) skips effects instead of replaying them all. */
const FX_CATCH_UP_LIMIT = 6;
/** Ticks simulated per frame at most, so returning to a tab never freezes the page. */
const MAX_STEPS_PER_FRAME = 240;

interface BattleResponse { battle?: OnlineBattle; status?: string; serverNow?: number; error?: string }

async function postBattle(code: string, payload: Record<string, unknown>): Promise<{ ok: boolean; data: BattleResponse }> {
  const response = await fetch(`/api/rooms/${encodeURIComponent(code)}/battle`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  return { ok: response.ok, data: await response.json().catch(() => ({})) };
}

/**
 * Lockstep client for an online room. The server stamps each order a little in the
 * future; both phones replay the shared log, rolling back if an order arrives late.
 */
export function useOnlineBattle(code: string, initial: OnlineBattle, userId: string, onSettled: () => void): BattleDriver {
  const myPlayer = Math.max(0, initial.players.indexOf(userId));
  const mySide = humanSides(initial.setup)[myPlayer] ?? 0;
  const stateRef = useRef<BattleState | null>(null);
  const fxRef = useRef<Fx[]>([]);
  const lastStepRef = useRef(0);
  const logRef = useRef<BattleCommand[]>(initial.log);
  const cursorRef = useRef(0);
  const snapshotsRef = useRef(new Map<number, BattleState>());
  const offsetRef = useRef(0);
  const bestRttRef = useRef(Infinity);
  const fxTickRef = useRef(-1);
  const settledRef = useRef(onSettled);
  const finishedRef = useRef(false);
  const finishingRef = useRef(false);
  const [hud, setHud] = useState<Hud | null>(null);
  const [countdown, setCountdown] = useState(4);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [connection, setConnection] = useState<BattleDriver['connection']>('syncing');
  const [ghosts, setGhosts] = useState<Ghost[]>([]);

  useEffect(() => { settledRef.current = onSettled; }, [onSettled]);

  /** Restores the newest snapshot at or before `tick` so late orders are simulated on time. */
  const rollbackTo = useCallback((tick: number) => {
    const state = stateRef.current;
    if (!state || tick >= state.tick) return;
    let best = -1;
    for (const key of snapshotsRef.current.keys()) if (key <= tick && key > best) best = key;
    const restored = best >= 0 ? cloneBattle(snapshotsRef.current.get(best)!) : createBattle(initial.setup, initial.seed);
    for (const key of [...snapshotsRef.current.keys()]) if (key > restored.tick) snapshotsRef.current.delete(key);
    stateRef.current = restored;
    cursorRef.current = logRef.current.findIndex(command => command.t >= restored.tick);
    if (cursorRef.current < 0) cursorRef.current = logRef.current.length;
  }, [initial.setup, initial.seed]);

  const absorb = useCallback((battle: OnlineBattle | undefined, serverNow: number | undefined, sentAt: number) => {
    const receivedAt = Date.now();
    if (typeof serverNow === 'number') {
      const rtt = receivedAt - sentAt;
      // Trust the fastest round trip seen so far: it bounds the clock error most tightly.
      if (rtt <= bestRttRef.current + 40) {
        bestRttRef.current = Math.min(bestRttRef.current, rtt);
        offsetRef.current = serverNow - (sentAt + rtt / 2);
      }
    }
    if (!battle || battle.log.length <= logRef.current.length) return;
    const fresh = battle.log.slice(logRef.current.length);
    logRef.current = battle.log;
    const earliest = Math.min(...fresh.map(command => command.t));
    const state = stateRef.current;
    if (state && earliest < state.tick) rollbackTo(earliest);
    setGhosts(current => current.filter(ghost => ghost.until > performance.now()));
  }, [rollbackTo]);

  // Simulation and render clock.
  useEffect(() => {
    const state = createBattle(initial.setup, initial.seed);
    stateRef.current = state;
    snapshotsRef.current = new Map([[0, cloneBattle(state)]]);
    let lastHud: Hud | null = null;
    let frame = 0;
    let lastFinishTry = 0;
    const loop = () => {
      const live = stateRef.current!;
      // Never simulate on the phone's own clock: wait for the first server time sample.
      if (!Number.isFinite(bestRttRef.current)) { frame = requestAnimationFrame(loop); return; }
      const serverNow = Date.now() + offsetRef.current;
      const remaining = initial.startAt - serverNow;
      setCountdown(remaining > 0 ? Math.ceil(remaining / 1000) : 0);
      const target = Math.min(live.endTick, Math.floor((serverNow - initial.startAt) / TICK_MS));
      // A corrected clock can put us ahead of the server: rewind rather than freeze.
      if (target < live.tick - 1 && !live.outcome) { rollbackTo(Math.max(0, target)); frame = requestAnimationFrame(loop); return; }
      let steps = 0;
      while (live.tick < target && !live.outcome && steps++ < MAX_STEPS_PER_FRAME) {
        const current = stateRef.current!;
        if (current !== live) break;
        if (live.tick % SNAPSHOT_EVERY === 0 && !snapshotsRef.current.has(live.tick)) snapshotsRef.current.set(live.tick, cloneBattle(live));
        const log = logRef.current;
        let cursor = cursorRef.current;
        while (cursor < log.length && log[cursor].t < live.tick) cursor++;
        const start = cursor;
        while (cursor < log.length && log[cursor].t === live.tick) cursor++;
        cursorRef.current = cursor;
        stepBattle(live, log.slice(start, cursor));
        if (live.tick - 1 > fxTickRef.current) {
          fxTickRef.current = live.tick - 1;
          if (target - live.tick < FX_CATCH_UP_LIMIT) fxRef.current.push(...live.fx);
        }
        lastStepRef.current = performance.now();
      }
      const next = readHud(stateRef.current!, myPlayer, mySide);
      if (hudChanged(lastHud, next)) { lastHud = next; setHud(next); }
      // Follow rollbacks: a late order can undo an ending the local replay predicted.
      const ended = stateRef.current!.outcome;
      setOutcome(previous => (previous?.winner === ended?.winner && previous?.reason === ended?.reason ? previous : ended));
      // Ask the server to settle once our replay (or the clock) says the battle is over.
      if ((ended || target >= live.endTick) && !finishedRef.current && !finishingRef.current && performance.now() - lastFinishTry > FINISH_RETRY_MS) {
        lastFinishTry = performance.now();
        finishingRef.current = true;
        void postBattle(code, { action: 'finish' }).then(({ data }) => {
          if (data.status === 'finished' && !finishedRef.current) { finishedRef.current = true; settledRef.current(); }
        }).catch(() => setConnection('offline')).finally(() => { finishingRef.current = false; });
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [code, initial.setup, initial.seed, initial.startAt, myPlayer, mySide, rollbackTo]);

  // Order log polling.
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let inFlight = false;
    async function poll() {
      inFlight = true;
      if (document.visibilityState === 'visible') {
        const sentAt = Date.now();
        try {
          const response = await fetch(`/api/rooms/${encodeURIComponent(code)}/battle`, { cache: 'no-store' });
          const data: BattleResponse = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || 'offline');
          absorb(data.battle, data.serverNow, sentAt);
          setConnection('live');
          if (data.status === 'finished' && !finishedRef.current) { finishedRef.current = true; settledRef.current(); }
        } catch {
          setConnection('offline');
        }
      }
      inFlight = false;
      if (!stopped && !finishedRef.current) timer = setTimeout(poll, POLL_MS);
    }
    void poll();
    // Coming back to the tab re-syncs at once instead of waiting on a throttled timer.
    const onVisible = () => { if (document.visibilityState === 'visible' && !inFlight) { clearTimeout(timer); void poll(); } };
    document.addEventListener('visibilitychange', onVisible);
    return () => { stopped = true; clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [code, absorb]);

  const send = useCallback(async (body: CommandBody): Promise<string | null> => {
    const state = stateRef.current;
    if (!state) return 'The battle is loading.';
    const localError = commandError(state, myPlayer, body);
    if (localError) return localError;
    let ghost: Ghost | null = null;
    if (body.k === 'deploy' && !CARDS[body.card].spell) {
      ghost = { id: Date.now() + Math.random(), lane: body.lane, emoji: CARDS[body.card].emoji, until: performance.now() + 1600 };
      setGhosts(current => [...current, ghost!]);
    }
    const sentAt = Date.now();
    try {
      const { ok, data } = await postBattle(code, { action: 'command', command: body });
      absorb(data.battle, data.serverNow, sentAt);
      if (!ok) {
        if (ghost) setGhosts(current => current.filter(g => g.id !== ghost!.id));
        return data.error || 'That order did not go through.';
      }
      setConnection('live');
      return null;
    } catch {
      if (ghost) setGhosts(current => current.filter(g => g.id !== ghost!.id));
      setConnection('offline');
      return 'Connection lost. Check your network.';
    }
  }, [code, myPlayer, absorb]);

  const togglePause = useCallback(() => undefined, []);

  return { stateRef, fxRef, lastStepRef, hud, mySide, myPlayer, countdown, outcome, ghosts, connection, paused: false, canPause: false, togglePause, send };
}
