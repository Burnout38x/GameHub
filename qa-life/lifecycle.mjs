import {chromium} from 'playwright-core';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const f=JSON.parse(readFileSync('qa-redesign/pocket-winning-fixture.json','utf8'));
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
const page=await browser.newPage({viewport:{width:390,height:900}});
await page.addInitScript(f=>localStorage.setItem('gamehub:pocket-paradise:v1',JSON.stringify({version:1,rulesVersion:2,mode:'practice',seed:f.seed,moves:f.moves.slice(0,19)})),f);
await page.goto('http://127.0.0.1:3199/play/pocket-paradise');await page.getByRole('button',{name:'Watch neighborhood life'}).waitFor();await page.evaluate(()=>document.fonts.ready);
await page.getByRole('button',{name:'Watch neighborhood life'}).click();
await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
assert.equal(await page.locator('[data-resident]:visible').count(),0);
assert.equal(await page.locator('[data-resident]').evaluateAll(es=>es.flatMap(e=>e.getAnimations({subtree:true})).filter(a=>a.playState==='running').length),0);
await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});assert(await page.locator('[data-resident]:visible').count()>0);
await page.getByRole('button',{name:'Watch neighborhood life'}).click();await page.setViewportSize({width:820,height:1000});await page.waitForTimeout(200);
assert.equal(await page.locator('[data-resident]').evaluateAll(es=>es.flatMap(e=>e.getAnimations({subtree:true})).filter(a=>a.playState==='running').length),0);
assert(await page.locator('[data-resident]').evaluateAll(es=>es.every(e=>{const t=document.querySelector(`[data-pocket-cell="${e.dataset.destination}"]`).getBoundingClientRect(),r=e.getBoundingClientRect();return r.x+12>=t.left&&r.x+12<=t.right&&r.y+29>=t.top&&r.y+29<=t.bottom;})));
writeFileSync('qa-life/lifecycle.json',JSON.stringify({hiddenEventCancels:true,visibleEventSettles:true,resizeCancelsAndAligns:true,note:'Visibility change event simulated; resize is actual browser viewport change'},null,2));console.log('PASS visibility cancellation, return and resize alignment');
}finally{await browser.close();}
