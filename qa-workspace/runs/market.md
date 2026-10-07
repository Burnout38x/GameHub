# Market independent run 01
Specification-derived TC-M01 through TC-M06 preceded engine source inspection. Lead did not author product implementation. Existing adapters were reviewed after the case design and independently executed after mechanically separating tool/API calls from assertions.

1. Created local disposable users through service fixture API, then signed into real login UI as regular users.
2. Found Market Day by library search, followed Create Market Day room, submitted settings, verified solo start disabled and server409. Joined from independent browser context with code and verified non-host start403.
3. Started through host button, expanded tutorial, exercised keyboard flat toggle.
4. Completed all twenty turns entirely through movement/business/trade controls. Every business control was exercised: bank, supplies, buy, commission, pass, upgrade.
5. After accepted actions, observed each client's independently fetched room state and rendered cash/supplies. 66 convergence observations passed within10seconds.
6. Accepted, declined and expired one trade each using buttons. Empty trade form prevented submit.
7. Took peer offline during turn3, performed accepted movement, restored connectivity, observed convergence. Reloaded peer later and compared full authoritative state.
8. Aborted a browser response after route.fetch returned200 for accepted movement. UI showed recoverable error and refreshed to business phase. Persisted version advanced exactly once.
9. Both clients showed Final scores after ten rounds. Independently computed prosperity formula matched two history rows. A repeated end command409 prevented new results. Rematch created new lobby, guest joined, host started fresh version0/round1.
10. Independently executed four-player forty-turn completion with simultaneous duplicate move and duplicate trade acceptance; status pairs200/409. History exactly4rows. Departing participant aborts room and creates no result.
11. Executed security cases as anonymous/regular users: foreign origins, oversized/malformed JSON, directRPC denial/private completionledger denial, full capacity including queued friend invitations, stale and incomplete finalcommit rollback, malformed commands unchanged, duplicate completion/rate limit, atomicdeparture fences delayedcommit.
12. Ran68 independent in-memory Market branch cases. See market-branches.json for each input partition and outcome. Branches cover creation validation, all phases and commands, permission, resource/capacity boundaries, stale/duplicate trade, acceptance resource rechecks, rent/wallet/income caps, four events, final scoring and boundedlog.

Evidence: market-browser.json/.log, market-four-player.json/.log, market-security.json/.log, market-branches.json/.log.

Uncaught pageerrors: zero. Unexpected HTTPerrors: zero in successful UI run. Browser network failures retained: navigational/prefetch ERR_ABORTED plus deliberately injected failed successful-response and offline request. No silent removal. Visual screenshot run uses immediate viewport resize and is tainted where raster strips duplicate; replacement fixed-context pass pending. Main-scope axe WCAG2/2.1A/AA returned zero violations on48 combinations; all-rule global Joinname defect was independently found by Pocket sibling.

All recorded local users and rooms cleaned. Initial sandbox Chrome launch SIGABRT occurred beforefixture creation; escalated retry succeeded. No production mutation.

## Final revision visual and recovery follow-up
Fresh browser contexts at fixed320/390/820/1440 widths replace tainted resize captures. All32 Chromium/WebKit × fourtheme × fourwidth captures have no horizontal overflow; full-size Chromium dark1440 and WebKit light320 visually inspected and no raster duplication. All-rule axe (broader than earlier WCAG2/2.1 subset) identified two real Market issues: movement tile label-content-name-mismatch and missing h1. Filed F-06/F-07 and requested root fixes. Snapshot evidence retained in market-visual-attempt1.json.

Recovery probe had two harness timing failures: getByRole(alert) matched an empty live region before HTTP response, so initial message assertion failed. Actual message was recorded empty; no500 response yet. Corrected to wait for the response and exact message. Fresh probe then confirmed HTTP500 and nonJSON503 render recoverable errors, preserve the entire persisted state, and allow successful retry. A subsequent ownership-trade locator timed out because exact nested label text includes select options; changed the QA locator to the native combobox inside the named You give fieldset. Preserved all attempt logs/JSON. Fresh attempt4 completes: buy stall, select it in trade, recipient accepts, ownership moves to recipient; cancel native Leave confirmation leaves game playing, confirm Leave ends match with zero history rows. Evidence market-recovery-final.json/.log. All fixtures cleaned in every attempt.

CSS200 zoom width and real movement/control use observed, but media-query layout differs from native zoom; this is not native browser zoom certification. Screenshot shows narrower text wrapping at emulated zoom and a sticky header at the existing scroll position. Fixed context320CSS-pixel screenshots are the phone layout acceptance evidence.

## Final closure on commit 1f9dd09
Final Market visual run completed 46 recorded checks. All 32 browser/theme/width combinations and business, trade-form and offered-trade-recipient phases pass all-rule axe: 35 scans, zero violations. Zero page exceptions. Only HTTP errors are the deliberately injected 500 and 503 responses. Fresh context screenshots were visually reviewed through Chromium/WebKit contact sheets and full-size samples; no clipping, overlap or raster duplication found. All fixtures cleaned.

Full two-client UI rerun completed all 20 turns, all business controls, trade decisions, 66 peer convergence observations, reconnect, lost-response recovery, scores, once-only history and rematch. Initial final rerun had a stale global Join accessible-name selector after F-02 changed that name; failure retained as market-browser-final-stale-selector. Corrected to the actual visible name, then repeated from fresh users/room with success. Last change after this full rerun only corrected heading levels; the final 35 axe scans validate that change.

Additional exact-identity concurrency test submitted two different valid destinations simultaneously, then buy versus pass simultaneously. Each pair returned one 200 and one 409; position, cash, ownership, phase and version matched only the winning command. Evidence: market-concurrency.json.

Final read-only cleanup audit checked all 50 fixture IDs recorded in STATE against profiles, rooms and auth users; no leftovers. Evidence: final-cleanup.json.
