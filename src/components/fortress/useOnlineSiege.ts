'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { activePlayer } from '@/lib/fortress/match';
import type { MatchAction, MatchState } from '@/lib/fortress/match';
import type { PublicSiege } from '@/lib/fortress/online';
import type { Replay } from '@/lib/fortress/physics';
import { ONLINE_TURN_SECONDS } from '@/lib/fortress/content';
import type { FortressDesign } from '@/lib/fortress/design';
import type { SiegePlayback } from './SiegeBattle';

interface Payload { siege: PublicSiege; replay: Replay | null; status: string; serverNow: number; error?: string }

const POLL_MS = 1200;
const ADVANCE_GAP_MS = 1500;

export interface OnlineDriver {
  siege: PublicSiege;
  /** What the battlefield shows: lags the server while a shot is still flying on screen. */
  shown: MatchState | null;
  playback: SiegePlayback | null;
  status: string;
  caughtUp: boolean;
  /** Last shot turn this phone has seen. */
  seen: number;
  /** A newer shot is waiting, so the one on screen should skip to its end. */
  rushing: boolean;
  busy: boolean;
  error: string | null;
  clockOffset: number;
  /** Server time as of the last poll. */
  serverNow: number;
  done: (key: number) => void;
  order: (action: MatchAction) => void;
  submitDesign: (design: FortressDesign) => void;
}

/** Keeps a phone in step with the server's siege and plays each new shot exactly once. */
export function useOnlineSiege(code: string, initial: PublicSiege, initialStatus: string): OnlineDriver {
  const [siege, setSiege] = useState(initial);
  const [shown, setShown] = useState<MatchState | null>(initial.match);
  const [status, setStatus] = useState(initialStatus);
  const [playback, setPlayback] = useState<SiegePlayback | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [seen, setSeen] = useState(initial.replayTurn);
  const [serverNow, setServerNow] = useState(() => Date.now());
  const seenRef = useRef(initial.replayTurn);
  const offsetRef = useRef(0);
  const versionRef = useRef(initial.version);
  const playbackRef = useRef<SiegePlayback | null>(null);
  const pendingRef = useRef<SiegePlayback | null>(null);
  const [rushing, setRushing] = useState(false);
  const latestRef = useRef(initial);
  const keyRef = useRef(0);
  const advanceRef = useRef(0);

  const absorb = useCallback((data: Payload) => {
    offsetRef.current = data.serverNow - Date.now();
    setClockOffset(offsetRef.current);
    setServerNow(data.serverNow);
    setStatus(data.status);
    const next = data.siege;
    if (next.version < versionRef.current) return;
    versionRef.current = next.version;
    latestRef.current = next;
    setSiege(next);
    if (next.replayTurn > seenRef.current && data.replay && next.match) {
      seenRef.current = next.replayTurn;
      setSeen(next.replayTurn);
      const incoming: SiegePlayback = { key: ++keyRef.current, replay: data.replay, after: next.match, side: next.replaySide };
      // A shot still flying on screen finishes first (the battlefield rushes it to the end).
      if (playbackRef.current) { pendingRef.current = incoming; setRushing(true); return; }
      playbackRef.current = incoming;
      setPlayback(incoming);
      return;
    }
    if (!playbackRef.current) setShown(next.match);
  }, []);

  const request = useCallback(async (init?: RequestInit) => {
    const since = seenRef.current;
    const response = await fetch(`/api/rooms/${encodeURIComponent(code)}/battle${init ? '' : `?since=${since}`}`, { cache: 'no-store', ...init });
    const data = await response.json().catch(() => null) as Payload | null;
    if (data?.siege) absorb(data);
    return { ok: response.ok, data };
  }, [code, absorb]);

  const post = useCallback(async (body: Record<string, unknown>) => {
    return request({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, since: seenRef.current }) });
  }, [request]);

  // Poll, and nudge the server along when a deadline passes or the Machine is due to fire.
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      if (document.visibilityState === 'visible') {
        try {
          await request();
          const current = latestRef.current;
          const serverNow = Date.now() + offsetRef.current;
          // The Machine may fire once the last shot has had time to land on every phone.
          const due = current.match && activePlayer(current.match).ai
            ? serverNow >= current.deadline - ONLINE_TURN_SECONDS * 1000
            : serverNow >= current.deadline;
          if (due && !current.result && !playbackRef.current && Date.now() - advanceRef.current > ADVANCE_GAP_MS) {
            advanceRef.current = Date.now();
            await post({ action: 'advance' });
          }
        } catch { /* Offline for a moment: the next poll catches up. */ }
      }
      if (!stopped) timer = setTimeout(loop, POLL_MS);
    };
    void loop();
    return () => { stopped = true; clearTimeout(timer); };
  }, [request, post]);

  const done = useCallback((key: number) => {
    if (playbackRef.current?.key !== key) return;
    const next = pendingRef.current;
    pendingRef.current = null;
    setRushing(false);
    playbackRef.current = next;
    setPlayback(next);
    if (!next) setShown(latestRef.current.match);
  }, []);

  const send = useCallback(async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const { ok, data } = await post(body);
      if (!ok) setError(data?.error ?? 'That did not go through. Please retry.');
    } catch {
      setError('Connection lost. Check your signal and try again.');
    } finally {
      setBusy(false);
    }
  }, [post]);

  const order = useCallback((action: MatchAction) => { void send({ action: 'order', order: action }); }, [send]);
  const submitDesign = useCallback((design: FortressDesign) => { void send({ action: 'design', design }); }, [send]);

  const caughtUp = !playback && seen >= siege.replayTurn;
  return { siege, shown, playback, status, caughtUp, seen, rushing, busy, error, clockOffset, serverNow, done, order, submitDesign };
}
