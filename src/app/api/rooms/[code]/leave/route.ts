import { withRoomLock } from '@/lib/server/room-lock';
export const maxDuration = 30;
import { NextResponse } from 'next/server';
import { loadRoomContext, jsonError, nextTurnPlayer } from '@/lib/server/room-actions';
import { activeAnswers } from '@/lib/server/multiplayer-rules';
import { isTurnBased, roundDeadline } from '@/lib/game-utils';

/** POST /api/rooms/[code]/leave — leave the room; closes it if too few players remain. */
async function handlePost(_req: Request, { params }: { params: { code: string } }) {
  const ctx = await loadRoomContext(params.code);
  if (ctx instanceof NextResponse) return ctx;
  const { admin, userId, room, game, players, me } = ctx;

  if (!me) return jsonError('You are not in this room', 403);
  if (room.status === 'finished') return NextResponse.json({ ok: true });

  if (room.status === 'lobby') {
    if (room.host_id === userId) {
      await admin
        .from('rooms')
        .update({
          status: 'finished',
          round_phase: 'revealed',
          round_state: { ...(room.round_state ?? {}), closedReason: 'host_left' },
        })
        .eq('id', room.id)
        .eq('status', 'lobby');
      return NextResponse.json({ ok: true, closed: true });
    }
    await admin.from('room_players').delete().eq('id', me.id);
    return NextResponse.json({ ok: true });
  }

  // Playing: remove the player (their answers/score history stays), then keep the game sane.
  const remaining = players.filter((p) => p.profile_id !== userId);
  await admin.from('room_players').delete().eq('id', me.id);

  if (remaining.length < 2) {
    // Aborted game: close without finishGame() so no stats/achievements are recorded.
    await admin
      .from('rooms')
      .update({
        status: 'finished',
        round_phase: 'revealed',
        winner_ids: [],
        round_state: { ...(room.round_state ?? {}), closedReason: 'not_enough_players' },
      })
      .eq('id', room.id)
      .eq('status', 'playing');
    return NextResponse.json({ ok: true, closed: true });
  }

  const updates: Record<string, any> = {};
  if (room.host_id === userId) updates.host_id = remaining[0].profile_id;
  if (game.type === 'chain' && (room.round_state?.challenge || room.turn_player_id === userId)) {
    updates.round_state = {
      ...room.round_state, challenge: null,
      ...(room.answer_seconds ? { deadline: roundDeadline(room.answer_seconds) } : {}),
    };
  }
  if (room.turn_player_id === userId) {
    updates.turn_player_id = nextTurnPlayer(players, userId);
  }
  if (
    room.round_phase === 'answering' &&
    (game.type === 'quiz' || game.type === 'prompt') &&
    !isTurnBased(game.slug, game.type, room.mode)
  ) {
    const { data: answers } = await admin
      .from('round_answers')
      .select('profile_id')
      .eq('room_id', room.id)
      .eq('round_index', room.current_round);
    if (activeAnswers(answers ?? [], remaining).length >= remaining.length) updates.round_phase = 'revealed';
  }
  if (Object.keys(updates).length > 0) {
    // current_round guard: a concurrent advance already set a fresh turn — let it win.
    await admin.from('rooms').update(updates).eq('id', room.id).eq('current_round', room.current_round);
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request, context: { params: Promise<{ code: string }> }) {
  const params = await context.params;
  return withRoomLock(params.code, () => handlePost(req as never, { params }));
}
