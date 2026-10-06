import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAssociationWord, memoryMatch, normalize, rankPlayers, resolveWordChallenge, sampleQuestions, validateNames } from '../src/lib/local-games/logic';
import { RULES, ruleAccepts } from '../src/lib/local-games/rule-bank';
import { REVERSE_CLUES } from '../src/lib/local-games/reverse-definition-bank';
import { MYSTERY_QUESTIONS } from '../src/lib/local-games/mystery-questions';
import { makeProblem } from '../src/lib/local-games/math-gen';
import { PARTNER_QUESTIONS } from '../src/lib/local-games/partner-questions';

test('question deck handles empty and single clue pools and requested count', () => {
  assert.deepEqual(sampleQuestions([], 20), []);
  assert.deepEqual(sampleQuestions(['only'], 3), ['only', 'only', 'only']);
  for (let trial = 0; trial < 20; trial++) {
    const deck = sampleQuestions(['one', 'two', 'three'], 20);
    assert.equal(deck.length, 20);
    deck.forEach((clue, i) => { if (i) assert.notEqual(clue, deck[i - 1]); });
    assert.equal(new Set(deck.slice(0, 3)).size, 3);
  }
});

test('reverse definitions fulfill every setup difficulty and count', () => {
  for (const difficulty of ['easy', 'medium', 'hard', 'expert', 'mixed']) {
    const pool = REVERSE_CLUES.filter((q) => difficulty === 'mixed' || q.difficulty === difficulty);
    for (const count of [10, 15, 20]) {
      const deck = sampleQuestions(pool, count);
      assert.equal(deck.length, count);
      assert.ok(deck.every((q) => q.options.includes(q.answer)));
    }
  }
});

test('mystery card filters have valid clues and full six-player turns', () => {
  for (const difficulty of ['easy', 'medium', 'hard', 'expert', 'mixed']) {
    for (const category of ['living', 'nonliving', 'all']) {
      const pool = MYSTERY_QUESTIONS.filter((q) => (difficulty === 'mixed' || q.difficulty === difficulty) && (category === 'all' || q.category === category));
      assert.ok(pool.length > 0);
      const deck = sampleQuestions(pool, 42);
      assert.equal(deck.length, 42);
      for (const q of deck) {
        assert.equal(q.options.filter((answer) => answer === q.answer).length, 1);
        assert.equal(new Set(q.options).size, q.options.length);
      }
    }
  }
});

test('memory matching preserves non-Latin answers and suggests rather than forces fuzzy matches', () => {
  assert.equal(normalize('  CAFÉ  '), 'café');
  assert.equal(memoryMatch('北京', '東京'), 'different');
  assert.equal(memoryMatch('🍕', '🍔'), 'different');
  assert.equal(memoryMatch('🍕', '🍕'), 'exact');
  assert.equal(memoryMatch('cinema', 'cinemma'), 'similar');
  assert.equal(memoryMatch('Pizza Hut', 'pizza hut'), 'exact');
  assert.equal(memoryMatch('!!!', '???'), 'different');
});

test('rule discoverer rejects invalid domain and unsafe values', () => {
  const accepts = (id: string, value: string) => ruleAccepts(RULES.find((r) => r.id === id)!, value);
  assert.equal(accepts('pow2', '4294967297'), false);
  assert.equal(accepts('pow2', '1024'), true);
  assert.equal(accepts('pow2', '1025'), false);
  assert.equal(accepts('prime', '999999999999999999999999999999'), false);
  assert.equal(accepts('even', ''), false);
  assert.equal(accepts('sum10', '1e9'), false);
  assert.equal(accepts('pal', '1221'), false);
  assert.equal(accepts('double', 'coffee!!!'), false);
  for (const rule of RULES) {
    for (const value of rule.examples) assert.equal(ruleAccepts(rule, value), true, `${rule.id}: ${value}`);
    for (const value of rule.rejects) assert.equal(ruleAccepts(rule, value), false, `${rule.id}: ${value}`);
  }
});

test('competitive results give tied players equal ranks', () => {
  assert.deepEqual(rankPlayers(['A', 'B', 'C'], [20, 20, 10]).map((p) => p.rank), [1, 1, 3]);
  assert.deepEqual(rankPlayers(['A', 'B'], [0, 0]).map((p) => p.rank), [1, 1]);
});

test('word chain requires a single word and supports accented letters', () => {
  for (const word of ['ocean', 'café', '東京', 'ice-cream']) assert.ok(isAssociationWord(word));
  for (const word of ['123', 'two words', 'a', '!!!']) assert.equal(isAssociationWord(word), false);
  assert.notEqual(validateNames(['Ana', ' Ana ']), '');
  assert.notEqual(validateNames(['Ana', ' ']), '');
});

test('partner question choices remain distinct for private answers and guesses', () => {
  assert.ok(PARTNER_QUESTIONS.length >= 60);
  for (const question of PARTNER_QUESTIONS) {
    assert.ok(question.text.trim());
    assert.equal(new Set(question.options).size, question.options.length);
    assert.ok(question.options.length >= 2);
  }
});

test('mental math generated puzzles have the correct distinct answer options', () => {
  for (const difficulty of ['easy', 'medium', 'hard', 'mixed']) {
    for (let i = 0; i < 100; i++) {
      const q = makeProblem(difficulty);
      assert.equal(new Set(q.options).size, 4);
      assert.equal(q.options.filter((a) => a === q.answer).length, 1);
      if (q.type === 'Number sequence') {
        const values = q.text.split(', ').slice(0, 4).map(Number);
        assert.equal(q.answer, values[3] + values[1] - values[0]);
      } else if (q.type === 'Pattern sum') {
        const n = Number(q.text.match(/… \+ (\d+)/)![1]);
        assert.equal(q.answer, n * (n + 1) / 2);
      } else {
        const expr = q.text.replace(' = ?', '').replaceAll('×', '*').replaceAll('−', '-').replace('²', '**2').replace('³', '**3');
        assert.match(expr, /^[\d\s()+*\-]+$/);
        assert.equal(q.answer, Function(`return (${expr})`)());
      }
    }
  }
});


test('word challenges reverse the entire award and require a strict majority', () => {
  assert.deepEqual(resolveWordChallenge([32, 0, 7], 0, 1, 22, ['weak']), { succeeded: true, scores: [10, 10, 7] });
  assert.deepEqual(resolveWordChallenge([32, 0, 7], 0, 1, 22, ['weak', 'strong']), { succeeded: false, scores: [37, 0, 7] });
});
