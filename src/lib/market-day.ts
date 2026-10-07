/** Original, deterministic Market Day rules. All money and points are integer game tokens. */
export const MARKET_ROUNDS = 10;
export const MARKET_BOARD = [
  { name: 'Sunrise Bakery', district: 'Sunrise', price: 4 },
  { name: 'Palm Books', district: 'Palm', price: 5 },
  { name: 'Lantern Kitchen', district: 'Lantern', price: 6 },
  { name: 'Sunrise Florist', district: 'Sunrise', price: 4 },
  { name: 'Palm Crafts', district: 'Palm', price: 5 },
  { name: 'Lantern Music', district: 'Lantern', price: 6 },
  { name: 'Sunrise Fruit', district: 'Sunrise', price: 4 },
  { name: 'Palm Textiles', district: 'Palm', price: 5 },
  { name: 'Lantern Tea', district: 'Lantern', price: 6 },
  { name: 'Sunrise Studio', district: 'Sunrise', price: 4 },
  { name: 'Palm Garden', district: 'Palm', price: 5 },
  { name: 'Lantern Games', district: 'Lantern', price: 6 },
] as const;
export const MARKET_EVENTS = [
  { name: 'Bright morning', description: 'Everyone receives 2 extra coins.' },
  { name: 'Supply delivery', description: 'Everyone receives 1 supply (maximum 12).' },
  { name: 'Neighborhood festival', description: 'Stall owners earn 1 reputation.' },
  { name: 'A calm market', description: 'Regular income only this round.' },
] as const;
export interface MarketPlayer { id: string; position: number; cash: number; supplies: number; reputation: number; commissions: number }
export interface MarketAssets { cash: number; supplies: number; stall: number | null }
export interface MarketOffer { fromId: string; toId: string; give: MarketAssets; receive: MarketAssets }
export interface MarketState {
  rulesVersion?: 2; roundTurn?: number; contracts?: MarketContract[]; supplyStock?: number;
  version: number; seed: number; round: number; turnIndex: number;
  phase: 'move' | 'business' | 'trade' | 'finished';
  players: MarketPlayer[]; stalls: { ownerId: string | null; level: number }[];
  offer: MarketOffer | null; event: number | null; log: string[];
}
export type MarketCommand = { expectedVersion: number } & (
  { type: 'move'; destination: number } |
  { type: 'commission'; contractId?: string } |
  { type: 'buy' | 'upgrade' | 'supplies' | 'bank' | 'pass' | 'accept' | 'decline' | 'end' } |
  { type: 'offer'; toId: string; give: MarketAssets; receive: MarketAssets }
);
function fail(message: string): never { throw new Error(message); }
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function addCash(player: MarketPlayer, amount: number) { player.cash = Math.min(99, player.cash + amount); }
function log(state: MarketState, message: string) { state.log = [...state.log, message].slice(-50); }
function spend(player: MarketPlayer, amount: number) { if (player.cash < amount) fail('Not enough coins.'); player.cash -= amount; }
export function createMarketDay(playerIds: string[], seed = 1, rulesVersion: 1 | 2 = 2): MarketState {
  if (!Array.isArray(playerIds) || playerIds.length < 2 || playerIds.length > 4 || new Set(playerIds).size !== playerIds.length || playerIds.some(id => typeof id !== 'string' || !id || id.length > 128)) fail('Market Day needs 2–4 distinct players.');
  if (!Number.isSafeInteger(seed)) fail('Invalid market seed.');
  return { ...(rulesVersion === 2 ? { rulesVersion: 2 as const, roundTurn: 0, contracts: makeContracts(1), supplyStock: (playerIds.length - 1) * 2 } : {}), version: 0, seed: seed >>> 0, round: 1, turnIndex: 0, phase: 'move',
    players: playerIds.map((id, i) => ({ id, position: i * 3, cash: 12, supplies: 2, reputation: 0, commissions: 0 })),
    stalls: MARKET_BOARD.map(() => ({ ownerId: null, level: 0 })), offer: null, event: null, log: ['Market open! Everyone starts with 12 coins and 2 supplies.'] };
}
/** Three routes are visible before choosing. No client-provided random outcomes. */
export function marketDestinations(state: MarketState): number[] {
  if (state.phase !== 'move') return [];
  const position = state.players[state.turnIndex].position;
  const stride = (state.seed + state.round + (state.rulesVersion === 2 ? 0 : state.turnIndex)) % 3 + 1;
  return [1, stride + 1, stride + 4].map(step => (position + step) % MARKET_BOARD.length);
}
export type MarketDistrict = typeof MARKET_BOARD[number]['district'];
export interface MarketContract { id: string; district: MarketDistrict; tier: number; reward: number; supplies: number; cash: number; claimedBy: string | null }
const districts: MarketDistrict[] = ['Sunrise', 'Palm', 'Lantern'];
function makeContracts(round: number): MarketContract[] {
  return districts.map((district, i) => { const tier = round >= 5 && (Math.floor(round / 2) + i) % 2 === 0 ? 2 : 1;
    return { id: `${round}-${district}`, district, tier, reward: (tier === 1 ? 5 : 8) + i, supplies: tier + 1, cash: tier + 1, claimedBy: null }; });
}
export function marketScoreBreakdown(state: MarketState, id: string) {
  const player = state.players.find(p => p.id === id)!;
  const counts = districts.map(d => state.stalls.filter((s, i) => s.ownerId === id && MARKET_BOARD[i].district === d).length);
  const sets = state.rulesVersion === 2 ? counts.reduce((sum, n) => sum + [0, 0, 3, 7, 12][n], 0) : 0;
  const result = { reputation: player.reputation, contracts: player.commissions * 3, property: state.stalls.reduce((sum, s) => sum + (s.ownerId === id ? s.level * 2 : 0), 0), sets, savings: Math.min(10, Math.floor(player.cash / 3)) };
  return { ...result, total: Object.values(result).reduce((a, b) => a + b, 0) };
}
export function marketScores(state: MarketState): Record<string, number> {
  return Object.fromEntries(state.players.map(player => [player.id, marketScoreBreakdown(state, player.id).total]));
}
export function marketOutcome(state: MarketState) {
  const scores = marketScores(state); const high = Math.max(...Object.values(scores));
  return { finished: state.phase === 'finished', winnerIds: state.phase === 'finished' ? state.players.filter(p => scores[p.id] === high).map(p => p.id) : [], scores, high };
}
export function marketForecast(state: MarketState) { return MARKET_EVENTS[(state.seed + state.round * 7) % MARKET_EVENTS.length]; }
/** A visible reason is shared by client controls and authoritative validation. */
export function marketContractReason(state: MarketState, id: string, contract: MarketContract): string | null {
  const player = state.players.find(p => p.id === id);
  if (!player) return 'Join this market first.';
  if (contract.claimedBy) return 'Already claimed this season.';
  if (MARKET_BOARD[player.position].district !== contract.district) return `Visit ${contract.district} district.`;
  const owned = state.stalls.filter((s, i) => s.ownerId === id && MARKET_BOARD[i].district === contract.district);
  if (!owned.length) return `Own a ${contract.district} stall.`;
  if (contract.tier === 2 && owned.length < 2 && !owned.some(s => s.level >= 2)) return 'Requires two district stalls or one upgraded stall.';
  if (player.supplies < contract.supplies) return `Need ${contract.supplies} supplies.`;
  if (player.cash < contract.cash) return `Need ${contract.cash} coins.`;
  return null;
}

