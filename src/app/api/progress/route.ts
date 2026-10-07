import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validWeeklyGoal } from '@/lib/progress';
import { isSameOriginRequest } from '@/lib/server/request-origin';

export async function GET() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to view your progress.' }, { status: 401 });
  const { data, error } = await createAdminClient().rpc('player_progress_summary', { target_profile_id: user.id });
  if (error) return NextResponse.json({ error: 'Could not load progress. Please try again.' }, { status: 503 });
  return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function PATCH(request: Request) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to manage your goal.' }, { status: 401 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'This request is not allowed.' }, { status: 403 });
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 2048) return NextResponse.json({ error: 'Request is too large.' }, { status: 400 });
    body = JSON.parse(text);
  } catch { return NextResponse.json({ error: 'Invalid goal.' }, { status: 400 }); }
  const goal = body && typeof body === 'object' && 'weeklyGoal' in body ? body.weeklyGoal : undefined;
  if (!validWeeklyGoal(goal)) return NextResponse.json({ error: 'Choose a whole number from 1 to 50.' }, { status: 400 });
  const { error } = await createAdminClient().from('player_progress_settings').upsert({ profile_id: user.id, weekly_goal: goal });
  if (error) return NextResponse.json({ error: 'Your goal could not be saved. Please try again.' }, { status: 503 });
  return NextResponse.json({ weeklyGoal: goal });
}
