import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const app = 'http://127.0.0.1:3199';
const vars = Object.fromEntries([...readFileSync('/private/tmp/gamehub-codex-audit-20261006/local.env','utf8').matchAll(/^([A-Z_]+)="(.*)"$/gm)].map(m=>[m[1],m[2]]));
assert.equal(vars.API_URL,'http://127.0.0.1:58321');
const admin=createClient(vars.API_URL,vars.SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const users=[],rooms=[],checks=[],errors=[];
const mark=s=>{checks.push(s);console.log('PASS '+s);};
async function person(n){
 const username=`content${n}_${Date.now()}`,password=crypto.randomUUID()+'Q1!',email=username+'@example.test';
 const r=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{username}});assert.ifError(r.error);users.push(r.data.user.id);
 const page=await(await browser.newContext({viewport:{width:375,height:850}})).newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(app+'/login');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Log in',exact:true}).click();await page.waitForURL('**/games');return{page,id:r.data.user.id};
}
try{
 const a=await person(1),b=await person(2);
 const result=await admin.from('games').select('*').eq('slug','truth-or-dare-after-dark').single();assert.ifError(result.error);const game=result.data;
 await a.page.getByRole('searchbox').fill('After Dark');await a.page.getByText(game.name,{exact:true}).waitFor();mark('adult pack discoverable by game search');
 const created=await a.page.request.post(app+'/api/rooms',{data:{gameId:game.id,difficulty:'hard',totalRounds:3}});assert(created.ok());const{code}=await created.json();
 const rr=await admin.from('rooms').select('id').eq('code',code).single();assert.ifError(rr.error);rooms.push(rr.data.id);
 assert((await b.page.request.post(`${app}/api/rooms/${code}/join`,{data:{}})).ok());
 assert((await a.page.request.post(`${app}/api/rooms/${code}/start`,{data:{}})).ok());
 let bundle=await(await a.page.request.get(`${app}/api/rooms/${code}`)).json();assert.equal(bundle.room.total_rounds,4);mark('three requested rounds become four equal turns for two players');
 await a.page.goto(`${app}/room/${code}`);await a.page.getByText('18+ · Agree on boundaries. Only involve willing adults; you can always skip.',{exact:true}).waitFor();
 assert(await a.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));mark('adult label and skip boundary visible on mobile');
 for(let round=0;round<4;round++){
  bundle=await(await a.page.request.get(`${app}/api/rooms/${code}`)).json();const actor=bundle.room.turn_player_id===a.id?a:b,other=actor===a?b:a;
  assert(!(await other.page.request.post(`${app}/api/rooms/${code}/answer`,{data:{fromRound:round,answer:'Completed'}})).ok());
  assert((await actor.page.request.post(`${app}/api/rooms/${code}/answer`,{data:{fromRound:round,answer:round%2?'Skipped':'Completed'}})).ok());
  assert((await a.page.request.post(`${app}/api/rooms/${code}/advance`,{data:{fromRound:round}})).ok());
 }
 bundle=await(await a.page.request.get(`${app}/api/rooms/${code}`)).json();assert.equal(bundle.room.status,'finished');assert.equal(bundle.players.reduce((sum,p)=>sum+p.score,0),2);mark('active-player-only answers, skips, scores and completed game flow');
 const doctor=await admin.from('games').select('id').eq('slug','doctor-dash').single();assert.ifError(doctor.error);
 const questions=await admin.from('prompts').select('difficulty,content').eq('game_id',doctor.data.id).eq('content->>pack','2026-10-content-expansion');assert.ifError(questions.error);assert.equal(questions.data.length,30);assert(questions.data.every(p=>p.difficulty==='hard'&&p.content.options.includes(p.content.answer)));mark('all thirty new medical questions load in the hard pool');
 assert.deepEqual(errors,[]);
}finally{
 await browser.close();if(rooms.length)assert.ifError((await admin.from('rooms').delete().in('id',rooms)).error);for(const id of users)assert.ifError((await admin.auth.admin.deleteUser(id)).error);
 writeFileSync('.forge/content-expansion-browser.json',JSON.stringify({checks,errors},null,2));
}
