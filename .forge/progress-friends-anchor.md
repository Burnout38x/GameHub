GOAL: Add manageable player progress/streaks, following and online friends, and private room invitations that returning friends can receive.

DONE WHEN:
  1. Progress shows reliable completed-game totals, streaks and manageable goals with verified counting — PASS (`node scripts/test-social-browser.mjs` → completed-game counting exactly once, streak update and saved goal checks passed; `npm test` → 80 passed)
  2. Players can discover/follow/unfollow people and see consent-appropriate online status — PASS (`node scripts/test-social-browser.mjs` → username search, follow counts, full follow UI and online privacy passed)
  3. Private persistent invitations can be sent, seen on return, accepted/declined, and safely reject unavailable rooms — PASS (`node scripts/test-social-browser.mjs` → returning-player invite notice, acceptance, duplicate acceptance and closed-room rejection passed)
  4. Authorization, state/concurrency, browser/accessibility and production build checks pass before migration/push; progress recorded — PASS (`node scripts/test-social-database.mjs` → 7 privacy/concurrency/expiry checks passed; `node scripts/test-social-browser.mjs` → 20 checks passed with zero accessibility violations or browser errors; `npm run lint` → zero warnings; `npm run build` → compiled successfully)

OUT: External email/SMS/push messages; changing existing accounts/scores; unrelated databases; fabricated online status; recording unsigned local games as verified online wins.
RISK: Additive private tables/RPCs only; presence requires explicit privacy control. Only jnzbncbmcewsvtjjmddn is authorized live. Test isolated first. Preserve old app compatibility and row counts. No resets.

Defaults pending clarification: both daily-play and win streaks; invitations between mutual follows. Daily streak uses explicit UTC day boundaries unless a local timezone design is agreed; UI must explain boundaries. In-app queued invites stay valid only while lobby exists and before expiry. No browser notification permissions required.
