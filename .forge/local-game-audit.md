# Local game audit — 2026-10-06

Scope: read all eight local pages, shared local libraries, question banks, and existing tests. Findings below are source-confirmed; browser walkthroughs remain required. Anchor: `.forge/anchor.md`.

## Rules and verification matrix

| Game | Players | Rules and lifecycle | Required regression |
|---|---:|---|---|
| Code Crackers | 2–6 | 4–6 digit secret; optional duplicate digits; 12/18/24 shared guesses each round; exact/misplaced feedback; solver gains 100 plus remaining-turn bonus; 1/3/5 rounds | Duplicate feedback; no-solve exhaustion; round starter rotation; final score and tie; quit/unmount during delayed round transition |
| Know Your Partner | exactly 2 | Answer 5–30 private questions, hand device over, other partner guesses; repeat with roles reversed and separate questions; point per match; instant or end-of-round reveal | Private answers stay hidden until reveal; both role directions score correct player; end reveal contains every answer and guess; category shortage; timeout cleanup |
| Mental Math Duel | exactly 2 | Same generated arithmetic puzzle; first correct scores 100 + 5 per remaining second; wrong answer costs 10 (floor zero) and locks player for 3 seconds; 10/15/25 rounds | Correct math and unique options at every level; timeout; both player controls; wrong-answer unlock cannot cross round/restart boundaries; tie result |
| Mystery Card | 2–6 | Race: all answer and wrong player locked until next clue; Turn: one question per player in rotation; correct gains 100 + 2 per remaining second; timer/no-answer advance; configurable difficulty/category | Every filter has valid answer options; exact question count; no adjacent repeated clue; race lockout/all-wrong; equal turn counts; tie result |
| Reverse Definition | 2–6 | Buzz to obtain 5/8/12 seconds and multiple choice options; wrong/timed-out player loses 10 and cannot rebuzz that clue; first correct gains 100 + 5 per remaining second; everyone wrong advances | Exact configured length; lockout and timer transfer; all-wrong and correct transitions; tie result |
| Rule Discoverer | 2–6 | Hidden number/word rule; two accepted and two rejected examples; each turn test an example or pick rule; correct gains 100 and next round; incorrect loses 10 and rotates; 3/5/7 rounds | All provided examples; invalid/non-word input; large numbers and decimal notation; rotation; wrong/correct guess; unmount cleanup; tie result |
| Who Remembers It Better? | exactly 2 | Two private free-text answers per prompt; normalized/fuzzy matches auto-score; differing answers discussed and manually judged; 5–20 questions; category/custom prompts | Hidden handoff; Unicode and emoji answers; similar-but-different memories can be rejected; count totals; custom/category shortage; restart |
| Word Association Chain | 2–6 | 15/25/40 turns; 8/12/20 seconds; unique association scores 10 + remaining seconds; timeout costs 5; 3+ players can challenge prior word; uninvolved majority judges; success removes word and transfers points | Repeats; word validation; timeout; challenge success/failure/tie; score reversal; final word can be challenged; result ties |

## Confirmed defects

