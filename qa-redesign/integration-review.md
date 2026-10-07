# Integration review

2026-10-07, static inspection while implementation is in progress. These findings do not substitute for executing the final app.

| Area | Finding | Status |
|---|---|---|
| Pocket replay | API defaults omitted rules version to legacy v1; accepts only numeric 1/2; passes version to replay and score | Pass, static |
| Pocket deduplication | v2 submissions use `v2:seed`; seed capped at 97 before three-character prefix; legacy accepted seed formats cannot collide | Pass, static |
| Pocket progress | RPC still writes `won=false` and completion points. No unimplemented victory persistence is implied by API | Pass, static; inspect final UI copy |
| Market result route | Finished Market renders MarketPlay plus EndScreen with controlsOnly; generic duplicate title/scores suppressed | Pass, static; real final-action test pending |
| Rematch | Host action, non-host join link, error message, navigation and leaderboard survive controlsOnly | Pass, static |
| Authority | Market route authenticates membership, validates running game, derives caller identity server-side and preserves atomic expected-version RPC | Pass, static; API adversarial execution pending |
| Cancelled rooms | `market_player_left` marks room finished while engine phase can remain active; finished-Market renderer may briefly show playable content before redirect effect | Follow-up sent to root; verify guarded rendering |

Final browser tests must confirm actual winner IDs, score totals, rule-specific result descriptions, and return/rematch controls rather than checking a separately mounted component in isolation.
