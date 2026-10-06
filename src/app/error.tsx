'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="glass mx-auto mt-8 max-w-lg p-8 text-center"><h1 className="text-2xl font-bold">Something interrupted the game night</h1><p role="alert" className="mt-3 text-white/70">We couldn’t load this page. Try again in a moment.</p><button className="btn mt-6" onClick={reset}>Try again</button><Link href="/games" className="btn-secondary mt-3">Back to games</Link></div>;
}
