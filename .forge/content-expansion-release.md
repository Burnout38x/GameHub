# Content expansion release

- Published 30 new hard Doctor Dash questions (48 hard, 44 easy total). Original wording, publisher textbook fact-check map in `doctor-dash-content-sources.md`.
- Published separate Truth or Dare: After Dark (18+) game: 16 Flirty and 24 Bold prompts. Non-graphic, consensual, skippable date-night content. Original Truth or Dare's 25 prompts unchanged.
- Shared turn rules include the new pack; natural turn-based prompt games now round requested counts to equal turns. Tested three requested rounds becoming four for two players, unauthorized-turn rejection, completed/skipped scoring and game completion.
- Native independent review checked content, flow and additive migration. Reviewer caught equal-turn issue and code-before-content sequencing; both addressed.
- Generator validates exact answer membership and unique choices/prompts. Local additive migration applied twice: 71 new rows including game, then zero. 80 unit tests, zero-warning lint, isolated production build, five full flow/content checks passed. Disposable users/rooms cleaned; local app stopped.
- Feature commit ab5d2de308b8faa35c4870491f4d05d1e6ea5a3a pushed to main and upgrade branch. Exact Vercel Production deployment 6898376197 succeeded before activating the new game.
- Applied migration 20261007001332 only to authorized jnzbncbmcewsvtjjmddn. Counts 696→766 prompts; all 696 originals retained. Existing profiles 4, rooms 24, match results 20 unchanged. Live `/games` returned 200 and displayed the new 18+ game.
- Gate: three conditions PASS, exit 0 parse mode. Mutating integration tests and production migration were executed explicitly rather than rerun automatically. Supabase-managed connection configuration warning was not altered.
- Rollback: disable the new game if necessary, retain prompt IDs referenced by active rooms; no content wipe or reset.
