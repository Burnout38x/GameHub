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

/** Extra slack added to server deadlines so slow connections aren't unfairly cut off. */
const DEADLINE_GRACE_MS = 1500;

/** ISO timestamp for when the current round's answers close. */
export function roundDeadline(answerSeconds: number, now: number = Date.now()): string {
  return new Date(now + answerSeconds * 1000 + DEADLINE_GRACE_MS).toISOString();
}

export function deadlinePassed(deadline: string | null | undefined, now: number = Date.now()): boolean {
  if (!deadline) return false;
  const t = Date.parse(deadline);
  return Number.isFinite(t) && now > t;
}

/** Games where one player acts per round instead of everyone answering at once. */
export function isTurnBased(gameSlug: string, gameType: string, mode: string = 'classic'): boolean {
  if (mode === 'spotlight') return true;
  if (['memory', 'guess', 'predict', 'code', 'rule', 'chain'].includes(gameType)) return true;
  return gameSlug === 'truth-or-dare' || gameSlug === 'two-minute-challenge';
}

/** Games that can be played in spotlight mode (one player answers at a time). */
export function spotlightEligible(gameSlug: string, gameType: string): boolean {
  return gameType === 'quiz' || gameSlug === 'never-have-i-ever';
}

/** Rounds the requested question count to a multiple of the player count for equal turns. */
export function spotlightRoundCount(requested: number, playerCount: number, available: number): number {
  const cap = Math.min(available, 100);
  let perPlayer = Math.max(1, Math.round(requested / playerCount));
  while (perPlayer > 1 && perPlayer * playerCount > cap) perPlayer--;
  if (perPlayer * playerCount > cap) return Math.min(requested, cap);
  return perPlayer * playerCount;
}
