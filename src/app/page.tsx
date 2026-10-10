import Link from 'next/link';
import GamePicker from '@/components/GamePicker';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: games } = await supabase.from('games').select('slug, name, description, emoji, type').eq('is_active', true).order('sort_order').limit(3);
  return <div className="flex flex-col gap-10">
    <section className="grid items-center gap-8 py-6 sm:py-10 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <p className="eyebrow">A little friendly competition</p>
        <h1 className="mt-4 max-w-xl text-5xl font-black leading-[1.06] tracking-tight sm:text-6xl">Good company.<br /><span className="text-[#f7bd78]">Great game nights.</span></h1>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">For your favorite person, your family, or the whole group chat. Find a game and make a little time for each other.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/games" className="btn sm:!w-auto">Find your next game →</Link>
          <Link href="/rooms/join" className="btn-secondary sm:!w-auto">Join with a code</Link>
        </div>
        <p className="mt-5 text-sm text-white/55">Around one table or miles apart. Everyone’s invited.</p>
      </div>
      <GamePicker />
    </section>
    <section aria-labelledby="ways-to-play">
      <h2 id="ways-to-play" className="text-2xl font-bold tracking-tight">Your people. Your way to play.</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Link href="/games#online" className="game-card group"><span className="text-sm font-semibold text-[#9cddd2]">Different devices</span><h3 className="text-xl font-bold">One room, everyone together ↗</h3><p className="text-sm leading-relaxed text-white/65">Create a room, share the code, and play live on your own phones. Sign in to keep your scores.</p></Link>
        <Link href="/games#local" className="game-card group"><span className="text-sm font-semibold text-[#9cddd2]">One shared screen</span><h3 className="text-xl font-bold">Pass the phone. Bring the fun. ↗</h3><p className="text-sm leading-relaxed text-white/65">Gather 2–6 people for pass-and-play games. No account or room code needed.</p></Link>
      </div>
    </section>
    {!!games?.length && <section><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-2xl font-bold tracking-tight">Start with a crowd favorite</h2><Link href="/games" className="nav-link !text-[#9cddd2]">All games →</Link></div><div className="grid gap-4 sm:grid-cols-3">{games.map(g => <Link href={g.type === 'battle' ? `/play/${g.slug}` : `/rooms/new?game=${g.slug}`} key={g.slug} className="game-card"><span className="game-icon" aria-hidden="true">{g.emoji}</span><h3 className="text-lg font-bold">{g.name}</h3><p className="text-sm leading-relaxed text-white/65">{g.description}</p><span className="mt-auto text-sm font-bold text-[#f7bd78]">{g.type === 'battle' ? 'Enter the war room →' : 'Create a room →'}</span></Link>)}</div></section>}
  </div>;
}
