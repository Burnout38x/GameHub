/**
 * Seeds the three online ports of the Pass & Play games as quiz games:
 * Mystery Card, Reverse Definition, and Mental Math (generated problems).
 *
 * Usage: npx tsx scripts/seed-online-ports.ts
 * Safe to re-run: upserts the games and replaces their prompts.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { MYSTERY_QUESTIONS } from '../src/lib/local-games/mystery-questions';
import { REVERSE_CLUES } from '../src/lib/local-games/reverse-definition-bank';
import { makeProblem } from '../src/lib/local-games/math-gen';
import { PARTNER_QUESTIONS } from '../src/lib/local-games/partner-questions';
import { MEMORY_PROMPTS } from '../src/lib/local-games/who-remembers-bank';

const envPath = path.join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

interface SeedGame {
  slug: string;
  name: string;
  description: string;
  emoji: string;
  type: string;
  config: Record<string, unknown>;
  sort_order: number;
}

const GAMES: SeedGame[] = [
  {
    slug: 'mystery-card',
    name: 'Mystery Card',
    description: 'A hidden living or non-living thing is described — identify it before the timer runs out.',
    emoji: '🕵️',
    type: 'quiz',
    config: {},
    sort_order: 110,
  },
  {
    slug: 'reverse-definition',
    name: 'Reverse Definition',
    description: 'Ordinary words described in strange, indirect ways. Decode the definition first.',
    emoji: '🔎',
    type: 'quiz',
    config: {},
    sort_order: 120,
  },
  {
    slug: 'mental-math-duel',
    name: 'Mental Math',
    description: 'Generated arithmetic, sequences and powers. The fastest brains take the round.',
    emoji: '⚡',
    type: 'quiz',
    config: {},
    sort_order: 130,
  },
  {
    slug: 'know-your-partner',
    name: 'Know Your Partner',
    description: 'Answer privately, then see how accurately your partner predicts your choices. Roles alternate.',
    emoji: '💞',
    type: 'predict',
    config: {},
    sort_order: 140,
  },
  {
    slug: 'who-remembers',
    name: 'Who Remembers It Better?',
    description: 'Both partners answer the same memory question privately — matching answers score for you both.',
    emoji: '📸',
    type: 'predict',
    config: { freeText: true },
    sort_order: 150,
  },
  {
    slug: 'code-crackers',
    name: 'Code Crackers',
    description: 'Take turns testing a secret digit code. Exact and misplaced clues — first to crack it scores.',
    emoji: '🔐',
    type: 'code',
    config: { maxTurns: 18 },
    sort_order: 160,
  },
  {
    slug: 'rule-discoverer',
    name: 'Rule Discoverer',
    description: 'A secret word or number rule. Test examples, study the evidence, identify it first.',
    emoji: '🧩',
    type: 'rule',
    config: {},
    sort_order: 170,
  },
  {
    slug: 'word-chain',
    name: 'Word Association Chain',
    description: 'Keep the chain alive — repeats are blocked and weak connections can be challenged to a vote.',
    emoji: '🔗',
    type: 'chain',
    config: {
      starters: ['ocean', 'music', 'school', 'fire', 'dream', 'coffee', 'moon', 'travel', 'garden', 'money', 'movie', 'family', 'summer', 'phone', 'rain'],
    },
    sort_order: 180,
  },
];

// The engine supports easy/hard; fold medium into easy and expert into hard.
const toEngineDifficulty = (d: string) => (d === 'easy' || d === 'medium' ? 'easy' : 'hard');

async function main() {
  const counts: Record<string, number> = {};
  for (const game of GAMES) {
    const { data: row, error } = await supabase
      .from('games')
      .upsert(game, { onConflict: 'slug' })
      .select('id')
      .single();
    if (error || !row) throw new Error(`upsert ${game.slug}: ${error?.message}`);

    let prompts: { game_id: string; difficulty: string; content: Record<string, unknown> }[] = [];
    if (game.slug === 'mystery-card') {
      prompts = MYSTERY_QUESTIONS.map((q) => ({
        game_id: row.id,
        difficulty: toEngineDifficulty(q.difficulty),
        content: { question: q.clue, answer: q.answer, options: q.options },
      }));
    } else if (game.slug === 'reverse-definition') {
      prompts = REVERSE_CLUES.map((q) => ({
        game_id: row.id,
        difficulty: toEngineDifficulty(q.difficulty),
        content: { question: q.clue, answer: q.answer, options: q.options },
      }));
    } else if (game.slug === 'mental-math-duel') {
      const seen = new Set<string>();
      for (const level of ['easy', 'medium', 'hard'] as const) {
        let made = 0;
        while (made < 20) {
          const p = makeProblem(level);
          if (seen.has(p.text)) continue;
          seen.add(p.text);
          prompts.push({
            game_id: row.id,
            difficulty: level === 'hard' ? 'hard' : 'easy',
            content: { question: p.text, answer: String(p.answer), options: p.options.map(String) },
          });
          made++;
        }
      }
    } else if (game.slug === 'know-your-partner') {
      prompts = PARTNER_QUESTIONS.map((q) => ({
        game_id: row.id,
        difficulty: 'easy',
        content: { question: q.text, options: q.options, category: q.category },
      }));
    } else if (game.slug === 'who-remembers') {
      prompts = MEMORY_PROMPTS.map((q) => ({
        game_id: row.id,
        difficulty: 'easy',
        content: { question: q.text, category: q.category },
      }));
    }

    if (prompts.length > 0) {
      await supabase.from('prompts').delete().eq('game_id', row.id);
      const { error: insErr } = await supabase.from('prompts').insert(prompts);
      if (insErr) throw new Error(`insert prompts ${game.slug}: ${insErr.message}`);
    }
    counts[game.slug] = prompts.length;
  }
  console.log('Seeded online games:', counts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
