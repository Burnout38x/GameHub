import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context=await browser.newContext({viewport:{width:375,height:850}});context.setDefaultTimeout(10000);
await context.route('**/*',r=>['http://127.0.0.1:3199','http://127.0.0.1:58321','ws://127.0.0.1:3199'].includes(new URL(r.request().url()).origin)?r.continue():r.abort());
await context.addInitScript(()=>{Element.prototype.requestPointerLock=()=>Promise.reject(new Error('Disabled QA'));Element.prototype.setPointerCapture=()=>{};});
const page=await context.newPage();const results=[];const errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['warning','warn','error'].includes(m.type()))errors.push(`console ${m.type()}: ${m.text()}`);});
try{
 for(const theme of ['dark','light'])for(const width of [375,768,1440])for(const route of ['/','/games']){
  await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:3199'+route);
  await page.evaluate(t=>{localStorage.setItem('gamehub-theme',t);document.documentElement.dataset.theme=t;},theme);await page.reload();
  await page.locator('main h1').waitFor();await page.evaluate(async()=>Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getTiming().iterations)).map(a=>a.finished.catch(()=>{}))));
  assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
  if(theme==='light' && route==='/')assert.equal(await page.getByRole('link',{name:'All games →',exact:true}).evaluate(e=>getComputedStyle(e).color),'rgb(23, 104, 96)','Bright theme must override important utility colors');
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});const violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  const label=`final-${theme}-${width}-${route==='/'?'home':'games'}`;await page.screenshot({path:`.forge/screenshots/${label}.png`,fullPage:true});results.push({label,violations,overflow});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('http://127.0.0.1:3199');await page.getByRole('button',{name:'Pick a game for us'}).click();await page.getByRole('link',{name:'Play this game →',exact:true}).waitFor();
 const animations=await page.evaluate(()=>document.getAnimations().map(a=>({duration:a.effect.getTiming().duration,iterations:a.effect.getTiming().iterations})));assert.ok(animations.every(a=>a.duration<=.01));
 results.push({label:'reduced-motion-game-picker',animations});
}catch(e){errors.push(e.stack);}finally{await browser.close();writeFileSync('.forge/browser-visual.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({screens:results.length,errors,violations:results.filter(r=>r.violations?.length),overflow:results.filter(r=>r.overflow)}));if(errors.length||results.some(r=>r.overflow||r.violations?.length))process.exitCode=1;}
