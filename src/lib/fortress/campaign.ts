import { MISSIONS, SHOTS_PER_PLAYER } from './content';

export const CAMPAIGN_STORAGE_KEY = 'gamehub:fortress-feud:v2';
export const MAX_STARS = MISSIONS.length * 3;

/** `best` is the fewest shots a mission was won in. */
export interface CampaignProgress { stars: Record<number, number>; best: Record<number, number> }
export type VerifiedRun = { mission: number; stars: number; shots: number } | { error: string };

/**
 * Checks a reported mission win. Solo physics runs in the browser and cannot be replayed
 * exactly on the server, so this is trust-limited: the report must be self-consistent, and
 * the database only pays out for stars not earned before, with an hourly save limit.
 */
export function verifyMissionRun(input: unknown): VerifiedRun {
  if (!input || typeof input !== 'object') return { error: 'Invalid battle record' };
  const raw = input as Record<string, unknown>;
  const mission = MISSIONS.find(entry => entry.id === raw.mission);
  if (!mission) return { error: 'Unknown mission' };
  const { stars, shots } = raw;
  if (!Number.isInteger(stars) || (stars as number) < 1 || (stars as number) > 3) return { error: 'Only victories can be saved.' };
  if (!Number.isInteger(shots) || (shots as number) < 1 || (shots as number) > SHOTS_PER_PLAYER) return { error: 'This battle could not be verified.' };
  // The third star is for finishing within par, so a slower win cannot claim it.
  if ((stars as number) === 3 && (shots as number) > mission.par) return { error: 'This battle could not be verified.' };
  return { mission: mission.id, stars: stars as number, shots: shots as number };
}

/** A mission unlocks once the one before it has at least one star. */
export const missionUnlocked = (progress: CampaignProgress, mission: number): boolean => mission === 1 || (progress.stars[mission - 1] ?? 0) > 0;

export const totalStars = (progress: CampaignProgress): number => Object.values(progress.stars).reduce((sum, value) => sum + value, 0);

const RANKS = [
  { min: 36, title: 'Fortress Legend', emoji: '👑' },
  { min: 30, title: 'Warlord', emoji: '🔥' },
  { min: 22, title: 'Captain', emoji: '⚔️' },
  { min: 14, title: 'Knight', emoji: '🛡️' },
  { min: 6, title: 'Squire', emoji: '🗡️' },
  { min: 0, title: 'Recruit', emoji: '🪵' },
];
export function campaignRank(stars: number): { title: string; emoji: string; next: number | null } {
  const index = RANKS.findIndex(rank => stars >= rank.min);
  return { title: RANKS[index].title, emoji: RANKS[index].emoji, next: index > 0 ? RANKS[index - 1].min : null };
}

export function mergeProgress(a: CampaignProgress, b: CampaignProgress): CampaignProgress {
  const stars: Record<number, number> = { ...a.stars };
  const best: Record<number, number> = { ...a.best };
  for (const [key, value] of Object.entries(b.stars)) stars[Number(key)] = Math.max(stars[Number(key)] ?? 0, value);
  for (const [key, value] of Object.entries(b.best)) best[Number(key)] = Math.min(best[Number(key)] ?? Infinity, value);
  return { stars, best };
}

/** Reads untrusted saved progress, keeping only valid mission entries. */
export function parseProgress(value: unknown): CampaignProgress {
  const progress: CampaignProgress = { stars: {}, best: {} };
  if (!value || typeof value !== 'object') return progress;
  const raw = value as { stars?: Record<string, unknown>; best?: Record<string, unknown> };
  for (const mission of MISSIONS) {
    const stars = raw.stars?.[mission.id];
    const best = raw.best?.[mission.id];
    if (Number.isInteger(stars) && (stars as number) >= 1 && (stars as number) <= 3) progress.stars[mission.id] = stars as number;
    if (Number.isInteger(best) && (best as number) >= 1 && (best as number) <= SHOTS_PER_PLAYER) progress.best[mission.id] = best as number;
  }
  return progress;
}
