import { NextRequest, NextResponse } from 'next/server';
import { loadRoomContext, jsonError, finishGame, nextTurnPlayer } from '@/lib/server/room-actions';

/** POST /api/rooms/[code]/guess — Number Guess Battle. Secret lives server-side only. */
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const ctx = await loadRoomContext(params.code);
  if (ctx instanceof NextResponse) return ctx;
  const { admin, userId, room, game, players, me } = ctx;

  if (!me) return jsonError('You are not in this room', 403);
  if (game.type !== 'guess') return jsonError('Wrong endpoint');
  if (room.status !== 'playing') return jsonError('Game is not running', 409);
  if (room.turn_player_id !== userId) return jsonError('Not your turn', 403);

  const { value } = await req.json().catch(() => ({}));
  const state = room.round_state as {
    min: number;
    max: number;
    guesses: { by: string; name: string; value: number; dir: string }[];
    guessRound: number;
  };
  const n = Number(value);
  if (!Number.isInteger(n) || n < state.min || n > state.max) return jsonError('Guess out of range');

  const { data: secretRow } = await admin
    .from('room_secrets')
    .select('secret')
    .eq('room_id', room.id)
    .single();
  const secret = secretRow?.secret?.value;
  if (typeof secret !== 'number') return jsonError('Secret missing', 500);

  const dir = n === secret ? 'correct' : n < secret ? 'higher' : 'lower';
  const guesses = [...state.guesses, { by: userId, name: me.display_name, value: n, dir }];

  if (dir !== 'correct') {
    const { error } = await admin
      .from('rooms')
      .update({
        round_state: { ...state, guesses },
        turn_player_id: nextTurnPlayer(players, userId),
      })
      .eq('id', room.id);
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true, dir });
  }

  // Correct: fewer total guesses in the round = more points (min 1, max 10).
  const points = Math.max(1, 11 - guesses.length);
  await admin.from('room_players').update({ score: me.score + points }).eq('id', me.id);

  const nextRound = state.guessRound + 1;
  if (nextRound >= room.total_rounds) {
    await admin
      .from('rooms')
      .update({ round_state: { ...state, guesses, lastWin: { name: me.display_name, secret, points } } })
      .eq('id', room.id);
    const { data: fresh } = await admin
      .from('room_players')
      .select('*')
      .eq('room_id', room.id)
      .order('joined_at');
    await finishGame({ ...ctx, players: fresh ?? players });
    return NextResponse.json({ ok: true, dir, finished: true });
  }

  const newSecret = Math.floor(Math.random() * (state.max - state.min + 1)) + state.min;
  await admin.from('room_secrets').update({ secret: { value: newSecret } }).eq('room_id', room.id);
  const { error } = await admin
    .from('rooms')
    .update({
      round_state: {
        ...state,
        guesses: [],
        guessRound: nextRound,
        lastWin: { name: me.display_name, secret, points },
      },
      turn_player_id: nextTurnPlayer(players, userId),
      current_round: nextRound,
    })
    .eq('id', room.id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, dir, points });
}
