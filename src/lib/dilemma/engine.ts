import { isRecord, seeded, shuffled, topScorers, type LiveBase, type LiveEngine, type LiveUpdate } from '@/lib/live/types';
import { TOPIC_IDS, type Dilemma, type TopicChoice } from './types';
import { deckFor, dilemmaById } from './bank';
import {
  DEFAULT_CHOOSE_SECONDS, MAX_ROUNDS, MIN_ROUNDS, OPEN_BOOK_POINTS, POINTS_PER_SCORE, READ_POINTS, REVEAL_MAX_MS, topChoices,
  type DilemmaMode, type DilemmaPick, type DilemmaStanding, type DilemmaView,
} from './view';

/** What Would You Do? on the server: picks stay secret until everyone has chosen. */

export interface DilemmaSetup { topic: TopicChoice }
interface Pick { choice: number | null; guess: number | null }

export interface DilemmaState extends LiveBase {
  kind: 'dilemma';
  mode: DilemmaMode;
  topic: TopicChoice;
  cards: string[];
  index: number;
  phase: 'choose' | 'reveal';
  seconds: number;
  deadline: number;
  picks: Record<string, Pick>;
  ready: string[];
  /** Points scored this round, shown at the reveal. */
  gained: Record<string, number>;
  standings: DilemmaStanding[];
  /** Hot Seat: chosen when the round starts and kept even if someone leaves. */
  seat: string | null;
}

const topics: readonly string[] = ['mixed', ...TOPIC_IDS];
const bump = (state: DilemmaState): DilemmaState => ({ ...state, version: state.version + 1 });
const validOption = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 3;

/** Hot Seat rotates through the players; Read the Room has no seat. */
export const seatOf = (state: DilemmaState): string | null => (state.mode === 'hotseat' ? state.seat : null);
const seatFor = (state: DilemmaState, index: number): string | null =>
  state.mode === 'hotseat' && state.players.length ? state.players[index % state.players.length].id : null;

/** A mixed deck deals topics in turn so one theme never dominates. */
export function dealCards(topic: TopicChoice, count: number, random: () => number): Dilemma[] {
  if (topic !== 'mixed') return shuffled(deckFor(topic), random).slice(0, count);
  const groups = shuffled(TOPIC_IDS, random).map(id => shuffled(deckFor(id), random));
  const out: Dilemma[] = [];
  for (let round = 0; out.length < count && groups.some(group => group.length > round); round++) {
    for (const group of groups) if (group[round] && out.length < count) out.push(group[round]);
  }
  return out;
}

/** Who still has to act this round. */
function waitingOn(state: DilemmaState): string[] {
  const seat = seatOf(state);
  return state.players.map(player => player.id).filter(id => {
    const pick = state.picks[id];
    if (!pick) return true;
    if (state.mode === 'room') return pick.choice === null || pick.guess === null;
    return id === seat ? pick.choice === null : pick.guess === null;
  });
}

function reveal(state: DilemmaState, now: number): DilemmaState {
  const counts = [0, 0, 0, 0];
  for (const pick of Object.values(state.picks)) if (pick.choice !== null) counts[pick.choice]++;
  const gained: Record<string, number> = {};
  const seat = seatOf(state);
  if (state.mode === 'room') {
    const top = topChoices(counts);
    for (const [id, pick] of Object.entries(state.picks)) gained[id] = pick.guess !== null && top.includes(pick.guess) ? READ_POINTS : 0;
  } else if (seat) {
    const truth = state.picks[seat]?.choice ?? null;
    let readers = 0;
    for (const [id, pick] of Object.entries(state.picks)) {
      if (id === seat) continue;
      const right = truth !== null && pick.guess === truth;
      gained[id] = right ? READ_POINTS : 0;
      if (right) readers++;
    }
    gained[seat] = readers * OPEN_BOOK_POINTS;
  }
  const standings = state.standings.map(standing => ({
    ...standing,
    points: standing.points + (gained[standing.id] ?? 0),
    reads: standing.reads + (standing.id !== seat && (gained[standing.id] ?? 0) > 0 ? 1 : 0),
  }));
  return { ...state, phase: 'reveal', deadline: now + REVEAL_MAX_MS, ready: [], gained, standings };
}

function nextRound(state: DilemmaState, now: number): DilemmaState {
  if (state.index + 1 >= state.cards.length) return { ...state, ended: true };
  return { ...state, index: state.index + 1, seat: seatFor(state, state.index + 1), phase: 'choose', deadline: now + state.seconds * 1000, picks: {}, ready: [], gained: {} };
}

function pick(state: DilemmaState, userId: string, action: Record<string, unknown>, now: number): LiveUpdate<DilemmaState> {
  if (state.phase !== 'choose') return { error: 'This round is already revealed.' };
  if (now > state.deadline) return { error: 'Time is up for this round.' };
  const seat = seatOf(state);
  const needsChoice = state.mode === 'room' || userId === seat;
  const needsGuess = state.mode === 'room' || userId !== seat;
  if (needsChoice && !validOption(action.choice)) return { error: 'Pick what you would do.' };
  if (needsGuess && !validOption(action.guess)) return { error: state.mode === 'room' ? 'Predict the room’s favourite.' : 'Guess what they would do.' };
  if (state.picks[userId]) return { error: 'You already locked in.' };
  const entry: Pick = { choice: needsChoice ? action.choice as number : null, guess: needsGuess ? action.guess as number : null };
  let next: DilemmaState = { ...state, picks: { ...state.picks, [userId]: entry } };
  if (!waitingOn(next).length) next = reveal(next, now);
  return { state: bump(next), changed: true };
}

