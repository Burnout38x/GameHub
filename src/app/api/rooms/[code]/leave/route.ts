import { isSameOriginRequest } from '@/lib/server/request-origin';
import { withRoomLock } from '@/lib/server/room-lock';
export const maxDuration = 30;
import { NextResponse } from 'next/server';
import { loadRoomContext, jsonError, nextTurnPlayer } from '@/lib/server/room-actions';
import { activeAnswers } from '@/lib/server/multiplayer-rules';
import { isTurnBased, roundDeadline } from '@/lib/game-utils';
import { forfeitSiege, parseOnlineSiege } from '@/lib/fortress/online';

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

  if (game.type === 'market') {
    const { data, error } = await admin.rpc('leave_market_match', { target_room_id: room.id, actor_id: userId });
    if (error) return jsonError('Could not leave the market. Please retry.', 500);
    if (!data) return jsonError('This room changed. Please refresh.', 409);
    return NextResponse.json({ ok: true, closed: true });
  }

  // Walking out of a duel concedes it, so rage-quitting cannot protect a streak.
  if (game.type === 'battle') {
    const siege = parseOnlineSiege(room.round_state);
    const settled = siege ? forfeitSiege(siege, userId) : null;
    if (siege && settled) {
      const { data, error } = await admin.rpc('finish_battle_room', {
        target_room_id: room.id, expected_version: siege.version, next_state: settled.siege,
        scores: settled.scores, winners: settled.winners,
      });
      if (error) return jsonError('Could not leave the battle. Please retry.', 500);
      if (!data) return jsonError('This battle changed. Please refresh.', 409);
      return NextResponse.json({ ok: true, closed: true });
    }
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
  if (!isSameOriginRequest(req)) return jsonError('Request origin not allowed', 403);
  const params = await context.params;
  return withRoomLock(params.code, () => handlePost(req as never, { params }));
}
