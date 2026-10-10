// Isolated browser QA for Fortress Feud and the combined Truth or Dare.
// Requires a local Supabase stack and an app build pointed at it:
//   QA_API_URL=http://127.0.0.1:58321 QA_SERVICE_ROLE_KEY=… QA_APP_URL=http://127.0.0.1:3199 node scripts/test-fortress-browser.mjs
import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const app = process.env.QA_APP_URL ?? 'http://127.0.0.1:3199';
const api = process.env.QA_API_URL;
assert.ok(api?.startsWith('http://127.0.0.1'), 'QA must run against a local Supabase stack');
const admin = createClient(api, process.env.QA_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const out = process.env.QA_OUT ?? '.forge/fortress-qa';
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
  const email = `fortress-qa-${stamp}-${index}@example.test`;
  const password = crypto.randomUUID() + 'Qa1!';
  const name = `fort_${stamp % 100000}_${index}`;
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

const field = page => page.getByRole('application', { name: 'Fortress Feud siege' });
const launch = page => page.getByRole('button', { name: '🚀 Launch' });

async function soloChecks() {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }, { width: 320, height: 640 }, { width: 844, height: 390 }]) {
    const { ctx, page } = await context(viewport);
    const tag = `${viewport.width}x${viewport.height}`;
    await page.goto(app + '/play/fortress-feud');
    await page.getByRole('heading', { name: 'Fortress Feud', level: 1 }).waitFor();
    await page.getByRole('button', { name: /Mission 2: Stone Cold\. Locked/ }).waitFor();
    await audit(page, `hub-${tag}`);
    await page.getByRole('button', { name: 'Start campaign' }).click();
    await page.getByRole('dialog', { name: /Target Practice/ }).waitFor();
    await audit(page, `briefing-${tag}`);
    await page.getByRole('button', { name: 'Build my fortress →' }).click();
    await page.getByRole('heading', { name: /Fortify for/ }).waitFor();
    // Every block placed costs gold: the ammo money must drop, and a cheaper template gives it back.
    const money = async () => Number((await page.getByText(/^🪙 -?\d+$/).nth(1).textContent()).replace(/[^\d-]/g, ''));
    const before = await money();
    await page.getByRole('radiogroup', { name: 'Material' }).getByRole('radio', { name: /Stone/ }).click();
    await page.getByRole('button', { name: /^Block/ }).click();
    await page.getByLabel(/^Building plot\./).focus();
    await page.keyboard.press('Enter');
    await page.getByText('15/36').waitFor();
    assert.ok(await money() < before, 'a stone block costs gold');
    await page.getByRole('tab', { name: /Templates/ }).click();
    await page.getByRole('button', { name: /Timber Outpost/ }).click();
    assert.ok(await money() > before, 'the outpost is cheaper than the keep');
    await page.getByRole('button', { name: 'Undo' }).click();
    await page.getByText('15/36').waitFor();
    await audit(page, `build-${tag}`);
    await page.getByRole('button', { name: '⚔️ To battle!' }).click();
    await field(page).waitFor();
    await launch(page).waitFor();
    await sleep(800);
    await audit(page, `battle-${tag}`, { axe: viewport.width === 390 || viewport.width === 1440 });
    if (viewport.width >= 1000) {
      // Keyboard: raise the angle, then launch with Enter.
      await page.getByLabel(/^Battlefield\. Arrow keys/).focus();
      for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowUp');
      await page.getByText('Angle 50°').waitFor();
      await page.keyboard.press('Enter');
    } else {
      // Touch: drag back on the field and let go.
      const box = await page.locator('canvas').boundingBox();
      const x = box.x + box.width * 0.55, y = box.y + box.height * 0.35;
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let i = 1; i <= 8; i++) await page.mouse.move(x - i * 12, y + i * 10);
      await page.mouse.up();
    }
    await page.getByText('Shot away…').waitFor();
    await sleep(1200);
    await audit(page, `flight-${tag}`, { axe: false });
    // The Machine answers, then it is our turn again with one shot fewer.
    await poll(async () => (await page.getByText('Your turn — drag back on the field to aim').count()) > 0, 'Turn never came back', 40000);
    assert.ok(await page.getByText(/^9 shots left$/).count() || await page.locator('span', { hasText: /^🎯 9 shots left$/ }).count(), 'one shot spent');
    pass(`solo siege: build, aim, launch, the Machine replies ${tag}`);
    await ctx.close();
  }
}

