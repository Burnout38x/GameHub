# Independent QA bug trace

All seven findings are fixed and independently retested. Final acceptance covers commit `1f9dd09` in the isolated local environment. No production gameplay data was changed.

## F-01: Pocket has nested main landmarks

Discovered during TC-P03, Pocket run 01.

1. Open `http://127.0.0.1:3199/play/pocket-paradise` and start daily play.
2. Run axe-core on the whole document.
3. Inspect the landmark results.

Observed at step 3: `landmark-main-is-top-level` identifies `.py-8`; duplicate-main and landmark-unique results identify `#main-content`. The game adds a main landmark inside the layout's main landmark.

Expected: One top-level main landmark.

Fix and retest: The game wrapper became a regular container. Fresh Chromium and WebKit scans report no violations.

Evidence: [original axe results](../evidence/pocket-extra.json), [final retest](../evidence/pocket-retest.json), [Pocket run](../runs/pocket.md).

## F-02: Join link accessible name excludes its visible text

Discovered during TC-P03 in the same whole-page axe run.

1. Inspect the global Join link outside a game room.
2. Run all axe rules.
3. Compare the visible text with the computed accessible name.

Observed: `label-content-name-mismatch` on `.ml-auto`. The explicit name does not include the rendered label.

Expected: A voice-control user can identify the link by its visible text.

Fix and retest: The override was removed. Independent checks confirm `Join ↗` on mobile and `Join with code ↗` on desktop, followed by keyboard activation to the expected authentication destination.

Evidence: [original result](../evidence/pocket-extra.json), [final navigation retest](../evidence/regression-nav-final.json).

## F-03: Corrupt save JSON produces the wrong warning

Discovered during TC-P02, Pocket run 01.

1. Set localStorage key `gamehub:pocket-paradise:v1` to the literal string `{`.
2. Reload Pocket Paradise in Chromium and WebKit.
3. Read the recovery message and try starting a new game.

Observed: The page reports unavailable browser storage, although storage access succeeded and JSON parsing failed.

Expected: Explain that the old save could not be restored while preserving fresh play. Actual storage denial should have its own warning.

Fix and retest: Parsing and storage access are handled separately. Fresh tests cover corrupt JSON, unsupported saves, denied reads/writes and preference-only write denial. Gameplay remains usable and recovery messages match the failure.

Evidence: [original results](../evidence/pocket-results.json), [storage retest](../evidence/pocket-retest.json), [preference-only denial](../evidence/pocket-final-branches.json).

## F-04: Initial dimensional artwork misses the selected miniature direction

Discovered during TC-P03 visual review.

1. Place plots in dimensional mode.
2. Capture and inspect flat and dimensional boards across themes and widths.
3. Compare the rendered game with the selected fixed-projection miniature-art requirement.

Observed: The initial presentation is an orthogonal grid with skewed glyphs and shadows.

Expected: Original miniature buildings, stalls, trees and paths in a projected board, with a fully playable flat alternative.

Fix and retest: Original SVG miniature art and a fixed board projection were added. QA repeated complete flows and inspected the new screenshots. All 20 cell centers were hit-tested and tapped in each of four combinations: Chromium/WebKit and flat/dimensional, at 320 pixels. All 80 taps passed, including actual offer changes and confirmations.

Evidence: [original screenshot](../evidence/pocket-dark-1440-dimensional.png), [final browser checks](../evidence/pocket-v2-results.json), [80 touch checks](../evidence/pocket-touch.json), [visual-review record](../runs/pocket.md).

## F-05: Keyboard skip link remains invisible when focused

Discovered during TC-R01 expanded keyboard regression.

1. Open the home page and wait for navigation content to load.
2. Press Tab to focus Skip to content.
3. Capture the page and inspect computed styles in dark and light themes.
4. Press Enter.

Observed: The link has focus and a 144 by 56 pixel rectangle, but `clip-path: inset(50%)` clips it completely. Enter still reaches main content.

Expected: The focused shortcut is visible as well as operable.

Fix and retest: Focus styling now resets clip-path. Independent screenshots show the link, computed clip-path is `none`, overflow is visible, and Enter reaches `main-content`.

Evidence: [preserved initial focus evidence](../evidence/regression-focus-before-fix.json), [final focus retest](../evidence/regression-focus.json), [regression run](../runs/regression.md).

## F-06: Market movement buttons omit visible text from their names

Discovered during TC-M06 fixed-context visual testing.

1. Start Market Day as the active player.
2. Run all axe rules, rather than only the earlier WCAG subset.
3. Inspect the three available movement tiles in both browsers.

Observed: `label-content-name-mismatch` on every available tile. An explicit aria-label names the destination and fee but omits other visible label content.

Expected: The accessible name includes the visible control text.

Fix and retest: Natural button contents supply the name, with a hidden action prefix. The complete UI flow was repeated after the change. All 35 final all-rule scans have zero violations.

Evidence: [original 32-scan failure](../evidence/market-visual-attempt1.json), [complete UI retest](../evidence/market-browser-final.json), [final scans](../evidence/market-visual-final.json).

## F-07: Market lacks a complete heading hierarchy

Discovered during TC-M06 alongside F-06.

1. Start Market Day and run all axe rules.
2. Inspect the page title and section headings.
3. Retest after the first correction added an h1.

Observed initially: `page-has-heading-one`. Observed at step 3: the new h1 exposed skipped section levels, producing `heading-order` across all 32 matrix scans.

Expected: A first-level game title followed by correctly nested section headings.

Fix and retest: The title is h1, board and turn sections are h2, and the deal heading is h3. The final run covers 32 browser/theme/width combinations plus business, trade-form and recipient-offer phases. All 35 scans pass.

Evidence: [initial failure](../evidence/market-visual-attempt1.json), [intermediate heading-order failure](../evidence/market-heading-order-retest.json), [final passing scans](../evidence/market-visual-final.json).

## Suspicious flows that did not produce a product defect

- Market duplicate movement and acceptance each commit once. Different simultaneous destinations, and buy versus pass, each produce one success and one conflict with the correct single state change.
- Offline peers, reloads and deliberately lost successful responses recover authoritative state. Complete games record one result per participant; confirmed departure records none.
- Pocket HTTP 500/429, network abort, malformed HTTP 200 JSON and late save responses preserve the completed board and offer a working retry.
- Initial viewport-resize screenshots contained duplicated raster strips. They were excluded from visual acceptance and replaced with fresh fixed-context captures.
- Harness failures from stale labels, premature alert reads, a nested select-label locator and round-count assumptions remain in the run logs. Corrected cases restarted with fresh fixtures. They were not classified as product fixes.

See [Market execution](../runs/market.md), [Pocket execution](../runs/pocket.md), [regression execution](../runs/regression.md) and [self-audit](../runs/self-audit.md) for the complete record. A final cleanup query found no leftover records among the 50 logged fixture IDs: [cleanup evidence](../evidence/final-cleanup.json).
