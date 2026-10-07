// Isolated browser integration: never connect to the live service or user Chrome profile.
import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const app = 'http://127.0.0.1:3199';
const visualOnly = process.argv.includes('--visual-only');
const artifactStem = visualOnly ? 'browser-online-visual' : 'browser-online';
const vars = Object.fromEntries(readFileSync('/private/tmp/gamehub-codex-audit-20261006/local.env', 'utf8').split('\n').flatMap(line => { const m = line.match(/^([A-Z_]+)="(.*)"$/); return m ? [[m[1], m[2]]] : []; }));
{
    const qaArgs0 = [vars.API_URL, 'http://127.0.0.1:58321'];
    assert.equal(...qaArgs0);
}
const admin = createClient(vars.API_URL, vars.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const report = { checks: [], violations: [], overflow: [], errors: [], warnings: [], resourceFailures: [], screenshots: [] };
mkdirSync('qa-workspace/evidence', { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const people = [], qaRooms = [];
const save = () => writeFileSync(`qa-workspace/evidence/regression-${artifactStem}-report.json`, JSON.stringify(report, null, 2));
const mark = (label) => { report.checks.push(label); save(); console.log('PASS ' + label); };
async function poll(fn, message) { const end = Date.now() + 15000; while (Date.now() < end) {
    const value = await fn();
    if (value)
        return value;
    await new Promise(r => setTimeout(r, 150));
} throw new Error(message); }
async function audit(page, label) {
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const result = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }));
    report.violations.push(...result.violations.map(v => ({ label, id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
    const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    if (size.scroll > size.width + 1)
        report.overflow.push({ label, ...size });
    const path = `qa-workspace/evidence/regression-${label}.png`;
    await page.screenshot({ path, fullPage: true });
    report.screenshots.push(path);
    mark(label);
}
async function bothThemes(page, label) {
    for (const theme of ['dark', 'light']) {
        if (await page.locator('html').getAttribute('data-theme') !== theme)
            await page.getByRole('button', { name: /Switch to .* theme/ }).click();
        await audit(page, `online-${label}-${theme}`);
    }
}
async function identity(index) {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 850 } });
    ctx.setDefaultTimeout(15000);
    await ctx.route('**/*', route => { const url = new URL(route.request().url()); return [app, vars.API_URL].includes(url.origin) ? route.continue() : route.abort(); });
    await ctx.addInitScript(() => { Element.prototype.requestPointerLock = () => Promise.reject(new Error('Disabled in isolated QA')); Element.prototype.setPointerCapture = () => { }; });
    const page = await ctx.newPage();
    page.on('requestfailed', request => report.resourceFailures.push({ path: new URL(request.url()).pathname, error: request.failure()?.errorText }));
    page.on('dialog', dialog => dialog.accept());
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'warning')
        report.warnings.push(message.text()); });
    if (index === 0) {
        await page.goto(app);
        await page.getByRole('button', { name: 'Pick a game for us', exact: true }).click();
        await page.getByRole('link', { name: 'Play this game →', exact: true }).waitFor();
        const before = await page.locator('html').getAttribute('data-theme');
        await page.getByRole('button', { name: /Switch to .* theme/ }).click();
        await poll(async () => await page.locator('html').getAttribute('data-theme') !== before, 'Home theme control did not hydrate');
        mark('production hydration: home game draw and theme respond');
    }
    const stamp = Date.now();
    const email = `online-browser-${stamp}-${index}@example.test`, password = crypto.randomUUID() + 'Qa1!', name = `online_${stamp}_${index}`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username: name } });
    if (created.error)
        throw created.error;
    await page.goto(app + '/login');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await page.waitForURL('**/games').catch(async (error) => { console.error('Login page diagnostics: ' + JSON.stringify({ url: page.url().split('?')[0], text: await page.locator('main').innerText().catch(() => '(no main)') })); throw error; });
    return { page, ctx, id: created.data.user.id, name };
}
async function req(person, path, body) { const response = body === undefined ? await person.page.request.get(app + path) : await person.page.request.post(app + path, { data: body }); const data = await response.json(); {
    const qaArgs1 = [response.status(), 200, `${path}: ${JSON.stringify(data)}`];
    assert.equal(...qaArgs1);
} return data; }
const snap = (person, code) => req(person, `/api/rooms/${code}`);
async function privateSecret(code) { const b = await snap(people[0], code); const { data, error } = await admin.from('room_secrets').select('secret').eq('room_id', b.room.id).single(); if (error)
    throw error; return data.secret; }
