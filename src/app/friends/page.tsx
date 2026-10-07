import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import FriendsDashboard from '@/components/social/FriendsDashboard';

export const dynamic = 'force-dynamic';
export default async function FriendsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=%2Ffriends');
  return <FriendsDashboard />;
}
