import './dom-environment';
import React, { act } from 'react';
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup, type RenderResult } from '@testing-library/react';
import QuizPlay from '../src/components/room/QuizPlay';
import ChainPlay from '../src/components/room/ChainPlay';
import MemoryPlay from '../src/components/room/MemoryPlay';
import type { RoomBundle } from '../src/components/room/RoomClient';

afterEach(cleanup);

function bundle(type: string): RoomBundle {
  return {
    room: { id:'r', code:'AUDIT1', status:'playing', current_round:0, total_rounds:3, round_phase:'answering', mode:'classic', answer_seconds:5, turn_player_id:'a', round_state:{deadline:new Date(1000).toISOString()} },
    game:{ type, slug:type, config:{} },
    players:[{id:'a',profile_id:'a',display_name:'Alice',score:0},{id:'b',profile_id:'b',display_name:'Bob',score:0},{id:'c',profile_id:'c',display_name:'Cara',score:0}],
    answers:[], prompt:{ id:'p',content:{question:'Question?',options:['One','Two']} }, userId:'a', refresh:()=>{},
  } as unknown as RoomBundle;
}

for(const [name,Page,type] of [['Quiz',QuizPlay,'quiz'],['Chain',ChainPlay,'chain']] as const) {
  test(`${name} expiry recovers after a failed automatic request`, async(t)=>{
    let now=2000; let interval: (()=>void)|undefined; let requests=0; let payload: Record<string, unknown> = {};
    t.mock.method(Date,'now',()=>now);
    t.mock.method(globalThis,'setInterval',((callback:()=>void)=>{interval=callback;return 1;}) as never);
    t.mock.method(globalThis,'clearInterval',(()=>{}) as never);
    t.mock.method(globalThis,'fetch',async(_url: RequestInfo | URL, init?: RequestInit)=>{payload=JSON.parse(String(init?.body));requests++;if(requests===1)throw new Error('offline');return new Response('{}',{status:200,headers:{'Content-Type':'application/json'}});});
    let view!:RenderResult;
    await act(async()=>{view=render(<Page {...bundle(type)}/>);});
    assert.equal(requests,1);
    if (type === 'quiz') assert.equal(payload.revealOnly, true, 'expiry must never request advancement');
    assert.ok((view.container.textContent ?? '').includes('Retrying'));
    now=2500;
    await act(async()=>{interval!();});
    assert.equal(requests,2,'expiry retries rather than leaving the game stuck');
    now=3000;
    await act(async()=>{interval!();});
    assert.equal(requests,2,'successful expiry is not repeatedly submitted');
    act(()=>view.unmount());
  });
}

test('Memory miss does not replay on poll and cleared pair cannot leave board disabled',(t)=>{
  let scheduled=0;
  t.mock.method(globalThis,'setTimeout',(()=>{scheduled++;return 1;}) as never);
  t.mock.method(globalThis,'clearTimeout',(()=>{}) as never);
  const props=bundle('memory');
  props.room.round_state={cards:[{name:'Cat',emoji:'🐱',matched:false},{name:'Dog',emoji:'🐶',matched:false},{matched:false},{matched:false}],flipped:[],lastPair:{a:0,b:1,matched:false},moves:1};
  let view!:RenderResult;
  act(()=>{view=render(<MemoryPlay {...props}/>);});
  assert.ok(Array.from(view.container.querySelectorAll('button')).every(b=>b.disabled));
  const before=scheduled;
  act(()=>view.rerender(<MemoryPlay {...props} room={{...props.room,round_state:{...props.room.round_state,lastPair:{a:0,b:1,matched:false}}}}/>));
  assert.equal(scheduled,before,'unchanged pair values do not restart peek timer');
  act(()=>view.rerender(<MemoryPlay {...props} room={{...props.room,round_state:{...props.room.round_state,lastPair:null,flipped:[]}}}/>));
  assert.ok(Array.from(view.container.querySelectorAll('button')).every(b=>!b.disabled),'fresh pair clears stale peek');
  assert.ok(Array.from(view.container.querySelectorAll('button')).every(b=>String(b.getAttribute('aria-label')).startsWith('Face-down card')));
  act(()=>view.unmount());
});

test('Chain final review pauses entry and exposes acceptance without a repeated challenge',()=>{
  const props=bundle('chain');
  props.room.round_state={finalReview:true,turnIndex:3,challengedTurn:3,chain:[{word:'ocean',by:null},{word:'water',by:'b'}]};
  let view!:RenderResult;
  act(()=>{view=render(<ChainPlay {...props}/>);});
  assert.ok((view.container.textContent ?? '').includes('Accept & see results'));
  assert.ok(Array.from(view.container.querySelectorAll('input')).every(i=>i.disabled));
  assert.ok(!(view.container.textContent ?? '').includes('Challenge “'));
  act(()=>view.unmount());
});
