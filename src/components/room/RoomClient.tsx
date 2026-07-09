'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Game, Prompt, Room, RoomPlayer, RoundAnswer } from '@/lib/types';
import Lobby from './Lobby';
import EndScreen from './EndScreen';
import QuizPlay from './QuizPlay';
import PromptPlay from './PromptPlay';
import MemoryPlay from './MemoryPlay';
import GuessPlay from './GuessPlay';
import Scoreboard from './Scoreboard';

export interface RoomBundle {
  room: Room;
  game: Game;
  players: RoomPlayer[];
  answers: RoundAnswer[];
  prompt: Prompt | null;
  userId: string;
  refresh: () => void;
}

export async function callRoomApi(code: string, action: string, body: Record<string, any> = {}) {
  const res = await fetch(`/api/rooms/${code}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

export default function RoomClient({ code, userId }: { code: string; userId: string }) {
  const supabase = useRef(createClient()).current;
  const [bundle, setBundle] = useState<Omit<RoomBundle, 'userId' | 'refresh'> | null>(null);
  const [error, setError] = useState('');
  const roomIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    const { data: room } = await supabase.from('rooms').select('*').eq('code', code).single();
    if (!room) return setError('Room disappeared');
    roomIdRef.current = room.id;
    const [{ data: game }, { data: players }, { data: answers }] = await Promise.all([
      supabase.from('games').select('*').eq('id', room.game_id).single(),
      supabase.from('room_players').select('*').eq('room_id', room.id).order('joined_at'),
      supabase
        .from('round_answers')
        .select('*')
        .eq('room_id', room.id)
        .eq('round_index', room.current_round),
    ]);
    let prompt: Prompt | null = null;
    const promptId = room.prompt_ids?.[room.current_round];
    if (room.status === 'playing' && promptId) {
      const { data } = await supabase.from('prompts').select('*').eq('id', promptId).single();
      prompt = data;
    }
    if (game) setBundle({ room, game, players: players ?? [], answers: answers ?? [], prompt });
  }, [code, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: refetch on any change to this room's rows. Polling fallback keeps
  // slow networks in sync even if a websocket event is missed.
  useEffect(() => {
    const channel = supabase
      .channel(`room-${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
        const row = (payload.new ?? payload.old) as { id?: string };
        if (row?.id === roomIdRef.current) load();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players' }, (payload) => {
        const row = (payload.new ?? payload.old) as { room_id?: string };
        if (row?.room_id === roomIdRef.current) load();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round_answers' }, (payload) => {
        const row = (payload.new ?? payload.old) as { room_id?: string };
        if (row?.room_id === roomIdRef.current) load();
      })
      .subscribe();
    const poll = setInterval(load, 5000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [code, load, supabase]);

  if (error)
    return <div className="glass mx-auto mt-16 max-w-md p-8 text-center text-red-300">{error}</div>;
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

  if (room.status === 'lobby') return <Lobby {...full} code={code} inRoom={inRoom} />;
  if (room.status === 'finished') return <EndScreen {...full} />;

  if (!inRoom)
    return (
      <div className="glass mx-auto mt-16 max-w-md p-8 text-center">
        <div className="text-4xl">🔒</div>
        <p className="mt-3 text-white/70">This game already started without you. Ask for a rematch!</p>
      </div>
    );

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <Scoreboard {...full} />
      {game.type === 'quiz' && <QuizPlay {...full} />}
      {game.type === 'prompt' && <PromptPlay {...full} />}
      {game.type === 'memory' && <MemoryPlay {...full} />}
      {game.type === 'guess' && <GuessPlay {...full} />}
    </div>
  );
}
