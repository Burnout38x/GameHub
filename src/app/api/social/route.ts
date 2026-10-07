import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withRoomLock } from '@/lib/server/room-lock';
import { isSameOriginRequest } from '@/lib/server/request-origin';

export const maxDuration = 30;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const jsonError = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function GET(request: Request) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return jsonError('Sign in to see your friends and invitations.', 401);
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (q.length > 40) return jsonError('Search with up to 40 characters.', 400);
  const { data, error } = await createAdminClient().rpc('player_social_dashboard', { actor_id: user.id, search_query: q });
  if (error) {
    console.error('[social] dashboard unavailable', { code: error.code });
    return jsonError('Could not load your friends. Please try again.', 503);
  }
  return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return jsonError('Sign in to manage your friends and invitations.', 401);
  // Browser mutation calls must originate from this application.
  if (!isSameOriginRequest(request)) return jsonError('This request is not allowed.', 403);
  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 2048) return jsonError('Request is too large.', 400);
    body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return jsonError('Invalid request.', 400);
  } catch { return jsonError('Invalid request.', 400); }
  const action = body.action;
  if (typeof action !== 'string' || !['follow', 'unfollow', 'presence', 'invite', 'accept', 'decline'].includes(action)) return jsonError('Choose a valid action.', 400);
  const target = action === 'accept' || action === 'decline' ? body.inviteId : body.playerId;
  if (action !== 'presence' && (typeof target !== 'string' || !uuid.test(target))) return jsonError('Choose a valid player or invitation.', 400);
  if (action === 'presence' && ((body.visible !== undefined && typeof body.visible !== 'boolean') || (body.showOnline !== undefined && typeof body.showOnline !== 'boolean'))) return jsonError('Invalid presence setting.', 400);
  if (action === 'invite' && (typeof body.roomCode !== 'string' || !/^[a-z0-9]{4,12}$/i.test(body.roomCode))) return jsonError('Enter a valid room code.', 400);
  const admin = createAdminClient();
  const run = async () => {
    const { data, error } = await admin.rpc('player_social_action', {
      actor_id: user.id, action_name: action, target_id: action === 'presence' ? null : target,
      target_room_code: action === 'invite' ? String(body.roomCode).toUpperCase() : null,
      visible: action === 'presence' ? body.visible ?? null : null,
      show_online: action === 'presence' ? body.showOnline ?? null : null,
    });
    if (error) {
      if (error.code === 'P0001') return jsonError(error.message, /limit|time to respond/.test(error.message) ? 429 : 409);
      console.error('[social] action unavailable', { action, code: error.code });
      return jsonError('Could not save that change. Please try again.', 503);
    }
    return NextResponse.json(data);
  };
  if (action === 'accept') {
    // Resolve only a caller-owned invite, then share the same distributed lock
    // used by join/start/leave. The RPC rechecks ownership and all conditions.
    const { data: invite, error } = await admin.from('room_invitations').select('room_id').eq('id', target).eq('recipient_id', user.id).maybeSingle();
    if (error) return jsonError('Invitations are temporarily unavailable.', 503);
    if (!invite) return jsonError('Invitation not found.', 404);
    const { data: room } = await admin.from('rooms').select('code').eq('id', invite.room_id).maybeSingle();
    if (!room) return jsonError('This room is no longer available.', 409);
    return withRoomLock(room.code, run);
  }
  if (action === 'invite') return withRoomLock(String(body.roomCode).toUpperCase(), run);
  return run();
}
