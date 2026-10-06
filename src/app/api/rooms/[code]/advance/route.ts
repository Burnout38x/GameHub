import { withRoomLock } from '@/lib/server/room-lock';
export const maxDuration = 30;
import { NextRequest, NextResponse } from 'next/server';
import { loadRoomContext, jsonError, finishGame, nextTurnPlayer } from '@/lib/server/room-actions';
import { isCurrentRound } from '@/lib/server/multiplayer-rules';
import { deadlinePassed, roundDeadline } from '@/lib/game-utils';

/** POST /api/rooms/[code]/advance — move to the next round (or finish). Any player may call it. */
async function handlePost(req: NextRequest, { params }: { params: { code: string } }) {
  const ctx = await loadRoomContext(params.code);
  if (ctx instanceof NextResponse) return ctx;
  const { admin, room, game, players, me } = ctx;

  if (!['quiz', 'prompt', 'predict'].includes(game.type)) return jsonError('Use this game’s own turn action', 409);
  if (!me) return jsonError('You are not in this room', 403);
  if (room.status !== 'playing') return jsonError('Game is not running', 409);

  // Timer expiry may reveal a round, but only an explicit Next/Finish may advance it.
  const { fromRound, revealOnly } = await req.json().catch(() => ({}));
  if (!isCurrentRound(fromRound, room.current_round))
    return jsonError('The round has changed. Refresh the room before acting.', 409);

  if (revealOnly === true) {
    if (game.type !== 'quiz' || !room.answer_seconds)
      return jsonError('This game does not have an automatic reveal timer', 409);
    if (room.round_phase === 'revealed') return NextResponse.json({ ok: true, revealed: true });
    if (!deadlinePassed(room.round_state?.deadline)) return jsonError('Time is not up', 409);
    const { error } = await admin.from('rooms')
      .update({ round_phase: 'revealed' })
      .eq('id', room.id)
      .eq('current_round', room.current_round)
      .eq('round_phase', 'answering');
    if (error) return jsonError('Could not reveal this round. Please retry.', 500);
    return NextResponse.json({ ok: true, revealed: true });
  }

  if (room.round_phase !== 'revealed') return jsonError('Round not finished yet', 409);

  const next = room.current_round + 1;
  if (next >= room.total_rounds) {
    await finishGame(ctx);
    return NextResponse.json({ ok: true, finished: true });
  }

  const { error } = await admin
    .from('rooms')
    .update({
      current_round: next,
      round_phase: 'answering',
      turn_player_id: nextTurnPlayer(players, room.turn_player_id),
      ...(game.type === 'predict'
        ? { round_state: { stage: game.config?.freeText ? 'collect' : 'subject' } }
        : room.answer_seconds
          ? { round_state: { ...room.round_state, deadline: roundDeadline(room.answer_seconds) } }
          : game.type === 'prompt' && game.config?.timerSeconds
            ? { round_state: {} }
            : {}),
    })
    .eq('id', room.id)
    .eq('current_round', room.current_round); // optimistic concurrency
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request, context: { params: Promise<{ code: string }> }) {
  const params = await context.params;
  return withRoomLock(params.code, () => handlePost(req as never, { params }));
}
