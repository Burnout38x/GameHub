GOAL: Bring Pocket Paradise to life with clean, believable residents whose journeys demonstrate working paths and explain failed services without heavy rendering.
DONE WHEN:
  1. Resident routes follow actual connected paths and service rules; disconnected buildings explain their needs; classic saves remain honest and playable. — PASS (`node qa-life/verify.mjs` → 121 tests, 8 Chromium/WebKit checks, lifecycle and independent review evidence validated)
  2. Small residents walk and perform brief destination actions with bounded lightweight motion, reduced-motion/hidden-tab handling and no idle frame loop. — PASS (`node qa-life/verify.mjs` → 121 tests, 8 Chromium/WebKit checks, lifecycle and independent review evidence validated)
  3. Mobile/desktop browser checks, route tests, lint, type checking and build pass; independent review findings are resolved. — PASS (`node qa-life/verify.mjs` → 121 tests, 8 Chromium/WebKit checks, lifecycle and independent review evidence validated)
  4. Verified source and progress evidence are pushed and production is checked. — NOT CHECKED (release next)
OUT: New scoring rules, ongoing simulation, database changes, unrelated games.
RISK: Reversible frontend changes; preserve existing saves. No production database writes.
PHASES: Route model and presentation; browser and independent verification; release.
STATUS: Implementation and independent verification complete. Final browser rerun passed; release next.

Evidence gate validates retained results; actual browser commands are node qa-life/browser.mjs and node qa-life/lifecycle.mjs.
