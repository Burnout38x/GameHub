# Independent engine and source findings

Executed `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx qa-redesign/engine-review.ts` on 2026-10-07. Seven rule-test groups passed after fixes. Pocket browser evidence is in pocket-browser-summary.json; API/database execution remains pending.

## Results

- Pocket random placement: **0/30** charters, median 2 points. Immediate-score greedy: **0/30**, median 39. A planned target produced **30/30 legal gold histories**, 64 points. A complete winning history is saved separately for browser verification. This demonstrates achievable success and a consequence for shortsighted placement, not calibrated human difficulty.
- Market: all 2/3/4-player matches provide exactly ten turns each. Final equal-score matches return every player as joint winner. Claimed contracts reject a second rival claim. Rejected commands preserve input. Accepted trades conserve coins and recompute set points. Legacy supply/scoring behavior remains separate.
- Across 30 seeds in every seat, investment-prioritized play wins 52/60 against a contract-prioritized bot at two players, but only 17/120 against three such opponents at four players. Against the mixed bot the results are 50/60 and 17/120. These are intentionally simple policies; the investment policy can still claim contracts. Results show strategy value changes with player count and do not establish a universally dominant policy.

## Findings and retest status

**RESOLVED — replay variety was mostly cosmetic in Pocket.** Across 100 distinct seed strings there are only four complete 20-turn offer sequences. `pocketHash(...) % 4` uses only FNV's lowest two bits. The fixed map and fixed charter mean daily challenges repeat one of four puzzles; one static 64-point layout can be legally scheduled on all tested seeds. The core puzzle is improved, but replay incentive remains weak. Mix higher hash bits for v2 offers and preserve the legacy generator for v1 histories. Consider future blueprint variation only if it can be added coherently; it is unnecessary to introduce more mechanics during this release.

**RESOLVED — wholesale stock could not create competition.** Stock resets to `players.length * 2`; each player gets one business action and purchases exactly two. All players can always purchase once. A sold-out state occurs only after everyone has spent their turn, and the stock then refreshes. The UI makes this a major shared resource but no player can beat another to it. Either make stock genuinely contestable with clear advance notice and recovery alternatives, or remove its scarcity framing and redundant counter. Contract scarcity itself is real and useful.

**Low — rules constructor accepts unsupported runtime versions.** `createMarketDay` treats any value other than 2 as legacy, unlike Pocket's explicit 1/2 check. Server callers currently pass controlled values, so this is an API consistency issue rather than a demonstrated authorization hole.

## Motion source review

- Market travel uses a finite Web Animations sequence, follows intermediate clockwise board coordinates, lasts at most 1100ms, and depends on positions rather than polled object identity. The effect cancels prior animations on new movement/unmount and stores the authoritative transform underneath. There is no animation-driven state transition or permanent frame loop.
- Hidden documents and reduced-motion preferences skip travel. Construction and scoring CSS animations are finite; property art keys change on ownership/level, and score keys change only on score. Reduced-motion rules disable those animations.
- Pocket construction, service activation and stamp animations are finite transform/opacity effects. Preview piece has a separate key and ghost class, so confirmation can animate the committed piece; reduced-motion rules suppress the effects.
- Remaining browser checks: token alignment at mobile/desktop widths; no reanimation on unchanged poll; two updates during active travel; background/reconnect catch-up; resize during travel; failed request produces no false reward; final result route and reduced-motion operation. Reconnect may skip intermediate historical actions; do not describe its catch-up interpolation as an exact replay of unseen turns.

No product, production or database files were changed by this review.

## Fix verification

- The v2 offer mixer now yields 100 distinct histories across 100 seed strings; legacy generator remains separate. Updated fixture still legally earns gold on 30/30 seeds.
- Wholesale stock is now 2 × (players − 1). A full legal round for 2/3/4 players verifies all but the final buyer consume stock, the final buyer is denied, and the following round refills it.
- Latest random/greedy Pocket medians are 2/38 points, both 0/30 charters; planned layout remains 64 points.
