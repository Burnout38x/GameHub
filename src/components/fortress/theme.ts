import { MISSIONS } from '@/lib/fortress/missions';
import type { MatchSetup } from '@/lib/fortress/match';
import type { Theme } from './scene/art';

/** Weather and time of day for a battle: storms where the wind howls, dusk for the late campaign. */
export function themeFor(setup: MatchSetup, seed: number): Theme {
  if (setup.kind === 'mission') {
    const mission = MISSIONS.find(entry => entry.id === setup.mission);
    if (mission && mission.windMax >= 2.2) return 'storm';
    if (mission && mission.id >= 10) return 'night';
    return mission && mission.id >= 6 ? 'dusk' : 'day';
  }
  if (setup.kind === 'skirmish') return (['day', 'day', 'dusk', 'storm', 'night'] as const)[Math.min(4, Math.max(0, setup.level - 1))];
  return (['day', 'dusk', 'storm', 'night'] as const)[Math.abs(seed) % 4];
}
