# Independent regression run

Scope derived before reading existing tests or implementation, from current .forge/anchor.md and d21ddc6 changed-file stats. No prior QA regression baseline available. Parent agent owns central workspace files.

## Cases
- REG-01: full existing unit suite passes, lint has no warnings, TypeScript checking passes. These checks support but do not establish browser correctness.
- REG-02: authenticated game library loads, exposes existing and new games, filters/search select expected existing game, and opens its real play route.
- REG-03: existing multiplayer game: two disposable local accounts create/join/start, perform real round actions, receive synchronized round/result state, and leave safely. Shared start/join/leave, RoomClient and play components are in changed-file blast radius.
- REG-04: navigation from games to rooms, social/friends and progress/profile routes renders expected content with no unexpected console/network errors.
- REG-05: existing flow renders at desktop 1440, tablet 768 and phone 390, plus available themes; screenshots must be inspected, horizontal overflow checked.
- REG-06 compositional: reload an existing game, then leave and navigate back to the library without corruption; progress/history of completed game remains available if applicable.

Expected: all user transitions give clear response and no unexpected browser exceptions or failed requests. Real local API and local database only. Disposable local fixture cleanup authorized by parent. No production writes.

## Limitations / exclusions planned
Full exhaustive rounds in all pre-existing game modes are not initially claimed: choose one changed existing play mode end-to-end plus broad route/navigation smoke. Authentication provider integrations, production data, and unrelated pages are outside changed flow scope. Browser execution awaits parent's local server.

## Expanded scope (parent direction, before expanded execution)
REG-07: complete one representative game for every pre-existing room engine (quiz, prompt, memory, guess, predict, code, rule, chain); predict additionally choice and private free text. Include role exclusion, round advance, result, quiz deadline, rematch and challenge vote. Use existing browser selectors as adapter after independent criterion derivation; all assertions hoisted so calls execute separately.
REG-08: complete and replay each of 8 local games. These are compositions around catalog navigation; deterministic RNG only for code/rule fixture selection and virtual clock for timers. Not a randomness quality test.
REG-09: actual keyboard theme selection for all four themes and existing room participant leave; keyboard skip link visible/operable.

## Observed execution
- REG-01 PASS: 98/98 unit tests, no skipped tests; lint exit0 and tsc --noEmit exit0. Evidence regression-unit.log, regression-lint.log, regression-typecheck.log.
- REG-02/03/04/05 PASS for independently implemented primary scenario: library existing game search/link; real two-player quiz join/start/answer/results; reload identical prompt; one completion in progress; social search/follow; weekly goal save/reload; five pages (games/rooms/friends/profile/themes) each at dark390/light768/arcade1440/ocean390; empty search recovery. Evidence regression-browser.{mjs,json,log}, 22 screenshots. No page errors, console warnings/errors or HTTP>=400 observed. Route changes use a mix of visible links and direct navigation (not every global nav clicked).
- REG-06 PASS via real game reload and progress checks plus REG-09 existing playing-room leave. Finished game has Pick another game rather than Leave. Original primary script explicitly recorded no finished Leave control; it did not silently count leave as pass.
- REG-07: ALL 8 engines completed through UI; predict tested twice (choice/free text). Includes spectator disabled controls, duplicate/incomplete code feedback, rule turn rotation, three-player chain challenge/adjudication, quiz deadline expiration, rematch new lobby and partner join. Expanded report contains 47 successful check entries plus 3 cleanup records, 0 axe violation groups, 0 horizontal overflow, 0 browser page errors and 0 console warnings. Legacy adapter's final exact color assertion FAILED (see below); lifecycle checks completed before it. Evidence regression-browser-online-report.json, regression-all-engines.log, regression-all-engines.mjs and regression-online-*.png.
- REG-08 PASS: all eight local completions and replay back to setup. Code Crackers, Know Your Partner, Mental Math Duel, Mystery Card, Reverse Definition, Rule Discoverer, Who Remembers, Word Chain. No page/console errors. Evidence regression-local-results.json, regression-local-games.{mjs,log}, regression-result-*.png.
- REG-09 PASS: participant leaves active quiz via Leave room confirmation, returns Games and is absent from room players; all4 themes selected with keyboard Enter and persist after reload. No HTTP errors or browser errors. Evidence regression-supplement.{mjs,json,log}.

