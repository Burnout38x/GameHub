// Isolated local social concurrency/security checks. Never reads production env.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright-core';
const vars = Object.fromEntries([...readFileSync('/private/tmp/gamehub-codex-audit-20261006/local.env', 'utf8').matchAll(/^([A-Z_]+)="(.*)"$/gm)].map(m => [m[1], m[2]]));
assert.equal(vars.API_URL, 'http://127.0.0.1:58321');
const db = new URL(vars.DB_URL); assert.equal(db.hostname, '127.0.0.1'); assert.equal(db.port, '58322');
const admin = createClient(vars.API_URL, vars.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const users = [], rooms = [], checks = [];
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const mark = label => { checks.push(label); console.log('PASS ' + label); };
const action = (actor, name, target = null, code = null, extra = {}) => admin.rpc('player_social_action', { actor_id: actor.id, action_name: name, target_id: target, target_room_code: code, ...extra });
const requireOK = r => { assert.ifError(r.error); return r.data; };
async function person(label) {
  const username = `sqlqa_${label}_${Date.now()}`, email = username + '@example.test', password = crypto.randomUUID() + 'Qa1!';
  const r = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username } });
  assert.ifError(r.error); const id = r.data.user.id; users.push(id); return { id, email, password, username };
}
async function session(p) {
  const ctx = await browser.newContext(), page = await ctx.newPage();
  await page.goto('http://127.0.0.1:3199/login'); await page.getByLabel('Email', { exact: true }).fill(p.email); await page.getByLabel('Password', { exact: true }).fill(p.password); await page.getByRole('button', { name: 'Log in', exact: true }).click(); await page.waitForURL('**/games'); await page.goto('about:blank'); return ctx;
}
let plans = '', failure = null;
try {
  const host = await person('host'), a = await person('a'), b = await person('b');
  for (const friend of [a, b]) { requireOK(await action(host, 'follow', friend.id)); requireOK(await action(friend, 'follow', host.id)); }
  const game = requireOK(await admin.from('games').select('id').eq('type', 'predict').limit(1).single());
  async function room() {
    const r = requireOK(await admin.from('rooms').insert({ code: crypto.randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase(), host_id: host.id, game_id: game.id }).select().single()); rooms.push(r.id);
    requireOK(await admin.from('room_players').insert({ room_id: r.id, profile_id: host.id, display_name: host.username })); return r;
  }
  const r = await room();
  for (const friend of [a, b]) requireOK(await action(host, 'invite', friend.id, r.code));
  const invites = requireOK(await admin.from('room_invitations').select('*').eq('room_id', r.id));
  const contexts = await Promise.all([session(a), session(b)]);
  const responses = await Promise.all([a, b].map((p, index) => contexts[index].request.post('http://127.0.0.1:3199/api/social', { data: { action: 'accept', inviteId: invites.find(i => i.recipient_id === p.id).id } })));
  assert.deepEqual(responses.map(r => r.status()).sort(), [200, 409]);
  const members = requireOK(await admin.from('room_players').select('profile_id').eq('room_id', r.id)); assert.equal(members.length, 2);
  mark('simultaneous HTTP accepts enforce two-player capacity using shared room lock');
  const expiredRoom = await room(); requireOK(await action(host, 'invite', a.id, expiredRoom.code));
  const expired = requireOK(await admin.from('room_invitations').select('id').eq('room_id', expiredRoom.id).single());
  requireOK(await admin.from('room_invitations').update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq('id', expired.id));
  assert((await action(a, 'accept', expired.id)).error?.message.includes('no longer available'));
  assert(!requireOK(await admin.rpc('player_social_dashboard', { actor_id: a.id })).invitations.some(i => i.id === expired.id));
  mark('expired invitation is absent from inbox and cannot join');
  requireOK(await action(a, 'presence', null, null, { show_online: true, visible: true }));
  assert(requireOK(await admin.rpc('player_social_dashboard', { actor_id: host.id })).following.find(p => p.id === a.id).online);
  requireOK(await admin.from('player_presence').update({ last_seen_at: new Date(Date.now() - 91_000).toISOString() }).eq('profile_id', a.id));
  assert(!requireOK(await admin.rpc('player_social_dashboard', { actor_id: host.id })).following.find(p => p.id === a.id).online);
  mark('online status expires after 90 seconds without a heartbeat');
  // Seed only test-owned historical events to reach quota without creating 20 accounts.
  requireOK(await admin.from('room_invitations').delete().eq('sender_id', host.id));
  const quotaRooms = await Promise.all([room(), room()]);
  requireOK(await admin.from('room_invitations').insert(Array.from({ length: 2 }, () => ({ sender_id: host.id, recipient_id: a.id, room_id: r.id, status: 'declined' }))));
  const pairQuota = await Promise.all(quotaRooms.map(room => action(host, 'invite', a.id, room.code)));
  assert.equal(pairQuota.filter(r => !r.error).length, 1); assert.equal(pairQuota.filter(r => r.error?.message.includes('time to respond')).length, 1);
  mark('concurrent invitations enforce three-per-friend hourly limit atomically');
  requireOK(await admin.from('room_invitations').delete().eq('sender_id', host.id));
  requireOK(await admin.from('room_invitations').insert(Array.from({ length: 19 }, () => ({ sender_id: host.id, recipient_id: a.id, room_id: r.id, status: 'declined' }))));
  const globalQuota = await Promise.all(quotaRooms.map(room => action(host, 'invite', b.id, room.code)));
  assert.equal(globalQuota.filter(r => !r.error).length, 1); assert.equal(globalQuota.filter(r => r.error?.message.includes('Invitation limit')).length, 1);
  mark('concurrent invitations enforce twenty-per-sender hourly limit atomically');
  const clients = [createClient(vars.API_URL, vars.ANON_KEY, { auth: { persistSession: false } }), createClient(vars.API_URL, vars.ANON_KEY, { auth: { persistSession: false } })];
  requireOK(await clients[1].auth.signInWithPassword({ email: a.email, password: a.password }));
  for (const client of clients) {
    for (const table of ['player_follows', 'player_presence', 'room_invitations']) {
      assert((await client.from(table).select('*')).error);
      assert((await client.from(table).delete().eq(table === 'player_follows' ? 'follower_id' : table === 'player_presence' ? 'profile_id' : 'sender_id', host.id)).error);
    }
    assert((await client.rpc('player_social_action', { actor_id: host.id, action_name: 'unfollow', target_id: a.id })).error);
    assert((await client.rpc('player_social_dashboard', { actor_id: host.id })).error);
  }
  mark('anonymous and authenticated clients cannot read/delete private social rows or invoke privileged functions');
  const sql = `select relname,relrowsecurity from pg_class where oid in ('public.player_follows'::regclass,'public.player_presence'::regclass,'public.room_invitations'::regclass); explain (analyze,buffers) select public.player_social_dashboard('${host.id}'::uuid,'sqlqa'); explain (analyze,buffers) select * from public.room_invitations where recipient_id='${a.id}'::uuid and status='pending' and expires_at>now() order by created_at desc limit 100;`;
  plans = execFileSync('/opt/homebrew/opt/libpq/bin/psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-h', db.hostname, '-p', db.port, '-U', db.username, '-d', db.pathname.slice(1), '-c', sql], { encoding: 'utf8', env: { ...process.env, PGPASSWORD: decodeURIComponent(db.password), PGOPTIONS: '-c default_transaction_read_only=on -c statement_timeout=30000' } });
  for (const table of ['player_follows', 'player_presence', 'room_invitations']) assert(new RegExp(table + '\\s+\\| t').test(plans)); mark('RLS enabled; dashboard and bounded inbox EXPLAIN ANALYZE complete');
} catch (error) { failure = error.message; throw error; }
finally {
  await browser.close();
  if (rooms.length) requireOK(await admin.from('rooms').delete().in('id', rooms));
  for (const id of users) requireOK(await admin.auth.admin.deleteUser(id));
  writeFileSync('.forge/social-database-report.json', JSON.stringify({ checks, failure, plans, disposableUsersCleaned: users.length, disposableRoomsCleaned: rooms.length }, null, 2));
}
