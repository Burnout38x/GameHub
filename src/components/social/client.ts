'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SocialAction, SocialDashboard } from '@/lib/social-types';

export const SOCIAL_UPDATED = 'gamehub:social-updated';

export async function socialAction(action: SocialAction) {
  const response = await fetch('/api/social', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.');
  if (action.action !== 'presence' || action.showOnline !== undefined) {
    window.dispatchEvent(new Event(SOCIAL_UPDATED));
  }
  return result as { ok: true; roomCode?: string };
}

export function useSocial(query = '', interval = 30_000) {
  const [data, setData] = useState<SocialDashboard | null>(null);
  const [error, setError] = useState('');
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    try {
      const response = await fetch(`/api/social${query ? `?q=${encodeURIComponent(query)}` : ''}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load your friends.');
      if (current === sequence.current) { setData(result); setLoadedQuery(query); setError(''); }
    } catch (cause) {
      if (current === sequence.current) setError(cause instanceof Error ? cause.message : 'Connection lost. Please try again.');
    }
  }, [query]);
  useEffect(() => {
    const requestSequence = sequence;
    const visibleRefresh = () => { if (document.visibilityState === 'visible') void refresh(); };
    visibleRefresh();
    const timer = window.setInterval(visibleRefresh, interval);
    document.addEventListener('visibilitychange', visibleRefresh);
    window.addEventListener(SOCIAL_UPDATED, visibleRefresh);
    return () => {
      requestSequence.current++;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visibleRefresh);
      window.removeEventListener(SOCIAL_UPDATED, visibleRefresh);
    };
  }, [refresh, interval]);
  return { data, error, refresh, searching: loadedQuery !== query };
}
