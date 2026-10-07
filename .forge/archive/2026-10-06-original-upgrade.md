GOAL: Understand all games for couples, friends, and family, fix game logic and room flows, and improve the overall look and feel with consistent UI across the app.

DONE WHEN:
  1. Every implemented game and room lifecycle is inventoried with rules, supported players, and audit findings — PASS (`node .forge/verify-evidence.mjs` -> Evidence inventory: 18 online games, 8 local games, independent review, progress log, and screenshot artifacts present.)
  2. Identified gameplay and multiplayer lifecycle bugs are fixed with regression evidence for every game — PASS (`npm test` -> tests 57; pass 57; fail 0.)
  3. Shared navigation, room creation/join/lobby, and game screens have consistent responsive visual styling and accessible interaction states — PASS (`node .forge/verify-evidence.mjs` -> Recorded browser evidence: 83 matrix checks, 8 local completion/replays, 13 theme/motion checks, 48 online checks; zero recorded errors, axe violations or overflow.)
  4. All games and room flows are exercised through available automated and browser checks, with build and required checks passing — PASS (`npm run build` -> Compiled successfully; TypeScript finished; static pages 19/19 generated.)
  5. An independent subagent reviews the final changes and material findings are resolved, with verification evidence recorded — PASS (`node .forge/verify-evidence.mjs` -> Upgrade evidence: current direct versions, zero production advisories, independent dependency review, 18 API games and 2 concurrent-timer regressions.)

OUT: Production deployment, destructive live-data changes, new games, and unrelated features.
RISK: reversible — local application and test changes; preserve existing user work and use reviewed diffs to roll back. Any necessary database changes must include a safe migration strategy before execution.

PHASES:
- 1. Inventory architecture, games, room flows, and baseline checks; exit with an audit matrix and implementation plan.
- 2. Fix gameplay and room lifecycle defects; exit with focused regression checks.
- 3. Improve shared UI and all game screens; exit with responsive flow verification.
- 4. Run full verification, independent review, and the forge completion gate; exit only with evidenced verdicts.

AMENDED 2026-10-06: User requested “one and two ... option to change and save themes” and stated they are currently playing; do not affect other users' database data.
  + DONE WHEN 6. Warm dark and bright colorful themes can be switched and the preference survives reload — PASS (`npm test` -> tests 57; pass 57; fail 0, including saved theme changes and restoration.)
  + OUT: Applying migrations or changes that affect current live players, rooms, content, or scores. Backend schema verification must use an isolated environment; any unapplied live migration is reported explicitly.

AMENDED 2026-10-06: User invoked Scroll Landing Studio and requested useful animation/effects, overall UX improvement, and durable progress logs.
  + DONE WHEN 7. Purposeful motion has reduced-motion fallbacks and a durable checkpoint log records completed work, verification, remaining work, and exact resume point — PASS (`node .forge/verify-evidence.mjs` -> Evidence inventory: independent review, progress log, and screenshot artifacts present; 13 theme/motion checks verified in recorded browser results.)

AMENDED 2026-10-06: User clarified the visual direction: modern rounded components, a playful gaming feel, purposeful animation, and simple intuitive operation. This refines conditions 3 and 7; retain both saved themes and test the final shared component styling.

AMENDED 2026-10-06: User requested current dependencies, warning cleanup, and another bug pass. Absolute absence of all possible bugs cannot be proven; acceptance is clean required checks and comprehensive regression evidence on current stable dependencies.
  + DONE WHEN 8. Direct dependencies are updated to current stable compatible releases, framework migrations are complete, and install/lint/type/build/test warnings are resolved with new game regression runs — PASS (`npm run lint` -> eslint src tests scripts *.mjs --max-warnings=0; exit 0 with no warnings or errors.)

VERIFICATION NOTES:
- Runtime commands were executed separately against isolated Supabase58321/Next production3199; the read-only evidence command checks their saved reports rather than replaying browsers or database writes. Full coverage/limitations: .forge/final-verification.md.
- Condition8 covers project install/lint/type/build/test/runtime warnings. Full security audit still lists five development-only entries from one upstream unpatched braces advisory; production audit is zero. This is disclosed, not suppressed or presented as a clean full audit.
- No live database migration, production deployment, existing-player mutation, or user browser takeover occurred. Both SQL migrations remain unapplied to production.
