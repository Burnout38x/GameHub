# Independent final UI and local-game review — 2026-10-06

Anchor reread, including saved bright/dark theme, useful motion, durable log and live-player safety amendments. Reviewer authored server/API work; **server/API/migration changes are excluded from this independent review**. Reviewed root, room_ui and local-game agent changes: room creation/join/lobby, shared navigation/library/theme/motion, all online renderer components, all eight local page diffs, helper changes and actual React component flow tests.

## Findings and resolution

1. **Medium: failed automatic timeout can permanently strand an expired round/turn.** QuizPlay and ChainPlay initially stored the deadline in timedOutRef before sending and swallowed failure, so an identical deadline would never retry. Root corrected both: failure clears the marker, emits a visible error, and subsequent clock tick retries. Independent component tests in `tests/room-ui.test.tsx` inject a failed fetch then verify retry and cessation after success. **Resolved.**
2. **Low: create-room load-error retry lacked the shared button styling.** `btn-ghost` was undefined. Reviewer changed to existing `btn-secondary`; parent should independently inspect this one-class change. **Fixed, pending parent acknowledgement.**
3. **Low: Memory error feedback lacked alert semantics while other games had them.** Reviewer added role=alert. Parent should independently inspect this attribute change. **Fixed, pending parent acknowledgement.**

No other material source regression identified in reviewed scope. This verdict does not substitute for browser observations.

## Independently verified prior reviewer's changes

- Memory miss effect depends on scalar pair values/move count, does not restart on equivalent polling snapshots, and resets peek when pair clears. A new React component test exercises both and confirms board re-enables.
- Chain suppresses repeat challenge when challengedTurn equals turnIndex; a new component test covers final-review controls and suppression.
- Guess inputs have numeric range/required validation, label and error association; Code keypad has meaningful digit labels and guess group; Rule/Predict input labels and disabled states match engine actions.
- Quiz hints expose expanded state and options remain stable across poll snapshots; Scoreboard communicates turn text, named numeric progress and score-change animation; EndScreen uses shared ranks for tied medals.
- New-room displayed rounds and submitted rounds derive from the same valid game options; rule/chain/predict minimums are consistent in Lobby; copy-code success awaits actual clipboard fulfillment; join rejects malformed codes and retains retry paths.
- Shared ink/theme tokens and prehydration script use the same saved key as ThemeToggle. Blocked localStorage still changes visual theme and announces failed persistence. Themes do not alter game state.
- Local game lifecycle tests mount real components, invoke their events/effects, and cover completion/replay across all eight games, timer expiration/cleanup, locks, private handoffs, final challenge and ties. Helper tests complement these; they are not mislabeled browser tests.
- Motion is limited to short page/result entry, score feedback, hover lift and card suggestion transitions. Reduced-motion media rules disable animation/hover movement/smooth scroll and progress/card transitions. No scroll hijacking or perpetual decorative loop introduced.
- Durable `.forge/progress.md` contains completed work, verification, remaining steps, live-data boundary and exact resume point. Numerical/progress statuses still need parent's end-of-phase refresh to reflect the completed integration suite.

## Verification

- `npm run lint` → no ESLint warnings or errors.
- `npx tsc --noEmit` → exit 0.
- `npm test` → 56 tests passed after adding four independent room-renderer regression tests; final rerun output recorded by parent.
- Browser visual/responsive/reduced-motion observation remains parent's browser verification scope. No live database changes made during review.

Independent source-review verdict: **PASS for reviewed owner changes with original material finding resolved**; parent must acknowledge the reviewer's two tiny fixes and incorporate final browser evidence before overall task completion. This is not an independent approval of this reviewer's server implementation.

Parent review: inspected the retry button’s shared class and Memory error `role=alert`; both are appropriate, preserve behavior, and are accepted. Browser verification is recorded separately.

## Latest Scoreboard / EndScreen polish review

Independently reviewed the room_ui/root-authored final versions after their visual polish:

- Scoreboard retains one stable player row key, uses score-keyed short reward animation, communicates current turn in text as well as border color, wraps long player/game names, and keeps valid progress semantics for supported room state. The visual change does not change scores or turn order.
- EndScreen preserves shared-rank medals for ties, winner IDs for winner labels, host-only rematch controls and existing request payload. Decorative trophy is hidden from assistive technology; final standings use a heading and ordered list. Long title/player strings now wrap inside min-width-zero containers, while score/rank remain legible.
- Root's final `min-w-0`, `max-w-full` and `overflow-wrap:anywhere` patch correctly targets the long-winner-name overflow without changing interaction or scoring semantics.
- New hover lift/icon rotation has a reduced-motion override; existing score/result animations remain covered by reduced-motion rules.

Verdict: **PASS, no additional material source finding**. Parent separately inspected the rendered mobile result screenshot; this subsection records source review only.

## React 19 warning-fix review

Independently reviewed root's new MemoryPlay and ThemeToggle implementations after the framework upgrade:

- Memory derives missed-pair visibility from a stable move/card key and the last settled key. Equivalent polling snapshots do not restart its timeout. Clearing/matching a pair immediately removes the derived peek without a synchronous effect state update, so canceled timers cannot leave controls disabled. New move keys get a fresh 1100ms reveal; expiry alone updates settledPair. No material source finding.
- ThemeToggle reads its document preference through useSyncExternalStore with a stable subscription and primitive snapshot. The server fallback is deterministic and never reads document; initial saved theme remains established by the prehydration script. Toggle updates the document, dispatches the matching same-tab event, persists storage and announces storage failure independently. Subscription cleanup uses the same listener. No material source finding.

Verdict: **PASS source review**. Root is rerunning updated DOM tests; source review does not claim browser verification of these latest implementations.

Parent inspected the final admin/new-room lint refactors: stable Supabase client instances, asynchronous result delivery with effect cleanup, and derived per-game timer selection preserve the intended behavior. No blanket hook-rule suppression added. Parent also inspected the final bright mobile Code Crackers result screenshot: long names wrap, tied-rank structure/actions remain clear, and the rounded result panel fits the viewport. Final browser evidence is rerun against the upgraded production build.
