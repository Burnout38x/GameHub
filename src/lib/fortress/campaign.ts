import { MISSIONS, TICKS_PER_SECOND } from './content';
import { missionStars, parseBattleLog, replayBattle } from './sim';
import type { BattleSetup } from './state';

export const CAMPAIGN_STORAGE_KEY = 'gamehub:fortress-feud:v1';
export const MAX_STARS = MISSIONS.length * 3;

export interface CampaignProgress { stars: Record<number, number>; best: Record<number, number> }
export type VerifiedRun = { mission: number; stars: number; seconds: number } | { error: string };

/** Replays a submitted mission from its seed and command log; only real victories pass. */
export function verifyMissionRun(input: unknown): VerifiedRun {
  if (!input || typeof input !== 'object') return { error: 'Invalid battle record' };
  const raw = input as Record<string, unknown>;
  const mission = raw.mission;
  if (!Number.isInteger(mission) || !MISSIONS.some(m => m.id === mission)) return { error: 'Unknown mission' };
  if (!Number.isInteger(raw.seed) || Math.abs(raw.seed as number) > 2_147_483_647) return { error: 'Invalid battle seed' };
  const setup: BattleSetup = { kind: 'mission', mission: mission as number };
  const log = parseBattleLog(raw.log, setup);
  if (!log) return { error: 'This battle could not be verified.' };
  const state = replayBattle(setup, raw.seed as number, log);
  const stars = missionStars(state);
  if (!state.outcome || stars === 0) return { error: 'Only victories can be saved.' };
  return { mission: mission as number, stars, seconds: Math.floor(state.outcome.tick / TICKS_PER_SECOND) };
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
    if (Number.isInteger(best) && (best as number) >= 0 && (best as number) <= 600) progress.best[mission.id] = best as number;
  }
  return progress;
}
