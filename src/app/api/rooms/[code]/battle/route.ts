import { NextResponse } from 'next/server';
import { loadRoomContext, jsonError, type RoomContext } from '@/lib/server/room-actions';
import { withRoomLock } from '@/lib/server/room-lock';
import { isSameOriginRequest } from '@/lib/server/request-origin';
import { parseOnlineBattle, scheduleCommand, settleBattle, type OnlineBattle } from '@/lib/fortress/online';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

function battlePayload(battle: OnlineBattle, status: string) {
  return { battle, status, serverNow: Date.now() };
}

function loadBattle(ctx: RoomContext): OnlineBattle | NextResponse {
  if (!ctx.me) return jsonError('You are not in this battle', 403);
  if (ctx.game.type !== 'battle') return jsonError('This room is not a Fortress Feud battle', 409);
  if (ctx.room.status === 'lobby') return jsonError('The battle has not started yet', 409);
  const battle = parseOnlineBattle(ctx.room.round_state);
  return battle ?? jsonError('This battle could not be loaded. Start a new room.', 500);
}

/** Fast poll for the command log and server clock while a battle is running. */
export async function GET(_req: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const ctx = await loadRoomContext(code);
  if (ctx instanceof NextResponse) return ctx;
  const battle = loadBattle(ctx);
  if (battle instanceof NextResponse) return battle;
  return NextResponse.json(battlePayload(battle, ctx.room.status), { headers: NO_STORE });
}

async function finish(ctx: RoomContext, battle: OnlineBattle) {
  const settled = settleBattle(battle, Date.now());
  if (!settled) return jsonError('The battle is still going.', 409);
  const { data, error } = await ctx.admin.rpc('finish_battle_room', {
    target_room_id: ctx.room.id, expected_version: battle.version, next_state: settled.battle,
    scores: settled.scores, winners: settled.winners,
  });
  if (error) return jsonError('Could not save the battle result. Please retry.', 500);
  if (!data) return jsonError('The battle changed. Refreshing…', 409);
  return NextResponse.json(battlePayload(settled.battle, 'finished'), { headers: NO_STORE });
}

async function command(ctx: RoomContext, battle: OnlineBattle, input: unknown) {
  const scheduled = scheduleCommand(battle, ctx.userId, input, Date.now());
  if ('error' in scheduled) return NextResponse.json({ error: scheduled.error, ...battlePayload(battle, ctx.room.status) }, { status: 409, headers: NO_STORE });
  const { data, error } = await ctx.admin.from('rooms')
    .update({ round_state: scheduled.battle })
    .eq('id', ctx.room.id).eq('status', 'playing').eq('round_state->>version', String(battle.version))
    .select('id');
  if (error) return jsonError('Could not send that order. Please retry.', 500);
  if (!data?.length) return jsonError('The battle changed. Try again.', 409);
  return NextResponse.json({ ...battlePayload(scheduled.battle, 'playing'), command: scheduled.command }, { headers: NO_STORE });
}

/** POST { action: 'command', command } or { action: 'finish' }. */
export async function POST(req: Request, context: { params: Promise<{ code: string }> }) {
  if (!isSameOriginRequest(req)) return jsonError('Request origin not allowed', 403);
  const raw = await req.text();
  if (raw.length > 1024) return jsonError('Order is too large', 413);
  let body: { action?: unknown; command?: unknown };
  try { body = JSON.parse(raw); } catch { return jsonError('Invalid order'); }
  if (body?.action !== 'command' && body?.action !== 'finish') return jsonError('Unknown battle action');
  const { code } = await context.params;
  return withRoomLock(code, async () => {
    const ctx = await loadRoomContext(code);
    if (ctx instanceof NextResponse) return ctx;
    const battle = loadBattle(ctx);
    if (battle instanceof NextResponse) return battle;
    if (ctx.room.status !== 'playing') return NextResponse.json(battlePayload(battle, ctx.room.status), { headers: NO_STORE });
    return body.action === 'finish' ? finish(ctx, battle) : command(ctx, battle, body.command);
  });
}
