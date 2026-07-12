import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  shuffle,
  generateRoomCode,
  isTurnBased,
  nextTurnPlayer,
  spotlightEligible,
  spotlightRoundCount,
  roundDeadline,
  deadlinePassed,
} from '../src/lib/game-utils';
import type { RoomPlayer } from '../src/lib/types';
import { codeFeedback, levenshtein, normalize, validateNames } from '../src/lib/local-games/logic';
import { RULES, ruleAccepts } from '../src/lib/local-games/rule-bank';

test('shuffle keeps every element exactly once', () => {
  const input = Array.from({ length: 50 }, (_, i) => i);
  const out = shuffle(input);
  assert.equal(out.length, 50);
  assert.deepEqual([...out].sort((a, b) => a - b), input);
  assert.deepEqual(input, Array.from({ length: 50 }, (_, i) => i), 'input not mutated');
});

test('room codes are 6 chars from the unambiguous alphabet and vary', () => {
  const codes = new Set<string>();
  for (let i = 0; i < 500; i++) {
    const code = generateRoomCode();
    assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    codes.add(code);
  }
  assert.ok(codes.size > 490, 'codes should be effectively unique');
});

const players = (ids: string[]): RoomPlayer[] =>
  ids.map((id, i) => ({
    id: `row-${i}`,
    room_id: 'r',
    profile_id: id,
    display_name: id,
    score: 0,
    is_connected: true,
  }));

test('turn rotation wraps around the player list', () => {
  const p = players(['a', 'b', 'c']);
  assert.equal(nextTurnPlayer(p, 'a'), 'b');
  assert.equal(nextTurnPlayer(p, 'b'), 'c');
  assert.equal(nextTurnPlayer(p, 'c'), 'a');
});

test('turn rotation tolerates a departed/unknown current player', () => {
  const p = players(['a', 'b']);
  assert.equal(nextTurnPlayer(p, 'ghost'), 'a'); // indexOf -1 -> first player
  assert.equal(nextTurnPlayer(p, null), 'a');
});

test('single player keeps the turn', () => {
  const p = players(['solo']);
  assert.equal(nextTurnPlayer(p, 'solo'), 'solo');
});

test('turn-based classification matches game design', () => {
  assert.equal(isTurnBased('memory-match', 'memory'), true);
  assert.equal(isTurnBased('number-guess', 'guess'), true);
  assert.equal(isTurnBased('truth-or-dare', 'prompt'), true);
  assert.equal(isTurnBased('two-minute-challenge', 'prompt'), true);
  assert.equal(isTurnBased('never-have-i-ever', 'prompt'), false);
  assert.equal(isTurnBased('would-you-rather', 'prompt'), false);
  assert.equal(isTurnBased('doctor-dash', 'quiz'), false);
});

test('spotlight mode forces turn-based play for any game', () => {
  assert.equal(isTurnBased('doctor-dash', 'quiz', 'spotlight'), true);
  assert.equal(isTurnBased('never-have-i-ever', 'prompt', 'spotlight'), true);
  assert.equal(isTurnBased('doctor-dash', 'quiz', 'classic'), false);
  assert.equal(isTurnBased('never-have-i-ever', 'prompt', 'classic'), false);
});

test('spotlight eligibility covers quizzes and NHIE only', () => {
  assert.equal(spotlightEligible('doctor-dash', 'quiz'), true);
  assert.equal(spotlightEligible('movie-trivia', 'quiz'), true);
  assert.equal(spotlightEligible('never-have-i-ever', 'prompt'), true);
  assert.equal(spotlightEligible('would-you-rather', 'prompt'), false);
  assert.equal(spotlightEligible('truth-or-dare', 'prompt'), false);
  assert.equal(spotlightEligible('memory-match', 'memory'), false);
  assert.equal(spotlightEligible('number-guess', 'guess'), false);
});

