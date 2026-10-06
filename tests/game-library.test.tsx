import './dom-environment';
import React from 'react';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render, fireEvent, cleanup } from '@testing-library/react';
import GameLibrary from '../src/components/GameLibrary';
import { LOCAL_GAMES } from '../src/lib/local-games/catalog';
import { gameCategory, matchesGame, type LibraryFilters } from '../src/lib/game-library';

const defaults: LibraryFilters = { search: '', category: 'all', audience: 'all', mode: 'all' };
const online = [
  { id: '1', slug: 'mental-math-duel', name: 'Mental Math', description: 'Fast arithmetic puzzles.', emoji: '⚡', type: 'quiz' },
  { id: '2', slug: 'know-your-partner', name: 'Know Your Partner', description: 'Predict your partner’s choices.', emoji: '💞', type: 'predict' },
  { id: '3', slug: 'truth-or-dare', name: 'Truth or Dare', description: 'Answer or do a dare.', emoji: '😈', type: 'prompt' },
];

test('every seeded online and local game has an explicit play category', () => {
  const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  const seeds = schema.slice(schema.indexOf('insert into public.games'));
  const slugs = [...seeds.matchAll(/^\s*\('([^']+)'/gm)].map(match => match[1]);
  assert.equal(slugs.length, 18);
  for (const slug of [...slugs, ...LOCAL_GAMES.map(game => game.slug)]) {
    assert.ok(gameCategory({ slug, name: '', description: '' }), `Missing category for ${slug}`);
  }
  assert.equal(gameCategory(online[0]), 'logic', 'Arithmetic is not categorized as trivia just because it uses the quiz engine');
  assert.equal(gameCategory(online[2]), 'party');
});

test('audience picks exclude relationship and dare prompts from family puzzles and unknown content', () => {
  const family = { ...defaults, audience: 'family' as const };
  assert.ok(matchesGame(online[0], family, 'online'));
  assert.equal(matchesGame(online[1], family, 'online'), false);
  assert.equal(matchesGame(online[2], family, 'online'), false);
  assert.equal(matchesGame({ slug: 'new-game', name: 'New', description: '', type: 'quiz' }, family, 'online'), false);
  assert.equal(matchesGame(online[1], { ...defaults, audience: 'groups' }, 'online'), false);
});

test('search, category, audience and play mode combine without changing the source catalogs', () => {
  const filters: LibraryFilters = { search: '  MATH arithmetic ', category: 'logic', audience: 'family', mode: 'online' };
  assert.ok(matchesGame(online[0], filters, 'online'));
  assert.equal(matchesGame(online[0], filters, 'local'), false);
  assert.equal(matchesGame(online[0], { ...filters, category: 'trivia' }, 'online'), false);
  assert.equal(matchesGame(online[0], { ...filters, search: 'missing' }, 'online'), false);
  assert.equal(online.length, 3);
});

test('library filters show accurate per-mode counts, preserve launch links, and recover from empty results', t => {
  const view = render(<GameLibrary online={online} local={LOCAL_GAMES} />);
  t.after(cleanup);
  fireEvent.change(view.getByLabelText('What feels fun?'), { target: { value: 'logic' } });
  assert.match(view.getByRole('status').textContent ?? '', /4 games/);
  assert.ok(view.getByRole('button', { name: 'Online rooms 1' }));
  assert.ok(view.getByRole('button', { name: 'Pass & play 3' }));
  fireEvent.click(view.getByRole('button', { name: 'Pass & play 3' }));
  assert.equal(view.queryByRole('heading', { name: /Meet in a game room/ }), null);
  assert.equal(view.getByRole('link', { name: 'Play Code Crackers on one device' }).getAttribute('href'), '/games/local/code-crackers');
  fireEvent.change(view.getByLabelText('Find a game'), { target: { value: 'not a real game' } });
  assert.ok(view.getByRole('heading', { name: 'No games found' }));
  fireEvent.click(view.getByRole('button', { name: 'Show all games' }));
  assert.equal((view.getByLabelText('Find a game') as HTMLInputElement).value, '');
  assert.equal((view.getByLabelText('What feels fun?') as HTMLSelectElement).value, 'all');
  assert.equal(view.getByRole('button', { name: 'All ways to play 11' }).getAttribute('aria-pressed'), 'true');
  assert.equal(view.getByRole('link', { name: 'Create Mental Math room' }).getAttribute('href'), '/rooms/new?game=mental-math-duel');
});

test('navigation search initializes both catalogs and can be cleared without losing games', t => {
  const view = render(<GameLibrary online={online} local={LOCAL_GAMES} initialSearch="mental math" />);
  t.after(cleanup);
  assert.equal((view.getByLabelText('Find a game') as HTMLInputElement).value, 'mental math');
  assert.ok(view.getByRole('link', { name: 'Create Mental Math room' }));
  assert.ok(view.getByRole('link', { name: 'Play Mental Math Duel on one device' }));
  assert.equal(view.queryByRole('link', { name: 'Create Truth or Dare room' }), null);
  fireEvent.click(view.getByRole('button', { name: 'Reset filters' }));
  assert.ok(view.getByRole('link', { name: 'Create Truth or Dare room' }));
});
