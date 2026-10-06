'use client';
import { useState } from 'react';
import Link from 'next/link';
import { gameCategoryLabel, matchesGame, type LibraryFilters, type GameMode } from '@/lib/game-library';

type OnlineGame = { id: string; slug: string; name: string; description: string; emoji: string; type: string };
type LocalGame = { slug: string; name: string; description: string; emoji: string; meta: string };
const initialFilters: LibraryFilters = { search: '', category: 'all', audience: 'all', mode: 'all' };
const modes: { id: GameMode; label: string }[] = [{ id: 'all', label: 'All ways to play' }, { id: 'online', label: 'Online rooms' }, { id: 'local', label: 'Pass & play' }];

export default function GameLibrary({ online, local, initialSearch = '' }: { online: OnlineGame[]; local: LocalGame[]; initialSearch?: string }) {
  const [filters, setFilters] = useState<LibraryFilters>({ ...initialFilters, search: initialSearch });
  const onlineGames = online.filter(game => matchesGame(game, filters, 'online'));
  const localGames = local.filter(game => matchesGame(game, filters, 'local'));
  const onlineCount = online.filter(game => matchesGame(game, { ...filters, mode: 'all' }, 'online')).length;
  const localCount = local.filter(game => matchesGame(game, { ...filters, mode: 'all' }, 'local')).length;
  const count = onlineGames.length + localGames.length;
  const filtered = Object.keys(initialFilters).some(key => filters[key as keyof LibraryFilters] !== initialFilters[key as keyof LibraryFilters]);
  return <>
    <div className="glass-sm space-y-4 p-4 sm:p-5">
      <div role="search" aria-label="Search the game library">
        <label htmlFor="game-search" className="mb-3 block text-sm font-bold">Find a game</label>
        <input id="game-search" className="input !min-h-14 !rounded-full !px-5" type="search" maxLength={100} value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value })} placeholder="Search games, categories or keywords…" />
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Ways to play">{modes.map(mode => <button key={mode.id} type="button" className={`${filters.mode === mode.id ? 'btn' : 'btn-secondary'} !min-h-11 !w-auto !px-4 !py-2 !text-sm`} aria-pressed={filters.mode === mode.id} onClick={() => setFilters({ ...filters, mode: mode.id })}>{mode.label} <span className="ml-1 opacity-70">{mode.id === 'online' ? onlineCount : mode.id === 'local' ? localCount : onlineCount + localCount}</span></button>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-2"><p role="status" className="text-sm text-white/65">{count} {count === 1 ? 'game' : 'games'} to explore{filters.mode === 'all' ? ' across both play modes' : ''}.</p>{filtered && <button type="button" className="btn-ghost !min-h-11 !w-auto !px-3 !py-2 !text-sm" onClick={() => setFilters(initialFilters)}>Reset filters</button>}</div>
    </div>
    {count === 0 && <div className="glass-sm p-6 text-center"><h2 className="text-lg font-bold">No games found</h2><p className="mt-2 text-sm text-white/65">Try another search or show all games to explore the library.</p><button className="btn-secondary mx-auto mt-4 !w-auto" onClick={() => setFilters(initialFilters)}>Show all games</button></div>}
    {filters.mode !== 'local' && <section id="online" className="scroll-mt-40" aria-labelledby="online-heading">
      <div className="mb-5"><p className="eyebrow">Your own phones · live scores</p><h2 id="online-heading" className="mt-2 text-2xl font-bold">Meet in a game room <span className="text-white/50">({onlineGames.length})</span></h2><p className="mt-1 text-sm text-white/65">Share a room code and play together, wherever you are. An account is needed for online play.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{onlineGames.map(game => <article key={game.id} className="game-card"><div className="flex items-center justify-between gap-2"><span className="game-icon" aria-hidden="true">{game.emoji}</span><span className="pill">{gameCategoryLabel(game)}</span></div><div><h3 className="text-lg font-bold">{game.name}</h3><p className="mt-2 text-sm leading-relaxed text-white/65">{game.description}</p></div><div className="mt-auto flex items-center justify-between gap-2 border-t border-white/10 pt-4"><span className="text-xs text-white/60">{game.type === 'predict' ? 'Exactly 2' : game.type === 'chain' || game.type === 'rule' ? '2–10' : '1–10'} players</span><Link href={`/rooms/new?game=${game.slug}`} className="btn !min-h-11 !w-auto !rounded-xl !px-4 !py-2 !text-sm" aria-label={`Create ${game.name} room`}>Create room ↗</Link></div></article>)}</div>
      {!onlineGames.length && count > 0 && <p className="glass-sm p-6 text-sm text-white/70">{online.length ? 'No online games match these filters. Try a pass-and-play pick below.' : 'Online games are unavailable right now. Try a pass-and-play game below.'}</p>}
    </section>}
    {filters.mode !== 'online' && <section id="local" className="scroll-mt-40" aria-labelledby="local-heading">
      <div className="mb-5"><p className="eyebrow">One device · no account needed</p><h2 id="local-heading" className="mt-2 text-2xl font-bold">Pass the phone around <span className="text-white/50">({localGames.length})</span></h2><p className="mt-1 text-sm text-white/65">Sitting together? Add your names and jump straight in.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{localGames.map(game => <article key={game.slug} className="game-card"><div className="flex items-center justify-between gap-2"><span className="game-icon" aria-hidden="true">{game.emoji}</span><span className="pill">{gameCategoryLabel(game)}</span></div><div><h3 className="text-lg font-bold">{game.name}</h3><p className="mt-2 text-sm leading-relaxed text-white/65">{game.description}</p></div><p className="mt-auto text-xs leading-relaxed text-[#9cddd2]">{game.meta}</p><Link href={`/games/local/${game.slug}`} className="btn-secondary !min-h-11 !rounded-xl !py-2 !text-sm" aria-label={`Play ${game.name} on one device`}>Play on one device →</Link></article>)}</div>
      {!localGames.length && count > 0 && <p className="glass-sm p-6 text-sm text-white/70">No pass-and-play games match these filters. Try an online room above.</p>}
    </section>}
  </>;
}
