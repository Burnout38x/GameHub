export type UsageReport = {
  totalProfiles: number; newProfiles: number; roomsCreated: number; roomsFinished: number; playerResults: number; activePlayers: number;
  games: { id: string; name: string; emoji: string; rooms: number; finished: number; playerResults: number }[];
  daily: { day: string; rooms: number; playerResults: number }[];
};
export function reportPeriod(value?: string, now = new Date()) {
  const days = value === '7' ? 7 : value === '90' ? 90 : 30;
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  since.setUTCDate(since.getUTCDate() - days + 1);
  return { days, since: since.toISOString() };
}
