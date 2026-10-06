'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import SignOutButton from './SignOutButton';
import { registrationAvailable } from '@/lib/config';

export default function NavLinks({ signedIn, username, isAdmin }: {
  signedIn: boolean; username: string | null; isAdmin: boolean;
}) {
  const pathname = usePathname();
  const locked = pathname?.startsWith('/room/');
  const brand = <span className="flex items-center gap-2 text-lg font-black sm:text-xl tracking-tight"><span aria-hidden="true" className="grid h-8 w-8 place-items-center sm:h-9 sm:w-9 rounded-xl bg-[#f7bd78] text-lg">🎲</span><span>Game<span className="text-[#9cddd2]">Hub</span></span></span>;
  if (locked) return <>{brand}<div className="flex items-center gap-2"><span className="pill">Game room</span><ThemeToggle /></div></>;
  const links = [['/games', 'Games'], ['/rooms', 'Rooms'], ['/leaderboard', 'Leaderboard']];
  return <>
    <Link href="/" aria-label="GameHub home">{brand}</Link>
    <div className="flex min-w-0 items-center gap-2">
      <ThemeToggle />
      {signedIn ? <>
        <Link href="/profile" className="nav-link max-w-32 truncate" aria-current={pathname === '/profile' ? 'page' : undefined}>{username ?? 'Profile'}</Link>
        <SignOutButton />
      </> : <>
        <Link href="/login" className="nav-link !px-2">Log in</Link>
        {registrationAvailable && <Link href="/register" className="btn !min-h-11 !w-auto !rounded-xl !px-3 !py-2 !text-sm sm:!px-4">Sign up</Link>}
      </>}
    </div>
    <div className="flex w-full flex-wrap items-center gap-1 border-t border-white/10 pt-2" aria-label="Main navigation">
      {links.map(([href, label]) => <Link key={href} href={href} className="nav-link !px-2 !text-xs sm:!px-3 sm:!text-sm" aria-current={pathname === href || pathname?.startsWith(href + '/') ? 'page' : undefined}>{label}</Link>)}
      {isAdmin && <Link href="/admin" className="nav-link" aria-current={pathname?.startsWith('/admin') ? 'page' : undefined}>Admin</Link>}
      <Link href="/rooms/join" className="nav-link ml-auto !px-2 !text-xs !text-[#f7bd78] sm:!text-sm" aria-label="Join with a code"><span className="sm:hidden">Join ↗</span><span className="hidden sm:inline">Join with code ↗</span></Link>
    </div>
  </>;
}
