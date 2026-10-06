import './dom-environment';
import React from 'react';
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, fireEvent, cleanup } from '@testing-library/react';
import GamePicker from '../src/components/GamePicker';
import ThemeToggle from '../src/components/ThemeToggle';

afterEach(() => { cleanup(); localStorage.clear(); });

test('game draw produces a playable link and never immediately repeats', () => {
  const view = render(<GamePicker />);
  let previous = '';
  for (let i = 0; i < 12; i++) {
    fireEvent.click(view.getByRole('button'));
    const href = view.getByRole('link').getAttribute('href')!;
    assert.match(href, /^\/games\/local\/(know-your-partner|code-crackers|mystery-card|word-chain)$/);
    assert.notEqual(href, previous);
    previous = href;
  }
});

test('theme control restores document preference and saves both choices', () => {
  document.documentElement.dataset.theme = 'light';
  const view = render(<ThemeToggle />);
  fireEvent.click(view.getByRole('button', { name: 'Switch to dark theme' }));
  assert.equal(document.documentElement.dataset.theme, 'dark');
  assert.equal(localStorage.getItem('gamehub-theme'), 'dark');
  fireEvent.click(view.getByRole('button', { name: 'Switch to bright theme' }));
  assert.equal(document.documentElement.dataset.theme, 'light');
  assert.equal(localStorage.getItem('gamehub-theme'), 'light');
});

test('blocked theme storage still changes theme and reports persistence failure', (t) => {
  document.documentElement.dataset.theme = 'dark';
  t.mock.method(Object.getPrototypeOf(localStorage), 'setItem', () => { throw new Error('blocked'); });
  const view = render(<ThemeToggle />);
  fireEvent.click(view.getByRole('button', { name: 'Switch to bright theme' }));
  assert.equal(document.documentElement.dataset.theme, 'light');
  assert.match(view.getByRole('status').textContent ?? '', /could not save/);
});
