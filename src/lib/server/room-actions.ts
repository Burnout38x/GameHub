import { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Game, Room, RoomPlayer } from '@/lib/types';

export interface RoomContext {
  admin: SupabaseClient;
  userId: string;
  room: Room;
  game: Game;
  players: RoomPlayer[];
  me: RoomPlayer | undefined;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Authenticates the caller and loads room + game + players. */
export async function loadRoomContext(code: string): Promise<RoomContext | NextResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError('Not logged in', 401);

  const admin = createAdminClient();
  const { data: room } = await admin
    .from('rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();
  if (!room) return jsonError('Room not found', 404);

  const [{ data: game }, { data: players }] = await Promise.all([
    admin.from('games').select('*').eq('id', room.game_id).single(),
    admin.from('room_players').select('*').eq('room_id', room.id).order('joined_at'),
  ]);
  if (!game) return jsonError('Game not found', 404);

  const list = (players ?? []) as RoomPlayer[];
  return {
    admin,
    userId: user.id,
    room: room as Room,
    game: game as Game,
    players: list,
    me: list.find((p) => p.profile_id === user.id),
  };
}

export { nextTurnPlayer } from '@/lib/game-utils';

/** Ends the game: winners, match history, lifetime stats, streaks, achievements. */
export async function finishGame(ctx: RoomContext) {
  const { admin, room, game, players } = ctx;
  const maxScore = Math.max(...players.map((p) => p.score));
  const winners = players.filter((p) => p.score === maxScore).map((p) => p.profile_id);
  const competitive = players.length > 1;

  // Conditional update makes finishing idempotent: if two players trigger the end
  // simultaneously, only the first request records stats.
  const { data: claimed } = await admin
    .from('rooms')
    .update({ status: 'finished', winner_ids: winners, round_phase: 'revealed' })
    .eq('id', room.id)
    .eq('status', 'playing')
    .select('id');
  if (!claimed || claimed.length === 0) return;

  const { data: achievements } = await admin.from('achievements').select('id, slug');
  const achId = (slug: string) => achievements?.find((a) => a.slug === slug)?.id;
  const toAward: { profile_id: string; achievement_id: string }[] = [];
  const award = (profileId: string, slug: string) => {
    const id = achId(slug);
    if (id) toAward.push({ profile_id: profileId, achievement_id: id });
  };

  for (const p of players) {
    const won = competitive && winners.includes(p.profile_id);
    await admin.from('match_history').insert({
      room_id: room.id,
      profile_id: p.profile_id,
      game_id: room.game_id,
      score: p.score,
      won,
    });

    const { data: prof } = await admin
      .from('profiles')
      .select('games_played, games_won, total_points, current_streak, best_streak')
      .eq('id', p.profile_id)
      .single();
    if (!prof) continue;

    const streak = won ? prof.current_streak + 1 : competitive ? 0 : prof.current_streak;
    await admin
      .from('profiles')
      .update({
        games_played: prof.games_played + 1,
        games_won: prof.games_won + (won ? 1 : 0),
        total_points: prof.total_points + p.score,
        current_streak: streak,
        best_streak: Math.max(prof.best_streak, streak),
      })
      .eq('id', p.profile_id);

    award(p.profile_id, 'first-game');
    if (won) award(p.profile_id, 'first-win');
    if (prof.games_won + (won ? 1 : 0) >= 5) award(p.profile_id, 'five-wins');
    if (streak >= 3) award(p.profile_id, 'streak-3');
    if (prof.games_played + 1 >= 10) award(p.profile_id, 'night-owl');
    if (game.type === 'quiz' && p.score >= room.total_rounds && room.total_rounds >= 5)
      award(p.profile_id, 'perfect-game');
  }
  if (players.length >= 3) award(room.host_id, 'social');

  if (toAward.length > 0) {
    await admin
      .from('profile_achievements')
      .upsert(toAward, { onConflict: 'profile_id,achievement_id', ignoreDuplicates: true });
  }
}
