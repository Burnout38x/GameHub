import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const app = 'http://127.0.0.1:3199';
const vars = Object.fromEntries([...readFileSync('/private/tmp/gamehub-codex-audit-20261006/local.env', 'utf8').matchAll(/^([A-Z_]+)="(.*)"$/gm)].map(m => [m[1], m[2]]));
{
    const qaArgs0 = [vars.API_URL, 'http://127.0.0.1:58321'];
    assert.equal(...qaArgs0);
}
const admin = createClient(vars.API_URL, vars.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const users = [], rooms = [], checks = [], errors = [], latencies = [];
const mark = s => { checks.push(s); console.log('PASS ' + s); };
async function person(n) {
    const username = `expand${n}_${Date.now()}`, password = crypto.randomUUID() + 'Q1!', email = username + '@example.test';
    const r = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username } });
    {
        const qaArgs1 = [r.error];
        assert.ifError(...qaArgs1);
    }
    users.push(r.data.user.id);
    appendFileSync('qa-workspace/STATE.md', '\nCreated ' + r.data.user.id + ' by QA Market four-player adapter. Cleanup in finally.\n');
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(app + '/login');
    await page.getByRole('button', { name: /show password/i }).click();
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await page.waitForURL('**/games');
    return { page, id: r.data.user.id };
}
async function post(person, path, data) { const t = performance.now(); const r = await person.page.request.post(app + path, { data }); latencies.push(performance.now() - t); return r; }
async function snapshot(person, code) { const r = await person.page.request.get(`${app}/api/rooms/${code}`); {
    const qaArgs2 = [r.ok()];
    assert(...qaArgs2);
} return r.json(); }
async function create(person, gameId) { const r = await post(person, '/api/rooms', { gameId, totalRounds: 1 }); {
    const qaArgs3 = [r.ok(), await r.text()];
    assert(...qaArgs3);
} const { code } = await r.json(); const rr = await admin.from('rooms').select('id').eq('code', code).single(); {
    const qaArgs4 = [rr.error];
    assert.ifError(...qaArgs4);
} rooms.push(rr.data.id); appendFileSync('qa-workspace/STATE.md', '\nCreated room ' + rr.data.id + ' by QA Market four-player adapter. Cleanup in finally.\n'); return code; }
try {
    const people = [];
    for (let n = 0; n < 5; n++)
        people.push(await person(n));
    const [a, b, c, d, e] = people;
    const g = await admin.from('games').select('*').in('slug', ['market-day', 'pocket-paradise']);
    {
        const qaArgs5 = [g.error];
        assert.ifError(...qaArgs5);
    }
    const market = g.data.find(g => g.slug === 'market-day'), pocket = g.data.find(g => g.slug === 'pocket-paradise');
    await a.page.getByRole('searchbox').fill('pocket');
    await a.page.getByRole('link', { name: 'Build your paradise →' }).waitFor();
    {
        const qaArgs6 = [(await post(a, '/api/rooms', { gameId: pocket.id })).status(), 400];
        assert.equal(...qaArgs6);
    }
    mark('solo catalog launch and room-creation guard');
    const code = await create(a, market.id);
    {
        const qaArgs7 = [(await post(a, `/api/rooms/${code}/start`, {})).status(), 409];
        assert.equal(...qaArgs7);
    }
    for (const p of [b, c, d]) {
        const qaArgs8 = [(await post(p, `/api/rooms/${code}/join`, {})).ok()];
        assert(...qaArgs8);
    }
    {
        const qaArgs9 = [(await post(e, `/api/rooms/${code}/join`, {})).status(), 409];
        assert.equal(...qaArgs9);
    }
    {
        const qaArgs10 = [(await post(a, `/api/rooms/${code}/start`, {})).ok()];
        assert(...qaArgs10);
    }
    let bundle = await snapshot(a, code);
    {
        const qaArgs11 = [bundle.room.total_rounds, 10];
        assert.equal(...qaArgs11);
    }
    {
        const qaArgs12 = [(await post(e, `/api/rooms/${code}/market`, { type: 'move', expectedVersion: 0, destination: 1 })).status(), 403];
        assert.equal(...qaArgs12);
    }
    {
        const qaArgs13 = [(await post(b, `/api/rooms/${code}/market`, { type: 'move', expectedVersion: 0, destination: 1 })).status(), 409];
        assert.equal(...qaArgs13);
    }
    mark('2–4 capacity, fixed ten rounds, outsider and wrong-turn rejection');
    await a.page.goto(`${app}/room/${code}`);
    await a.page.getByRole('heading', { name: 'Market Day', exact: true }).first().waitFor();
    for (const [w, h] of [[320, 740], [390, 844], [717, 512], [820, 1180], [1440, 900]]) {
        await a.page.setViewportSize({ width: w, height: h });
        {
            const qaArgs14 = [await a.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow ${w}`];
            assert(...qaArgs14);
        }
    }
    mark('Market board initial viewport matrix');
    let turn = 0;
    while (bundle.room.status === 'playing') {
        const s = bundle.room.round_state, actor = people.find(p => p.id === s.players[s.turnIndex].id), pos = s.players[s.turnIndex].position;
        if (s.phase === 'move') {
            const cmd = { type: 'move', expectedVersion: s.version, destination: (pos + 1) % 12 };
            if (turn === 0) {
                const rs = await Promise.all([post(actor, `/api/rooms/${code}/market`, cmd), post(actor, `/api/rooms/${code}/market`, cmd)]);
                {
                    const qaArgs15 = [rs.map(r => r.status()).sort(), [200, 409]];
                    assert.deepEqual(...qaArgs15);
                }
                mark('simultaneous duplicate move applies exactly once');
            }
            else {
                const qaArgs16 = [(await post(actor, `/api/rooms/${code}/market`, cmd)).ok()];
                assert(...qaArgs16);
            }
        }
        else if (s.phase === 'business') {
            const p = s.players[s.turnIndex], stall = s.stalls[p.position];
            const type = !stall.ownerId && p.cash >= 6 ? 'buy' : p.supplies >= 3 ? 'commission' : p.cash >= 3 && p.supplies <= 9 ? 'supplies' : 'pass';
            {
                const qaArgs17 = [(await post(actor, `/api/rooms/${code}/market`, { type, expectedVersion: s.version })).ok()];
                assert(...qaArgs17);
            }
        }
        else if (s.phase === 'trade') {
            if (turn === 0 && !s.offer) {
                const target = people.find(p => p.id !== actor.id);
                {
                    const qaArgs18 = [(await post(actor, `/api/rooms/${code}/market`, { type: 'offer', expectedVersion: s.version, toId: target.id, give: { cash: 1, supplies: 0, stall: null }, receive: { cash: 0, supplies: 1, stall: null } })).ok()];
                    assert(...qaArgs18);
                }
            }
            else if (s.offer) {
                const target = people.find(p => p.id === s.offer.toId);
                const cmd = { type: 'accept', expectedVersion: s.version };
                const rs = await Promise.all([post(target, `/api/rooms/${code}/market`, cmd), post(target, `/api/rooms/${code}/market`, cmd)]);
                {
                    const qaArgs19 = [rs.map(r => r.status()).sort(), [200, 409]];
                    assert.deepEqual(...qaArgs19);
                }
                turn++;
                mark('concurrent trade acceptance transfers assets once');
            }
            else {
                {
                    const qaArgs20 = [(await post(actor, `/api/rooms/${code}/market`, { type: 'end', expectedVersion: s.version })).ok()];
                    assert(...qaArgs20);
                }
                turn++;
            }
        }
        bundle = await snapshot(a, code);
        if (turn === 3) {
            await a.page.reload();
            await a.page.getByText('Market Day', { exact: true }).first().waitFor();
        }
        {
            const qaArgs21 = [turn <= 40];
            assert(...qaArgs21);
        }
    }
    {
        const qaArgs22 = [turn, 40];
        assert.equal(...qaArgs22);
    }
    const history = await admin.from('match_history').select('*').eq('room_id', bundle.room.id);
    {
        const qaArgs23 = [history.error];
        assert.ifError(...qaArgs23);
    }
    {
        const qaArgs24 = [history.data.length, 4];
        assert.equal(...qaArgs24);
    }
    {
        const qaArgs25 = [history.data.reduce((n, r) => n + r.score, 0), bundle.players.reduce((n, r) => n + r.score, 0)];
        assert.equal(...qaArgs25);
    }
    mark('full four-player forty-turn completion, reconnect and exactly four results');
    await a.page.reload();
    await a.page.getByRole('button', { name: '🔁 Rematch (new room)' }).click();
    await a.page.waitForURL(url => url.pathname.startsWith('/room/') && !url.pathname.endsWith(code));
    const newCode = a.page.url().split('/').pop();
    const newRoom = await admin.from('rooms').select('id').eq('code', newCode).single();
    rooms.push(newRoom.data.id);
    mark('results and rematch create fresh lobby');
    const leaveCode = await create(a, market.id);
    for (const p of [b, c]) {
        const qaArgs26 = [(await post(p, `/api/rooms/${leaveCode}/join`, {})).ok()];
        assert(...qaArgs26);
    }
    {
        const qaArgs27 = [(await post(a, `/api/rooms/${leaveCode}/start`, {})).ok()];
        assert(...qaArgs27);
    }
    {
        const qaArgs28 = [(await post(b, `/api/rooms/${leaveCode}/leave`, {})).ok()];
        assert(...qaArgs28);
    }
    const ended = await snapshot(a, leaveCode);
    {
        const qaArgs29 = [ended.room.status, 'finished'];
        assert.equal(...qaArgs29);
    }
    {
        const qaArgs30 = [(await admin.from('match_history').select('id').eq('room_id', ended.room.id)).data.length, 0];
        assert.equal(...qaArgs30);
    }
    mark('explicit departure safely aborts fixed-player economy without results');
    const seed = crypto.randomUUID(), moves = Array.from({ length: 20 }, (_, cell) => ({ cell, offer: cell % 3 }));
    const r = await post(a, '/api/pocket-paradise', { seed, mode: 'standard', moves, score: 999999 });
    {
        const qaArgs31 = [r.ok(), await r.text()];
        assert(...qaArgs31);
    }
    {
        const qaArgs32 = [(await r.json()).recorded, true];
        assert.equal(...qaArgs32);
    }
    const repeat = await post(a, '/api/pocket-paradise', { seed, mode: 'standard', moves });
    {
        const qaArgs33 = [(await repeat.json()).recorded, false];
        assert.equal(...qaArgs33);
    }
    {
        const qaArgs34 = [(await post(a, '/api/pocket-paradise', { seed: crypto.randomUUID(), mode: 'standard', moves: moves.map(() => ({ cell: 0, offer: 0 })) })).status(), 400];
        assert.equal(...qaArgs34);
    }
    const prof = await admin.from('profiles').select('games_played').eq('id', a.id).single();
    {
        const qaArgs35 = [prof.data.games_played, 2];
        assert.equal(...qaArgs35);
    }
    mark('solo server replay rejects forged moves and duplicate result, progress increments once');
    {
        const qaArgs36 = [errors, []];
        assert.deepEqual(...qaArgs36);
    }
    mark('zero browser page errors');
}
finally {
    await browser.close();
    if (rooms.length) {
        const qaArgs37 = [(await admin.from('rooms').delete().in('id', rooms)).error];
        assert.ifError(...qaArgs37);
    }
    for (const id of users) {
        const qaArgs38 = [(await admin.auth.admin.deleteUser(id)).error];
        assert.ifError(...qaArgs38);
    }
    const sorted = latencies.sort((a, b) => a - b);
    writeFileSync('qa-workspace/evidence/market-four-player.json', JSON.stringify({ checks, errors, requests: sorted.length, p95Milliseconds: sorted[Math.floor(sorted.length * .95)], maxMilliseconds: sorted.at(-1) }, null, 2));
}
