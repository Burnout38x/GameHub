# Independent QA self-audit

The QA lead and its Pocket and regression subagents did not author product implementation. Cases were derived from the user request, task anchor and selected-game specification before detailed source review. Existing test adapters were inspected and re-executed; their prior pass claims were not accepted as evidence.

## Integrity checks

- Test editing: QA-only adapters separate calls from assertions. Changes to stale selectors, prompt-round assumptions and asynchronous readiness are recorded with preserved failures. No product assertion was weakened to conceal a defect.
- Hardcoding: Pocket rules were exercised over 200 seeds and all 20 placements. Market commands include resource, ownership and capacity boundaries, all four events, two and four players, duplicate and different concurrent commands.
- Feature isolation: Guest completion followed by sign-in, progress deduplication, practice isolation, trade-to-turn transitions, reconnect, missing responses, final records and rematch were executed.
- Comparison tampering: No product comparison or matcher was changed by QA. Independent score formulas checked final Market history.
- Confidence substitution: Observed findings and passes point to logs, JSON, screenshots or response summaries under evidence. Parent-authored preview/build results are supplemental and not counted as independent acceptance.
- Scope narrowing: All eight existing multiplayer engines and eight local games completed. New games have full end-to-end coverage. Human playtesting, physical hardware, native browser zoom and assistive technology remain explicit limitations, rather than renamed passes.
- Flaky masking: Sandbox launch failures, test-selector/timing failures and incomplete heading fixes remain in the workspace. Each corrected test ran from fresh fixtures. The repeated viewport raster artifacts were excluded from visual grading and replaced with fixed-context captures.
- Permission identity: Authorization probes used anonymous or exact regular-user browser/client identities. Service credentials only created disposable fixtures or inspected/cleaned local records. Service-only transaction probes were explicitly identified as atomicity tests, not user access-control passes.
- Assertion discipline: API/browser calls are assigned before assertions. Inherited adapters use AST-hoisted argument evaluation. No unexecuted assertion is graded Observed.
- Cleanup: Every harness records fixture IDs and runs explicit cleanup. All completed runs report successful removal; final readback confirms no remaining fixtures.

## Coverage boundaries

This is requirements and risk coverage, not an instrumented claim of 100% line or branch coverage. Engine branch partitions are enumerated in the test plan and scoped run ledgers. Database transport outages were not induced; real transactional rollback, UI server-error recovery and request-abort recovery were tested separately. Browser cancellation logs do not always contain enough prefetch metadata to attribute every canceled request. No unexplained page exception or unexpected HTTP error occurred in the fully instrumented primary flows.

Final closure checks passed: Market heading order has 35 clean axe scans; all seven findings link to fresh retests; traceability is closed; both reports are assembled; all 50 recorded fixture IDs are absent from local profiles, rooms and auth users. Every limitation remains named.
