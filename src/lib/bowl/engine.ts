import { isRecord, seeded, shuffled, topScorers, type LiveBase, type LiveEngine, type LiveUpdate } from '@/lib/live/types';
import { SECTION_IDS, type BowlQuestion, type SectionChoice } from './types';
import { poolFor, questionById } from './bank';
import {
  answerPoints, DEFAULT_SECONDS, MAX_QUESTIONS, MIN_QUESTIONS, READY_MS, REVEAL_MS,
  type BowlStanding, type BowlView,
} from './view';

/** Brain Bowl on the server. Holds the answers; phones only receive `view`. */

export interface BowlSetup { section: SectionChoice }
interface Entry { choice: number; ms: number; points: number; correct: boolean }
interface Slot { id: string; order: number[] }

export interface BowlState extends LiveBase {
  kind: 'bowl';
  seed: number;
  section: SectionChoice;
  questions: Slot[];
  index: number;
  phase: 'question' | 'reveal';
  seconds: number;
  startedAt: number;
  deadline: number;
  entries: Record<string, Entry>;
  cut: Record<string, number[]>;
  lifelines: string[];
  standings: BowlStanding[];
}

const sections: readonly string[] = ['mixed', ...SECTION_IDS];

/** The answer's position after the options were shuffled for this match. */
const answerAt = (slot: Slot) => slot.order.indexOf(0);
const isFinal = (state: BowlState) => state.index === state.questions.length - 1;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Picks a match: sections take turns in a mixed match, and questions ramp from warm-up to champion. */
export function pickQuestions(section: SectionChoice, difficulty: 'easy' | 'hard' | 'mixed', count: number, random: () => number): BowlQuestion[] {
  const pool = poolFor(section, difficulty);
  let picked: BowlQuestion[];
  if (section === 'mixed') {
    const groups = shuffled(SECTION_IDS, random).map(id => shuffled(pool.filter(question => question.section === id), random));
    picked = [];
    for (let round = 0; picked.length < count && groups.some(group => group.length > round); round++) {
      for (const group of groups) if (group[round] && picked.length < count) picked.push(group[round]);
    }
  } else picked = shuffled(pool, random).slice(0, count);
  return picked.map((question, order) => ({ question, order })).sort((a, b) => a.question.level - b.question.level || a.order - b.order).map(entry => entry.question);
}

function begin(state: BowlState, index: number, now: number): BowlState {
  const startedAt = now + READY_MS;
  return { ...state, index, phase: 'question', startedAt, deadline: startedAt + state.seconds * 1000, entries: {}, cut: {} };
}

function reveal(state: BowlState, now: number): BowlState {
  const standings = state.standings.map(standing => {
    const entry = state.entries[standing.id];
    if (!entry?.correct) return { ...standing, streak: 0 };
    const streak = standing.streak + 1;
    return { ...standing, points: standing.points + entry.points, streak, best: Math.max(standing.best, streak), correct: standing.correct + 1 };
  });
  return { ...state, phase: 'reveal', deadline: now + REVEAL_MS, standings };
}

const everyoneAnswered = (state: BowlState) => state.players.every(player => state.entries[player.id]);
const bump = (state: BowlState): BowlState => ({ ...state, version: state.version + 1 });

function answer(state: BowlState, userId: string, choice: unknown, now: number): LiveUpdate<BowlState> {
  if (state.phase !== 'question') return { error: 'This question is closed.' };
  if (now < state.startedAt) return { error: 'The question has not started yet.' };
  if (now > state.deadline) return { error: 'Time is up for this question.' };
  if (state.entries[userId]) return { error: 'You already locked in an answer.' };
  if (typeof choice !== 'number' || !Number.isInteger(choice) || choice < 0 || choice > 3) return { error: 'Pick one of the four answers.' };
  if (state.cut[userId]?.includes(choice)) return { error: 'Your 50/50 removed that answer.' };
  const slot = state.questions[state.index];
  const correct = choice === answerAt(slot);
  const standing = state.standings.find(entry => entry.id === userId)!;
  const ms = now - state.startedAt;
  const points = answerPoints(correct, state.deadline - now, state.seconds * 1000, standing.streak, isFinal(state));
  let next: BowlState = { ...state, entries: { ...state.entries, [userId]: { choice, ms, points, correct } } };
  if (everyoneAnswered(next)) next = reveal(next, now);
  return { state: bump(next), changed: true };
}

function lifeline(state: BowlState, userId: string, now: number): LiveUpdate<BowlState> {
  if (state.phase !== 'question' || now < state.startedAt || now > state.deadline) return { error: 'Use your 50/50 while a question is live.' };
  if (state.lifelines.includes(userId)) return { error: 'You already used your 50/50 this match.' };
  if (state.entries[userId]) return { error: 'You already answered this one.' };
  const slot = state.questions[state.index];
  const wrong = [0, 1, 2, 3].filter(position => position !== answerAt(slot));
  const cut = shuffled(wrong, seeded(state.seed ^ hash(userId) ^ state.index)).slice(0, 2).sort();
  return { state: bump({ ...state, lifelines: [...state.lifelines, userId], cut: { ...state.cut, [userId]: cut } }), changed: true };
}

