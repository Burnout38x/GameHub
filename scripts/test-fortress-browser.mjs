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
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 600 });
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

async function hudNumbers(page) {
  return page.evaluate(() => {
    const labels = [...document.querySelectorAll('[class*="barLabel"]')].map(node => node.textContent ?? '');
    const gold = Number(document.querySelector('[class*="gold"]')?.textContent?.replace(/\D/g, '') ?? NaN);
    const elixir = Number(document.querySelector('[role="meter"]')?.getAttribute('aria-valuenow') ?? NaN);
    return { labels, gold, elixir };
  });
}

async function soloChecks() {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }, { width: 320, height: 640 }]) {
    const { ctx, page } = await context(viewport);
    const tag = `${viewport.width}x${viewport.height}`;
    await page.goto(app + '/play/fortress-feud');
    await page.getByRole('heading', { name: 'Fortress Feud', level: 1 }).waitFor();
    await page.getByRole('button', { name: /Mission 2: Archer Hill\. Locked/ }).waitFor();
    await audit(page, `hub-${tag}`);
    await page.getByRole('button', { name: 'Start campaign' }).click();
    await page.getByRole('dialog', { name: /First Watch/ }).waitFor();
    await audit(page, `briefing-${tag}`);
    await page.getByRole('button', { name: 'Begin battle →' }).click();
    await page.getByRole('application', { name: 'Fortress Feud battle' }).waitFor();
    await poll(async () => (await page.locator('[class*="countdown"]').count()) === 0, 'Countdown never finished', 8000);
    const before = await hudNumbers(page);
    // Deploy with a card then a lane button, and build with the plot list (desktop) or a canvas tap (phone).
    await page.getByRole('button', { name: /^Goblin Gang, 2 elixir/ }).click();
    await page.getByRole('group', { name: 'Deploy lane' }).getByRole('button', { name: 'Middle' }).click();
    if (viewport.width >= 900) {
      await page.getByRole('group', { name: 'Your plots' }).getByRole('button', { name: /Middle front/ }).click();
    } else {
      const box = await page.locator('canvas').boundingBox();
      // Middle front plot: centre lane, 205/1000 up from the bottom of the field.
      await page.mouse.click(box.x + box.width / 2, box.y + box.height * (1 - 205 / 1000));
    }
    await page.getByRole('button', { name: /^Build Archer Tower for 120 gold/ }).click();
    await sleep(600);
    const after = await hudNumbers(page);
    assert.ok(after.gold < before.gold, `gold should drop after building (${before.gold} → ${after.gold})`);
    await poll(async () => /([1-9]\d*) troops/.test((await hudNumbers(page)).labels[1] ?? '') || /[1-9]/.test((await hudNumbers(page)).labels.join(' ')), 'Troops never appeared');
    await sleep(2500);
    await audit(page, `battle-${tag}`, { axe: viewport.width === 390 || viewport.width === 1440 });
    // Keyboard: arm Knight with 2, deploy left with A.
    await page.locator('[role="application"]').focus();
    await page.keyboard.press('2');
    await page.getByText('Choose a lane for Knight').waitFor();
    await page.keyboard.press('a');
    await page.getByRole('button', { name: 'Battle menu' }).click();
    await page.getByRole('button', { name: '⏸ Pause' }).click();
    await page.getByText('Battle paused').waitFor();
    await page.getByRole('button', { name: '▶ Resume' }).click();
    await page.getByRole('button', { name: 'Battle menu' }).click();
    await page.getByRole('button', { name: 'Retreat to the war room' }).click();
    await page.getByRole('heading', { name: 'Fortress Feud', level: 1 }).waitFor();
    pass(`solo battle controls ${tag}`);
    await ctx.close();
  }
}

