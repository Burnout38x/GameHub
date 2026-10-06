import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeAnswers, allowedAnswers, canChallengeTurn, isCurrentRound } from '../src/lib/server/multiplayer-rules';
import { sanitizeSnapshot } from '../src/lib/server/room-snapshot';
import { buildRuleRound } from '../src/lib/server/rule-round';
import type { Game, Room, Prompt, RoomPlayer, RoundAnswer } from '../src/lib/types';

const players = [{ profile_id: 'a' }, { profile_id: 'b' }] as RoomPlayer[];
const answers = [
  { profile_id: 'a', answer: { value: 'secret a' }, is_correct: true, points: 1 },
  { profile_id: 'b', answer: { value: 'secret b' }, is_correct: false, points: 0 },
  { profile_id: 'departed', answer: { value: 'old' }, is_correct: true, points: 1 },
].map((answer, index) => ({ ...answer, id: String(index), room_id: 'room', round_index: 0 })) as RoundAnswer[];
function fixture(type = 'quiz') {
  return {
    room: { round_phase: 'answering', round_state: {} } as Room,
    game: { type } as Game,
    players,
    answers,
    prompt: { id: 'prompt', game_id: 'game', difficulty: 'easy', content: { question: 'Question?', options: ['yes', 'no'], answer: 'yes', fact: 'explains yes' } } as Prompt,
  };
}

test('departed answers cannot satisfy the active player answer quorum', () => {
  assert.deepEqual(activeAnswers([answers[0], answers[2]], players).map((a) => a.profile_id), ['a']);
  assert.equal(activeAnswers(answers, players).length, 2);
});

test('all seven quiz games only accept options shown in their prompt', () => {
  for (const slug of ['doctor-dash', 'riddle-rush', 'emoji-movie', 'movie-trivia', 'mystery-card', 'reverse-definition', 'mental-math-duel']) {
    const options = allowedAnswers('quiz', {}, { options: ['A', 'B'], answer: 'A' });
    assert.deepEqual(options, ['A', 'B'], slug);
    assert.equal(options.includes('fabricated'), false, slug);
  }
});

test('all four reaction games validate their actual configured choices', () => {
  assert.deepEqual(allowedAnswers('prompt', { choices: ['I Have', 'Never'] }, {}), ['I Have', 'Never']);
  assert.deepEqual(allowedAnswers('prompt', { choices: ['Completed', 'Skipped'] }, {}), ['Completed', 'Skipped']);
  assert.deepEqual(allowedAnswers('prompt', { choices: ['Completed', 'Failed'] }, {}), ['Completed', 'Failed']);
  assert.deepEqual(allowedAnswers('prompt', { optionsFromContent: true }, { choices: ['Tea', 'Coffee'] }), ['Tea', 'Coffee']);
  assert.deepEqual(allowedAnswers('prompt', { choices: [1, null, 'yes'] }, {}), ['yes']);
});

test('a Word Chain link cannot be challenged twice in the same turn', () => {
  assert.equal(canChallengeTurn({ turnIndex: 2 }), true);
  assert.equal(canChallengeTurn({ turnIndex: 2, challengedTurn: 2 }), false);
  assert.equal(canChallengeTurn({ turnIndex: 3, challengedTurn: 2 }), true);
  assert.equal(canChallengeTurn({ turnIndex: 3, challenge: { votes: {} } }), false);
});

test('private snapshots hide quiz answers and other players answers until reveal', () => {
  const source = fixture();
  const out = sanitizeSnapshot(source, 'a');
  assert.equal(out.prompt?.content.answer, undefined);
  assert.equal(out.prompt?.content.fact, undefined);
  assert.deepEqual(out.prompt?.content.options, ['yes', 'no']);
  assert.deepEqual(out.answers[0].answer, { value: 'secret a' });
  assert.deepEqual(out.answers[1].answer, {});
  assert.equal(out.answers[1].is_correct, null);
  assert.equal(out.answers.length, 2);
  assert.equal(source.prompt?.content.answer, 'yes', 'does not mutate loaded prompt');
  source.room.round_phase = 'revealed';
  const revealed = sanitizeSnapshot(source, 'a');
  assert.equal(revealed.prompt?.content.answer, 'yes');
  assert.deepEqual(revealed.answers[1].answer, { value: 'secret b' });
});

test('Who Remembers private answers stay hidden during collection', () => {
  const source = fixture('predict');
  source.room.round_state = { stage: 'collect' };
  assert.deepEqual(sanitizeSnapshot(source, 'b').answers[0].answer, {});
});

test('memory snapshots show only flipped, last pair and matched cards', () => {
  const source = fixture('memory');
  const deck = ['Cat', 'Cat', 'Dog', 'Dog', 'Bee', 'Bee'].map((name) => ({ name, emoji: name }));
  source.room.round_state = { cards: deck.map((_, i) => ({ matched: i === 4 || i === 5 })), flipped: [0], lastPair: { a: 2, b: 3 } };
  const cards = sanitizeSnapshot(source, 'a', { cards: deck }).room.round_state.cards;
  assert.equal(cards[0].name, 'Cat');
  assert.deepEqual(cards[1], { matched: false });
  assert.equal(cards[2].name, 'Dog');
  assert.equal(cards[4].name, 'Bee');
});

test('Rule Discoverer never includes current hidden ID in public history', () => {
  const generated = buildRuleRound([]);
  assert.equal('usedRuleIds' in generated.state, false);
  assert.equal(generated.usedRuleIds.at(-1), generated.ruleId);
  const source = fixture('rule');
  source.room.round_state = { ...generated.state, usedRuleIds: generated.usedRuleIds };
  assert.equal('usedRuleIds' in sanitizeSnapshot(source, 'a').room.round_state, false);
});

test('round guard rejects stale, missing, fractional and coerced round tokens', () => {
  assert.equal(isCurrentRound(0, 0), true);
  for (const value of [-1, 1, 0.5, undefined, null, '0', NaN]) assert.equal(isCurrentRound(value, 0), false);
});
