import { withRoomLock } from '@/lib/server/room-lock';
export const maxDuration = 30;
import { NextResponse } from 'next/server';
import { loadRoomContext, jsonError } from '@/lib/server/room-actions';

/** POST /api/rooms/[code]/join */
async function handlePost(_req: Request, { params }: { params: { code: string } }) {
  const ctx = await loadRoomContext(params.code);
  if (ctx instanceof NextResponse) return ctx;
  const { admin, userId, room, me } = ctx;

  if (me) return NextResponse.json({ ok: true }); // already in — rejoin
  if (room.status !== 'lobby') return jsonError('Game already started', 409);
  const maxPlayers = ctx.game.type === 'predict' ? 2 : ctx.game.type === 'market' ? 4 : 10;
  if (ctx.players.length >= maxPlayers)
    return jsonError(maxPlayers === 2 ? 'This game is for exactly 2 players' : `Room is full (max ${maxPlayers})`, 409);

  const { data: profile } = await admin
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .single();

  const { error } = await admin.from('room_players').insert({
    room_id: room.id,
    profile_id: userId,
    display_name: profile?.username ?? 'Player',
  });
  if (error && !error.message.includes('duplicate')) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request, context: { params: Promise<{ code: string }> }) {
  const params = await context.params;
  return withRoomLock(params.code, () => handlePost(req as never, { params }));
}
