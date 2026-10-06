'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinRoomPage() {
  const router = useRouter();
  const codeInput = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (busy) return;
    if (!/^[A-Z0-9]{6}$/.test(clean)) {
      setError('Enter the 6-character code shared by your host.');
      codeInput.current?.focus();
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/rooms/${clean}/join`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not join');
      router.push(`/room/${clean}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not join. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-6 w-full max-w-md">
      <form onSubmit={submit} className="glass p-5 text-center sm:p-7" aria-busy={busy}>
        <div aria-hidden="true" className="text-4xl">🎟️</div>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Join a Room</h1>
        <p className="mt-1 text-sm text-white/60">Enter the 6-character code your host shared.</p>
        <label htmlFor="room-code" className="field-label">Room code</label>
        <input
          id="room-code"
          name="room-code"
          ref={codeInput}
          aria-invalid={!!error}
          aria-describedby={error ? "join-error" : undefined}
          disabled={busy}
          autoCapitalize="characters"
          spellCheck={false}
          className="input text-center font-mono text-2xl sm:text-3xl font-black uppercase tracking-[0.35em]"
          value={code}
          onChange={(e) => { setCode(e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6)); setError(''); }}
          placeholder="ABC123"
          autoFocus
          autoComplete="off"
        />
        {error && <p id="join-error" role="alert" className="mt-3 text-sm font-bold text-red-300">{error}</p>}
        <button className="btn mt-6" disabled={busy}>
          {busy ? 'Joining…' : 'Join room →'}
        </button>
      </form>
    </div>
  );
}
