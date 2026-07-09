'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PasswordInput from '@/components/PasswordInput';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('This reset link is invalid or has expired. Request a new one below.');
      setBusy(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.push('/games');
    router.refresh();
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-md">
      <form onSubmit={submit} className="glass p-7">
        <h1 className="text-3xl font-black tracking-tight">Choose a new password</h1>
        <p className="mt-1 text-sm text-white/60">
          You&apos;re nearly back in — pick a new password for your account.
        </p>
        <label className="field-label" htmlFor="password">New password</label>
        <PasswordInput id="password" required minLength={6} value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
        {error && <p className="mt-3 text-sm font-bold text-red-300">{error}</p>}
        <button className="btn mt-6" disabled={busy}>
          {busy ? 'Saving…' : 'Save new password'}
        </button>
        <p className="mt-4 text-center text-sm text-white/60">
          Link not working?{' '}
          <Link href="/forgot-password" className="font-bold text-indigo-300">Request a new one</Link>
        </p>
      </form>
    </div>
  );
}
