import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** Check the current account and database role before creating a privileged client. */
export async function getAdminAccess() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  const { data: profile, error: roleError } = await client.from('profiles').select('role').eq('id', user.id).single();
  if (roleError || profile?.role !== 'admin') return null;
  return { user, admin: createAdminClient() };
}

export async function requireAdmin() {
  const access = await getAdminAccess();
  if (!access) redirect('/login?next=/admin');
  return access;
}
