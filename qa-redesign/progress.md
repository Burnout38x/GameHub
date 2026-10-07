# Game redesign progress

## Design and implementation — complete

Independent critique identified shallow scoring, no solo success target, decorative districts and weak trade incentives. Both games now have versioned rules and redesigned boards. Pocket uses connected services and charter medals. Market uses contested contracts, district sets, rotating initiative and finite stock. Original unversioned games retain their rules.

Pocket's API replays the selected rules and uses a separate v2 completion key. Market's final screen retains its board and scoring explanation. Canceled matches show no fabricated victory. Movement uses finite construction feedback and committed-state token travel; reduced motion is supported without adding a rendering dependency.

## Defects and verification

Independent review exposed repeated Pocket offers, noncompetitive wholesale stock, theme contrast issues and crowded mobile tokens. Fixes and retests are documented in [BUG-TRACE.md](BUG-TRACE.md). Author checks passed: 114 unit tests, full lint with zero warnings, type checking and production build.

Independent Chromium checks passed both game flows, responsive layouts and all four themes. Pocket has actual twenty-placement failure and keyboard-confirmed gold completion evidence. Market has bounded token travel, unchanged-poll stability, reduced motion, interrupted updates, mobile token spacing and next-action focus evidence. Temporary visual fixtures are labeled separately from actual database tests.

## Real local multiplayer — complete

Initial registry/CDN downloads blocked the original local stack. A minimal isolated stack was recovered using verified public image layers: PostgreSQL 17.11, real Supabase Auth v2.196.0, PostgREST v16.1 and a loopback-only reverse proxy. The app uses port 3199; the API uses 58321. Only task-owned containers were changed. No production database or other project was changed.

Independent two- and four-player sessions completed 20 and 40 turns. Scores, winners, persistence, duplicate-command fencing, two-client convergence, reload and rematch passed. Pocket server replay, exactly-once completion and original-version compatibility passed. All disposable accounts, rooms and related records were cleaned by exact ID and verified absent. A separate original-rule Market HTTP probe also passed and cleaned its fixtures.

## Release checkpoint

Targeted WebKit acceptance passed. Root then found and fixed a nested main landmark in Pocket. The rebuilt production app passed ten public-flow checks across Chromium/WebKit at 320, 390, 717, 820 and 1440 pixels, including full-page axe, no overflow and one main landmark. Targeted lint and type checking passed again. Source changes are accepted for push; production verification is next.

Release source committed and pushed to both `main` and `codex/gamehub-game-night-upgrade`: `7eacc7c5dcc20c1dd8d0dc003b766bc1072ae3a9`. Vercel build is pending. All task-owned local app/gateway processes and the three test containers were stopped after fixture cleanup. Other Docker projects were left untouched.

Production deployment 6908823358 succeeded for source `7eacc7c`. Ten live Chromium/WebKit checks passed across five sizes with zero page errors, no overflow, one main landmark and zero full-page WCAG axe findings. No live accounts, rooms or results were created. All six acceptance conditions passed; final evidence is ready to archive.
