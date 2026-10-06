import './dom-environment';
import React from 'react';
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, fireEvent, cleanup } from '@testing-library/react';
import AccountDirectory from '../src/components/admin/AccountDirectory';
import { reportPeriod } from '../src/lib/admin-reports';
afterEach(cleanup);
test('usage periods include today and use UTC across month boundaries', () => {
  const now = new Date('2026-03-01T00:01:00Z');
  assert.deepEqual(reportPeriod('7', now), { days: 7, since: '2026-02-23T00:00:00.000Z' });
  assert.equal(reportPeriod('invalid', now).days, 30);
  assert.equal(reportPeriod('90', now).since, '2025-12-02T00:00:00.000Z');
});
test('account search and status combine, with a working empty-state reset', () => {
  const base = { role: 'player', createdAt: '2026-10-01T00:00:00Z', lastSignIn: null, providers: ['email'], played: 2, won: 1, points: 4 };
  const view = render(<AccountDirectory accounts={[{ ...base, id: 'a', username: 'Ada', email: 'ada@example.test', status: 'Confirmed' }, { ...base, id: 'b', username: 'Bayo', email: 'bayo@example.test', status: 'Unconfirmed' }]} />);
  fireEvent.change(view.getByLabelText('Search accounts on this page'), { target: { value: 'ADA@' } });
  assert.equal(view.queryByRole('heading', { name: 'Bayo' }), null);
  fireEvent.change(view.getByLabelText('Account status'), { target: { value: 'Unconfirmed' } });
  assert.ok(view.getByRole('heading', { name: 'No matching accounts' }));
  fireEvent.click(view.getByRole('button', { name: 'Clear filters' }));
  assert.ok(view.getByRole('heading', { name: 'Ada' }));assert.ok(view.getByRole('heading', { name: 'Bayo' }));
});
