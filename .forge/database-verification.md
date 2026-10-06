# Isolated database and API verification

Environment: separate Supabase CLI 2.116.0 project `/private/tmp/gamehub-codex-audit-20261006`; project ID `gamehub-codex-audit-20261006`; local API `127.0.0.1:58321`, Postgres `58322`, separate copied Next app `3199`. Existing user Docker stacks and live Supabase projects were not modified. The original application's environment files were neither changed nor used by these test runners. Locally generated keys are stored only in the temporary project `local.env`, not this report.

Commands actually run:

- `node scripts/test-database.mjs` → 8 check groups passed. Applies schema and both migrations to isolated Postgres; reapplication; authenticated RLS privacy; username-only profile edit; protected RPC execution; two concurrent lease claims, wrong-token release; concurrent duplicate and separate-room finalization; injected insert failure rolls back all finalization effects.
- `node scripts/test-database-app.mjs` → isolated copied app ready on port 3199. Prevents `.next` conflict with the user's current app.
- `node scripts/test-database-routes.mjs` → all 18 games and nine additional lifecycle/concurrency flows passed, with exact expected scores checked for every game. Uses real Auth cookie sessions, HTTP route handlers and PostgREST against local Supabase.

The 18-game route suite seeds deterministic local prompts to test engines independently of content quality; authenticates four isolated test users; exercises creation, joins, host start, valid/invalid input, secret-safe snapshots, gameplay to completion and per-player history. It also races two predict joins, races all quiz submissions and challenge votes, exercises host transfer/departed-answer quorum/rematch, and ensures leaving a vote does not strand the game.

Sources consulted: Supabase [local-development CLI guide](https://supabase.com/docs/guides/local-development/cli/getting-started), [RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security), and [changelog](https://supabase.com/changelog). The recent listed platform/API changes do not alter the SQL primitives or RLS semantics used here. Markdown variants returned unsupported content type, so HTML docs were used.

## Reproduce

1. Use `supabase init --workdir /private/tmp/gamehub-codex-audit-20261006` for a new isolated test project. Its `project_id` must start with `gamehub-codex-audit-`; use API port 58321 and DB 58322 (other generated 543xx ports changed to 583xx).
2. Start only that project with `supabase start --workdir /private/tmp/gamehub-codex-audit-20261006 --exclude realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor`.
3. Save local CLI status as env into the temporary project's `local.env` without printing keys.
4. Run database script, then isolated app launcher, then route script from repository root. Scripts hard-reject nonlocal/non-audit targets.
5. Stop the app process and only that Supabase project when no longer needed. Never use global Docker cleanup; unrelated user stacks must remain running.

## Practical limits

- No migrations have been applied to the user's live database. Deployment needs coordinated migration/application rollout after current users finish; old clients rely on direct table reads and must not be left running across privacy-policy change.
- The room lease is 120 seconds and route declarations limit execution to 30 seconds. Hosting must enforce that hard lifetime. Unbounded self-hosted process pauses require fenced/transactional game transitions before this can be treated as a strict concurrency guarantee.
- Individual gameplay score/state writes are serialized but still separate database requests; a network failure between them can leave partial progress. Atomic finalization is verified transactional. Tests here cover normal operations and concurrency, not arbitrary network partition recovery.
- Local stack excludes Realtime; app polling fallback is exercised at API level. Browser visual/keyboard verification belongs to the separate UI phase.

## Stale round protection follow-up

Every quiz/prompt answer and guess/memory/code/predict/rule/chain mutation now requires integer `fromRound`, and the client sends the round being displayed. Under the room lease, handlers reject missing, future or previous-round values before any game write. The integration suite now checks these failures for every one of the 18 games and explicitly advances a quiz, then submits an old-round answer to verify neither next-round answers nor scores change.

This guards cross-round delay, not every same-round replay. Memory flip sequences and other engines with multiple actions per round would need an additional monotonic action revision to distinguish all stale turns; current membership/turn validation and room serialization still apply.

## Timer concurrency correction

Browser verification exposed that two automatic expiry requests could reveal and then immediately finish/advance the same quiz. Automatic requests now send `revealOnly:true`; the server checks required `fromRound` first and treats a second reveal-only request as a successful no-op. Explicit Next/Finish is the only advancing intent.

`node scripts/test-database-timer.mjs` → two real multi-client scenarios passed: one-round quiz remains playing/revealed until Finish; two-round quiz remains on round zero until Next. Missing/stale rounds and early reveal are rejected, and expiry creates no match history. No database reset or live mutation was involved.

## Post-framework-upgrade rerun

Both complete HTTP suites were rerun against Next 16.4.0 on isolated port3199 after async-cookie/params/proxy migration: 18 games +9 lifecycle/concurrency flows and2 timer race scenarios passed, exit0. Source includes new saved-theme/derived-memory UI changes, independently reviewed in `.forge/independent-ui-final-review.md`; rendered coverage remains browser-agent evidence. No reset, live migration, or existing user data mutation occurred.
