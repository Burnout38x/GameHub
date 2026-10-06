# Leaderboard sign-in — 2026-10-06

Leaderboard page now requires a verified signed-in user. Added /leaderboard to protected routes and a page-level check before loading ranking data. Signed-out visitors see a relevant login explanation, with next=/leaderboard preserved.

End-to-end verification found an existing login race: refreshing the signed-in login page could redirect to /games and override the intended destination. Updated the authenticated login/register redirect to honor safe same-origin next paths, excluding auth-page loops and external destinations.

Verification: zero-warning lint; isolated production build/typecheck passes. Browser test with a disposable local account passes guest307 redirect/no ranking table, login explanation, successful login returning to /leaderboard, authenticated reload, external next URL rejected to /games, and sign-out blocking leaderboard access again. Test identity removed. No live accounts or database policies changed.
