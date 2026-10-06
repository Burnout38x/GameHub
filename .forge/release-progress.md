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
