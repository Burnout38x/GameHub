import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

// Deliberately fixed to disposable local services: never accepts a production URL.
const app = 'http://127.0.0.1:3199';
const env = Object.fromEntries([...readFileSync('/private/tmp/gamehub-codex-audit-20261006/local.env', 'utf8').matchAll(/^([A-Z_]+)="(.*)"$/gm)].map(match => [match[1], match[2]]));
assert.equal(env.API_URL, 'http://127.0.0.1:58321');
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, options);
const anon = createClient(env.API_URL, env.ANON_KEY, options);
const users = [], rooms = [], checks = [];
let browser;
let completed = false;
const mark = text => { checks.push(text); console.log(`PASS ${text}`); };
function denied(result) { assert(result.error); assert.equal(result.error.code, '42501'); }
async function person(index) {
  const username = `expandsec${index}_${Date.now()}`, email = `${username}@example.test`, password = crypto.randomUUID() + 'Q1!';
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username } });
  assert.ifError(created.error); const id = created.data.user.id; users.push(id);
  const client = createClient(env.API_URL, env.ANON_KEY, options);
  assert.ifError((await client.auth.signInWithPassword({ email, password })).error);
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${app}/login`); await page.getByRole('button', { name: /show password/i }).click();
  await page.getByLabel('Email', { exact: true }).fill(email); await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click(); await page.waitForURL('**/games');
  return { id, client, page };
}
const post = (person, path, data, headers = {}) => person.page.request.post(app + path, { data: Buffer.from(typeof data === 'string' ? data : JSON.stringify(data)), headers: { 'Content-Type': 'application/json', ...headers } });
async function success(person, path, data) { const response = await post(person, path, data); assert(response.ok(), `${path}: ${response.status()} ${await response.text()}`); return response.json(); }
async function roomSnapshot(id) { const response = await admin.from('rooms').select('*').eq('id', id).single(); assert.ifError(response.error); return response.data; }
try {
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const people = []; for (let i = 0; i < 5; i++) people.push(await person(i));
  const [host, second, third, fourth, fifth] = people;
  const catalog = await admin.from('games').select('id').eq('slug', 'market-day').single(); assert.ifError(catalog.error);
  const { code } = await success(host, '/api/rooms', { gameId: catalog.data.id });
  const roomRow = await admin.from('rooms').select('id').eq('code', code).single(); assert.ifError(roomRow.error);
  const roomId = roomRow.data.id; rooms.push(roomId);
  const marketPath = `/api/rooms/${code}/market`;
  const moves = Array.from({ length: 20 }, (_, cell) => ({ cell, offer: cell % 3 }));
  const payload = { seed: crypto.randomUUID(), mode: 'standard', moves };
  const anonymous = { page: await (await browser.newContext()).newPage() };
  assert.equal((await post(anonymous, '/api/pocket-paradise', payload)).status(), 401);
  assert.equal((await post(anonymous, marketPath, { type: 'move', expectedVersion: 0, destination: 1 })).status(), 401);
  for (const path of ['/api/pocket-paradise', marketPath, `/api/rooms/${code}/leave`]) assert.equal((await post(host, path, payload, { Origin: 'https://untrusted.example' })).status(), 403);
  mark('anonymous and foreign-origin mutations rejected for both games');
  for (const path of ['/api/pocket-paradise', marketPath]) {
    assert.equal((await post(host, path, '{broken', { 'Content-Type': 'application/json' })).status(), 400);
    assert.equal((await post(host, path, 'x'.repeat(4097))).status(), 413);
  }
  for (const bad of [null, [], { ...payload, mode: 'practice' }, { ...payload, moves: moves.slice(1) }, { ...payload, moves: Array(20).fill({ cell: 0, offer: 0 }) }, { ...payload, seed: '<script>' }]) assert.equal((await post(host, '/api/pocket-paradise', bad)).status(), 400);
  mark('malformed, oversized, incomplete, practice and forged solo histories rejected');
  for (const client of [anon, host.client]) {
    denied(await client.rpc('record_pocket_completion', { actor_id: host.id, run_seed: 'forged', run_mode: 'standard', verified_score: 9999 }));
    denied(await client.rpc('commit_market_turn', { target_room_id: roomId, expected_version: 0, next_state: {}, scores: {} }));
    denied(await client.rpc('leave_market_match', { target_room_id: roomId, actor_id: host.id }));
    denied(await client.from('pocket_completions').select('*'));
  }
  mark('anonymous/authenticated direct completion, market commit RPC and private ledger access denied');
  // Queue four invites while space exists; acceptance must independently enforce capacity.
  for (const recipient of [second, third, fourth, fifth]) {
    await success(host, '/api/social', { action: 'follow', playerId: recipient.id });
    await success(recipient, '/api/social', { action: 'follow', playerId: host.id });
    await success(host, '/api/social', { action: 'invite', playerId: recipient.id, roomCode: code });
  }
  const invitations = await admin.from('room_invitations').select('id,recipient_id').eq('room_id', roomId); assert.ifError(invitations.error); assert.equal(invitations.data.length, 4);
  for (const recipient of [second, third, fourth]) await success(recipient, '/api/social', { action: 'accept', inviteId: invitations.data.find(invite => invite.recipient_id === recipient.id).id });
  const blocked = await post(fifth, '/api/social', { action: 'accept', inviteId: invitations.data.find(invite => invite.recipient_id === fifth.id).id });
  assert.equal(blocked.status(), 409); assert.match((await blocked.json()).error, /full/i);
  const members = await admin.from('room_players').select('profile_id').eq('room_id', roomId); assert.ifError(members.error); assert.equal(members.data.length, 4);
  mark('queued friend invitations cannot bypass four-player Market capacity');
  await success(host, `/api/rooms/${code}/start`, {});
  const before = await roomSnapshot(roomId);
  const beforeScores = await admin.from('room_players').select('profile_id,score').eq('room_id', roomId).order('profile_id'); assert.ifError(beforeScores.error);
  const finalState = { ...before.round_state, phase: 'finished', version: before.round_state.version + 1 };
  const stale = await admin.rpc('commit_market_turn', { target_room_id: roomId, expected_version: before.round_state.version - 1, next_state: finalState, scores: Object.fromEntries(people.slice(0, 4).map(person => [person.id, 500])) });
  assert.ifError(stale.error); assert.equal(stale.data, false);
  const partialFailure = await admin.rpc('commit_market_turn', { target_room_id: roomId, expected_version: before.round_state.version, next_state: finalState, scores: { [host.id]: 500 } });
  assert(partialFailure.error); assert.match(partialFailure.error.message, /missing score/i);
  assert.deepEqual(await roomSnapshot(roomId), before);
  const scoreRows = await admin.from('room_players').select('profile_id,score').eq('room_id', roomId).order('profile_id'); assert.ifError(scoreRows.error); assert.deepEqual(scoreRows.data, beforeScores.data);
  const noResults = await admin.from('match_history').select('id').eq('room_id', roomId); assert.ifError(noResults.error); assert.equal(noResults.data.length, 0);
  mark('stale final commit and incomplete-score transaction leave room, scores and result history unchanged');
  for (const bad of [null, [], {}, { expectedVersion: before.round_state.version, type: 'move', destination: 999 }, { expectedVersion: before.round_state.version, type: 'buy' }]) assert.equal((await post(host, marketPath, bad)).status(), 409);
  assert.deepEqual(await roomSnapshot(roomId), before);
  mark('malformed and wrong-phase market commands leave persisted game unchanged');
  const concurrent = await Promise.all([post(host, '/api/pocket-paradise', payload), post(host, '/api/pocket-paradise', payload)]);
  assert(concurrent.every(response => response.status() === 200));
  assert.deepEqual((await Promise.all(concurrent.map(response => response.json()))).map(result => result.recorded).sort(), [false, true]);
  const afterDuplicate = await admin.from('profiles').select('games_played').eq('id', host.id).single(); assert.ifError(afterDuplicate.error); assert.equal(afterDuplicate.data.games_played, 1);
  mark('simultaneous solo replay records exactly one completion and one progress increment');
  for (let i = 1; i < 12; i++) assert.equal((await success(host, '/api/pocket-paradise', { ...payload, seed: crypto.randomUUID() })).recorded, true);
  const rateLimited = await post(host, '/api/pocket-paradise', { ...payload, seed: crypto.randomUUID() }); assert.equal(rateLimited.status(), 429);
  const duplicateAfterLimit = await success(host, '/api/pocket-paradise', payload); assert.equal(duplicateAfterLimit.recorded, false);
  const ledger = await admin.from('pocket_completions').select('seed,score').eq('profile_id', host.id); assert.ifError(ledger.error); assert.equal(ledger.data.length, 12);
  const history = await admin.from('match_history').select('score').eq('profile_id', host.id); assert.ifError(history.error); assert.equal(history.data.length, 12);
  const profile = await admin.from('profiles').select('games_played,total_points').eq('id', host.id).single(); assert.ifError(profile.error);
  assert.equal(profile.data.games_played, 12); assert.equal(profile.data.total_points, ledger.data.reduce((sum, row) => sum + row.score, 0));
  mark('thirteenth hourly solo completion rejected; duplicate remains idempotent; ledger/history/progress totals match');
  assert.equal((await post(host, `/api/rooms/${code}/leave`, {}, { Origin: 'https://untrusted.example' })).status(), 403);
  assert.deepEqual(await roomSnapshot(roomId), before);
  await success(second, `/api/rooms/${code}/leave`, {});
  const departed = await roomSnapshot(roomId); assert.equal(departed.status, 'finished'); assert.equal(departed.round_state.closedReason, 'market_player_left'); assert.deepEqual(departed.winner_ids, []);
  const remaining = await admin.from('room_players').select('profile_id').eq('room_id', roomId); assert.ifError(remaining.error); assert.equal(remaining.data.length, 3); assert(!remaining.data.some(row => row.profile_id === second.id));
  const abortedResults = await admin.from('match_history').select('id').eq('room_id', roomId); assert.ifError(abortedResults.error); assert.equal(abortedResults.data.length, 0);
  const delayedCommit = await admin.rpc('commit_market_turn', { target_room_id: roomId, expected_version: before.round_state.version, next_state: finalState, scores: Object.fromEntries(people.slice(0, 4).map(person => [person.id, 500])) }); assert.ifError(delayedCommit.error); assert.equal(delayedCommit.data, false);
  assert.deepEqual(await roomSnapshot(roomId), departed);
  mark('foreign-origin departure rejected; actual departure atomically closes game, removes member, records no result and fences delayed completion');
  completed = true;
} finally {
  if (browser) await browser.close();
  if (rooms.length) assert.ifError((await admin.from('rooms').delete().in('id', rooms)).error);
  for (const id of users) assert.ifError((await admin.auth.admin.deleteUser(id)).error);
  writeFileSync('.forge/game-expansion-security.json', JSON.stringify({ completed, environment: { app, database: env.API_URL }, checks, cleanedUsers: users.length, cleanedRooms: rooms.length }, null, 2));
}
