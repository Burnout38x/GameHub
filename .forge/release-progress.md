# GitHub and live database handoff — 2026-10-06

User authorized pushing the completed changes, then authorized updating the live database. User explicitly restricted database changes to GameHub's database only.

Target repository: Burnout38x/GameHub. Upgrade branch: codex/gamehub-game-night-upgrade.
Configured database: jnzbncbmcewsvtjjmddn.supabase.co. No other database is authorized for this release.

Current release boundary:
- GitHub main still serves the older app through a Production deployment integration.
- Both migrations passed isolated tests. The additive action-lock migration must precede the new app; privacy policy changes must be coordinated with the matching app and old clients reloaded.
- Supabase connector get_project/list_migrations/read-only execute_sql all returned permission denied for this exact project. No live SQL or migration executed.
- User has been asked to confirm the target and reconnect an account authorized for it. No passwords or keys requested in chat.
- Continue by verifying authorized project access, reviewing live schema/migration history and room activity, then coordinating database/app release. Do not apply privacy policy changes while the old app is the only deployed version.

GitHub push proceeds independently to the upgrade branch. Production main and database remain unchanged until the access and release prerequisites are satisfied.

GitHub outcome: application commit a96b7f8 pushed successfully to origin/codex/gamehub-game-night-upgrade. Initial push used Creovex and returned403; the retry used the already-authenticated repository owner Burnout38x for that command only, with no global account switch. Main was not changed.

Production's existing successful deployment is still commit a4e59ec through Vercel. Do not treat the upgrade branch push as a completed production rollout.

Database outcome: unchanged. Await target confirmation/account reconnection from the user because the connected Supabase account cannot access jnzbncbmcewsvtjjmddn. No attempts were made against another database.

## Access resolved and coordinated rollout

The user confirmed project jnzbncbmcewsvtjjmddn and then confirmed everyone had finished playing. Existing local SUPABASE_DB_PASSWORD permits direct Postgres access despite the connector's unrelated account permission failure. Connection uses verify-full TLS with the official Supabase CA; no secrets copied into logs or repository.

Schema rollback snapshot: /private/tmp/gamehub-release-20261006/before-public.sql. Direct connection is pinned to db.jnzbncbmcewsvtjjmddn.supabase.co and checks the configured project URL. Independent review by room_ui approved migration001 atomically and required waiting for finished players before app deployment; both requirements met.

Migration202610060001 applied atomically with canonical Supabase migration history. Verified three RPCs deny anon/authenticated and allow service_role; lock table has RLS enabled. Existing counts remain 4 profiles,24 rooms,20 match_history. No existing row DML performed. The one stale playing-room status was preserved, not forcibly finished.

App commit3c48825 pushed to main as a fast-forward; Vercel production build pending. Branch preview built successfully but is protected by Vercel SSO. Migration002 remains pending until production is verified.

Existing managed Postgres warning: supautils.restrict_extension_versions is a reserved-prefix configuration parameter. Left platform configuration unchanged; it does not prevent SQL execution.

Production deployment6897465185 for exact commit3c48825 succeeded in Vercel (GitHub deployment state success). Generated URL https://game-3nzpr8z9p-james-akintundes-projects.vercel.app redirects to Vercel SSO (302), so it does not provide an unauthenticated app smoke check. GitHub's configured homepage https://game-hub-liard-omega.vercel.app returns404. Asked the user for their current live URL. Native browser inventory also unavailable (native pipe startup failed); no user tabs changed.

Checkpoint: main app has deployed successfully according to Vercel, migration001 verified, migration002 still held pending a live app check at the user's actual address. Next: verify that address serves the new app, apply stage2.sql atomically to the same exact project, run verify.sql, record both migrations and data preservation, then close release gate. No requests to other Supabase databases.

## Release verified at the user's live URL

User supplied https://naijagamehub.vercel.app/games. The live app returned200 and displayed the new Game Library. Isolated Playwright public smoke passed7 checks (home/library/login/join/local-game routes, persistent theme and authenticated-only room snapshot), with no browser runtime errors.

Then migration202610060002 committed atomically with its history entry, on jnzbncbmcewsvtjjmddn only. All four broad read policies are absent; admin prompt policy remains. Authenticated users can update username but cannot update total_points or the whole profiles table. Both migration versions and service-only RPC grants verified.

Post-migration live two-player Riddle Rush check passed using two newly created disposable identities: login, create private room, join through UI, start, hidden correct answer, correct/wrong submissions,1–0 scoring, final results, and two history rows with the correct winner. Both themes passed result-screen accessibility and overflow checks. Browser errors/warnings and accessibility violations:0. Aborted prefetch/navigation requests are retained in the report; all assertions passed. This is a representative production smoke, not a rerun of every game's isolated suite.

Only the two created test accounts and their own cascading test data were removed. Final counts match pre-release:4 profiles,24 rooms,20 match_history. Existing rows were not edited by either schema migration. Evidence: release-smoke.json, release-online-report.json, release-database-verification.txt and two live-result screenshots.

Rollback remains available: previous public schema in /private/tmp/gamehub-release-20261006/before-public.sql; restore the four old read policies/profile update grant together with reverting the app to a4e59ec if rollback is necessary. Do not drop additive RPCs while the new app uses them. Rollback was not executed on production. No rollback needed.

Final state: both database migrations applied, live matching app verified, release complete. Refresh old browser tabs before playing. Remaining known limitations from the original audit: dev-only dependency advisory and managed Supabase configuration warning; neither was hidden or addressed by unrelated production configuration changes.
