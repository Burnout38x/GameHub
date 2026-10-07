import { chromium, webkit } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import axe from 'axe-core';
const base=process.env.QA_BASE_URL ?? 'http://127.0.0.1:3199';
const fixture=JSON.parse(readFileSync('qa-redesign/pocket-winning-fixture.json','utf8'));
const save={version:1,rulesVersion:2,seed:fixture.seed,mode:'practice',moves:fixture.moves.slice(0,19)};
const results=[],errors=[];
for(const engine of ['chromium','webkit']){
 const browser=await(engine==='chromium'?chromium:webkit).launch({headless:true,executablePath:engine==='chromium'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'/Users/blaze/Library/Caches/ms-playwright/webkit-2359/pw_run.sh'});
 try{for(const width of [320,390,820,1440]){
 const ctx=await browser.newContext({viewport:{width,height:950}}), page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await ctx.addInitScript(s=>{if(!localStorage.getItem('gamehub:pocket-paradise:v1'))localStorage.setItem('gamehub:pocket-paradise:v1',JSON.stringify(s));},save);
 await page.goto(base+'/play/pocket-paradise');await page.getByRole('button',{name:'Watch neighborhood life'}).waitFor();
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(500);
 await page.getByRole('button',{name:'Watch neighborhood life'}).click();
 console.log('checking',engine,width);
 const initial=await page.locator('[data-resident]').evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y})));
 await page.waitForTimeout(600);
 const moved=await page.locator('[data-resident]').evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y})));
 assert(initial.some((p,i)=>Math.hypot(p.x-moved[i].x,p.y-moved[i].y)>3),JSON.stringify({engine,width,initial,moved}));
 if(engine==='chromium' && [390,1440].includes(width))await page.locator('[aria-label="Pocket Paradise"]').screenshot({path:`qa-life/${width}-residents.png`});
 await page.waitForTimeout(8000);
 assert.equal(await page.locator('[aria-label="Pocket Paradise"]').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 const align=await page.locator('[data-resident]').evaluateAll(es=>es.every(e=>{const target=document.querySelector(`[data-pocket-cell="${e.dataset.destination}"]`).getBoundingClientRect(),r=e.getBoundingClientRect();const x=r.x+12,y=r.y+29;return x>=target.left-1&&x<=target.right+1&&y>=target.top-1&&y<=target.bottom+1;}));assert(align);
 const gate=page.locator('[aria-label="West entry gate leads to row 2 column 1"]');const before=await gate.evaluate(e=>e.getBoundingClientRect().y+scrollY);
 const attention=page.getByText(/plots? needs? attention/);if(await attention.count()){await attention.click();assert.equal(await gate.evaluate(e=>e.getBoundingClientRect().y+scrollY),before);}
 await page.addScriptTag({content:axe.source});const violations=await page.evaluate(async()=> (await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Watch neighborhood life'}).click();assert.equal(await page.locator('[data-resident]').evaluateAll(es=>es.flatMap(e=>e.getAnimations({subtree:true})).filter(a=>a.playState==='running').length),0);
 await page.getByRole('button',{name:'Residents on',exact:true}).click();assert.equal(await page.locator('[data-resident]:visible').count(),0);
 await page.getByRole('button',{name:'Residents off',exact:true}).click();assert(await page.locator('[data-resident]:visible').count()>0);
 const empty=page.locator('[data-pocket-cell][aria-label*="empty plot"]').first();await empty.click();assert.equal(await page.locator('[data-resident]:visible').count(),0);await page.getByRole('button',{name:'Cancel',exact:true}).click();
 if(width===320){
 await page.evaluate(s=>localStorage.setItem('gamehub:pocket-paradise:v1',JSON.stringify(s)),{...save,moves:save.moves.slice(0,3)});await page.reload();await page.getByText(/plots? needs? attention/).waitFor();const g=await gate.evaluate(e=>e.getBoundingClientRect().y+scrollY);await page.getByText(/plots? needs? attention/).click();assert.equal(await gate.evaluate(e=>e.getBoundingClientRect().y+scrollY),g);assert.equal(await page.locator('[data-resident]').count(),0);
 await page.evaluate(s=>localStorage.setItem('gamehub:pocket-paradise:v1',JSON.stringify(s)),{...save,rulesVersion:undefined});await page.reload();await page.getByText(/Classic save ·/).waitFor();assert.equal(await page.getByRole('region',{name:'Neighborhood life'}).count(),0);
 }
 results.push({engine,width,movement:true,settled:true,aligned:true,gateStable:true,axe:violations,reducedMotion:true,toggle:true,previewIsolated:true,overflow:false});await ctx.close();
 }}finally{await browser.close();}
}
assert.deepEqual(errors,[]);writeFileSync(process.env.QA_OUTPUT??'qa-life/browser.json',JSON.stringify({base,results,errors},null,2));console.log(`PASS ${results.length} resident browser checks`);