async function soloResult() {
  const { ctx, page } = await context({ width: 390, height: 844 });
  await page.goto(app + '/play/fortress-feud');
  await page.getByRole('heading', { name: 'Quick battle vs the Machine' }).waitFor();
  await page.getByRole('button', { name: 'Machine King Rarely misses' }).click();
  await page.getByRole('button', { name: '⚔️ To battle!' }).click();
  await field(page).waitFor();
  const end = Date.now() + 240_000;
  while (Date.now() < end && !(await page.getByRole('dialog', { name: /Defeat|Victory|Stalemate/ }).count())) {
    const skip = page.getByRole('button', { name: 'Skip to the result' });
    if (await skip.count()) await skip.click().catch(() => undefined);
    else if (await launch(page).isEnabled().catch(() => false)) await launch(page).click().catch(() => undefined);
    await sleep(300);
  }
  await page.getByRole('dialog', { name: /Defeat|Victory|Stalemate/ }).waitFor({ timeout: 5000 });
  await audit(page, 'solo-result-390');
  await page.getByRole('button', { name: 'Back to the war room' }).click();
  await page.getByRole('heading', { name: 'Fortress Feud', level: 1 }).waitFor();
  pass('a full solo battle ends with a result card');
  await ctx.close();
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

async function buildAndStart(host, guest, { coop = false } = {}) {
  await host.page.getByRole('button', { name: 'Start with 2 players' }).click();
  await Promise.all([host, guest].map(p => p.page.getByRole('heading', { name: /Build your/ }).waitFor()));
  await audit(host.page, `online-build-${coop ? 'coop' : 'duel'}-390`);
  await host.page.getByRole('button', { name: /Lock in my fortress/ }).click();
  if (!coop) {
    await host.page.getByRole('heading', { name: 'Fortress ready' }).waitFor();
    await guest.page.getByRole('tab', { name: /Templates/ }).click();
    await guest.page.getByRole('button', { name: /Iron Bastion/ }).click();
    await guest.page.getByRole('button', { name: /Lock in my fortress/ }).click();
  }
  await Promise.all([host, guest].map(p => field(p.page).waitFor({ timeout: 30000 })));
}

async function onlineDuel(host, guest) {
  const code = await createRoom(host, 'fortress-feud');
  await host.page.getByText('⚔️ 1v1 Duel').waitFor();
  await audit(host.page, 'battle-lobby-390');
  await join(guest, code);
  await buildAndStart(host, guest);
  const started = await roomRow(code);
  assert.equal(started.round_state.stage, 'battle');
  assert.equal(started.round_state.match.world.bodies.filter(b => b.side === 1 && b.kind === 'block').length, 16, 'guest built the 16-piece bastion');
  await guest.page.getByText(/Waiting for/).waitFor();
  // Out-of-turn orders are refused by the server.
  const refused = await guest.page.request.post(`${app}/api/rooms/${code}/battle`, { data: { action: 'order', order: { type: 'fire', angle: 45, power: 0.7, ammo: 'stone' } } });
  assert.equal(refused.status(), 409);
  await launch(host.page).click();
  await poll(async () => (await roomRow(code)).round_state.replayTurn === 0, 'Host shot never reached the server');
  // The guest's phone replays the same shot, then it is their turn.
  await guest.page.getByText('Incoming!').waitFor({ timeout: 10000 });
  await audit(guest.page, 'online-duel-guest-flight-1440', { axe: false });
  await guest.page.getByText('Your turn — drag back on the field to aim').waitFor({ timeout: 30000 });
  await guest.page.getByRole('button', { name: /Iron Ball/ }).click();
  await launch(guest.page).click();
  await poll(async () => (await roomRow(code)).round_state.replayTurn === 1, 'Guest shot never reached the server');
  await host.page.getByText('Your turn — drag back on the field to aim').waitFor({ timeout: 30000 });
  await audit(host.page, 'online-duel-host-390', { axe: false });
  // Walking out after both sides fired concedes the duel.
  await host.page.getByRole('button', { name: 'Forfeit' }).click();
  await host.page.waitForURL('**/games');
  await guest.page.getByText('A commander left the battlefield.').waitFor({ timeout: 20000 });
  await audit(guest.page, 'online-duel-result-1440');
  const finished = await roomRow(code);
  assert.equal(finished.status, 'finished');
  assert.deepEqual(finished.winner_ids, [guest.id]);
  assert.equal('replay' in ((await guest.page.request.get(`${app}/api/rooms/${code}`)).ok() ? (await (await guest.page.request.get(`${app}/api/rooms/${code}`)).json()).room.round_state : {}), false, 'room snapshot omits replays');
  const { data: history } = await admin.from('match_history').select('profile_id, won').eq('room_id', finished.id);
  assert.equal(history.length, 2);
  assert.equal(history.find(h => h.profile_id === guest.id).won, true);
  pass('online duel: build, shots replay on both phones, turns enforced, forfeit records the result');
}

async function onlineCoop(host, guest) {
  const code = await createRoom(host, 'fortress-feud', async page => {
    await page.getByLabel('Battle mode').selectOption('coop');
    await page.getByLabel('Machine difficulty').selectOption('easy');
  });
  await join(guest, code);
  await buildAndStart(host, guest, { coop: true });
  await host.page.getByText('Your team').first().waitFor();
  await launch(host.page).click();
  // After the shot lands the server fires for the Machine, then it is the guest's turn.
  await poll(async () => { const r = await roomRow(code); return r.round_state.match.turn >= 2 ? r : null; }, 'The Machine never fired', 40000);
  const room = await roomRow(code);
  assert.equal(room.round_state.match.last.player, 1, 'the Machine took the second shot');
  await guest.page.getByText('Your turn — drag back on the field to aim').waitFor({ timeout: 30000 });
  await audit(guest.page, 'online-coop-guest-1440', { axe: false });
  await guest.page.getByRole('button', { name: 'Leave battle' }).click();
  await guest.page.waitForURL('**/games**');
  await poll(async () => (await roomRow(code)).status === 'finished', 'Co-op room did not close');
  pass('online co-op: shared fortress, the server fires for the Machine, leaving closes the room');
}

async function truthOrDare(host, guest) {
  const code = await createRoom(host, 'truth-or-dare', async page => {
    assert.equal(await page.getByLabel('Vibe').inputValue(), 'easy', 'Classic is the default vibe');
  });
  await host.page.getByText('Classic', { exact: true }).waitFor();
  await join(guest, code);
  await host.page.getByRole('button', { name: 'Start with 2 players' }).click();
  const started = await poll(async () => { const r = await roomRow(code); return r.status === 'playing' ? r : null; }, 'Truth or Dare did not start');
  const picker = started.turn_player_id === host.id ? host : guest;
  const watcher = picker === host ? guest : host;
  await picker.page.getByRole('heading', { name: 'Truth or dare?' }).waitFor();
  await watcher.page.getByRole('heading', { name: /is choosing/ }).waitFor();
  await audit(picker.page, 'truth-or-dare-pick');
  await picker.page.getByRole('button', { name: /Dare/ }).click();
  await picker.page.getByText('😈 Dare · +2').waitFor();
  await watcher.page.getByText('😈 Dare · +2').waitFor();
  await audit(picker.page, 'truth-or-dare-card');
  await picker.page.getByRole('button', { name: 'Completed' }).click();
  await picker.page.getByText(/\(\+2 points\)/).waitFor();
  const scores = (await admin.from('room_players').select('profile_id, score').eq('room_id', (await roomRow(code)).id)).data;
  assert.equal(scores.find(s => s.profile_id === picker.id).score, 2);
  pass('truth or dare: pick reveals a matching card, dares score double');
}

async function libraryChecks() {
  const { ctx, page } = await context({ width: 390, height: 844 });
  await page.goto(app + '/games?q=fortress');
  await page.getByRole('link', { name: 'Enter the war room →' }).waitFor();
  await page.getByRole('link', { name: 'Create Fortress Feud room' }).waitFor();
  await page.getByText('1 game to explore across all play modes.').waitFor();
  await page.goto(app + '/games?q=after%20dark');
  const status = await page.getByRole('status').first().textContent();
  assert.ok(!/After Dark \(18\+\)/.test(await page.locator('main').innerText()), 'the retired After Dark game is hidden');
  await audit(page, 'library-search-390');
  await page.goto(app + '/');
  await audit(page, 'home-390');
  pass(`library: battle listed once in solo and online sections (${status?.trim()})`);
  await ctx.close();
}

try {
  if (!process.env.QA_SKIP_SOLO) {
    await libraryChecks();
    await soloChecks();
    await soloResult();
  }
  const host = await signIn({ width: 390, height: 844 }, 0);
  const guest = await signIn({ width: 1440, height: 900 }, 1);
  if (!process.env.QA_ONLY_TOD) {
    await onlineDuel(host, guest);
    await onlineCoop(host, guest);
  }
  await truthOrDare(host, guest);
} finally {
  save();
  for (const id of users) await admin.auth.admin.deleteUser(id).catch(() => undefined);
  await browser.close();
}
console.log(JSON.stringify({ checks: report.checks.length, violations: report.violations.length, overflow: report.overflow, errors: report.errors }, null, 2));
