# Independent Pocket / presentation review — 2026-10-06

Scope: read-only review of `src/lib/pocket-paradise.ts`, `src/components/games/PocketParadise.tsx`, both new CSS modules, `src/components/room/MarketPlay.tsx`, Pocket progress route and the expansion anchor/selection. I did not author these files. I authored the Market Day engine, so this is **not** independent review of that engine. Parent owns API/database/browser integration validation.

## Findings

1. **Medium — stale Market trade inputs can disagree with the displayed select.** `MarketPlay` keeps `give`/`receive` across turns. After a traded stall leaves the owner's assets, its `<option>` disappears but the state still contains its index. The select can display “No stall” while submitting the former index. Server rejection prevents unauthorized transfer, but a later apparently valid trade fails confusingly. Reset drafts when a new own turn begins and/or normalize selected stalls against current ownership; test next-turn reuse after exchanging a stall. Sent to parent promptly. Pending correction at review time.
2. **Low — Market purchase label describes gross points as immediate prosperity.** “+2 prosperity” is two stall points; the purchase also spends cash and may reduce the savings contribution. Label it “+2 stall points” or show the net score preview. Similarly, commission's +5 is its reputation/commission component, before any savings change. Sent to parent.
3. **Informational — browser save is one shared slot.** Pocket clearly warns that starting a new run replaces the saved board, and failures leave the board playable with a storage warning. Two simultaneous tabs are not coordinated, so the last writer wins. Cross-tab play is not an anchor acceptance requirement; do not claim cross-tab-safe persistence.

## Checks with no blocking finding

- Pocket reconstructs saved boards from validated seed/mode/moves, ignoring forged board/score fields. Placement rejects occupied/out-of-range cells and invalid offers. Scoring counts only cardinal adjacency and counts same-kind edges once; preview uses exactly the commit function and score function.
- Twenty placements end the run. Requests award once; replay is deterministic. A completed restored run retries recording. Practice explicitly excludes account statistics.
- Pocket local persistence starts only after hydration/restoration; invalid saved histories are rejected. Choosing a new run is behind an explicit “start fresh” details section with a replacement warning. In-flight progress response generation guards prevent stale messages overwriting a new run.
- Progress route authenticates identity, checks same origin, bounds request length and replays all 20 moves rather than trusting a score. Daily date-shaped seeds are accepted for old resumed runs; there is no public daily ranking and no claim of cheat-proof competition.
- Pocket plot buttons expose row/column and tile labels, selectable previews use aria-pressed, placement messages are live, confirm is disabled without a plot, native buttons handle keyboard activation. Occupied plots remain readable in screen-reader browse mode despite being disabled controls. Flat board removes dimensional transforms. Reduced-motion CSS removes placement animation and hover motion.
- Market board uses visible player numbers, names, ownership and visit fees, with actionable routes as native buttons. Business-action availability matches resource/ownership constraints. Trade fields have explicit labels, fieldsets and min/max controls; errors and turn updates have live semantics. Currency limits, commission components, shared ties, round income and no elimination are described in rules.
- Market flat mode removes toy transforms; reduced motion removes animated hover changes. Grid columns use minmax(0,1fr), names inherit wrapping, and mobile trade fields collapse at narrow widths. This source inspection does not replace actual viewport or screen-reader testing.
- Research was a selection rationale, not a claim of present-day social popularity. Implementation is original CSS dimensional/toy presentation, not a physics-driven 3D engine. Do not market it as verified trending or full real-time 3D. Economy/session-duration/user-delight claims still require real playtesting.

## Verification

`node --import tsx --test tests/pocket-paradise.test.ts` → 6 passed, 0 failed (TSX_TSCONFIG_PATH=tsconfig.test.json).

This review found no Pocket engine blocker. Market draft-state finding should be fixed before release. Parent must still supply browser evidence for focus, overflow, all themes and saved-run resume, plus independent Market engine/API review and deployed smoke checks.

## Follow-up review

- Market trade draft is now an isolated child that unmounts while an offer exists and whenever the current player leaves the trade phase. This clears stale assets before the next turn; no state update in render is involved. Original medium finding resolved by source inspection.
- Purchase text now names stall points, commission text names commission/reputation points. Original low finding resolved.
- Pocket home–park adjacency now awards 2, matching stall–path edges. The UI and targeted adjacency assertion both show 2, and preview/replay still call the same scorer. This removes the previously stronger home–park edge reward; it is a structural symmetry improvement, not evidence of human-tested balance.
- Independently inspected new `leave_market_match`: it locks the room row, checks playing Market game and actor membership, then deletes membership and marks the room aborted in the same transaction. It does not invoke completion statistics. Service-only execute grants match the trust boundary. Commit also takes the same room row lock/status fence, so simultaneous departure/turn completion serialize. A finished commit first can complete normally; a departure first causes later commit to return false. No atomicity blocker found by source inspection.
- Recommended adding a same-origin check to the leave HTTP route for parity with new mutation routes. At follow-up inspection the general pre-existing leave route lacked that check; this is distinct from RPC transaction safety.

## Isolated security / transaction follow-up evidence

The leave HTTP route now applies the same-origin guard; the above recommendation is resolved. `node scripts/test-game-expansion-security.mjs` → 9 checks passed, completed=true. `npx eslint scripts/test-game-expansion-security.mjs --max-warnings=0` → exit 0. Artifact: `.forge/game-expansion-security.json`.

Only fixed local app `127.0.0.1:3199` and Supabase `127.0.0.1:58321` were used. All five disposable users and one room were cleaned in finally. No production access.

Verified anonymous/foreign-origin rejection, malformed and oversized payloads, direct anonymous/authenticated RPC denial (Postgres 42501) including atomic departure and private solo ledger, invitation acceptance enforcing four-player capacity even for previously queued invites, stale final commit and missing-score transaction rollback, malformed Market commands leaving DB unchanged, simultaneous solo completion exactly-once accounting, twelve-completion hourly cap with idempotent retries allowed, and actual atomic departure with no results and a delayed completion fenced out.

The first script attempt failed because Playwright encoded a test string as valid JSON instead of sending malformed bytes. The harness now sends explicit Buffer bytes; the final run passed. No app defect was hidden or changed for that harness correction.

No remaining blocking finding within this independent review scope. Production readiness still depends on parent integration/browser verification and independent review of the authored Market engine.
