import { NextRequest, NextResponse } from 'next/server';
import { loadRoomContext, jsonError, finishGame, nextTurnPlayer } from '@/lib/server/room-actions';
import { buildRuleRound } from '@/lib/server/rule-round';
import { RULES, ruleAccepts } from '@/lib/local-games/rule-bank';

/**
 * POST /api/rooms/[code]/rule — Rule Discoverer. The hidden rule id lives in
 * room_secrets. On your turn: test one example ({ test }) or identify the rule
 * ({ guessId }). Correct guess +5, wrong guess -1 and the turn passes.
 */
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const ctx = await loadRoomContext(params.code);
  if (ctx instanceof NextResponse) return ctx;
  const { admin, userId, room, game, players, me } = ctx;

  if (!me) return jsonError('You are not in this room', 403);
  if (game.type !== 'rule') return jsonError('Wrong endpoint');
  if (room.status !== 'playing') return jsonError('Game is not running', 409);
  if (room.turn_player_id !== userId) return jsonError('Not your turn', 403);

  const body = await req.json().catch(() => ({}));
  const state = room.round_state as {
    kind: string;
    evidence: { value: string; accepted: boolean; system: boolean; by?: string }[];
    choices: { id: string; name: string; desc: string }[];
    usedRuleIds: string[];
    ruleRound: number;
  };

  const { data: secretRow } = await admin
    .from('room_secrets')
    .select('secret')
    .eq('room_id', room.id)
    .single();
  const rule = RULES.find((r) => r.id === secretRow?.secret?.ruleId);
  if (!rule) return jsonError('Rule missing', 500);

  // ----- Test an example -----
  if (typeof body.test === 'string') {
    const value = body.test.trim();
    if (!value || value.length > 30) return jsonError('Enter a short word or number to test');
    const accepted = ruleAccepts(rule, value);
    const { error } = await admin
      .from('rooms')
      .update({
        round_state: {
          ...state,
          evidence: [...state.evidence, { value, accepted, system: false, by: me.display_name }],
          lastGuess: null,
        },
        turn_player_id: nextTurnPlayer(players, userId),
      })
      .eq('id', room.id);
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true, accepted });
  }

  // ----- Guess the rule -----
  if (typeof body.guessId !== 'string') return jsonError('Test an example or guess the rule');
  const picked = state.choices.find((c) => c.id === body.guessId);
  if (!picked) return jsonError('Pick one of the listed rules');

  if (picked.id !== rule.id) {
    await admin
      .from('room_players')
      .update({ score: Math.max(0, me.score - 1) })
      .eq('id', me.id);
    const { error } = await admin
      .from('rooms')
      .update({
        round_state: { ...state, lastGuess: { name: me.display_name, ruleName: picked.name } },
        turn_player_id: nextTurnPlayer(players, userId),
      })
      .eq('id', room.id);
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true, correct: false });
  }

  const points = 5;
  await admin.from('room_players').update({ score: me.score + points }).eq('id', me.id);
  const lastResult = { name: me.display_name, ruleName: rule.name, ruleDesc: rule.desc, points };

  const nextRound = state.ruleRound + 1;
  if (nextRound >= room.total_rounds) {
    await admin
      .from('rooms')
      .update({ round_state: { ...state, lastResult, lastGuess: null } })
      .eq('id', room.id);
    const { data: fresh } = await admin
      .from('room_players')
      .select('*')
      .eq('room_id', room.id)
      .order('joined_at');
    await finishGame({ ...ctx, players: fresh ?? players });
    return NextResponse.json({ ok: true, correct: true, finished: true });
  }

  const next = buildRuleRound(state.usedRuleIds);
  await admin.from('room_secrets').update({ secret: { ruleId: next.ruleId } }).eq('room_id', room.id);
  const { error } = await admin
    .from('rooms')
    .update({
      round_state: { ...next.state, ruleRound: nextRound, lastResult, lastGuess: null },
      turn_player_id: nextTurnPlayer(players, userId),
      current_round: nextRound,
    })
    .eq('id', room.id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, correct: true, points });
}
