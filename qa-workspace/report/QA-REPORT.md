QA REPORT: Independent GameHub expansion acceptance
MODE: Autonomous and Regression
SCOPE: Complete Pocket Paradise and Market Day flows, multiplayer synchronization, new-game UI, and affected existing games, navigation, social, progress and themes.
ENVIRONMENT: Commit `1f9dd09`, isolated production app at `http://127.0.0.1:3199`, disposable local Supabase at `http://127.0.0.1:58321`, Chromium and WebKit. No production gameplay mutations. The QA lead and its two QA subagents did not author product implementation.

**Technical acceptance: passed within the tested environment. All seven findings are resolved and independently retested. No technical acceptance criterion remains open in this scope.**

REQUIREMENTS COVERAGE: All 22 functional acceptance criteria have observed positive and negative coverage. Six technical NFRs were assessed with the limitations below. One human-playtesting target remains unmeasured. There are no untraced criteria or silently skipped cases. See [traceability](../test-plan/traceability.md) and [self-audit](../runs/self-audit.md).

CASES

| Cases | Independent observation | Evidence |
| --- | --- | --- |
| TC-P01 | Standard and practice games complete through 20 placements in both browsers. Preview, cancel, occupied-cell rejection, score explanation and postcard download work. Independent engine checks cover adjacency, requests, move validation and 200 seeded runs. | [Pocket run](../runs/pocket.md), [65 final browser checks](../evidence/pocket-v2-results.json), [33 engine checks](../evidence/pocket-engine.json) |
| TC-P02 | Local resume, completed-run restore, daily seed consistency, guest completion followed by sign-in, signed progress recorded once, and practice isolation pass. Corrupt saves, storage denial, HTTP 500/429, network abort, malformed successful responses and stale save responses recover without losing the completed board. | [Failure recovery](../evidence/pocket-failures.json), [storage retest](../evidence/pocket-retest.json), [remaining error branches](../evidence/pocket-final-branches.json) |
| TC-P03 | Final miniature art and flat mode pass the browser/theme/layout matrix. All 80 real touchscreen placements pass at 320 pixels: all 20 cells, both board modes, both engines. Final accessibility scans report no violations. | [Touch results](../evidence/pocket-touch.json), [final daily and motion checks](../evidence/pocket-v2-extra.json), [Pocket run and visual review](../runs/pocket.md) |
| TC-M01 / TC-M02 | Real create, join and host-start controls work. A full two-player game completes all 20 turns through UI controls, including every business action. A four-player game completes 40 turns. Invalid roles, phases, ownership and resource boundaries are rejected. | [Final UI run](../evidence/market-browser-final.json), [four-player run](../evidence/market-four-player.json), [68 engine checks](../evidence/market-branches.json) |
| TC-M03 / TC-M04 | Accepted, refused and expired trades work. Both independent clients converge on authoritative state, including 66 observed synchronization points, reload, offline recovery and a deliberately lost successful response. Duplicate commands and different simultaneous commands commit once. Stall ownership transfers through the actual trade form. | [Market run](../runs/market.md), [concurrent commands](../evidence/market-concurrency.json), [security and atomicity](../evidence/market-security.json) |
| TC-M05 | Final prosperity matches an independent calculation, history contains exactly one result per participant, and rematch starts fresh. Canceling Leave preserves the match; confirming it ends the game without awarding results. | [Final UI run](../evidence/market-browser-final.json), [final recovery and departure checks](../evidence/market-visual-final.json) |
| TC-M06 | Both browsers pass four themes at 320, 390, 820 and 1440 pixels. Fresh screenshots were visually reviewed. All 35 final all-rule axe scans pass, including movement, business, trade form and recipient-offer phases. No page exceptions occurred. Deliberate HTTP 500 and non-JSON 503 errors remain recoverable. | [46 final checks](../evidence/market-visual-final.json), [Chromium visuals](../evidence/market-final-chromium-contact.png), [WebKit visuals](../evidence/market-final-webkit-contact.png) |
| TC-R01 | All eight existing multiplayer engines and all eight local games complete. Search, navigation, social follow, progress, weekly goal, themes, leave and rematch pass representative flows. The independent suite reports 98 tests passed, with lint and type checks passing. | [Regression run](../runs/regression.md), [unit log](../evidence/qa-lead-final-unit.log), [lint log](../evidence/qa-lead-final-lint.log), [type-check log](../evidence/qa-lead-final-typecheck.log) |

