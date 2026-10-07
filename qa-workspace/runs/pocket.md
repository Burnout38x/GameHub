# Independent Pocket Paradise acceptance
Author did not implement product. Cases derived first from `.forge/game-expansion-selection.md`, before implementation inspection.

## Specification cases
- PP01 guest standard start, three offers/four families, 20 confirmed placements, clear scoring/request feedback, final postcard.
- PP02 guest practice without account, complete, no ranked/progress pollution; repeat play.
- PP03 preview does not commit; cancel/undo before confirmation leaves board/score unchanged; occupied/invalid placement rejected.
- PP04 save/resume mid-run and after completion across reload; malformed save handled safely.
- PP05 deterministic seeded runs/replay, request variation between seeds, legal offers throughout.
- PP06 signed regular user standard completion persists once; refresh/replay duplicate completion does not award twice; practice remains separate.
- PP07 postcard export usable, correct final board/score, replay/new run available.
- PP08 full flat and dimensional play; 4 themes × representative desktop/tablet/phone, screenshots visually inspected, overflow/overlap/touch readability.
- PP09 keyboard-only placement/cancel/confirm, focus, reduced motion, zoom 200%, labels.
- PP10 console/network sweep throughout; failure recovery and input boundaries.

Compositional cases: saved game + mode switching; completed save + signed user progress; theme + viewport + presentation mode; preview + reload.
Known limits: 8–12 minute session target and subjective replay appeal require representative human playtesting. No numeric branch coverage claimed without instrumentation.

Fixture created local regular user cf48fae0-4e13-4a7a-bb09-f978ded6e8d6; cleanup pending.

Local fixture cf48fae0-4e13-4a7a-bb09-f978ded6e8d6 deleted.

Fixture created local regular user 85aff2b3-e89d-4a87-b3dd-c00675736272; cleanup pending.

Local fixture 85aff2b3-e89d-4a87-b3dd-c00675736272 deleted.

## Observed execution
- `evidence/pocket-results.json`: 65 successful recorded checks in Chromium and WebKit. 48 responsive combinations (4 themes × 3 widths 390/820/1440 × flat/dimensional × 2 browsers), no horizontal overflow. 24 Chromium screenshots retained; all reviewed via four contact sheets, with light phone/dark desktop/arcade tablet/ocean phone inspected full-size. No text clipping or misaligned controls found. Preview dock intentionally overlays viewport bottom; page can scroll.
- Both engines: guest standard 20 placements, postcard SVG download with 20 plot rectangles, complete-save restoration, keyboard Enter preview/cancel/confirm, occupied plot disabled, midgame restoration, malformed/unsupported savedata recovery.
- Chromium: guest completed board → regular local account UI login → return to board → saved → retry → reload already saved. Database profile `games_played` exactly 1; signed practice completion leaves it 1. WebKit guest practice completes account-free.
- Signed endpoint rejects malformed JSON (400), >4096 bytes (413), practice submission (400), script-like seed (400), 20 duplicate cells (400), offer=3 (400). These probes run with normal user browser cookies, not admin identity.
- `pocket-extra.json`: daily seed matches current UTC date; fresh same-day daily repeated offers identical; 20-turn daily completion reload restores. Reduced-motion computed transition/animation durations 0.00001s (global override). 200% CSS zoom has no horizontal overflow; this is CSS zoom, not a claim of native browser zoom or assistive-technology audit.
- Console/network artifact: no pageerror. Four expected guest-save HTTP401; five expected HTTP400 and one HTTP413 from negative probes. 102 cancelled/ERR_ABORTED navigation prefetch requests recorded; no other failures. These cancellation events coincide with navigation/reload and are not assigned product defects.

## Findings with reproduction
1. Moderate accessibility: nested/duplicate main landmarks. Open `/play/pocket-paradise`, start daily, run axe. `landmark-main-is-top-level` identifies `.py-8`; `landmark-no-duplicate-main` and `landmark-unique` identify `#main-content`. Artifact: pocket-extra.json. Independently confirmed parent hypothesis.
2. Accessibility global Join link: same axe run reports serious `label-content-name-mismatch` on `.ml-auto`; visible Join with code label absent from accessible name. Shared shell, not Pocket engine.
3. Low severity message: set localStorage `gamehub:pocket-paradise:v1` to `{`, reload. UI says browser storage unavailable even though only JSON is invalid. Unsupported version correctly says old save could not restore. Both engines observe misleading corruption message. Artifact pocket-results.json.
4. Scope observation: dimensional board is CSS-shadowed orthogonal grid and skewed glyphs, not specification's fixed isometric low-poly scene. Both styles playable; no claim of actual 3D scene acceptance.

