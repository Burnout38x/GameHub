# Game expansion implementation

2026-10-06: User authorized building selected Pocket Paradise and Market Day. Forge anchor created; original completed anchor archived. Native delegation available: solo implementation, pure market engine, market UI assigned separately. Parent owns integration, SQL, APIs and validation. Supabase skill used; official functions docs and changelog checked (Postgres extension compatibility notice does not affect these standard SQL functions).

Phase 1 — contracts established. Solo seeded replay scores 20 placements; progress API dedupes seed per user. Market server validates commands then transactionally persists state/scores/completion with expected-version fencing. Catalog distinguishes solo, online and pass/play. Market capacity4 applies both join and invitation RPCs. Explicit leaving ends fixed-player match without results; closing tab preserves room for reconnect. No production database changes yet.

Phase 2 — implementing. Additive migration 20261007005306 applied to isolated Docker DB only. New game catalog entries initially inactive for deployment order. No production writes. Next: finish UI/API, unit tests, full local lifecycle and responsive checks, independent review.

Phase 1 exit MET; anchor reread, goal unchanged. Phase 2 implementation MET.

- Pocket: six engine tests. Market: ten engine tests. Full suite: 97 passed.
- Market API: full four-player, forty-turn match; concurrent moves and trade acceptance; reconnect; rematch; explicit departure; solo replay. Ten check groups passed with zero page errors. 141 local requests, p95 about 202 ms.
- Independent reviews found stale trade drafts, ambiguous reward wording and incorrect room-browser capacity. All corrected. Generic Market scoreboard removed to avoid duplicate scoring presentation. Atomic departure added after review.
- Pocket: 58 browser checks passed.
- Phase 3 ongoing: rebuilt API security tests and actual two-player UI flow.
- Production remains untouched: read-only counts are 4 profiles, 24 rooms, 20 history rows, 766 prompts. Schema backup and row digests recorded.

Phase 3 exit MET for engine/API/database checks: 98 unit tests, lint without warnings, isolated production build successful. Nine security groups passed including direct-role denials, invitation capacity, transaction rollback, simultaneous completion, rate limits and atomic departure. Independent findings resolved. Browser UI evidence finalization in progress (normal WebKit join navigation had zero errors; forced hard-navigation diagnostics retained separately).

Phase 4 started: production migration 20261007005306 applied to jnzbncbmcewsvtjjmddn only. Both new catalog entries remain inactive. Profiles, rooms, history and prompts hashes exactly match pre-migration snapshot. Existing Supabase platform configuration warning unchanged; no platform settings modified. Next: push reviewed code, wait for successful production deployment, activate only the two new game entries, read-only live smoke.

Final browser phase MET: Market UI completed a two-player 20-turn match through controls, trade accept/decline and returning-turn draft reset. Combined run 116 checks included 80 theme/viewport cases and 16 axe scans, with no layout or axe findings. Two WebKit messages around forced hard navigation were retained in diagnostics. Final normal user-navigation WebKit rerun: 49 checks, zero page errors, zero layout/axe findings. Pocket: 58 checks, zero page errors. These are browser emulations, not physical-device or screen-reader certification. Dimensional boards use CSS toy art; no WebGL/physics engine is claimed.
