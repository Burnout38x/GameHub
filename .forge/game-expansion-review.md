# Independent game expansion review — 2026-10-06

Reviewer authored MarketPlay presentation only; this review excludes that presentation and covers the independently authored engines, API integration, migration, catalog and room lifecycle. Source reviewed while implementation was in progress.

## Finding

**P2 — room browser advertises full Market Day lobbies as joinable.** `src/app/rooms/page.tsx` lines 48 and 122 still compute capacity as `predict ? 2 : 10`. A four-player Market Day lobby appears as 4/10 and remains in Open lobbies, but joining correctly fails at the API's four-player cap. Use four for the market type in both count and filtering. Communicated immediately to parent. This is a visible incorrect flow; no membership authorization bypass.

## Checked

- Market endpoint checks same-origin, authentication, room membership, correct engine and playing state. Runtime command validation rejects stale versions, nonmembers, wrong-turn actors, malformed assets, illegal phase actions, noninteger destinations and insufficient resources. API computes state/scores rather than trusting client totals.
- Movement has three distinct legal routes. Ownership fees cannot create negative cash or eliminate players. Purchases/upgrades and supply/commission/bank costs agree with engine descriptions. Both trade sides must contribute; owned-stall checks, asset availability and bag/wallet capacity apply at offer and acceptance. Only the recipient can answer. Sender can expire an unanswered offer without cooperation. Invalid actions clone-before-mutation and leave the previous state unchanged.
- Turn resolution increments one version and advances ten complete rounds. Commission points, reputation, stall levels and capped savings determine prosperity. Final state and scores pass through a single row-locked transaction; final result writes occur within that same transaction. A lost response/retry cannot apply an action twice; the client receives a stale-version conflict. Finished status guards prevent repeated final stats.
- Normal joins, start and social invitations enforce the 2–4 player model. Social acceptance shares the room action lock, verifies invitation ownership/mutual following and checks capacity inside its RPC. Intentional departure aborts Market Day without awarding partial-match progress; a disconnected browser retains membership for reconnect. The existing departure handler's delete/close writes are separate statements (a pre-existing architectural pattern), so transactional fault injection is not established by static review.
- Existing answer, advance, memory, guess, predict, code, rule, chain and timer handlers reject the new engine; no cross-engine score route identified. Market total rounds are forced to ten server-side. Solo entries are excluded from room creation.
- Solo completion authenticates actor, replays exactly twenty valid offered-tile placements and computes score server-side. Payload score/profile fields cannot override these. Profile row lock plus per-profile/seed primary key makes recording concurrent/retried runs idempotent; progress/achievement writes are transactional, rate limited and preserve multiplayer win streaks. Practice runs cannot record progress. Match history intentionally has no room foreign key, so synthetic solo run identifiers are compatible with existing schema.
- New table RLS is enabled, anon/authenticated grants revoked; new mutating RPC execution is service-role-only. RPCs use empty search_path and schema-qualified references. Migration inserts inactive catalog entries, preserves previous records and expands the exact known type constraint; activation must follow compatible deployment.
- Catalog uses a distinct solo mode and Build & strategy category while retaining All games, search and previous modes. New multiplayer rematches reuse the finished-room path and regenerate a fresh authoritative state on start.

## Evidence boundary

No additional critical/high security or game-state defect found in this static review. Engine owner reports ten targeted Market Day tests including sixty-four complete deterministic simulations; parent must retain actual test output and complete isolated DB/API/browser checks (including duplicate final completion, unauthorized calls, four-player invitation capacity, reconnect and rematch). This report is not a production approval and does not independently assess the reviewer's authored MarketPlay UI.

## Follow-up

Parent reports fixing both room-browser capacity expressions. This closes the identified visible capacity finding; confirm in the integrated four-player browser/API flow. Market UI issues raised by a separate reviewer are tracked in `.forge/market-ui-build.md`, not treated as independently reviewed by this author.

Verified the capacity correction directly: both `src/app/rooms/page.tsx:48` and `:122` now include `type === 'market' ? 4`.
