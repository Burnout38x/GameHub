import { NextResponse } from 'next/server';
import { loadRoomContext, jsonError, type RoomContext } from '@/lib/server/room-actions';
import { withRoomLock } from '@/lib/server/room-lock';
import { isSameOriginRequest } from '@/lib/server/request-origin';
import { advanceSiege, parseOnlineSiege, playerOrder, publicSiege, settleSiege, submitDesign, type OnlineSiege, type SiegeUpdate } from '@/lib/fortress/online';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

function payload(siege: OnlineSiege, status: string, since: number | null) {
  // The replay only travels to phones that have not seen this shot yet.
  const replay = since !== null && siege.replayTurn > since ? siege.replay : null;
  return { siege: publicSiege(siege), replay, status, serverNow: Date.now() };
}

function loadSiege(ctx: RoomContext): OnlineSiege | NextResponse {
  if (!ctx.me) return jsonError('You are not in this battle', 403);
  if (ctx.game.type !== 'battle') return jsonError('This room is not a Fortress Feud battle', 409);
  if (ctx.room.status === 'lobby') return jsonError('The battle has not started yet', 409);
  const siege = parseOnlineSiege(ctx.room.round_state);
  return siege ?? jsonError('This battle could not be loaded. Start a new room.', 500);
}

const sinceParam = (value: string | null) => (value !== null && /^-?\d{1,4}$/.test(value) ? Number(value) : null);

/** Poll for the battle state, plus the last shot's replay when `since` is older than it. */
export async function GET(req: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const ctx = await loadRoomContext(code);
  if (ctx instanceof NextResponse) return ctx;
  const siege = loadSiege(ctx);
  if (siege instanceof NextResponse) return siege;
  const since = sinceParam(new URL(req.url).searchParams.get('since'));
  return NextResponse.json(payload(siege, ctx.room.status, since), { headers: NO_STORE });
}

async function save(ctx: RoomContext, before: OnlineSiege, after: OnlineSiege, since: number | null) {
  if (after.result) {
    const settled = settleSiege(after);
    if (!settled) return jsonError('Could not settle the battle.', 500);
    const { data, error } = await ctx.admin.rpc('finish_battle_room', {
      target_room_id: ctx.room.id, expected_version: before.version, next_state: after,
      scores: settled.scores, winners: settled.winners,
    });
    if (error) return jsonError('Could not save the battle result. Please retry.', 500);
    if (!data) return jsonError('The battle changed. Refreshing…', 409);
    return NextResponse.json(payload(after, 'finished', since), { headers: NO_STORE });
  }
  const { data, error } = await ctx.admin.from('rooms')
    .update({ round_state: after })
    .eq('id', ctx.room.id).eq('status', 'playing').eq('round_state->>version', String(before.version))
    .select('id');
  if (error) return jsonError('Could not send that order. Please retry.', 500);
  if (!data?.length) return jsonError('The battle changed. Try again.', 409);
  return NextResponse.json(payload(after, 'playing', since), { headers: NO_STORE });
}

/** POST { action: 'design' | 'order' | 'advance', design?, order?, since? }. */
export async function POST(req: Request, context: { params: Promise<{ code: string }> }) {
  if (!isSameOriginRequest(req)) return jsonError('Request origin not allowed', 403);
  const raw = await req.text();
  if (raw.length > 1024) return jsonError('Order is too large', 413);
  let body: { action?: unknown; design?: unknown; order?: unknown; since?: unknown };
  try { body = JSON.parse(raw); } catch { return jsonError('Invalid order'); }
  if (body?.action !== 'design' && body?.action !== 'order' && body?.action !== 'advance') return jsonError('Unknown battle action');
  const since = typeof body.since === 'number' && Number.isInteger(body.since) ? body.since : null;
  const { code } = await context.params;
  return withRoomLock(code, async () => {
    const ctx = await loadRoomContext(code);
    if (ctx instanceof NextResponse) return ctx;
    const siege = loadSiege(ctx);
    if (siege instanceof NextResponse) return siege;
    if (ctx.room.status !== 'playing') return NextResponse.json(payload(siege, ctx.room.status, since), { headers: NO_STORE });
    const now = Date.now();
    const update: SiegeUpdate = body.action === 'design'
      ? submitDesign(siege, ctx.userId, body.design, now)
      : body.action === 'order' ? playerOrder(siege, ctx.userId, body.order, now) : advanceSiege(siege, now);
    if ('error' in update) return NextResponse.json({ error: update.error, ...payload(siege, ctx.room.status, since) }, { status: 409, headers: NO_STORE });
    if (!update.changed) return NextResponse.json(payload(siege, ctx.room.status, since), { headers: NO_STORE });
    return save(ctx, siege, update.siege, since);
  });
}
