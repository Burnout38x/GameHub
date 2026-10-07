import test from 'node:test';
import assert from 'node:assert/strict';
import {applyMarketDay,createMarketDay,marketDestinations,marketScores,marketScoreBreakdown,marketContractReason,marketOutcome,MARKET_BOARD,type MarketState} from '../src/lib/market-day';
const act=(s:MarketState,type:string,extra:Record<string,unknown>={},id=s.players[s.turnIndex].id)=>applyMarketDay(s,id,{expectedVersion:s.version,type,...extra});
const fixture=()=>{const s=createMarketDay(['a','b']);s.phase='business';s.stalls[0]={ownerId:'a',level:1};return s;};
test('public order requires membership, active turn, location, ownership, resources and is consumed atomically',()=>{
  const s=fixture(),id=s.contracts![0].id,before=structuredClone(s);
  assert.throws(()=>act(s,'commission',{contractId:id},'outsider'));assert.throws(()=>act(s,'commission',{contractId:id},'b'));
  for(const change of [(x:MarketState)=>{x.players[0].position=1;},(x:MarketState)=>{x.stalls[0].ownerId=null;},(x:MarketState)=>{x.players[0].supplies=1;},(x:MarketState)=>{x.players[0].cash=1;}]){const x=structuredClone(s);change(x);assert.throws(()=>act(x,'commission',{contractId:id}));}
  assert.throws(()=>act(s,'commission'));const claimed=act(s,'commission',{contractId:id});assert.equal(claimed.contracts![0].claimedBy,'a');assert.equal(claimed.players[0].cash,10);assert.equal(claimed.players[0].supplies,0);assert.equal(claimed.players[0].reputation+claimed.players[0].commissions*3,5);assert.deepEqual(s,before);
  claimed.phase='business';claimed.turnIndex=1;claimed.stalls[3]={ownerId:'b',level:1};claimed.players[1].position=3;
  assert.throws(()=>act(claimed,'commission',{contractId:id}),/Already claimed/);
});
test('scarce wholesale stock and upgrades spend resources; closing round replenishes stock',()=>{
  let s=createMarketDay(['a','b']);s=act(s,'move',{destination:marketDestinations(s)[0]});s=act(s,'supplies');assert.equal(s.supplyStock,0);assert.equal(s.players[0].cash,8);assert.equal(s.players[0].supplies,4);
  s=act(s,'end');s=act(s,'move',{destination:marketDestinations(s)[0]});assert.throws(()=>act(s,'supplies'),/stock is empty/);s=act(act(s,'pass'),'end');assert.equal(s.supplyStock,2);
  const u=act(fixture(),'upgrade');assert.equal(u.players[0].supplies,1);assert.equal(u.players[0].cash,8);
});
test('reciprocal property trade completes both district sets and conserves assets',()=>{
  let s=fixture();s.phase='trade';s.stalls[1]={ownerId:'a',level:1};s.stalls[3]={ownerId:'b',level:1};s.stalls[4]={ownerId:'b',level:1};
  assert.equal(marketScoreBreakdown(s,'a').sets,0);assert.equal(marketScoreBreakdown(s,'b').sets,0);
  s=act(s,'offer',{toId:'b',give:{cash:0,supplies:0,stall:1},receive:{cash:0,supplies:0,stall:3}});s=act(s,'accept',{},'b');
  assert.equal(marketScoreBreakdown(s,'a').sets,3);assert.equal(marketScoreBreakdown(s,'b').sets,3);assert.equal(s.players.reduce((n,p)=>n+p.cash,0),24);
});
test('old unversioned rooms retain unlimited legacy commissions and original economics',()=>{
  let s=createMarketDay(['a','b'],1,1);assert.equal(s.rulesVersion,undefined);s.phase='business';s=act(s,'supplies');assert.equal(s.players[0].cash,9);assert.equal(s.players[0].supplies,5);s.phase='business';s=act(s,'commission');assert.equal(s.players[0].cash,14);assert.equal(s.players[0].commissions,1);
});
test('rotation grants exactly ten turns each, seasons replace consumed contracts and final ties share victory',()=>{
  for(const n of [2,3,4]){let s=createMarketDay(Array.from({length:n},(_,i)=>`${i}`),2);const turns=Array(n).fill(0);const starts:number[]=[];while(s.phase!=='finished'){if(s.roundTurn===0)starts.push(s.turnIndex);turns[s.turnIndex]++;s=act(s,'move',{destination:marketDestinations(s)[0]});s=act(act(s,'pass'),'end');if(s.phase!=='finished'&&s.roundTurn===0){assert.equal(s.contracts![0].id,`${s.round%2?s.round:s.round-1}-Sunrise`);}}assert.deepEqual(turns,Array(n).fill(10));assert.deepEqual(starts,Array.from({length:10},(_,i)=>i%n));assert.equal(marketOutcome(s).winnerIds.length,n);assert.throws(()=>act(s,'pass'),/finished/);}
});
type Policy='invest'|'orders'|'sets'|'spam';
function play(seed:number,policies:Policy[]){let s=createMarketDay(policies.map((_,i)=>`p${i}`),seed);while(s.phase!=='finished'){
 const p=s.players[s.turnIndex],policy=policies[s.turnIndex];
 function rank(dest:number){const candidate=structuredClone(s);candidate.players[s.turnIndex].position=dest;const owned=s.stalls[dest];const district=MARKET_BOARD[dest].district;const count=s.stalls.filter((o,i)=>o.ownerId===p.id&&MARKET_BOARD[i].district===district).length;const order=s.contracts!.find(c=>!marketContractReason(candidate,p.id,c));const buy=!owned.ownerId&&p.cash>=MARKET_BOARD[dest].price;return (policy==='orders'&&order?order.reward*5:0)+(buy?(policy==='sets'?10+count*12:policy==='invest'?25:10):0)+(owned.ownerId===p.id?3:0)-(owned.ownerId&&owned.ownerId!==p.id?owned.level:0);}
 const dest=marketDestinations(s).sort((a,b)=>rank(b)-rank(a))[0];s=act(s,'move',{destination:dest});const now=s.players[s.turnIndex],owned=s.stalls[dest];const order=s.contracts!.find(c=>!marketContractReason(s,now.id,c));
 let action='pass',extra:Record<string,unknown>={};
 if(policy==='spam'){if(order){action='commission';extra={contractId:order.id};}else if(now.supplies<=10&&now.cash>=4&&(s.supplyStock??0)>=2)action='supplies';}
 else if(order&&(policy==='orders'||s.round>=6)){action='commission';extra={contractId:order.id};}
 else if(!owned.ownerId&&now.cash>=MARKET_BOARD[dest].price)action='buy';
 else if(order){action='commission';extra={contractId:order.id};}
 else if(owned.ownerId===now.id&&owned.level<3&&now.cash>=4&&now.supplies>0)action='upgrade';
 else if(now.supplies<3&&now.cash>=4&&(s.supplyStock??0)>=2)action='supplies';
 s=act(act(s,action,extra),'end');for(const q of s.players){assert(q.cash>=0&&q.cash<=99);assert(q.supplies>=0&&q.supplies<=12);}
 }return marketScores(s);}
