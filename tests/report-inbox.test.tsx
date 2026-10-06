import './dom-environment';
import React, { act } from 'react';
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup, fireEvent, type RenderResult } from '@testing-library/react';
import ReportInbox from '../src/app/admin/reports/inbox/report-inbox';
afterEach(cleanup);
test('admin inbox resolves reports and refreshes its open list', async t => {
  let resolved = false;
  const report = { id: 'test-id', reporter_id: 'player-id', kind: 'bug', subject: 'Timer did not start', description: 'The timer never started after everyone joined.', status: 'open', created_at: '2026-10-06T12:00:00Z' };
  t.mock.method(globalThis, 'fetch', async (_url: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'PATCH') { assert.deepEqual(JSON.parse(String(init.body)), { id: 'test-id', status: 'resolved' }); resolved = true; return Response.json({ ok: true }); }
    return Response.json({ reports: resolved ? [] : [report], total: resolved ? 0 : 1 });
  });
  let view!: RenderResult;
  await act(async () => { view = render(<ReportInbox />); });
  assert.ok(view.getByText(report.subject));
  await act(async () => { fireEvent.click(view.getByRole('button', { name: 'Mark resolved' })); });
  assert.ok(view.getByText('Report resolved.'));
  assert.ok(view.getByText('No open reports'));
});
test('admin inbox surfaces failures and retry recovers', async t => {
  let attempts = 0;
  t.mock.method(globalThis, 'fetch', async () => { attempts++; if (attempts === 1) throw new Error('Offline'); return Response.json({ reports: [], total: 0 }); });
  let view!: RenderResult;
  await act(async () => { view = render(<ReportInbox />); });
  assert.match(view.getByRole('alert').textContent || '', /Offline/);
  await act(async () => { fireEvent.click(view.getByRole('button', { name: 'Retry loading' })); });
  assert.ok(view.getByText('No open reports'));
});
