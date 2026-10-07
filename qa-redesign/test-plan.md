# Execution plan

## 1. Freeze rule expectations

Read the finished engine exports and author's design notes. Map renamed concepts to requirement IDs in README. Record the tested source revision. Build legal fixtures through engine commands; a direct state fixture is acceptable only to isolate an invariant, and must be identified as such.

## 2. Independent engine and strategy checks

Pocket:

- Exercise all board edges; disconnected versus entrance-connected paths; access gained after a later connector; service that helps multiple homes without accidental duplicate rewards.
- Derive a complete legal successful history and deliberately unsuccessful history. Assert thresholds on the exact final board, medals, and practice behavior. A score alone must not falsely imply success.
- Reject invalid tile offers/cells, duplicate cells, malformed histories and post-completion placements without mutating input.
- Replay and reload the legal histories; compare scores/outcomes and rule versions. Preserve a real legacy fixture.
- Compare at least 30 fixed seeds for random and greedy policies, then an objective-aware policy. Report success rate, median and range; investigate seeds with impossible offer supply and strategies that trivially win nearly all runs.

Market:

- Finish matches with 2, 3 and 4 players; count turns per ID and first-player opportunities. Test accept, decline, cancellation and normal end at final-round boundaries.
- Claim one contract then attempt a second claim by another player; verify location/supply/cash requirements, district completion and next-day replacement.
- Reject stale versions, wrong actors, invalid movement, unaffordable actions, malformed assets and post-finish commands. Verify input state remains unchanged after rejected actions.
- Trace cash/supplies/stall ownership through accepted, declined and cancelled trades; reject overflow; recompute district scores rather than accumulating duplicate bonuses.
- Compare repeated delivery, investment-first and demand-aware bots in both seat orders across 30 seeds at 2 and 4 players. Inspect strategy dominance and first-seat advantage; do not label simulations as proof of perfect balance.
- Advance a legacy room through all old phases and completion without invoking new contracts or changed scoring.

## 3. Integration and authority

Use isolated test users. Verify anonymous 401, outsider 403, wrong-turn/stale 409, same-origin rejection, and valid actor success. Submit duplicate final commands concurrently; exactly one may commit and exactly one result/history update occurs. Compare final engine score to room players, winner IDs, history and the real EndScreen.

Pocket API must select the same rule version as the browser and derive score/outcome from history. Retry a successful completion without double-counting; malformed/incomplete histories fail. Existing SQL records completions with `won=false`, so UI must not promise account victory statistics unless that path is deliberately implemented.

## 4. Browser play and motion

At 390×844 and 1440×1000, use real controls for one meaningful Pocket build and Market turns spanning movement, claimed contract, trade and day transition. Load complete legal fixtures only to reach final branches efficiently; state which portions used fixtures. Check keyboard access and 200% zoom on the active board/actions.

Motion checks:

- Inspect token positions before, during and after one committed move. Intermediate position must lie between the old and new locations and end at the authoritative destination; no travel should fire merely because a poll returns the same state.
- Place a building and earn a reward. Existing pieces must not all replay their arrival animation. Animation settles after its declared duration.
- Trigger another valid state update while prior movement is active, resize, switch away/back, and simulate network loss. The visual state catches up; no invisible token or stale overlay survives.
- With `prefers-reduced-motion: reduce`, spatial travel is suppressed or near-instant; controls and feedback still work. No infinite CSS animation or requestAnimationFrame loop remains active while idle in the game itself.
- Animation is presentation only: request/version state gates actions, never an animation-end event that may not fire. On failed request show error and no false committed movement/reward.

## Integration watch list from initial inspection

1. `RoomClient` switches finished rooms directly to `EndScreen`. New result content only in `MarketPlay` would be unreachable after a real finish.
2. `commit_market_turn` commits state, scores and `finish_room_game` atomically. Preserve its expected-version fence and ensure final `turnIndex` remains a valid player index.
3. Polling replaces room state every 1.5 seconds. Movement effects must compare stable version/action/position, not object identity.
4. `record_pocket_completion` deduplicates by player and seed, not mode/rule version. A new daily rules version must not accidentally collide with or reinterpret an already-recorded legacy day.
5. Closing a Market room on departure is cancellation, not a competitive finish. Do not animate a fabricated winner before the redirect settles.
