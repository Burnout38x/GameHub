'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinRoomPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length !== 6) return setError('Codes are 6 characters');
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/rooms/${clean}/join`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not join');
      router.push(`/room/${clean}`);
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-6 w-full max-w-md">
      <form onSubmit={submit} className="glass p-7 text-center">
        <div className="text-4xl">🎟️</div>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Join a Room</h1>
        <p className="mt-1 text-sm text-white/60">Enter the 6-letter code your host shared.</p>
        <input
          className="input mt-6 text-center font-mono text-3xl font-black uppercase tracking-[0.35em]"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="ABC123"
          autoFocus
          autoComplete="off"
        />
        {error && <p className="mt-3 text-sm font-bold text-red-300">{error}</p>}
        <button className="btn mt-6" disabled={busy}>
          {busy ? 'Joining…' : 'Join room →'}
        </button>
      </form>
    </div>
  );
}
