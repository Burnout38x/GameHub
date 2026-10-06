'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
const links = [['/admin', 'Overview'], ['/admin/users', 'Users & accounts'], ['/admin/reports', 'Reports'], ['/admin/games', 'Games'], ['/admin/prompts', 'Prompts']];
export default function AdminNav() {
  const pathname = usePathname();
  return <nav aria-label="Admin sections" className="flex flex-wrap gap-2">{links.map(([href, label]) => {
    const active = href === '/admin' ? pathname === href : pathname.startsWith(href);
    return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={active ? 'btn !min-h-11 !w-auto !px-4 !py-2 !text-sm' : 'pill min-h-11'}>{label}</Link>;
  })}</nav>;
}
