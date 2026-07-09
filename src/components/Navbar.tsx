import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import SignOutButton from './SignOutButton';

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
        <Link href="/" className="flex items-center gap-2 text-xl font-black tracking-tight">
          <span>🎮</span>
          <span>
            Game<span className="text-indigo-300">Hub</span>
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <Link href="/games" className="pill hidden sm:block">
                Games
              </Link>
              <Link href="/leaderboard" className="pill hidden sm:block">
                Leaderboard
              </Link>
              {profile?.role === 'admin' && (
                <Link href="/admin" className="pill !text-amber-200">
                  Admin
                </Link>
              )}
              <Link href="/profile" className="pill">
                {profile?.username ?? 'Profile'}
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="pill">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full px-4 py-2 text-[13px] font-extrabold text-[#0a0918]"
                style={{ background: 'linear-gradient(135deg,#a5b4fc,#f9a8d4)' }}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
