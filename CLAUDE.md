# GameHub project guide

- Next.js16 App Router, React19, TypeScript7 with official TS6 tooling API alias, Tailwind4, Supabase Auth/Postgres.
- `src/app/api/rooms` contains authoritative multiplayer actions; browsers must not mutate scores or room state directly.
- `src/lib/server` holds room lifecycle helpers. `src/components/room` renders online game types.
- `src/app/games/local` contains eight same-device games; shared validators/content live in `src/lib/local-games`.
- `supabase/schema.sql` is initial setup, not a repeatable migration. Do not run it over an existing project.
- Never print `.env.local` or service-role keys. Use test identities for integration checks.
- UI uses shared classes in `src/app/globals.css`; preserve responsive, keyboard, loading and error states.
- Run `npm run lint`, `npm test`, and `npm run build` to verify.
- Task acceptance and audit evidence live in `.forge/anchor.md` and `.forge/*audit.md`.
