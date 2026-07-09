import { NextResponse } from 'next/server';
import { loadRoomContext, jsonError } from '@/lib/server/room-actions';
import { shuffle } from '@/lib/game-utils';

/** POST /api/rooms/[code]/start — host starts the game. */
export async function POST(_req: Request, { params }: { params: { code: string } }) {
  const ctx = await loadRoomContext(params.code);
  if (ctx instanceof NextResponse) return ctx;
  const { admin, userId, room, game, players } = ctx;

  if (room.host_id !== userId) return jsonError('Only the host can start', 403);
  if (room.status !== 'lobby') return jsonError('Already started', 409);
  if (players.length < 1) return jsonError('No players');

  const firstTurn = players[0].profile_id;
  const update: Record<string, any> = {
    status: 'playing',
    current_round: 0,
    round_phase: 'answering',
    turn_player_id: firstTurn,
  };

  if (game.type === 'quiz' || game.type === 'prompt') {
    let q = admin.from('prompts').select('id').eq('game_id', game.id);
    if (room.difficulty !== 'mixed') q = q.eq('difficulty', room.difficulty);
    const { data: prompts } = await q;
    if (!prompts || prompts.length === 0)
      return jsonError(`No ${room.difficulty} prompts for this game yet — ask the admin to add some`, 409);
    const ids = shuffle(prompts.map((p) => p.id)).slice(0, room.total_rounds);
    update.prompt_ids = ids;
    update.total_rounds = ids.length;
  } else if (game.type === 'memory') {
    const themes: Record<string, [string, string][]> = game.config?.themes ?? {};
    const themeNames = Object.keys(themes);
    if (themeNames.length === 0) return jsonError('Memory game has no themes configured', 409);
    const theme = themeNames[Math.floor(Math.random() * themeNames.length)];
    const pairCount = Math.min(Math.max(room.total_rounds, 4), 20, themes[theme].length);
    const chosen = shuffle(themes[theme]).slice(0, pairCount);
    const cards = shuffle(
      chosen.flatMap(([emoji, name]) => [
        { emoji, name, matched: false },
        { emoji, name, matched: false },
      ])
    );
    update.total_rounds = pairCount;
    update.round_state = { theme, cards, flipped: [], lastPair: null, moves: 0, matched: 0 };
  } else if (game.type === 'guess') {
    const min = game.config?.min ?? 1;
    const max = game.config?.max ?? 100;
    const secret = Math.floor(Math.random() * (max - min + 1)) + min;
    update.round_state = { min, max, guesses: [], guessRound: 0 };
    await admin
      .from('room_secrets')
      .upsert({ room_id: room.id, secret: { value: secret } });
  }

  const { error } = await admin.from('rooms').update(update).eq('id', room.id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