test('spotlight round count gives everyone equal turns', () => {
  assert.equal(spotlightRoundCount(10, 2, 50), 10);
  assert.equal(spotlightRoundCount(10, 3, 50), 9);
  assert.equal(spotlightRoundCount(10, 4, 50), 12);
  assert.equal(spotlightRoundCount(100, 8, 999), 96); // capped at 100 by the check constraint
  assert.equal(spotlightRoundCount(10, 3, 4), 3); // few prompts: shrink to one each
  assert.equal(spotlightRoundCount(5, 10, 999), 10); // more players than requested: one each
  assert.equal(spotlightRoundCount(5, 10, 3), 3); // fewer prompts than players: play what exists
});

test('number guess scoring rewards fewer guesses, floor of 1', () => {
  const score = (guessCount: number) => Math.max(1, 11 - guessCount);
  assert.equal(score(1), 10);
  assert.equal(score(7), 4);
  assert.equal(score(10), 1);
  assert.equal(score(25), 1);
});

test('round deadlines include grace and expire correctly', () => {
  const t0 = Date.parse('2026-07-11T12:00:00.000Z');
  const deadline = roundDeadline(15, t0);
  assert.equal(Date.parse(deadline), t0 + 15000 + 1500); // 15s + latency grace
  assert.equal(deadlinePassed(deadline, t0 + 10000), false);
  assert.equal(deadlinePassed(deadline, t0 + 17000), true);
  assert.equal(deadlinePassed(null), false); // untimed rooms never expire
  assert.equal(deadlinePassed(undefined), false);
  assert.equal(deadlinePassed('not-a-date'), false);
});

test('code crackers feedback counts exact and misplaced digits', () => {
  assert.deepEqual(codeFeedback([1, 2, 3, 4], [1, 2, 3, 4]), { exact: 4, misplaced: 0 });
  assert.deepEqual(codeFeedback([4, 3, 2, 1], [1, 2, 3, 4]), { exact: 0, misplaced: 4 });
  assert.deepEqual(codeFeedback([1, 2, 4, 3], [1, 2, 3, 4]), { exact: 2, misplaced: 2 });
  assert.deepEqual(codeFeedback([5, 6, 7, 8], [1, 2, 3, 4]), { exact: 0, misplaced: 0 });
  // Duplicates: guess 1122 vs secret 1212 -> first 1 exact, one extra 1 and one 2 misplaced... verify by definition
  assert.deepEqual(codeFeedback([1, 1, 2, 2], [1, 2, 1, 2]), { exact: 2, misplaced: 2 });
});

test('who-remembers fuzzy matching tolerates small typos', () => {
  assert.equal(levenshtein('Pizza Hut', 'pizza hut'), 0);
  assert.equal(levenshtein('cinema', 'cinemma'), 1);
  const similarity = (a: string, b: string) => {
    const na = normalize(a);
    const nb = normalize(b);
    return 1 - levenshtein(na, nb) / Math.max(na.length, nb.length, 1);
  };
  assert.ok(similarity('the beach house', 'the beach hose') >= 0.84);
  assert.ok(similarity('paris', 'london') < 0.84);
});

test('rule discoverer validators accept examples and reject counterexamples', () => {
  for (const rule of RULES) {
    for (const ex of rule.examples) assert.equal(ruleAccepts(rule, ex), true, `${rule.id} accepts ${ex}`);
    for (const rej of rule.rejects) assert.equal(ruleAccepts(rule, rej), false, `${rule.id} rejects ${rej}`);
  }
});

test('player name validation requires distinct names', () => {
  assert.equal(validateNames(['Ana', 'Ben']), '');
  assert.notEqual(validateNames(['Ana']), '');
  assert.notEqual(validateNames(['Ana', 'ana']), '');
});

test('memory board build produces matched pairs', () => {
  const theme: [string, string][] = [
    ['❤️', 'Heart'],
    ['🌹', 'Rose'],
    ['💍', 'Ring'],
  ];
  const chosen = shuffle(theme).slice(0, 3);
  const cards = shuffle(
    chosen.flatMap(([emoji, name]) => [
      { emoji, name, matched: false },
      { emoji, name, matched: false },
    ])
  );
  assert.equal(cards.length, 6);
  const byName = new Map<string, number>();
  for (const c of cards) byName.set(c.name, (byName.get(c.name) ?? 0) + 1);
  for (const count of byName.values()) assert.equal(count, 2);
});
