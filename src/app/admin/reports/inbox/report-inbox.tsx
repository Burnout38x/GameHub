'use client';
import { useEffect, useState } from 'react';
import type { PlayerReport, ReportStatus } from '@/lib/reports';
export default function ReportInbox() {
  const [status, setStatus] = useState<ReportStatus>('open');
  const [page, setPage] = useState(1);
  const [reports, setReports] = useState<PlayerReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError('');
      try {
        const response = await fetch(`/api/admin/reports?status=${status}&page=${page}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load reports.');
        if (!controller.signal.aborted) { setReports(data.reports); setTotal(data.total); }
      } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Connection lost. Please retry.'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [status, page, revision]);
  async function update(report: PlayerReport) {
    setBusy(report.id); setError(''); setNotice('');
    try {
      const nextStatus = report.status === 'open' ? 'resolved' : 'open';
      const response = await fetch('/api/admin/reports', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: report.id, status: nextStatus }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update report.');
      setNotice(nextStatus === 'resolved' ? 'Report resolved.' : 'Report reopened.');
      if (reports.length === 1 && page > 1) setPage(page - 1);
      else setRevision(value => value + 1);
    } catch (err) { setError(err instanceof Error ? err.message : 'Connection lost. Please retry.'); }
    finally { setBusy(null); }
  }
  return <div className="space-y-4">
    <div className="flex gap-2" aria-label="Report status">{(['open', 'resolved'] as const).map(value => <button key={value} className={`${status === value ? 'btn' : 'btn-secondary'} !w-auto px-5 capitalize`} disabled={busy !== null} aria-pressed={status === value} onClick={() => { setStatus(value); setPage(1); setNotice(''); }}>{value}</button>)}</div>
    {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
    {error && <div role="alert" className="glass p-4"><p className="text-red-300">{error}</p><button className="btn-secondary mt-3 !w-auto px-5" onClick={() => setRevision(value => value + 1)}>Retry loading</button></div>}
    {loading ? <p role="status" className="glass p-6 text-white/65">Loading reports…</p> : !error && <>
      <p className="text-sm text-white/60">{total} {status} {total === 1 ? 'report' : 'reports'}</p>
      {!reports.length && <div className="glass p-8 text-center"><h3 className="font-bold">No {status} reports</h3><p className="mt-2 text-sm text-white/60">Player submissions will appear here.</p></div>}
      {reports.map(report => <article key={report.id} className="glass space-y-3 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2"><span className="pill capitalize">{report.kind}</span><time className="text-xs text-white/55" dateTime={report.created_at}>{new Date(report.created_at).toLocaleString()}</time></div>
        <h3 className="break-words text-xl font-bold">{report.subject}</h3>
        <p className="whitespace-pre-wrap break-words text-sm text-white/75">{report.description}</p>
        <dl className="grid gap-2 break-words text-xs text-white/55 sm:grid-cols-2"><div><dt className="font-bold">Reporter account ID</dt><dd>{report.reporter_id || 'Deleted account'}</dd></div><div><dt className="font-bold">Context supplied by player</dt><dd>{report.game_name || 'No game specified'}{report.room_code ? ` · Room ${report.room_code}` : ''}</dd></div></dl>
        {report.resolved_at && <p className="text-xs text-white/55">Resolved {new Date(report.resolved_at).toLocaleString()}</p>}
        <button className="btn-secondary !w-auto px-5" disabled={busy !== null} onClick={() => void update(report)}>{busy === report.id ? 'Saving…' : report.status === 'open' ? 'Mark resolved' : 'Reopen report'}</button>
      </article>)}
      {total > 20 && <div className="flex items-center justify-between gap-3"><button className="btn-secondary !w-auto px-4" disabled={page === 1 || busy !== null} onClick={() => setPage(page - 1)}>Previous</button><span className="text-sm">Page {page} of {Math.ceil(total / 20)}</span><button className="btn-secondary !w-auto px-4" disabled={page * 20 >= total || busy !== null} onClick={() => setPage(page + 1)}>Next</button></div>}
    </>}
  </div>;
}
