import { MISSIONS } from '@/lib/fortress/content';
import type { MatchSetup } from '@/lib/fortress/match';
import type { Theme } from './scene/art';

/** Weather and time of day for a battle: storms where the wind howls, dusk for the late campaign. */
export function themeFor(setup: MatchSetup, seed: number): Theme {
  if (setup.kind === 'mission') {
    const mission = MISSIONS.find(entry => entry.id === setup.mission);
    if (mission && mission.windMax >= 2.2) return 'storm';
    return mission && mission.id >= 7 ? 'dusk' : 'day';
  }
  if (setup.kind === 'skirmish') return setup.level >= 5 ? 'storm' : setup.level >= 4 ? 'dusk' : 'day';
  return (['day', 'dusk', 'storm'] as const)[Math.abs(seed) % 3];
}
