import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: games } = await supabase
    .from('games')
    .select('slug, name, description, emoji')
    .eq('is_active', true)
    .order('sort_order')
    .limit(6);

  return (
    <div className="flex flex-col gap-8">
      <section className="glass flex flex-col items-center gap-6 px-6 py-14 text-center sm:py-20">
        <div className="pill">🌍 Long-distance game nights, solved</div>
        <h1 className="max-w-2xl text-5xl font-black leading-[0.98] tracking-tighter sm:text-6xl">
          Play Games <span className="text-indigo-300">With The People You Love</span>
        </h1>
        <p className="max-w-xl text-white/75 sm:text-lg">
          Create a room, share a 6-letter code, and play trivia, riddles, emoji movies,
          challenges and more — live, on your own phones, from anywhere in the world.
        </p>
        <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
          {user ? (
            <>
              <Link href="/rooms/new" className="btn">
                ➕ Create Room
              </Link>
              <Link href="/rooms/join" className="btn-secondary">
                ⇥ Join Room
              </Link>
            </>
          ) : (
            <>
              <Link href="/register" className="btn">
                Get Started Free
              </Link>
              <Link href="/login" className="btn-secondary">
                Log in
              </Link>
            </>
          )}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight">Featured Games</h2>
          <Link href={user ? '/games' : '/register'} className="text-sm font-bold text-indigo-300">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(games ?? []).map((g) => (
            <div key={g.slug} className="glass flex flex-col gap-2 p-5">
              <div className="text-4xl">{g.emoji}</div>
              <div className="text-lg font-black">{g.name}</div>
              <p className="text-sm leading-relaxed text-white/65">{g.description}</p>
            </div>
          ))}
          {(games ?? []).length === 0 && (
            <div className="glass col-span-full p-6 text-white/60">
              No games yet — run <code className="text-indigo-300">supabase/schema.sql</code> and{' '}
              <code className="text-indigo-300">node scripts/seed-prompts.mjs</code> to load them.
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ['1️⃣', 'Create or join', 'Pick a game, choose easy or hard, set the rounds, get a code.'],
          ['2️⃣', 'Play live', 'Everyone answers on their own phone — scores sync in real time.'],
          ['3️⃣', 'Climb the board', 'Wins, streaks and achievements are tracked forever.'],
        ].map(([e, t, d]) => (
          <div key={t} className="glass p-5">
            <div className="text-2xl">{e}</div>
            <div className="mt-2 font-black">{t}</div>
            <p className="mt-1 text-sm text-white/65">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
