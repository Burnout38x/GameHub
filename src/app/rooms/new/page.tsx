'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Game } from '@/lib/types';
import { spotlightEligible } from '@/lib/game-utils';

function NewRoomForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [games, setGames] = useState<Game[]>([]);
  const [gameSlug, setGameSlug] = useState(params.get('game') ?? '');
  const [difficulty, setDifficulty] = useState('mixed');
  const [rounds, setRounds] = useState('10');
  const [mode, setMode] = useState('classic');
  const [isPublic, setIsPublic] = useState(false);
  const [timerChoice, setTimerChoice] = useState<{ slug: string; value: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadGames() {
      try {
        const { data, error: fetchError } = await createClient()
          .from('games').select('*').eq('is_active', true).order('sort_order');
        if (fetchError) throw fetchError;
        if (!active) return;
        const available = (data as Game[]) ?? [];
        setGames(available);
        setGameSlug((current) => available.some((g) => g.slug === current) ? current : available[0]?.slug ?? '');
      } catch {
        if (active) setLoadError('We couldn’t load the games. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadGames();
    return () => { active = false; };
  }, [retry]);

  const game = games.find((g) => g.slug === gameSlug);
  const defaultTimer = ['mystery-card', 'reverse-definition', 'mental-math-duel'].includes(gameSlug)
    ? '15' : gameSlug === 'word-chain' ? '12' : 'off';
  const timer = timerChoice?.slug === gameSlug ? timerChoice.value : defaultTimer;
  const isMemory = game?.type === 'memory';
  const isPredict = game?.type === 'predict';
  const isCode = game?.type === 'code';
  const isRule = game?.type === 'rule';
  const isChain = game?.type === 'chain';
  const canSpotlight = game ? spotlightEligible(game.slug, game.type) : false;
  const effectiveMode = canSpotlight ? mode : 'classic';
  const roundOptions = isMemory
    ? ['6', '8', '10', '12', '15', '20']
    : isPredict
      ? ['6', '10', '14', '20']
      : isCode || isRule
        ? ['1', '3', '5']
        : isChain
          ? ['12', '20', '30']
          : ['5', '10', '15', '20', '30', '40'];

  const selectedRounds = roundOptions.includes(rounds) ? rounds : roundOptions[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!game || busy || loading) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: game.id,
          difficulty,
          totalRounds: Number(selectedRounds),
          mode: effectiveMode,
          isPublic,
          answerSeconds:
            (game.type === 'quiz' || game.type === 'chain') && timer !== 'off' ? Number(timer) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create room');
      router.push(`/room/${data.code}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create room. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-6 w-full max-w-md">
      <form onSubmit={submit} className="glass p-5 sm:p-7" aria-busy={busy || loading}>
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-200">Your next game night</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Create a Room</h1>
        <p className="mt-1 text-sm text-white/60">
          Choose a game, set the pace, then invite your people with a 6-character room code.
        </p>

        {loading && <p className="mt-5 text-sm text-white/70" role="status">Loading games…</p>}
        {loadError && <div className="mt-5" role="alert">
          <p className="text-sm text-red-300">{loadError}</p>
          <button type="button" className="btn-secondary mt-3" onClick={() => { setLoading(true); setLoadError(''); setRetry((value) => value + 1); }}>Try again</button>
        </div>}
        {!loading && !loadError && games.length === 0 && <p className="mt-5 text-sm text-white/70" role="status">No games are available right now. Please check back soon.</p>}
        <fieldset disabled={busy || loading || !!loadError || games.length === 0}>
        <legend className="sr-only">Room settings</legend>
        <label className="field-label" htmlFor="game">Game</label>
        <select id="game" className="input" value={gameSlug} onChange={(e) => { setGameSlug(e.target.value); setTimerChoice(null); }}>
          {games.map((g) => (
            <option key={g.id} value={g.slug}>
              {g.emoji} {g.name}
            </option>
          ))}
        </select>
        {game && <p className="mt-2 text-sm text-white/65">{game.description}</p>}
        {game && !isPredict && <p className="mt-2 text-xs text-indigo-200">{isRule || isChain ? "For 2–10 players. Invite someone to play before starting." : "Play solo or invite up to 9 more players."}</p>}
        {isPredict && (
          <p className="mt-2 text-xs font-bold text-indigo-200">
            💞 For exactly 2 players — question count is evened out so you both get equal turns.
          </p>
        )}

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

        {game?.type !== 'guess' && game?.type !== 'memory' && !isPredict && !isCode && !isRule && !isChain && (
          <>
            <label className="field-label" htmlFor="difficulty">Difficulty</label>
            <select id="difficulty" className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="easy">😌 Easy</option>
              <option value="hard">🔥 Hard</option>
              <option value="mixed">🎲 Mixed (everything)</option>
            </select>
          </>
        )}

        {isCode && (
          <>
            <label className="field-label" htmlFor="difficulty">Code length</label>
            <select id="difficulty" className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="easy">🔢 4 digits (easier)</option>
              <option value="mixed">🔢 5 digits</option>
              <option value="hard">🔢 6 digits (harder)</option>
            </select>
          </>
        )}

        <label className="field-label" htmlFor="rounds">
          {isMemory
            ? 'Number of pairs'
            : isCode
              ? 'Codes to crack'
              : isRule
                ? 'Rules to discover'
                : isChain
                  ? 'Number of turns'
                  : game?.type === 'guess'
                    ? 'Number of rounds'
                    : 'Number of questions'}
        </label>
        <select id="rounds" className="input" value={selectedRounds} onChange={(e) => setRounds(e.target.value)}>
          {roundOptions.map((r) => (
            <option key={r} value={r}>
              {r} {isMemory ? `pairs (${Number(r) * 2} cards)` : ''}
            </option>
          ))}
        </select>

        {(game?.type === 'quiz' || isChain) && (
          <>
            <label className="field-label" htmlFor="timer">{isChain ? 'Timer per turn' : 'Timer per question'}</label>
            <select id="timer" className="input" value={timer} onChange={(e) => setTimerChoice({ slug: gameSlug, value: e.target.value })}>
              <option value="off">🧘 No timer — casual pace</option>
              <option value="10">⏱ 10 seconds</option>
              <option value="12">⏱ 12 seconds</option>
              <option value="15">⏱ 15 seconds</option>
              <option value="20">⏱ 20 seconds</option>
              <option value="30">⏱ 30 seconds</option>
            </select>
            {timer !== 'off' && (
              <p className="mt-2 text-xs text-white/50">
                Answers lock when the timer ends — enforced by the server for everyone.
              </p>
            )}
          </>
        )}

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

        </fieldset>
        {error && <p role="alert" className="mt-3 text-sm font-bold text-red-300">{error}</p>}
        <button className="btn mt-6" disabled={busy || loading || !!loadError || !game}>
          {busy ? 'Creating…' : 'Create room →'}
        </button>
      </form>
    </div>
  );
}

export default function NewRoomPage() {
  return (
    <Suspense fallback={<p role="status" className="py-12 text-center text-white/70">Loading room setup…</p>}>
      <NewRoomForm />
    </Suspense>
  );
}
