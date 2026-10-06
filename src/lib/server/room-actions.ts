import { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Game, Room, RoomPlayer } from '@/lib/types';

export interface RoomContext {
  admin: SupabaseClient;
  userId: string;
  room: Room;
  game: Game;
  players: RoomPlayer[];
  me: RoomPlayer | undefined;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Authenticates the caller and loads room + game + players. */
export async function loadRoomContext(code: string): Promise<RoomContext | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError('Not logged in', 401);

  const admin = createAdminClient();
  const { data: room } = await admin
    .from('rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();
  if (!room) return jsonError('Room not found', 404);

  const [{ data: game }, { data: players }] = await Promise.all([
    admin.from('games').select('*').eq('id', room.game_id).single(),
    admin.from('room_players').select('*').eq('room_id', room.id).order('joined_at'),
  ]);
  if (!game) return jsonError('Game not found', 404);

  const list = (players ?? []) as RoomPlayer[];
  return {
    admin,
    userId: user.id,
    room: room as Room,
    game: game as Game,
    players: list,
    me: list.find((p) => p.profile_id === user.id),
  };
}

export { nextTurnPlayer } from '@/lib/game-utils';

/** Ends the game: winners, match history, lifetime stats, streaks, achievements. */
export async function finishGame(ctx: RoomContext) {
  const { error } = await ctx.admin.rpc('finish_room_game', { target_room_id: ctx.room.id });
  if (error) throw new Error('Could not save the game result. Please retry.');
}
