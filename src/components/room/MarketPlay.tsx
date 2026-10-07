'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { MARKET_BOARD, MARKET_ROUNDS, marketDestinations, marketScores, marketScoreBreakdown, marketOutcome, marketContractReason, marketForecast, type MarketAssets, type MarketCommand, type MarketState } from '@/lib/market-day';
import type { RoomBundle } from './RoomClient';
import { callRoomApi } from '@/lib/room-api';
import styles from './MarketPlay.module.css';

type Command = MarketCommand extends infer T ? T extends MarketCommand ? Omit<T, 'expectedVersion'> : never : never;
const colors = ['#ba422b', '#237b87', '#7754af', '#a36d0b'];
const spots = [[0,0],[1,0],[2,0],[3,0],[3,1],[3,2],[3,3],[2,3],[1,3],[0,3],[0,2],[0,1]];
const emptyAssets = (): MarketAssets => ({ cash: 0, supplies: 0, stall: null });
function describeAssets(assets: MarketAssets) { return [assets.cash ? `${assets.cash} coins` : '', assets.supplies ? `${assets.supplies} supplies` : '', assets.stall !== null ? MARKET_BOARD[assets.stall].name : ''].filter(Boolean).join(' + '); }
function Building({ index, level }: { index: number; level: number }) {
  return <svg className={styles.building} viewBox="0 0 80 64" aria-hidden="true"><ellipse cx="40" cy="58" rx="33" ry="5" fill="#182b3220"/><path d="M14 25H66V56H14Z" fill={['#f3cb86','#a9d6c2','#c5b4de'][index%3]} stroke="#34454c" strokeWidth="2"/><path d="M10 24L18 10H62L70 24Z" fill={['#be5136','#347e72','#76588d'][index%3]}/><path d="M10 24H70V31H10Z" fill="#fff2d9"/><path d="M20 24V31M34 24V31M48 24V31M62 24V31" stroke="#34454c" strokeWidth="7"/><path d="M22 39H36V50H22ZM47 37H58V56H47Z" fill="#fff6df" stroke="#34454c" strokeWidth="2"/>{Array.from({length:level},(_,i)=><circle key={i} cx={28+i*12} cy="17" r="3" fill="#fff4c5"/>)}</svg>;
}
function tokenOffset(positions: number[], index: number) {
  const group=positions.map((position,i)=>({position,i})).filter(p=>p.position===positions[index]);
  const slot=group.findIndex(p=>p.i===index);
  return {x:group.length===1?0:slot%2===0?-13:13,y:group.length>2&&slot<2?42:16};
}
function Travelers({ state }: { state: MarketState }) {
  const previous = useRef(state.players.map(p=>p.position)); const layer = useRef<HTMLDivElement>(null);
  const positionKey=state.players.map(p=>p.position).join(',');
  useEffect(()=>{
    const positions=positionKey.split(',').map(Number);
    const animations: Animation[]=[];
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && !document.hidden) positions.forEach((position,i)=>{
      const from=previous.current[i]; if(from===undefined || from===position) return;
      const steps=(position-from+12)%12;
      const box=layer.current?.getBoundingClientRect(); if(!box)return; const [endX,endY]=spots[position];const fromOffset=tokenOffset(previous.current,i);const toOffset=tokenOffset(positions,i);
      const frames=Array.from({length:steps+1},(_,n)=>{const [x,y]=spots[(from+n)%12];const remaining=1-n/steps;return {transform:`translate(${(x-endX)*box.width/4+(fromOffset.x-toOffset.x)*remaining-12}px, ${(y-endY)*box.height/4+(toOffset.y-fromOffset.y)*remaining-12}px)`};});
      const node=layer.current?.children[i]; if(node) animations.push(node.animate(frames,{duration:Math.min(1100,350+steps*110),easing:'ease-in-out'}));
    }); previous.current=positions; return ()=>animations.forEach(a=>a.cancel());
  },[positionKey]);
  return <div ref={layer} className={styles.travelers} aria-hidden="true">{state.players.map((p,i)=>{const [x,y]=spots[p.position];const offset=tokenOffset(state.players.map(p=>p.position),i);return <span key={p.id} className={styles.traveler} style={{left:`calc(${(x+.5)*25}% + ${offset.x}px)`,top:`calc(${(y+1)*25}% - ${offset.y}px)`,background:colors[i]}}>{i+1}</span>;})}</div>;
}
export default function MarketPlay({ room, players, userId, refresh }: RoomBundle) {
  const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const controlsRef=useRef<HTMLElement>(null);const contractsRef=useRef<HTMLElement>(null);const pendingFocus=useRef<number|null>(null);
  const state=room.round_state as unknown as MarketState;
  const activeId=state?.players?.[state.turnIndex]?.id;const stateVersion=state?.version;const statePhase=state?.phase;
  useEffect(()=>{
    const expected=pendingFocus.current;if(expected===null||stateVersion===undefined||stateVersion<expected)return;
    if(stateVersion!==expected||statePhase!=='business'||activeId!==userId){pendingFocus.current=null;return;}
    const timer=window.setTimeout(()=>{pendingFocus.current=null;controlsRef.current?.focus({preventScroll:true});controlsRef.current?.scrollIntoView({block:'start',behavior:'instant'});},window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:1150);
    return ()=>window.clearTimeout(timer);
  },[stateVersion,statePhase,activeId,userId]);
  if (!state?.players?.length || !state.stalls) return <div role="status">Opening the market…</div>;
  const current=state.players[state.turnIndex]; const mine=current.id===userId; const v2=state.rulesVersion===2;
  const scores=marketScores(state); const outcome=marketOutcome(state); const destinations=marketDestinations(state);
  const stall=state.stalls[current.position]; const place=MARKET_BOARD[current.position]; const offer=state.offer;
  const name=(id:string)=>players.find(p=>p.profile_id===id)?.display_name ?? `Player ${state.players.findIndex(p=>p.id===id)+1}`;
  const myScore=scores[userId]??0; const rival=Math.max(...state.players.filter(p=>p.id!==userId).map(p=>scores[p.id]));
  async function act(command:Command) { if(busy)return;setBusy(true);setError('');if(command.type==='move')pendingFocus.current=state.version+1;try{await callRoomApi(room.code,'market',{...command,expectedVersion:state.version});refresh();}catch(cause){pendingFocus.current=null;setError(cause instanceof Error?cause.message:'Please retry.');refresh();}finally{setBusy(false);} }
  function action(type: 'buy'|'upgrade'|'supplies'|'bank'|'pass', title:string, detail:string, reason:string|null) {return <button className={styles.action} disabled={busy||!!reason} onClick={()=>void act({type})}><strong>{title}</strong><span>{detail}</span>{reason&&<small>{reason}</small>}</button>;}
  return <div className={styles.game} aria-busy={busy}>
    <header className={styles.topline}><div><p className={styles.kicker}>A neighborhood worth competing for</p><h1 className={styles.title}>Market Day</h1></div><div className={styles.round}>ROUND <strong>{state.round}</strong> / {MARKET_ROUNDS}</div></header>
    <div className={styles.goal}><strong>Most prosperity after 10 equal turns wins.</strong><span>{v2?'Own districts. Claim public contracts. Trade for a set.':'Original rules: buy stalls, complete commissions, grow prosperity.'}</span><b>{outcome.finished?'Final scores':myScore===rival?'Tied with your closest rival':myScore>rival?`You lead by ${myScore-rival}`:`${rival-myScore} points behind the leader`}</b></div>
    <div className={styles.players} aria-label="Market standings">{state.players.map((p,i)=><div key={p.id} style={{'--player':colors[i]} as CSSProperties} className={`${styles.player} ${p.id===current.id&&!outcome.finished?styles.current:''}`}><div className={styles.playerName}><span className={styles.playerDot}>{i+1}</span>{name(p.id)}{p.id===userId?' · you':''}</div><div className={styles.stats}><strong className={styles.score} key={scores[p.id]}>{scores[p.id]} prosperity</strong><span>{p.cash} coins · {p.supplies} supplies</span></div><small>{marketScoreBreakdown(state,p.id).sets} district bonus · {p.commissions} contracts</small></div>)}</div>
    {outcome.finished&&<section className={styles.result} aria-label="Final market outcome"><p className={styles.kicker}>The shutters are down</p><h2>{outcome.winnerIds.map(name).join(' & ')} {outcome.winnerIds.length>1?'share the win':'wins'}!</h2><p>All players completed {MARKET_ROUNDS} turns. Highest prosperity: {outcome.high}. Your rank: {1+state.players.filter(p=>scores[p.id]>myScore).length} of {state.players.length}.</p><div className={styles.breakdowns}>{state.players.map(p=>{const b=marketScoreBreakdown(state,p.id);return <div key={p.id}><strong>{name(p.id)} · {b.total}</strong><p>{b.property} property + {b.sets} district sets + {b.contracts+b.reputation} contracts & reputation + {b.savings} savings</p></div>;})}</div><p>{(()=>{const id=outcome.winnerIds[0];const b=marketScoreBreakdown(state,id);const runner=[...state.players].filter(p=>p.id!==id).sort((a,b)=>scores[b.id]-scores[a.id])[0];const r=marketScoreBreakdown(state,runner.id);const sources=[['property ownership',b.property-r.property],['district sets',b.sets-r.sets],['contracts and reputation',b.contracts+b.reputation-r.contracts-r.reputation],['saved coins',b.savings-r.savings]] as const;const edge=[...sources].sort((a,b)=>b[1]-a[1])[0];return outcome.winnerIds.length>1?'Equal prosperity shares the victory, even when the portfolios differ.':`${name(id)} finished ${b.total-r.total} points ahead of ${name(runner.id)}. The largest scoring advantage: ${edge[1]} more points from ${edge[0]}.`;})()}</p></section>}
    <section className={styles.boardShell} aria-label="Market board"><div className={styles.topline}><h2>The neighborhood</h2><span className={styles.muted}>Follow the numbered trader tokens clockwise</span></div><div className={styles.board}>
      <div className={styles.square}><svg viewBox="0 0 100 70" aria-hidden="true"><path d="M10 38L50 10L90 38Z" fill="#be5136"/><path d="M20 38V63M40 38V63M60 38V63M80 38V63" stroke="#eac984" strokeWidth="6"/><path d="M13 63H87" stroke="#39615d" strokeWidth="4"/><circle cx="50" cy="29" r="6" fill="#fff3d2"/></svg><p className={styles.kicker}>Central exchange</p><strong>{v2?`${state.supplyStock??0} supplies`:'Market open'}</strong><small>{v2?'Shared wholesale stock · refills every round':'Original rules edition'}</small><span className={styles.forecast}>{outcome.finished?<>Market closed<br/><b>Final prosperity settled</b><br/>All ten turns complete.</>:<>After this round<br/><b>{marketForecast(state).name}</b><br/>{marketForecast(state).description}</>}</span></div>
      {MARKET_BOARD.map((site,index)=>{const owned=state.stalls[index];const available=mine&&state.phase==='move'&&destinations.includes(index);const [x,y]=spots[index];const ownerIndex=state.players.findIndex(p=>p.id===owned.ownerId);const visit=owned.ownerId&&owned.ownerId!==userId?Math.min(owned.level,state.players.find(p=>p.id===userId)?.cash??0):0;const content=<><span className={styles.address}>{index+1} · {site.district}</span><Building key={`${owned.ownerId}-${owned.level}`} index={index} level={owned.level}/><strong className={styles.tileName}>{site.name.replace(`${site.district} `,'')}</strong><span className={styles.tileMeta}>{owned.ownerId?`${name(owned.ownerId)} · L${owned.level}`:`${site.price} coins`}</span>{available&&<b className={styles.route}>{visit?`Move · pay ${visit}`:'Move here →'}</b>}<span className="sr-only">{state.players.filter(p=>p.position===index).map(p=>`${name(p.id)} is here`).join('. ')}</span></>;const props={style:{gridColumn:x+1,gridRow:y+1,'--owner':ownerIndex>=0?colors[ownerIndex]:'transparent'} as CSSProperties,className:`${styles.tile} ${available?styles.tileAvailable:''} ${state.players.filter(p=>p.position===index).length>2?styles.crowded:''}`};return available?<button key={index} {...props} disabled={busy} onClick={()=>void act({type:'move',destination:index})}><span className="sr-only">Move to </span>{content}{!visit&&<span className="sr-only">. No visit fee.</span>}</button>:<div key={index} {...props}>{content}</div>;})}<Travelers state={state}/>
    </div></section>
    <section ref={controlsRef} tabIndex={-1} className={styles.controls} aria-label="Turn actions"><div role="status" aria-live="polite"><h2>{outcome.finished?'Market closed':mine?'Your turn':`${name(current.id)}’s turn`}</h2>{!outcome.finished&&<div className={styles.phases}>{['move','business','trade'].map((p,i)=><span key={p} className={state.phase===p?styles.phaseActive:''}>{i+1} {p==='business'?'One business action':p==='move'?'Choose a route':'Trade & finish'}</span>)}</div>}<p>{state.phase==='move'?'Choose a highlighted destination. Rival properties charge a visit fee.':state.phase==='business'?`At ${place.name}. Spend this turn on one action.`:state.phase==='trade'?'Swap property to complete districts, sell spare supplies, or finish your turn.':'The final ledger is above.'}</p></div>{error&&<p role="alert" className={styles.error}>{error}</p>}
      {mine&&state.phase==='business'&&<div className={styles.actions}>
        {v2&&<button className={styles.action} onClick={()=>{contractsRef.current?.focus({preventScroll:true});contractsRef.current?.scrollIntoView({block:'start',behavior:'instant'});}}><strong>Choose a public contract ↓</strong><span>Review district orders, costs and requirements</span></button>}
        {action('buy','Buy this property',`${place.price} coins → 2 points + 1 round income`,stall.ownerId?'Already owned':current.cash<place.price?`Need ${place.price} coins`:null)}
        {action('upgrade','Improve this property',`4 coins${v2?' + 1 supply':''} → 2 points + 1 income`,stall.ownerId!==userId?'Visit your own property':stall.level>=3?'Maximum level reached':current.cash<4?'Need 4 coins':v2&&current.supplies<1?'Need 1 supply':null)}
        {action('supplies','Buy wholesale',v2?'4 coins → 2 supplies':'3 coins → 3 supplies',current.cash<(v2?4:3)?`Need ${v2?4:3} coins`:current.supplies>(v2?10:9)?'Bag is full':v2&&(state.supplyStock??0)<2?'Sold out until next round':null)}
        {!v2&&<button className={styles.action} disabled={busy||current.supplies<3} onClick={()=>void act({type:'commission'})}><strong>Fulfill commission</strong><span>3 supplies → 5 coins + 5 points</span></button>}
        {action('bank','Sell surplus','2 supplies → 4 coins',current.supplies<2?'Need 2 supplies':current.cash>95?'Wallet is full':null)}
        {action('pass','Save your resources','Skip this business action',null)}
      </div>}
      {offer&&<div className={styles.notice}><strong>{name(offer.fromId)} offers {name(offer.toId)} a deal</strong><p>Gives: {describeAssets(offer.give)}</p><p>Receives: {describeAssets(offer.receive)}</p>{offer.toId===userId&&<div className={styles.actions}><button className="btn" disabled={busy} onClick={()=>void act({type:'accept'})}>Accept trade</button><button className="btn-secondary" disabled={busy} onClick={()=>void act({type:'decline'})}>Decline</button></div>}<small>Answering ends the turn. Sender may close an unanswered offer.</small></div>}
      {mine&&state.phase==='trade'&&<>{!offer&&<MarketTradeForm state={state} userId={userId} busy={busy} name={name} act={act}/>}<button className="btn mt-4 w-full" disabled={busy} onClick={()=>void act({type:'end'})}>{offer?'Close offer & finish turn':'Finish turn'}</button></>}
    </section>
    {v2&&<section ref={contractsRef} tabIndex={-1} className={styles.contractSection} aria-label="Public district contracts"><div className={styles.topline}><div><h2>Public contracts</h2><p>One claim each. Fresh contracts in rounds 3, 5, 7 and 9.</p></div><b>Season {Math.ceil(state.round/2)} / 5</b></div><div className={styles.contracts}>{state.contracts?.map(c=>{const reason=marketContractReason(state,userId,c);return <div key={c.id} className={`${styles.contract} ${c.claimedBy?styles.claimed:''}`}><span className={styles.kicker}>{c.district} · {c.tier===2?'Major order':'Local order'}</span><strong>+{c.reward} prosperity</strong><p>{c.supplies} supplies + {c.cash} coins</p><small>Visit district & {c.tier===2?'own 2 stalls or a level 2 stall':'own a stall there'}.</small><button className="btn-secondary" disabled={busy||!mine||state.phase!=='business'||!!reason} onClick={()=>void act({type:'commission',contractId:c.id})}>{c.claimedBy?`Claimed by ${name(c.claimedBy)}`:outcome.finished?'Market closed':reason??(mine&&state.phase==='business'?'Fulfill contract':'Available at business step')}</button></div>;})}</div></section>}
    <details className={`${styles.controls} ${styles.rules}`}><summary>Scoring, district sets & rules</summary><p>Each player takes one turn per round: move, one business action, then optional trade. Visiting a rival pays them their property level in coins, up to your wallet. Nobody is eliminated.</p><p>Prosperity = 2 per property level + contracts and reputation + 1 per 3 saved coins (maximum 10){v2?' + district sets: 2 properties = 3 bonus, 3 = 7, all 4 = 12. Bonuses update immediately when property changes hands.':'.'}</p><p>{v2?'Every round pays 2 coins plus property levels (up to 4 extra). First player rotates each round. Supplies cost 4 coins per pair and shared stock refills every round. Contracts are scarce: claim before a rival, or save for the next season. Upgrades need 4 coins and 1 supply.':'Every round pays 3 coins plus property levels (up to 6 extra). Commissions grant 5 coins and 5 points for 3 supplies.'} Forecast events resolve after income, including the final round.</p><p>All players finish 10 turns. Highest prosperity wins; ties share victory. Wallet limit 99; supply bag limit 12. Extra income above capacity is lost.</p></details>
    <details className={`${styles.controls} ${styles.rules}`}><summary>Market journal</summary><ol>{state.log.slice().reverse().map((entry,i)=><li key={i}>{entry}</li>)}</ol></details>
  </div>;
}
/** Mounted only for an unanswered trade step, so every new turn starts with fresh assets. */
function MarketTradeForm({ state, userId, busy, name, act }: {
  state: MarketState; userId: string; busy: boolean; name: (id: string) => string;
  act: (command: Command) => Promise<void>;
}) {
  const [partner, setPartner] = useState('');
  const [give, setGive] = useState<MarketAssets>(emptyAssets);
  const [receive, setReceive] = useState<MarketAssets>(emptyAssets);
  const otherPlayers = state.players.filter(player => player.id !== userId);
  const partnerId = otherPlayers.some(player => player.id === partner) ? partner : otherPlayers[0]?.id ?? '';
  const preview = structuredClone(state);
  if (give.stall !== null && preview.stalls[give.stall]?.ownerId === userId) preview.stalls[give.stall].ownerId = partnerId;
  if (receive.stall !== null && preview.stalls[receive.stall]?.ownerId === partnerId) preview.stalls[receive.stall].ownerId = userId;
  function tradeImpact(id: string) {
    const p=state.players.find(player=>player.id===id)!; const outgoing=id===userId?give:receive; const incoming=id===userId?receive:give;
    const delta=marketScoreBreakdown(preview,id).sets-marketScoreBreakdown(state,id).sets;
    return `${name(id)}: ${delta>=0?'+':''}${delta} district bonus; ${p.cash-outgoing.cash+incoming.cash} coins and ${p.supplies-outgoing.supplies+incoming.supplies} supplies after trade.`;
  }
  function assetFields(label: string, value: MarketAssets, update: (value: MarketAssets) => void, ownerId: string) {
    const owner = state.players.find(player => player.id === ownerId);
    return <fieldset className={styles.tradeSide}>
      <legend className="px-1 font-bold">{label}</legend>
      <label className={styles.label}>Coins
        <input className="input !p-2" type="number" min={0} max={Math.min(20, owner?.cash ?? 0)} value={value.cash} onChange={e => update({ ...value, cash: Number(e.target.value) })} disabled={busy} />
      </label>
      <label className={styles.label}>Supplies
        <input className="input !p-2" type="number" min={0} max={Math.min(6, owner?.supplies ?? 0)} value={value.supplies} onChange={e => update({ ...value, supplies: Number(e.target.value) })} disabled={busy} />
      </label>
      <label className={styles.label}>Stall
        <select className="input !py-2 !pl-2" value={value.stall ?? ''} onChange={e => update({ ...value, stall: e.target.value === '' ? null : Number(e.target.value) })} disabled={busy}>
          <option value="">No stall</option>
          {state.stalls.map((stall, index) => stall.ownerId === ownerId ? <option key={index} value={index}>{MARKET_BOARD[index].name} · L{stall.level}</option> : null)}
        </select>
      </label>
    </fieldset>;
  }

  return <details className={`${styles.rules} mt-3`}><summary>🤝 Offer a trade</summary>
          <form onSubmit={event => { event.preventDefault(); void act({ type: 'offer', toId: partnerId, give, receive }); }}>
            <label className={styles.label}>Trade partner<select className="input" value={partnerId} disabled={busy} onChange={event => { setPartner(event.target.value); setReceive(emptyAssets()); }}>{otherPlayers.map(player => <option key={player.id} value={player.id}>{name(player.id)}</option>)}</select></label>
            <div className={styles.tradeGrid}>{assetFields('You give', give, setGive, userId)}{assetFields('You receive', receive, setReceive, partnerId)}</div>
            <p className={styles.notice}>{tradeImpact(userId)}<br/>{tradeImpact(partnerId)}</p>
            <button className="btn-secondary" disabled={busy || !partnerId || !(give.cash || give.supplies || give.stall !== null) || !(receive.cash || receive.supplies || receive.stall !== null)} type="submit">Send this offer</button>
            <p className="mt-2 text-xs">Both sides offer something. Up to 20 coins, 6 supplies and one owned stall per side.</p>
          </form>
        </details>;
}
