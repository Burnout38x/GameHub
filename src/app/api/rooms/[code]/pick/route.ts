import { NextResponse } from 'next/server';
import { loadRoomContext, jsonError } from '@/lib/server/room-actions';
import { withRoomLock } from '@/lib/server/room-lock';
import { isSameOriginRequest } from '@/lib/server/request-origin';
import { isCurrentRound } from '@/lib/server/multiplayer-rules';
import { DARE_KINDS, dealPick, hasPicked, promptKind, type DareKind } from '@/lib/truth-or-dare';
export const maxDuration = 30;

/** POST /api/rooms/[code]/pick — the turn player chooses Truth or Dare for this round. */
async function handlePost(req: Request, code: string) {
  const ctx = await loadRoomContext(code);
  if (ctx instanceof NextResponse) return ctx;
  const { admin, userId, room, game, me } = ctx;
  if (!me) return jsonError('You are not in this room', 403);
  if (!game.config?.pickTruthOrDare) return jsonError('This game does not use picks', 409);
  if (room.status !== 'playing' || room.round_phase !== 'answering') return jsonError('This round is not open', 409);
  const body = (await req.json().catch(() => null)) ?? {};
  if (!isCurrentRound(body.fromRound, room.current_round)) return jsonError('The round has changed. Refresh the room before acting.', 409);
  if (room.turn_player_id !== userId) return jsonError('Not your turn', 403);
  if (!DARE_KINDS.includes(body.kind)) return jsonError('Pick truth or dare');
  if (hasPicked(room.round_state, room.current_round)) return jsonError('You already picked this round', 409);

  const reserve: string[] = Array.isArray(room.round_state?.reserve) ? room.round_state.reserve : [];
  // The whole deck is small; reading it by game avoids a huge `id in (…)` URL.
  const { data: prompts, error } = await admin.from('prompts').select('id, content').eq('game_id', game.id);
  if (error) return jsonError('Could not shuffle the deck. Please retry.', 503);
  const kinds = new Map<string, DareKind>((prompts ?? []).map(p => [p.id, promptKind(p.content)]));
  const deal = dealPick(room.prompt_ids, room.current_round, reserve, kinds, body.kind);
  const kind = deal.fallback ? promptKind((prompts ?? []).find(p => p.id === room.prompt_ids[room.current_round])?.content) : body.kind;

  const { data: updated, error: updateError } = await admin.from('rooms')
    .update({ prompt_ids: deal.promptIds, round_state: { ...room.round_state, reserve: deal.reserve, pick: { round: room.current_round, kind, fallback: deal.fallback } } })
    .eq('id', room.id).eq('current_round', room.current_round).eq('round_phase', 'answering')
    .select('id');
  if (updateError) return jsonError('Could not save your pick. Please retry.', 500);
  if (!updated?.length) return jsonError('The round has changed. Refresh the room.', 409);
  return NextResponse.json({ ok: true, kind, fallback: deal.fallback });
}

export async function POST(req: Request, context: { params: Promise<{ code: string }> }) {
  if (!isSameOriginRequest(req)) return jsonError('Request origin not allowed', 403);
  const { code } = await context.params;
  return withRoomLock(code, () => handlePost(req, code));
}
