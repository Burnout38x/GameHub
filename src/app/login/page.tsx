'use client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PasswordInput from '@/components/PasswordInput';
import { registrationAvailable } from '@/lib/config';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.push(params.get('next') || '/games');
    router.refresh();
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-md">
      <form onSubmit={submit} className="glass p-7">
        <h1 className="text-3xl font-black tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-white/60">Log in to start a game night.</p>
        <label className="field-label" htmlFor="email">Email</label>
        <input id="email" type="email" required className="input" value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <label className="field-label" htmlFor="password">Password</label>
        <PasswordInput id="password" required value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        <p className="mt-2 text-right text-sm">
          <Link href="/forgot-password" className="font-bold text-indigo-300">Forgot password?</Link>
        </p>
        {error && <p className="mt-3 text-sm font-bold text-red-300">{error}</p>}
        <button className="btn mt-6" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
        {registrationAvailable && (
          <p className="mt-4 text-center text-sm text-white/60">
            New here?{' '}
            <Link href="/register" className="font-bold text-indigo-300">Create an account</Link>
          </p>
        )}
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
