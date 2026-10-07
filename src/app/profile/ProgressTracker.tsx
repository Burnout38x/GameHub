'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { calculatePlayProgress, validWeeklyGoal, type ProgressSummary } from '@/lib/progress';

export default function ProgressTracker() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [error, setError] = useState('');
  const [goal, setGoal] = useState('3');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  async function load() {
    try {
      const response = await fetch('/api/progress', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSummary(data); setGoal(String(data.weeklyGoal));
    } catch { setError('Your progress could not load. Please try again.'); }
  }
  useEffect(() => {
    let active = true;
    fetch('/api/progress', { cache: 'no-store' }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (active) { setSummary(data); setGoal(String(data.weeklyGoal)); }
    }).catch(() => { if (active) setError('Your progress could not load. Please try again.'); });
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      fetch('/api/progress', { cache: 'no-store' }).then(async response => {
        if (!response.ok) return;
        const data = await response.json();
        if (active) setSummary(data);
      }).catch(() => { /* Keep the last verified snapshot during transient outages. */ });
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => { active = false; document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh); window.clearInterval(timer); };
  }, []);
  async function saveGoal(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(goal);
    if (!validWeeklyGoal(value)) { setMessage('Choose a whole number from 1 to 50.'); return; }
    setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/progress', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weeklyGoal: value }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSummary(previous => previous ? { ...previous, weeklyGoal: data.weeklyGoal } : previous);
      setMessage('Weekly goal saved.');
    } catch { setMessage('Your goal could not be saved. Please try again.'); }
    finally { setSaving(false); }
  }
  if (error) return <section className="glass p-6" aria-label="Your progress"><p role="alert">{error}</p><button className="btn-secondary mt-4" onClick={() => { setError(''); void load(); }}>Retry progress</button></section>;
  if (!summary) return <section className="glass p-6" role="status">Loading your progress…</section>;
  const play = calculatePlayProgress(summary.days, new Date(summary.asOf));
  const percent = Math.min(100, Math.round(play.weeklyGames / summary.weeklyGoal * 100));
  const stats = [['Games played', summary.gamesPlayed], ['Games won', summary.gamesWon], ['Total points', summary.totalPoints], ['Win rate', summary.gamesPlayed ? `${Math.round(summary.gamesWon / summary.gamesPlayed * 100)}%` : '—']] as const;
  return <section className="flex flex-col gap-5" aria-label="Your progress">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{stats.map(([label, value]) => <div className="glass-sm p-4" key={label}><p className="text-sm text-white/65">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>)}</div>
    <div className="glass p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="pill">🔥 Keep your rhythm</p><h2 className="mt-3 text-2xl font-black">{play.current} day play streak</h2><p className="mt-2 text-sm text-white/65">Best: {play.best} days · {play.playedToday ? 'You played today. Nice work!' : 'Finish a game today to build your streak.'}</p></div><Link href="/games" className="btn w-auto!">Find a game</Link></div>
      <div className="mt-5 grid grid-cols-7 gap-1 sm:gap-2" aria-label="Play activity this week">{play.week.map((day, index) => <div key={day.date} className={`glass-sm flex min-w-0 flex-col items-center gap-2 px-1 py-3 ${day.today ? 'ring-2 ring-[var(--accent-cool)]' : ''}`} aria-label={`${day.date}: ${day.games} games${day.today ? ', today' : ''}`}><span className="text-xs font-bold">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}</span><span aria-hidden="true" className="text-lg">{day.games ? '✓' : '·'}</span><span className="text-xs text-white/65">{day.games || '—'}</span></div>)}</div>
      <p className="mt-4 text-xs leading-relaxed text-white/65">Complete an online room game each day to keep your streak. Days reset at midnight UTC; weeks run Monday–Sunday. Pass & play games do not count toward account progress.</p>
    </div>
    <div className="glass p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-black">Your weekly goal</h2><span className="pill">{play.weeklyGames >= summary.weeklyGoal ? '🎉 Goal reached!' : `${play.weeklyGames} / ${summary.weeklyGoal} games`}</span></div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Weekly games goal" aria-valuemin={0} aria-valuemax={summary.weeklyGoal} aria-valuenow={Math.min(play.weeklyGames, summary.weeklyGoal)} aria-valuetext={`${play.weeklyGames} of ${summary.weeklyGoal} games completed`}><div className="h-full rounded-full bg-[var(--accent-cool)] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${percent}%` }} /></div>
      <form onSubmit={saveGoal} className="mt-4"><label className="field-label" htmlFor="weekly-goal">Games to play each week</label><div className="flex flex-col gap-3 sm:flex-row"><input id="weekly-goal" type="number" className="input sm:max-w-36" min={1} max={50} step={1} value={goal} onChange={event => setGoal(event.target.value)} required disabled={saving} /><button className="btn-secondary sm:w-auto" disabled={saving}>{saving ? 'Saving…' : 'Save goal'}</button></div><p className="mt-2 text-sm text-white/65">Choose 1–50. Your goal is personal and can change anytime.</p><p className="mt-2 text-sm" role="status">{message}</p></form>
    </div>
    <div className="glass p-5 sm:p-7"><h2 className="text-xl font-black">🏆 Multiplayer win streak</h2><div className="mt-4 grid grid-cols-2 gap-3"><div className="glass-sm p-4"><p className="text-sm text-white/65">Current win streak</p><p className="text-2xl font-black">{summary.currentWinStreak}</p></div><div className="glass-sm p-4"><p className="text-sm text-white/65">Best win streak</p><p className="text-2xl font-black">{summary.bestWinStreak}</p></div></div><p className="mt-3 text-xs text-white/65">Consecutive wins against other players. Tied wins count; solo room games leave this streak unchanged.</p></div>
  </section>;
}
