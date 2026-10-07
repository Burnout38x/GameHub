'use client';
import {useEffect,useRef,useState} from 'react';
import MarketPlay from '@/components/room/MarketPlay';
import {applyMarketDay,createMarketDay,type MarketState} from '@/lib/market-day';
import type {RoomBundle} from '@/components/room/RoomClient';
function initial(){const s=createMarketDay(['a','b','c','d'],4);s.stalls[0]={ownerId:'a',level:1};s.stalls[1]={ownerId:'b',level:2};s.stalls[4]={ownerId:'c',level:1};s.stalls[8]={ownerId:'d',level:1};return s;}
export default function Preview(){const [state,setState]=useState(initial);const ref=useRef(state);ref.current=state;
useEffect(()=>{const original=window.fetch;window.fetch=async(input,init)=>{if(String(input).includes('/api/rooms/AUTHOR/market')){try{const next=applyMarketDay(ref.current,ref.current.players[ref.current.turnIndex].id,JSON.parse(String(init?.body)));ref.current=next;setState(next);return Response.json({ok:true});}catch(e){return Response.json({error:String(e)},{status:400});}}return original(input,init);};return()=>{window.fetch=original;};},[]);
const bundle={room:{code:'AUTHOR',round_state:state},players:state.players.map((p,i)=>({profile_id:p.id,display_name:['Rowan','Jules','Mika','Sam'][i]})),userId:state.players[state.turnIndex].id,refresh:()=>{},game:{},answers:[],prompt:null} as unknown as RoomBundle;
return <main style={{maxWidth:1080,margin:'0 auto',padding:'16px'}}><div style={{padding:'12px',border:'2px dashed #ac7638',marginBottom:16}}><strong>AUTHOR VISUAL SIMULATION · no HTTP/database evidence</strong><div><button onClick={()=>setState(initial())}>Reset preview</button> · <button onClick={()=>{const s=initial();s.phase='finished';s.round=10;s.players[0].reputation=14;s.players[0].commissions=3;s.stalls[3]={ownerId:'a',level:2};setState(s);}}>Show final fixture</button> · <button onClick={()=>{const s=initial();s.players.forEach(p=>p.position=1);s.phase='business';setState(s);}}>Show crowded fixture</button></div></div><MarketPlay {...bundle}/></main>;
}
