// Authenticated responsive QA uses disposable identities and the isolated local DB only.
import { chromium, webkit } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const app=process.env.QA_RESPONSIVE === '1' ? 'http://127.0.0.1:3202' : 'http://127.0.0.1:3199';
const artifact=process.env.QA_WEBKIT === '1' ? 'responsive-private-webkit' : process.env.QA_RESPONSIVE === '1' ? 'responsive-private-final' : 'responsive-private';
const vars=Object.fromEntries([...readFileSync('/private/tmp/gamehub-codex-audit-20261006/local.env','utf8').matchAll(/^([A-Z_]+)="(.*)"$/gm)].map(m=>[m[1],m[2]]));
assert.equal(vars.API_URL,'http://127.0.0.1:58321');
const admin=createClient(vars.API_URL,vars.SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const browser=process.env.QA_WEBKIT === '1' ? await webkit.launch({headless:true,executablePath:'/Users/blaze/Library/Caches/ms-playwright/webkit-2359/pw_run.sh'}) : await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const sizes=process.env.QA_WEBKIT === '1' ? [[375,812],[820,1180],[844,390]] : [[320,568],[360,800],[390,844],[412,915],[344,882],[717,512],[844,390],[768,1024],[820,1180],[1024,768],[1440,900],[1920,1080]];
const report={checks:[],issues:[],errors:[],screenshots:[],networkFailures:[]},people=[],rooms=[];
const save=()=>writeFileSync(`.forge/${artifact}.json`,JSON.stringify(report,null,2));
async function person(index){
 const username='W'.repeat(22)+(process.env.QA_WEBKIT === '1'?'S':process.env.QA_RESPONSIVE === '1'?'F':'B')+index,email=`responsive-${Date.now()}-${index}@example.test`,password=crypto.randomUUID()+'Qa1!';
 const r=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{username}});assert.ifError(r.error);people.push({id:r.data.user.id});
 if(index===0)assert.ifError((await admin.from('profiles').update({role:'admin'}).eq('id',r.data.user.id)).error);
 const page=await(await browser.newContext({viewport:{width:390,height:844}})).newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.networkFailures.push({path:new URL(r.url()).pathname,error:r.failure()?.errorText}));
 await page.goto(app+'/login');if(process.env.QA_WEBKIT==='1'){const theme=await page.locator('html').getAttribute('data-theme');await page.getByRole('button',{name:/Switch to .* theme/}).click();await page.waitForFunction(previous=>document.documentElement.dataset.theme!==previous,theme);}await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Log in',exact:true}).click();await page.waitForURL('**/games',{waitUntil:'domcontentloaded'}).catch(async error=>{console.error('Login diagnostic',new URL(page.url()).pathname,await page.locator('main').innerText());throw error;});people[index].page=page;return people[index];
}
async function audit(page,label){
 for(const [width,height] of sizes){
  await page.setViewportSize({width,height});
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getTiming().iterations)).map(a=>a.finished.catch(()=>{})));});
  const result=await page.evaluate(()=>{
   const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>1&&r.height>1&&s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[aria-hidden="true"]')&&!e.classList.contains('sr-only')&&!e.classList.contains('skip-link');};
   const offending=[...document.querySelectorAll('main *,header *')].filter(visible).filter(e=>{const r=e.getBoundingClientRect();if(r.left>=-1&&r.right<=innerWidth+1)return false;for(let p=e.parentElement;p&&p!==document.body;p=p.parentElement){if(['auto','scroll'].includes(getComputedStyle(p).overflowX)&&p.scrollWidth>p.clientWidth)return false;}return true;}).slice(0,8).map(e=>({tag:e.tagName,class:e.className,text:e.textContent.slice(0,70),left:Math.round(e.getBoundingClientRect().left),right:Math.round(e.getBoundingClientRect().right)}));
   return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,offending,headerHeight:document.querySelector('header')?.getBoundingClientRect().height};
  });
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  const bottom=await page.evaluate(()=>({end:Math.ceil(scrollY+innerHeight),height:document.documentElement.scrollHeight}));
  const issues=[];if(result.scrollWidth>width+1)issues.push('document-overflow');if(result.offending.length)issues.push('outside-viewport');if(bottom.end<bottom.height-2)issues.push('cannot-scroll-to-bottom');
  if(issues.length){report.issues.push({label,width,height,issues,...result});if(report.screenshots.length<6){const path=`.forge/screenshots/${artifact}-${report.screenshots.length}.png`;await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path,fullPage:false});report.screenshots.push(path);}}
  report.checks.push({label,width,height,headerHeight:result.headerHeight});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  if(process.env.QA_RESPONSIVE==='1' && width===320 && ['/profile','play-rule-discoverer','play-code-crackers'].includes(label)){
   const path=`.forge/screenshots/${artifact}-${label.replaceAll('/','')}-phone.png`;await page.screenshot({path});report.screenshots.push(path);
  }
 }
 save();console.log('Checked '+label);
}
try{
 const a=await person(0),b=await person(1);
 for(const route of ['/games','/rooms','/rooms/new','/rooms/join','/profile','/friends','/leaderboard','/report','/admin','/admin/users','/admin/games','/admin/prompts','/admin/reports','/admin/reports/inbox']){
  await a.page.goto(app+route);await a.page.locator('main h1').waitFor();
  if(route==='/profile')await a.page.getByLabel('Games to play each week').waitFor();
  if(route==='/friends')await a.page.getByLabel('Show when I’m online').waitFor();
  await audit(a.page,route);
 }
 if(process.env.QA_RESPONSIVE==='1'){
  for(const width of [320,768]){
   await a.page.setViewportSize({width,height:800});await a.page.goto(app+'/friends#invitations');await a.page.getByLabel('Show when I’m online').waitFor();
   await a.page.locator('#invitations').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
   const position=await a.page.evaluate(()=>({top:document.querySelector('#invitations').getBoundingClientRect().top,header:Math.max(0,document.querySelector('header').getBoundingClientRect().bottom)}));
   assert(position.top>=position.header-1,JSON.stringify(position));report.checks.push({label:'invitation-anchor-clear',width});
  }
 }
 const games=await admin.from('games').select('*').eq('is_active',true).order('sort_order');assert.ifError(games.error);
 for(const game of games.data){
  const cr=await a.page.request.post(app+'/api/rooms',{data:{gameId:game.id,totalRounds:2,difficulty:game.type==='code'?'hard':'easy'}});assert(cr.ok(),await cr.text());const{code}=await cr.json();
  const row=await admin.from('rooms').select('id').eq('code',code).single();assert.ifError(row.error);rooms.push(row.data.id);
  assert((await b.page.request.post(`${app}/api/rooms/${code}/join`,{data:{}})).ok());
  if(game.slug==='doctor-dash'){await a.page.goto(app+'/room/'+code);await a.page.getByRole('button',{name:'Start with 2 players',exact:true}).waitFor();await audit(a.page,'room-lobby-long-usernames');}
  const start=await a.page.request.post(`${app}/api/rooms/${code}/start`,{data:{}});assert(start.ok(),await start.text());
  await a.page.goto(app+'/room/'+code);await a.page.getByRole('progressbar',{name:'Game progress'}).waitFor();await audit(a.page,'play-'+game.slug);
  if(game.slug==='doctor-dash'){assert.ifError((await admin.rpc('finish_room_game',{target_room_id:row.data.id})).error);await a.page.reload();await a.page.getByRole('heading',{name:'Final scores'}).waitFor();await audit(a.page,'final-scores-long-usernames');}
 }
}finally{
 await browser.close();if(rooms.length)assert.ifError((await admin.from('rooms').delete().in('id',rooms)).error);for(const p of people)assert.ifError((await admin.auth.admin.deleteUser(p.id)).error);save();
}
report.navigationCancellations=report.errors.filter(error=>report.networkFailures.some(failure=>failure.error==='cancelled'&&error.includes(failure.path)));
report.unexplainedErrors=report.errors.filter(error=>!report.navigationCancellations.includes(error));
save();
console.log(JSON.stringify({checks:report.checks.length,issues:report.issues.length,errors:report.errors.length,navigationCancellations:report.navigationCancellations.length}));
if(report.issues.length || report.unexplainedErrors.length)process.exitCode=1;
