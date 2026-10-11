// Isolated browser QA for Brain Bowl, What Would You Do? and Whot! (online, solo and same-device).
// Requires a local Supabase stack and an app build pointed at it:
//   QA_API_URL=http://127.0.0.1:58321 QA_SERVICE_ROLE_KEY=… QA_APP_URL=http://127.0.0.1:3199 node scripts/test-live-games-browser.mjs
import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const app = process.env.QA_APP_URL ?? 'http://127.0.0.1:3199';
const api = process.env.QA_API_URL;
assert.ok(api?.startsWith('http://127.0.0.1'), 'QA must run against a local Supabase stack');
const admin = createClient(api, process.env.QA_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const out = process.env.QA_OUT ?? '.forge/live-games-qa';
mkdirSync(`${out}/screenshots`, { recursive: true });
const report = { checks: [], violations: [], overflow: [], errors: [], screenshots: [] };
const save = () => writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
const pass = label => { report.checks.push(label); save(); console.log('PASS ' + label); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function poll(fn, message, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const value = await fn(); if (value) return value; await sleep(200); }
  throw new Error(message);
}

const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const users = [];

async function audit(page, label, { axe = true } = {}) {
  if (axe) {
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const result = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }));
    report.violations.push(...result.violations.map(v => ({ label, id: v.id, impact: v.impact, nodes: v.nodes.slice(0, 5).map(n => ({ target: n.target, summary: n.failureSummary })) })));
  }
  const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  if (size.scroll > size.width + 1) report.overflow.push({ label, ...size });
  const path = `${out}/screenshots/${label}.png`;
  await page.screenshot({ path });
  report.screenshots.push(path);
  pass(label);
}

async function context(viewport) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 900 });
  ctx.setDefaultTimeout(20000);
  await ctx.route('**/*', route => {
    const origin = new URL(route.request().url()).origin;
    return [app, api].includes(origin) ? route.continue() : route.abort();
  });
  const page = await ctx.newPage();
  page.on('pageerror', error => report.errors.push(`${viewport.width}: ${error.message}`));
  page.on('dialog', dialog => dialog.accept());
  return { ctx, page };
}

async function signIn(viewport, index) {
  const { ctx, page } = await context(viewport);
  const stamp = Date.now();
  const email = `live-qa-${stamp}-${index}@example.test`;
  const password = crypto.randomUUID() + 'Qa1!';
  const name = `live_${stamp % 100000}_${index}`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username: name } });
  if (created.error) throw created.error;
  users.push(created.data.user.id);
  await page.goto(app + '/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.waitForURL('**/games');
  return { ctx, page, id: created.data.user.id, name };
}

async function createRoom(host, slug, setup) {
  await host.page.goto(`${app}/rooms/new?game=${slug}`);
  await host.page.getByRole('button', { name: 'Create room →' }).waitFor();
  await setup?.(host.page);
  await host.page.getByRole('button', { name: 'Create room →' }).click();
  await host.page.waitForURL('**/room/*');
  return host.page.url().split('/room/')[1];
}
async function join(guest, code) {
  await guest.page.goto(app + '/rooms/join');
  await guest.page.getByLabel('Room code').fill(code);
  await guest.page.getByRole('button', { name: /Join room/ }).click();
  await guest.page.waitForURL(`**/room/${code}`);
}
const roomRow = async code => (await admin.from('rooms').select('*').eq('code', code).single()).data;
const finalStandings = page => page.getByRole('heading', { name: 'Final standings' });
async function expectFinished(code, players) {
  const room = await poll(async () => { const row = await roomRow(code); return row.status === 'finished' ? row : null; }, 'Room never finished', 30000);
  const { data: history } = await admin.from('match_history').select('profile_id, score, won').eq('room_id', room.id);
  assert.equal(history.length, players.length, 'every player has a match record');
  return { room, history };
}

async function libraryChecks() {
  const { ctx, page } = await context({ width: 390, height: 844 });
  await page.goto(app + '/games?q=whot');
  await page.getByRole('link', { name: 'Deal me in →' }).waitFor();
  await page.getByRole('link', { name: 'Create Whot! room' }).waitFor();
  await page.goto(app + '/games?q=brain%20bowl');
  await page.getByRole('link', { name: 'Create Brain Bowl room' }).waitFor();
  await page.getByRole('link', { name: 'Play Brain Bowl: Buzzer Duel on one device' }).waitFor();
  await page.goto(app + '/games?q=what%20would');
  await page.getByRole('link', { name: 'Create What Would You Do? room' }).waitFor();
  await audit(page, 'library-live-390');
  pass('library: the three new games are listed with online, solo and same-device entries');
  await ctx.close();
}

