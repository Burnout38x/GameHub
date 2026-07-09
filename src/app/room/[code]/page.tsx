import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import RoomClient from '@/components/room/RoomClient';

export default async function RoomPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/room/${code}`);

  const { data: room } = await supabase.from('rooms').select('id').eq('code', code).single();
  if (!room) {
    return (
      <div className="glass mx-auto mt-16 max-w-md p-8 text-center">
        <div className="text-4xl">🚪</div>
        <h1 className="mt-3 text-2xl font-black">Room not found</h1>
        <p className="mt-2 text-white/60">
          Code <span className="font-mono font-bold text-indigo-300">{code}</span> doesn’t exist or
          the room was closed.
        </p>
        <a href="/rooms/join" className="btn mt-6">Try another code</a>
      </div>
    );
  }

  return <RoomClient code={code} userId={user.id} />;
}
