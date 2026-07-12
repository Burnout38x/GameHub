import { NextRequest, NextResponse } from 'next/server';
import { loadRoomContext, jsonError, finishGame, nextTurnPlayer } from '@/lib/server/room-actions';
import { shuffle } from '@/lib/game-utils';
import { codeFeedback } from '@/lib/local-games/logic';

/** POST /api/rooms/[code]/crack — Code Crackers. The secret code lives server-side only. */
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const ctx = await loadRoomContext(params.code);
  if (ctx instanceof NextResponse) return ctx;
  const { admin, userId, room, game, players, me } = ctx;

  if (!me) return jsonError('You are not in this room', 403);
  if (game.type !== 'code') return jsonError('Wrong endpoint');
  if (room.status !== 'playing') return jsonError('Game is not running', 409);
  if (room.turn_player_id !== userId) return jsonError('Not your turn', 403);

  const { guess } = await req.json().catch(() => ({}));
  const state = room.round_state as {
    length: number;
    guesses: { by: string; name: string; guess: string; exact: number; misplaced: number }[];
    guessRound: number;
    turnCount: number;
    maxTurns: number;
  };
  if (typeof guess !== 'string' || !new RegExp(`^\\d{${state.length}}$`).test(guess))
    return jsonError(`Enter exactly ${state.length} digits`);
  const digits = guess.split('').map(Number);
  if (new Set(digits).size !== digits.length) return jsonError('No repeated digits in this code');

  const { data: secretRow } = await admin
    .from('room_secrets')
    .select('secret')
    .eq('room_id', room.id)
    .single();
  const secret: number[] = secretRow?.secret?.code;
  if (!Array.isArray(secret)) return jsonError('Secret missing', 500);

  const result = codeFeedback(digits, secret);
  const turnCount = state.turnCount + 1;
  const guesses = [
    { by: userId, name: me.display_name, guess, ...result },
    ...state.guesses,
  ];
  const cracked = result.exact === state.length;
  const outOfTurns = !cracked && turnCount >= state.maxTurns;

  if (!cracked && !outOfTurns) {
    const { error } = await admin
      .from('rooms')
      .update({
        round_state: { ...state, guesses, turnCount },
        turn_player_id: nextTurnPlayer(players, userId),
      })
      .eq('id', room.id);
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true, ...result });
  }

  // Round over: cracked (earlier = more points) or everyone ran out of turns.
  const points = cracked ? Math.max(1, 10 - Math.floor((turnCount - 1) / 2)) : 0;
  if (points > 0) {
    await admin.from('room_players').update({ score: me.score + points }).eq('id', me.id);
  }
  const lastResult = {
    name: cracked ? me.display_name : null,
    code: secret.join(''),
    points,
  };

  const nextRound = state.guessRound + 1;
  if (nextRound >= room.total_rounds) {
    await admin
      .from('rooms')
      .update({ round_state: { ...state, guesses, turnCount, lastResult } })
      .eq('id', room.id);
    const { data: fresh } = await admin
      .from('room_players')
      .select('*')
      .eq('room_id', room.id)
      .order('joined_at');
    await finishGame({ ...ctx, players: fresh ?? players });
    return NextResponse.json({ ok: true, ...result, finished: true });
  }

  const newSecret = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, state.length);
  await admin.from('room_secrets').update({ secret: { code: newSecret } }).eq('room_id', room.id);
  const { error } = await admin
    .from('rooms')
    .update({
      round_state: { ...state, guesses: [], guessRound: nextRound, turnCount: 0, lastResult },
      turn_player_id: nextTurnPlayer(players, userId),
      current_round: nextRound,
    })
    .eq('id', room.id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, ...result, points });
}
