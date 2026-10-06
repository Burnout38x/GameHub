import Link from 'next/link';
import { requireAdmin } from '@/lib/server/admin-access';
import { reportPeriod, type UsageReport } from '@/lib/admin-reports';

export const dynamic = 'force-dynamic';
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { admin } = await requireAdmin();
  const { days, since } = reportPeriod((await searchParams).days);
  const [usage, inbox] = await Promise.all([
    admin.rpc('admin_usage_report', { since }),
    admin.from('player_reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);
  const report = usage.data as UsageReport | null;
  return <section className="flex flex-col gap-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">See how game night is going</p><h2 className="mt-2 text-2xl font-black">Reports & insights</h2><p className="mt-2 text-sm text-white/65">Online activity over the last {days} calendar days, including today. Dates use UTC.</p></div><Link href="/admin/reports/inbox" className="btn-secondary !w-auto">Player reports{inbox.error ? '' : ` · ${inbox.count ?? 0} open`} →</Link></div>
    <nav aria-label="Report period" className="flex flex-wrap gap-2">{[7, 30, 90].map(n => <Link key={n} href={`/admin/reports?days=${n}`} className={n === days ? 'btn !w-auto !px-5 !py-2' : 'pill'} aria-current={n === days ? 'page' : undefined}>{n} days</Link>)}</nav>
    {usage.error || !report ? <div className="glass p-6" role="alert"><h3 className="font-bold">Usage report is unavailable</h3><p className="mt-2 text-sm text-white/65">Please retry in a moment.</p><Link className="btn-secondary mt-4 !w-auto" href={`/admin/reports?days=${days}`}>Retry report</Link></div> : <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{[
        ['Total players', report.totalProfiles, 'All registered player profiles'],
        ['New players', report.newProfiles, `Joined in these ${days} days`],
        ['Active players', report.activePlayers, 'Players with a recorded result'],
        ['Rooms created', report.roomsCreated, 'Includes waiting and finished rooms'],
        ['Finished rooms', report.roomsFinished, 'Of the rooms created in this period'],
        ['Player results', report.playerResults, 'One result per player per completed game'],
      ].map(([title, value, help]) => <div key={title} className="glass p-4 sm:p-5"><p className="text-sm font-bold text-white/70">{title}</p><p className="mt-2 text-3xl font-black">{value}</p><p className="mt-2 text-xs leading-relaxed text-white/60">{help}</p></div>)}</div>
      <section className="glass p-5" aria-labelledby="activity-title"><h3 id="activity-title" className="text-lg font-bold">Daily room activity</h3><p className="mt-1 text-sm text-white/65">Rooms created each day. Pass-and-play activity stays on players’ devices.</p>
        <div className="mt-5 flex h-32 items-end gap-1" role="img" aria-label={`${report.roomsCreated} rooms created in ${days} days. Exact daily values follow in the activity table.`}>{report.daily.map(day => <div key={day.day} title={`${day.day}: ${day.rooms} rooms`} className="min-w-0 flex-1 rounded-t-md bg-[var(--accent)]" style={{ height: `${day.rooms ? Math.max(4, day.rooms / Math.max(1, ...report.daily.map(d => d.rooms)) * 100) : 2}%`, opacity: day.rooms ? 1 : .25 }} />)}</div>
        <details className="mt-4"><summary className="cursor-pointer py-2 text-sm font-bold">Daily numbers</summary><div className="max-h-72 overflow-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Daily online activity in UTC</caption><thead><tr><th className="py-3">Day (UTC)</th><th className="py-3 text-right">Rooms</th><th className="py-3 text-right">Player results</th></tr></thead><tbody>{report.daily.slice().reverse().map(d => <tr key={d.day} className="border-t border-white/10"><td className="py-2">{d.day}</td><td className="text-right">{d.rooms}</td><td className="text-right">{d.playerResults}</td></tr>)}</tbody></table></div></details>
      </section>
      <section aria-labelledby="popular-title"><h3 id="popular-title" className="mb-4 text-xl font-bold">Games your players choose</h3>{!report.roomsCreated && <p className="mb-4 text-sm text-white/65">No rooms were created in this period. Counts will appear as your community plays.</p>}<div className="grid gap-3 sm:grid-cols-2">{report.games.map(game => <article key={game.id} className="glass-sm p-4"><h4 className="font-bold">{game.emoji} {game.name}</h4><dl className="mt-3 grid grid-cols-3 gap-2 text-sm"><div><dt className="text-xs text-white/60">Rooms</dt><dd className="mt-1 font-bold">{game.rooms}</dd></div><div><dt className="text-xs text-white/60">Finished</dt><dd className="mt-1 font-bold">{game.finished}</dd></div><div><dt className="text-xs text-white/60">Player results</dt><dd className="mt-1 font-bold">{game.playerResults}</dd></div></dl></article>)}</div></section>
    </>}
  </section>;
}
