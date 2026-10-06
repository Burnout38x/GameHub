# 🎮 GameHub

Live multiplayer game nights for couples, friends, and family — built for long-distance play.
Create a room, share a 6-character code, and everyone plays on their own phone with scores,
turns and answers syncing in real time.

**Stack:** Next.js 16.4 (App Router, React 19.3, TypeScript 7, Tailwind 4.3) · Supabase (Postgres + Auth + Realtime) · Vercel

## Online games (18)

| Game | Type | Source |
|---|---|---|
| 🩺 Doctor Dash | Quiz (everyone answers at once) | your original file |
| 🧠 Riddle Rush | Quiz | your original file (+10 new easy riddles) |
| 🎬 Emoji Movie Guess | Quiz with emoji + hints | your original file |
| 🍿 Movie Trivia | Quiz | new (24 questions) |
| 🙈 Never Have I Ever | Prompt — counts "I Have"s | your original file |
| 🤔 Would You Rather | Prompt — match bonus if everyone agrees | new (25 prompts) |
| 😈 Truth or Dare | Prompt — turn-based | new (25 prompts) |
| ⏱️ 2-Minute Challenge | Prompt — turn-based with timer | your original file |
| 🃏 Memory Match | Shared live board, turn-based | your original themes |
| 🔢 Number Guess Battle | Duel — secret is server-side | new |
| 🕵️ Mystery Card | Timed quiz | local + online |
| 🔎 Reverse Definition | Quiz / local buzzer | local + online |
| ⚡ Mental Math | Quiz / local simultaneous duel | local + online |
| 💞 Know Your Partner | Private answers and predictions | local + online |
| 📸 Who Remembers It Better? | Private memory answers and discussion | local + online |
| 🔐 Code Crackers | Secret-code deduction | local + online |
| 🧩 Rule Discoverer | Test examples and guess the rule | local + online |
| 🔗 Word Association Chain | Word links and challenge votes | local + online |

Every quiz/prompt game supports **Easy / Hard / Mixed** difficulty, chosen when creating a room.

## Features

- **Accounts for everyone** — email + password. The **first user to register becomes admin** automatically.
- **Live rooms** — up to 10 players, authenticated snapshots refresh while the room is visible.
- **Meta layer** — global leaderboard, lifetime points, win streaks, 7 achievements, match history, rematch that pulls the whole room along.
- **Admin console** (`/admin`) — prompt counts per game/difficulty, add/edit/delete prompts, one-click difficulty retagging, **bulk JSON import**, create entirely new quiz/prompt games from the UI (no code), hide/show games, platform stats.
- **Server-authoritative** — all game mutations run through API routes with the service role; row-level security locks writes out of the browser entirely.
- Responsive shared UI with saved warm-dark and bright themes, reduced-motion support, and clear room/game states.

## Setup (about 10 minutes)

### 1. Create the Supabase project (free)

