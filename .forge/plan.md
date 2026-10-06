# GameHub implementation plan

Anchor: `.forge/anchor.md` (all work derives from its eight conditions, including user amendments).

1. Inventory (parallel local/online audits). Map all 18 online games, 8 local games, and room/auth/navigation lifecycle. Evidence: audit matrices, baseline 16 tests and lint. Root maps shared UI.
2. Gameplay (parallel by file ownership). Local agent fixes local state/timer/content defects with unit regressions. Multiplayer agent fixes server action invariants, privacy, scoring and concurrency with regressions. Root integrates client transport changes. Avoid live schema execution; record migration dependencies explicitly.
3. Shared experience (depends on inventory; parallel with isolated gameplay edits). Root owns theme, navigation, home/library, room browser, auth and shared game shell. Room UI agent owns create/join/lobby. Keep familiar dark game-night tone, add warm accents, improve typography and hierarchy, clear same-device vs online choice, mobile navigation and focus/error states. No new dependencies for decoration.
4. Verification (depends on 2/3). Execute unit tests, lint, production build; use local browser for all game setups and representative/full rounds including boundaries, mobile and keyboard. Use authorized test users only for online mutations. Independent reviewer must read anchor and final diff, then root resolves findings. Run forge gate with recorded evidence.

Rollback: local file diffs only; no production deployment. Database migrations, if necessary, remain explicit artifacts with their application status documented.

User amendments integrated: saved dark/bright themes; Scroll Landing Studio motion with reduced-motion support; rounded gaming components; persistent checkpoints; current dependency migration and warning cleanup. Latest verification uses an isolated production build, all eight online engine renderers and all eight local completion/replay flows, plus eighteen real database-backed game configurations. No production rollout or live migration is included.
