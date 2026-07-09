import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shuffle, generateRoomCode, isTurnBased, nextTurnPlayer } from '../src/lib/game-utils';
import type { RoomPlayer } from '../src/lib/types';

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

test('number guess scoring rewards fewer guesses, floor of 1', () => {
  const score = (guessCount: number) => Math.max(1, 11 - guessCount);
  assert.equal(score(1), 10);
  assert.equal(score(7), 4);
  assert.equal(score(10), 1);
  assert.equal(score(25), 1);
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
