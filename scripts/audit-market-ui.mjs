import { chromium, webkit } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const app='http://127.0.0.1:3202';
const vars=Object.fromEntries([...readFileSync('/private/tmp/gamehub-codex-audit-20261006/local.env','utf8').matchAll(/^([A-Z_]+)="(.*)"$/gm)].map(m=>[m[1],m[2]]));
assert.equal(vars.API_URL,'http://127.0.0.1:58321');
const admin=createClient(vars.API_URL,vars.SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const report={checks:[],issues:[],pageErrors:[],screenshots:[],axe:[],networkFailures:[],navigations:[],closing:[]};
const mark=text=>{report.checks.push(text);console.log('PASS '+text);};
const save=()=>writeFileSync(process.env.MARKET_QA_ENGINE ? `.forge/market-ui-${process.env.MARKET_QA_ENGINE}-browser.json` : '.forge/market-ui-browser.json',JSON.stringify(report,null,2));
const sizes=[[320,740],[390,844],[717,512],[820,1180],[1440,900]],themes=['dark','light','arcade','ocean'];
const allUsers=[],rooms=[];
async function person(browser,engine,n){
 const username=`M${engine.slice(0,2)}${n}${Date.now()}`,email=username+'@example.test',password=crypto.randomUUID()+'Q1!';
 const r=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{username}});assert.ifError(r.error);allUsers.push(r.data.user.id);
 const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();page.on('pageerror',e=>report.pageErrors.push({engine,person:n,message:e.message,at:Date.now()}));page.on('requestfailed',r=>report.networkFailures.push({engine,person:n,path:new URL(r.url()).pathname,error:r.failure()?.errorText,at:Date.now()}));page.on('framenavigated',frame=>{if(frame===page.mainFrame())report.navigations.push({engine,person:n,path:new URL(frame.url()).pathname,at:Date.now()});});
 await page.goto(app+'/login');await page.getByRole('button',{name:/show password/i}).click();await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Log in',exact:true}).click();await page.waitForURL('**/games');return{page,id:r.data.user.id,username};
}
async function snapshot(p,code){const r=await p.page.request.get(`${app}/api/rooms/${code}`);assert(r.ok());return r.json();}
async function action(p,locator){
 const response=p.page.waitForResponse(r=>r.url().endsWith('/market')&&r.request().method()==='POST');await locator.click();const r=await response;assert(r.ok(),await r.text());
}
async function matrix(page,engine,label){
 for(const theme of themes){
  await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;window.dispatchEvent(new Event('gamehub-theme-change'));},theme);
  for(const [width,height] of sizes){
   await page.setViewportSize({width,height});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const result=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,width:innerWidth,bottom:Math.ceil(scrollY+innerHeight),height:document.documentElement.scrollHeight,outside:[...document.querySelectorAll('main button,main input,main select')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.left< -1||r.right>innerWidth+1);}).map(e=>e.textContent.slice(0,80))}));
   if(result.scrollWidth>width+1||result.bottom<result.height-2||result.outside.length)report.issues.push({engine,label,theme,width,...result});
   mark(`${engine} ${label} ${theme} ${width}x${height}`);
  }
  await page.setViewportSize({width:320,height:740});
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  const axe=await page.evaluate(async()=>{const r=await window.axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));});
  report.axe.push({engine,label,theme,violations:axe});
 }
 save();
}
async function screenshot(page,engine,label,section,width,height=844){
 await page.setViewportSize({width,height});await page.evaluate(()=>{document.documentElement.dataset.theme='dark';});await section.scrollIntoViewIfNeeded();const path=`.forge/screenshots/market-${engine}-${label}-${width}.png`;await page.screenshot({path,fullPage:false});report.screenshots.push(path);
}
try{
 const game=(await admin.from('games').select('id').eq('slug','market-day').single()).data;
 for(const engine of (process.env.MARKET_QA_ENGINE?[process.env.MARKET_QA_ENGINE]:['chromium','webkit'])){
  const browser=await (engine==='chromium'?chromium:webkit).launch({headless:true,executablePath:engine==='chromium'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'/Users/blaze/Library/Caches/ms-playwright/webkit-2359/pw_run.sh'});
  try{
   const a=await person(browser,engine,0),b=await person(browser,engine,1),people=[a,b];
   const cr=await a.page.request.post(app+'/api/rooms',{data:{gameId:game.id}});assert(cr.ok(),await cr.text());const{code}=await cr.json();const row=(await admin.from('rooms').select('id').eq('code',code).single()).data;rooms.push(row.id);
   for(const player of [a,b]){await player.page.getByRole('link',{name:/^Join(?: with code)? ↗$/}).click();await player.page.getByLabel('Room code',{exact:true}).fill(code);await player.page.getByRole('button',{name:'Join room →',exact:true}).click();await player.page.waitForURL(`**/room/${code}`);}await a.page.getByRole('button',{name:'Start with 2 players',exact:true}).click();
   await a.page.getByRole('button',{name:/Move to /}).first().waitFor();
   await matrix(a.page,engine,'movement');
   await screenshot(a.page,engine,'board',a.page.getByRole('region',{name:'Market board'}),390);
   await screenshot(a.page,engine,'board',a.page.getByRole('region',{name:'Market board'}),1440,1000);
   const flat=a.page.getByRole('button',{name:'Flat board off'});await flat.focus();await a.page.keyboard.press('Enter');await a.page.getByRole('button',{name:'Flat board on'}).waitFor();mark(`${engine} keyboard flat toggle`);
   await a.page.getByRole('button',{name:'Flat board on'}).click();
   let turns=0;
   while(turns<(engine==='chromium'?20:3)){
    const before=await snapshot(a,code);const state=before.room.round_state;const actor=people.find(p=>p.id===state.players[state.turnIndex].id),other=people.find(p=>p.id!==actor.id),page=actor.page;
    await page.getByRole('button',{name:/Move to /}).first().waitFor();
    if(turns===0){const move=page.getByRole('button',{name:/Move to /}).first();await move.focus();const wait=page.waitForResponse(r=>r.url().endsWith('/market')&&r.request().method()==='POST');await page.keyboard.press('Enter');assert((await wait).ok());mark(`${engine} keyboard movement`);}else await action(actor,page.getByRole('button',{name:/Move to /}).first());
    await page.getByRole('button',{name:/Take a break/}).waitFor();
    await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Turn actions');
    const focus=await page.getByRole('region',{name:'Turn actions'}).boundingBox();assert(focus.y>=0&&focus.y<800);mark(`${engine} deliberate movement focuses actions turn${turns+1}`);
    const businessNames=turns%3===0?[/Buy this stall/,/Restock supplies/,/Take a break/]:[/Fulfill a commission/,/Restock supplies/,/Take a break/];
    for(const name of businessNames){const button=page.getByRole('button',{name});if(await button.isEnabled()){await action(actor,button);break;}}
    await page.getByRole('button',{name:'Finish turn',exact:true}).waitFor();
    if(turns<2){
     await page.getByText('🤝 Offer a trade',{exact:true}).click();
     const give=page.getByRole('group',{name:'You give',exact:true}),receive=page.getByRole('group',{name:'You receive',exact:true});
     assert.equal(await give.getByLabel('Coins',{exact:true}).inputValue(),'0');assert.equal(await give.getByRole('combobox').inputValue(),'');
     await give.getByLabel('Coins',{exact:true}).fill('1');await receive.getByLabel('Supplies',{exact:true}).fill('1');
     if(turns===0){await matrix(page,engine,'trade-form');await screenshot(page,engine,'trade-form',page.getByRole('region',{name:'Turn actions'}),320);}
     await action(actor,page.getByRole('button',{name:'Send this offer',exact:true}));
     const responseButton=other.page.getByRole('button',{name:turns===0?'Accept trade':'Decline',exact:true});await responseButton.waitFor();await action(other,responseButton);mark(`${engine} trade ${turns===0?'acceptance':'decline'} through UI`);
    }else{
     if(turns===2){await page.getByText('🤝 Offer a trade',{exact:true}).click();assert.equal(await page.getByRole('group',{name:'You give',exact:true}).getByLabel('Coins',{exact:true}).inputValue(),'0');mark(`${engine} trade form resets on returning turn`);}
     await action(actor,page.getByRole('button',{name:'Finish turn',exact:true}));
    }
    turns++;
   }
   if(engine==='chromium'){await a.page.getByRole('heading',{name:'Final scores'}).waitFor();const ended=await snapshot(a,code);assert.equal(ended.room.status,'finished');assert.equal(ended.room.round_state.round,10);const history=await admin.from('match_history').select('id').eq('room_id',row.id);assert.equal(history.data.length,2);mark('full two-player twenty-turn game entirely through controls records two results');await screenshot(a.page,engine,'results',a.page.getByRole('heading',{name:'Final scores'}),390);}
   await a.page.emulateMedia({reducedMotion:'reduce'});mark(`${engine} reduced-motion preference exercised`);
  }finally{report.closing.push({engine,at:Date.now()});await browser.close();}
 }
}finally{
 if(rooms.length)assert.ifError((await admin.from('rooms').delete().in('id',rooms)).error);for(const id of allUsers)assert.ifError((await admin.auth.admin.deleteUser(id)).error);save();
}
report.navigationCancellations=report.pageErrors.filter(e=>report.networkFailures.some(f=>f.engine===e.engine&&f.person===e.person&&f.error==='cancelled'&&e.message.includes(f.path)&&Math.abs(f.at-e.at)<1500)&&(report.navigations.some(n=>n.engine===e.engine&&n.person===e.person&&Math.abs(n.at-e.at)<1500)||report.closing.some(c=>c.engine===e.engine&&e.at>=c.at)));
report.unexplainedErrors=report.pageErrors.filter(e=>!report.navigationCancellations.includes(e));save();
console.log(JSON.stringify({checks:report.checks.length,issues:report.issues.length,pageErrors:report.pageErrors.length,navigationCancellations:report.navigationCancellations.length,axeViolations:report.axe.flatMap(r=>r.violations).length}));
if(report.issues.length||report.unexplainedErrors.length||report.axe.some(r=>r.violations.length))process.exitCode=1;
