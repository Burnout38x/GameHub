'use client';

import { useState } from 'react';
import Link from 'next/link';
import { socialAction, useSocial } from './client';

/** Render only inside a joined lobby. Backend independently checks lobby membership. */
export default function RoomFriendsInvite({ code }: { code: string }) {
  const { data, error, refresh } = useSocial('', 45_000);
  const [busy, setBusy] = useState('');
  const [sent, setSent] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const friends = [...(data?.following.filter(player => player.followsYou) ?? [])].sort((a, b) => Number(b.online) - Number(a.online));
  async function invite(playerId: string, username: string) {
    if (busy) return;
    setBusy(playerId); setMessage(''); setFailed(false);
    try {
      await socialAction({ action: 'invite', playerId, roomCode: code });
      setSent(current => [...current, playerId]);
      setMessage(`Invite sent to ${username}. It will be waiting when they return, while this lobby is open.`);
    } catch (cause) { setFailed(true); setMessage(cause instanceof Error ? cause.message : 'Could not send your invite. Try again.'); }
    finally { setBusy(''); }
  }
  return <section className="glass-sm p-5" aria-labelledby="invite-friends-heading">
    <h2 id="invite-friends-heading" className="font-black">Invite your friends</h2>
    <p className="mt-1 text-sm text-white/65">Invite mutual friends, online or away. They’ll see it in GameHub when they return.</p>
    {error ? <div className="mt-3"><p role="alert" className="text-sm text-red-300">{error}</p><button className="btn-secondary mt-2 !w-auto !py-2" onClick={() => void refresh()}>Retry</button></div> : !data ? <p className="mt-3 text-sm text-white/65">Loading friends…</p> : !friends.length ? <p className="mt-3 text-sm text-white/65">Follow each other to invite friends. <Link href="/friends" className="underline underline-offset-4">Find your people</Link></p> : <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto p-1">{friends.map(friend => <li key={friend.id} className="flex flex-wrap items-center justify-between gap-2"><div className="min-w-0 flex-1"><p className="break-words text-sm font-bold">{friend.username}</p><p className="text-xs text-white/65">{friend.online ? '● Online now' : 'Can receive an invitation'}</p></div><button className="btn-secondary !w-auto !px-4 !py-2 !text-sm" disabled={!!busy || sent.includes(friend.id)} aria-label={`Invite ${friend.username}`} onClick={() => void invite(friend.id, friend.username)}>{busy === friend.id ? 'Sending…' : sent.includes(friend.id) ? 'Invited' : 'Invite'}</button></li>)}</ul>}
    {message && <p role={failed ? 'alert' : 'status'} className={`mt-3 text-sm ${failed ? 'text-red-300' : 'text-white/65'}`}>{message}</p>}
  </section>;
}