1. **Mental Math unlock callbacks leak between rounds.** `mental-math-duel/page.tsx:71–82,105–114` resets locks for the new round without clearing prior lock timers. Scenario: A answers incorrectly at t=0; B wins at t=.2; next round starts at t=1.3; A misses again at t=1.5; old timer unlocks A at t=3 rather than t=4.5. Quit also only clears the transition timer (119–123). Clear/reset every lock timer on round transition and quit; test fake-clock sequence.
2. **Know Your Partner end reveal is missing.** Select label promises reveal at end (`know-your-partner/page.tsx:167–170`), but guess choices are not retained (94–112) and round screen only displays aggregate score (217–249). Store guesses and render each question, actual answer and guess after the private guessing phase. Also no unmount cleanup for `waitTimeout` (imports line 2; timer line 106).
3. **Who Remembers collapses distinct Unicode/emoji answers into a match.** `logic.ts:1–7` strips everything outside ASCII; `who-remembers/page.tsx:89–96` auto-matches empty normalization. Different emoji or non-Latin text automatically scores. In addition, 84% string similarity is forced with no manual override (`page.tsx:211–226`), despite near-identical strings sometimes representing different dates/places. Preserve Unicode letters/numbers; guard empty normalized values; allow players to confirm or override fuzzy suggestions.
4. **Reverse Definition silently shortens requested games.** `reverse-definition/page.tsx:56` slices filtered bank while setup offers 15/20 (154). Each specific difficulty contains only 12 clues (easy count from simple regex includes the interface union occurrence; actual easy entries also 12). E.g. Expert + 20 starts only 12. Show available count and constrain selection, reject with explanation, or intentionally refill shuffled bank without adjacent repeats.
5. **Rule Discoverer power-of-two validator is wrong for large numbers.** `rule-bank.ts:64` bitwise implementation coerces to 32-bit. Direct JS check demonstrated 4294967297 returns true. Prime trial division accepts extremely large integer input and can block the browser for a long time (`rule-bank.ts:51–54`). Constrain to safe bounded integer input and use a numeric power check. Several word rules accept digits/punctuation-normalized strings as words (`pal`, `sameEnds`, `double`, `hasE`, etc.). Validate the domain before applying a rule; numeric `Number('')` also becomes zero at helper level.
6. **Word Chain last word cannot be challenged.** `word-chain/page.tsx:101` advances automatically after 400ms; `87` immediately ends at configured turn count. During those 400ms current equals last submitter, so challenge stays hidden (`263`). Keep an explicit final challenge/review opportunity before result.
7. **Word Chain successful challenge leaves awarded speed bonus behind.** Award is `10 + timeLeft` (`98`) but removal only subtracts 10 (`127`), so an invalid word can still profit by up to 20 points. Record and reverse actual award, then apply disclosed challenge reward/penalty. A policy decision if retaining speed bonus was intentional, but current UI does not explain that policy.
8. **Word Chain accepts numbers and phrases despite asking for a word.** `93–95` only normalizes and checks length; `123` and multiword strings pass. Require a single alphabetic word (Unicode-aware) or change instructions explicitly.
9. **Five competitive result screens falsely assign a sole winner for ties.** Code Crackers 189, Mystery Card 266, Reverse Definition 180, Rule Discoverer 214, Word Chain 241 use array index 0 as trophy winner even when every score is zero. Shared rank calculation should give tied players equal rank and indicate joint winners.
10. **Code Crackers always lets the same player start every round.** `code-crackers/page.tsx:51` resets player to zero. Rotate starting player across rounds to distribute first guesses. Also transition timer has no unmount cleanup (imports line 2 and timer 106/113).
11. **Rule Discoverer transition timer has no unmount cleanup.** `rule-discoverer/page.tsx:2,87,108,121`; add cleanup like the other local pages.
12. **Player setup accessibility inconsistent.** Shared PlayersEditor inputs use only placeholder names and remove buttons only “✕” (`PlayersEditor.tsx:18–36`). Mystery Card duplicates the same editor (`mystery-card/page.tsx:179–206`). Add persistent/accessibility labels, named remove actions, and reuse shared editor. Mode/category buttons lack `aria-pressed`; dynamically announced errors/statuses generally lack `role=alert`/`role=status`. Live answer fields in Word Chain/Who Remembers/Rule Discoverer likewise rely on placeholders.

## Robustness concerns (not reachable defects with current bank)

Mystery Card `pickQuestions` (10–19) loops forever for a one-clue pool with count > 1 and dereferences undefined for an empty pool. Current category/difficulty combinations all have multiple clues, so this is future bank-edit robustness, not a present gameplay blocker. Extract a bounded reusable sampler and test zero/one/multiple pools.

Most pages use state-only input locks; assess simultaneous taps with actual browser testing before claiming duplicate-score bugs. Do not infer a race solely from useState.

