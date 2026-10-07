'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { socialAction, useSocial } from './client';

/** Mount once, for signed-in players only. Presence is opt-in on the Friends page. */
export default function SocialPresence() {
  const { data } = useSocial('', 60_000);
  useEffect(() => {
    let pending = false;
    const heartbeat = async () => {
      if (pending) return;
      pending = true;
      try { await socialAction({ action: 'presence', visible: document.visibilityState === 'visible' }); }
      catch { /* Presence is best-effort; its timestamp expires automatically. */ }
      finally { pending = false; }
    };
    const visibleHeartbeat = () => { if (document.visibilityState === 'visible') void heartbeat(); };
    void heartbeat();
    const timer = window.setInterval(visibleHeartbeat, 30_000);
    document.addEventListener('visibilitychange', heartbeat);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', heartbeat); };
  }, []);
  const count = data?.invitations.filter(invite => invite.available).length ?? 0;
  if (!count) return null;
  return <Link href="/friends#invitations" className="nav-link" aria-label={`${count} room ${count === 1 ? 'invite' : 'invites'}. Open friends to review.`}>
    <span aria-hidden="true">✉</span><span>{count} {count === 1 ? 'invite' : 'invites'}</span>
  </Link>;
}
