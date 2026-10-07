GOAL: Rebuild Pocket Paradise and Market Day into coherent, satisfying games with meaningful logic, clear goals, rewards and win conditions, and convincing game presentation rather than subpar interfaces.

DONE WHEN:
  1. A written design identifies the current weaknesses and defines each game loop, meaningful decisions, objective, reward, win/loss or success outcome and replay incentive; independent design review challenges it. — PASS (`node qa-redesign/verify-evidence.mjs design` → both designs and independent critique retained)
  2. Both revised engines implement those rules with validated moves, balanced resource tradeoffs, explicit outcomes and compatible saved/room state handling; meaningful rule and strategy tests pass. — PASS (`node qa-redesign/verify-evidence.mjs rules` → 7 independent engine groups, 114 unit tests, 100 distinct offers)
  3. Both game UIs communicate goals, consequences, progress and final outcomes through polished responsive board presentation, contextual controls and purposeful motion; browser playthroughs and visual inspection cover mobile and desktop. — PASS (`node qa-redesign/verify-evidence.mjs ui` → Chromium/WebKit flows, 22 Market visual checks, 10 full-page checks)
  4. Independent review verifies full game flows, multiplayer synchronization, authorization and affected regressions; findings are fixed and retested. — PASS (`node qa-redesign/verify-evidence.mjs integration` → real 2P/4P completion, concurrency, persistence, compatibility and verified cleanup)
  5. Verified changes, design notes and progress logs are committed and pushed, and production deployment is checked after acceptance. — PASS (`node qa-redesign/verify-evidence.mjs release` → production deployment successful and 10 live Chromium/WebKit checks passed)

OUT: Unrelated game redesigns; paid prizes; destructive production data edits.
RISK: Reversible source changes. Only authorized Supabase project jnzbncbmcewsvtjjmddn may be affected if additive compatibility requires it; existing players and saves must not be corrupted. Local isolated test accounts and rooms only.

PHASES: Diagnose and design; engines and presentation; independent playthrough/review; release.
STATUS: All six conditions passed. Source pushed to both authorized branches; exact production deployment and ten live browser checks passed. Prior QA established technical behavior; this acceptance also covers player motivation and strategic choices.

AMENDED 2026-10-07: User requires fluid, lifelike movement without resource-heavy effects.
  + DONE WHEN 6. Token travel, construction and reward feedback reflect real committed actions with bounded transform/opacity motion, reduced-motion support and no perpetual render loop; interrupted/reconnected states remain operable. — PASS (`node qa-redesign/verify-evidence.mjs motion` → bounded travel, reduced motion and no unchanged-poll restart verified)

Evidence commands above revalidate retained artifacts, not new browser executions. Actual browser commands and test scope are in qa-redesign. Root final local release smoke passed 10 Chromium/WebKit viewport checks with full-page axe and one main landmark after the semantic correction.
