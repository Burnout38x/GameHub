import { createClient } from '@/lib/supabase/server';
import NavLinks from './NavLinks';

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { username: string; role: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('username, role')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[var(--canvas)]/95 backdrop-blur-xl">
      <nav className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <NavLinks
          signedIn={!!user}
          username={profile?.username ?? null}
          isAdmin={profile?.role === 'admin'}
        />
        <form action="/games" method="get" role="search" aria-label="Search the game library" className="flex w-full items-center gap-2">
          <label htmlFor="nav-game-search" className="sr-only">Search games</label>
          <input id="nav-game-search" name="q" type="search" maxLength={100} className="input min-w-0 flex-1 !rounded-full !py-2.5" placeholder="Search games, puzzles, trivia…" />
          <button type="submit" className="btn !w-auto !rounded-full !px-5 !py-2.5">Search</button>
        </form>
      </nav>
    </header>
  );
}
