// Browser checks run only against the disposable audit app and its local database.
import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import assert from 'node:assert/strict';
const app = 'http://127.0.0.1:3199';
const isolated = '/private/tmp/gamehub-codex-audit-20261006';
const vars = Object.fromEntries(readFileSync(`${isolated}/local.env`, 'utf8').split('\n').flatMap(line => { const m=line.match(/^([A-Z_]+)="(.*)"$/);return m?[[m[1],m[2]]]:[]; }));
assert.equal(vars.API_URL,'http://127.0.0.1:58321');
for(const file of ['src','postcss.config.mjs']) cpSync(file,`${isolated}/app/${file}`,{recursive:true});
mkdirSync('.forge/screenshots',{recursive:true});
const report=process.env.QA_FLOWS_ONLY ? JSON.parse(readFileSync('.forge/browser-report.json','utf8')) : {checks:[],violations:[],errors:[],overflow:[],screenshots:[]};if(process.env.QA_FLOWS_ONLY)report.errors=[];
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const admin=createClient(vars.API_URL,vars.SERVICE_ROLE_KEY,{auth:{persistSession:false}});
async function context(){
 const ctx=await browser.newContext({viewport:{width:375,height:850}});ctx.setDefaultTimeout(12000);
 await ctx.route('**/*',route=>{const u=new URL(route.request().url());return ['http://127.0.0.1:3199','http://127.0.0.1:58321','ws://127.0.0.1:3199'].includes(u.origin)?route.continue():route.abort();});
 await ctx.addInitScript(()=>{Element.prototype.requestPointerLock=()=>Promise.reject(new Error('Disabled in QA'));Element.prototype.setPointerCapture=()=>{};});
 return ctx;
}
async function audit(page,label,screenshot=false){
 await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getTiming().iterations)).map(a=>a.finished.catch(()=>{})));});
 await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
 const result=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));
 for(const v of result.violations)report.violations.push({label,id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))});
 const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,5).map(e=>e.tagName+':'+e.className)}));
 if(overflow.scroll>overflow.width+1)report.overflow.push({label,...overflow});
 if(screenshot){const path=`.forge/screenshots/${label}.png`;await page.screenshot({path,fullPage:true});report.screenshots.push(path);}
 report.checks.push(label);writeFileSync('.forge/browser-report.json',JSON.stringify(report,null,2));console.log(label);
}
const ctx=await context();const page=await ctx.newPage();
page.on('pageerror',e=>report.errors.push(e.message));page.on('dialog',d=>d.accept());
const slugs=['mystery-card','know-your-partner','code-crackers','word-chain','reverse-definition','mental-math-duel','rule-discoverer','who-remembers'];
try{
 if(!process.env.QA_FLOWS_ONLY)for(const theme of ['dark','light']){
  await page.goto(app);await page.evaluate(t=>{localStorage.setItem('gamehub-theme',t);document.documentElement.dataset.theme=t;},theme);
  for(const width of [375,768,1440]){
   await page.setViewportSize({width,height:900});
   for(const route of ['/','/games',...slugs.map(s=>'/games/local/'+s)]){
    await page.goto(app+route);await page.locator('main h1').waitFor();
    assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
    await audit(page,`${theme}-${width}-${route==='/'?'home':route.split('/').at(-1)}`,width===375||route==='/');
   }
  }
 }
 await page.setViewportSize({width:375,height:850});
 for(const slug of slugs){
  await page.goto(`${app}/games/local/${slug}`);
  await page.getByRole('button',{name:/^Start (game|duel)$/}).click();


  await audit(page,`play-${slug}`,true);
  if(slug==='code-crackers'){await page.getByRole('button',{name:'0',exact:true}).click();await page.getByRole('button',{name:'Clear',exact:true}).click();}
  if(slug==='word-chain'){await page.getByRole('textbox',{name:/connected word/i}).fill('sunshine');await page.getByRole('button',{name:'Submit word',exact:true}).click();}
  if(slug==='who-remembers'){await page.getByRole('textbox').fill('The garden');await page.getByRole('button',{name:'Save private answer',exact:true}).click();assert.equal(await page.getByText('The garden',{exact:true}).count(),0);}
  if(slug==='rule-discoverer'){await page.getByRole('textbox').fill('apple');await page.getByRole('button',{name:'Test example',exact:true}).click();}
  if(slug==='reverse-definition')await page.getByRole('button',{name:/Player 1/}).click();
  if(slug==='mystery-card')await page.getByRole('button',{name:'Player 1',exact:true}).first().click();
  if(slug==='mental-math-duel'||slug==='know-your-partner')await page.locator('main .option-btn').first().click();
  report.checks.push(`interaction-${slug}`);
 }
 // Real keyboard focus and persisted toggle preference.
 await page.goto(app);await page.keyboard.press('Tab');assert.match(await page.locator(':focus').innerText(),/Skip to content/);await page.keyboard.press('Enter');assert.equal(await page.locator(':focus').getAttribute('id'),'main-content');
 const before=await page.locator('html').getAttribute('data-theme');await page.getByRole('button',{name:/Switch to .* theme/}).click();await page.reload();assert.notEqual(await page.locator('html').getAttribute('data-theme'),before);report.checks.push('keyboard-skip-and-theme-persistence');
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(app);const duration=await page.locator('.page-enter').evaluate(e=>getComputedStyle(e).animationDuration).catch(()=>null);if(duration)assert.ok(parseFloat(duration)<.01);report.checks.push('reduced-motion');
 // Accounts exist only in the disposable local audit database; credentials never enter artifacts.
 async function login(p,index){const email=`browser-${Date.now()}-${index}@example.test`,password=crypto.randomUUID()+'Aa1!';const r=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{username:`browser_${Date.now()}_${index}`}});if(r.error)throw r.error;await p.goto(app+'/login');await p.getByLabel('Email',{exact:true}).fill(email);await p.getByLabel('Password',{exact:true}).fill(password);await p.getByRole('button',{name:'Log in',exact:true}).click();await p.waitForURL('**/games');}
 await login(page,0);await page.goto(app+'/rooms/new?game=know-your-partner');await page.getByLabel('Game',{exact:true}).selectOption('know-your-partner');await audit(page,'create-room-mobile',true);await page.getByRole('button',{name:/Create room/}).click();await page.waitForURL('**/room/*');const code=page.url().split('/').at(-1);await page.getByRole('button',{name:'Waiting for a second player'}).waitFor();await audit(page,'lobby-mobile',true);
 const ctx2=await context();const partner=await ctx2.newPage();await login(partner,1);await partner.goto(app+'/rooms/join');await partner.getByLabel('Room code').fill(code);await partner.getByRole('button',{name:/Join room/}).click();await partner.waitForURL('**/room/*');await page.getByRole('button',{name:'Start with 2 players'}).click();await page.getByText(/Your question|is answering privately/).first().waitFor();await audit(page,'online-predict-mobile',true);report.checks.push('two-browser-create-join-start');
 await page.route(`**/api/rooms/${code}`,route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Test connection interruption'})}));
 await page.getByText('Test connection interruption',{exact:false}).waitFor();assert.ok(await page.locator('main .option-btn').count()>0);
 await page.unroute(`**/api/rooms/${code}`);await page.getByRole('button',{name:'Retry connection',exact:true}).click();await page.getByText('Test connection interruption',{exact:false}).waitFor({state:'hidden'});report.checks.push('transient-room-error-retains-game-and-recovers');await ctx2.close();
}catch(error){report.errors.push(error.stack);process.exitCode=1;}finally{await browser.close();report.checks=[...new Set(report.checks)];report.screenshots=[...new Set(report.screenshots)];writeFileSync('.forge/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,violations:report.violations.length,overflow:report.overflow.length,errors:report.errors},null,2));if(report.violations.length||report.overflow.length)process.exitCode=1;}
