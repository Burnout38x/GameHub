import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMarketDay, createMarketDay, marketDestinations, marketScores, MARKET_BOARD, type MarketState } from '../src/lib/market-day';
const command = (state: MarketState, type: string, extra: Record<string, unknown> = {}, actor = state.players[state.turnIndex].id) => applyMarketDay(state, actor, { expectedVersion: state.version, type, ...extra });
function business(state = createMarketDay(['a', 'b'])) { return command(state, 'move', { destination: marketDestinations(state)[0] }); }
function trade() { return command(business(), 'pass'); }
const coins = (cash: number) => ({ cash, supplies: 0, stall: null });
const supplies = (amount: number) => ({ cash: 0, supplies: amount, stall: null });

test('Market Day starts deterministic, distinct 2–4 player games', () => {
  assert.deepEqual(createMarketDay(['a', 'b'], 42), createMarketDay(['a', 'b'], 42));
  for (const ids of [[], ['a'], ['a','a'], ['a','b','c','d','e'], ['a','']]) assert.throws(() => createMarketDay(ids));
  assert.throws(() => createMarketDay(['a','b'], NaN));
  const state = createMarketDay(['a','b','c','d']);
  assert.equal(state.stalls.length, 12);
  assert.equal(new Set(marketDestinations(state)).size, 3);
});

test('version, member, turn, phase and destination guards leave state unchanged', () => {
  const state = createMarketDay(['a','b']); const before = JSON.stringify(state);
  for (const payload of [null, [], {}, { expectedVersion: 1, type:'move' }, { expectedVersion:0,type:'buy' }, {expectedVersion:0,type:'move',destination:99}, {expectedVersion:0,type:'move',destination:'1'}]) assert.throws(() => applyMarketDay(state,'a',payload));
  assert.throws(() => command(state,'move',{destination:1},'b'));
  assert.throws(() => command(state,'move',{destination:1},'outsider'));
  const next = command(state,'move',{destination:marketDestinations(state)[0]});
  assert.throws(() => applyMarketDay(next,'a',{expectedVersion:0,type:'move',destination:marketDestinations(state)[0]}));
  assert.equal(JSON.stringify(state),before);
  assert.throws(() => command(next,'move',{destination:2}));
});

test('purchases, upgrades and visits obey ownership and affordable non-elimination payments', () => {
  const moved = business(); const index = moved.players[0].position;
  const bought = command(moved,'buy');
  assert.equal(bought.stalls[index].ownerId,'a');
  assert.equal(bought.players[0].cash,12-MARKET_BOARD[index].price);
  assert.throws(() => command(bought,'buy'));
  const ownVisit = structuredClone(bought); ownVisit.phase='business';
  const upgraded = command(ownVisit,'upgrade');
  assert.equal(upgraded.stalls[index].level,2);
  const max = structuredClone(upgraded); max.phase='business'; max.stalls[index].level=3;
  assert.throws(() => command(max,'upgrade'));
  const poor = business(); poor.players[0].cash=0;
  assert.throws(() => command(poor,'buy'));
  assert.throws(() => command(poor,'upgrade'));
  const visit = createMarketDay(['a','b']); const destination=marketDestinations(visit)[0];
  visit.stalls[destination]={ownerId:'b',level:3}; visit.players[0].cash=1;
  const paid=command(visit,'move',{destination});
  assert.equal(paid.players[0].cash,0); assert.equal(paid.players[1].cash,13);
  assert.equal(paid.phase,'business'); assert.equal(paid.players.length,2);
});

test('supplies, commissions and independent bank exchange have exact economics and capacity limits', () => {
  const supplied=command(business(),'supplies'); assert.equal(supplied.players[0].cash,9); assert.equal(supplied.players[0].supplies,5);
  const ready=structuredClone(supplied); ready.phase='business';
  const fulfilled=command(ready,'commission');
  assert.deepEqual(fulfilled.players[0],{id:'a',position:1,cash:14,supplies:2,reputation:2,commissions:1});
  assert.equal(marketScores(fulfilled).a,9);
  const bank=command(business(),'bank'); assert.equal(bank.players[0].cash,16); assert.equal(bank.players[0].supplies,0);
  assert.throws(() => command(business(),'commission'));
  const full=business(); full.players[0].supplies=10; assert.throws(() => command(full,'supplies'));
  const wealthy=business(); wealthy.players[0].cash=96; assert.throws(() => command(wealthy,'bank'));
});

