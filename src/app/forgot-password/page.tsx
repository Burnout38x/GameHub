'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError(/rate limit/i.test(error.message)
        ? 'Too many reset emails sent recently — the email service needs to cool down. Please try again in about an hour.'
        : error.message);
      setBusy(false);
      return;
    }
    setSent(true);
    setBusy(false);
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-md">
      <form onSubmit={submit} className="glass p-7">
        <h1 className="text-3xl font-black tracking-tight">Forgot password</h1>
        {sent ? (
          <p className="mt-4 text-sm text-emerald-300">
            📬 If an account exists for <span className="font-bold">{email}</span>, a reset
            link is on its way. Open it on this device to choose a new password.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-white/60">
              Enter your email and we&apos;ll send you a link to reset it.
            </p>
            <label className="field-label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="input" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            {error && <p className="mt-3 text-sm font-bold text-red-300">{error}</p>}
            <button className="btn mt-6" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </>
        )}
        <p className="mt-4 text-center text-sm text-white/60">
          Remembered it?{' '}
          <Link href="/login" className="font-bold text-indigo-300">Back to log in</Link>
        </p>
      </form>
    </div>
  );
}
