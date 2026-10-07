// Runs only against the disposable local Supabase and isolated app.
import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const app = 'http://127.0.0.1:3199';
const vars = Object.fromEntries([...readFileSync('/private/tmp/gamehub-codex-audit-20261006/local.env', 'utf8').matchAll(/^([A-Z_]+)="(.*)"$/gm)].map(m => [m[1], m[2]]));
assert.equal(vars.API_URL, 'http://127.0.0.1:58321');
const admin = createClient(vars.API_URL, vars.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const users = [], rooms = [], checks = [], errors = [], violations = [];
const mark = label => { checks.push(label); console.log('PASS ' + label); };
const post = (p, data) => p.page.request.post(app + '/api/social', { data });
async function ok(p, data) { const r = await post(p, data); assert(r.ok(), `${JSON.stringify(data)}: ${r.status()} ${await r.text()}`); return r.json(); }
async function dashboard(p) { const r = await p.page.request.get(app + '/api/social'); assert(r.ok(), await r.text()); return r.json(); }
async function person(label) {
  const username = `qa_${label.slice(0, 3)}_${Date.now()}`, email = `${username}@example.test`, password = crypto.randomUUID() + 'Qa1!';
  const r = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username } });
  assert.ifError(r.error); users.push(r.data.user.id);
  const ctx = await browser.newContext({ viewport: { width: 375, height: 850 } });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto(app + '/login'); await page.getByLabel('Email', { exact: true }).fill(email); await page.getByLabel('Password', { exact: true }).fill(password); await page.getByRole('button', { name: 'Log in', exact: true }).click(); await page.waitForURL('**/games');
  return { page, ctx, id: r.data.user.id, username, email, password };
}
async function audit(page, label) {
  await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect?.getTiming().iterations)).map(a => a.finished.catch(() => {}))); });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const report = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }));
  violations.push(...report.violations.map(v => ({ label, id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label + ' overflow');
  mark(label);
}
try {
  const guest = await browser.newContext();
  assert.equal((await guest.request.get(app + '/api/social')).status(), 401);
  assert.equal((await guest.request.post(app + '/api/social', { data: { action: 'presence' } })).status(), 401);
  assert.equal((await guest.request.get(app + '/api/progress')).status(), 401);
  mark('anonymous access denied');
  const a = await person('a'), b = await person('b'), outsider = await person('outsider');
  assert(!(await dashboard(a)).showOnline);
  await ok(a, { action: 'follow', playerId: b.id });
  await ok(a, { action: 'follow', playerId: b.id });
  assert.equal((await dashboard(a)).followingCount, 1);
  assert.equal((await dashboard(b)).followerCount, 1);
  assert(!(await post(a, { action: 'follow', playerId: a.id })).ok());
  const search = await a.page.request.get(app + '/api/social?q=' + b.username);
  assert((await search.json()).results.some(p => p.id === b.id));
  mark('username search, follow counts and idempotency');
  const game = await admin.from('games').select('id').eq('type', 'predict').eq('is_active', true).limit(1).single(); assert.ifError(game.error);
  async function room() {
    const r = await a.page.request.post(app + '/api/rooms', { data: { gameId: game.data.id, totalRounds: 1 } }); assert(r.ok(), await r.text());
    const { code } = await r.json(); const record = await admin.from('rooms').select('id').eq('code', code).single(); assert.ifError(record.error); rooms.push(record.data.id); return code;
  }
  const code = await room();
  assert(!(await post(a, { action: 'invite', playerId: b.id, roomCode: code })).ok());
  await ok(b, { action: 'follow', playerId: a.id });
  await ok(b, { action: 'presence', showOnline: true, visible: true });
  assert((await dashboard(a)).following.find(p => p.id === b.id).online);
  await ok(b, { action: 'presence', showOnline: false });
  assert(!(await dashboard(a)).following.find(p => p.id === b.id).online);
  mark('mutual follow rule and online privacy');
  await ok(a, { action: 'invite', playerId: b.id, roomCode: code });
  const invite = (await dashboard(b)).invitations.find(i => i.roomCode === code); assert(invite);
  assert(!(await post(outsider, { action: 'accept', inviteId: invite.id })).ok());
  assert.equal((await dashboard(outsider)).invitations.length, 0);
  const accepted = await ok(b, { action: 'accept', inviteId: invite.id }); assert.equal(accepted.roomCode, code);
  await ok(b, { action: 'accept', inviteId: invite.id });
  const membership = await admin.from('room_players').select('id').eq('room_id', rooms[0]).eq('profile_id', b.id); assert.equal(membership.data.length, 1);
  mark('private persistent invite, acceptance and duplicate acceptance');
  const closedCode = await room(); await ok(a, { action: 'invite', playerId: b.id, roomCode: closedCode });
  const closedInvite = (await dashboard(b)).invitations.find(i => i.roomCode === closedCode); assert(closedInvite);
  assert.ifError((await admin.from('rooms').update({ status: 'finished' }).eq('code', closedCode)).error);
  assert(!(await post(b, { action: 'accept', inviteId: closedInvite.id })).ok());
  await ok(b, { action: 'decline', inviteId: closedInvite.id });
  await ok(a, { action: 'unfollow', playerId: b.id });
  assert.equal((await dashboard(a)).followingCount, 0);
  mark('closed-room invitations reject safely and unfollow works');
  await a.page.goto(app + '/friends');
  await a.page.getByLabel('Search usernames').fill(b.username);
  await a.page.getByRole('button', { name: 'Search', exact: true }).click();
  const followResponse = a.page.waitForResponse(r => r.url().endsWith('/api/social') && r.request().method() === 'POST' && r.request().postDataJSON()?.action === 'follow');
  await a.page.getByRole('button', { name: `Follow ${b.username}`, exact: true }).click();
  const followResult = await followResponse;
  assert(followResult.ok(), await followResult.text());
  await a.page.getByText(`Following ${b.username}.`, { exact: true }).waitFor();
  const uiCode = await room();
  await a.page.goto(app + '/room/' + uiCode);
  await a.page.getByRole('button', { name: `Invite ${b.username}`, exact: true }).click();
  await a.page.getByText(`Invite sent to ${b.username}. It will be waiting when they return, while this lobby is open.`, { exact: true }).waitFor();
  await audit(a.page, 'lobby-invitation-375');
  await b.page.goto(app + '/games');
  await b.page.getByRole('link', { name: '1 room invite. Open friends to review.', exact: true }).click();
  await b.page.getByRole('button', { name: 'Join room', exact: true }).click();
  await b.page.waitForURL('**/room/' + uiCode);
  await b.page.getByText('You’re in! Waiting for the host to start…', { exact: true }).waitFor();
  mark('search and follow → lobby invite → returning-player notice → join room UI');
  assert.ifError((await admin.from('rooms').update({ status: 'playing' }).eq('code', uiCode)).error);
  const finished = await admin.rpc('finish_room_game', { target_room_id: rooms[2] }); assert.ifError(finished.error); assert.equal(finished.data, true);
  const duplicateFinish = await admin.rpc('finish_room_game', { target_room_id: rooms[2] }); assert.ifError(duplicateFinish.error); assert.equal(duplicateFinish.data, false);
  const completed = await (await b.page.request.get(app + '/api/progress')).json();
  assert.equal(completed.gamesPlayed, 1); assert.equal(completed.gamesWon, 1); assert.equal(completed.currentWinStreak, 1);
  assert.equal(completed.days.reduce((sum, day) => sum + day.games, 0), 1);
  mark('atomic game completion counts exactly once in progress and win streak');
  const direct = createClient(vars.API_URL, vars.ANON_KEY, { auth: { persistSession: false } });
  assert.ifError((await direct.auth.signInWithPassword({ email: b.email, password: b.password })).error);
  for (const table of ['player_follows', 'player_presence', 'room_invitations', 'player_progress_settings']) assert((await direct.from(table).select('*')).error, `${table} must be private`);
  assert((await direct.rpc('player_social_dashboard', { actor_id: a.id })).error);
  assert((await direct.rpc('player_progress_summary', { target_profile_id: a.id })).error);
  mark('direct table and privileged RPC access denied');
  assert.equal((await b.page.request.patch(app + '/api/progress', { data: { weeklyGoal: 0 } })).status(), 400);
  assert.equal((await b.page.request.patch(app + '/api/progress', { data: { weeklyGoal: 51 } })).status(), 400);
  assert((await b.page.request.patch(app + '/api/progress', { data: { weeklyGoal: 7, profile_id: a.id } })).ok());
  const bp = await (await b.page.request.get(app + '/api/progress')).json();
  const ap = await (await a.page.request.get(app + '/api/progress')).json();
  assert.equal(bp.weeklyGoal, 7); assert.equal(ap.weeklyGoal, 3);
  await b.page.goto(app + '/profile'); await b.page.getByLabel('Games to play each week').fill('5'); await b.page.getByRole('button', { name: 'Save goal', exact: true }).click(); await b.page.getByText('Weekly goal saved.', { exact: true }).waitFor();
  await b.page.reload(); await b.page.getByLabel('Games to play each week').waitFor(); assert.equal(await b.page.getByLabel('Games to play each week').inputValue(), '5');
  mark('weekly goal validates, persists and cannot target another player');
  for (const theme of ['dark', 'light', 'arcade', 'ocean']) {
    await b.page.goto(app + '/friends');
    await b.page.evaluate(t => { localStorage.setItem('gamehub-theme', t); document.documentElement.dataset.theme = t; window.dispatchEvent(new Event('gamehub-theme-change')); }, theme);
    for (const route of ['/friends', '/profile']) {
      await b.page.goto(app + route); await b.page.locator('main h1').waitFor();
      if (route === '/friends') await b.page.getByLabel('Show when I’m online').waitFor();
      else await b.page.getByLabel('Games to play each week').waitFor();
      await audit(b.page, `${theme}-375-${route}`);
    }
  }
  for (const width of [320, 1440]) { await b.page.setViewportSize({ width, height: 900 }); await b.page.goto(app + '/friends'); await b.page.locator('main h1').waitFor(); await audit(b.page, `friends-${width}`); }
  await b.page.screenshot({ path: '.forge/screenshots/social-friends.png', fullPage: true });
  assert.deepEqual(errors, []); assert.deepEqual(violations, []);
} finally {
  await browser.close();
  if (rooms.length) assert.ifError((await admin.from('rooms').delete().in('id', rooms)).error);
  for (const id of users) assert.ifError((await admin.auth.admin.deleteUser(id)).error);
  writeFileSync('.forge/social-browser-report.json', JSON.stringify({ checks, errors, violations }, null, 2));
}
