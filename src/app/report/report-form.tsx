'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { validateReport } from '@/lib/reports';
export default function ReportForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = validateReport(body);
    if (parsed.error) { setError(parsed.error); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not send your report.');
      setSent(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Connection lost. Please try again.'); }
    finally { setBusy(false); }
  }
  if (sent) return <div className="mt-6 space-y-4" role="status"><h2 className="text-xl font-bold">Report received</h2><p className="text-sm text-white/65">Thanks for helping. An admin can now review your report.</p><Link href="/games" className="btn">Back to games</Link><button className="btn-secondary" onClick={() => setSent(false)}>Send another report</button></div>;
  return <form onSubmit={submit} className="mt-6 space-y-5">
    <label className="block text-sm font-bold">Report type<select name="kind" className="input mt-2" defaultValue="bug"><option value="bug">Game or app bug</option><option value="player">Player behavior</option><option value="feedback">Idea or feedback</option></select></label>
    <label className="block text-sm font-bold">Summary<input name="subject" className="input mt-2" required minLength={5} maxLength={120} placeholder="What happened?" /></label>
    <label className="block text-sm font-bold">Details<textarea name="description" className="input mt-2 min-h-36" required minLength={20} maxLength={3000} placeholder="Tell us what happened, what you expected, and how to reproduce it. For a player issue, include their display name." /><span className="mt-1 block text-xs font-normal text-white/55">20–3,000 characters</span></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold">Game (optional)<input name="gameName" className="input mt-2" maxLength={100} /></label><label className="block text-sm font-bold">Room code (optional)<input name="roomCode" className="input mt-2 uppercase" maxLength={6} pattern="[A-Za-z2-9]{6}" /></label></div>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    <button type="submit" className="btn" disabled={busy}>{busy ? 'Sending…' : 'Send report'}</button>
    <p className="text-xs text-white/55">Up to 5 reports per hour. Reports are reviewed in the admin inbox.</p>
  </form>;
}
