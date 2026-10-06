GOAL: Add admin user/account visibility and reports, improve game categorization, and offer a saved theme section with two additional UI styles.

DONE WHEN:
  1. Admin users/accounts and requested reports are usable and protected from non-admin access — PASS (`node scripts/test-admin-browser.mjs` -> admin authorization, real report submission, concurrent rate limit, resolve/reopen and exact analytics pass)
  2. Game library has clear, tested categories across online and local games — PASS (`npm test` ->72 tests pass including category mapping for18 online and8 local games, combined filters and empty reset)
  3. Theme section supports four persisted accessible styles across the app — PASS (`node scripts/test-admin-browser.mjs` -> all4 saved themes pass browser accessibility/layout checks; zero violations)
  4. Relevant automated/browser checks and independent review pass, with progress logged before authorized push — PASS (`npm run build` -> compiled successfully and TypeScript passes;72 tests and29 browser checks; independent reviews and resolved findings recorded in admin-library-themes-progress.md)

OUT: Editing or deleting existing player accounts, unrelated databases, resetting live data.
RISK: Privileged account reads require explicit server authorization. Prefer read-only reports and existing schema. Verify against isolated app before release; only jnzbncbmcewsvtjjmddn is authorized for any live database work.
