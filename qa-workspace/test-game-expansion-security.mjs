import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import assert from 'node:assert/strict';
// Deliberately fixed to disposable local services: never accepts a production URL.
const app = 'http://127.0.0.1:3199';
const env = Object.fromEntries([...readFileSync('/private/tmp/gamehub-codex-audit-20261006/local.env', 'utf8').matchAll(/^([A-Z_]+)="(.*)"$/gm)].map(match => [match[1], match[2]]));
{
    const qaArgs0 = [env.API_URL, 'http://127.0.0.1:58321'];
    assert.equal(...qaArgs0);
}
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, options);
const anon = createClient(env.API_URL, env.ANON_KEY, options);
const users = [], rooms = [], checks = [];
let browser;
let completed = false;
const mark = text => { checks.push(text); console.log(`PASS ${text}`); };
function denied(result) { {
    const qaArgs1 = [result.error];
    assert(...qaArgs1);
} {
    const qaArgs2 = [result.error.code, '42501'];
    assert.equal(...qaArgs2);
} }
async function person(index) {
    const username = `expandsec${index}_${Date.now()}`, email = `${username}@example.test`, password = crypto.randomUUID() + 'Q1!';
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username } });
    {
        const qaArgs3 = [created.error];
        assert.ifError(...qaArgs3);
    }
    const id = created.data.user.id;
    users.push(id);
    appendFileSync('qa-workspace/STATE.md', '\nCreated ' + id + ' by QA Market security adapter. Cleanup in finally.\n');
    const client = createClient(env.API_URL, env.ANON_KEY, options);
    {
        const qaArgs4 = [(await client.auth.signInWithPassword({ email, password })).error];
        assert.ifError(...qaArgs4);
    }
    const page = await (await browser.newContext()).newPage();
    await page.goto(`${app}/login`);
    await page.getByRole('button', { name: /show password/i }).click();
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await page.waitForURL('**/games');
    return { id, client, page };
}
const post = (person, path, data, headers = {}) => person.page.request.post(app + path, { data: Buffer.from(typeof data === 'string' ? data : JSON.stringify(data)), headers: { 'Content-Type': 'application/json', ...headers } });
async function success(person, path, data) { const response = await post(person, path, data); {
    const qaArgs5 = [response.ok(), `${path}: ${response.status()} ${await response.text()}`];
    assert(...qaArgs5);
} return response.json(); }
async function roomSnapshot(id) { const response = await admin.from('rooms').select('*').eq('id', id).single(); {
    const qaArgs6 = [response.error];
    assert.ifError(...qaArgs6);
} return response.data; }
try {
    browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
    const people = [];
    for (let i = 0; i < 5; i++)
        people.push(await person(i));
    const [host, second, third, fourth, fifth] = people;
    const catalog = await admin.from('games').select('id').eq('slug', 'market-day').single();
    {
        const qaArgs7 = [catalog.error];
        assert.ifError(...qaArgs7);
    }
    const { code } = await success(host, '/api/rooms', { gameId: catalog.data.id });
    const roomRow = await admin.from('rooms').select('id').eq('code', code).single();
    {
        const qaArgs8 = [roomRow.error];
        assert.ifError(...qaArgs8);
    }
    const roomId = roomRow.data.id;
    rooms.push(roomId);
    appendFileSync('qa-workspace/STATE.md', '\nCreated room ' + roomId + ' by QA Market security adapter. Cleanup in finally.\n');
    const marketPath = `/api/rooms/${code}/market`;
    const moves = Array.from({ length: 20 }, (_, cell) => ({ cell, offer: cell % 3 }));
    const payload = { seed: crypto.randomUUID(), mode: 'standard', moves };
    const anonymous = { page: await (await browser.newContext()).newPage() };
    {
        const qaArgs9 = [(await post(anonymous, '/api/pocket-paradise', payload)).status(), 401];
        assert.equal(...qaArgs9);
    }
    {
        const qaArgs10 = [(await post(anonymous, marketPath, { type: 'move', expectedVersion: 0, destination: 1 })).status(), 401];
        assert.equal(...qaArgs10);
    }
    for (const path of ['/api/pocket-paradise', marketPath, `/api/rooms/${code}/leave`]) {
        const qaArgs11 = [(await post(host, path, payload, { Origin: 'https://untrusted.example' })).status(), 403];
        assert.equal(...qaArgs11);
    }
    mark('anonymous and foreign-origin mutations rejected for both games');
    for (const path of ['/api/pocket-paradise', marketPath]) {
        {
            const qaArgs12 = [(await post(host, path, '{broken', { 'Content-Type': 'application/json' })).status(), 400];
            assert.equal(...qaArgs12);
        }
        {
            const qaArgs13 = [(await post(host, path, 'x'.repeat(4097))).status(), 413];
            assert.equal(...qaArgs13);
        }
    }
    for (const bad of [null, [], { ...payload, mode: 'practice' }, { ...payload, moves: moves.slice(1) }, { ...payload, moves: Array(20).fill({ cell: 0, offer: 0 }) }, { ...payload, seed: '<script>' }]) {
        const qaArgs14 = [(await post(host, '/api/pocket-paradise', bad)).status(), 400];
        assert.equal(...qaArgs14);
    }
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
    const invitations = await admin.from('room_invitations').select('id,recipient_id').eq('room_id', roomId);
    {
        const qaArgs15 = [invitations.error];
        assert.ifError(...qaArgs15);
    }
    {
        const qaArgs16 = [invitations.data.length, 4];
        assert.equal(...qaArgs16);
    }
    for (const recipient of [second, third, fourth])
        await success(recipient, '/api/social', { action: 'accept', inviteId: invitations.data.find(invite => invite.recipient_id === recipient.id).id });
    const blocked = await post(fifth, '/api/social', { action: 'accept', inviteId: invitations.data.find(invite => invite.recipient_id === fifth.id).id });
    {
        const qaArgs17 = [blocked.status(), 409];
        assert.equal(...qaArgs17);
    }
    {
        const qaArgs18 = [(await blocked.json()).error, /full/i];
        assert.match(...qaArgs18);
    }
    const members = await admin.from('room_players').select('profile_id').eq('room_id', roomId);
    {
        const qaArgs19 = [members.error];
        assert.ifError(...qaArgs19);
    }
    {
        const qaArgs20 = [members.data.length, 4];
        assert.equal(...qaArgs20);
    }
    mark('queued friend invitations cannot bypass four-player Market capacity');
    await success(host, `/api/rooms/${code}/start`, {});
    const before = await roomSnapshot(roomId);
    const beforeScores = await admin.from('room_players').select('profile_id,score').eq('room_id', roomId).order('profile_id');
    {
        const qaArgs21 = [beforeScores.error];
        assert.ifError(...qaArgs21);
    }
    const finalState = { ...before.round_state, phase: 'finished', version: before.round_state.version + 1 };
    const stale = await admin.rpc('commit_market_turn', { target_room_id: roomId, expected_version: before.round_state.version - 1, next_state: finalState, scores: Object.fromEntries(people.slice(0, 4).map(person => [person.id, 500])) });
    {
        const qaArgs22 = [stale.error];
        assert.ifError(...qaArgs22);
    }
    {
        const qaArgs23 = [stale.data, false];
        assert.equal(...qaArgs23);
    }
    const partialFailure = await admin.rpc('commit_market_turn', { target_room_id: roomId, expected_version: before.round_state.version, next_state: finalState, scores: { [host.id]: 500 } });
    {
        const qaArgs24 = [partialFailure.error];
        assert(...qaArgs24);
    }
    {
        const qaArgs25 = [partialFailure.error.message, /missing score/i];
        assert.match(...qaArgs25);
    }
    {
        const qaArgs26 = [await roomSnapshot(roomId), before];
        assert.deepEqual(...qaArgs26);
    }
    const scoreRows = await admin.from('room_players').select('profile_id,score').eq('room_id', roomId).order('profile_id');
    {
        const qaArgs27 = [scoreRows.error];
        assert.ifError(...qaArgs27);
    }
    {
        const qaArgs28 = [scoreRows.data, beforeScores.data];
        assert.deepEqual(...qaArgs28);
    }
    const noResults = await admin.from('match_history').select('id').eq('room_id', roomId);
    {
        const qaArgs29 = [noResults.error];
        assert.ifError(...qaArgs29);
    }
    {
        const qaArgs30 = [noResults.data.length, 0];
        assert.equal(...qaArgs30);
    }
    mark('stale final commit and incomplete-score transaction leave room, scores and result history unchanged');
    for (const bad of [null, [], {}, { expectedVersion: before.round_state.version, type: 'move', destination: 999 }, { expectedVersion: before.round_state.version, type: 'buy' }]) {
        const qaArgs31 = [(await post(host, marketPath, bad)).status(), 409];
        assert.equal(...qaArgs31);
    }
    {
        const qaArgs32 = [await roomSnapshot(roomId), before];
        assert.deepEqual(...qaArgs32);
    }
    mark('malformed and wrong-phase market commands leave persisted game unchanged');
    const concurrent = await Promise.all([post(host, '/api/pocket-paradise', payload), post(host, '/api/pocket-paradise', payload)]);
    {
        const qaArgs33 = [concurrent.every(response => response.status() === 200)];
        assert(...qaArgs33);
    }
    {
        const qaArgs34 = [(await Promise.all(concurrent.map(response => response.json()))).map(result => result.recorded).sort(), [false, true]];
        assert.deepEqual(...qaArgs34);
    }
    const afterDuplicate = await admin.from('profiles').select('games_played').eq('id', host.id).single();
    {
        const qaArgs35 = [afterDuplicate.error];
        assert.ifError(...qaArgs35);
    }
    {
        const qaArgs36 = [afterDuplicate.data.games_played, 1];
        assert.equal(...qaArgs36);
    }
    mark('simultaneous solo replay records exactly one completion and one progress increment');
    for (let i = 1; i < 12; i++) {
        const qaArgs37 = [(await success(host, '/api/pocket-paradise', { ...payload, seed: crypto.randomUUID() })).recorded, true];
        assert.equal(...qaArgs37);
    }
    const rateLimited = await post(host, '/api/pocket-paradise', { ...payload, seed: crypto.randomUUID() });
    {
        const qaArgs38 = [rateLimited.status(), 429];
        assert.equal(...qaArgs38);
    }
    const duplicateAfterLimit = await success(host, '/api/pocket-paradise', payload);
    {
        const qaArgs39 = [duplicateAfterLimit.recorded, false];
        assert.equal(...qaArgs39);
    }
    const ledger = await admin.from('pocket_completions').select('seed,score').eq('profile_id', host.id);
    {
        const qaArgs40 = [ledger.error];
        assert.ifError(...qaArgs40);
    }
    {
        const qaArgs41 = [ledger.data.length, 12];
        assert.equal(...qaArgs41);
    }
    const history = await admin.from('match_history').select('score').eq('profile_id', host.id);
    {
        const qaArgs42 = [history.error];
        assert.ifError(...qaArgs42);
    }
    {
        const qaArgs43 = [history.data.length, 12];
        assert.equal(...qaArgs43);
    }
    const profile = await admin.from('profiles').select('games_played,total_points').eq('id', host.id).single();
    {
        const qaArgs44 = [profile.error];
        assert.ifError(...qaArgs44);
    }
    {
        const qaArgs45 = [profile.data.games_played, 12];
        assert.equal(...qaArgs45);
    }
    {
        const qaArgs46 = [profile.data.total_points, ledger.data.reduce((sum, row) => sum + row.score, 0)];
        assert.equal(...qaArgs46);
    }
    mark('thirteenth hourly solo completion rejected; duplicate remains idempotent; ledger/history/progress totals match');
    {
        const qaArgs47 = [(await post(host, `/api/rooms/${code}/leave`, {}, { Origin: 'https://untrusted.example' })).status(), 403];
        assert.equal(...qaArgs47);
    }
    {
        const qaArgs48 = [await roomSnapshot(roomId), before];
        assert.deepEqual(...qaArgs48);
    }
    await success(second, `/api/rooms/${code}/leave`, {});
    const departed = await roomSnapshot(roomId);
    {
        const qaArgs49 = [departed.status, 'finished'];
        assert.equal(...qaArgs49);
    }
    {
        const qaArgs50 = [departed.round_state.closedReason, 'market_player_left'];
        assert.equal(...qaArgs50);
    }
    {
        const qaArgs51 = [departed.winner_ids, []];
        assert.deepEqual(...qaArgs51);
    }
    const remaining = await admin.from('room_players').select('profile_id').eq('room_id', roomId);
    {
        const qaArgs52 = [remaining.error];
        assert.ifError(...qaArgs52);
    }
    {
        const qaArgs53 = [remaining.data.length, 3];
        assert.equal(...qaArgs53);
    }
    {
        const qaArgs54 = [!remaining.data.some(row => row.profile_id === second.id)];
        assert(...qaArgs54);
    }
    const abortedResults = await admin.from('match_history').select('id').eq('room_id', roomId);
    {
        const qaArgs55 = [abortedResults.error];
        assert.ifError(...qaArgs55);
    }
    {
        const qaArgs56 = [abortedResults.data.length, 0];
        assert.equal(...qaArgs56);
    }
    const delayedCommit = await admin.rpc('commit_market_turn', { target_room_id: roomId, expected_version: before.round_state.version, next_state: finalState, scores: Object.fromEntries(people.slice(0, 4).map(person => [person.id, 500])) });
    {
        const qaArgs57 = [delayedCommit.error];
        assert.ifError(...qaArgs57);
    }
    {
        const qaArgs58 = [delayedCommit.data, false];
        assert.equal(...qaArgs58);
    }
    {
        const qaArgs59 = [await roomSnapshot(roomId), departed];
        assert.deepEqual(...qaArgs59);
    }
    mark('foreign-origin departure rejected; actual departure atomically closes game, removes member, records no result and fences delayed completion');
    completed = true;
}
finally {
    if (browser)
        await browser.close();
    if (rooms.length) {
        const qaArgs60 = [(await admin.from('rooms').delete().in('id', rooms)).error];
        assert.ifError(...qaArgs60);
    }
    for (const id of users) {
        const qaArgs61 = [(await admin.auth.admin.deleteUser(id)).error];
        assert.ifError(...qaArgs61);
    }
    writeFileSync('qa-workspace/evidence/market-security.json', JSON.stringify({ completed, environment: { app, database: env.API_URL }, checks, cleanedUsers: users.length, cleanedRooms: rooms.length }, null, 2));
}
