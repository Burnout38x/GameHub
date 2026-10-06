# Next 16 server migration checkpoint

Reference: official [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16), read 2026-10-06. It requires asynchronous cookies, dynamic params and server searchParams, and replaces middleware naming with proxy.

Implemented:
- `src/lib/supabase/server.ts` awaits cookies and returns an asynchronous server client.
- Every import of that helper now awaits its creation (12 server callers); browser client creation is unchanged.
- Dynamic room API GET/POST entrypoints await Promise params before invoking existing serialized action logic.
- Room page awaits code params; games page awaits notice searchParams.
- Session refresh/routing moved from `src/middleware.ts` to `src/proxy.ts`, with named export proxy and existing matcher.
- Isolated app launcher removes the obsolete copied middleware file when intentionally refreshed after upgrade.

Safety: root coordinated the isolated app restart on Next 16.4.0 using supported Webpack mode because this temporary app shares dependencies through an external node_modules symlink. Production configuration/data remains untouched; no database reset occurred.

Actual post-upgrade verification:
- `node scripts/test-database-routes.mjs` → 18 games and 9 additional lifecycle/concurrency flows passed against the running Next 16.4.0 app. Includes exact scores/history, stale/missing round guards, host transfer, legacy memory, simultaneous voting and joins, partner privacy/adjudication, rematch and final challenge.
- `node scripts/test-database-timer.mjs` → 2 real multi-client scenarios passed. Expiry only reveals; explicit Next/Finish advances. Missing/stale guards run before no-op.
- Logs: `/private/tmp/gamehub-codex-audit-20261006/routes-next16.log` and `timer-next16.log`.

Root owns upgraded full unit/DOM/browser/build verification and final dependency warning report.
