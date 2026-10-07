# Traceability v3 (closed)
All evidence paths below are relative to qa-workspace/evidence. Runs are pocket.md, market.md, regression.md. No prior .forge pass claims are counted as independent observations.

| Criterion | Cases | Evidence | Result |
| --- | --- | --- | --- |
| AC-01a | TC-P01 | pocket-results.json | Observed pass: guest standard/practice twenty placements |
| AC-01b | TC-P01 | pocket-engine.json | Observed pass: invalid move/offer/occupied/out-of-range rejected |
| AC-02a | TC-P01 | pocket-results.json; pocket-engine.json | Observed pass: preview/cancel/scoring/request boundaries |
| AC-02b | TC-P01 | pocket-results.json; pocket-engine.json | Observed pass: no preview commit and invalid action rejects |
| AC-03a | TC-P02 | pocket-results.json; pocket-extra.json; pocket-failures.json | Observed pass: restored saves/postcard/daily/signed exactly-once progress |
| AC-03b | TC-P02 | pocket-failures.json; pocket-results.json | Observed pass: invalid payloads,500/429/abort recovery, stale save response; corrupt message fixed and retested in pocket-retest.json |
| AC-04a | TC-P03 | pocket-results.json | Observed pass: final art and 80 touchscreen placements; pocket-v2-results.json and pocket-touch.json |
| AC-04b | TC-P03 | pocket-extra.json | Observed pass: zero axe violations, storage denial and malformed-response recovery; pocket-retest.json and pocket-final-branches.json |
| AC-05a | TC-M01 | market-browser.json; market-four-player.json | Observed pass: real create/join/start,2/4 players |
| AC-05b | TC-M01 | market-browser.json; market-security.json | Observed pass: minimum, capacity, queued invite bypass, non-host/outsider/signed-out denial |
| AC-06a | TC-M02 | market-browser.json; market-four-player.json | Observed pass:20/40turn complete ten rounds; allbusiness UI; no elimination |
| AC-06b | TC-M02 | market-branches.json; market-security.json | Observed pass: wrongturn/phase/version/destination; no invalid mutation |
| AC-07a | TC-M02 | market-browser.json; market-branches.json | Observed pass: buy/upgrade/supplies/commission/bank/pass and score/resource boundaries |
| AC-07b | TC-M02 | market-branches.json | Observed pass: wrongownership,insufficient cash/supplies,max levels/capacity |
| AC-08a | TC-M03 | market-browser.json; market-branches.json | Observed pass: accept/refuse/expire trades; asset transfer and two-sided ownership |
| AC-08b | TC-M03 | market-four-player.json; market-security.json; market-branches.json | Observed pass: concurrent accept,empty/out-of-bound/stale/unauthorized offers,capacity |
| AC-09a | TC-M04 | market-browser.json | Observed pass:66 independent peer state observations,offline/reload/lostresponse recovery |
| AC-09b | TC-M04 | market-four-player.json; market-security.json | Observed pass: simultaneous duplicate200/409,stalecommit/departure fences |
| AC-10a | TC-M05 | market-browser.json; market-four-player.json | Observed pass: exact score/history, results2/4clients, rematch join/start |
| AC-10b | TC-M05 | market-browser.json; market-security.json | Observed pass: finished command409,partial-scoretransactionrollback,aborted match no award |
| AC-11a | TC-R01 | regression-browser.json; regression-browser-online-report.json; regression-local-results.json | Observed pass: all8existing engines and8local completions plus navigation/social/progress/themes |
| AC-11b | TC-R01 | regression-supplement.json; regression-focus.json | Observed pass: negative, leave and empty search; skip link fixed and visibly retested in regression-focus.json |
| NFR-01 | TC-P03,TC-M06,TC-R01 | pocket-v2-results.json; pocket-touch.json; market-visual-final.json | Observed pass: final art, touch and fixed-context captures visually reviewed |
| NFR-02 | TC-P03,TC-M06,TC-R01 | browser reports | No unexplained pageexceptions or HTTP failures in instrumented primaryflows; prefetch cancellation attribution has stated limitation |
| NFR-03 | TC-P03,TC-M06,TC-R01 | pocket-extra/zoom; regression-focus | Observed pass for keyboard, labels and reduced motion; 35 final Market axe scans and Pocket retests have zero violations. CSS 200% tested; native zoom unavailable in headless attempts |
| NFR-04 | TC-M01,TC-M03,TC-M04,TC-P02 | market-security.json; market-four-player.json; pocket-results.json | Observed pass for specified role/input partitions |
| NFR-05 | TC-M04 | market-browser.json | Observed pass,66 peer state convergence points under10seconds locally |
| NFR-06 | TC-R01 | regression-unit/lint/typecheck.log | Observed pass: 98 tests, lint and type checks repeated during fixes; final heading-only revision passes 35 axe scans and exact production build |
| NFR-07 | Human playtest | No human panel/hardware in this engagement | Not measured; explicitly excluded from technical acceptance, no duration/fun/balance claim |

Closure: 22 of 22 functional acceptance criteria have observed coverage. Six technical NFRs are assessed within the stated browser/local environment. NFR-07 remains an explicitly unmeasured human-playtest target. All seven findings are fixed and independently retested; no technical acceptance criterion remains open within this scope. No numeric full branch-coverage claim is made. Final cleanup readback: final-cleanup.json, 50 recorded fixture IDs, no remaining profiles, rooms or auth users.