## Branch map / honest gaps
Observed: no saved run, valid in-progress/completed saves, wrong version, JSON parse error; preview absent/present/cancel/confirm; occupied cell; standard/daily/practice; guest/regular user; success/new completion and duplicate; invalid JSON/body size/mode/seed/move/offer; flat on/off; reduced motion. Scoring totals displayed and completion server replay exercised, but all four adjacency rules and both fulfilled request branches were not independently asserted by this browser harness (unit regression owner covers engine). Unexercised UI branches: actual localStorage read/write denial/quota, network rejection/server500/rate429 save retry, stale overlapping save response suppression. Not a numeric/full branch-coverage claim. Native zoom, exhaustive tab traversal, screenreader speech, objective color contrast certification, real phone hardware, 8–12 minute session enjoyment/dominant strategy remain untested. Daily signed persistence specifically not rechecked; daily guest reload and standard signed idempotency are observed separately.

## Harness integrity / cleanup
Initial Chrome sandbox launch aborted; approved outside-sandbox execution worked. First full harness stopped on its own fetch `Response.status()` typo after Chrome login checks; artifact pocket-harness-error.log retained, fixture deleted in finally. Corrected accessor to property and restarted from clean browser/account; 65-check run finished. No product edits. Both local user fixtures deleted (see IDs above). Parent owns central finding/report files.

Zoom visual follow-up: `pocket-zoom200.png` inspection shows the sticky header crossing the title/stat area and full-page capture ending mid-content under CSS zoom. Thus the width metric alone must NOT be treated as a zoom accessibility pass. CSS zoom + fullPage capture is not equivalent to native browser zoom; native 200% remains unverified, and this captured overlap is retained as a limitation requiring native reproduction before classification.

## Gap-closing follow-up (old build)
`pocket-failures.json`: five additional observed checks in signed Chromium regular-user session: simulated server500 on completed daily retains board and retry; simulated429 retains same recoverable status; real retry reaches server and saves daily with profile games_played1; reload remains1; pending old save response resolved after starting practice cannot overwrite new status; actual request abort on completed standard reaches recoverable state and successful retry. 500/429 are browser-route injected to exercise UI, not server database failures/rate-limit generation. First follow-up run stopped due harness closing already-open new-run details; preserved partial artifact, corrected open-state detection, fresh fixture/browser rerun exit0. First fixture creation also exceeded username length; corrected test fixture prefix, no record created by failure. All subsequent fixtures deleted and logged STATE.

`pocket-zoom.json` + `pocket-zoom-top.png`/`pocket-zoom-preview.png`: native Meta+= attempt four times in headless Chrome left DPR1/inner1440 unchanged; therefore native zoom unsupported by this attempt. CSS zoom200 with explicit scrollTo(0,0) shows header at y0..268 and clear title below. Selecting first plot scrolls board into view; confirm dock y762 height96 in 900px viewport, actionable, resulting1/20. Screenshots visually inspected. Previous fullPage header overlap does not reproduce in viewport captures at known scroll state; not classified as product bug. Native browser zoom still not tested.

## Independent engine follow-up
`pocket-engine.mjs` is independently authored after spec-first plan; scoring oracle values derive from the game's displayed scoring explanation (2 per home–park/stall–path edge; 1 per park–park/path–path edge) and request descriptions, not copied expected snapshots. `pocket-engine.json/log` observes 33 successful cases: orthogonal vs diagonal and row-wrap adjacency; corner/interior/end boundaries; request 4/5/6 threshold; all-kind just-below/at3; both bonuses20 counted once; 200 seeds×20 turns unique three valid offers and deterministic repeat, all four nominated request families appear; varied-offer20-turn replay equality; seed empty/null/script-like/101chars; invalid mode; nonarray/21-move history; null/missing/string/fractional/out-of-range cell/offer; occupied/completed rejection; null/primitive/wrong-version/invalid-history saves; tampered stored board reconstructed from history. This closes independent scoring/request oracle gap above. 200-seed offer/request check is bounded sampling, not proof of strategic balance or full input-space correctness.

Remaining branch-risk map (not silent exclusions): pending storage read/write-denial retest and new fix verification; flat-preference write exception separately untested; malformed successful API response JSON catch separately untested (network failure catch observed); actual server RPC error vs generated rate limit not deliberately induced (UI500/429 fixture exercised); origin rejection/bodynull/invalid daily format/auth-expired and simultaneous exact completion concurrency belong central security coverage, not this harness; seed max100 success boundary and every JS unexpected object type not exhaustive; native browser zoom/AT/mobile hardware/human fun targets still unverified. Stale response early-return exercised across starting new run, not every simultaneous retry interleaving. No numeric instrumentation coverage claim.

