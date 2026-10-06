'use client';
import { useState } from 'react';
import Link from 'next/link';

const picks = [
  { name: 'Know Your Partner', emoji: '💞', slug: 'know-your-partner', detail: 'For two people who still have a few surprises.' },
  { name: 'Code Crackers', emoji: '🔐', slug: 'code-crackers', detail: 'A secret code. A few clues. Your best detective work.' },
  { name: 'Mystery Card', emoji: '🕵️', slug: 'mystery-card', detail: 'Gather your people and race to solve the clue.' },
  { name: 'Word Association Chain', emoji: '🔗', slug: 'word-chain', detail: 'One word leads to another. Keep the connection going.' },
];

export default function GamePicker() {
  const [pick, setPick] = useState<number | null>(null);
  function draw() {
    const others = picks.map((_, i) => i).filter(i => i !== pick);
    setPick(others[Math.floor(Math.random() * others.length)]);
  }
  const game = pick === null ? null : picks[pick];
  return <div className="glass game-picker overflow-hidden">
    <div className="flex items-center justify-between border-b border-white/10 px-6 py-4"><span className="text-sm font-semibold text-white/70">Tonight’s plan</span><span aria-hidden="true">✦</span></div>
    <div className="p-6 sm:p-8">
      <div className="card-hand" aria-hidden="true">{['💞', '🔐', '🕵️', '🔗'].map((emoji,i)=><span key={emoji} className="dealt-card" style={{ '--card-index': i } as React.CSSProperties}>{emoji}</span>)}</div>
      <div className="min-h-36" aria-live="polite" aria-atomic="true">
        {game ? <div className="suggestion-enter" key={game.slug}><p className="text-sm font-semibold text-[#9cddd2]">Your next game</p><h2 className="mt-2 text-2xl font-bold">{game.emoji} {game.name}</h2><p className="mt-3 text-sm leading-relaxed text-white/65">{game.detail}</p></div> : <><h2 className="text-2xl font-bold">Can’t decide?<br />Let’s draw a game.</h2><p className="mt-3 text-sm leading-relaxed text-white/65">Something fun for one shared screen. No account needed.</p></>}
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {game && <Link href={`/games/local/${game.slug}`} className="btn">Play this game →</Link>}
        <button type="button" onClick={draw} className={game ? 'btn-secondary' : 'btn'}>{game ? 'Draw another game' : 'Pick a game for us'}</button>
      </div>
    </div>
  </div>;
}
