import './dom-environment';
import React from 'react';
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import ThemePicker from '../src/components/ThemePicker';
import ThemeToggle from '../src/components/ThemeToggle';
import { THEMES, THEME_BOOTSTRAP, normalizeTheme } from '../src/lib/themes';

afterEach(() => { cleanup(); localStorage.clear(); document.documentElement.dataset.theme = 'dark'; });

test('all four themes can be selected and restored by the pre-paint bootstrap', () => {
  const view = render(<ThemePicker />);
  for (const theme of THEMES) {
    const button = view.getByRole('button', { name: new RegExp(theme.name) });
    fireEvent.click(button);
    assert.equal(button.getAttribute('aria-pressed'), 'true');
    assert.equal(localStorage.getItem('gamehub-theme'), theme.id);
    document.documentElement.dataset.theme = '';
    new Function(THEME_BOOTSTRAP)();
    assert.equal(document.documentElement.dataset.theme, theme.id);
    assert.match(view.getByRole('status').textContent!, /Saved on this device/);
  }
});

test('picker and quick toggle stay in sync, including cross-tab theme changes', () => {
  const view = render(<><ThemePicker /><ThemeToggle /></>);
  fireEvent.click(view.getByRole('button', { name: /Neon arcade/ }));
  fireEvent.click(view.getByRole('button', { name: 'Switch to bright theme' }));
  assert.equal(view.getByRole('button', { name: /Daylight/ }).getAttribute('aria-pressed'), 'true');
  act(() => window.dispatchEvent(new window.StorageEvent('storage', { key: 'gamehub-theme', newValue: 'ocean' })));
  assert.equal(document.documentElement.dataset.theme, 'ocean');
  assert.equal(view.getByRole('button', { name: /Ocean lounge/ }).getAttribute('aria-pressed'), 'true');
});

test('invalid stored themes safely fall back to Game night', () => {
  assert.equal(normalizeTheme('invalid'), 'dark');
  localStorage.setItem('gamehub-theme', '<script>');
  new Function(THEME_BOOTSTRAP)();
  assert.equal(document.documentElement.dataset.theme, 'dark');
});

test('theme picker stays usable when storage is unavailable', (t) => {
  t.mock.method(Object.getPrototypeOf(localStorage), 'setItem', () => { throw new Error('blocked'); });
  const view = render(<ThemePicker />);
  fireEvent.click(view.getByRole('button', { name: /Ocean lounge/ }));
  assert.equal(document.documentElement.dataset.theme, 'ocean');
  assert.match(view.getByRole('status').textContent!, /could not save/);
});