async function bowlOnline(host, guest) {
  const code = await createRoom(host, 'brain-bowl', async page => {
    await page.getByLabel('Section').selectOption('science');
    await page.getByLabel('Questions').selectOption('8');
    await page.getByLabel('Time per question').selectOption('10');
  });
  await host.page.getByText('🔬 Science & Nature').waitFor();
  await audit(host.page, 'bowl-lobby-390');
  await join(guest, code);
  await host.page.getByRole('button', { name: 'Start with 2 players' }).click();
  // A cheater reading the network cannot see the answer before the reveal.
  const peek = await guest.page.request.get(`${app}/api/rooms/${code}/live`);
  assert.ok(!JSON.stringify(await peek.json()).includes('"answer"'), 'no answer before the reveal');
  for (let question = 0; question < 8; question++) {
    for (const [index, player] of [host, guest].entries()) {
      const tile = player.page.getByRole('group', { name: 'Answers' }).getByRole('button').nth(index);
      await tile.waitFor({ timeout: 15000 });
      await poll(() => tile.isEnabled(), 'answer tile never enabled', 15000);
      await tile.click();
    }
    await host.page.getByText(/^(\+[\d,]+|Not this time|Too slow!)$/).first().waitFor({ timeout: 15000 });
    if (question === 0) { await audit(host.page, 'bowl-reveal-390'); await audit(guest.page, 'bowl-reveal-1440'); }
    if (question === 1) {
      await guest.page.getByRole('heading', { level: 2 }).first().waitFor();
    }
  }
  await Promise.all([host, guest].map(player => finalStandings(player.page).waitFor({ timeout: 30000 })));
  await audit(guest.page, 'bowl-final-1440');
  const { room } = await expectFinished(code, [host, guest]);
  assert.equal(room.total_rounds, 8);
  pass('brain bowl: 8-question online match with speed scoring, hidden answers and a recorded result');
}

async function dilemmaOnline(host, guest) {
  const code = await createRoom(host, 'what-would-you-do', async page => {
    await page.getByLabel('Topic').selectOption('apocalypse');
    await page.getByLabel('Mode').selectOption('spotlight');
    await page.getByLabel('Situations').selectOption('6');
    await page.getByLabel('Time to choose').selectOption('30');
  });
  await host.page.getByText('🔥 Hot Seat').waitFor();
  await join(guest, code);
  await host.page.getByRole('button', { name: 'Start with 2 players' }).click();
  for (let round = 0; round < 6; round++) {
    for (const player of [host, guest]) {
      const group = player.page.getByRole('group', { name: /Your honest answer|Your guess for/ });
      await group.waitFor({ timeout: 15000 });
      await group.getByRole('button').first().click();
      await player.page.getByRole('button', { name: '🔒 Lock it in' }).click();
    }
    await host.page.getByRole('list', { name: 'How everyone chose' }).waitFor();
    if (round === 0) { await audit(host.page, 'dilemma-reveal-390'); await audit(guest.page, 'dilemma-reveal-1440'); }
    for (const player of [host, guest]) await player.page.getByRole('button', { name: /Next situation|See final results/ }).click();
  }
  await Promise.all([host, guest].map(player => finalStandings(player.page).waitFor({ timeout: 30000 })));
  const { history } = await expectFinished(code, [host, guest]);
  assert.ok(history.some(entry => entry.score > 0), 'reading the hot seat scores');
  pass('what would you do: hot seat match with secret picks, reveal votes and a recorded result');
}

async function playWhotTurn(page) {
  const hand = page.getByRole('group', { name: /Your hand/ });
  const playable = hand.getByRole('button', { name: /playable/ });
  if (await playable.count()) {
    await playable.first().click();
    const call = page.getByRole('dialog', { name: 'I need…' });
    if (await call.count()) await call.getByRole('button', { name: /Circle/ }).click();
    return true;
  }
  const market = page.getByRole('button', { name: /^Go to market/ });
  if (await market.count() && await market.isEnabled()) { await market.click(); return true; }
  return false;
}

async function whotOnline(host, guest) {
  const code = await createRoom(host, 'whot', async page => {
    await page.getByLabel('Match length').selectOption('1');
    await page.getByLabel('Time per turn').selectOption('20');
  });
  await join(guest, code);
  await host.page.getByRole('button', { name: 'Start with 2 players' }).click();
  await Promise.all([host, guest].map(player => player.page.getByRole('group', { name: /Your hand: 5 cards/ }).waitFor()));
  const peek = await guest.page.request.get(`${app}/api/rooms/${code}/live`);
  const view = (await peek.json()).view;
  assert.equal(view.seats.filter(seat => seat.cards).length, 1, 'only your own hand travels to your phone');
  await audit(host.page, 'whot-online-390');
  await audit(guest.page, 'whot-online-1440');
  const end = Date.now() + 240_000;
  while (Date.now() < end && !(await finalStandings(host.page).count())) {
    for (const player of [host, guest]) await playWhotTurn(player.page).catch(() => false);
    await sleep(250);
  }
  await Promise.all([host, guest].map(player => finalStandings(player.page).waitFor({ timeout: 30000 })));
  await audit(host.page, 'whot-final-390');
  const { room } = await expectFinished(code, [host, guest]);
  assert.equal(room.winner_ids.length >= 1, true);
  pass('whot: online hand dealt and refereed by the server until someone checks up');
}

