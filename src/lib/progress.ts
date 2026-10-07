export interface PlayDay { date: string; games: number }
export interface ProgressSummary {
  gamesPlayed: number; gamesWon: number; totalPoints: number;
  currentWinStreak: number; bestWinStreak: number;
  weeklyGoal: number; days: PlayDay[]; asOf: string;
}
const DAY = 86_400_000;
export function validWeeklyGoal(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 50;
}
/** A streak survives until the end of the next UTC day, so morning visits don't reset it. */
export function calculatePlayProgress(days: PlayDay[], now: Date) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const counts = new Map<number, number>();
  for (const day of days) {
    const time = Date.parse(`${day.date}T00:00:00Z`);
    if (Number.isFinite(time) && time <= today && day.games > 0) counts.set(time, (counts.get(time) ?? 0) + day.games);
  }
  const ordered = [...counts.keys()].sort((a, b) => a - b);
  let best = 0, run = 0, previous = -Infinity;
  for (const time of ordered) {
    run = time - previous === DAY ? run + 1 : 1;
    best = Math.max(best, run);
    previous = time;
  }
  let current = 0;
  for (let time = counts.has(today) ? today : today - DAY; counts.has(time); time -= DAY) current++;
  const monday = today - ((now.getUTCDay() + 6) % 7) * DAY;
  const week = Array.from({ length: 7 }, (_, index) => {
    const time = monday + index * DAY;
    return { date: new Date(time).toISOString().slice(0, 10), games: counts.get(time) ?? 0, today: time === today, future: time > today };
  });
  return { current, best, playedToday: counts.has(today), weeklyGames: week.reduce((sum, day) => sum + day.games, 0), week };
}
