import { withRoomLock } from '@/lib/server/room-lock';
export const maxDuration = 30;
import { NextResponse } from 'next/server';
import { loadRoomContext, jsonError } from '@/lib/server/room-actions';
import { shuffle, spotlightRoundCount, roundDeadline, isTurnBased } from '@/lib/game-utils';
import { createMarketDay } from '@/lib/market-day';
import { randomInt } from 'node:crypto';
import { buildRuleRound } from '@/lib/server/rule-round';
import { createOnlineSiege } from '@/lib/fortress/online';
import { battleAiLevel } from '@/lib/fortress/rooms';
import { engineFor } from '@/lib/live/registry';

/** POST /api/rooms/[code]/start — host starts the game. */
async function handlePost(_req: Request, { params }: { params: { code: string } }) {
  const ctx = await loadRoomContext(params.code);
  if (ctx instanceof NextResponse) return ctx;
  const { admin, userId, room, game, players } = ctx;

  if (room.host_id !== userId) return jsonError('Only the host can start', 403);
  if (room.status !== 'lobby') return jsonError('Already started', 409);
  if (players.length < 1) return jsonError('No players');
  if (game.type === 'predict' && players.length !== 2)
    return jsonError('This game needs exactly 2 players', 409);
  if ((game.type === 'rule' || game.type === 'chain') && players.length < 2)
    return jsonError('This game needs at least 2 players', 409);

  if (game.type === 'solo') return jsonError('This is a solo game', 409);
  if (game.type === 'market' && (players.length < 2 || players.length > 4)) return jsonError('Market Day needs 2–4 players', 409);
  if (game.type === 'battle' && players.length !== 2) return jsonError('Fortress Feud needs exactly 2 players', 409);

  const firstTurn = players[0].profile_id;
  const update: Record<string, any> = {
    status: 'playing',
    current_round: 0,
    round_phase: 'answering',
    turn_player_id: firstTurn,
  };

  const live = engineFor(game.type);
  if (live) {
    if (players.length < live.minPlayers || players.length > live.maxPlayers)
      return jsonError(live.minPlayers === live.maxPlayers ? `This game needs exactly ${live.minPlayers} players` : `This game needs ${live.minPlayers}–${live.maxPlayers} players`, 409);
    const created = live.create({
      players: players.map(p => ({ id: p.profile_id, name: p.display_name })),
      setup: live.parseSetup(room.round_state?.setup),
      difficulty: room.difficulty, mode: room.mode, rounds: room.total_rounds, seconds: room.answer_seconds,
      seed: randomInt(1, 2147483647), now: Date.now(),
    });
    if ('error' in created) return jsonError(created.error, 409);
    update.round_state = created;
    update.total_rounds = live.rounds(created);
  } else if (game.type === 'battle') {
    update.total_rounds = 1;
    update.round_state = createOnlineSiege(room.mode === 'coop' ? 'coop' : 'duel', battleAiLevel(room.difficulty), players.map(p => p.profile_id), randomInt(1, 2147483647), Date.now());
  } else if (game.type === 'market') {
    update.total_rounds = 10;
    update.round_state = createMarketDay(players.map(p => p.profile_id), randomInt(1, 2147483647));
  } else if (game.type === 'quiz' || game.type === 'prompt' || game.type === 'predict') {
    let q = admin.from('prompts').select('id').eq('game_id', game.id);
    if (room.difficulty !== 'mixed') q = q.eq('difficulty', room.difficulty);
    const { data: prompts } = await q;
    if (!prompts || prompts.length === 0)
      return jsonError(`No ${room.difficulty} prompts for this game yet — ask the admin to add some`, 409);
    const target =
      isTurnBased(game.slug, game.type, room.mode) && players.length > 1
        ? spotlightRoundCount(room.total_rounds, players.length, prompts.length) // equal turns each
        : room.total_rounds;
    const deck = shuffle(prompts.map((p) => p.id));
    const ids = deck.slice(0, target);
    update.prompt_ids = ids;
    update.total_rounds = ids.length;
    // Truth or Dare keeps the rest of the deck so each pick can draw the chosen kind.
    if (game.config?.pickTruthOrDare) update.round_state = { reserve: deck.slice(target, target + 200) };
    else if (game.type === 'predict') update.round_state = { stage: game.config?.freeText ? 'collect' : 'subject' };
    else if (room.answer_seconds) update.round_state = { deadline: roundDeadline(room.answer_seconds) };
  } else if (game.type === 'memory') {
    const themes: Record<string, [string, string][]> = game.config?.themes ?? {};
    const themeNames = Object.keys(themes);
    if (themeNames.length === 0) return jsonError('Memory game has no themes configured', 409);
    const theme = themeNames[Math.floor(Math.random() * themeNames.length)];
    if (!Array.isArray(themes[theme]) || themes[theme].length < 1) return jsonError('Memory theme needs at least one pair', 409);
    const pairCount = Math.min(Math.max(room.total_rounds, 4), 20, themes[theme].length);
    const chosen = shuffle(themes[theme]).slice(0, pairCount);
    const cards = shuffle(
      chosen.flatMap(([emoji, name]) => [
        { emoji, name, matched: false },
        { emoji, name, matched: false },
      ])
    );
    const { error: deckError } = await admin.from('room_secrets').upsert({ room_id: room.id, secret: { cards } });
    if (deckError) return jsonError('Could not prepare the memory board', 500);
    update.total_rounds = pairCount;
    update.round_state = { theme, cards: cards.map(() => ({ matched: false })), flipped: [], lastPair: null, moves: 0, matched: 0 };
  } else if (game.type === 'guess') {
    const min = game.config?.min ?? 1;
    const max = game.config?.max ?? 100;
    const secret = Math.floor(Math.random() * (max - min + 1)) + min;
    update.round_state = { min, max, guesses: [], guessRound: 0 };
    await admin
      .from('room_secrets')
      .upsert({ room_id: room.id, secret: { value: secret } });
  } else if (game.type === 'code') {
    // Code length comes from the difficulty choice: easy=4, mixed=5, hard=6 digits.
    const length = room.difficulty === 'easy' ? 4 : room.difficulty === 'hard' ? 6 : 5;
    const digits = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, length);
    update.total_rounds = Math.min(room.total_rounds, 5);
    update.round_state = {
      length,
      guesses: [],
      guessRound: 0,
      turnCount: 0,
      maxTurns: game.config?.maxTurns ?? 18,
    };
    await admin.from('room_secrets').upsert({ room_id: room.id, secret: { code: digits } });
  } else if (game.type === 'rule') {
    const { ruleId, state, usedRuleIds } = buildRuleRound([]);
    update.total_rounds = Math.min(room.total_rounds, 5);
    update.round_state = { ...state, ruleRound: 0 };
    await admin.from('room_secrets').upsert({ room_id: room.id, secret: { ruleId, usedRuleIds } });
  } else if (game.type === 'chain') {
    const starters: string[] = game.config?.starters ?? ['ocean', 'music', 'fire', 'dream', 'travel'];
    if (!starters.length) return jsonError('Word Chain needs a starter word', 409);
    update.total_rounds = Math.min(room.total_rounds, 60);
    update.round_state = {
      chain: [{ word: starters[Math.floor(Math.random() * starters.length)], by: null, name: null }],
      turnIndex: 0,
      challenge: null,
      ...(room.answer_seconds ? { deadline: roundDeadline(room.answer_seconds) } : {}),
    };
  }

  const { error } = await admin.from('rooms').update(update).eq('id', room.id).eq('status', 'lobby');
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request, context: { params: Promise<{ code: string }> }) {
  const params = await context.params;
  return withRoomLock(params.code, () => handlePost(req as never, { params }));
}