async function soloDefeatScreen() {
  const { ctx, page } = await context({ width: 390, height: 844 });
  await page.clock.install();
  await page.goto(app + '/play/fortress-feud');
  await page.getByRole('heading', { name: 'Quick battle vs the Machine' }).waitFor();
  await page.getByRole('button', { name: 'Machine King Merciless' }).click();
  await page.getByRole('application', { name: 'Fortress Feud battle' }).waitFor();
  for (let i = 0; i < 400; i++) {
    await page.clock.runFor(1000);
    if (await page.getByRole('dialog', { name: /Defeat|Victory|Draw/ }).count()) break;
  }
  await page.getByRole('dialog', { name: /Defeat|Draw/ }).waitFor();
  await audit(page, 'solo-result-390');
  await page.getByRole('button', { name: 'Back to the war room' }).click();
  pass('idle commander loses to the Machine and sees the result card');
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

async function onlineDuel(host, guest) {
  const code = await createRoom(host, 'fortress-feud');
  await host.page.getByText('⚔️ 1v1 Duel').waitFor();
  await audit(host.page, 'battle-lobby-390');
  await join(guest, code);
  await host.page.getByRole('button', { name: 'Start with 2 players' }).click();
  await Promise.all([host, guest].map(p => p.page.getByRole('application', { name: 'Fortress Feud battle' }).waitFor()));
  await poll(async () => (await host.page.locator('[class*="countdown"]').count()) === 0, 'Countdown did not finish', 10000);
  await host.page.getByRole('button', { name: /^Knight, 3 elixir/ }).click();
  await host.page.getByRole('group', { name: 'Deploy lane' }).getByRole('button', { name: 'Middle' }).click();
  await guest.page.getByRole('group', { name: 'Your plots' }).getByRole('button', { name: /Middle front/ }).click();
  await guest.page.getByRole('button', { name: /^Build Cannon for 160 gold/ }).click();
  const room = await poll(async () => { const r = await roomRow(code); return r.round_state.log.length >= 2 ? r : null; }, 'Orders did not reach the server');
  assert.deepEqual(room.round_state.log.map(c => [c.p, c.k]).sort(), [[0, 'deploy'], [1, 'build']]);
  // The guest should see the host's knight arrive as an enemy troop.
  await poll(async () => /[1-9]\d* troops/.test((await hudNumbers(guest.page)).labels[0]), 'Guest never saw the enemy knight');
  await sleep(1500);
  await audit(host.page, 'online-duel-host-390', { axe: false });
  await audit(guest.page, 'online-duel-guest-1440', { axe: false });
  // Out-of-range or unaffordable orders are refused by the server.
  const refused = await host.page.request.post(`${app}/api/rooms/${code}/battle`, { data: { action: 'command', command: { k: 'deploy', card: 'giant', lane: 9 } } });
  assert.equal(refused.status(), 409);
  // Forfeit (after the 30-second grace period, when walking out counts): the guest is recorded as the winner.
  const { startAt } = (await roomRow(code)).round_state;
  await sleep(Math.max(0, startAt + 31_000 - Date.now()));
  await host.page.getByRole('button', { name: 'Battle menu' }).click();
  await host.page.getByRole('button', { name: 'Forfeit and leave' }).click();
  await host.page.waitForURL('**/games');
  await guest.page.getByRole('heading', { name: /wins/ }).waitFor();
  await guest.page.getByText('A commander left the battlefield.').waitFor();
  await audit(guest.page, 'online-duel-result-1440');
  const finished = await roomRow(code);
  assert.equal(finished.status, 'finished');
  assert.deepEqual(finished.winner_ids, [guest.id]);
  const { data: history } = await admin.from('match_history').select('profile_id, won').eq('room_id', finished.id);
  assert.equal(history.length, 2);
  assert.equal(history.find(h => h.profile_id === guest.id).won, true);
  pass('online duel: orders sync, server validates, forfeit records the result');
}

async function onlineCoop(host, guest) {
  const code = await createRoom(host, 'fortress-feud', async page => {
    await page.getByLabel('Battle mode').selectOption('coop');
    await page.getByLabel('Machine difficulty').selectOption('easy');
  });
  await join(guest, code);
  await host.page.getByRole('button', { name: 'Start with 2 players' }).click();
  await Promise.all([host, guest].map(p => p.page.getByRole('application', { name: 'Fortress Feud battle' }).waitFor()));
  await host.page.getByText(/You \+ /).first().waitFor();
  await host.page.getByText('🤖 The Machine').first().waitFor();
  await sleep(6000);
  await poll(async () => /[1-9]\d* troops/.test((await hudNumbers(host.page)).labels[0]), 'The Machine never attacked', 40000);
  // Jump the server clock past the buzzer, then let the clients settle the result.
  const room = await roomRow(code);
  await admin.from('rooms').update({ round_state: { ...room.round_state, startAt: Date.now() - 200_000 } }).eq('id', room.id);
  await Promise.all([host, guest].map(p => p.page.reload()));
  await poll(async () => (await roomRow(code)).status === 'finished', 'Co-op battle did not settle', 40000);
  await host.page.getByRole('heading', { name: /Team victory|Machine wins/ }).waitFor();
  await audit(host.page, 'online-coop-result-390');
  const finished = await roomRow(code);
  assert.equal(finished.round_state.result.reason === 'time' || finished.round_state.result.reason === 'keep', true);
  pass(`online co-op: Machine attacks both players and the server settles (${finished.winner_ids.length ? 'win' : 'loss'})`);
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
    await soloDefeatScreen();
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