1. Go to [supabase.com](https://supabase.com) → New project (free tier, no card needed).
2. In the dashboard: **SQL Editor → New query** → paste the whole of
   [`supabase/schema.sql`](supabase/schema.sql) → **Run**. This creates the initial tables, policies, the original 10 games and achievements.
   For a new isolated project, then apply the files in `supabase/migrations/` in filename
   order before running this version. Use `npm run seed:online` to add the eight ported games.
3. **Project Settings → API**: copy the *Project URL*, *anon public* key and *service_role* key.

### 2. Configure and seed

```bash
cp .env.example .env.local        # then paste your three Supabase values into it
npm install
npm run test:extract              # optional: verifies your original HTML files are found
npm run seed:prompts              # imports ~409 prompts (your 324 originals + new content)
```

The seed script looks for your original HTML games in `../web Games` by default;
set `SOURCE_HTML_DIR=/path/to/folder` if they live elsewhere. Re-running is safe
(it replaces seeded prompts per game). Prompts you add later in the admin panel are
kept unless you re-run the seeder for that game.

### 3. Run locally

```bash
npm run dev        # http://localhost:3000
npm test           # logic + React DOM regression tests
npm run build      # production build check
```

**Register your account first — the first account becomes the admin.** 👑
To promote someone else later, run in the SQL editor:

```sql
update public.profiles set role = 'admin' where username = 'TheirName';
```

### 4. Deploy to Vercel (free)

1. Push this folder to a GitHub repo.
2. [vercel.com](https://vercel.com) → **Add New Project** → import the repo (framework auto-detected).
3. Add the three environment variables from `.env.example` under **Settings → Environment Variables**.
4. Deploy. Done — share your URL and play from anywhere. 🌍

> Optional: in Supabase **Authentication → Providers → Email**, disable "Confirm email"
> if you want signups to work instantly without a confirmation email.

## How a game flows

```
/rooms/new  → POST /api/rooms            → room row + 6-character code
/room/CODE  → lobby (authenticated snapshots)  → host POST /api/rooms/CODE/start
            → prompts shuffled & frozen, per-type state initialised
answering   → POST .../answer | /memory | /guess   (validated server-side)
revealed    → any player POST .../advance (round-guarded against double taps)
last round  → finishGame(): winners, match_history, lifetime stats,
              streaks, achievements — idempotent under concurrency
end screen  → host rematch creates a new room and beckons everyone to it
```

## Project map

```
supabase/schema.sql            entire database: tables, RLS, realtime, seed games
scripts/seed-prompts.mjs       imports original HTML content + new prompts
scripts/test-extract.mjs       dry-run check of the HTML extraction
src/proxy.ts                   session refresh + route protection
src/app/api/rooms/**           game engine (create/join/start/answer/advance/memory/guess)
src/lib/server/room-actions.ts shared engine helpers + game-finish logic
src/components/room/**         snapshot-driven lobby, game boards, and results
src/app/admin/**               admin console (role-gated by RLS *and* the layout)
tests/game-logic.test.ts       unit tests (npm test)
```

## Notes & limits

- Supabase free tier: 500 MB database, 200 concurrent realtime connections — far more
  than a couple plus friends will ever use. Projects pause after 1 week of inactivity;
  just hit "Restore" in the dashboard (or play more often 😉).
- With the included privacy migration applied, quiz answers, hidden memory faces,
  rule identifiers, and private partner answers are protected by server snapshots.
  The live project must receive the coordinated migration before these protections
  can be considered deployed.
- Room codes avoid 0/O and 1/I so they're easy to read out over a call.

## Game-night consistency update (October 2026)

The library includes 18 online games and eight same-device games. Local games and the
library are available without an account; online rooms keep authenticated membership.
The navigation theme switch offers warm dark and bright themes and saves the choice on
the current device. Shared forms, boards, status/error feedback, and mobile navigation
use the same design tokens.

### Required database upgrade before deploying this code

Do **not** apply the original `schema.sql` to an existing project. The new room actions
require the migration files in `supabase/migrations/`, in filename order. The first adds
room-action serialization and transactional final results; the second removes direct
client reads of hidden game data and limits self-profile edits to username.

These migrations have **not been applied to the live project**. Apply to an isolated
preview first, verify gameplay, then schedule the production upgrade when current rooms
have ended. Old open clients read tables directly and must reload after the privacy
migration. Deploy the matching app and database changes together. Each migration contains
rollback instructions; rollback of read policies restores the older privacy limitations.

Room updates now use authenticated, sanitized snapshots with visible-tab polling. Hidden
memory faces, quiz answers, rule IDs, and another player's private answers are withheld.
The room action lease assumes a hard 30-second request lifetime (configured by each route)
and expires after 120 seconds; self-hosted deployments must enforce the hard request
limit. Final result recording is transactional. Intermediate gameplay API calls still
span multiple database requests; transport failures require recovery and are not a fully
transactional state-machine implementation.

Verification evidence and any remaining limitations are tracked in `.forge/anchor.md`
and the audit reports beside it. `npm test` runs logic and component regression tests;
`npm run lint`, `npx tsc --noEmit`, and `npm run build` check application consistency.

### Current toolchain

Use Node24 or newer. Direct dependencies are pinned to current stable registry versions
as checked on October6,2026. TypeScript7 provides `tsc`; the official TypeScript6
compatibility API is installed under the `typescript` alias for Next/ESLint integrations.
ESLint10 uses the official compatibility adapter for React/import/accessibility plugins;
its full rule set runs with zero-warning enforcement. Tests use React DOM and Testing
Library, replacing the deprecated React test renderer.

Development and builds use Next16's supported Webpack mode. Turbopack's CSS subprocess
cannot bind in this restricted workspace, and the isolated test app shares dependencies
through an external symlink. No application validation is skipped.

The production dependency audit is clean. The full audit currently reports five related
development-only findings from the single unpatched `braces` advisory
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), reached through
Next's ESLint plugin. Do not run lint on attacker-supplied glob patterns. No audit warning
is suppressed; update the lint chain when upstream publishes a fix. Details and commands
are recorded in `.forge/dependency-upgrade.md`.

### Admin reports and appearance

Admins can open **Admin → Users & accounts** to browse paginated accounts, email/confirmation status, sign-in methods, last sign-in dates and player statistics. Search and status filters apply to the current page. Account details are checked server-side against the current database role.

**Admin → Reports** provides UTC7/30/90-day online usage metrics and a player-report inbox. Player results count each participant separately; finished-room counts refer to rooms created in the selected period. Local pass-and-play activity is not collected. Signed-in players can use **Report an issue**; admins can resolve and reopen reports. Reports are private, with an atomic limit of five submissions per account per hour.

Before deploying this version to another environment, apply `supabase/migrations/20261006232153_player_reports.sql` atomically after the earlier migrations. It adds a private report table, server-only submission/analytics functions, and reporting indexes. No existing account or game records are modified. Rollback: revert the app first; keep report data, or export it before removing the new table/functions. The additive objects can safely remain with the older app.

**Themes** offers Game night, Daylight, Neon arcade and Ocean lounge. Choices persist on the current device and synchronize between its tabs. The library combines gameplay categories, curated audience picks, search and online/pass-and-play filters.
