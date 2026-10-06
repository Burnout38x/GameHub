import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateReport } from '@/lib/reports';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to send a report.' }, { status: 401 });
  const parsed = validateReport(await req.json().catch(() => null));
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { kind, subject, description, gameName, roomCode } = parsed.data!;
  const { data, error } = await createAdminClient().rpc('submit_player_report', {
    p_reporter: user.id, p_kind: kind, p_subject: subject, p_description: description,
    p_game_name: gameName, p_room_code: roomCode,
  });
  if (error) {
    const limited = error.message.includes('report_rate_limit');
    return NextResponse.json({ error: limited ? 'You have sent 5 reports in the last hour. Please try again later.' : 'Your report could not be saved. Please try again.' }, { status: limited ? 429 : 503 });
  }
  return NextResponse.json({ id: data }, { status: 201 });
}
