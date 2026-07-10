'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignOutButton from './SignOutButton';
import { registrationAvailable } from '@/lib/config';

export default function NavLinks({
  signedIn,
  username,
  isAdmin,
}: {
  signedIn: boolean;
  username: string | null;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const locked = pathname?.startsWith('/room/');

  const brand = (
    <span className="flex items-center gap-2 text-xl font-black tracking-tight">
      <span>🎮</span>
      <span>
        Game<span className="text-indigo-300">Hub</span>
      </span>
    </span>
  );

  if (locked) {
    return (
      <>
        {brand}
        <span className="pill">🎮 In game</span>
      </>
    );
  }

  return (
    <>
      <Link href="/">{brand}</Link>
      <div className="flex items-center gap-2 sm:gap-3">
        {signedIn ? (
          <>
            <Link href="/games" className="pill hidden sm:block">
              Games
            </Link>
            <Link href="/rooms" className="pill hidden sm:block">
              Rooms
            </Link>
            <Link href="/leaderboard" className="pill hidden sm:block">
              Leaderboard
            </Link>
            {isAdmin && (
              <Link href="/admin" className="pill !text-amber-200">
                Admin
              </Link>
            )}
            <Link href="/profile" className="pill">
              {username ?? 'Profile'}
            </Link>
            <SignOutButton />
          </>
        ) : (
          <>
            <Link href="/login" className="pill">
              Log in
            </Link>
            {registrationAvailable && (
              <Link
                href="/register"
                className="rounded-full px-4 py-2 text-[13px] font-extrabold text-[#0a0918]"
                style={{ background: 'linear-gradient(135deg,#a5b4fc,#f9a8d4)' }}
              >
                Sign up
              </Link>
            )}
          </>
        )}
      </div>
    </>
  );
}
