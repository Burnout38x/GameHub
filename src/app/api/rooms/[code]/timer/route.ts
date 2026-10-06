import { NextResponse } from 'next/server';
import { loadRoomContext, jsonError } from '@/lib/server/room-actions';
import { withRoomLock } from '@/lib/server/room-lock';

export const maxDuration = 30;

export async function POST(req: Request, context: { params: Promise<{ code: string }> }) {
  const params = await context.params;
  return withRoomLock(params.code, async () => {
    const ctx = await loadRoomContext(params.code);
    if (ctx instanceof NextResponse) return ctx;
    const { admin, room, game, me, userId } = ctx;
    if (!me) return jsonError('You are not in this room', 403);
    if (room.status !== 'playing' || room.round_phase !== 'answering') return jsonError('This round is not accepting actions', 409);
    if (room.turn_player_id !== userId) return jsonError('Only the current player can control the timer', 403);
    const duration = Number(game.config?.timerSeconds);
    if (game.type !== 'prompt' || !Number.isFinite(duration) || duration <= 0 || duration > 600) return jsonError('This game does not have a challenge timer');
    const body = await req.json().catch(() => ({}));
    if (!['start', 'reset'].includes(body.action)) return jsonError('Choose start or reset');
    if (typeof body.fromRound !== 'number' || body.fromRound !== room.current_round) return jsonError('The round has changed. Please refresh.', 409);
    if (body.action === 'start' && room.round_state?.challengeDeadline) return jsonError('Reset the timer before starting it again', 409);
    const { error } = await admin.from('rooms').update({ round_state: {
      ...room.round_state,
      challengeDeadline: body.action === 'start' ? new Date(Date.now() + duration * 1000).toISOString() : null,
    } }).eq('id', room.id).eq('current_round', room.current_round);
    if (error) return jsonError('Could not update the timer', 500);
    return NextResponse.json({ ok: true });
  });
}
