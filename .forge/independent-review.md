# Independent review — 2026-10-06

Anchor re-read: `.forge/anchor.md`, including both saved themes and prohibition on touching live data. Reviewer originally authored only room creation, joining and lobby; those three files are excluded from this independent review. Reviewed current shared UI/navigation/auth changes, room snapshot/client integration, all eight online engine renderers, multiplayer transitions, and changes to all eight local games plus their helpers and audit matrix.

## Findings and disposition

1. **High — legacy Memory boards lose their deck after a completed pair.** In `src/app/api/rooms/[code]/memory/route.ts`, fallback reads legacy `state.cards`, but completed-pair update strips card identities to `{matched}` without saving the deck to room_secrets. Next flip reports “Memory board missing”. Reported to multiplayer agent for legacy-compatible persistence.
2. **High — Memory client can remain permanently disabled after another player's quick flip.** `MemoryPlay` missed-pair effect starts a 1100ms timeout; new `lastPair=null` snapshot cancels it without clearing `peek`. Fixed by reviewer: reset peek whenever lastPair is cleared/matched. Requires browser regression with staggered clients to exercise timing.
3. **Medium — transient room GET failures unmount gameplay.** `RoomClient` returns an error screen even with a valid existing bundle, discarding active input and the local Two-Minute Challenge timer. Root is fixing with a persistent game and connection banner.
4. **Medium — online Who Remembers still auto-matches distinct emoji/punctuation answers.** API normalizes to empty then treats equal empty strings as exact. Also fuzzy matches remain forced online while local now allows adjudication. Reported to multiplayer agent to share `memoryMatch` semantics.
5. **Medium — online Word Chain final word bypasses challenge review.** `advanceTurn` finishes immediately at total_rounds; local game now correctly offers final review. Reported to multiplayer agent; requires explicit final review or truthful documented rule distinction.
6. **Medium — online Word Chain accepts numeric/multiword submissions.** Server normalizes and length-checks but does not use local `isAssociationWord`; reported to multiplayer agent.
7. **Low — Chain client offers a challenge after this turn already used one.** API correctly rejects; reviewer fixed `canChallenge` to check `challengedTurn !== turnIndex`.
8. **Low — online final standings give tied players unequal medals.** `EndScreen` uses index for gold/silver/bronze although winner_ids/title acknowledge tie. Reported to root for shared rank-based display.

## Source checks with no additional finding

- Quiz snapshots preserve options/question/hint, reveal correct answer/fact only after reveal; answer arrays retain identities for waiting counts while hiding others' choices. Prompt and Predict components remain compatible, including deliberate free-text adjudication result display.
- Rule used-rule ID history is removed from public snapshots; rule choices/evidence remain available.
- Code/Guess components retain public history and round-local state resets; secret values remain server-side.
- Middleware preserves selected game query across login. Login restricts next destination to a local slash path and rejects slash-slash/backslash redirects. Anonymous local-game routes are accessible.
- Local game fixes cover sampler counts, Unicode matching, ties, missing private-answer reveal, rotating code starters, timer cleanup and math locks. No additional regression found by source inspection; helper tests do not establish browser lifecycle correctness.
- Theme variables, prehydration saved preference, storage error handling, accessible theme action, and shared ink token are coherent in source. Rendered contrast and mobile flows require browser verification.

## Verification

- `node --import tsx --test tests/*.test.ts` → 34 passed, 0 failed.
- `npx next lint --file src/components/room/MemoryPlay.tsx --file src/components/room/ChainPlay.tsx` → no warnings or errors.
- No production data or migrations touched by this reviewer.
- Browser/network concurrency and all-game playthroughs are NOT CHECKED by this review; parent verification phase owns those checks.

Verdict: **Changes required** until findings 1, 3–6 are resolved and integration evidence is recorded. Items 2 and 7 are fixed locally; they now require another reviewer for independent approval.

## Resolution review

Re-read the implemented resolutions after the owners' updates:

- Finding 1: legacy memory deck is persisted to room_secrets before identity-stripping updates, with save failure returned before mutation.
- Finding 3: connection banner preserves the loaded lobby/game/result component across transient GET failures.
- Finding 4: online free-text prediction now uses shared memoryMatch and auto-awards exact matches only; other cases enter adjudication.
- Findings 5–6: online Chain validates a single word and introduces finalReview with accept/challenge actions. The final vote calls the transactional finish RPC, which reads current database scores.
- Finding 8: medals use the first position for each distinct score, preserving tied ranks.
- Findings 2 and 7 rechecked by their author, **not an independent approval**: Memory peek resets on cleared lastPair; Chain repeat challenge checks challengedTurn. Another agent must independently cover these.

The reviewer additionally improved Quiz/Guess/Code/Rule/Predict/Scoreboard: visible input labels, busy input handling, alert errors, meaningful code-entry grouping, hint state, progress semantics, explicit current-turn text, wrapping names and stronger muted text. These changes also require another agent's independent review.

Additional verification:
- Targeted Next lint for the six renderer files → no warnings or errors.
- `npx tsc --noEmit` → exit 0.
- Dark-theme source contrast calculation, compositing ink #f7f4ed over surface #1b242d: alpha .50 = 4.64:1, .60 = 6.04:1, .65 = 6.82:1. Alpha .40 = 3.48:1 and should not label meaningful normal-size text; reviewed code uses it only for a decorative separator. These are source-derived colors, **not rendered-pixel/browser contrast measurements**.

Updated source-review verdict: original actionable findings are resolved in code. No additional material source defect identified in reviewed scope. Completion still requires parent verification and independent review of this reviewer's own changes; this document does not assert full browser playthroughs or production migration application.

## Modern rounded scoreboard/results follow-up

Reviewed root's preceding wrapping patch independently: the winner h1 correctly combines min-w-0, max-w-full and overflow-wrap:anywhere to permit long uninterrupted names to wrap within the flex container; player names also use anywhere wrapping. No source issue found. Actual long-name browser validation remains with the online browser agent.

Then implemented authorized visual changes in Scoreboard and EndScreen: grouped live-game header/progress, rounded score tiles with explicit turn labels, result medallion, ranked score rows, tied winner labels and clear rematch/navigation actions. Preserved wrapping, progress semantics, reduced-motion shared classes, saved-theme tokens and gameplay behavior. This follow-up implementation is self-authored and requires independent review.

- Targeted Next lint on Scoreboard/EndScreen → no warnings or errors.
- `npx tsc --noEmit` → exit 0.
- Both files copied into isolated audit app; no database changes/restarts.

## React 19 local-hook review

Independently reviewed all eight local page changes after the framework upgrade. Timed games (Mystery, Math, Reverse Definition, Chain) now invoke `useEffectEvent` callbacks from their interval effects, so current state is read without restarting the interval on typing/score changes. Stop conditions and interval cleanup follow phase/round/paused state; Math retains its immediate done ref and clears old lock timers. Chain explicitly distinguishes submitted final words (review) from timeout endings (result), retaining challenge eligibility. Mystery/Reverse transitions no longer update other state from within state updater callbacks. Rule selection and optional text state remain event-driven. Existing private-answer handoffs and transition cleanup remain intact. No actionable source regression found.

Upgraded-stack browser run reached all 60 setup/home/library matrix screens with zero axe/overflow findings, but interactions failed globally while Next development HMR upgrade requests returned invalid HTTP responses. These are NOT passing interactive checks. Parent is preparing a fresh isolated production build; complete-game browser results must be rerun there before updating the final verdict.
