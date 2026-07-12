import { shuffle } from '@/lib/game-utils';
import { RULES } from '@/lib/local-games/rule-bank';

/** Picks a fresh hidden rule plus its starter evidence and the 4-option guess list. */
export function buildRuleRound(usedIds: string[]) {
  let pool = RULES.filter((r) => !usedIds.includes(r.id));
  if (!pool.length) {
    usedIds = [];
    pool = RULES;
  }
  const rule = pool[Math.floor(Math.random() * pool.length)];
  const decoys = shuffle(RULES.filter((r) => r.kind === rule.kind && r.id !== rule.id)).slice(0, 3);
  const choices = shuffle([rule, ...decoys]).map(({ id, name, desc }) => ({ id, name, desc }));
  const evidence = [
    ...rule.examples.slice(0, 2).map((value) => ({ value, accepted: true, system: true })),
    ...rule.rejects.slice(0, 2).map((value) => ({ value, accepted: false, system: true })),
  ];
  return {
    ruleId: rule.id,
    state: { kind: rule.kind, evidence, choices, usedRuleIds: [...usedIds, rule.id] },
  };
}
