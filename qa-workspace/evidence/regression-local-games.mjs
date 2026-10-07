// Real browser completion/replay of all local games. Requires isolated audit app.
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { MYSTERY_QUESTIONS } from '../../src/lib/local-games/mystery-questions.ts';
import { REVERSE_CLUES } from '../../src/lib/local-games/reverse-definition-bank.ts';
import { RULES } from '../../src/lib/local-games/rule-bank.ts';
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ viewport: { width: 375, height: 850 }, reducedMotion: 'reduce' });
context.setDefaultTimeout(10000);
await context.route('**/*', r => ['http://127.0.0.1:3199', 'http://127.0.0.1:58321', 'ws://127.0.0.1:3199'].includes(new URL(r.request().url()).origin) ? r.continue() : r.abort());
await context.addInitScript(() => { Element.prototype.requestPointerLock = () => Promise.reject(new Error('Disabled QA')); Element.prototype.setPointerCapture = () => { }; });
const page = await context.newPage();
await page.clock.install();
const passed = [];
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (['warning', 'warn', 'error'].includes(m.type()))
    errors.push(`console ${m.type()}: ${m.text()}`); });
async function open(slug) { await page.goto('http://127.0.0.1:3199/games/local/' + slug); await page.locator('main h1').waitFor(); }
async function click(name) { await page.getByRole('button', { name, exact: true }).click(); }
async function tick(ms) { await page.clock.runFor(ms); }
async function result(slug) { await page.getByRole('button', { name: 'Play again', exact: true }).waitFor(); await tick(1000); await page.screenshot({ path: `qa-workspace/evidence/regression-result-${slug}.png`, fullPage: true }); await click('Play again'); await page.getByRole('button', { name: /^Start (game|duel)$/ }).waitFor(); passed.push(slug); console.log('complete-and-replay ' + slug); }
try {
    await open('code-crackers');
    await page.locator('#rounds').selectOption('1');
    await page.locator('#dupes').selectOption('yes');
    await page.evaluate(() => Math.random = () => 0);
    await click('Start game');
    for (let i = 0; i < 4; i++)
        await click('0');
    await click('Submit guess');
    await tick(1600);
    await result('code-crackers');
    await open('know-your-partner');
    await page.locator('#count').selectOption('5');
    await click('Start game');
    for (let role = 0; role < 2; role++) {
        const saved = [];
        for (let i = 0; i < 5; i++) {
            const b = page.locator('main .option-btn').first();
            saved.push(await b.innerText());
            await b.click();
        }
        {
            const qaArgs0 = [(await page.locator('main').innerText()).includes('Private answers saved')];
            assert.ok(...qaArgs0);
        }
        await click("I'm ready");
        for (const answer of saved)
            await click(answer);
        await click(role === 0 ? 'Switch roles' : 'See final result');
    }
    await result('know-your-partner');
    await open('mental-math-duel');
    await page.locator('#rounds').selectOption('10');
    await page.locator('#difficulty').selectOption('easy');
    await click('Start duel');
    for (let i = 0; i < 10; i++) {
        const t = await page.locator('main').innerText();
        const match = t.match(/([\d\s()+×−-]+) = \?/);
        {
            const qaArgs1 = [match];
            assert.ok(...qaArgs1);
        }
        const expr = match[1].trim().replaceAll('×', '*').replaceAll('−', '-');
        {
            const qaArgs2 = [expr, /^[\d\s()+*\-]+$/];
            assert.match(...qaArgs2);
        }
        const answer = Function(`return (${expr})`)();
        await page.getByRole('button', { name: String(answer), exact: true }).first().click();
        await tick(1200);
    }
    await result('mental-math-duel');
    await open('mystery-card');
    await page.locator('#rounds').selectOption('5');
    await click('Start game');
    for (let i = 0; i < 5; i++) {
        const t = await page.locator('main').innerText();
        const q = MYSTERY_QUESTIONS.find(q => t.includes(q.clue));
        {
            const qaArgs3 = [q];
            assert.ok(...qaArgs3);
        }
        const card = page.locator('main .glass-sm').filter({ hasText: new RegExp(`^[A-D]\\. ${q.answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) });
        await card.getByRole('button', { name: 'Player 1', exact: true }).click();
        await tick(1600);
    }
    await result('mystery-card');
    await open('reverse-definition');
    await page.locator('#count').selectOption('10');
    await click('Start game');
    for (let i = 0; i < 10; i++) {
        const t = await page.locator('main').innerText();
        const q = REVERSE_CLUES.find(q => t.includes(q.clue));
        {
            const qaArgs4 = [q];
            assert.ok(...qaArgs4);
        }
        await page.getByRole('button', { name: /🔔 Player 1/ }).click();
        await page.locator('main .option-btn').filter({ hasText: q.answer }).first().click();
        await tick(1400);
    }
    await result('reverse-definition');
    await open('rule-discoverer');
    await page.locator('#type').selectOption('number');
    await page.evaluate(() => Math.random = () => 0);
    await click('Start game');
    for (let i = 0; i < 3; i++) {
        await page.getByRole('button', { name: /Guess the rule/ }).click();
        await page.getByRole('button', { name: new RegExp('^' + RULES.filter(r => r.kind === 'number')[i].name) }).click();
        await tick(1500);
    }
    await result('rule-discoverer');
    await open('who-remembers');
    await page.locator('#count').selectOption('5');
    await click('Start game');
    for (let i = 0; i < 5; i++) {
        await page.getByRole('textbox').fill('Paris');
        await click('Save private answer');
        {
            const qaArgs5 = [!(await page.locator('main').innerText()).includes('Paris')];
            assert.ok(...qaArgs5);
        }
        await click("I'm ready");
        await page.getByRole('textbox').fill('Paris');
        await click('Save private answer');
        await tick(1600);
        if (i < 4)
            await click("I'm ready");
    }
    await result('who-remembers');
    await open('word-chain');
    await page.locator('#turns').selectOption('15');
    await click('Start game');
    for (const word of ['apple', 'pear', 'plum', 'peach', 'lemon', 'grape', 'melon', 'mango', 'banana', 'orange', 'berry', 'cherry', 'apricot', 'lime', 'kiwi']) {
        await page.getByRole('textbox').fill(word);
        await click('Submit word');
        await tick(450);
    }
    await click('Accept word & see results');
    await result('word-chain');
}
catch (e) {
    await tick(1000); await page.screenshot({ path: 'qa-workspace/evidence/regression-local-result-failure.png', fullPage: true }).catch(() => { });
    errors.push(e.stack);
    process.exitCode = 1;
}
finally {
    await browser.close();
    writeFileSync('qa-workspace/evidence/regression-local-results.json', JSON.stringify({ passed, errors }, null, 2));
    console.log(JSON.stringify({ passed, errors }));
    if (errors.length)
        process.exitCode = 1;
}
