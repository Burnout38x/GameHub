'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PasswordInput from '@/components/PasswordInput';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const supabase = createClient();
    const name = username.trim();
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', name.replace(/[%_\\]/g, '\\$&'))
      .maybeSingle();
    if (existing) {
      setError('That display name is already taken — try another.');
      setBusy(false);
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: name } },
    });
    if (error) {
      // A duplicate name that slips past the check fails the profile trigger's unique index.
      setError(error.message.includes('Database error')
        ? 'That display name is already taken — try another.'
        : error.message);
      setBusy(false);
      return;
    }
    // If email confirmation is enabled in Supabase, there is no session yet.
    if (!data.session) {
      setError('Check your email to confirm your account, then log in.');
      setBusy(false);
      return;
    }
    router.push('/games');
    router.refresh();
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-md">
      <form onSubmit={submit} className="glass p-7">
        <h1 className="text-3xl font-black tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-white/60">
          One account for playing, scores, streaks and achievements.
        </p>
        <label className="field-label" htmlFor="username">Display name</label>
        <input id="username" required minLength={2} maxLength={24} className="input" value={username}
          onChange={(e) => setUsername(e.target.value)} placeholder="e.g. Blaze" />
        <label className="field-label" htmlFor="email">Email</label>
        <input id="email" type="email" required className="input" value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <label className="field-label" htmlFor="password">Password</label>
        <PasswordInput id="password" required minLength={6} value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
        {error && <p className="mt-3 text-sm font-bold text-amber-300">{error}</p>}
        <button className="btn mt-6" disabled={busy}>
          {busy ? 'Creating…' : 'Sign up'}
        </button>
        <p className="mt-4 text-center text-sm text-white/60">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-indigo-300">Log in</Link>
        </p>
      </form>
    </div>
  );
}
