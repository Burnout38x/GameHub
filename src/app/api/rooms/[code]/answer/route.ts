import { NextRequest, NextResponse } from 'next/server';
import { loadRoomContext, jsonError } from '@/lib/server/room-actions';
import { isTurnBased } from '@/lib/game-utils';

/** POST /api/rooms/[code]/answer — submit an answer for the current round (quiz + prompt games). */
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const ctx = await loadRoomContext(params.code);
  if (ctx instanceof NextResponse) return ctx;
  const { admin, userId, room, game, players, me } = ctx;

  if (!me) return jsonError('You are not in this room', 403);
  if (room.status !== 'playing') return jsonError('Game is not running', 409);
  if (room.round_phase !== 'answering') return jsonError('Round already revealed', 409);
  if (game.type !== 'quiz' && game.type !== 'prompt') return jsonError('Wrong endpoint for this game');

  const turnBased = isTurnBased(game.slug, game.type);
  if (turnBased && room.turn_player_id !== userId) return jsonError('Not your turn', 403);

  const { answer } = await req.json().catch(() => ({}));
  if (typeof answer !== 'string' || answer.length === 0 || answer.length > 200)
    return jsonError('Bad answer');

  const promptId = room.prompt_ids[room.current_round];
  const { data: prompt } = await admin.from('prompts').select('content').eq('id', promptId).single();
  if (!prompt) return jsonError('Prompt missing', 500);

  // Scoring
  let isCorrect: boolean | null = null;
  let points = 0;
  if (game.type === 'quiz') {
    isCorrect = answer === prompt.content.answer;
    points = isCorrect ? 1 : 0;
  } else {
    const cfg = game.config ?? {};
    if (cfg.scoreChoice) points = answer === cfg.scoreChoice ? 1 : 0; // Truth-or-Dare / 2-Min Challenge
    else if (cfg.countLabel) points = answer === cfg.countLabel ? 1 : 0; // Never Have I Ever counts "I Have"
    // Would You Rather: match bonus handled below once everyone answered
  }

  const { error: insErr } = await admin.from('round_answers').insert({
    room_id: room.id,
    round_index: room.current_round,
    profile_id: userId,
    answer: { value: answer },
    is_correct: isCorrect,
    points,
  });
  if (insErr) {
    if (insErr.message.includes('duplicate')) return jsonError('Already answered', 409);
    return jsonError(insErr.message, 500);
  }
  if (points > 0) {
    await admin.from('room_players').update({ score: me.score + points }).eq('id', me.id);
  }

  // Reveal when everyone required has answered.
  const { data: allAnswers } = await admin
    .from('round_answers')
    .select('profile_id, answer')
    .eq('room_id', room.id)
    .eq('round_index', room.current_round);
  const done = turnBased ? true : (allAnswers?.length ?? 0) >= players.length;

  if (done) {
    // Would You Rather "great minds" bonus: everyone picked the same side (2+ players).
    if (game.config?.optionsFromContent && players.length > 1 && allAnswers) {
      const values = allAnswers.map((a) => a.answer?.value);
      if (values.length === players.length && new Set(values).size === 1) {
        // WYR awards no points on submit, so the loaded scores are still current.
        for (const p of players) {
          await admin.from('room_players').update({ score: p.score + 1 }).eq('id', p.id);
        }
      }
    }
    await admin.from('rooms').update({ round_phase: 'revealed' }).eq('id', room.id);
  }

  return NextResponse.json({ ok: true, isCorrect, points });
}
