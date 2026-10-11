import { isRecord, topScorers, type LiveBase, type LiveEngine, type LiveUpdate } from '@/lib/live/types';
import { DECK, SHAPES, type Shape } from './cards';
import { applyMove, deal, type WhotHand, type WhotMove } from './game';
import { BETWEEN_MS, MAX_HANDS, TURN_SECONDS, type WhotView } from './view';

/** Online Whot! on the server: every hand is dealt here and players only ever see their own cards. */

export interface WhotState extends LiveBase {
  kind: 'whot';
  seed: number;
  hands: number;
  handNo: number;
  first: number;
  deal: WhotHand;
  wins: Record<string, number>;
  phase: 'play' | 'between';
  deadline: number;
  turnSeconds: number;
}

const bump = (state: WhotState): WhotState => ({ ...state, version: state.version + 1 });
const seatIndex = (state: WhotState, userId: string) => state.deal.seats.findIndex(seat => seat.id === userId);

/** Best of N: stop early once someone has won more than half the hands. */
const decided = (state: WhotState) => Object.values(state.wins).some(wins => wins > state.hands / 2) || state.handNo >= state.hands;

function afterMove(state: WhotState, dealt: WhotHand, now: number): WhotState {
  if (!dealt.winners) return { ...state, deal: dealt, deadline: now + state.turnSeconds * 1000 };
  const wins = { ...state.wins };
  for (const index of dealt.winners) wins[dealt.seats[index].id] = (wins[dealt.seats[index].id] ?? 0) + 1;
  return { ...state, deal: dealt, wins, phase: 'between', deadline: now + BETWEEN_MS };
}

function move(state: WhotState, seat: number, input: WhotMove, now: number): LiveUpdate<WhotState> {
  const result = applyMove(state.deal, seat, input);
  if ('error' in result) return result;
  return { state: bump(afterMove(state, result, now)), changed: true };
}

function parseMove(action: Record<string, unknown>): WhotMove | null {
  if (action.type === 'draw') return { type: 'draw' };
  if (action.type !== 'play' || typeof action.card !== 'number' || !Number.isInteger(action.card) || action.card < 0 || action.card >= DECK.length) return null;
  if (action.call !== undefined && !SHAPES.includes(action.call as Shape)) return null;
  return { type: 'play', card: action.card, ...(action.call ? { call: action.call as Shape } : {}) };
}

export const whotEngine: LiveEngine<WhotState, Record<string, never>> = {
  type: 'whot',
  minPlayers: 2,
  maxPlayers: 4,

  parseSetup: () => ({}),

  create({ players, rounds, seconds, seed, now }) {
    if (players.length < 2 || players.length > 4) return { error: 'Whot! needs 2–4 players.' };
    const hands = Math.max(1, Math.min(MAX_HANDS, Math.round(rounds) | 1));
    const turnSeconds = Math.max(15, Math.min(60, seconds ?? TURN_SECONDS));
    return {
      kind: 'whot', version: 1, players, ended: false, seed, hands, handNo: 1, first: 0,
      deal: deal(players, seed), wins: Object.fromEntries(players.map(player => [player.id, 0])),
      phase: 'play', deadline: now + turnSeconds * 1000, turnSeconds,
    };
  },

  parse(raw) {
    if (!isRecord(raw) || raw.kind !== 'whot' || !isRecord(raw.deal) || !Array.isArray(raw.players)) return null;
    return raw as unknown as WhotState;
  },

  view(state, viewer): WhotView {
    const hand = state.deal;
    const me = seatIndex(state, viewer);
    const over = !!hand.winners;
    return {
      kind: 'whot', version: state.version, ended: state.ended, phase: state.phase, deadline: state.deadline,
      hands: state.hands, handNo: state.handNo, wins: state.wins, turnSeconds: state.turnSeconds,
      seats: hand.seats.map((seat, index) => ({
        id: seat.id, name: seat.name, count: seat.hand.length,
        // Hands are shown to everyone only once the hand is over.
        cards: index === me || over ? seat.hand : null,
      })),
      me, turn: hand.turn, pile: hand.pile.slice(-6), pileCount: hand.pile.length, market: hand.market.length,
      called: hand.called, step: hand.step, events: hand.events, winners: hand.winners, tender: hand.tender,
    };
  },

  act(state, userId, action, now) {
    if (state.ended) return { error: 'This match is over.' };
    const seat = seatIndex(state, userId);
    if (seat < 0) return { error: 'You are not at this table.' };
    if (state.phase !== 'play') return { error: 'The next hand is being dealt.' };
    if (!isRecord(action) || action.step !== state.deal.step) return { error: 'The table has moved on.' };
    const input = parseMove(action);
    if (!input) return { error: 'Unknown move.' };
    return move(state, seat, input, now);
  },

  advance(state, now) {
    if (state.ended || now < state.deadline) return { state, changed: false };
    // Too slow: the player goes to market.
    if (state.phase === 'play') return move(state, state.deal.turn, { type: 'draw' }, now);
    if (decided(state)) return { state: bump({ ...state, ended: true }), changed: true };
    const first = (state.first + 1) % state.players.length;
    return {
      state: bump({
        ...state, handNo: state.handNo + 1, first, phase: 'play', deadline: now + state.turnSeconds * 1000,
        // Move numbers carry on from the last hand, so a stale move can never match the new deal.
        deal: deal(state.players, (state.seed + state.handNo * 7919) >>> 0, first, state.deal.step + 1),
      }),
      changed: true,
    };
  },

  remove(state, userId, now) {
    const seat = seatIndex(state, userId);
    if (seat < 0) return { state, changed: false };
    const players = state.players.filter(player => player.id !== userId);
    const wins = { ...state.wins };
    delete wins[userId];
    if (players.length < 2) return { state: bump({ ...state, players, wins, ended: true }), changed: true };
    const hand = state.deal;
    const seats = hand.seats.filter((_, index) => index !== seat);
    // Their cards go back under the market; play passes on if it was their turn.
    let turn = hand.turn > seat ? hand.turn - 1 : hand.turn;
    if (turn >= seats.length) turn = 0;
    const shift = (index: number) => (index > seat ? index - 1 : index);
    const dealt: WhotHand = {
      ...hand, seats, market: [...hand.market, ...hand.seats[seat].hand], turn, step: hand.step + 1, events: [],
      winners: hand.winners ? hand.winners.filter(index => index !== seat).map(shift) : null,
      tender: hand.tender ? hand.tender.filter((_, index) => index !== seat) : null,
    };
    return {
      state: bump({ ...state, players, wins, deal: dealt, first: state.first % players.length, deadline: hand.turn === seat ? now + state.turnSeconds * 1000 : state.deadline }),
      changed: true,
    };
  },

  rounds: state => state.hands,
  progressed: state => state.handNo > 1 || state.deal.step >= 6,

  settle(state) {
    if (!state.ended) return null;
    const scores = Object.fromEntries(state.players.map(player => [player.id, state.wins[player.id] ?? 0]));
    return { scores, winners: topScorers(scores) };
  },
};
