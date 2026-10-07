# Release record

Source: `7eacc7c5dcc20c1dd8d0dc003b766bc1072ae3a9`, pushed to `main` and `codex/gamehub-game-night-upgrade`.

Production deployment 6908823358 succeeded. Ten live public-flow checks passed in Chromium and WebKit at 320, 390, 717, 820 and 1440 pixels: no overflow, no page errors, one main landmark and zero full-page WCAG axe findings. No production accounts, rooms or results were created. No production database migration was needed.

The Forge acceptance gate parsed all six conditions and exited 0 with `--rerun`. Its read-only commands validate retained evidence; they do not rerun browser or database sessions. The archived anchor is `.forge/archive/2026-10-07-game-redesign.md`.

114 unit tests, lint without warnings, type checking and production build passed. Independent game review, real local two- and four-player matches, compatibility and browser checks passed. The final Pocket landmark fix was followed by a fresh build, targeted lint/type checking and ten local plus ten live browser checks.

See `final-independent-report.md`, `BUG-TRACE.md`, `deployment.json` and `live-smoke.json`. Browser viewport emulation is not physical-device certification; simulation results do not establish universal human balance. The final follow-up commit contains evidence only and leaves the verified application source unchanged.
