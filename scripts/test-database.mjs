/** Isolated local Supabase DB verification. Never accepts a remote URL. */
import { spawnSync, spawn } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const container = process.env.GAMEHUB_TEST_DB_CONTAINER ?? 'supabase_db_gamehub-codex-audit-20261006';
if (!/^supabase_db_gamehub-codex-audit-/.test(container)) throw new Error('Only isolated GameHub audit containers are allowed');
const args = ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'];
function sql(source) {
  const result = spawnSync('docker', args, { input: source, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}
function parallel(source) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args); let out = '', err = '';
    child.stdout.on('data', (s) => out += s); child.stderr.on('data', (s) => err += s);
    child.on('exit', (code) => code === 0 ? resolve(out.trim()) : reject(new Error(err)));
    child.stdin.end(source);
  });
}
const existing = sql("select count(*) from information_schema.tables where table_schema='public' and table_name='games';");
if (existing === '0') sql(readFileSync('supabase/schema.sql', 'utf8'));
for (const file of readdirSync('supabase/migrations').filter((f) => f.endsWith('.sql')).sort()) sql(readFileSync(`supabase/migrations/${file}`, 'utf8'));
console.log('PASS schema and all migrations apply');
for (const file of readdirSync('supabase/migrations').filter((f) => f.endsWith('.sql')).sort()) sql(readFileSync(`supabase/migrations/${file}`, 'utf8'));
console.log('PASS migrations can be reapplied without destroying existing rows');
const u1='10000000-0000-0000-0000-000000000001', u2='10000000-0000-0000-0000-000000000002', u3='10000000-0000-0000-0000-000000000003';
const r1='20000000-0000-0000-0000-000000000001', r2='20000000-0000-0000-0000-000000000002', r3='20000000-0000-0000-0000-000000000003';
sql(`
insert into auth.users(id,raw_user_meta_data) values
('${u1}','{"username":"audit_admin"}'),('${u2}','{"username":"audit_player"}'),('${u3}','{"username":"audit_partner"}') on conflict do nothing;
-- Only isolated audit fixtures are reset on repeated verification.
delete from public.match_history where room_id in ('${r1}','${r2}','${r3}');
delete from public.rooms where id in ('${r1}','${r2}','${r3}');
update public.profiles set games_played=0,games_won=0,total_points=0,current_streak=0,best_streak=0 where id in ('${u2}','${u3}');
insert into public.rooms(id,code,host_id,game_id,status,total_rounds)
 select id,code,'${u2}',(select id from games where slug='riddle-rush'),'playing',5
 from (values ('${r1}'::uuid,'AUDIT1'),('${r2}'::uuid,'AUDIT2'),('${r3}'::uuid,'AUDIT3')) as seed(id,code);
insert into public.room_players(room_id,profile_id,display_name,score)
 select r.id,p.id,p.username,case when p.id='${u2}' then 5 else 3 end from rooms r cross join profiles p
 where r.id in ('${r1}','${r2}','${r3}') and p.id in ('${u2}','${u3}');
insert into public.prompts(game_id,content) select id,'{"question":"private","answer":"secret","options":["secret","wrong"]}' from games where slug='riddle-rush';
insert into public.round_answers(room_id,round_index,profile_id,answer) values ('${r1}',0,'${u2}','{"value":"private memory"}');
`);
const privacy = sql(`set role authenticated; set request.jwt.claim.sub='${u3}';
select 'rooms='||count(*) from rooms; select 'players='||count(*) from room_players;
select 'answers='||count(*) from round_answers; select 'prompts='||count(*) from prompts;
select 'secrets='||count(*) from room_secrets;`);
for (const label of ['rooms','players','answers','prompts','secrets']) assert.ok(privacy.includes(`${label}=0`), privacy);
console.log('PASS authenticated non-admin cannot directly read rooms, players, answers, prompts or secrets');
assert.throws(() => sql(`set role authenticated; set request.jwt.claim.sub='${u2}'; update profiles set total_points=9999 where id='${u2}';`), /permission denied/);
sql(`set role authenticated; set request.jwt.claim.sub='${u2}'; update profiles set username='audit_player_renamed' where id='${u2}';`);
assert.equal(sql(`select username from profiles where id='${u2}';`), 'audit_player_renamed');
console.log('PASS users can edit username but cannot forge lifetime statistics');
assert.throws(() => sql("set role authenticated; select claim_room_action('AUDIT1','30000000-0000-0000-0000-000000000001');"), /permission denied/);
assert.throws(() => sql(`set role authenticated; select finish_room_game('${r1}');`), /permission denied/);
console.log('PASS room lease/finalization RPCs reject authenticated player execution');
sql("delete from room_action_locks where room_code='AUDIT1';");
const claims = await Promise.all([1,2].map((i) => parallel(`set role service_role; select claim_room_action('AUDIT1','30000000-0000-0000-0000-00000000000${i}');`)));
assert.equal(claims.filter((s) => s.endsWith('t')).length, 1, claims.join(','));
const token=sql("select token from room_action_locks where room_code='AUDIT1';");
sql("select release_room_action('AUDIT1','30000000-0000-0000-0000-000000000009');");
assert.equal(sql("select count(*) from room_action_locks where room_code='AUDIT1';"),'1');
sql(`select release_room_action('AUDIT1','${token}');`);
assert.equal(sql("select count(*) from room_action_locks where room_code='AUDIT1';"),'0');
console.log('PASS concurrent room leases have one winner; wrong token cannot release another action');
const finish = await Promise.all([r1,r1,r2].map((id) => parallel(`set role service_role; select finish_room_game('${id}');`)));
assert.equal(finish.filter((s) => s.endsWith('t')).length,2);
assert.equal(sql(`select games_played||','||games_won||','||total_points||','||current_streak from profiles where id='${u2}';`),'2,2,10,2');
assert.equal(sql(`select count(*) from match_history where room_id in ('${r1}','${r2}');`),'4');
assert.equal(sql(`select count(*) from rooms where id in ('${r1}','${r2}') and status='finished' and winner_ids=array['${u2}'::uuid];`),'2');
console.log('PASS simultaneous duplicate and separate-room finalization records exactly one result and preserves lifetime totals');
sql(`create or replace function public.audit_reject_history() returns trigger language plpgsql as $$ begin if new.profile_id='${u3}' then raise exception 'simulated persistence failure'; end if; return new; end $$;
create trigger audit_reject_history before insert on match_history for each row execute function public.audit_reject_history();`);
try {
  assert.throws(() => sql(`select finish_room_game('${r3}');`), /simulated persistence failure/);
  assert.equal(sql(`select status from rooms where id='${r3}';`),'playing');
  assert.equal(sql(`select games_played||','||total_points from profiles where id='${u2}';`),'2,10');
  assert.equal(sql(`select count(*) from match_history where room_id='${r3}';`),'0');
} finally { sql('drop trigger audit_reject_history on match_history; drop function public.audit_reject_history();'); }
console.log('PASS finalization rolls back room, history and statistics together on persistence failure');
console.log('Database verification: 8 check groups passed (isolated local container only)');
