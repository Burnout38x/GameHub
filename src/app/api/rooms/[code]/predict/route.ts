import { NextRequest, NextResponse } from 'next/server';
import { loadRoomContext, jsonError } from '@/lib/server/room-actions';
import { levenshtein, normalize } from '@/lib/local-games/logic';

/**
 * POST /api/rooms/[code]/predict — the two 'predict' couple games.
 *
 * Know Your Partner (multiple choice): the round's turn player answers privately
 * (stored in room_secrets so the partner can't peek), then the partner guesses.
 *
 * Who Remembers It Better (free text): both answer the same question; close answers
 * auto-match, different answers go to the turn player to decide same/different.
 */
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const ctx = await loadRoomContext(params.code);
  if (ctx instanceof NextResponse) return ctx;
  const { admin, userId, room, game, players, me } = ctx;

  if (!me) return jsonError('You are not in this room', 403);
  if (game.type !== 'predict') return jsonError('Wrong endpoint');
  if (room.status !== 'playing') return jsonError('Game is not running', 409);
  if (room.round_phase !== 'answering') return jsonError('Round already revealed', 409);
  if (players.length !== 2) return jsonError('This game needs exactly 2 players', 409);

  const body = await req.json().catch(() => ({}));
  const partner = players.find((p) => p.profile_id !== userId)!;
  const state = room.round_state ?? {};
  const freeText = !!game.config?.freeText;

  // ----- Who Remembers It Better: turn player resolves a disputed comparison -----
  if (freeText && state.stage === 'decide') {
    if (typeof body.decision !== 'string')
      return jsonError('This round is waiting for a same/different decision', 409);
    if (room.turn_player_id !== userId) return jsonError("Waiting for the other partner's decision", 403);
    if (!['same', 'different'].includes(body.decision)) return jsonError('Bad decision');
    const match = body.decision === 'same';
    if (match) {
      for (const p of players) {
        await admin.from('room_players').update({ score: p.score + 1 }).eq('id', p.id);
      }
    }
    const { error } = await admin
      .from('rooms')
      .update({
        round_state: { ...state, stage: 'done', result: { ...state.result, match, decided: true } },
        round_phase: 'revealed',
      })
      .eq('id', room.id)
      .eq('current_round', room.current_round)
      .eq('round_phase', 'answering');
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true, match });
  }

  const { answer } = body;
  if (typeof answer !== 'string' || answer.trim().length === 0 || answer.length > 200)
    return jsonError('Bad answer');
  const value = answer.trim();

  const { data: prompt } = await admin
    .from('prompts')
    .select('content')
    .eq('id', room.prompt_ids[room.current_round])
    .single();
  if (!prompt) return jsonError('Prompt missing', 500);

  if (!freeText) {
    // ----- Know Your Partner -----
    if (!Array.isArray(prompt.content.options) || !prompt.content.options.includes(value))
      return jsonError('Pick one of the options');
    const stage = state.stage ?? 'subject';

    if (stage === 'subject') {
      if (room.turn_player_id !== userId) return jsonError('Your partner answers first this round', 403);
      await admin
        .from('room_secrets')
        .upsert({ room_id: room.id, secret: { predictRound: room.current_round, by: userId, value } });
      const { error } = await admin
        .from('rooms')
        .update({ round_state: { ...state, stage: 'guess' } })
        .eq('id', room.id)
        .eq('current_round', room.current_round);
      if (error) return jsonError(error.message, 500);
      return NextResponse.json({ ok: true });
    }

    // stage === 'guess': the partner predicts the subject's answer.
    if (room.turn_player_id === userId) return jsonError('Your partner guesses this round', 403);
    const { data: secretRow } = await admin
      .from('room_secrets')
      .select('secret')
      .eq('room_id', room.id)
      .single();
    const secret = secretRow?.secret;
    if (secret?.predictRound !== room.current_round || typeof secret?.value !== 'string')
      return jsonError('Answer missing — ask your partner to answer first', 409);
    const correct = secret.value === value;
    if (correct) {
      await admin.from('room_players').update({ score: me.score + 1 }).eq('id', me.id);
    }
    const { error } = await admin
      .from('rooms')
      .update({
        round_state: {
          ...state,
          stage: 'done',
          result: {
            subjectName: partner.display_name,
            subjectAnswer: secret.value,
            guesserName: me.display_name,
            guess: value,
            correct,
          },
        },
        round_phase: 'revealed',
      })
      .eq('id', room.id)
      .eq('current_round', room.current_round)
      .eq('round_phase', 'answering');
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true, correct });
  }

  // ----- Who Remembers It Better: collect both private answers -----
  const { error: insErr } = await admin.from('round_answers').insert({
    room_id: room.id,
    round_index: room.current_round,
    profile_id: userId,
    answer: { value },
    is_correct: null,
    points: 0,
  });
  if (insErr) {
    if (insErr.message.includes('duplicate')) return jsonError('Already answered', 409);
    return jsonError(insErr.message, 500);
  }

  const { data: allAnswers } = await admin
    .from('round_answers')
    .select('profile_id, answer')
    .eq('room_id', room.id)
    .eq('round_index', room.current_round);
  if ((allAnswers?.length ?? 0) < 2) {
    await admin
      .from('rooms')
      .update({ round_state: { ...state, answeredBy: [userId] } })
      .eq('id', room.id)
      .eq('current_round', room.current_round);
    return NextResponse.json({ ok: true, waiting: true });
  }

  const byId = new Map(allAnswers!.map((a) => [a.profile_id, String(a.answer?.value ?? '')]));
  const answersOut = players.map((p) => ({
    name: p.display_name,
    value: byId.get(p.profile_id) ?? '',
  }));
  const [a, b] = players.map((p) => normalize(byId.get(p.profile_id) ?? ''));
  const similarity = 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);
  const auto = a === b || similarity >= 0.84;

  if (auto) {
    for (const p of players) {
      await admin.from('room_players').update({ score: p.score + 1 }).eq('id', p.id);
    }
    const { error } = await admin
      .from('rooms')
      .update({
        round_state: { ...state, stage: 'done', result: { answers: answersOut, match: true, auto: true } },
        round_phase: 'revealed',
      })
      .eq('id', room.id)
      .eq('current_round', room.current_round)
      .eq('round_phase', 'answering');
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true, match: true });
  }

  const { error } = await admin
    .from('rooms')
    .update({ round_state: { ...state, stage: 'decide', result: { answers: answersOut } } })
    .eq('id', room.id)
    .eq('current_round', room.current_round);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, decide: true });
}
