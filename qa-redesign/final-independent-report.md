# Independent redesign acceptance

**Verdict: accepted for release review.** The redesigned rules and presentation meet the local acceptance gates. Production deployment remains the root agent's separate release step; these results do not claim production verification.

Revision: current uncommitted working tree; the root agent will append the release commit SHA after commit. Defect reproductions and fix evidence are in `BUG-TRACE.md`.

## What changed in quality

Pocket is now a connected-neighborhood puzzle with a readable charter, costly infrastructure, dependent services, earned medals and a specific failed outcome. Independent random and immediate-score strategies fail the charter on all 30 tested seeds; planned legal histories succeed on all 30, including a 64-point gold town. This demonstrates that planning matters and success is attainable. It does not establish optimal human difficulty. A fixed blueprint still allows learned layouts to carry across seeds; that is a bounded replay limitation, not an unresolved correctness defect.

Market now ties contracts to location and owned capacity, makes district sets worth trading for, and creates genuinely contested stock and contracts. Investment-heavy play performs better at two players and worse against three opponents in the simple independent simulations; no single universal policy was demonstrated. The finite ten-turn result is explicit and explains the winner's scoring advantage.

## Findings traced to verified fixes

| Finding | Fix | Independent verification |
|---|---|---|
| Pocket seeded offers repeated only four histories | v2 full-width hash mixing; original offer generator retained for v1 | 100 distinct histories / 100 seeds, legal gold history regenerated |
| Market stock could never deny a player a purchase | Stock reduced to two supplies per player minus one player | Legal 2/3/4-player engine depletion; two actual HTTP matches deny final buyer and refill next round |
| Theme styles obscured important text | Scoped Pocket header background and contrasting Market phase foreground | All 16 width/theme game-region axe scans per game now report zero violations; screenshots inspected |
| Co-located mobile Market tokens hid player numbers | Fixed circular tokens arranged in two nonoverlapping rows | Legal three-player co-location at 320px, bounding-box assertions, refreshed visual inspection |

Turn guidance was also improved and verified: Market focuses business controls after travel and provides a public-contract jump. No product files were edited by the reviewer.

## Independent executed evidence

- **Rules and strategies:** seven invariant groups; legal Pocket successful/failed strategies; Market 2/3/4-player equal turns, contested claims, stale/wrong actors, immutable rejects, trade conservation, set recomputation and original-rule preservation. See `engine-summary.json`.
- **Pocket browser:** twenty real control placements for a failed charter; legal 19-move fixture plus keyboard final placement for gold; postcard, reload, exact retry, keyboard preview/cancel, responsive/theme and 200% zoom checks. Construction settles in 0.38 seconds; reduced motion suppresses it. See `pocket-browser-summary.json`.
- **Market browser:** all-theme board geometry, eight-waypoint finite travel, no travel restart for unchanged positions, reduced motion, interrupted presentation, token crowding, focus progression and fixture result. This phase used the explicitly identified author wrapper and is not database evidence. See `market-browser-summary.json`.
- **Real backend:** authenticated, nonmocked 2-player and 4-player sessions completed 20 and 40 turns. Eleven public contracts were claimed, twelve set-scoring states observed and two restocks denied. Every committed state and persisted score matched expectations; concurrent move, trade and final commands committed once. Two browser clients converged through actual polling and reload. Persisted winner IDs/history and host/non-host rematch flows passed.
- **Pocket real API:** v2 replay ignores forged client score; concurrent completion records once; explicit null/unsupported versions rejected; legacy and v2 same-seed records remain separate. Completion statistics increment once and do not fabricate a competitive victory. Anonymous/authenticated direct result RPCs are denied. See `backend-summary.json`.

A separate real HTTP compatibility probe resumed a valid unversioned Market save, submitted an original commission without contractId, verified unchanged supplies/cash/point rules, and aborted on departure without a winner/history. Its two accounts and one room were cleaned and checked. See `legacy-market-http-summary.json`.

WebKit Pocket independently repeated the full UI failure and fixture-assisted gold flow, postcard/reload, keyboard, all 16 theme/width axe checks and finite/reduced motion, with separate `pocket-webkit-*` evidence.

WebKit Market also passed actual authenticated room actions at 390/320/1440: finite 680–900ms waypoint movement, round tokens, no overflow or game-region axe violations, next-action and contract focus, and zero travel animation under reduced motion. Two existing social-navigation access-control messages were recorded separately; there were no game errors. The successful run's two users and one room were cleaned and verified. Earlier harness synchronization/login failures are preserved and classified in `BUG-TRACE.md`; they are not omitted from the audit. See `webkit-market-summary.json`.

The root subsequently found and fixed Pocket's nested-main landmark using a semantic section. Its final page-level smoke/axe checks cover that last root-owned change; no gameplay code changed after the independent flows above.

The main real-backend suite created five disposable users and four rooms. All were removed by exact ID; subsequent queries found zero associated rooms, profiles, match histories or Pocket completions. No production data was touched.

## Scope and limits

Actual backend evidence used loopback app 3199 and gateway 58321 with real GoTrue v2.196, PostgREST v16.1 and PostgreSQL 17.11 Alpine. This reduced local stack differs from a full hosted Supabase deployment; it verifies real auth, HTTP, SQL and persistence within those documented limits. Root's final checks report 114 unit tests, lint and type checks passing; those are separate from the independent results above.

Axe checks are not a complete screen-reader certification. No committed visual baseline existed, so visual regression comparison is inconclusive; current views were inspected directly. Author balance/visual simulations remain in `author-market/` and are supplemental, not substituted for independent evidence or actual backend tests. Screenshots are curated and contain only disposable fixtures.
