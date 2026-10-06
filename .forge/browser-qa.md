# Browser QA — isolated audit app — 2026-10-06

Target: http://127.0.0.1:3199, backed exclusively by disposable Supabase http://127.0.0.1:58321. Browser requests are allowlisted to those two origins. Chrome launches headless with a new temporary profile, never attaches to a user's browser, and has pointer lock/capture disabled. Test accounts are created only in the disposable database; credentials and session tokens are not saved to reports/screenshots. No live data was mutated.

Dependencies: pinned playwright-core 1.63.0 and axe-core 4.14.0. Official Playwright launch API reference: https://playwright.dev/docs/api/class-browsertype#browser-type-launch . The installed Google Chrome executable is used; the user's profile is not supplied.

## Evidence

1. `node scripts/test-browser.mjs` (matrix followed by corrected flow continuation with QA_FLOWS_ONLY=1) → **83 unique checks**, zero axe violations, zero horizontal overflow findings, zero final runtime errors. Machine output: `.forge/browser-report.json`.
   - Home, game library, and all eight local setup screens: 375/768/1440 pixels × dark/bright themes = 60 route/layout combinations.
   - All eight local play screens and representative input interactions.
   - Actual browser login with local-only accounts, room creation, second independent browser session joining by code, two-player lobby start, and online Predict renderer.
   - Failed room snapshot GET returns a 503 test response: visible connection banner preserves rendered gameplay; retry recovers without replacing the game screen.
   - Keyboard Tab exposes Skip to content; Enter focuses the main landmark. Theme toggle persists through reload. Reduced-motion setting suppresses entry motion.
2. `node --import tsx scripts/test-browser-results.mjs` → **8/8 complete-and-replay flows**, zero errors. Machine output: `.forge/browser-results.json`.
   - Code Crackers: known duplicate-digit test secret, solve, result and replay.
   - Know Your Partner: both answer/guess roles, hidden handoff, final result and replay.
   - Mental Math: all ten rounds solved, result and replay.
   - Mystery Card: five race rounds answered, result and replay.
   - Reverse Definition: ten buzzer rounds answered, result and replay.
   - Rule Discoverer: three rules identified, result and replay.
   - Who Remembers: five private-answer pairs, hidden handoff, result and replay.
   - Word Chain: fifteen words, final review acceptance, result and replay.
   - Browser clocks accelerate transition delays; deterministic randomness is limited to Code/Rule fixtures. Other games use their normal generator/content bank. These are mounted browser UI interactions, not component test substitutes.
3. `node scripts/test-browser-visual.mjs` → final header/theme screen matrix and reduced-motion game picker. Output `.forge/browser-visual.json`; final screenshots use `final-{theme}-{width}-{home|games}.png`.

## Findings resolved during harness development

- Initial axe on the entering homepage flagged two buttons while their ancestor was mid-opacity animation. The harness now waits for all finite animations to finish before contrast measurements. The stable matrix has zero contrast violations. This was an unstable measurement, not a suppressed axe rule.
- Early failed runs used wrong labels for Mystery Card race player buttons, partner handoffs, and the Rule action's emoji prefix. Corrected selectors exercise the real controls.
- Global constant randomness made the math distractor generator loop; the test fixture now scopes constant randomness to Code/Rule only. Normal application randomness was never changed.
- Counts are deduplicated; 97 cumulative observations in an intermediate run represented 83 unique checks.

## Visual observations and limits

Reviewed actual screenshots of the dark mobile homepage and final bright mobile homepage. The updated two-row mobile header fits; cards, primary actions, headings, and content spacing remain readable and consistent. All 60 initial combinations and final home/library combinations report no horizontal overflow. Screenshot artifacts are under `.forge/screenshots`.

No committed screenshot baseline exists: pixel-to-baseline visual regression verdict is **INCONCLUSIVE**. These screenshots are the new evidence baseline, not proof that every pixel improved.

Axe WCAG2A/AA, 2.1AA and 2.2AA scans passed for the measured screens. This does not establish complete accessibility: a screen-reader session and full manual keyboard playthrough for every game were not performed. Production web vitals were not measured against this development server. Separate agents own isolated database engine tests and remaining online renderer browser coverage.

## Upgraded production stack verification

After rebuilding the isolated app with Next 16.4, React 19.3 and Tailwind 4, production hydration smoke passed (game picker interaction and saved theme reload). Production runs then passed all 83 unique matrix/interaction checks, all eight complete-and-replay local games, and 13 visual/reduced-motion checks. Console warning/error listeners on the result and visual suites recorded none. Earlier development-HMR failures are superseded by production checks, not hidden.

Manual screenshot inspection found a real Tailwind 4 cascade regression missed by axe: important pale accent utilities overrode bright-theme color remapping. Computed `All games` link color was rgb(156,221,210). CSS overrides were moved into the earliest native theme layer, where important declarations outrank important utility-layer declarations. The final visual harness now explicitly requires the bright link to compute to rgb(23,104,96). A rebuild and final visual/matrix rerun remain required for that fix.

## Final CSS rebuild — complete

Final isolated production reruns completed after the cascade fix:

- `node scripts/test-browser.mjs` → **83 checks, 0 axe violations, 0 overflow findings, 0 errors**, exit 0.
- `node scripts/test-browser-visual.mjs` → **13 checks, 0 axe violations, 0 overflow findings, 0 browser console warnings/errors**, exit 0. Explicit computed-color assertion passed at all three bright-theme widths.
- Eight local game completion/replay checks from the same final React/game code remain passed; the final rebuild changed CSS only.
- Inspected regenerated dark and bright mobile home screenshots: readable accent links, compact navigation, rounded card/control hierarchy and consistent spacing. Final screenshot files are refreshed, not inherited from the pre-upgrade build.

The previously pending bright-theme cascade fix is now verified. No actionable visual or runtime finding remains in this reviewer's measured scope. Manual screen-reader and production performance measurement limitations above still apply.
