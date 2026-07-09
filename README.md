# 🎮 GameHub

Live multiplayer game nights for couples and friends — built for long-distance play.
Create a room, share a 6-letter code, and everyone plays on their own phone with scores,
turns and answers syncing in real time.

**Stack:** Next.js 14 (App Router, TypeScript, Tailwind) · Supabase (Postgres + Auth + Realtime) · Vercel

## Games included (10)

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
| 🔢 Number Guess Battle | Duel — secret is server-side (no cheating) | new |

Every quiz/prompt game supports **Easy / Hard / Mixed** difficulty, chosen when creating a room.

## Features

- **Accounts for everyone** — email + password. The **first user to register becomes admin** automatically.
- **Live rooms** — up to 10 players, realtime sync via Supabase Realtime with a polling fallback.
- **Meta layer** — global leaderboard, lifetime points, win streaks, 7 achievements, match history, rematch that pulls the whole room along.
- **Admin console** (`/admin`) — prompt counts per game/difficulty, add/edit/delete prompts, one-click difficulty retagging, **bulk JSON import**, create entirely new quiz/prompt games from the UI (no code), hide/show games, platform stats.
- **Server-authoritative** — all game mutations run through API routes with the service role; row-level security locks writes out of the browser entirely.
- Fully responsive (phones → desktop), dark glassy UI matching the original games.

## Setup (about 10 minutes)

### 1. Create the Supabase project (free)

1. Go to [supabase.com](https://supabase.com) → New project (free tier, no card needed).
2. In the dashboard: **SQL Editor → New query** → paste the whole of
   [`supabase/schema.sql`](supabase/schema.sql) → **Run**. This creates all tables,
   security policies, realtime publications, the 10 games and the achievements.
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
npm test           # game-logic unit tests
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
/rooms/new  → POST /api/rooms            → room row + 6-letter code
/room/CODE  → lobby (realtime presence)  → host POST /api/rooms/CODE/start
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
src/middleware.ts              session refresh + route protection
src/app/api/rooms/**           game engine (create/join/start/answer/advance/memory/guess)
src/lib/server/room-actions.ts shared engine helpers + game-finish logic
src/components/room/**         realtime UI: Lobby, Quiz, Prompt, Memory, Guess, EndScreen
src/app/admin/**               admin console (role-gated by RLS *and* the layout)
tests/game-logic.test.ts       unit tests (npm test)
```

## Notes & limits

- Supabase free tier: 500 MB database, 200 concurrent realtime connections — far more
  than a couple plus friends will ever use. Projects pause after 1 week of inactivity;
  just hit "Restore" in the dashboard (or play more often 😉).
- Quiz answers are checked server-side, but the prompt content (including the correct
  answer) is readable by signed-in clients — same trust level as the original HTML games.
  The Number Guess secret, by contrast, is fully server-side and uncheatable.
- Room codes avoid 0/O and 1/I so they're easy to read out over a call.
