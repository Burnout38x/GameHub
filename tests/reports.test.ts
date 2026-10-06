import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateReport } from '../src/lib/reports';
const valid = { kind: 'bug', subject: ' Timer froze ', description: 'The clock stopped after the second player answered.', roomCode: 'abc234', gameName: ' Quiz ' };
test('reports normalize context and preserve useful details', () => {
  const result = validateReport(valid);
  assert.deepEqual(result.data, { kind: 'bug', subject: 'Timer froze', description: valid.description, roomCode: 'ABC234', gameName: 'Quiz' });
});
test('reports reject invalid kinds, missing details, oversized text, and malformed room codes', () => {
  for (const value of [null, [], {}, { ...valid, kind: 'admin' }, { ...valid, subject: '   ' }, { ...valid, description: 'x'.repeat(3001) }, { ...valid, gameName: 'x'.repeat(101) }, { ...valid, roomCode: 'ABC1234' }, { ...valid, subject: 42 }]) assert.ok(validateReport(value).error);
});
test('reports allow optional context and each supported type', () => {
  for (const kind of ['bug', 'player', 'feedback']) {
    const result = validateReport({ ...valid, kind, roomCode: '', gameName: '' });
    assert.equal(result.data?.roomCode, null);
    assert.equal(result.data?.gameName, null);
    assert.equal(result.error, undefined);
  }
});
