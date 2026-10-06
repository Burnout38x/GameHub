import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/** Serialize room actions across application instances. Requires multiplayer migration. */
export async function withRoomLock(code: string, action: () => Promise<Response>): Promise<Response> {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const admin = createAdminClient();
  const token = crypto.randomUUID();
  let acquired = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    const { data, error } = await admin.rpc('claim_room_action', { room_code: code.toUpperCase(), action_token: token });
    if (error) {
      console.error('[room-action] lock unavailable', { code: error.code });
      return NextResponse.json({ error: 'Room updates are temporarily unavailable. Please try again shortly.' }, { status: 503 });
    }
    if (data) { acquired = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!acquired) return NextResponse.json({ error: 'Another player is updating the room. Please try again.' }, { status: 409 });
  try {
    return await action();
  } catch {
    console.error('[room-action] action failed');
    return NextResponse.json({ error: 'Could not complete that action. Please refresh the room and try again.' }, { status: 500 });
  } finally {
    await admin.rpc('release_room_action', { room_code: code.toUpperCase(), action_token: token });
  }
}
