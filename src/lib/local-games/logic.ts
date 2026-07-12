export function normalize(s: string): string {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
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
  if (names.length < min) return `Enter at least ${min} player names.`;
  if (new Set(names.map((x) => x.toLowerCase())).size !== names.length)
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
