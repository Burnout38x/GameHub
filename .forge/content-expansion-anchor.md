GOAL: Add harder Doctor Dash trivia and more flirty Truth or Dare challenges while preserving existing rooms and family-friendly play.

DONE WHEN:
  1. Fact-checked hard medical questions have unambiguous matching answers and valid options — PASS (`node scripts/build-content-expansion.mjs` → 30 questions validated; publisher source map in .forge/doctor-dash-content-sources.md independently reviewed)
  2. New non-graphic adult flirty truths and dares are clearly separated from family play and work with existing game flows — PASS (`node scripts/test-content-expansion.mjs` → 5 checks passed, including adult labeling, turn restriction, skip scoring, equal rounds and finish)
  3. Additive content applies idempotently to only jnzbncbmcewsvtjjmddn after local verification; existing content remains intact; changes tested and pushed — NOT CHECKED

OUT: Explicit sexual content, unsafe challenges, deleting/replacing existing prompts, other databases.
RISK: Additive content only; rollback disable newly introduced game if needed, retain prompts referenced by rooms. No seed reset.
