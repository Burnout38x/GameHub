'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Keeps a phone in step with a live room game on the server. */

interface LiveViewBase { version: number; ended: boolean; deadline: number }
interface Payload<V> { view: V; status: string; serverNow: number; error?: string }

const POLL_MS = 1000;
const TICK_MS = 200;
/** Ask the server to move a timed phase on a moment after its deadline passes. */
const ADVANCE_GRACE_MS = 350;
const RETRY_MS = 900;

export interface LiveRoom<V> {
  view: V;
  /** Server time, ticking smoothly between polls. */
  now: number;
  busy: boolean;
  error: string | null;
  send: (move: Record<string, unknown>) => Promise<boolean>;
  /** Fetch now, e.g. the moment a hidden question goes live. */
  refresh: () => void;
  /** Milliseconds to add to this device's clock to get server time. */
  offset: () => number;
}

export function useLiveRoom<V extends LiveViewBase>(code: string, initial: V, onFinished: () => void): LiveRoom<V> {
  const [view, setView] = useState(initial);
  // 0 until the first tick (a fraction of a second): screens treat it as "full time left".
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);
  const versionRef = useRef(initial.version);
  const viewRef = useRef(initial);
  const advancedRef = useRef('');
  const finishedRef = useRef(onFinished);
  useEffect(() => { finishedRef.current = onFinished; }, [onFinished]);

  const absorb = useCallback((data: Payload<V>) => {
    if (typeof data.serverNow === 'number') offsetRef.current = data.serverNow - Date.now();
    if (data.view && data.view.version >= versionRef.current) {
      versionRef.current = data.view.version;
      viewRef.current = data.view;
      setView(data.view);
    }
    if (data.status === 'finished') finishedRef.current();
  }, []);

  const url = `/api/rooms/${encodeURIComponent(code)}/live`;

  const post = useCallback(async (body: Record<string, unknown>) => {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (data?.view) absorb(data as Payload<V>);
    return { ok: response.ok, error: typeof data?.error === 'string' ? data.error : null };
  }, [absorb, url]);

  const send = useCallback(async (move: Record<string, unknown>) => {
    setBusy(true);
    try {
      const result = await post({ action: 'move', move });
      setError(result.ok ? null : result.error ?? 'That move did not go through.');
      return result.ok;
    } catch {
      setError('Connection lost. Check your signal and try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [post]);

  const refresh = useCallback(() => {
    fetch(url, { cache: 'no-store' }).then(response => (response.ok ? response.json() : null)).then(data => { if (data) absorb(data); }).catch(() => undefined);
  }, [absorb, url]);
  const offset = useCallback(() => offsetRef.current, []);

  // Poll for everyone else's moves.
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const response = await fetch(url, { cache: 'no-store' });
          if (response.ok) absorb(await response.json());
        } catch { /* the next poll retries */ }
      }
      if (!stopped) timer = setTimeout(poll, POLL_MS);
    };
    timer = setTimeout(poll, POLL_MS);
    return () => { stopped = true; clearTimeout(timer); };
  }, [absorb, url]);

  // A smooth clock for countdowns, and a nudge when a timed phase is due.
  useEffect(() => {
    const id = setInterval(() => {
      const serverNow = Date.now() + offsetRef.current;
      setNow(serverNow);
      const current = viewRef.current;
      const key = `${current.version}:${current.deadline}`;
      if (!current.ended && serverNow > current.deadline + ADVANCE_GRACE_MS && advancedRef.current !== key) {
        advancedRef.current = key;
        // A busy room (409/503) or a dropped connection: try again on a later tick.
        const retry = () => { setTimeout(() => { if (advancedRef.current === key) advancedRef.current = ''; }, RETRY_MS); };
        void post({ action: 'advance' }).then(result => { if (!result.ok) retry(); }, retry);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [post]);

  return { view, now, busy, error, send, refresh, offset };
}

/** Seconds left on a deadline, for countdown rings. */
export const secondsLeft = (deadline: number, now: number, cap = Infinity) => (now ? Math.min(cap, Math.max(0, Math.ceil((deadline - now) / 1000))) : cap);
