GOAL: Build Pocket Paradise and Market Day as playable, polished games in GameHub.

DONE WHEN:
  1. Pocket Paradise has deterministic scoring, 20-placement runs, practice, daily seed, saved resume, placement preview, accessible flat and dimensional boards, results and verified progress — PASS (`node scripts/test-pocket-browser.mjs` -> 58 Chromium/WebKit checks, zero page errors; `node scripts/test-game-expansion-security.mjs` -> concurrent solo completion recorded once, forged moves rejected).
  2. Market Day supports 2–4 players, ten rounds, authoritative movement/business actions/trades/events, reconnect, duplicate protection, results and rematch — PASS (`node scripts/test-game-expansion.mjs` -> 10 check groups passed, complete four-player forty-turn match, concurrent actions, reconnect and rematch; `node scripts/audit-market-ui.mjs` -> complete two-player twenty-turn UI match, accepted and declined trades).
  3. Both games integrate with catalog/categories/themes and pass engine, API, browser, responsive and independent review checks — PASS (`npm test` -> 98 passed, 0 failed; `npm run lint` -> exit 0, zero warnings; `node scripts/test-database-app.mjs` -> isolated production build compiled successfully; independent review findings resolved in game-expansion-review.md and game-expansion-ui-review.md).
  4. Additive changes are applied only to jnzbncbmcewsvtjjmddn, existing data preserved, tested code pushed and production verified — PASS (`node scripts/smoke-game-expansion-live.mjs` -> 10 live checks, zero page errors; production deployment 6899103935 succeeded for d21ddc6; migration and activation read back with existing data digests unchanged).

OUT: Bots, public daily rankings, additional maps, unrelated redesigns.
RISK: irreversible — additive production catalog migration and deployment; rollback disables new catalog entries and reverts code without deleting player records.

PHASES:
  1. Inspect integration contracts and define testable rules.
  2. Implement solo and multiplayer engines/presentation with additive migration.
  3. Test isolated database and browsers, independent review, fix findings.
  4. Deploy, preserve data, verify production and archive evidence.

FINAL EVIDENCE: .forge/game-expansion-release.md, game-expansion-live.json, game-expansion-db-before.txt and game-expansion-db-after.txt. Browser/build commands used isolated environment settings as recorded in scripts and logs. Gate parse mode validates evidence form; side-effectful database/browser/deployment checks ran explicitly, not via gate rerun.
