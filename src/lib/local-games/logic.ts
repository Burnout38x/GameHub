export function normalize(s: string): string {
  return String(s)
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(new RegExp('[^\\p{L}\\p{N}\\p{M}\\s]', 'gu'), '')
    .replace(/\s+/g, ' ');
}

export function levenshtein(a: string, b: string): number {
  const x = normalize(a);
  const y = normalize(b);
  const m = x.length;
  const n = y.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
  return dp[m][n];
}

export function validateNames(names: string[], min = 2): string {
  if (names.some((name) => !name.trim())) return 'Enter a name for every player.';
  if (names.length < min) return `Enter at least ${min} player names.`;
  if (new Set(names.map((x) => x.trim().toLowerCase())).size !== names.length)
    return 'Each player needs a different name.';
  return '';
}

/** Mastermind-style feedback: exact = right digit right spot, misplaced = right digit wrong spot. */
export function codeFeedback(guess: number[], secret: number[]): { exact: number; misplaced: number } {
  let exact = 0;
  const gCount: Record<number, number> = {};
  const sCount: Record<number, number> = {};
  guess.forEach((v, i) => {
    if (v === secret[i]) exact++;
    else {
      gCount[v] = (gCount[v] || 0) + 1;
      sCount[secret[i]] = (sCount[secret[i]] || 0) + 1;
    }
  });
  let misplaced = 0;
  Object.keys(gCount).forEach((k) => {
    misplaced += Math.min(gCount[Number(k)] || 0, sCount[Number(k)] || 0);
  });
  return { exact, misplaced };
}

/** Refill a shuffled deck while avoiding immediate repeats when possible. */
export function sampleQuestions<T>(pool: T[], count: number): T[] {
  if (!pool.length || count <= 0) return [];
  const result: T[] = [];
  let bag: T[] = [];
  while (result.length < count) {
    if (!bag.length) {
      bag = [...pool];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag.length > 1 && bag[bag.length - 1] === result[result.length - 1]) {
        [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      }
    }
    result.push(bag.pop()!);
  }
  return result;
}

export function rankPlayers(players: string[], scores: number[]) {
  const ranked = players.map((name, i) => ({ name, score: scores[i] ?? 0 })).sort((a, b) => b.score - a.score);
  return ranked.map((player) => ({ ...player, rank: ranked.findIndex((p) => p.score === player.score) + 1 }));
}

export function memoryMatch(a: string, b: string): 'exact' | 'similar' | 'different' {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return a.trim() === b.trim() && !!a.trim() ? 'exact' : 'different';
  if (x === y) return 'exact';
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length) >= 0.84 ? 'similar' : 'different';
}

export function isAssociationWord(value: string): boolean {
  return new RegExp("^\\p{L}[\\p{L}\\p{M}'’-]+\\p{L}$|^\\p{L}{2}$", 'u').test(value.trim());
}

export function resolveWordChallenge(
  scores: number[],
  submitter: number,
  challenger: number,
  award: number,
  votes: string[]
): { succeeded: boolean; scores: number[] } {
  const succeeded = votes.filter((vote) => vote === 'weak').length > votes.length / 2;
  return {
    succeeded,
    scores: scores.map((score, i) => {
      if (i === submitter) return succeeded ? Math.max(0, score - award) : score + 5;
      if (i === challenger) return succeeded ? score + 10 : Math.max(0, score - 10);
      return score;
    }),
  };
}