export const bowlEngine: LiveEngine<BowlState, BowlSetup> = {
  type: 'bowl',
  minPlayers: 1,
  maxPlayers: 10,

  parseSetup(raw) {
    const section = isRecord(raw) && typeof raw.section === 'string' && sections.includes(raw.section) ? raw.section as SectionChoice : 'mixed';
    return { section };
  },

  create({ players, setup, difficulty, rounds, seconds, seed, now }) {
    const random = seeded(seed);
    const count = Math.max(MIN_QUESTIONS, Math.min(MAX_QUESTIONS, Math.round(rounds)));
    const picked = pickQuestions(setup.section, difficulty, count, random);
    if (picked.length < MIN_QUESTIONS) return { error: 'Not enough questions in this section yet.' };
    const state: BowlState = {
      kind: 'bowl', version: 1, players, ended: false, seed, section: setup.section,
      questions: picked.map(question => ({ id: question.id, order: shuffled([0, 1, 2, 3], random) })),
      index: 0, phase: 'question', seconds: Math.max(8, Math.min(60, seconds ?? DEFAULT_SECONDS)),
      startedAt: now, deadline: now, entries: {}, cut: {}, lifelines: [],
      standings: players.map(player => ({ id: player.id, name: player.name, points: 0, streak: 0, best: 0, correct: 0 })),
    };
    return begin(state, 0, now);
  },

  parse(raw) {
    if (!isRecord(raw) || raw.kind !== 'bowl' || !Array.isArray(raw.questions) || !Array.isArray(raw.players)) return null;
    const state = raw as unknown as BowlState;
    return state.questions.every(slot => questionById(slot.id)) ? state : null;
  },

  view(state, viewer, now): BowlView {
    const slot = state.questions[state.index];
    const question = questionById(slot.id)!;
    const live = state.phase === 'reveal' || now >= state.startedAt;
    const revealed = state.phase === 'reveal' || state.ended;
    const entry = state.entries[viewer];
    const counts = [0, 0, 0, 0];
    for (const result of Object.values(state.entries)) counts[result.choice]++;
    return {
      kind: 'bowl', version: state.version, section: state.section, index: state.index, total: state.questions.length,
      phase: state.phase, seconds: state.seconds, startedAt: state.startedAt, deadline: state.deadline, ended: state.ended,
      question: live ? { section: question.section, level: question.level, prompt: question.prompt, options: slot.order.map(index => question.options[index]), double: isFinal(state) } : null,
      cut: state.cut[viewer] ?? [],
      lifeline: !state.lifelines.includes(viewer),
      mine: entry ? { choice: entry.choice } : null,
      answered: Object.keys(state.entries),
      standings: [...state.standings].sort((a, b) => b.points - a.points),
      reveal: revealed ? {
        answer: answerAt(slot), fact: question.fact ?? null, counts,
        results: state.players.map(player => {
          const result = state.entries[player.id];
          return { id: player.id, choice: result?.choice ?? null, correct: !!result?.correct, points: result?.points ?? 0, ms: result?.ms ?? null };
        }),
      } : null,
    };
  },

  act(state, userId, action, now) {
    if (state.ended) return { error: 'This match is over.' };
    if (!state.players.some(player => player.id === userId)) return { error: 'You are not in this match.' };
    if (!isRecord(action) || action.question !== state.index) return { error: 'That question has moved on.' };
    if (action.type === 'answer') return answer(state, userId, action.choice, now);
    if (action.type === 'lifeline') return lifeline(state, userId, now);
    return { error: 'Unknown move.' };
  },

  advance(state, now) {
    if (state.ended || now < state.deadline) return { state, changed: false };
    if (state.phase === 'question') return { state: bump(reveal(state, now)), changed: true };
    if (isFinal(state)) return { state: bump({ ...state, ended: true }), changed: true };
    return { state: bump(begin(state, state.index + 1, now)), changed: true };
  },

  remove(state, userId, now) {
    if (!state.players.some(player => player.id === userId)) return { state, changed: false };
    const entries = { ...state.entries };
    delete entries[userId];
    let next: BowlState = {
      ...state, entries,
      players: state.players.filter(player => player.id !== userId),
      standings: state.standings.filter(standing => standing.id !== userId),
    };
    if (!next.ended && next.phase === 'question' && next.players.length && everyoneAnswered(next) && Object.keys(entries).length) next = reveal(next, now);
    return { state: bump(next), changed: true };
  },

  rounds: state => state.questions.length,
  progressed: state => state.index >= 2,

  settle(state) {
    if (!state.ended) return null;
    // Leaderboard points match the other quizzes: one per right answer. Match points pick the winner.
    const scores = Object.fromEntries(state.standings.map(standing => [standing.id, standing.correct]));
    const points = Object.fromEntries(state.standings.map(standing => [standing.id, standing.points]));
    return { scores, winners: topScorers(points) };
  },
};
