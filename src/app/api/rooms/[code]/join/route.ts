import { NextResponse } from 'next/server';
import { loadRoomContext, jsonError } from '@/lib/server/room-actions';

/** POST /api/rooms/[code]/join */
export async function POST(_req: Request, { params }: { params: { code: string } }) {
  const ctx = await loadRoomContext(params.code);
  if (ctx instanceof NextResponse) return ctx;
  const { admin, userId, room, me } = ctx;

  if (me) return NextResponse.json({ ok: true }); // already in — rejoin
  if (room.status !== 'lobby') return jsonError('Game already started', 409);
  if (ctx.players.length >= 10) return jsonError('Room is full (max 10)', 409);

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
