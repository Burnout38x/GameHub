'use client';
export default function AdminError({ reset }: { reset: () => void }) {
  return <div className="glass p-8" role="alert"><h2 className="text-xl font-bold">This section could not be loaded</h2><p className="mt-2 text-sm text-white/65">Please try again in a moment.</p><button className="btn mt-5 !w-auto" onClick={reset}>Try again</button></div>;
}
