'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { SocialAction, SocialPlayer } from '@/lib/social-types';
import { socialAction, useSocial } from './client';

export default function FriendsDashboard() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'following' | 'followers'>('following');
  const { data, error, refresh, searching } = useSocial(query);
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  async function act(action: SocialAction, key: string, message: string) {
    if (busy) return;
    setBusy(key); setActionError(''); setNotice('');
    try {
      const result = await socialAction(action);
      if (action.action === 'accept' && result.roomCode) {
        router.push(`/room/${encodeURIComponent(result.roomCode)}`);
      } else { setNotice(message); }
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Connection lost. Please try again.'); }
    finally { setBusy(''); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(search.trim());
    if (query === search.trim()) void refresh();
  }
  function playerRow(player: SocialPlayer) {
    return <li key={player.id} className="glass-sm flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="break-words font-bold">{player.username}</p>
        <p className="mt-1 text-sm text-white/65">{player.following && player.followsYou ? 'Mutual friends' : player.followsYou ? 'Follows you' : player.following ? 'Following' : 'Player'}{player.online && <span className="ml-2 font-semibold text-[var(--accent-cool)]">● Online now</span>}</p>
      </div>
      <button type="button" className="btn-secondary !w-auto !px-4 !py-2 !text-sm" disabled={!!busy} aria-label={`${player.following ? 'Unfollow' : 'Follow'} ${player.username}`} onClick={() => void act({ action: player.following ? 'unfollow' : 'follow', playerId: player.id }, player.id, player.following ? `Unfollowed ${player.username}.` : `Following ${player.username}.`)}>{busy === player.id ? 'Saving…' : player.following ? 'Unfollow' : player.followsYou ? 'Follow back' : 'Follow'}</button>
    </li>;
  }
  return <div className="mx-auto w-full max-w-4xl space-y-6">
    <section className="glass p-6 sm:p-8">
      <span className="pill">Your game-night crew</span>
      <h1 className="mt-4 text-3xl font-black sm:text-4xl">Friends</h1>
      <p className="mt-3 text-white/65">Follow your people, see who’s around, and get the next game going.</p>
      <div className="mt-5 flex flex-wrap gap-3 text-sm"><span className="pill">{data?.followingCount ?? '—'} following</span><span className="pill">{data?.followerCount ?? '—'} followers</span><Link className="nav-link" href="/profile">Your progress →</Link></div>
      <div className="glass-sm mt-6 p-4">
        <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent-cool)]" checked={data?.showOnline ?? false} disabled={!data || !!busy} onChange={event => void act({ action: 'presence', showOnline: event.target.checked, visible: document.visibilityState === 'visible' }, 'privacy', event.target.checked ? 'Online status is visible to mutual friends.' : 'Your online status is hidden.')} /><span><span className="font-bold">Show when I’m online</span><span className="mt-1 block text-sm text-white/65">Only mutual friends can see your status. Hidden by default; turn it off whenever you like.</span></span></label>
      </div>
    </section>
    <div aria-live="polite" role="status" className={notice ? 'glass-sm p-4 text-sm' : 'sr-only'}>{notice}</div>
    {(error || actionError) && <div role="alert" className="glass-sm flex flex-wrap items-center justify-between gap-3 p-4"><p className="text-sm text-red-300">{actionError || error}</p>{error && <button className="btn-secondary !w-auto !py-2" onClick={() => void refresh()}>Retry</button>}</div>}
    <section id="invitations" className="glass scroll-mt-6 p-6 sm:p-8" aria-labelledby="invites-heading">
      <h2 id="invites-heading" className="text-xl font-black">Room invitations</h2>
      <p className="mt-2 text-sm text-white/65">Mutual friends can invite you from their room. Invites wait here when you’re away, for up to 24 hours while the lobby stays open.</p>
      {!data ? <p className="mt-4 text-sm text-white/65">Loading invitations…</p> : !data.invitations.length ? <div className="glass-sm mt-4 p-5"><p className="font-bold">No invitations yet</p><p className="mt-1 text-sm text-white/65">Start a room and invite your friends to join you.</p><Link href="/rooms" className="btn-secondary mt-4 !w-auto">Find or create a room</Link></div> : <ul className="mt-4 space-y-3">{data.invitations.map(invite => <li key={invite.id} className="glass-sm p-4">
        <p className="break-words font-bold">{invite.sender.username} invited you to play</p><p className="mt-1 text-sm text-white/65">{invite.gameName} · {invite.available ? `Room ${invite.roomCode}` : 'This room is no longer available'}</p>
        {invite.available && <p className="mt-1 text-xs text-white/55">Expires {new Date(invite.expiresAt).toLocaleString()}</p>}
        <div className="mt-4 flex flex-wrap gap-3"><button className="btn !w-auto !px-4 !py-2 !text-sm" disabled={!!busy || !invite.available} onClick={() => void act({ action: 'accept', inviteId: invite.id }, invite.id, '')}>{busy === invite.id ? 'Updating…' : 'Join room'}</button><button className="btn-secondary !w-auto !px-4 !py-2 !text-sm" disabled={!!busy} onClick={() => void act({ action: 'decline', inviteId: invite.id }, invite.id, 'Invitation dismissed.')}>{invite.available ? 'Decline' : 'Dismiss'}</button></div>
      </li>)}</ul>}
    </section>
    <section className="glass p-6 sm:p-8" aria-labelledby="find-heading">
      <h2 id="find-heading" className="text-xl font-black">Find your people</h2>
      <form onSubmit={submit} className="mt-4 flex flex-wrap gap-3"><label className="min-w-0 flex-1 basis-48"><span className="sr-only">Search usernames</span><input type="search" className="input" placeholder="Search by username…" minLength={2} maxLength={40} value={search} onChange={event => setSearch(event.target.value)} /></label><button type="submit" className="btn !w-auto" disabled={search.trim().length < 2}>Search</button>{query && <button type="button" className="btn-secondary !w-auto" onClick={() => { setQuery(''); setSearch(''); }}>Clear</button>}</form>
      {query && <div className="mt-5" aria-live="polite"><h3 className="text-sm font-bold">Matches for “{query}”</h3><p className="mt-1 text-xs text-white/55">Up to 20 players. Try a more specific username if needed.</p>{searching ? <p className="mt-3 text-sm text-white/65">{error ? 'Search could not load. Please retry.' : 'Searching players…'}</p> : data && data.results.length ? <ul className="mt-3 space-y-3">{data.results.map(playerRow)}</ul> : <p className="mt-3 text-sm text-white/65">No matching players.</p>}</div>}
    </section>
    <section className="glass p-6 sm:p-8" aria-labelledby="crew-heading">
      <h2 id="crew-heading" className="text-xl font-black">Your people</h2>
      <p className="mt-2 text-sm text-white/65">Follow each other to become mutual friends and send room invitations.</p>
      <div className="mt-4 flex flex-wrap gap-2" aria-label="Choose a people list">{(['following', 'followers'] as const).map(value => <button key={value} className={tab === value ? 'btn !w-auto !px-4 !py-2 !text-sm' : 'btn-secondary !w-auto !px-4 !py-2 !text-sm'} aria-pressed={tab === value} onClick={() => setTab(value)}>{value === 'following' ? 'Following' : 'Followers'}</button>)}</div>
      {!data ? <p className="mt-4 text-sm text-white/65">Loading your people…</p> : data[tab].length ? <><ul className="mt-4 space-y-3">{data[tab].map(playerRow)}</ul>{data[tab].length >= 100 && <p className="mt-3 text-xs text-white/55">Showing up to 100 people. Search by username to find someone else.</p>}</> : <p className="glass-sm mt-4 p-5 text-sm text-white/65">{tab === 'following' ? 'Your crew starts here. Search for someone you know and follow them.' : 'No followers yet. Share your username with friends so they can find you.'}</p>}
    </section>
  </div>;
}
