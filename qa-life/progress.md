# Pocket neighborhood life

Goal: visually demonstrate actual working paths and services with a small number of believable residents.

Implementation: at most three deterministic residents follow shortest gate-connected path routes, then step to the destination edge. Newly served buildings get priority. Residents have finite walking, waving and shopping feedback; there is no animation frame loop, repeating timer, new runtime dependency or database change. Hidden tabs cancel motion; resize settles to recalculated destinations; reduced motion presents static arrivals. Previews never create resident routes. Toggle and replay controls are available.

A plot attention report names exact missing access/park/happy-home conditions. Classic saves retain their original scoring and explain why resident routes require a fresh neighborhood.

Independent review found and prompted fixes to new-building prioritization, mobile transform geometry and gate anchoring. Seven route tests include 300 sampled boards; all 121 project tests passed. Full lint, type checking and isolated production build passed. Browser checks underway against a stable production preview; the first development-preview run was invalidated by layout/font settling and a source refresh during observation. Harness now waits for fonts and tests a stable build.

Lifecycle probe exposed an immediate-resize observer race; dimension comparison fixed it. Independent source review accepted the correction. Retest passed hidden-event cancellation, visible return and real viewport resize alignment. Full eight-view browser suite is rerunning against the final rebuilt app.

Final rebuilt app: all eight Chromium/WebKit viewport checks passed (320, 390, 820, 1440), with real movement, destination alignment, finite settling, reduced motion, controls, preview isolation, no overflow and zero full-page WCAG axe violations. Disconnected/classic reload checks passed. Ready for push.

Release complete: source ba8b263d2d633e9aae74eb6ca9f73c20c83a02cc pushed to main and codex/gamehub-game-night-upgrade. Production deployment 6920501567 succeeded. Eight live Chromium/WebKit checks passed with zero page errors and WCAG axe findings, no overflow, valid movement and final destinations. Test saves remained browser-local practice data; no production database writes. Final captured screenshots show the deployed feature. Isolated local app stopped. Follow-up commit contains release evidence only.
