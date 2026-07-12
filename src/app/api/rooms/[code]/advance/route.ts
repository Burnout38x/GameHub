import { NextRequest, NextResponse } from 'next/server';
import { loadRoomContext, jsonError, finishGame, nextTurnPlayer } from '@/lib/server/room-actions';
import { deadlinePassed, roundDeadline } from '@/lib/game-utils';

/** POST /api/rooms/[code]/advance — move to the next round (or finish). Any player may call it. */
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const ctx = await loadRoomContext(params.code);
  if (ctx instanceof NextResponse) return ctx;
  const { admin, room, players, me } = ctx;

  if (!me) return jsonError('You are not in this room', 403);
  if (room.status !== 'playing') return jsonError('Game is not running', 409);

  // Guard against two players tapping Next at once.
  const { fromRound } = await req.json().catch(() => ({}));
  if (typeof fromRound === 'number' && fromRound !== room.current_round)
    return NextResponse.json({ ok: true }); // someone already advanced

  if (room.round_phase !== 'revealed') {
    // Timed rooms: once the deadline passes, any client may flip the round to revealed.
    if (room.answer_seconds && deadlinePassed(room.round_state?.deadline)) {
      await admin
        .from('rooms')
        .update({ round_phase: 'revealed' })
        .eq('id', room.id)
        .eq('current_round', room.current_round)
        .eq('round_phase', 'answering');
      return NextResponse.json({ ok: true, revealed: true });
    }
    return jsonError('Round not finished yet', 409);
  }

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
      ...(room.answer_seconds
        ? { round_state: { ...room.round_state, deadline: roundDeadline(room.answer_seconds) } }
        : {}),
    })
    .eq('id', room.id)
    .eq('current_round', room.current_round); // optimistic concurrency
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
