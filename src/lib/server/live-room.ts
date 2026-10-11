import { NextResponse } from 'next/server';
import { engineFor } from '@/lib/live/registry';
import type { LiveBase, LiveEngine } from '@/lib/live/types';
import { jsonError, type RoomContext } from './room-actions';

/** Shared plumbing for live room games: load, version-fenced save, and the finish RPC. */

export const NO_STORE = { 'Cache-Control': 'private, no-store' };

export interface LiveContext { engine: LiveEngine<LiveBase, unknown>; state: LiveBase }

export function loadLive(ctx: RoomContext): LiveContext | NextResponse {
  const engine = engineFor(ctx.game.type);
  if (!engine) return jsonError('This room is not a live game', 409);
  if (ctx.room.status === 'lobby') return jsonError('The game has not started yet', 409);
  const state = engine.parse(ctx.room.round_state);
  return state ? { engine, state } : jsonError('This game could not be loaded. Start a new room.', 500);
}

export const livePayload = (engine: LiveEngine<LiveBase, unknown>, state: LiveBase, viewer: string, status: string, now = Date.now()) =>
  ({ view: engine.view(state, viewer, now), status, serverNow: now });

/**
 * Saves a new state if nobody else changed the room first. A finished match goes through
 * `finish_live_room`, which records scores, history and achievements in one transaction.
 */
export async function saveLive(ctx: RoomContext, live: LiveContext, next: LiveBase, forfeitWinners?: string[]): Promise<'saved' | 'finished' | 'conflict' | 'error'> {
  if (next.ended) {
    const settled = live.engine.settle(next);
    if (!settled) return 'error';
    const scores = Object.fromEntries(ctx.players.map(player => [player.profile_id, settled.scores[player.profile_id] ?? 0]));
    const winners = (forfeitWinners ?? settled.winners).filter(id => ctx.players.some(player => player.profile_id === id));
    const { data, error } = await ctx.admin.rpc('finish_live_room', {
      target_room_id: ctx.room.id, expected_version: live.state.version, next_state: next, scores, winners,
    });
    if (error) return 'error';
    return data ? 'finished' : 'conflict';
  }
  const { data, error } = await ctx.admin.from('rooms')
    .update({ round_state: next })
    .eq('id', ctx.room.id).eq('status', 'playing').eq('round_state->>version', String(live.state.version))
    .select('id');
  if (error) return 'error';
  return data?.length ? 'saved' : 'conflict';
}