const actor = b => people.find(p => p.id === b.room.turn_player_id);
async function create(slug, count = 2, rounds = 1, timer = null) {
    const game = games.find(g => g.slug === slug);
    {
        const qaArgs2 = [game, slug];
        assert.ok(...qaArgs2);
    }
    const { code } = await req(people[0], '/api/rooms', { gameId: game.id, totalRounds: rounds, difficulty: 'easy', answerSeconds: timer });
    qaRooms.push(code);
    await people[0].page.goto(`${app}/room/${code}`);
    for (const p of people.slice(1, count)) {
        await p.page.goto(app + '/rooms/join');
        await p.page.getByLabel('Room code').fill(code);
        await p.page.getByRole('button', { name: /Join room/ }).click();
        await p.page.waitForURL(`**/room/${code}`);
    }
    await people[0].page.getByRole('button', { name: `Start with ${count} players`, exact: true }).click();
    await poll(async () => { const b = await snap(people[0], code); return b.room.status === 'playing' ? b : null; }, 'Room did not start');
    await Promise.all(people.slice(0, count).map(person => person.page.getByRole('progressbar', { name: 'Game progress' }).waitFor()));
    return code;
}
async function end(code, slug) {
    await poll(async () => (await snap(people[0], code)).room.status === 'finished', 'Game did not finish ' + slug);
    await people[0].page.getByRole('heading', { name: 'Final scores', exact: true }).waitFor();
    await bothThemes(people[0].page, `${slug}-result`);
    mark(`${slug}: browser play, score, finish`);
}
const { data: games, error: gameError } = await admin.from('games').select('*');
if (gameError)
    throw gameError;
