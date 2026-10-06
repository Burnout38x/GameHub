'use client';
import { useState } from 'react';
import Link from 'next/link';

type OnlineGame = { id: string; slug: string; name: string; description: string; emoji: string; type: string };
type LocalGame = { slug: string; name: string; description: string; emoji: string; meta: string };
const categories: Record<string, string> = { quiz: 'Trivia', prompt: 'Conversation', memory: 'Memory', predict: 'For two', code: 'Deduction', rule: 'Logic', chain: 'Word play', guess: 'Guessing' };
export default function GameLibrary({ online, local }: { online: OnlineGame[]; local: LocalGame[] }) {
  const [search, setSearch] = useState('');
  const matches = (g: {name: string; description: string}) => `${g.name} ${g.description}`.toLowerCase().includes(search.trim().toLowerCase());
  const onlineGames = online.filter(matches);
  const localGames = local.filter(matches);
  return <>
    <div className="flex flex-col gap-4 border-y border-white/10 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-2"><a href="#online" className="pill min-h-11">Online rooms <span className="ml-2 text-white/50">{online.length}</span></a><a href="#local" className="pill min-h-11">Pass & play <span className="ml-2 text-white/50">{local.length}</span></a></div>
      <div className="sm:w-72"><label htmlFor="game-search" className="sr-only">Find a game</label><input id="game-search" className="input !py-2.5" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a game…" /></div>
    </div>
    <section id="online" className="scroll-mt-40" aria-labelledby="online-heading">
      <div className="mb-5"><p className="eyebrow">Your own phones · live scores</p><h2 id="online-heading" className="mt-2 text-2xl font-bold">Meet in a game room</h2><p className="mt-1 text-sm text-white/65">Share a room code and play together, wherever you are. An account is needed for online play.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{onlineGames.map(g=><article key={g.id} className="game-card"><div className="flex items-center justify-between gap-2"><span className="game-icon" aria-hidden="true">{g.emoji}</span><span className="pill">{categories[g.type] ?? 'Party game'}</span></div><div><h3 className="text-lg font-bold">{g.name}</h3><p className="mt-2 text-sm leading-relaxed text-white/65">{g.description}</p></div><div className="mt-auto flex items-center justify-between gap-2 border-t border-white/10 pt-4"><span className="text-xs text-white/60">{g.type==='predict'?'Exactly 2':g.type==='chain'||g.type==='rule'?'2–10':'1–10'} players</span><Link href={`/rooms/new?game=${g.slug}`} className="btn !min-h-11 !w-auto !rounded-xl !px-4 !py-2 !text-sm" aria-label={`Create ${g.name} room`}>Create room ↗</Link></div></article>)}</div>
      {!onlineGames.length && <p className="glass-sm p-6 text-sm text-white/70">{search ? 'No online games match your search.' : 'Online games are unavailable right now. Try a pass-and-play game below.'}</p>}
    </section>
    <section id="local" className="scroll-mt-40" aria-labelledby="local-heading">
      <div className="mb-5"><p className="eyebrow">One device · no account needed</p><h2 id="local-heading" className="mt-2 text-2xl font-bold">Pass the phone around</h2><p className="mt-1 text-sm text-white/65">Sitting together? Add your names and jump straight in.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{localGames.map(g=><article key={g.slug} className="game-card"><span className="game-icon" aria-hidden="true">{g.emoji}</span><div><h3 className="text-lg font-bold">{g.name}</h3><p className="mt-2 text-sm leading-relaxed text-white/65">{g.description}</p></div><p className="mt-auto text-xs leading-relaxed text-[#9cddd2]">{g.meta}</p><Link href={`/games/local/${g.slug}`} className="btn-secondary !min-h-11 !rounded-xl !py-2 !text-sm" aria-label={`Play ${g.name} on one device`}>Play on one device →</Link></article>)}</div>
      {!localGames.length && <p className="glass-sm p-6 text-sm text-white/70">No pass-and-play games match your search.</p>}
    </section>
  </>;
}
