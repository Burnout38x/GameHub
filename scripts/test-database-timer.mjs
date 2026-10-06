/** Real concurrent timer regression against the isolated audit stack only. */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
const vars=Object.fromEntries(readFileSync('/private/tmp/gamehub-codex-audit-20261006/local.env','utf8').split('\n').flatMap(line=>{const m=line.match(/^([A-Z_]+)="(.*)"$/);return m?[[m[1],m[2]]]:[]}));
assert.equal(vars.API_URL,'http://127.0.0.1:58321');
const admin=createClient(vars.API_URL,vars.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const people=[];
for(let i=0;i<2;i++){
 const stamp=Date.now(),email=`timer-${stamp}-${i}@example.test`,password=crypto.randomUUID()+'aA1!';
 const {error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{username:`timer_${stamp}_${i}`}});if(error)throw error;
 const jar=new Map();const client=createServerClient(vars.API_URL,vars.ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:c=>c.forEach(({name,value})=>jar.set(name,value))}});
 const signed=await client.auth.signInWithPassword({email,password});if(signed.error)throw signed.error;
 people.push(()=>[...jar].map(([k,v])=>`${k}=${v}`).join('; '));
}
async function req(i,path,body){
 const response=await fetch('http://127.0.0.1:3199'+path,{method:body===undefined?'GET':'POST',headers:{cookie:people[i](),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {status:response.status,data:await response.json()};
}
async function ok(i,path,body){const r=await req(i,path,body);assert.equal(r.status,200,JSON.stringify(r.data));return r.data;}
const {data:game,error}=await admin.from('games').select('id').eq('slug','riddle-rush').single();if(error)throw error;
await admin.from('prompts').insert({game_id:game.id,difficulty:'easy',content:{question:'Timer regression',options:['Yes','No'],answer:'Yes'}});
for(const rounds of [1,2]){
 const {code}=await ok(0,'/api/rooms',{gameId:game.id,totalRounds:rounds,answerSeconds:5,difficulty:'easy'});
 const path=`/api/rooms/${code}`;
 await ok(1,path+'/join',{});await ok(0,path+'/start',{});
 let b=await ok(0,path);
 assert.equal((await req(0,path+'/advance',{revealOnly:true})).status,409,'missing round denied');
 assert.equal((await req(0,path+'/advance',{fromRound:0,revealOnly:true})).status,409,'early reveal denied');
 const changed=await admin.from('rooms').update({round_state:{...b.room.round_state,deadline:new Date(Date.now()-1000).toISOString()}}).eq('id',b.room.id);if(changed.error)throw changed.error;
 await Promise.all([0,1].map(i=>ok(i,path+'/advance',{fromRound:0,revealOnly:true})));
 b=await ok(0,path);
 assert.equal(b.room.status,'playing','concurrent expiry must not finish');
 assert.equal(b.room.round_phase,'revealed');assert.equal(b.room.current_round,0,'concurrent expiry must not advance');
 const {count}=await admin.from('match_history').select('id',{head:true,count:'exact'}).eq('room_id',b.room.id);assert.equal(count,0);
 assert.equal((await req(0,path+'/advance',{fromRound:-1,revealOnly:true})).status,409,'round guard precedes revealed no-op');
 await ok(0,path+'/advance',{fromRound:0,revealOnly:true});
 assert.equal((await ok(1,path)).room.current_round,0,'repeated expiry remains a no-op');
 await ok(1,path+'/advance',{fromRound:0});
 b=await ok(0,path);
 if(rounds===1)assert.equal(b.room.status,'finished');else{assert.equal(b.room.status,'playing');assert.equal(b.room.current_round,1);assert.equal(b.room.round_phase,'answering');}
 console.log(`PASS ${rounds}-round quiz: two simultaneous expiry calls reveal only; manual ${rounds===1?'Finish':'Next'} performs transition`);
}
console.log('Timer concurrency regression: 2 real multi-client scenarios passed');
