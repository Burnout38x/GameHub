/** Pure multiplayer rules, shared by server transitions and regression tests. */
export function activeAnswers<T extends { profile_id: string }>(answers: T[], players: { profile_id: string }[]): T[] {
  const ids = new Set(players.map((p) => p.profile_id));
  return answers.filter((a) => ids.has(a.profile_id));
}

export function allowedAnswers(type: string, config: Record<string, any>, content: Record<string, any>): string[] {
  const choices = type === 'quiz' ? content.options : config.optionsFromContent ? content.choices : config.choices;
  return Array.isArray(choices) ? choices.filter((choice): choice is string => typeof choice === 'string') : [];
}

export function canChallengeTurn(state: { turnIndex: number; challengedTurn?: number; challenge?: unknown }): boolean {
  return !state.challenge && state.challengedTurn !== state.turnIndex;
}

/** Reject actions composed against a different (or unspecified) round. */
export function isCurrentRound(fromRound: unknown, currentRound: number): boolean {
  return typeof fromRound === 'number' && Number.isInteger(fromRound) && fromRound === currentRound;
}
