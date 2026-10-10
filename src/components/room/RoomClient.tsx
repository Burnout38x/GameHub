'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Game, Prompt, Room, RoomPlayer, RoundAnswer } from '@/lib/types';
import Lobby from './Lobby';
import EndScreen from './EndScreen';
import QuizPlay from './QuizPlay';
import PromptPlay from './PromptPlay';
import MemoryPlay from './MemoryPlay';
import GuessPlay from './GuessPlay';
import PredictPlay from './PredictPlay';
import CodePlay from './CodePlay';
import RulePlay from './RulePlay';
import MarketPlay from './MarketPlay';
import ChainPlay from './ChainPlay';
import BattlePlay, { BattleResultBanner } from './BattlePlay';
import Scoreboard from './Scoreboard';
import LeaveButton from './LeaveButton';

export interface RoomBundle {
  room: Room;
  game: Game;
  players: RoomPlayer[];
  answers: RoundAnswer[];
  prompt: Prompt | null;
  userId: string;
  refresh: () => void;
}

export default function RoomClient({ code, userId }: { code: string; userId: string }) {
  const router = useRouter();
  const [bundle, setBundle] = useState<Omit<RoomBundle, 'userId' | 'refresh'> | null>(null);
  const [error, setError] = useState('');
  const requestRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const wasInRoomRef = useRef(false);
  const battleLiveRef = useRef(false);

  const load = useCallback(async () => {
    const generation = ++generationRef.current;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(code)}`, { signal: controller.signal, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load this room.');
      if (generation !== generationRef.current) return;
      setBundle(data);
      setError('');
    } catch (cause) {
      if (controller.signal.aborted || generation !== generationRef.current) return;
      setError(cause instanceof Error ? cause.message : 'Connection interrupted. Please retry.');
    }
  }, [code]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (document.visibilityState === 'visible') await load();
      // Live battles sync through their own fast order poll; the room snapshot can relax.
      if (!stopped) timer = setTimeout(poll, battleLiveRef.current ? 4000 : 1500);
    }
    const resume = () => { if (document.visibilityState === 'visible') void load(); };
    void poll();
    document.addEventListener('visibilitychange', resume);
    return () => {
      stopped = true;
      clearTimeout(timer);
      requestRef.current?.abort();
      document.removeEventListener('visibilitychange', resume);
    };
  }, [load]);

  // Kick players back to /games when the room closes under them (host left / too few players).
  useEffect(() => {
    if (!bundle) return;
    battleLiveRef.current = bundle.game.type === 'battle' && bundle.room.status === 'playing';
    const { room, players } = bundle;
    const amIn = players.some((p) => p.profile_id === userId);
    const closedReason = room.status === 'finished' ? room.round_state?.closedReason : null;
    if (closedReason && (amIn || wasInRoomRef.current)) {
      router.replace(`/games?notice=${closedReason}`);
      return;
    }
    if (wasInRoomRef.current && !amIn && room.status !== 'finished') {
      router.replace('/games?notice=removed');
      return;
    }
    if (amIn) wasInRoomRef.current = true;
  }, [bundle, router, userId]);

  if (error && !bundle)
    return <div className="glass mx-auto mt-16 max-w-md p-8 text-center"><h1 className="text-xl font-bold">Let’s reconnect</h1><p role="alert" className="mt-3 text-red-200">{error}</p><button className="btn mt-5" onClick={() => void load()}>Retry connection</button><Link href="/games" className="btn-secondary mt-3">Back to games</Link></div>;
  if (!bundle)
    return (
      <div className="mt-24 text-center text-white/60">
        <div className="animate-pulse text-4xl">🎮</div>
        <p className="mt-3">Loading room…</p>
      </div>
    );

  const full: RoomBundle = { ...bundle, userId, refresh: load };
  const { room, game } = bundle;
  const inRoom = bundle.players.some((p) => p.profile_id === userId);

  const connectionNotice = error ? <div role="alert" className="glass-sm mx-auto mb-4 max-w-xl p-4 text-sm text-red-200">{error}<button className="btn-secondary mt-3 !py-2" onClick={() => void load()}>Retry connection</button></div> : null;
  if (room.status === 'finished' && room.round_state?.closedReason) return <div className="glass mx-auto max-w-xl p-6" role="status">This match has closed. No results were awarded. <Link href="/games" className="btn-secondary mt-4">Back to games</Link></div>;
  if (room.status === 'lobby') return <>{connectionNotice}<Lobby {...full} code={code} inRoom={inRoom} /></>;
  // Battles stay mounted when they finish so the last shot can land before the results.
  if (game.type === 'battle' && (room.status === 'playing' || room.status === 'finished') && inRoom) return <>{connectionNotice}<BattlePlay {...full} /></>;
  if (room.status === 'finished' && game.type === 'battle') return <>{connectionNotice}<BattleResultBanner room={room} players={bundle.players} /><EndScreen {...full} /></>;
  if (room.status === 'finished') return game.type === 'market'
    ? <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">{connectionNotice}<MarketPlay {...full} /><EndScreen {...full} controlsOnly /></div>
    : <>{connectionNotice}<EndScreen {...full} /></>;

  if (!inRoom)
    return (
      <div className="glass mx-auto mt-16 max-w-md p-8 text-center">
        <div className="text-4xl">🔒</div>
        <p className="mt-3 text-white/70">This game already started without you. Ask for a rematch!</p><Link href="/games" className="btn-secondary mt-5">Back to games</Link>
      </div>
    );


  return (
    <div className={`mx-auto flex w-full ${game.type === 'market' ? 'max-w-6xl' : 'max-w-xl'} flex-col gap-4`}>
      {connectionNotice}
      {game.type !== 'market' && <Scoreboard {...full} />}
      {game.type === 'quiz' && <QuizPlay key={`${room.id}-${room.current_round}`} {...full} />}
      {game.type === 'prompt' && <PromptPlay key={`${room.id}-${room.current_round}`} {...full} />}
      {game.type === 'memory' && <MemoryPlay {...full} />}
      {game.type === 'guess' && <GuessPlay key={`${room.id}-${room.current_round}`} {...full} />}
      {game.type === 'predict' && <PredictPlay key={`${room.id}-${room.current_round}`} {...full} />}
      {game.type === 'code' && <CodePlay key={`${room.id}-${room.current_round}`} {...full} />}
      {game.type === 'rule' && <RulePlay key={`${room.id}-${room.current_round}`} {...full} />}
      {game.type === 'market' && <MarketPlay {...full} />}
      {game.type === 'chain' && <ChainPlay {...full} />}
      <LeaveButton code={code} status={room.status} isHost={room.host_id === userId} endsMatch={game.type === 'market'} />
    </div>
  );
}
