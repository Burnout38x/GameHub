export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I confusion

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

/** Rotates the turn to the next player in join order, wrapping around. */
export function nextTurnPlayer(
  players: { profile_id: string }[],
  currentId: string | null
): string {
  if (players.length === 0) return currentId ?? '';
  const idx = players.findIndex((p) => p.profile_id === currentId);
  return players[(idx + 1) % players.length].profile_id;
}

/** Prompt games where one player acts per round instead of everyone answering at once. */
export function isTurnBased(gameSlug: string, gameType: string): boolean {
  if (gameType === 'memory' || gameType === 'guess') return true;
  return gameSlug === 'truth-or-dare' || gameSlug === 'two-minute-challenge';
}