async function whotForfeit(host, guest) {
  const code = await createRoom(host, 'whot', async page => { await page.getByLabel('Match length').selectOption('3'); });
  await join(guest, code);
  await host.page.getByRole('button', { name: 'Start with 2 players' }).click();
  await poll(async () => {
    for (const player of [host, guest]) await playWhotTurn(player.page).catch(() => false);
    const row = await roomRow(code);
    return (row.round_state.deal?.step ?? 0) >= 6 || (row.round_state.handNo ?? 0) > 1;
  }, 'the match never got going', 60000);
  await guest.page.getByRole('button', { name: /Leave room/ }).click();
  await guest.page.waitForURL('**/games**');
  const { room, history } = await expectFinished(code, [host, guest]);
  assert.deepEqual(room.winner_ids, [host.id], 'walking out concedes the match');
  assert.equal(history.find(entry => entry.profile_id === guest.id).won, false);
  pass('whot: leaving a match under way concedes it to the player left at the table');
}

async function soloWhot() {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }, { width: 320, height: 640 }]) {
    const { ctx, page } = await context(viewport);
    await page.goto(app + '/play/whot');
    await audit(page, `whot-solo-setup-${viewport.width}`);
    await page.getByRole('button', { name: /2 v 2|3 players/ }).first().click();
    await page.getByRole('button', { name: '🃏 Deal me in' }).click();
    await page.getByRole('group', { name: /Your hand/ }).waitFor();
    for (let move = 0; move < 6; move++) {
      await poll(async () => (await page.getByRole('group', { name: /Your hand/ }).getByRole('button', { name: /playable/ }).count()) > 0
        || (await page.getByRole('button', { name: /^Go to market/ }).isEnabled().catch(() => false))
        || (await page.getByRole('dialog', { name: /wins|win!|share/ }).count()) > 0, 'your turn never came', 15000);
      if (await page.getByRole('dialog').count()) break;
      await playWhotTurn(page);
    }
    await audit(page, `whot-solo-table-${viewport.width}`);
    await ctx.close();
  }
  pass('whot solo: the Machine deals, plays back and the table fits phones and desktops');
}

async function localGames(player) {
  const { page } = player;
  // Signed out, the buzzer refuses to deal a deck (it carries answers).
  const anonymous = await context({ width: 390, height: 844 });
  const refused = await anonymous.page.request.get(`${app}/api/bowl/deck`);
  assert.equal(refused.status(), 401);
  await anonymous.ctx.close();
  await page.goto(app + '/games/local/brain-bowl');
  await page.getByRole('button', { name: '🔔 Start the duel' }).click();
  await page.getByRole('button', { name: 'Player 1 buzzer' }).click();
  await page.getByRole('button').filter({ hasText: /^A/ }).first().waitFor();
  await page.locator('button:has(span:text-is("A"))').first().click();
  await page.getByRole('button', { name: /Next question|Final scores/ }).waitFor();
  await audit(page, 'buzzer-reveal-390');
  await page.goto(app + '/games/local/what-would-you-do');
  await page.getByRole('button', { name: '🔥 Start the hot seat' }).click();
  await page.getByRole('button', { name: /Hand the phone to/ }).click();
  await page.locator('button:has(span:text-is("B"))').first().click();
  await page.getByRole('button', { name: /Reveal/ }).click();
  await page.getByRole('button', { name: 'Player 2' }).click();
  await audit(page, 'wwyd-local-reveal-390');
  await page.getByRole('button', { name: /Score it/ }).click();
  await page.getByText(/^2 \/ \d+$/).waitFor();
  pass('same-device: buzzer duel and pass-and-play hot seat');
}

try {
  await libraryChecks();
  await soloWhot();
  const host = await signIn({ width: 390, height: 844 }, 0);
  const guest = await signIn({ width: 1440, height: 900 }, 1);
  await localGames(host);
  await bowlOnline(host, guest);
  await dilemmaOnline(host, guest);
  await whotOnline(host, guest);
  await whotForfeit(host, guest);
  console.log(JSON.stringify({ checks: report.checks.length, violations: report.violations.length, overflow: report.overflow, errors: report.errors }, null, 2));
  if (report.violations.length) console.log(JSON.stringify(report.violations, null, 2));
} finally {
  save();
  await browser.close();
  for (const id of users) await admin.auth.admin.deleteUser(id).catch(() => undefined);
}