FINDINGS

| Finding | Severity / priority | Final result |
| --- | --- | --- |
| [F-01](../findings/F-01.md): Pocket nested main landmarks | Moderate accessibility / P1 | Fixed; fresh whole-page axe checks pass. |
| [F-02](../findings/F-02.md): Join accessible name excludes visible text | Serious accessibility / P1 | Fixed; mobile and desktop names and keyboard navigation pass. |
| [F-03](../findings/F-03.md): Corrupt JSON reports unavailable storage | Low usability / P2 | Fixed; corruption and actual storage denial now have distinct, tested recovery. |
| [F-04](../findings/F-04.md): Pocket dimensional art misses the selected direction | Moderate specification gap / P1 | Fixed with original miniature artwork and projected board; all cells pass independent touch testing. |
| [F-05](../findings/F-05.md): Focused skip link remains clipped | Moderate accessibility / P1 | Fixed; visible focus and Enter behavior pass in both tested themes. |
| [F-06](../findings/F-06.md): Market movement names omit visible text | Serious accessibility / P1 | Fixed; all final axe scans pass. |
| [F-07](../findings/F-07.md): Market heading structure is incomplete | Low accessibility structure / P2 | Fixed, including the heading-order issue exposed by the first correction; all final scans pass. |

COMPOSITIONAL: Guest Pocket completion followed by authentication saves once. Practice remains separate from account progress. Market trade decisions advance the turn and synchronize both clients. Reconnect and missing-response recovery preserve authoritative state. Completion records once and rematch starts fresh. Existing social, theme and progress behavior was exercised alongside gameplay.

NOT COVERED: Physical phones or folding hardware, native browser zoom, screenreader speech, exhaustive content/difficulty combinations, every possible network interleaving, production multiplayer sessions, and human studies of enjoyment, balance or session duration. CSS 200% zoom and responsive browser viewports were exercised; they do not establish native-device certification. Database transport outages were not induced; transaction rollback and UI error recovery were tested separately. Some navigation-cancellation logs lack enough prefetch metadata to classify every canceled request. This is not a claim of 100% branch coverage or complete WCAG certification.

All fixture cleanup succeeded. A final read-only audit checked 50 recorded fixture IDs and found no remaining profiles, rooms or authentication users. See [cleanup evidence](../evidence/final-cleanup.json). Failed harness attempts and intermediate product failures remain documented; none were silently replaced by the last passing run.

The last product change corrected heading levels. Its exact-commit production build and 35 independent accessibility scans pass. Earlier complete engine flows were retained where that markup-only change did not affect their behavior. Parent-authored build logs are supplemental evidence; any subsequent public production smoke is separate from this independent local acceptance.

VERDICT: Confirmed

## Release follow-up by the implementation author

Commit `1f9dd093b0aed08bfb1c26ba3d97b01fa0593639` was pushed to main and the implementation branch. Vercel production deployment `6899565697` succeeded. A separate author-run public smoke passed 10 checks in Chromium and WebKit at widths 320, 390, 717, 820 and 1440. It verified catalog search, practice placement, miniature art, one main landmark, visible keyboard skip link, flat mode and no horizontal overflow. No page errors occurred and no production accounts, rooms or recorded results were created. These checks supplement the independent local verdict above. See [live smoke evidence](../evidence/root-production-smoke.json), [smoke log](../evidence/root-production-smoke.log) and [deployment evidence](../evidence/root-production-deployment.json).
