import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { replayPocketRun, scorePocketBoard } from '@/lib/pocket-paradise';
import { isSameOriginRequest } from '@/lib/server/request-origin';
import { jsonError } from '@/lib/server/room-actions';

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) return jsonError('Request origin not allowed', 403);
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return jsonError('Sign in to save your progress', 401);
  const raw = await req.text();
  if (raw.length > 4096) return jsonError('Run is too large', 413);
  let body;
  try { body = JSON.parse(raw); } catch { return jsonError('Invalid run'); }
  if (!body || typeof body !== 'object' || typeof body.seed !== 'string' || body.seed.length > 100 || !['daily', 'standard'].includes(body.mode) || !Array.isArray(body.moves) || body.moves.length !== 20) return jsonError('Complete a standard or daily run first');
  const rulesVersion = body.rulesVersion === undefined ? 1 : body.rulesVersion;
  if (rulesVersion !== 1 && rulesVersion !== 2) return jsonError('Unsupported neighborhood rules');
  if (rulesVersion === 2 && body.seed.length > 97) return jsonError('Invalid run seed');
  if (body.mode === 'daily' && !/^\d{4}-\d{2}-\d{2}$/.test(body.seed)) return jsonError('Invalid daily seed');
  if (body.mode === 'standard' && !/^[a-zA-Z0-9-]{1,100}$/.test(body.seed)) return jsonError('Invalid run seed');
  let score: number;
  try {
    const run = replayPocketRun(body.seed, body.mode, body.moves, rulesVersion);
    score = scorePocketBoard(run.board, run.seed, rulesVersion).total;
  } catch { return jsonError('This run could not be verified. Start a new run.'); }
  const { data, error } = await createAdminClient().rpc('record_pocket_completion', {
    actor_id: user.id, run_seed: rulesVersion === 2 ? `v2:${body.seed}` : body.seed, run_mode: body.mode, verified_score: score,
  });
  if (error) return jsonError(error.message.includes('limit reached') ? 'Progress save limit reached. Try again in an hour.' : 'Could not save progress. Please retry.', error.message.includes('limit reached') ? 429 : 500);
  return NextResponse.json({ ok: true, recorded: data === true, score });
}
