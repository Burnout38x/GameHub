import { NextResponse } from 'next/server';
import { loadRoomContext, jsonError } from '@/lib/server/room-actions';
import { withRoomLock } from '@/lib/server/room-lock';
import { isSameOriginRequest } from '@/lib/server/request-origin';
import { livePayload, loadLive, NO_STORE, saveLive } from '@/lib/server/live-room';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

/** Moves are tiny: a card, an answer or a choice. */
const MAX_BODY_BYTES = 1024;

/** GET: this player's view of a live game (Brain Bowl, What Would You Do?, Whot!). */
export async function GET(_req: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const ctx = await loadRoomContext(code);
  if (ctx instanceof NextResponse) return ctx;
  if (!ctx.me) return jsonError('You are not in this room', 403);
  const live = loadLive(ctx);
  if (live instanceof NextResponse) return live;
  return NextResponse.json(livePayload(live.engine, live.state, ctx.userId, ctx.room.status), { headers: NO_STORE });
}

/** POST { action: 'move', move } plays; POST { action: 'advance' } moves a timed phase on once its deadline passes. */
export async function POST(req: Request, context: { params: Promise<{ code: string }> }) {
  if (!isSameOriginRequest(req)) return jsonError('Request origin not allowed', 403);
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return jsonError('Move is too large', 413);
  let body: { action?: unknown; move?: unknown };
  try { body = JSON.parse(raw); } catch { return jsonError('Invalid move'); }
  if (body?.action !== 'move' && body?.action !== 'advance') return jsonError('Unknown action');
  const { code } = await context.params;
  return withRoomLock(code, async () => {
    const ctx = await loadRoomContext(code);
    if (ctx instanceof NextResponse) return ctx;
    if (!ctx.me) return jsonError('You are not in this room', 403);
    const live = loadLive(ctx);
    if (live instanceof NextResponse) return live;
    const now = Date.now();
    const current = () => livePayload(live.engine, live.state, ctx.userId, ctx.room.status, now);
    if (ctx.room.status !== 'playing') return NextResponse.json(current(), { headers: NO_STORE });
    const update = body.action === 'move' ? live.engine.act(live.state, ctx.userId, body.move, now) : live.engine.advance(live.state, now);
    if ('error' in update) return NextResponse.json({ error: update.error, ...current() }, { status: 409, headers: NO_STORE });
    if (!update.changed) return NextResponse.json(current(), { headers: NO_STORE });
    const saved = await saveLive(ctx, live, update.state);
    if (saved === 'error') return jsonError('Could not save that move. Please retry.', 500);
    if (saved === 'conflict') return NextResponse.json({ error: 'The game moved on. Try again.', ...current() }, { status: 409, headers: NO_STORE });
    return NextResponse.json(livePayload(live.engine, update.state, ctx.userId, saved === 'finished' ? 'finished' : 'playing', now), { headers: NO_STORE });
  });
}
