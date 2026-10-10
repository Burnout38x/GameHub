import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSameOriginRequest } from '@/lib/server/request-origin';
import { jsonError } from '@/lib/server/room-actions';
import { verifyMissionRun } from '@/lib/fortress/campaign';
export const maxDuration = 30;

const MAX_BODY = 1024;
const NO_STORE = { 'Cache-Control': 'private, no-store' };

/** GET — the signed-in player's best stars per mission. */
export async function GET() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return jsonError('Sign in to sync your campaign', 401);
  const { data, error } = await createAdminClient().from('fortress_campaign')
    .select('mission, stars, best_seconds').eq('profile_id', user.id).order('mission');
  if (error) return jsonError('Could not load your campaign. Please retry.', 503);
  return NextResponse.json({ missions: data ?? [] }, { headers: NO_STORE });
}

/** POST { mission, stars, shots } — records a mission victory (new stars only earn points). */
export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) return jsonError('Request origin not allowed', 403);
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return jsonError('Sign in to save your stars', 401);
  const raw = await req.text();
  if (raw.length > MAX_BODY) return jsonError('Battle record is too large', 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return jsonError('Invalid battle record'); }
  const run = verifyMissionRun(body);
  if ('error' in run) return jsonError(run.error);
  const { data, error } = await createAdminClient().rpc('record_fortress_victory', {
    actor_id: user.id, mission_id: run.mission, earned_stars: run.stars, seconds: run.shots,
  });
  if (error) {
    const limited = error.message.includes('limit reached');
    return jsonError(limited ? 'Save limit reached. Try again in an hour.' : 'Could not save your victory. Please retry.', limited ? 429 : 500);
  }
  return NextResponse.json({ ok: true, ...run, ...(data as object) }, { headers: NO_STORE });
}