Fixture created local regular user cf713ffd-7ced-4499-9ada-3ba059f52f19; cleanup pending.

Local fixture cf713ffd-7ced-4499-9ada-3ba059f52f19 deleted.

## FINAL rebuilt-app independent retest
Root made product fixes; this QA author did not edit product. Original failure evidence retained. Rebuilt app at3199 separately tested:

| Evidence | Observed result |
| --- | --- |
| pocket-retest.json |10 records across Chromium/WebKit: corrupt JSON and unsupported version show restore warning; actual simulated getItem SecurityError shows storage unavailable; setItem quota exception shows cannot-save. All recover to one confirmed placement. Axe zero violations both engines. |
| pocket-v2-results.json/log |65 complete fresh checks pass. Repeats standard guest completion/postcard, login composition, exactly-once database progress, signed/guest practice, reload, keyboard confirm/cancel, occupied guard, malformed endpoints and savedata;48 responsive theme/width/mode/engine combinations no horizontal overflow. No pageerror. |
| pocket-touch.json/log |80 of80 actual touchscreen center placements pass at320×812:20 cells×2 modes×2 engines. DOM confirms20 cells (4×5). Before every actual tap, elementFromPoint(center) identifies exact intended plot. Every offer change focuses firstempty; all runs reach20/20 practice complete. Smallest measured transformed rectangle41.19×42.66 CSSpx. |
| pocket-v2-extra.json/log |Same-day UTC daily seed/offers deterministic, completed daily reload restores20 moves, zero axe violations, reducedmotion durations0.00001s. CSS200 width metric remains1440; native zoom limitation remains. |

New art review: all24 updated theme/width/mode screenshots reviewed through four `pocket-v2-*-contact.png` sheets; full `pocket-touch-chromium-dimensional.png`, `pocket-touch-webkit-flat.png`, and completed desktop screenshot inspected. Distinct low-poly SVG homes/stalls/trees/path decorations and fixed angled board now present, with usable flat alternative. Original orthogonal-glyph visual-scope finding resolved under root/QA-lead clarification that CSS projection + low-poly SVG is acceptable; no WebGL requirement. No clipping or horizontal overflow found in reviewed board/control layouts. FullPage screenshots captured after scrolling can place sticky header in interior of stitched image; this is a capture-state caveat, not a newly assigned overlay defect (viewport-at-top follow-up above showed normal positioning).

All three concrete functional/accessibility findings verified fixed (nested/duplicate landmarks, Join accessible label, corrupt-save message). All four root-requested Pocket findings including visual presentation now verified resolved. Mobile offer scroll/focus change verified for each of80 placements. Relevant visual neighbor and gameplay regressions were run, not inferred.

Final branch-risk update: storage denial/quota, signed daily retry, network catch, stale old response and independent scoring/request branches now closed by observed follow-ups. Remaining explicit gaps: native browser zoom; physical mobile/assistive technology; objective WCAG contrast certification; flat-preference-only storage write denial; successful HTTP200 with malformed JSON; actual server generated rate-limit/error (UI injected fixtures only); every overlapping simultaneous retry interleaving; human session-length/replay/balance targets. Server access-control/concurrency probes owned centrally; no implicit transfer of their pass results here. No numeric code coverage/full-correctness claim. Latest local profile fixture removed by finally and recorded in STATE. All browser processes from these scripts closed.

## Final two error branches closed
`pocket-final-branches.json/log`:4/4 cases pass, both Chromium/WebKit, zero pageerrors.
- Preference-only `gamehub:pocket-flat` setItem quota denial: pressing dimensional toggle changes current UI to flat (`aria-pressed=true`), actual placement works and ordinary run save stores1move; denied preference remains absent; reload restores1move in default dimensional mode. This is expected graceful degradation because denied preference cannot persist.
- HTTP200 with malformed JSON body `{`:20-turn standard completion remains locally saved; shows “Your neighborhood is safe on this device. Progress could not be saved yet—try again.” Retry enabled; no success message. Remove injected fault and retry as actual guest: server401 leads to sign-in guidance; complete local save byte-for-byte unchanged. Screenshots retained for recovery state; no accounts/rooms created; contexts closed.
This supersedes the two corresponding remaining gaps above. Root/central security suite owns actual server429 evidence; this Pocket harness makes no independent claim to that server limit measurement.
