import { NextResponse } from 'next/server';
import { applyMarketDay, marketScores, type MarketState } from '@/lib/market-day';
import { loadRoomContext, jsonError } from '@/lib/server/room-actions';
import { withRoomLock } from '@/lib/server/room-lock';
import { isSameOriginRequest } from '@/lib/server/request-origin';
export const maxDuration = 30;

export async function POST(req: Request, context: { params: Promise<{ code: string }> }) {
  if (!isSameOriginRequest(req)) return jsonError('Request origin not allowed', 403);
  const raw = await req.text();
  if (raw.length > 4096) return jsonError('Action is too large', 413);
  let command: unknown;
  try { command = JSON.parse(raw); } catch { return jsonError('Invalid action'); }
  const { code } = await context.params;
  return withRoomLock(code, async () => {
    const ctx = await loadRoomContext(code);
    if (ctx instanceof NextResponse) return ctx;
    if (!ctx.me) return jsonError('You are not in this room', 403);
    if (ctx.game.type !== 'market' || ctx.room.status !== 'playing') return jsonError('Market Day is not running', 409);
    const state = ctx.room.round_state as MarketState;
    let next: MarketState;
    try { next = applyMarketDay(state, ctx.userId, command); }
    catch (error) { return jsonError(error instanceof Error ? error.message : 'Invalid action', 409); }
    const { data, error } = await ctx.admin.rpc('commit_market_turn', {
      target_room_id: ctx.room.id, expected_version: state.version, next_state: next, scores: marketScores(next),
    });
    if (error) return jsonError('Could not save your turn. Please retry.', 500);
    if (!data) return jsonError('The market changed. Refresh and try again.', 409);
    return NextResponse.json({ ok: true });
  });
}
