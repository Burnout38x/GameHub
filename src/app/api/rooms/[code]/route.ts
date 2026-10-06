import { NextResponse } from 'next/server';
import { loadRoomContext, jsonError } from '@/lib/server/room-actions';
import { sanitizeSnapshot } from '@/lib/server/room-snapshot';

export const dynamic = 'force-dynamic';

/** The only player-facing room read: hidden answers never leave the server. */
export async function GET(_req: Request, context: { params: Promise<{ code: string }> }) {
  const params = await context.params;
  const ctx = await loadRoomContext(params.code);
  if (ctx instanceof NextResponse) return ctx;
  const { admin, room, game, players, me, userId } = ctx;
  if (!me && room.status !== 'lobby') return jsonError('This room is for its players. Ask the host for a new game.', 403);
  const [{ data: answers, error: answersError }, { data: secretRow }] = await Promise.all([
    admin.from('round_answers').select('*').eq('room_id', room.id).eq('round_index', room.current_round),
    admin.from('room_secrets').select('secret').eq('room_id', room.id).maybeSingle(),
  ]);
  if (answersError) return jsonError('Could not load the room. Please retry.', 503);
  let prompt = null;
  const promptId = room.prompt_ids?.[room.current_round];
  if (room.status === 'playing' && promptId) {
    const result = await admin.from('prompts').select('*').eq('id', promptId).single();
    if (result.error) return jsonError('Could not load this round. Please retry.', 503);
    prompt = result.data;
  }
  return NextResponse.json(sanitizeSnapshot({ room, game, players, answers: answers ?? [], prompt }, userId, secretRow?.secret), { headers: { 'Cache-Control': 'private, no-store' } });
}
