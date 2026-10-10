import type { Game, Prompt, Room, RoomPlayer, RoundAnswer } from '@/lib/types';
import { activeAnswers } from './multiplayer-rules';
import { hasPicked } from '@/lib/truth-or-dare';

export function sanitizeSnapshot(
  input: { room: Room; game: Game; players: RoomPlayer[]; answers: RoundAnswer[]; prompt: Prompt | null },
  userId: string,
  secret: Record<string, any> = {},
) {
  const { game, players } = input;
  const room = { ...input.room, round_state: { ...input.room.round_state } };
  // Legacy rooms may still have this field; redact it too.
  delete room.round_state.usedRuleIds;
  delete room.round_state.reserve;
  if (game.type === 'memory' && Array.isArray(room.round_state.cards)) {
    const state = room.round_state;
    const deck = secret?.cards ?? state.cards;
    const visible = new Set<number>(state.flipped ?? []);
    if (state.lastPair) { visible.add(state.lastPair.a); visible.add(state.lastPair.b); }
    state.cards = state.cards.map((card: { matched: boolean }, index: number) =>
      card.matched || visible.has(index)
        ? { emoji: deck[index]?.emoji, name: deck[index]?.name, matched: card.matched }
        : { matched: false });
  }
  const revealed = room.round_phase === 'revealed';
  // Truth or Dare cards stay face down until the turn player picks a kind.
  const facedown = game.config?.pickTruthOrDare && !hasPicked(input.room.round_state, room.current_round);
  const prompt = input.prompt && !facedown ? { ...input.prompt, content: { ...input.prompt.content } } : null;
  if (prompt && !revealed) { delete prompt.content.answer; delete prompt.content.fact; }
  const answers = activeAnswers(input.answers, players).map((answer) =>
    revealed || answer.profile_id === userId
      ? answer
      : { ...answer, answer: {}, is_correct: null, points: 0 });
  return { room, game, players, answers, prompt };
}