test('strategy tournament: finite orders break commission spam and multiple investment choices remain competitive',()=>{
 const totals:Record<Policy,number>={invest:0,orders:0,sets:0,spam:0},wins={...totals};const seats=[0,0,0,0];let matches=0;
 for(let seed=0;seed<48;seed++)for(let shift=0;shift<4;shift++){const base:Policy[]=['invest','orders','sets','spam'];const policies=base.map((_,i)=>base[(i+shift)%4]);const scores=play(seed,policies);const high=Math.max(...Object.values(scores));policies.forEach((p,i)=>{totals[p]+=scores[`p${i}`];if(scores[`p${i}`]===high){wins[p]++;seats[i]++;}});matches++;}
 console.log('MARKET_POLICY_EVIDENCE',JSON.stringify({matches,meanScores:Object.fromEntries(Object.entries(totals).map(([p,n])=>[p,Number((n/matches).toFixed(2))])),wins,seats}));
 assert.equal(wins.spam,0);assert(wins.orders>0);assert(wins.invest>0||wins.sets>0);
 const pairs:Record<string,Record<string,number>>={};
 for(const pair of [['orders','invest'],['sets','invest'],['sets','orders']] as Policy[][]){const results:Record<string,number>={[pair[0]]:0,[pair[1]]:0,ties:0};for(let seed=0;seed<48;seed++)for(const policies of [pair,[...pair].reverse()]){const scores=play(seed,policies);const high=Math.max(...Object.values(scores));assert(Object.values(scores).every(n=>n>=0));if(scores.p0===scores.p1)results.ties++;else results[policies[scores.p0===high?0:1]]++;}assert(results[pair[0]]>0&&results[pair[1]]>0,`Both ${pair.join(' and ')} must have winning seeds`);pairs[pair.join('/')]=results;}
 console.log('MARKET_TWO_PLAYER_EVIDENCE',JSON.stringify(pairs));
});
test('legal 2–4 player rounds allow earlier buyers to deny the last rival, then rotate refill access',()=>{
  for(const count of [2,3,4]){
    let s=createMarketDay(Array.from({length:count},(_,i)=>`p${i}`));
    assert.equal(s.supplyStock,2*(count-1));
    for(let seat=0;seat<count;seat++){
      assert.equal(s.turnIndex,seat);s=act(s,'move',{destination:marketDestinations(s)[0]});
      if(seat<count-1)s=act(s,'supplies');
      else {assert.equal(s.supplyStock,0);const before=structuredClone(s);assert.throws(()=>act(s,'supplies'),/stock is empty/);assert.deepEqual(s,before);s=act(s,'pass');}
      s=act(s,'end');
    }
    assert.equal(s.round,2);assert.equal(s.turnIndex,1);assert.equal(s.supplyStock,2*(count-1));
    s=act(s,'move',{destination:marketDestinations(s)[0]});s=act(s,'supplies');assert.equal(s.supplyStock,2*(count-2));
  }
});