function ready(state: DilemmaState, userId: string, now: number): LiveUpdate<DilemmaState> {
  if (state.phase !== 'reveal') return { error: 'Lock in your answer first.' };
  if (state.ready.includes(userId)) return { state, changed: false };
  let next: DilemmaState = { ...state, ready: [...state.ready, userId] };
  if (state.players.every(player => next.ready.includes(player.id))) next = nextRound(next, now);
  return { state: bump(next), changed: true };
}

export const dilemmaEngine: LiveEngine<DilemmaState, DilemmaSetup> = {
  type: 'dilemma',
  minPlayers: 2,
  maxPlayers: 10,

  parseSetup(raw) {
    const topic = isRecord(raw) && typeof raw.topic === 'string' && topics.includes(raw.topic) ? raw.topic as TopicChoice : 'mixed';
    return { topic };
  },

  create({ players, setup, mode, rounds, seconds, seed, now }) {
    const hotseat = mode === 'spotlight';
    let count = Math.max(MIN_ROUNDS, Math.min(MAX_ROUNDS, Math.round(rounds)));
    // Everyone takes the same number of turns in the hot seat.
    if (hotseat) count = Math.max(players.length, Math.floor(count / players.length) * players.length);
    const cards = dealCards(setup.topic, count, seeded(seed));
    if (hotseat) count = Math.floor(cards.length / players.length) * players.length;
    if (count < Math.min(MIN_ROUNDS, players.length) || cards.length < 1) return { error: 'Not enough situations in this topic yet.' };
    const length = Math.max(15, Math.min(120, seconds ?? DEFAULT_CHOOSE_SECONDS));
    return {
      kind: 'dilemma', version: 1, players, ended: false, mode: hotseat ? 'hotseat' : 'room', topic: setup.topic,
      cards: cards.slice(0, count).map(card => card.id), index: 0, phase: 'choose', seconds: length,
      deadline: now + length * 1000, picks: {}, ready: [], gained: {},
      standings: players.map(player => ({ id: player.id, name: player.name, points: 0, reads: 0 })),
      seat: hotseat ? players[0].id : null,
    };
  },

  parse(raw) {
    if (!isRecord(raw) || raw.kind !== 'dilemma' || !Array.isArray(raw.cards) || !Array.isArray(raw.players)) return null;
    const state = raw as unknown as DilemmaState;
    return state.cards.every(id => dilemmaById(id)) ? state : null;
  },

  view(state, viewer): DilemmaView {
    const card = dilemmaById(state.cards[state.index])!;
    const revealed = state.phase === 'reveal' || state.ended;
    const counts = [0, 0, 0, 0];
    for (const entry of Object.values(state.picks)) if (entry.choice !== null) counts[entry.choice]++;
    const mine = state.picks[viewer];
    const waiting = waitingOn(state);
    return {
      kind: 'dilemma', version: state.version, mode: state.mode, topic: state.topic, index: state.index, total: state.cards.length,
      phase: state.phase, seconds: state.seconds, deadline: state.deadline, ended: state.ended,
      card: { topic: card.topic, scenario: card.scenario, options: [...card.options] },
      seat: seatOf(state),
      mine: mine ? { choice: mine.choice, guess: mine.guess } : null,
      answered: state.players.map(player => player.id).filter(id => !waiting.includes(id)),
      ready: state.ready,
      standings: [...state.standings].sort((a, b) => b.points - a.points),
      reveal: revealed ? {
        counts, top: topChoices(counts),
        picks: state.players.map((player): DilemmaPick => ({
          id: player.id, choice: state.picks[player.id]?.choice ?? null, guess: state.picks[player.id]?.guess ?? null, points: state.gained[player.id] ?? 0,
        })),
      } : null,
    };
  },

  act(state, userId, action, now) {
    if (state.ended) return { error: 'This match is over.' };
    if (!state.players.some(player => player.id === userId)) return { error: 'You are not in this match.' };
    if (!isRecord(action) || action.round !== state.index) return { error: 'That round has moved on.' };
    if (action.type === 'pick') return pick(state, userId, action, now);
    if (action.type === 'next') return ready(state, userId, now);
    return { error: 'Unknown move.' };
  },

  advance(state, now) {
    if (state.ended || now < state.deadline) return { state, changed: false };
    if (state.phase === 'choose') return { state: bump(reveal(state, now)), changed: true };
    return { state: bump(nextRound(state, now)), changed: true };
  },

  remove(state, userId, now) {
    if (!state.players.some(player => player.id === userId)) return { state, changed: false };
    const picks = { ...state.picks };
    delete picks[userId];
    const seatLeft = seatOf(state) === userId;
    let next: DilemmaState = {
      ...state, picks,
      players: state.players.filter(player => player.id !== userId),
      standings: state.standings.filter(standing => standing.id !== userId),
      ready: state.ready.filter(id => id !== userId),
    };
    if (next.ended || !next.players.length) return { state: bump(next), changed: true };
    // The hot seat emptied: the round cannot be scored, so move straight on.
    if (seatLeft && next.phase === 'choose') next = nextRound(next, now);
    else if (next.phase === 'choose' && !waitingOn(next).length) next = reveal(next, now);
    else if (next.phase === 'reveal' && next.players.every(player => next.ready.includes(player.id))) next = nextRound(next, now);
    return { state: bump(next), changed: true };
  },

  rounds: state => state.cards.length,
  progressed: state => state.index >= 2,

  settle(state) {
    if (!state.ended) return null;
    const scores = Object.fromEntries(state.standings.map(standing => [standing.id, Math.round(standing.points / POINTS_PER_SCORE)]));
    return { scores, winners: topScorers(Object.fromEntries(state.standings.map(standing => [standing.id, standing.points]))) };
  },
};
