import { NextRequest, NextResponse } from 'next/server';
import { getAdminAccess } from '@/lib/server/admin-access';

export async function GET(req: NextRequest) {
  const access = await getAdminAccess();
  if (!access) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  const status = req.nextUrl.searchParams.get('status') ?? 'open';
  if (!['open', 'resolved'].includes(status)) return NextResponse.json({ error: 'Invalid report status.' }, { status: 400 });
  const page = Math.max(1, Math.min(100000, Number(req.nextUrl.searchParams.get('page')) || 1));
  const offset = (Math.floor(page) - 1) * 20;
  const { data, error, count } = await access.admin.from('player_reports')
    .select('id,reporter_id,kind,subject,description,game_name,room_code,status,created_at,resolved_at', { count: 'exact' })
    .eq('status', status).order('created_at', { ascending: false }).order('id').range(offset, offset + 19);
  if (error) return NextResponse.json({ error: 'Reports could not be loaded. Please retry.' }, { status: 503 });
  return NextResponse.json({ reports: data, total: count }, { headers: { 'Cache-Control': 'private, no-store' } });
}
export async function PATCH(req: NextRequest) {
  const access = await getAdminAccess();
  if (!access) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id) || !['open', 'resolved'].includes(body.status)) {
    return NextResponse.json({ error: 'Choose a valid report and status.' }, { status: 400 });
  }
  const { data, error } = await access.admin.from('player_reports').update({ status: body.status,
    resolved_at: body.status === 'resolved' ? new Date().toISOString() : null,
    resolved_by: body.status === 'resolved' ? access.user.id : null,
  }).eq('id', body.id).select('id').maybeSingle();
  if (error) return NextResponse.json({ error: 'Report could not be updated. Please retry.' }, { status: 503 });
  if (!data) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
