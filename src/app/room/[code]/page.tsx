import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import RoomClient from '@/components/room/RoomClient';

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/room/${code}`);

  return <RoomClient code={code} userId={user.id} />;
}
