import { NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import { pickQuestions } from '@/lib/bowl/engine';
import { SECTION_IDS, type SectionChoice } from '@/lib/bowl/types';
import { seeded, shuffled } from '@/lib/live/types';
import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';

const MAX_COUNT = 20;
const DIFFICULTIES = ['easy', 'mixed', 'hard'] as const;

/**
 * GET /api/bowl/deck?section=&difficulty=&count= — a shuffled deck for same-device Brain Bowl.
 * The answers travel with the deck because both players share one screen; online matches
 * never use this route and keep their answers on the server.
 */
export async function GET(req: Request) {
  // Decks carry answers, so only signed-in players may deal them (no anonymous scraping of the bank).
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: 'Log in to play Brain Bowl.' }, { status: 401 });
  const params = new URL(req.url).searchParams;
  const sectionParam = params.get('section') ?? 'mixed';
  const section: SectionChoice = sectionParam === 'mixed' || (SECTION_IDS as string[]).includes(sectionParam) ? sectionParam as SectionChoice : 'mixed';
  const difficultyParam = params.get('difficulty');
  const difficulty = DIFFICULTIES.find(level => level === difficultyParam) ?? 'mixed';
  const count = Math.max(5, Math.min(MAX_COUNT, Number.parseInt(params.get('count') ?? '12', 10) || 12));
  const random = seeded(randomInt(1, 2147483647));
  const deck = pickQuestions(section, difficulty, count, random).map(question => {
    const order = shuffled([0, 1, 2, 3], random);
    return { section: question.section, level: question.level, prompt: question.prompt, options: order.map(index => question.options[index]), answer: order.indexOf(0), fact: question.fact ?? null };
  });
  return NextResponse.json({ deck }, { headers: { 'Cache-Control': 'no-store' } });
}