test('accepted bounded trades conserve assets, transfer stalls and cannot be replayed', () => {
  const ready=trade(); ready.stalls[0]={ownerId:'a',level:2};
  const offered=command(ready,'offer',{toId:'b',give:{cash:0,supplies:1,stall:0},receive:coins(4)});
  assert.throws(() => command(offered,'accept',{},'a'));
  assert.throws(() => command(offered,'offer',{toId:'b',give:coins(1),receive:supplies(1)}));
  const totalCoins=offered.players.reduce((sum,p)=>sum+p.cash,0);
  const accepted=command(offered,'accept',{},'b');
  assert.equal(accepted.stalls[0].ownerId,'b'); assert.equal(accepted.stalls[0].level,2);
  assert.equal(accepted.players[0].cash,16); assert.equal(accepted.players[1].cash,8);
  assert.equal(accepted.players[0].supplies,1); assert.equal(accepted.players[1].supplies,3);
  assert.equal(accepted.players.reduce((sum,p)=>sum+p.cash,0),totalCoins);
  assert.equal(accepted.turnIndex,1); assert.equal(accepted.phase,'move'); assert.equal(accepted.offer,null);
  assert.throws(() => applyMarketDay(accepted,'b',{type:'accept',expectedVersion:offered.version}));
  assert.throws(() => command(accepted,'accept',{},'b'));
});

test('trade refusals and sender expiry do not transfer anything or require cooperation', () => {
  for (const response of ['decline','end']) {
    const offered=command(trade(),'offer',{toId:'b',give:coins(3),receive:supplies(1)});
    const after=command(offered,response,{},response==='decline'?'b':'a');
    assert.deepEqual(after.players,offered.players); assert.equal(after.offer,null); assert.equal(after.turnIndex,1);
  }
});

test('malformed, empty, unaffordable, foreign-owned and overflowing trades are rejected atomically', () => {
  const ready=trade(); const before=JSON.stringify(ready);
  for (const give of [null,{},coins(-1),coins(21),coins(1.5),coins(NaN),{cash:0,supplies:7,stall:null},{cash:0,supplies:0,stall:12},{cash:0,supplies:0,stall:'1'},coins(0),coins(13),{cash:0,supplies:0,stall:0}]) assert.throws(() => command(ready,'offer',{toId:'b',give,receive:coins(1)}));
  for (const toId of ['a','stranger',null]) assert.throws(() => command(ready,'offer',{toId,give:coins(1),receive:supplies(1)}));
  assert.equal(JSON.stringify(ready),before);
  const offered=command(ready,'offer',{toId:'b',give:coins(2),receive:supplies(1)});
  const staleOwnership=structuredClone(offered); staleOwnership.players[1].supplies=0;
  assert.throws(() => command(staleOwnership,'accept',{},'b'));
  const overflow=structuredClone(offered); overflow.players[1].cash=99;
  assert.throws(() => command(overflow,'accept',{},'b'));
  const stalled=structuredClone(offered); stalled.offer!.give.stall=0; stalled.stalls[0]={ownerId:'b',level:1};
  assert.throws(() => command(stalled,'accept',{},'b'));
});

test('cash contributes at most ten score points and all score components are visible', () => {
  const state=createMarketDay(['a','b']); state.players[0].cash=99; state.players[0].reputation=7; state.players[0].commissions=3; state.stalls[0]={ownerId:'a',level:3};
  assert.equal(marketScores(state).a,32); state.players[0].cash=30; assert.equal(marketScores(state).a,32);
});

for (const count of [2,4]) test(`full ${count}-player games finish in exactly ten rounds and stay bounded across seeds`, () => {
  for (let seed=0;seed<32;seed++) {
    let state=createMarketDay(Array.from({length:count},(_,i)=>`p${i}`),seed); let turns=0;
    while (state.phase!=='finished') {
      const player=state.players[state.turnIndex];
      state=command(state,'move',{destination:marketDestinations(state)[turns%3]});
      const now=state.players[state.turnIndex]; const stall=state.stalls[now.position];
      const action=!stall.ownerId && now.cash>=MARKET_BOARD[now.position].price?'buy':now.supplies>=3?'commission':now.cash>=3&&now.supplies<=9?'supplies':'pass';
      state=command(state,action); state=command(state,'end'); turns++;
      for (const p of state.players) { assert.ok(p.cash>=0&&p.cash<=99); assert.ok(p.supplies>=0&&p.supplies<=12); }
      assert.ok(state.round<=10); assert.ok(turns<=10*count); assert.ok(state.log.length<=50);
      assert.equal(state.players.find(p=>p.id===player.id)?.id,player.id);
    }
    assert.equal(turns,10*count); assert.equal(state.round,10); assert.equal(state.version,30*count);
    assert.ok(Object.values(marketScores(state)).every(score=>Number.isSafeInteger(score)&&score>=0&&score<300));
    assert.throws(()=>command(state,'end'));
    assert.deepEqual(JSON.parse(JSON.stringify(state)),state);
  }
});
