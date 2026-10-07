'use client';

import { useEffect, useRef, useState } from 'react';
import { MARKET_BOARD, MARKET_EVENTS, MARKET_ROUNDS, marketDestinations, marketScores, type MarketAssets, type MarketCommand, type MarketState } from '@/lib/market-day';
import type { RoomBundle } from './RoomClient';
import { callRoomApi } from '@/lib/room-api';
import styles from './MarketPlay.module.css';

type Command = MarketCommand extends infer T ? T extends MarketCommand ? Omit<T, 'expectedVersion'> : never : never;
const icons = ['🥐', '📚', '🍲', '🌷', '🧺', '🎵', '🍊', '🧵', '🍵', '🎨', '🌿', '🎲'];
const emptyAssets = (): MarketAssets => ({ cash: 0, supplies: 0, stall: null });
function describeAssets(assets: MarketAssets) {
  return [assets.cash ? `${assets.cash} coins` : '', assets.supplies ? `${assets.supplies} supplies` : '', assets.stall !== null ? MARKET_BOARD[assets.stall].name : ''].filter(Boolean).join(' + ');
}

/** The diorama only presents authoritative state; every action is validated on the server. */
export default function MarketPlay({ room, players, userId, refresh }: RoomBundle) {
  const [flat, setFlat] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pendingFocus = useRef<number | null>(null);
  const controlsRef = useRef<HTMLElement>(null);
  const state = room.round_state as unknown as MarketState;
  useEffect(() => {
    if (pendingFocus.current === null || !state || state.version < pendingFocus.current) return;
    pendingFocus.current = null;
    controlsRef.current?.focus({ preventScroll: true });
    controlsRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [state]);
  if (!state?.players?.length || !state.stalls) return <div className="glass p-5" role="status">Opening the market…</div>;
  const current = state.players[state.turnIndex];
  const mine = current.id === userId;
  const destinations = marketDestinations(state);
  const scores = marketScores(state);
  const currentStall = state.stalls[current.position];
  const currentPlace = MARKET_BOARD[current.position];
  const name = (id: string) => players.find(player => player.profile_id === id)?.display_name ?? `Player ${state.players.findIndex(player => player.id === id) + 1}`;
  const offer = state.offer;
  const myOffer = offer?.toId === userId;
  const event = state.event === null ? null : MARKET_EVENTS[state.event];

  async function act(command: Command) {
    if (busy) return;
    setBusy(true); setError(''); pendingFocus.current = state.version + 1;
    try { await callRoomApi(room.code, 'market', { ...command, expectedVersion: state.version }); refresh(); }
    catch (cause) { pendingFocus.current = null; setError(cause instanceof Error ? cause.message : 'Could not update the market. Please retry.'); refresh(); }
    finally { setBusy(false); }
  }


  return <div className={styles.game} aria-busy={busy}>
    <div className={styles.topline}>
      <div><div className="eyebrow mb-1">Build a little market empire</div><h1 className={styles.title}>Market Day</h1></div>
      <span className="pill">Round {state.round} / {MARKET_ROUNDS}</span>
    </div>
    <div className={styles.players} aria-label="Market standings">
      {state.players.map((player, index) => <div key={player.id} className={`${styles.player} ${player.id === current.id ? styles.current : ''}`}>
        <div className={styles.playerName}>{index + 1}. {name(player.id)}{player.id === userId ? ' (you)' : ''}</div>
        <div className={styles.stats}><span>🪙 {player.cash} coins</span><span>📦 {player.supplies} supplies</span><span>⭐ {scores[player.id]} prosperity</span></div>
        <div className={`${styles.muted} mt-2`}>{player.reputation} reputation · {player.commissions} commissions</div>
      </div>)}
    </div>

    <section className={styles.boardShell} aria-label="Market board">
      <div className={styles.topline}><div><h2 className="font-black">The neighborhood</h2><p className={styles.muted}>Numbered tokens show each player’s location.</p></div>
        <button className="btn-secondary !px-3 !py-2 text-sm" aria-pressed={flat} onClick={() => setFlat(!flat)}>Flat board {flat ? 'on' : 'off'}</button>
      </div>
      <div className={`${styles.board} ${flat ? '' : styles.dimensional}`}>
        {MARKET_BOARD.map((place, index) => {
          const stall = state.stalls[index];
          const available = mine && state.phase === 'move' && destinations.includes(index);
          const visiting = state.players.filter(player => player.position === index);
          const cost = stall.ownerId && stall.ownerId !== userId ? Math.min(state.players.find(player => player.id === userId)?.cash ?? 0, stall.level) : 0;
          const contents = <><span className={styles.toy} aria-hidden="true">{icons[index]}</span><span className={styles.tileName}>{place.name}</span>
            <span className={styles.tileMeta}>{stall.ownerId ? `${name(stall.ownerId)} · level ${stall.level}` : `${place.price} coins · available`}</span>
            <span className={styles.tokens}>{visiting.map(player => <span className={styles.token} key={player.id} title={name(player.id)}>{state.players.indexOf(player) + 1}<span className="sr-only"> {name(player.id)} is here</span></span>)}</span>
            {available && <span className={styles.tileMeta}>{cost ? `Visit · pay ${cost} coins` : 'Move here →'}</span>}</>;
          const className = `${styles.tile} ${available ? styles.tileAvailable : ''} ${visiting.some(player => player.id === userId) ? styles.tileSelected : ''}`;
          return available ? <button key={index} className={className} disabled={busy} onClick={() => void act({ type: 'move', destination: index })}><span className="sr-only">Move to </span>{contents}{!cost && <span className="sr-only">. No visit fee.</span>}</button>
            : <div key={index} className={className}>{contents}</div>;
        })}
      </div>
    </section>

    <section ref={controlsRef} tabIndex={-1} className={styles.controls} aria-label="Turn actions">
      <div role="status" aria-live="polite"><h2 className="text-lg font-black">{state.phase === 'finished' ? 'Market closed' : mine ? 'Your turn' : `${name(current.id)}’s turn`}</h2>
        <p className={styles.muted}>{state.phase === 'move' ? mine ? 'Choose one of the three highlighted destinations above.' : 'Choosing a destination…' : state.phase === 'business' ? `At ${currentPlace.name} · choose one business action.` : state.phase === 'trade' ? 'Trade with a neighbor, or finish this turn.' : 'Final prosperity determines the winner.'}</p>
      </div>
      {error && <p role="alert" className={`${styles.error} mt-3`}>{error}</p>}
      {mine && state.phase === 'business' && <div className={styles.actions}>
        <button className={styles.action} disabled={busy || !!currentStall.ownerId || current.cash < currentPlace.price} onClick={() => void act({ type: 'buy' })}><strong>🏪 Buy this stall</strong><span>{currentPlace.price} coins → level 1 · +2 stall points</span></button>
        <button className={styles.action} disabled={busy || currentStall.ownerId !== userId || currentStall.level >= 3 || current.cash < 4} onClick={() => void act({ type: 'upgrade' })}><strong>🔨 Upgrade your stall</strong><span>4 coins → +1 level · maximum level 3</span></button>
        <button className={styles.action} disabled={busy || current.cash < 3 || current.supplies > 9} onClick={() => void act({ type: 'supplies' })}><strong>📦 Restock supplies</strong><span>3 coins → 3 supplies · bag holds 12</span></button>
        <button className={styles.action} disabled={busy || current.supplies < 3} onClick={() => void act({ type: 'commission' })}><strong>✨ Fulfill a commission</strong><span>3 supplies → 5 coins + 5 commission/reputation points</span></button>
        <button className={styles.action} disabled={busy || current.supplies < 2 || current.cash > 95} onClick={() => void act({ type: 'bank' })}><strong>🏦 Bank exchange</strong><span>2 supplies → 4 coins</span></button>
        <button className={styles.action} disabled={busy} onClick={() => void act({ type: 'pass' })}><strong>☕ Take a break</strong><span>Skip your business action this turn</span></button>
      </div>}
      {offer && <div className={`${styles.notice} mt-4`}>
        <h3 className="font-black">{name(offer.fromId)} offers {name(offer.toId)} a deal</h3>
        <p className="mt-2">{name(offer.fromId)} gives: <strong>{describeAssets(offer.give)}</strong></p>
        <p className="mt-1">{name(offer.toId)} gives: <strong>{describeAssets(offer.receive)}</strong></p>
        {myOffer && <div className="mt-3 flex flex-wrap gap-2"><button className="btn" disabled={busy} onClick={() => void act({ type: 'accept' })}>Accept trade</button><button className="btn-secondary" disabled={busy} onClick={() => void act({ type: 'decline' })}>Decline</button></div>}
        <p className="mt-2 text-xs">Accepting or declining ends the turn. The sender can close an unanswered offer.</p>
      </div>}
      {mine && state.phase === 'trade' && <>
        {!offer && <MarketTradeForm state={state} userId={userId} busy={busy} name={name} act={act} />}
        <button className="btn mt-4 w-full" disabled={busy} onClick={() => void act({ type: 'end' })}>{offer ? 'Close offer & finish turn' : 'Finish turn'}</button>
      </>}
      {!mine && !myOffer && <p className="mt-3 text-sm">Your market updates automatically. You can explore the board and rules while you wait.</p>}
    </section>
    {event && <div className={styles.notice}><strong>📣 Last round: {event.name}</strong><p>{event.description}</p></div>}
    <details className={`${styles.controls} ${styles.rules}`}><summary>How to play · scoring & tips</summary>
      <ol><li>Move to a highlighted stall. Visiting another player’s stall pays them its level in coins, limited to your wallet.</li><li>Take one business action: buy or improve the stall you’re visiting, restock, complete a commission, exchange at the bank, or pass.</li><li>Optionally offer one trade, then finish your turn. An accepted or declined offer finishes the turn automatically.</li><li>After everyone plays, earn 3 coins plus your stall levels (up to 6 extra coins), then resolve a shared event. The market closes after ten rounds.</li></ol>
      <p className="mt-3"><strong>Prosperity:</strong> reputation + 3 per completed commission + 2 per stall level + 1 per 3 saved coins (maximum 10 savings points). A commission adds 2 reputation as well as its 3 commission points. Highest prosperity wins; equal scores share the win.</p>
      <p className="mt-2">You start with 12 coins and 2 supplies. Your wallet holds 99 coins and your bag holds 12 supplies. Extra income above those limits is lost. Nobody is eliminated. Buying early grows income; commissions convert supplies into points.</p>
    </details>
    <details className={`${styles.controls} ${styles.rules}`}><summary>Market journal · {state.log.length} updates</summary><ol className={styles.log}>{state.log.slice().reverse().map((entry, index) => <li key={`${state.version}-${index}`}>{entry}</li>)}</ol></details>
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
            <button className="btn-secondary" disabled={busy || !partnerId || !(give.cash || give.supplies || give.stall !== null) || !(receive.cash || receive.supplies || receive.stall !== null)} type="submit">Send this offer</button>
            <p className="mt-2 text-xs">Both sides offer something. Up to 20 coins, 6 supplies and one owned stall per side.</p>
          </form>
        </details>;
}