try {
    for (let i = 0; i < 3; i++)
        people.push(await identity(i));
    mark('three isolated browser identities logged in');
    if (visualOnly) {
        const code = await create('riddle-rush', 2, 1);
        const state = await snap(people[0], code);
        await people[0].page.locator('main .option-btn').first().waitFor();
        await bothThemes(people[0].page, 'final-css-quiz-play');
        const { data: prompt } = await admin.from('prompts').select('content').eq('id', state.prompt.id).single();
        const wrong = prompt.content.options.find(option => option !== prompt.content.answer);
        await people[0].page.getByRole('button', { name: prompt.content.answer, exact: true }).click();
        await people[1].page.getByRole('button', { name: wrong, exact: true }).click();
        await people[0].page.getByRole('button', { name: /Finish game/ }).waitFor();
        await bothThemes(people[0].page, 'final-css-correct-reveal');
        await bothThemes(people[1].page, 'final-css-wrong-reveal');
        await people[0].page.getByRole('button', { name: /Finish game/ }).click();
        await end(code, 'final-css-quiz');
    }
    else {
        // Quiz: both clients submit real rendered choices and see the same reveal.
        let code = await create('riddle-rush', 2, 1, 30);
        let b = await snap(people[0], code);
        await people[0].page.locator('main .option-btn').first().waitFor();
        await bothThemes(people[0].page, 'quiz-play');
        const { data: prompt } = await admin.from('prompts').select('content').eq('id', b.prompt.id).single();
        await people[0].page.getByRole('button', { name: prompt.content.answer, exact: true }).click();
        await people[0].page.getByText(/Answer locked in/).waitFor();
        {
            const qaArgs3 = [await people[0].page.locator('main .option-btn').first().isDisabled()];
            assert.ok(...qaArgs3);
        }
        await people[1].page.getByRole('button', { name: prompt.content.answer, exact: true }).click();
        await people[0].page.getByRole('button', { name: /Finish game/ }).click();
        await end(code, 'quiz');
        // Timed prompt: only active player can control one deadline; spectator and reload agree.
        code = await create('two-minute-challenge');
        b = await snap(people[0], code);
        let p = actor(b), other = people.find(person => person.id !== p.id);
        await p.page.getByRole('button', { name: '▶ Start', exact: true }).click();
        await poll(async () => !!(await snap(p, code)).room.round_state.challengeDeadline, 'Timer not started');
        {
            const qaArgs4 = [await other.page.getByRole('button', { name: '▶ Start', exact: true }).count(), 0];
            assert.equal(...qaArgs4);
        }
        await poll(async () => /01:/.test(await other.page.locator('main').innerText()), 'Other player did not receive shared countdown');
        const deadline = (await snap(p, code)).room.round_state.challengeDeadline;
        await other.page.reload();
        await poll(async () => /01:/.test(await other.page.locator('main').innerText()), 'Countdown lost on reload');
        {
            const qaArgs5 = [(await snap(other, code)).room.round_state.challengeDeadline, deadline];
            assert.equal(...qaArgs5);
        }
        await bothThemes(p.page, 'prompt-shared-timer');
        await p.page.locator('main .option-btn').first().click();
        for (;;) {
            const state = await snap(people[0], code);
            const current = actor(state);
            if (state.room.current_round + 1 >= state.room.total_rounds) { await current.page.getByRole('button', {name: /Finish game/}).click(); break; }
            await current.page.getByRole('button', {name: 'Next →', exact:true}).click();
            await poll(async () => (await snap(people[0],code)).room.current_round > state.room.current_round, 'Prompt next turn');
            const nextState = await snap(people[0], code);
            await actor(nextState).page.locator('main .option-btn').first().click();
        }
        await end(code, 'prompt');
        // Memory: spectator cards disabled, solve generated local-only deck via real buttons.
        code = await create('memory-match', 2, 4);
        b = await snap(people[0], code);
        p = actor(b);
        other = people.find(person => person.id !== p.id);
        await p.page.getByRole('button', { name: 'Face-down card 1', exact: true }).waitFor();
        {
            const qaArgs6 = [await other.page.getByRole('button', { name: 'Face-down card 1', exact: true }).isDisabled()];
            assert.ok(...qaArgs6);
        }
        await bothThemes(p.page, 'memory-play');
        const deck = (await privateSecret(code)).cards;
        const pairs = new Map();
        deck.forEach((card, i) => pairs.set(card.name, [...(pairs.get(card.name) ?? []), i]));
        for (const indexes of pairs.values()) {
            for (const index of indexes) {
                await p.page.getByRole('button', { name: `Face-down card ${index + 1}`, exact: true }).click();
            }
            await poll(async () => { const state = (await snap(p, code)); return state.room.status === 'finished' || state.room.round_state.cards[indexes[0]].matched; }, 'Pair not scored');
        }
        await end(code, 'memory');
        // Number Guess: out-of-turn field hidden and correct guess finishes.
        code = await create('number-guess');
        b = await snap(people[0], code);
        p = actor(b);
        other = people.find(person => person.id !== p.id);
        await p.page.getByLabel('Your guess', { exact: true }).waitFor();
        {
            const qaArgs7 = [await other.page.getByLabel('Your guess', { exact: true }).count(), 0];
            assert.equal(...qaArgs7);
        }
        await bothThemes(p.page, 'guess-play');
        await p.page.getByLabel('Your guess', { exact: true }).fill(String((await privateSecret(code)).value));
        await p.page.getByRole('button', { name: 'Guess', exact: true }).click();
        await end(code, 'guess');
        // Partner prediction: subject answers privately, then guesser gains access, roles rotate.
        code = await create('know-your-partner', 2, 2);
        b = await snap(people[0], code);
        for (let round = 0; round < 2; round++) {
            b = await snap(people[0], code);
            p = actor(b);
            other = people.find(person => person.id !== p.id);
            await p.page.locator('main .option-btn').first().waitFor();
            {
                const qaArgs8 = [await other.page.locator('main .option-btn').count(), 0];
                assert.equal(...qaArgs8);
            }
            if (round === 0)
                await bothThemes(p.page, 'predict-private');
            const choice = b.prompt.content.options[0];
            await p.page.getByRole('button', { name: choice, exact: true }).click();
            await other.page.getByRole('button', { name: choice, exact: true }).click();
            await people[0].page.getByRole('button', { name: round === 0 ? 'Next question →' : 'Finish game 🏁', exact: true }).click();
            if (round === 0)
                await poll(async () => (await snap(people[0], code)).room.current_round === 1, 'Partner roles did not rotate');
        }
        await end(code, 'predict');
        // Free-text prediction uses private collection and a shared adjudication stage.
        code = await create('who-remembers', 2, 2);
        for (let round = 0; round < 2; round++) {
            await people[0].page.getByLabel('Your private answer', { exact: true }).fill(round === 0 ? '🥰' : 'Paris');
            await people[0].page.getByRole('button', { name: /Save private answer/ }).click();
            await people[0].page.getByText(/Answer locked in/).waitFor();
            {
                const qaArgs9 = [await people[1].page.getByText(round === 0 ? '🥰' : 'Paris', { exact: true }).count(), 0];
                assert.equal(...qaArgs9);
            }
            await people[1].page.getByLabel('Your private answer', { exact: true }).fill(round === 0 ? '😭' : 'Paris');
            await people[1].page.getByRole('button', { name: /Save private answer/ }).click();
            if (round === 0) {
                b = await poll(async () => { const state = await snap(people[0], code); return state.room.round_state.stage === 'decide' ? state : null; }, 'Memory adjudication missing');
                p = actor(b);
                await p.page.getByRole('button', { name: /Different memories/ }).click();
            }
            await people[0].page.getByRole('button', { name: round === 0 ? 'Next question →' : 'Finish game 🏁', exact: true }).click();
            if (round === 0)
                await poll(async () => (await snap(people[0], code)).room.current_round === 1, 'Memory round did not advance');
        }
        await end(code, 'predict-memory');
        // Code: incomplete guess feedback, duplicate input rejection, then solve.
        code = await create('code-crackers');
        b = await snap(people[0], code);
        p = actor(b);
        other = people.find(person => person.id !== p.id);
        await p.page.getByRole('button', { name: 'Submit guess', exact: true }).waitFor();
        {
            const qaArgs10 = [await other.page.getByRole('button', { name: 'Submit guess', exact: true }).isDisabled()];
            assert.ok(...qaArgs10);
        }
        await p.page.getByRole('button', { name: 'Submit guess', exact: true }).click();
        await p.page.getByText('Enter all 4 digits.', { exact: true }).waitFor();
        await p.page.getByRole('button', { name: 'Add digit 1', exact: true }).click();
        await p.page.getByRole('button', { name: 'Add digit 1', exact: true }).click();
        await p.page.getByText('No repeated digits in this code.', { exact: true }).waitFor();
        await p.page.getByRole('button', { name: 'Clear', exact: true }).click();
        await bothThemes(p.page, 'code-play');
        for (const digit of (await privateSecret(code)).code)
            await p.page.getByRole('button', { name: `Add digit ${digit}`, exact: true }).click();
        await p.page.getByRole('button', { name: 'Submit guess', exact: true }).click();
        await end(code, 'code');
        // Rule: test consumes turn; next player chooses the rule from displayed choices.
        code = await create('rule-discoverer');
        b = await snap(people[0], code);
        p = actor(b);
        other = people.find(person => person.id !== p.id);
        await p.page.getByLabel('Test a word or number', { exact: true }).waitFor();
        {
            const qaArgs11 = [await other.page.getByLabel('Test a word or number', { exact: true }).isDisabled()];
            assert.ok(...qaArgs11);
        }
        await bothThemes(p.page, 'rule-play');
        await p.page.getByLabel('Test a word or number', { exact: true }).fill(b.room.round_state.evidence[0].value);
        await p.page.getByRole('button', { name: 'Test example', exact: true }).click();
        b = await poll(async () => { const state = await snap(people[0], code); return state.room.turn_player_id !== p.id ? state : null; }, 'Rule turn not passed');
        p = actor(b);
        const hidden = (await privateSecret(code)).ruleId;
        const choice = b.room.round_state.choices.find(c => c.id === hidden);
        await p.page.getByRole('button', { name: choice.name + ' ' + choice.desc, exact: true }).click();
        await end(code, 'rule');
        // Chain: invalid input rejected, final link can be challenged and independent third player votes.
        code = await create('word-chain', 3, 1);
        b = await snap(people[0], code);
        p = actor(b);
        other = people.find(person => person.id !== p.id);
        await p.page.getByRole('textbox', { name: 'Your connected word', exact: true }).waitFor();
        {
            const qaArgs12 = [await other.page.getByRole('textbox', { name: 'Your connected word', exact: true }).isDisabled()];
            assert.ok(...qaArgs12);
        }
        await p.page.getByRole('textbox', { name: 'Your connected word', exact: true }).fill('123');
        await p.page.getByRole('button', { name: 'Submit word (+1)', exact: true }).click();
        await p.page.getByRole('alert').waitFor();
        await p.page.getByRole('textbox', { name: 'Your connected word', exact: true }).fill('water');
        await p.page.getByRole('button', { name: 'Submit word (+1)', exact: true }).click();
        b = await poll(async () => { const state = await snap(people[0], code); return state.room.round_state.finalReview ? state : null; }, 'Final word review missing');
        p = actor(b);
        await bothThemes(p.page, 'chain-final-review');
        await p.page.getByRole('button', { name: /Challenge “water” instead/ }).click();
        b = await poll(async () => { const state = await snap(people[0], code); return state.room.round_state.challenge ? state : null; }, 'Challenge not opened');
        const voter = people.find(person => ![b.room.round_state.challenge.submitterId, b.room.round_state.challenge.challengerId].includes(person.id));
        await voter.page.getByRole('button', { name: /Weak connection/ }).click();
        await end(code, 'chain');
        // Deadline expiry is rendered and shared even if no player submits.
        code = await create('riddle-rush', 2, 1, 5);
        await people[0].page.getByRole('button', { name: /Finish game/ }).waitFor();
        await people[1].page.getByRole('button', { name: /Finish game/ }).waitFor();
        {
            const qaArgs13 = [await people[0].page.locator('main .option-btn').first().isDisabled()];
            assert.ok(...qaArgs13);
        }
        await people[0].page.getByRole('button', { name: /Finish game/ }).click();
        await people[0].page.getByRole('heading', { name: 'Final scores', exact: true }).waitFor();
        mark('quiz deadline shared expiry and end');
        // Rematch creates a new lobby and gives the partner a route into it.
        await people[0].page.getByRole('button', { name: '🔁 Rematch (new room)', exact: true }).click();
        await people[0].page.waitForURL(url => url.pathname.startsWith('/room/') && !url.pathname.endsWith(code));
        await people[1].page.getByRole('link', { name: '🔁 Host started a rematch — join it!', exact: true }).click();
        await people[1].page.getByRole('button', { name: 'Join this room', exact: true }).click();
        await people[0].page.getByRole('button', { name: 'Start with 2 players', exact: true }).waitFor();
        mark('host rematch and partner follow/join new lobby');
        // OS reduced-motion preference suppresses entry/score movement, keyboard focus remains visible.
        await people[0].page.emulateMedia({ reducedMotion: 'reduce' });
        await people[0].page.goto(app);
        await people[0].page.locator('main h1').waitFor();
        const movement = await people[0].page.locator('.page-enter').evaluate(main => ({ animation: getComputedStyle(main).animationName, duration: getComputedStyle(main).animationDuration }));
        {
            const qaArgs14 = [movement.animation === 'none' || parseFloat(movement.duration) < 0.01];
            assert.ok(...qaArgs14);
        }
        await people[0].page.keyboard.press('Tab');
        const focused = await people[0].page.locator(':focus').evaluate(node => ({ tag: node.tagName, text: node.textContent, visible: node.matches(':focus-visible'), outline: getComputedStyle(node).outlineStyle, color: getComputedStyle(node).outlineColor, theme: document.documentElement.dataset.theme }));
        {
            const qaArgs15 = [focused.text ?? '', /Skip to content/];
            assert.match(...qaArgs15);
        }
        {
            const qaArgs16 = [focused.visible, true];
            assert.equal(...qaArgs16);
        }
        {
            const qaArgs17 = [focused.outline, 'none'];
            assert.notEqual(...qaArgs17);
        }
        {
            const qaArgs18 = [focused.color, focused.theme === 'light' ? 'rgb(23, 104, 96)' : 'rgb(247, 189, 120)'];
            assert.equal(...qaArgs18);
        }
        mark('reduced-motion computed style and visible keyboard focus');
    }
}
catch (error) {
    report.errors.push(error.stack);
    process.exitCode = 1;
    console.error(error.message);
    console.error(JSON.stringify({ resourceFailures: report.resourceFailures }, null, 2));
}
finally {
    await browser.close();
    for (const p of people) {
        const r = await admin.auth.admin.deleteUser(p.id);
        report.checks.push('cleanup user ' + p.id + ': ' + (r.error?.message ?? 'ok'));
    }
    save();
    writeFileSync(`qa-workspace/evidence/regression-${artifactStem}-verification.md`, `# Online browser verification\n\nIsolated app ${app}; disposable local API ${vars.API_URL}. Separate headless Chrome contexts; no user profile or live data.\n\nChecks passed: ${report.checks.length}. Axe violation groups: ${report.violations.length}. Horizontal overflow: ${report.overflow.length}. Errors: ${report.errors.length}. Console warnings: ${report.warnings.length}.\n\n${report.checks.map(c => '- ' + c).join('\n')}\n\nDetails: qa-workspace/evidence/regression-${artifactStem}-report.json; screenshots: qa-workspace/evidence/online-*.png.\n`);
    console.log(JSON.stringify({ checks: report.checks.length, violations: report.violations.length, overflow: report.overflow.length, errors: report.errors.length, warnings: report.warnings.length }));
    if (report.violations.length || report.overflow.length || report.warnings.length)
        process.exitCode = 1;
}
