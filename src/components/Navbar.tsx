import { createClient } from '@/lib/supabase/server';
import NavLinks from './NavLinks';

export default async function Navbar() {
  const supabase = createClient();
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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0918]/80 backdrop-blur-xl">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <NavLinks
          signedIn={!!user}
          username={profile?.username ?? null}
          isAdmin={profile?.role === 'admin'}
        />
      </nav>
    </header>
  );
}
