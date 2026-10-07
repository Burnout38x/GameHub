# Pocket Paradise implementation

Implemented original 5-column × 4-row neighborhood builder, exactly 20 placements; three distinct tile offers each turn, deterministic seed hashing, four plot families, orthogonal adjacency scoring and two resident requests. No timer. Standard seeds are UUIDs; daily seeds UTC dates; practice explicitly does not record account statistics.

Local saves store/replay move history; cached boards cannot forge state. Invalid saves are rejected. Storage failures leave the current in-memory game playable with an explicit warning. Preview/cancel precede confirmed placement; committed turns cannot be undone. Completed runs can download an original SVG postcard. Board uses original CSS miniature buildings, depth/shadows, optional flat presentation and reduced-motion support; no heavyweight graphics dependency or externally hosted artwork.

Parent integration contract: `POST /api/pocket-paradise` body `{seed,mode,moves}`, authenticated server replays via `replayPocketRun`, obtains `scorePocketBoard(run.board,run.seed).total`, returns `{ok:true,recorded:boolean}`. Automatic completion save plus retry/sign-in UI; practice never posts. Server must validate completion, daily date, dedupe user/seed, rate-limit records and avoid trusting client scores. A late response from a replaced run cannot alter the new run’s save status.

Validation:
- `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test tests/pocket-paradise.test.ts`: 6 passing tests (replay, illegal moves, edge topology, tampered saves, deterministic offers over 2,000 turns, one-time request bonuses).
- Targeted ESLint passed, zero warnings.
- Initial full TypeScript check found only concurrently edited Market Day type errors, no Pocket errors; root integration check must rerun after all changes.
- `node scripts/test-pocket-browser.mjs`: 58 checks passed in isolated Chromium and WebKit, zero page errors. Covers preview/cancel, 20-turn standard and practice completion, guest progress messaging, downloaded postcard, save/resume and flat preference persistence, 4 themes × 5 widths (320/375/717/820/1440), plus confirmation-dock visibility at those widths. Evidence: `.forge/pocket-browser.json`; representative screenshots `.forge/screenshots/pocket-*.png`. Port 3202 test app stopped after verification.
- Mobile preview confirmation is portaled to a compact bottom dock, outside the app’s animated page container; this avoids fixed-position containment and repeated scrolling between board and confirmation. Verified both engines.
- Both home–park and stall–path edges award 2 points, preventing an obvious structural preference for one pairing. Same-family park/path edges award 1. Resident requests reward diversification. These rules are tested, not claimed as externally playtested balance.

Rules are intentionally simple and fully explained on-screen. No public daily ranking or claims of independently proven balance. Saved-board persistence is browser-local; account progress is a completed-run statistic, not cloud board synchronization.
