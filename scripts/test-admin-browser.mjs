// Disposable local QA only: never uses the live database or an existing browser profile.
import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const app = 'http://127.0.0.1:3199';
const vars = Object.fromEntries([...readFileSync('/private/tmp/gamehub-codex-audit-20261006/local.env','utf8').matchAll(/^([A-Z_]+)="(.*)"$/gm)].map(m=>[m[1],m[2]]));
assert.equal(vars.API_URL,'http://127.0.0.1:58321');
const admin = createClient(vars.API_URL,vars.SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const browser = await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const created=[];const checks=[];const errors=[];const violations=[];const screenshots=[];
const mark=x=>{checks.push(x);console.log('PASS '+x);};
async function person(role){
 const ctx=await browser.newContext({viewport:{width:375,height:850}});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 const email=`admin-qa-${role}-${Date.now()}@example.test`,password=crypto.randomUUID()+'Qa1!';
 const result=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{username:`qa_${role}_${Date.now()}`}});if(result.error)throw result.error;
 const id=result.data.user.id;created.push(id);const updated=await admin.from('profiles').update({role}).eq('id',id);if(updated.error)throw updated.error;
 await page.goto(app+'/login');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Log in',exact:true}).click();await page.waitForURL('**/games');
 return {page,ctx,id,email,password};
}
async function audit(page,label){
 await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getTiming().iterations)).map(a=>a.finished.catch(()=>{})));});
 await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
 const a=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));
 violations.push(...a.violations.map(v=>({label,id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' overflow');
 mark(label);
}
try{
 const guest=await browser.newContext();
 assert.equal((await guest.request.get(app+'/api/admin/reports')).status(),403);
 assert.equal((await guest.request.post(app+'/api/reports',{data:{}})).status(),401);
 const owner=await person('admin'),player=await person('player');
 for(const route of ['/admin/users','/admin/reports','/admin/reports/inbox']){await player.page.goto(app+route);await player.page.waitForURL(url=>!url.pathname.startsWith('/admin'));assert(!new URL(player.page.url()).pathname.startsWith('/admin'));assert(!(await player.page.content()).includes(owner.email));}
 assert.equal((await player.page.request.get(app+'/api/admin/reports')).status(),403);
 assert.equal((await player.page.request.patch(app+'/api/admin/reports',{data:{id:crypto.randomUUID(),status:'resolved'}})).status(),403);
 mark('guest and player cannot read admin accounts/reports or moderate');
 await player.page.goto(app+'/report');await player.page.getByLabel('Summary',{exact:true}).fill('QA report from the browser');await player.page.getByLabel(/^Details/).fill('This is a disposable browser report for testing the full submission workflow.');await player.page.getByRole('button',{name:'Send report',exact:true}).click();await player.page.getByRole('heading',{name:'Report received'}).waitFor();mark('player submits a report through the form');
 const body={kind:'feedback',subject:'Concurrent QA report',description:'A temporary report to verify atomic hourly limits.'};
 const responses=await Promise.all(Array.from({length:5},()=>player.page.request.post(app+'/api/reports',{data:body})));
 assert.equal(responses.filter(r=>r.status()===201).length,4);assert.equal(responses.filter(r=>r.status()===429).length,1);mark('concurrent submissions enforce exactly five reports per hour');
 const direct=createClient(vars.API_URL,vars.ANON_KEY,{auth:{persistSession:false}});await direct.auth.signInWithPassword({email:player.email,password:player.password});
 assert((await direct.from('player_reports').select('*')).error);assert((await direct.rpc('admin_usage_report',{since:new Date().toISOString()})).error);assert((await direct.rpc('submit_player_report',{p_reporter:player.id,p_kind:'bug',p_subject:'Spoofed reporter',p_description:body.description})).error);mark('database denies direct report reads and privileged RPCs');
 await owner.page.goto(app+'/admin/users');await owner.page.getByRole('heading',{name:'Users & accounts',exact:true}).waitFor();await owner.page.getByLabel('Search accounts on this page').fill(player.email);await owner.page.getByText(player.email,{exact:true}).waitFor();mark('admin sees account email and profile statistics');
 await owner.page.goto(app+'/admin/reports/inbox');await owner.page.getByRole('heading',{name:'QA report from the browser'}).waitFor();await owner.page.locator('article').filter({hasText:'QA report from the browser'}).getByRole('button',{name:'Mark resolved'}).click();await owner.page.getByText('Report resolved.',{exact:true}).waitFor();await owner.page.getByRole('button',{name:'resolved',exact:true}).click();await owner.page.getByRole('button',{name:'Reopen report'}).first().click();await owner.page.getByText('Report reopened.',{exact:true}).waitFor();mark('admin resolves and reopens reports');
 assert.equal((await owner.page.request.patch(app+'/api/admin/reports',{data:{id:'-'.repeat(36),status:'open'}})).status(),400);
 const metrics=await admin.rpc('admin_usage_report',{since:'2020-01-01T00:00:00Z'});assert.ifError(metrics.error);const count=await admin.from('match_history').select('*',{head:true,count:'exact'});assert.equal(metrics.data.playerResults,count.count);assert.equal(metrics.data.games.reduce((n,g)=>n+g.playerResults,0),count.count);mark('aggregate player results match exact database counts');
 for(const theme of ['dark','light','arcade','ocean']){
  await owner.page.goto(app+'/themes');await owner.page.evaluate(t=>{localStorage.setItem('gamehub-theme',t);document.documentElement.dataset.theme=t;window.dispatchEvent(new Event('gamehub-theme-change'));},theme);await owner.page.reload();assert.equal(await owner.page.locator('html').getAttribute('data-theme'),theme);
  for(const route of ['/themes','/games','/admin/users','/admin/reports','/admin/reports/inbox']){
   await owner.page.goto(app+route);await owner.page.locator('main h1').waitFor();if(route.endsWith('inbox'))await owner.page.getByRole('heading',{name:'QA report from the browser'}).waitFor();
   if(route==='/admin/reports')await owner.page.getByRole('heading',{name:'Daily room activity'}).waitFor();
   await audit(owner.page,`${theme}-375-${route}`);
  }
  const path=`.forge/screenshots/admin-${theme}.png`;await owner.page.screenshot({path,fullPage:true});screenshots.push(path);
 }
 for(const width of [320,1440]){await owner.page.setViewportSize({width,height:900});await owner.page.goto(app+'/admin/users');await audit(owner.page,`admin-directory-${width}`);}
 assert.deepEqual(violations,[]);assert.deepEqual(errors,[]);
}finally{
 await browser.close();
 if(created.length){const r=await admin.from('player_reports').delete().in('reporter_id',created);if(r.error)throw r.error;}
 for(const id of created){const r=await admin.auth.admin.deleteUser(id);if(r.error)throw r.error;}
 writeFileSync('.forge/admin-browser-report.json',JSON.stringify({checks,errors,violations,screenshots},null,2));
}