## Failed attempts and taint corrections
1. First Chrome launch in sandbox aborted with SIGABRT/EPERM before creating fixtures. Retried in authorized isolated escalated execution, succeeded. This is environment tooling, not product behavior.
2. Expanded adapter attempt1 timed out waiting Finish after one prompt response. Actual equal spotlight turns assign 2 rounds for2 players. Corrected QA adapter follows Next through actual assigned rounds, preserved regression-all-engines-attempt1.{json,log}. This was a test assumption failure, not a product defect.
3. Expanded adapter final exact focus-outline assertion expected rgb(23,104,96), observed rgb(36,49,54). Focus-visible and non-none outline had passed. Independent requirement is visible/operable focus, not exact RGB; preserve failure in report, do not describe entire adapter as exit0. Separate regression-focus.mjs checks focus/skip behavior in dark/light, with JSON/screenshots. Initial focus screenshots caught Loading state; rerun after home button ready to avoid visual inference from loading.
4. Initial local result screenshots taken with virtual clock could catch transitional styles. Reran completions/replays with an additional1000ms virtual clock settling before screenshot. All8 passed again. Local clock/RNG manipulations are declared fixtures, not evidence of arbitrary seeds/timing.

## Visual evidence actually inspected
Quiz play/result390; Friends dark390; Profile light768; Rooms arcade1440; Themes ocean390; every local result screenshot; online Memory light, Rule dark, Chain result light. No horizontal overflow in measured matrix. Long generated usernames wrap in narrow game cards, without overlapping controls. Full set captured but not every screenshot manually inspected; no claim of exhaustive visual certification.

## Network limitation
Primary report retains 396 net::ERR_ABORTED events during repeated hard navigations. No HTTP>=400, console errors or page exceptions there; aborted requests are consistent with navigation/prefetch cancellation, but primary log lacks per-request prefetch header correlation, so they are not counted as proven clean network outcomes. Expanded online adapter captures request failures/pageerrors/warnings and axe, but lacks full response-status/console-error collection; primary/supplement have those collectors. Local completion adapter records console/page errors but not HTTP status sweep. These are stated coverage limitations, not passed checks.

## Cleanup and scope
Primary and supplement delete exact created rooms and2 users each in finally, with null errors. Expanded two attempts delete all6 created users; local cleanup verification queried their exact IDs and host IDs: remainingProfiles=[] and remainingRooms=[] (regression-cleanup.json). Local games create no account/DB fixtures. No production mutation.
All8 engine lifecycle branches covered representatively, not every content item/difficulty/maximum player count or every failure path. New Market/Pocket covered by sibling agents. No claim of exhaustive cross-browser existing-engine verification (Chromium only), full screen-reader audit, or contrast compliance beyond automated sampled axe.

## Follow-up finding REG-F01: focused skip link is invisible (confirmed)
Visual review contradicted computed :focus-visible pass. Reproduced loaded home, Tab once, both dark/light. Link text Skip to content, rectangle x15/y15 width144.625 height56, position fixed, outline solid, clip auto, BUT clip-path inset(50%) and overflow hidden. Screenshots show no link. Enter still focuses main-content.
Cause candidate: globals.css .skip-link uses @apply sr-only; focus rule resets legacy clip but not modern Tailwind clip-path. Sent root request to reset clip-path on focus. Medium accessibility finding; no claim focused link visually passes until retest.
Exact RGB mismatch in earlier adapter is superseded by loaded-page measurement: eventual dark/light colors match expected accents. That earlier mismatch was premature measurement, not established stale expected value. Independent screenshot/computed clipping evidence is stronger and exposes the actual visibility bug.
Evidence: regression-focus.{mjs,json}, regression-focus-dark.png, regression-focus-light.png. Screenshot inspection explicitly performed. Root has been told3199 can restart once repair ready; no active fixtures.

REG-F01 retest scheduling: one opportunistic retry after source edit still hit old3199 build and correctly failed clipPath assertion. Root confirmed server had not restarted; regression-focus-retest.log is OLD revision evidence and must not be interpreted as failure of the repaired build. Final rebuild/retest pending explicit ready notification.

## Final repaired-build verification
Root explicitly announced final3199 ready. REG-F01 independently RETEST PASS: clipPath none, overflow visible in dark/light, Enter targets main-content; both screenshots visually inspected and clearly show Skip to content with visible outline. Current regression-focus.json/png and regression-focus-final.log are final; before-fix* preserve defect evidence. Focus color may be sampled before CSS fully settles, hence screenshot + clipping + keyboard behavior used as meaningful criteria.
Final global Join mobile accessible name Join ↗ and desktop Join with code ↗ each resolve exactly once and keyboard Enter navigates to login preserving next=/rooms/join; no pageerrors or HTTP failures. Evidence regression-nav-final.{mjs,json,log}.
Final source unit98/98, lint exit0, TypeScript exit0 after all root Pocket/global/nav changes: regression-unit-final.log, regression-lint-final.log, regression-typecheck-final.log. Existing engine/local lifecycle suites run before last Pocket/global-only fixes; final targeted focus/nav + source suite suffice for unchanged engine logic; no hidden rerun claim.
REG-F01 closed. No unresolved regression product defect observed in this scope. All limitations above remain; no exhaustive all-content/all-browser claim.