## Existing tests

`tests/game-logic.test.ts` covers code feedback, simple fuzzy matching, rule bank examples, and name uniqueness, but no local page lifecycle, question sampler, math generator, result ties, privacy handoffs, or timer transitions. Existing number-guess and memory tests partly duplicate formulas/construction instead of exercising application functions. Add focused helper tests and real browser flows; source inspection is not proof of rendered behavior.

No application code edited during this audit.

## Implementation and verification update

All twelve actionable findings above have corresponding local fixes (shared PlayersEditor accessible labels assigned to root). Changes preserve current CSS classes. Mystery Card now uses shared PlayersEditor. Local setup rejects unnamed added players instead of silently dropping them. A reusable deck sampler also fixes the zero/one-pool robustness issue.

- `node --import tsx --test tests/game-logic.test.ts tests/local-games.test.ts` → 26 passed, 0 failed.
- `npx tsc --noEmit --target ES2017` → exit 0.
- `npx eslint src/app/games/local src/lib/local-games tests/local-games.test.ts` → exit 0.
- `npm test` → blocked by sandbox IPC EPERM in tsx CLI; direct Node import command above runs the same test framework successfully.

Required browser regression attention: finish both partner roles and inspect reveal; wrong-answer math lock followed by quick opponent win and another wrong answer; Word Chain final-turn challenge and award reversal; Code Crackers round starter rotation; full local setup/play/result/replay for all games. Helpers and question banks are tested, but these rendered lifecycle checks are not represented as completed by this audit.

## Rendered React lifecycle evidence

Added `tests/local-game-flows.test.tsx`, using matching React 18.3.1 test renderer and controlled Node timers (no DOM/browser or live data). All eight actual page components are mounted and their rendered controls exercised through setup, scoring, result, and replay. Fifteen passing cases cover both partner roles/private handoffs/end reveals and instant feedback; mental-math cross-round lock regression and timeouts; mystery race and equal player-by-player turns; reverse-definition full configured count, buzz expiry and all-wrong round; rule evidence/guess/cleanup; memory fuzzy disagreement; word repeats/timeouts/final challenge; code rotation, exhaustion, and ties.

- `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test tests/local-game-flows.test.tsx` → 15 passed, 0 failed.
- `npm test` → 49 passed, 0 failed (includes other agents' online helper tests at this checkpoint).
- `npx tsc --noEmit` → exit 0.
- `npx eslint tests/local-game-flows.test.tsx` → exit 0.

These are rendered-component interaction tests, not visual browser tests. Responsive layout, browser focus behavior, and actual storage/reload behavior are not claimed by these tests.

## Current React DOM test migration

After the dependency upgrade, removed renderer usage from all three component suites. `tests/dom-environment.ts` provides jsdom and Testing Library now mounts actual React DOM, dispatches DOM events, and checks DOM output. All original 57 tests remain; no component-renderer deprecation/act warnings occurred.

- `npm test` on React 19.3.0 → 57 passed, 0 failed.
- TypeScript 7 `npx tsc --noEmit` → exit 0.
- ESLint initially blocked before parsing because typescript-eslint does not support the TS7 API; parent is resolving tooling compatibility. No clean lint result is asserted at this checkpoint.

React 19 clock cleanup and final targeted checks: local clocks now tick through `useEffectEvent` handlers so keystrokes do not restart intervals and expiration does not require state updates from an effect body. Word Chain final review/result transitions happen directly on turn completion. Mystery/Reverse transitions update state from events rather than inside another updater. Latest focused ESLint exits 0 with no warnings, TS7 exits 0, and `npm test` still reports 57 passed. No broad lint suppression was added.

Final independent online browser verification on the upgraded isolated production stack is recorded in `.forge/browser-online-verification.md`: 48 checks, zero axe violations, overflow, page errors or console warnings. The local React DOM suite remains part of the 57 passing unit/component tests; visual browser coverage is separately owned by the room/UI agent.