function assets(value: unknown): MarketAssets {
  if (!record(value) || !Number.isInteger(value.cash) || (value.cash as number) < 0 || (value.cash as number) > 20 || !Number.isInteger(value.supplies) || (value.supplies as number) < 0 || (value.supplies as number) > 6 || !(value.stall === null || (Number.isInteger(value.stall) && (value.stall as number) >= 0 && (value.stall as number) < MARKET_BOARD.length))) fail('A trade allows 0–20 coins, 0–6 supplies and one stall per side.');
  return { cash: value.cash as number, supplies: value.supplies as number, stall: value.stall as number | null };
}
function canGive(state: MarketState, player: MarketPlayer, asset: MarketAssets) {
  if (player.cash < asset.cash || player.supplies < asset.supplies || (asset.stall !== null && state.stalls[asset.stall].ownerId !== player.id)) fail('Trade assets are no longer available.');
}
function nextTurn(state: MarketState) {
  state.offer = null;
  if (state.rulesVersion === 2) { state.roundTurn = (state.roundTurn ?? 0) + 1; state.turnIndex = (state.turnIndex + 1) % state.players.length; }
  else state.turnIndex++;
  if (state.rulesVersion === 2 ? state.roundTurn === state.players.length : state.turnIndex === state.players.length) {
    state.turnIndex = state.rulesVersion === 2 ? state.round % state.players.length : 0;
    if (state.rulesVersion === 2) state.roundTurn = 0;
    state.event = (state.seed + state.round * 7) % MARKET_EVENTS.length;
    for (const player of state.players) {
      const owned = state.stalls.filter(stall => stall.ownerId === player.id);
      const income = (state.rulesVersion === 2 ? 2 : 3) + Math.min(state.rulesVersion === 2 ? 4 : 6, owned.reduce((sum, stall) => sum + stall.level, 0));
      addCash(player, income + (state.event === 0 ? 2 : 0));
      if (state.event === 1) player.supplies = Math.min(12, player.supplies + 1);
      if (state.event === 2 && owned.length) player.reputation++;
    }
    log(state, `Round ${state.round} closed: everyone earns ${state.rulesVersion === 2 ? '2 coins plus up to 4' : '3 coins plus up to 6'} stall income. ${MARKET_EVENTS[state.event].name}: ${MARKET_EVENTS[state.event].description}`);
    if (state.round === MARKET_ROUNDS) { state.phase = 'finished'; log(state, 'Market closed! Prosperity combines reputation, commissions, stalls and up to 10 savings points.'); return; }
    state.round++;
    if (state.rulesVersion === 2) { state.supplyStock = (state.players.length - 1) * 2; if (state.round % 2 === 1) state.contracts = makeContracts(state.round); }
  }
  state.phase = 'move';
}
/** Throws without mutating input. Expected version rejects stale clicks and retries. */
export function applyMarketDay(previous: MarketState, playerId: string, input: unknown): MarketState {
  if (!record(input) || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion !== previous.version) fail('The market changed. Refresh and try again.');
  if (previous.phase === 'finished') fail('This market has finished.');
  if (!previous.players.some(player => player.id === playerId)) fail('You are not in this market.');
  const state: MarketState = structuredClone(previous);
  const current = state.players[state.turnIndex];
  const type = input.type;
  if (type === 'accept' || type === 'decline') {
    if (state.phase !== 'trade' || !state.offer || state.offer.toId !== playerId) fail('There is no trade for you to answer.');
    const offer = state.offer;
    const sender = state.players.find(player => player.id === offer.fromId)!;
    const recipient = state.players.find(player => player.id === offer.toId)!;
    if (type === 'accept') {
      canGive(state, sender, offer.give); canGive(state, recipient, offer.receive);
      const senderCash = sender.cash - offer.give.cash + offer.receive.cash;
      const recipientCash = recipient.cash - offer.receive.cash + offer.give.cash;
      const senderSupplies = sender.supplies - offer.give.supplies + offer.receive.supplies;
      const recipientSupplies = recipient.supplies - offer.receive.supplies + offer.give.supplies;
      if (senderCash > 99 || recipientCash > 99 || senderSupplies > 12 || recipientSupplies > 12) fail('This trade exceeds a player’s wallet or supply capacity.');
      sender.cash = senderCash; recipient.cash = recipientCash; sender.supplies = senderSupplies; recipient.supplies = recipientSupplies;
      if (offer.give.stall !== null) state.stalls[offer.give.stall].ownerId = recipient.id;
      if (offer.receive.stall !== null) state.stalls[offer.receive.stall].ownerId = sender.id;
      log(state, `Player ${state.players.indexOf(recipient) + 1} accepted the trade: ${offer.give.cash} coins / ${offer.give.supplies} supplies for ${offer.receive.cash} coins / ${offer.receive.supplies} supplies${offer.give.stall !== null || offer.receive.stall !== null ? ', including stall ownership' : ''}.`);
    } else log(state, 'Trade declined. No assets changed.');
    nextTurn(state);
  } else {
    if (current.id !== playerId) fail('Wait for your turn.');
    if (state.phase === 'move') {
      if (type !== 'move' || !Number.isInteger(input.destination) || !marketDestinations(state).includes(input.destination as number)) fail('Choose one of the highlighted destinations.');
      current.position = input.destination as number;
      const stall = state.stalls[current.position];
      if (stall.ownerId && stall.ownerId !== playerId) {
        const payment = Math.min(current.cash, stall.level);
        current.cash -= payment;
        addCash(state.players.find(player => player.id === stall.ownerId)!, payment);
        log(state, `Player ${state.turnIndex + 1} visits ${MARKET_BOARD[current.position].name} and pays ${payment} coin${payment === 1 ? '' : 's'} to its owner.`);
      } else log(state, `Player ${state.turnIndex + 1} visits ${MARKET_BOARD[current.position].name}.`);
      state.phase = 'business';
    } else if (state.phase === 'business') {
      const stall = state.stalls[current.position];
      if (type === 'buy') {
        if (stall.ownerId) fail('This stall already has an owner.');
        spend(current, MARKET_BOARD[current.position].price); stall.ownerId = playerId; stall.level = 1;
        log(state, `Stall purchased for ${MARKET_BOARD[current.position].price} coins (+2 prosperity, +1 round income).`);
      } else if (type === 'upgrade') {
        if (stall.ownerId !== playerId || stall.level >= 3) fail('Upgrade your own stall up to level 3.');
        if (state.rulesVersion === 2 && current.supplies < 1) fail('An upgrade needs 1 supply.');
        spend(current, 4); if (state.rulesVersion === 2) current.supplies--; stall.level++;
        log(state, `Stall upgraded for 4 coins${state.rulesVersion === 2 ? ' and 1 supply' : ''} (+2 prosperity, +1 round income).`);
      } else if (type === 'supplies') {
        if (state.rulesVersion === 2) {
          if ((state.supplyStock ?? 0) < 2) fail('Wholesale stock is empty until next round.');
          if (current.supplies > 10) fail('Your bag holds at most 12 supplies.');
          spend(current, 4); current.supplies += 2; state.supplyStock = (state.supplyStock ?? 0) - 2; log(state, 'Wholesale purchase: −4 coins, +2 supplies.');
        } else {
        if (current.supplies > 9) fail('Your bag holds at most 12 supplies.');
        spend(current, 3); current.supplies += 3; log(state, 'Bought 3 supplies for 3 coins.'); }
      } else if (type === 'commission') {
        if (state.rulesVersion === 2) {
          const contract = state.contracts?.find(c => c.id === input.contractId);
          if (!contract) fail('Choose an available public contract.');
          const reason = marketContractReason(state, playerId, contract); if (reason) fail(reason);
          current.supplies -= contract.supplies; spend(current, contract.cash); current.commissions++; current.reputation += contract.reward - 3; contract.claimedBy = playerId;
          log(state, `${contract.district} contract claimed for ${contract.reward} prosperity. It is no longer available to rivals.`);
        } else {
        if (current.supplies < 3) fail('A commission needs 3 supplies.');
        current.supplies -= 3; current.commissions++; current.reputation += 2; addCash(current, 5);
        log(state, 'Commission fulfilled: −3 supplies, +5 coins, +2 reputation and +3 commission points.'); }
      } else if (type === 'bank') {
        if (current.supplies < 2 || current.cash > 95) fail('Bank exchange needs 2 supplies and room for 4 coins.');
        current.supplies -= 2; current.cash += 4; log(state, 'Bank exchange: −2 supplies, +4 coins.');
      } else if (type === 'pass') log(state, 'Business action skipped.');
      else fail('Choose one business action.');
      state.phase = 'trade';
    } else if (state.phase === 'trade') {
      if (type === 'end') { if (state.offer) log(state, 'Unanswered trade expired. No assets changed.'); nextTurn(state); }
      else if (type === 'offer') {
        if (state.offer) fail('Answer or close the existing offer first.');
        if (typeof input.toId !== 'string' || input.toId === playerId) fail('Choose another player.');
        const recipient = state.players.find(player => player.id === input.toId);
        if (!recipient) fail('Trade partner is not in this market.');
        const give = assets(input.give); const receive = assets(input.receive);
        if (!(give.cash || give.supplies || give.stall !== null) || !(receive.cash || receive.supplies || receive.stall !== null)) fail('Both sides must offer something.');
        canGive(state, current, give); canGive(state, recipient, receive);
        if (current.cash - give.cash + receive.cash > 99 || recipient.cash - receive.cash + give.cash > 99 || current.supplies - give.supplies + receive.supplies > 12 || recipient.supplies - receive.supplies + give.supplies > 12) fail('This trade exceeds a player’s wallet or supply capacity.');
        state.offer = { fromId: playerId, toId: recipient.id, give, receive };
        log(state, `Player ${state.turnIndex + 1} offered a trade to Player ${state.players.indexOf(recipient) + 1}. Accepting or declining ends this turn; the sender can close it at any time.`);
      } else fail('Offer a trade or end your turn.');
    }
  }
  state.version++;
  return state;
}
