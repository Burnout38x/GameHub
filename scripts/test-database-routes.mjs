// Real HTTP/Auth/PostgREST tests. Only fixed local audit backend/app are accepted.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
const vars=Object.fromEntries(readFileSync('/private/tmp/gamehub-codex-audit-20261006/local.env','utf8').split('\n').flatMap((line)=>{const m=line.match(/^([A-Z_]+)="(.*)"$/);return m?[[m[1],m[2]]]:[]}));
assert.equal(vars.API_URL,'http://127.0.0.1:58321');
const app='http://127.0.0.1:3199';
const admin=createClient(vars.API_URL,vars.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const people=[];
for(let i=0;i<4;i++){
 const email=`gamehub-audit-${Date.now()}-${i}@example.test`, password=crypto.randomUUID()+'Audit1!';
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{username:`audit_${Date.now()}_${i}`}});
 if(created.error) throw created.error;
 const jar=new Map();
 const client=createServerClient(vars.API_URL,vars.ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:(cookies)=>cookies.forEach(({name,value})=>jar.set(name,value))}});
 const signed=await client.auth.signInWithPassword({email,password}); if(signed.error) throw signed.error;
 people.push({id:created.data.user.id,client,cookie:()=>[...jar].map(([k,v])=>`${k}=${v}`).join('; ')});
}
const [host,partner,third,fourth]=people;
async function request(person,path,body){
 const res=await fetch(app+path,{method:body===undefined?'GET':'POST',headers:{cookie:person.cookie(),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const data=await res.json();return {status:res.status,data};
}
async function ok(person,path,body){const result=await request(person,path,body);assert.equal(result.status,200,`${path}: ${JSON.stringify(result.data)}`);return result.data;}
const snap=(person,code)=>ok(person,`/api/rooms/${code}`);
const roundActions=new Set(['answer','guess','memory','crack','predict','rule','chain']);
const act=async(person,code,action,body={})=>ok(person,`/api/rooms/${code}/${action}`,roundActions.has(action)?{fromRound:(await snap(person,code)).room.current_round,...body}:body);
const current=(bundle)=>people.find((p)=>p.id===bundle.room.turn_player_id);
const secret=async(code)=>{const b=await snap(host,code);const {data,error}=await admin.from('room_secrets').select('secret').eq('room_id',b.room.id).single();if(error)throw error;return data.secret;};
const {data:games,error}=await admin.from('games').select('*').order('sort_order');if(error)throw error;
const rooms=[];
async function create(game,count=2,rounds=1){
 const {code}=await ok(host,'/api/rooms',{gameId:game.id,totalRounds:rounds,difficulty:'easy'});rooms.push(code);
 for(const p of people.slice(1,count)) await act(p,code,'join');
 return code;
}
// Synthetic deterministic content isolates engine correctness from content-bank quality.
for(const game of games){
 if(['quiz','prompt','predict'].includes(game.type)){
  const content=game.type==='quiz'?{question:`Audit ${game.slug}`,options:['Correct','Wrong'],answer:'Correct'}:game.type==='predict'?{question:'Audit memory?',options:['Tea','Coffee']}:{text:'Audit reaction',choices:['Tea','Coffee']};
  const {error}=await admin.from('prompts').insert([1,2,3,4].map(()=>({game_id:game.id,difficulty:'easy',content})));if(error)throw error;
 }
 const code=await create(game,game.type==='chain'?3:2);
 await act(host,code,'start');
 let b=await snap(host,code);
 const gameAction={quiz:'answer',prompt:'answer',memory:'memory',guess:'guess',predict:'predict',code:'crack',rule:'rule',chain:'chain'}[game.type];
 for (const fromRound of [-1,1,undefined]) {
   const stale=await request(current(b),`/api/rooms/${code}/${gameAction}`,{fromRound});
   assert.equal(stale.status,409,`${game.slug} stale/unspecified round`);
   assert.ok(stale.data.error.includes('round has changed'),`${game.slug} round guard message`);
 }
 assert.deepEqual((await snap(host,code)).room,b.room,`${game.slug} stale request cannot mutate room`);
 if(['quiz','prompt','predict'].includes(game.type)){
  for(let round=0;round<b.room.total_rounds;round++){
   b=await snap(host,code);
   if(game.type==='quiz'){
    assert.equal(b.prompt.content.answer,undefined);
    const {data:p}=await admin.from('prompts').select('content').eq('id',b.prompt.id).single();
    const invalid=await request(host,`/api/rooms/${code}/answer`,{answer:'fabricated',fromRound:round});assert.equal(invalid.status,400);
    await Promise.all([host,partner].map(pers=>act(pers,code,'answer',{answer:p.content.answer})));
   }else if(game.type==='prompt'){
    const turnBased=['truth-or-dare','two-minute-challenge'].includes(game.slug);
    if(game.config.timerSeconds){
     await act(current(b),code,'timer',{action:'start',fromRound:round});
     assert.equal(typeof (await snap(partner,code)).room.round_state.challengeDeadline,'string');
     const denied=await request(people.find(p=>p.id!==b.room.turn_player_id),`/api/rooms/${code}/timer`,{action:'reset',fromRound:round});assert.equal(denied.status,403);
    }
    const choice=game.config.optionsFromContent?b.prompt.content.choices[0]:game.config.choices[0];
    await Promise.all((turnBased?[current(b)]:[host,partner]).map(p=>act(p,code,'answer',{answer:choice})));
   }else if(game.config.freeText){
    await act(host,code,'predict',{answer:'Tea'});
    const hidden=await snap(partner,code);assert.deepEqual(hidden.answers.find(a=>a.profile_id===host.id).answer,{});
    await act(partner,code,'predict',{answer:'Tea'});
   }else{
    const subject=current(b),guesser=people.find(p=>p.id!==subject.id);
    await act(subject,code,'predict',{answer:b.prompt.content.options[0]});
    await act(guesser,code,'predict',{answer:b.prompt.content.options[0]});
   }
   const revealed=await snap(host,code);assert.equal(revealed.room.round_phase,'revealed');
   await act(host,code,'advance',{fromRound:round});
  }
 }else if(game.type==='memory'){
  const deck=(await secret(code)).cards;assert.ok(b.room.round_state.cards.every(c=>!c.name&&!c.emoji));
  const pairs=new Map();deck.forEach((c,i)=>pairs.set(c.name,[...(pairs.get(c.name)??[]),i]));
  for(const pair of pairs.values()){b=await snap(host,code);const p=current(b);await act(p,code,'memory',{index:pair[0]});await act(p,code,'memory',{index:pair[1]});}
 }else if(game.type==='guess') await act(current(b),code,'guess',{value:(await secret(code)).value});
 else if(game.type==='code') await act(current(b),code,'crack',{guess:(await secret(code)).code.join('')});
 else if(game.type==='rule'){assert.equal(b.room.round_state.usedRuleIds,undefined);await act(current(b),code,'rule',{guessId:(await secret(code)).ruleId});}
 else if(game.type==='chain'){
  const invalid=await request(current(b),`/api/rooms/${code}/chain`,{word:'123',fromRound:b.room.current_round});assert.equal(invalid.status,400);
  await act(current(b),code,'chain',{word:'water'});b=await snap(host,code);assert.equal(b.room.round_state.finalReview,true);await act(current(b),code,'chain',{accept:true});
 }
 const end=await snap(host,code);assert.equal(end.room.status,'finished',game.slug);assert.ok(end.room.winner_ids.length>0);
 const expected = game.type==='quiz' || ['never-have-i-ever','would-you-rather'].includes(game.slug) ? [1,1] : game.type==='predict' ? (game.config.freeText ? [2,2] : [1,1]) : game.type==='memory' ? [0,end.room.total_rounds] : game.type==='guess'||game.type==='code' ? [0,10] : game.type==='rule' ? [0,5] : game.type==='chain' ? [0,0,1] : [0,1];
 assert.deepEqual(end.players.map(p=>p.score).sort((a,b)=>a-b),expected,`${game.slug} scores`);
 const {count}=await admin.from('match_history').select('id',{head:true,count:'exact'}).eq('room_id',end.room.id);assert.equal(count,end.players.length);
 console.log(`PASS ${game.slug}: create/join/start/play/score/finish/history`);
}
// Concurrency: simultaneous partners compete for the one remaining two-player seat.
const predict=games.find(g=>g.slug==='know-your-partner');
const twoCode=await create(predict,1);
const joined=await Promise.all([partner,third].map(p=>request(p,`/api/rooms/${twoCode}/join`,{})));
assert.equal(joined.filter(r=>r.status===200).length,1);assert.equal((await snap(host,twoCode)).players.length,2);
console.log('PASS concurrent join enforces two-player capacity');
// Three-person active leave transfers host and excludes departed answers.
const quiz=games.find(g=>g.slug==='riddle-rush'), leaveCode=await create(quiz,3);
await act(host,leaveCode,'start');let b=await snap(host,leaveCode);
await act(host,leaveCode,'answer',{answer:b.prompt.content.options[0]});await act(partner,leaveCode,'answer',{answer:b.prompt.content.options[0]});
await act(host,leaveCode,'leave');b=await snap(partner,leaveCode);assert.equal(b.room.host_id,partner.id);assert.equal(b.room.round_phase,'answering');
await act(third,leaveCode,'answer',{answer:b.prompt.content.options[0]});await act(partner,leaveCode,'advance',{fromRound:0});
const rematch=await ok(partner,'/api/rooms',{gameId:quiz.id,totalRounds:1,rematchOf:b.room.id});await act(third,rematch.code,'join');
console.log('PASS host leave transfers ownership, excludes departed answers, finishes and rematches');
// Four-player challenge votes must merge, and the same link cannot be challenged again.
const chain=games.find(g=>g.type==='chain'), chCode=await create(chain,4,3);
await act(host,chCode,'start');await act(host,chCode,'chain',{word:'water'});await act(partner,chCode,'chain',{challenge:true});
await Promise.all([third,fourth].map(p=>act(p,chCode,'chain',{vote:'strong'})));
b=await snap(host,chCode);assert.equal(b.room.round_state.challenge,null);
assert.equal((await request(partner,`/api/rooms/${chCode}/chain`,{challenge:true,fromRound:b.room.current_round})).status,409);
console.log('PASS concurrent challenge votes merge and repeat challenge is rejected');
const leaveVoteCode=await create(chain,3,3);await act(host,leaveVoteCode,'start');await act(host,leaveVoteCode,'chain',{word:'water'});await act(partner,leaveVoteCode,'chain',{challenge:true});await act(third,leaveVoteCode,'leave');
b=await snap(host,leaveVoteCode);assert.equal(b.room.round_state.challenge,null);await act(partner,leaveVoteCode,'chain',{word:'oceanic'});
console.log('PASS departing sole challenge voter cannot strand the game');
// Legacy memory rooms must retain their complete deck when the first pair is resolved.
const memory=games.find(g=>g.type==='memory'), legacyCode=await create(memory,2,4);
await act(host,legacyCode,'start');b=await snap(host,legacyCode);let deck=(await secret(legacyCode)).cards;
await admin.from('rooms').update({round_state:{...b.room.round_state,cards:deck}}).eq('id',b.room.id);
await admin.from('room_secrets').delete().eq('room_id',b.room.id);
const pairs=new Map();deck.forEach((c,i)=>pairs.set(c.name,[...(pairs.get(c.name)??[]),i]));
for(const pair of pairs.values()){await act(host,legacyCode,'memory',{index:pair[0]});await act(host,legacyCode,'memory',{index:pair[1]});}
assert.equal((await snap(host,legacyCode)).room.status,'finished');
console.log('PASS legacy memory deck is preserved across every pair');
const remembers=games.find(g=>g.slug==='who-remembers'), emojiCode=await create(remembers,2,2);
await act(host,emojiCode,'start');await act(host,emojiCode,'predict',{answer:'🥰'});await act(partner,emojiCode,'predict',{answer:'😭'});
b=await snap(host,emojiCode);assert.equal(b.room.round_state.stage,'decide');assert.ok(b.players.every(p=>p.score===0));
await act(current(b),emojiCode,'predict',{decision:'different'});
console.log('PASS distinct emoji memories require adjudication and do not auto-score');
const finalCode=await create(chain,3,1);await act(host,finalCode,'start');await act(host,finalCode,'chain',{word:'water'});await act(partner,finalCode,'chain',{challenge:true});await act(third,finalCode,'chain',{vote:'weak'});
b=await snap(host,finalCode);assert.equal(b.room.status,'finished');assert.equal(b.players.find(p=>p.profile_id===host.id).score,0);assert.equal(b.players.find(p=>p.profile_id===partner.id).score,1);
console.log('PASS final Word Chain link is challengeable before results finalize');
assert.equal((await request(fourth,`/api/rooms/${finalCode}`)).status,403);
console.log('PASS unrelated signed-in user cannot read private playing or finished room');
const staleCode=await create(quiz,2,2);await act(host,staleCode,'start');
b=await snap(host,staleCode);const oldRound=b.room.current_round;
await act(host,staleCode,'answer',{answer:b.prompt.content.options[0]});await act(partner,staleCode,'answer',{answer:b.prompt.content.options[0]});await act(host,staleCode,'advance',{fromRound:oldRound});
const beforeStale=await snap(host,staleCode);assert.equal(beforeStale.room.current_round,oldRound+1);
const stale=await request(host,`/api/rooms/${staleCode}/answer`,{answer:beforeStale.prompt.content.options[0],fromRound:oldRound});assert.equal(stale.status,409);
const afterStale=await snap(host,staleCode);assert.deepEqual(afterStale.answers,[]);assert.deepEqual(afterStale.players,beforeStale.players);
console.log('PASS a delayed prior-round answer cannot answer or score the next round');
console.log(`Route integration complete: ${games.length} games and 9 additional lifecycle/concurrency flows passed`);
