import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePlayProgress, validWeeklyGoal } from '../src/lib/progress';
const now = new Date('2026-10-06T13:00:00Z');
test('daily streak deduplicates days, sums weekly games, and survives until next UTC midnight', () => {
  const progress = calculatePlayProgress([{ date: '2026-10-04', games: 2 }, { date: '2026-10-05', games: 1 }, { date: '2026-10-05', games: 3 }], now);
  assert.equal(progress.current, 2); assert.equal(progress.best, 2); assert.equal(progress.weeklyGames, 4); assert.equal(progress.playedToday, false);
  assert.equal(progress.week[0].date, '2026-10-05'); assert.equal(progress.week[1].today, true);
});
test('missing a complete UTC day resets current but keeps best', () => {
  const days = [{ date: '2026-10-03', games: 1 }, { date: '2026-10-04', games: 1 }];
  const progress = calculatePlayProgress(days, now);
  assert.equal(progress.current, 0); assert.equal(progress.best, 2); assert.equal(progress.weeklyGames, 0);
});
test('UTC midnight and year boundary keep the right week and streak', () => {
  const days = ['2025-12-31', '2026-01-01'].map(date => ({ date, games: 1 }));
  assert.equal(calculatePlayProgress(days, new Date('2026-01-02T23:59:59Z')).current, 2);
  const next = calculatePlayProgress(days, new Date('2026-01-03T00:00:00Z'));
  assert.equal(next.current, 0); assert.equal(next.week[0].date, '2025-12-29');
});
test('empty, invalid, zero and future activity cannot build a streak', () => {
  assert.equal(calculatePlayProgress([], now).best, 0);
  const result = calculatePlayProgress([{date:'bad',games:1},{date:'2026-10-06',games:0},{date:'2026-10-07',games:5}],now);
  assert.equal(result.current, 0); assert.equal(result.weeklyGames, 0);
});
test('weekly goal rejects coerced, fractional and unbounded values', () => {
  for (const value of [0, 51, 1.5, '3', null, NaN, Infinity]) assert.equal(validWeeklyGoal(value), false);
  for (const value of [1, 3, 50]) assert.equal(validWeeklyGoal(value), true);
});
