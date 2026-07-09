'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Game } from '@/lib/types';
import { spotlightEligible } from '@/lib/game-utils';

function NewRoomForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [games, setGames] = useState<Game[]>([]);
  const [gameSlug, setGameSlug] = useState(params.get('game') ?? '');
  const [difficulty, setDifficulty] = useState('mixed');
  const [rounds, setRounds] = useState('10');
  const [mode, setMode] = useState('classic');
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    createClient()
      .from('games')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        setGames((data as Game[]) ?? []);
        if (!params.get('game') && data?.[0]) setGameSlug(data[0].slug);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const game = games.find((g) => g.slug === gameSlug);
  const isMemory = game?.type === 'memory';
  const canSpotlight = game ? spotlightEligible(game.slug, game.type) : false;
  const effectiveMode = canSpotlight ? mode : 'classic';
  const roundOptions = isMemory ? ['6', '8', '10', '12', '15', '20'] : ['5', '10', '15', '20', '30', '40'];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!game) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: game.id,
          difficulty,
          totalRounds: Number(rounds),
          mode: effectiveMode,
          isPublic,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create room');
      router.push(`/room/${data.code}`);
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-6 w-full max-w-md">
      <form onSubmit={submit} className="glass p-7">
        <h1 className="text-3xl font-black tracking-tight">Create a Room</h1>
        <p className="mt-1 text-sm text-white/60">
          You’ll get a 6-letter code to share. Up to 10 players.
        </p>

        <label className="field-label" htmlFor="game">Game</label>
        <select id="game" className="input" value={gameSlug} onChange={(e) => setGameSlug(e.target.value)}>
          {games.map((g) => (
            <option key={g.id} value={g.slug}>
              {g.emoji} {g.name}
            </option>
          ))}
        </select>
        {game && <p className="mt-2 text-xs text-white/50">{game.description}</p>}

        {canSpotlight && (
          <>
            <label className="field-label" htmlFor="mode">Mode</label>
            <select id="mode" className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="classic">🤝 Classic — everyone answers at once</option>
              <option value="spotlight">🎯 Spotlight — one player answers at a time</option>
            </select>
            {mode === 'spotlight' && (
              <p className="mt-2 text-xs text-white/50">
                Question count is rounded at start so everyone gets equal turns.
              </p>
            )}
          </>
        )}

        {game?.type !== 'guess' && game?.type !== 'memory' && (
          <>
            <label className="field-label" htmlFor="difficulty">Difficulty</label>
            <select id="difficulty" className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="easy">😌 Easy</option>
              <option value="hard">🔥 Hard</option>
              <option value="mixed">🎲 Mixed (everything)</option>
            </select>
          </>
        )}

        <label className="field-label" htmlFor="rounds">
          {isMemory ? 'Number of pairs' : game?.type === 'guess' ? 'Number of rounds' : 'Number of questions'}
        </label>
        <select id="rounds" className="input" value={rounds} onChange={(e) => setRounds(e.target.value)}>
          {roundOptions.map((r) => (
            <option key={r} value={r}>
              {r} {isMemory ? `pairs (${Number(r) * 2} cards)` : ''}
            </option>
          ))}
        </select>

        <label className="field-label" htmlFor="visibility">Visibility</label>
        <select
          id="visibility"
          className="input"
          value={isPublic ? 'public' : 'private'}
          onChange={(e) => setIsPublic(e.target.value === 'public')}
        >
          <option value="private">🔒 Private — join by code only</option>
          <option value="public">🌍 Public — listed in the room browser</option>
        </select>

        {error && <p className="mt-3 text-sm font-bold text-red-300">{error}</p>}
        <button className="btn mt-6" disabled={busy || !game}>
          {busy ? 'Creating…' : 'Create room →'}
        </button>
      </form>
    </div>
  );
}

export default function NewRoomPage() {
  return (
    <Suspense>
      <NewRoomForm />
    </Suspense>
  );
}
