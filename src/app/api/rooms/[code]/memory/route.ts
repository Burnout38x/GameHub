import { isCurrentRound } from '@/lib/server/multiplayer-rules';
import { withRoomLock } from '@/lib/server/room-lock';
export const maxDuration = 30;
import { NextRequest, NextResponse } from 'next/server';
import { loadRoomContext, jsonError, finishGame, nextTurnPlayer } from '@/lib/server/room-actions';

/** POST /api/rooms/[code]/memory — flip a card (turn player only). */
async function handlePost(req: NextRequest, { params }: { params: { code: string } }) {
  const ctx = await loadRoomContext(params.code);
  if (ctx instanceof NextResponse) return ctx;
  const { admin, userId, room, game, players, me } = ctx;

  if (!me) return jsonError('You are not in this room', 403);
  if (game.type !== 'memory') return jsonError('Wrong endpoint');
  if (room.status !== 'playing') return jsonError('Game is not running', 409);
  const body = await req.json().catch(() => ({}));
  if (!isCurrentRound(body.fromRound, room.current_round)) return jsonError('The round has changed. Refresh the room before acting.', 409);
  const { index } = body;
  if (room.turn_player_id !== userId) return jsonError('Not your turn', 403);


  const state = room.round_state as {
    theme: string;
    cards: { emoji: string; name: string; matched: boolean }[];
    flipped: number[];
    lastPair: { a: number; b: number; matched: boolean } | null;
    moves: number;
    matched: number;
  };

  if (
    typeof index !== 'number' ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= state.cards.length
  )
    return jsonError('Bad card index');
  if (state.cards[index].matched || state.flipped.includes(index)) return jsonError('Card not flippable', 409);
  if (state.flipped.length >= 2) return jsonError('Two cards already flipped', 409);

  const { data: secretRow } = await admin.from('room_secrets').select('secret').eq('room_id', room.id).single();
  // Legacy rooms keep their deck in state; new rooms store it only server-side.
  const deck = secretRow?.secret?.cards ?? state.cards;
  if (!Array.isArray(deck) || !deck[index]?.name) return jsonError('Memory board missing', 500);
  if (!secretRow?.secret?.cards) {
    const { error: deckError } = await admin.from('room_secrets').upsert({ room_id: room.id, secret: { ...(secretRow?.secret ?? {}), cards: deck } });
    if (deckError) return jsonError('Could not preserve the memory board. Please retry.', 500);
  }
  const flipped = [...state.flipped, index];
  let update: Record<string, any>;

  if (flipped.length < 2) {
    update = { round_state: { ...state, flipped, lastPair: null } };
  } else {
    const [a, b] = flipped;
    const isMatch = deck[a].name === deck[b].name;
    const cards = state.cards.map((c, i) =>
      ({ matched: c.matched || (isMatch && (i === a || i === b)) })
    );
    const matched = state.matched + (isMatch ? 1 : 0);
    update = {
      round_state: {
        ...state,
        cards,
        flipped: [],
        lastPair: { a, b, matched: isMatch },
        moves: state.moves + 1,
        matched,
      },
      // match = keep your turn; miss = pass the turn
      turn_player_id: isMatch ? userId : nextTurnPlayer(players, userId),
    };
    if (isMatch) {
      await admin.from('room_players').update({ score: me.score + 1 }).eq('id', me.id);
    }
    if (matched >= room.total_rounds) {
      await admin.from('rooms').update(update).eq('id', room.id);
      // refresh player scores before computing winners
      const { data: fresh } = await admin
        .from('room_players')
        .select('*')
        .eq('room_id', room.id)
        .order('joined_at');
      await finishGame({ ...ctx, players: fresh ?? players });
      return NextResponse.json({ ok: true, finished: true });
    }
  }

  const { error } = await admin.from('rooms').update(update).eq('id', room.id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request, context: { params: Promise<{ code: string }> }) {
  const params = await context.params;
  return withRoomLock(params.code, () => handlePost(req as never, { params }));
}
