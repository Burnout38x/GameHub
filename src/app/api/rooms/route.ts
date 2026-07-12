import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateRoomCode, spotlightEligible } from '@/lib/game-utils';
import { jsonError } from '@/lib/server/room-actions';

/** POST /api/rooms — create a room and add the host as first player. */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError('Not logged in', 401);

  const body = await req.json().catch(() => ({}));
  const {
    gameId,
    difficulty = 'mixed',
    totalRounds = 10,
    mode = 'classic',
    isPublic = false,
    answerSeconds = null,
    rematchOf,
  } = body;
  if (!gameId) return jsonError('gameId is required');
  if (!['easy', 'hard', 'mixed'].includes(difficulty)) return jsonError('Bad difficulty');
  if (!['classic', 'spotlight'].includes(mode)) return jsonError('Bad mode');
  const rounds = Math.min(100, Math.max(1, Number(totalRounds) || 10));
  const timer =
    answerSeconds == null ? null : Math.min(120, Math.max(5, Number(answerSeconds) || 0)) || null;

  const admin = createAdminClient();
  const { data: game } = await admin
    .from('games')
    .select('id, slug, type, is_active')
    .eq('id', gameId)
    .single();
  if (!game || !game.is_active) return jsonError('Game not found', 404);
  if (mode === 'spotlight' && !spotlightEligible(game.slug, game.type))
    return jsonError('Spotlight mode is not available for this game');
  if (timer && game.type !== 'quiz') return jsonError('Timers are only available for quiz games');

  const { data: profile } = await admin
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  // Retry on the (rare) code collision.
  let room = null;
  for (let attempt = 0; attempt < 5 && !room; attempt++) {
    const { data, error } = await admin
      .from('rooms')
      .insert({
        code: generateRoomCode(),
        host_id: user.id,
        game_id: gameId,
        difficulty,
        mode,
        is_public: !!isPublic,
        answer_seconds: timer,
        total_rounds: rounds,
      })
      .select()
      .single();
    if (!error) room = data;
    else if (!error.message.includes('duplicate')) return jsonError(error.message, 500);
  }
  if (!room) return jsonError('Could not create room, try again', 500);

  await admin.from('room_players').insert({
    room_id: room.id,
    profile_id: user.id,
    display_name: profile?.username ?? 'Host',
  });

  // Rematch: stamp the old room so everyone still on its end screen can follow along.
  if (typeof rematchOf === 'string') {
    const { data: old } = await admin
      .from('rooms')
      .select('id, host_id, round_state')
      .eq('id', rematchOf)
      .single();
    if (old && old.host_id === user.id) {
      await admin
        .from('rooms')
        .update({ round_state: { ...(old.round_state ?? {}), nextRoomCode: room.code } })
        .eq('id', old.id);
    }
  }

  return NextResponse.json({ code: room.code });
}
