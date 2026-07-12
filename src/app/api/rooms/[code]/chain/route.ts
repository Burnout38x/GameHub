import { NextRequest, NextResponse } from 'next/server';
import { loadRoomContext, jsonError, finishGame, nextTurnPlayer } from '@/lib/server/room-actions';
import { deadlinePassed, roundDeadline } from '@/lib/game-utils';
import { normalize } from '@/lib/local-games/logic';

interface ChainState {
  chain: { word: string; by: string | null; name: string | null }[];
  turnIndex: number;
  challenge: {
    word: string;
    prev: string;
    submitterId: string;
    submitterName: string;
    challengerId: string;
    challengerName: string;
    votes: Record<string, 'weak' | 'strong'>;
  } | null;
  deadline?: string;
  lastChallenge?: Record<string, unknown> | null;
}

/**
 * POST /api/rooms/[code]/chain — Word Association Chain.
 * Actions: { word } submit on your turn · { challenge: true } contest the last word
 * (3+ players, vote by everyone not involved) · { vote } cast your challenge vote ·
 * { timeout: true } skip the turn once the room's timer deadline has passed.
 */
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const loaded = await loadRoomContext(params.code);
  if (loaded instanceof NextResponse) return loaded;
  const ctx = loaded;
  const { admin, userId, room, game, players, me } = ctx;

  if (!me) return jsonError('You are not in this room', 403);
  if (game.type !== 'chain') return jsonError('Wrong endpoint');
  if (room.status !== 'playing') return jsonError('Game is not running', 409);

  const body = await req.json().catch(() => ({}));
  const state = room.round_state as unknown as ChainState;

  async function advanceTurn(update: Partial<ChainState>, scoreDelta?: { id: string; score: number }) {
    const turnIndex = state.turnIndex + 1;
    if (scoreDelta) {
      await admin.from('room_players').update({ score: scoreDelta.score }).eq('id', scoreDelta.id);
    }
    if (turnIndex >= room.total_rounds) {
      await admin
        .from('rooms')
        .update({ round_state: { ...state, ...update, turnIndex, challenge: null } })
        .eq('id', room.id);
      const { data: fresh } = await admin
        .from('room_players')
        .select('*')
        .eq('room_id', room.id)
        .order('joined_at');
      await finishGame({ ...ctx, players: fresh ?? players });
      return NextResponse.json({ ok: true, finished: true });
    }
    const { error } = await admin
      .from('rooms')
      .update({
        round_state: {
          ...state,
          ...update,
          turnIndex,
          challenge: null,
          ...(room.answer_seconds ? { deadline: roundDeadline(room.answer_seconds) } : {}),
        },
        turn_player_id: nextTurnPlayer(players, room.turn_player_id),
        current_round: turnIndex,
      })
      .eq('id', room.id)
      .eq('current_round', room.current_round);
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true });
  }

  // ----- Cast a vote in an active challenge -----
  if (typeof body.vote === 'string') {
    const ch = state.challenge;
    if (!ch) return jsonError('No challenge in progress', 409);
    if (!['weak', 'strong'].includes(body.vote)) return jsonError('Bad vote');
    if (userId === ch.submitterId || userId === ch.challengerId)
      return jsonError("You're involved — you don't vote", 403);
    if (ch.votes[userId]) return jsonError('Already voted', 409);

    const votes = { ...ch.votes, [userId]: body.vote as 'weak' | 'strong' };
    const eligible = players.filter(
      (p) => p.profile_id !== ch.submitterId && p.profile_id !== ch.challengerId
    );
    if (Object.keys(votes).length < eligible.length) {
      const { error } = await admin
        .from('rooms')
        .update({ round_state: { ...state, challenge: { ...ch, votes } } })
        .eq('id', room.id)
        .eq('current_round', room.current_round);
      if (error) return jsonError(error.message, 500);
      return NextResponse.json({ ok: true, waiting: true });
    }

    const weak = Object.values(votes).filter((v) => v === 'weak').length;
    const succeeded = weak > Object.values(votes).length - weak;
    const submitter = players.find((p) => p.profile_id === ch.submitterId);
    const challenger = players.find((p) => p.profile_id === ch.challengerId);
    if (succeeded) {
      if (submitter)
        await admin.from('room_players').update({ score: Math.max(0, submitter.score - 1) }).eq('id', submitter.id);
      if (challenger)
        await admin.from('room_players').update({ score: challenger.score + 1 }).eq('id', challenger.id);
    } else {
      if (challenger)
        await admin.from('room_players').update({ score: Math.max(0, challenger.score - 1) }).eq('id', challenger.id);
      if (submitter)
        await admin.from('room_players').update({ score: submitter.score + 1 }).eq('id', submitter.id);
    }
    const { error } = await admin
      .from('rooms')
      .update({
        round_state: {
          ...state,
          chain: succeeded ? state.chain.slice(0, -1) : state.chain,
          challenge: null,
          lastChallenge: { word: ch.word, succeeded, challengerName: ch.challengerName },
          ...(room.answer_seconds ? { deadline: roundDeadline(room.answer_seconds) } : {}),
        },
      })
      .eq('id', room.id)
      .eq('current_round', room.current_round);
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true, succeeded });
  }

  // ----- Start a challenge (turn player, before submitting their word) -----
  if (body.challenge === true) {
    if (room.turn_player_id !== userId) return jsonError('Not your turn', 403);
    if (state.challenge) return jsonError('Challenge already in progress', 409);
    if (players.length < 3) return jsonError('Challenges need at least 3 players', 409);
    if (state.chain.length < 2) return jsonError('Nothing to challenge yet', 409);
    const last = state.chain[state.chain.length - 1];
    if (!last.by || last.by === userId) return jsonError("You can't challenge that word", 409);
    const { error } = await admin
      .from('rooms')
      .update({
        round_state: {
          ...state,
          challenge: {
            word: last.word,
            prev: state.chain[state.chain.length - 2].word,
            submitterId: last.by,
            submitterName: last.name,
            challengerId: userId,
            challengerName: me.display_name,
            votes: {},
          },
        },
      })
      .eq('id', room.id)
      .eq('current_round', room.current_round);
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true });
  }

  // ----- Timer expired: anyone may skip the stuck turn -----
  if (body.timeout === true) {
    if (state.challenge) return jsonError('Vote in progress', 409);
    if (!room.answer_seconds || !deadlinePassed(state.deadline)) return jsonError('Time is not up', 409);
    const turnPlayer = players.find((p) => p.profile_id === room.turn_player_id);
    return advanceTurn(
      { lastChallenge: null },
      turnPlayer ? { id: turnPlayer.id, score: Math.max(0, turnPlayer.score - 1) } : undefined
    );
  }

  // ----- Submit a word -----
  if (room.turn_player_id !== userId) return jsonError('Not your turn', 403);
  if (state.challenge) return jsonError('Finish the challenge vote first', 409);
  if (room.answer_seconds && deadlinePassed(state.deadline))
    return jsonError('Time is up — your turn was skipped', 409);
  const word = normalize(String(body.word ?? ''));
  if (word.length < 2) return jsonError('Enter a real word with at least two characters');
  if (word.length > 28) return jsonError('Too long');
  if (state.chain.some((c) => normalize(c.word) === word))
    return jsonError('That word has already been used');

  return advanceTurn(
    {
      chain: [...state.chain, { word, by: userId, name: me.display_name }],
      lastChallenge: null,
    },
    { id: me.id, score: me.score + 1 }
  );
}
