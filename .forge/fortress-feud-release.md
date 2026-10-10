# Fortress Feud + combined Truth or Dare — release evidence

## Scope
- New game **Fortress Feud** (`battle` type): real-time 3-lane fortress battle. Gold builds defenses on six plots, elixir deploys troops/Meteor. Solo campaign (12 missions, stars, ranks), quick battles vs 5 Machine levels, online 1v1 duel and 2-player co-op vs the Machine.
- **Truth or Dare** and **Truth or Dare: After Dark** merged into one game: turn player picks Truth (+1) or Dare (+2); room "vibe" chooses Classic (everyone), After Dark (18+) or Mixed. After Dark game deactivated; its 40 cards moved into the combined deck; 16 new classic cards added (81 total).

## Design decisions
- Deterministic 10 Hz simulation (`src/lib/fortress`) shared by browsers and the server. No Math.random/Date/trig inside the sim; seeded Mulberry32 RNG; integer economy (milli-elixir).
- Online lockstep: the server stamps each order `COMMAND_DELAY_TICKS` (1.2 s) after its own clock, validates it by replaying the log, and appends it under the room lock with version fencing. Clients poll the log (650 ms) and roll back to a snapshot if an order lands late. The server alone settles results (`finish_battle_room`), so browsers never write scores.
- Campaign victories are saved only after `verifyMissionRun` replays the submitted seed + order log; points reward new stars (anti-farming), with a 30 saves/hour limit.
- Co-op losses record no winner (explicit winners in `finish_battle_room`). Leaving a duel concedes it.
- Release order: deploy code first (new code is compatible with the old database), then apply the migration (old code would label the After Dark deck as "Hard"), then activate `fortress-feud` after a live check.

## Verification (isolated local Supabase + production build at 127.0.0.1:3199)
- `npm run lint`: clean. `npm test`: 135/135 pass (121 existing + 14 new in `tests/fortress.test.ts`, `tests/truth-or-dare.test.ts`). `npm run build`: pass.
- Migration applied to a fresh local stack built from `schema.sql` + all migrations + production-shaped Truth or Dare data; re-run is a no-op. Result: 41 classic + 40 After Dark cards, After Dark game inactive, `fortress-feud` staged inactive, invitation caps patched, `authenticated` has no access to the new table/functions.
- `scripts/test-fortress-browser.mjs` (Chromium, throwaway accounts, cleaned up): 27 checks, 0 axe WCAG 2.2 AA violations, 0 horizontal overflow, 0 page errors across 320×640, 390×844 and 1440×900:
  - hub, briefing, battle controls (card → lane, keyboard 1–7 + A/S/D, canvas tap and plot list builds, pause/resume, retreat), idle-player defeat card;
  - online duel: orders from both phones reach the server log, the guest sees the host's troops, an invalid order is refused (409), forfeit records the guest's win in `match_history`;
  - online co-op: the Machine attacks both players; the server settles after the buzzer;
  - Truth or Dare: Classic is the default vibe, watcher sees "is choosing…", Dare reveals a dare card to both players and scores 2.
- WebKit iPhone 13 emulation: tap deploy and tap build work, no errors, no overflow.
- Balance probe (bot vs Machine, see commit history): matches run the full three minutes with keep damage on both sides; idle players lose; later missions are harder.

## Independent review (security + engine/sync), all addressed before release
- Draws no longer count as wins for both players; walking out in the first 30 s abandons without a result; a battle already decided keeps its real result when someone leaves.
- Repeat campaign submissions without new stars earn no points/games; Truth or Dare picks read the deck by game (no long `id in (…)` URLs); pick route requires same-origin and tolerates a null body.
- Online client waits for a server clock sample before simulating, rewinds if it ran ahead, lets rollbacks change a predicted ending, re-syncs immediately when a tab becomes visible, caps catch-up per frame, and sends one finish request at a time; hotkeys pause behind dialogs.
- Migration refuses to run while any Truth or Dare room is open and fails loudly if the invitation-cap patch would be a no-op.
- Reviewer replay scripts confirmed identical outcomes for live play vs server replay across all 12 missions and random duel/co-op logs. Worst-case server replay of a full battle: ~2–4 ms.

## Production release (2026-10-10)
- `main` fast-forwarded to 46e0a70; Vercel Production deployment succeeded; `/play/fortress-feud` returns 200.
- Migration applied to production after the deploy (no open Truth or Dare rooms). Readback: Truth or Dare has 41 classic + 40 After Dark cards; After Dark game inactive; `fortress-feud` activated (sort order 5, first on the home page).
- Live public smoke at 390 and 1440 px (no accounts created): library search shows Fortress Feud in solo and online sections, the home page features it, a campaign battle starts and deploys troops, 0 page errors, 0 horizontal overflow.
- Supabase security advisor: only new item is the expected INFO "RLS enabled, no policy" on server-only `fortress_campaign`.

# Fortress Feud v2 — physics siege rewrite (2026-10-10)

## Why
Player feedback: the lane battler felt unrealistic; they wanted the classic "drag back, aim and launch at the other fortress" game, with more detail.

## What changed
- New engine (`src/lib/fortress`): planck.js 1.5.0 rigid-body physics. Fortresses are timber, stone, steel and glass blocks guarding a King and two Knights. Damage comes from contact impulses (rubble does 30% of a projectile's damage), plus explosions, cluster splits, fire that burns timber for three turns, and Bunker Busters that pierce.
- Economy kept from v1: gold builds the fortress (three layouts × three materials per part) and buys ammo. Income is +30 per turn, 10% of the damage dealt, and 80 per royal knocked out. Elixir +1 per turn (max 6) buys Barrage (3) and Titan Boulder (5). Patch up costs 100.
- Win by knocking out every enemy royal. Otherwise, after 10 shots each, the higher score wins (royal health ×2 + standing walls).
- Modes: a 12-mission campaign (stars: win · no royal lost · within par), quick battles vs Machine levels 1–5, online duel, and online co-op (shared fortress; the Machine fires after each human).
- Online: the server simulates every shot and stores a keyframe replay that both phones play back (about 15–40 KB, served only by the battle poll and stripped from room snapshots). Designs stay hidden during the build phase; build cost is enforced on the server. Turn timer is 45 s; the Machine fires through `advance` after the last shot lands. Results go through `finish_battle_room` under version fencing.
- Anti-farming: only players who really fired earn points. A duel has a winner only once both sides have fired, and a forfeit counts only after both have fired.
- Campaign saves are trust-limited (browser physics can't be replayed exactly on the server): reports must be self-consistent (3 stars need shots ≤ par), and points are paid only for new stars, with an hourly limit (unchanged RPC). The `best_seconds` column now stores the fewest shots.
- No database migration was needed. There were no Fortress Feud rooms in production at release time.

## Verification
- `npm run lint` clean; `npm test` 137/137 (13 Fortress tests); `npm run build` passes.
- Balance probes:
  - Machine vs Machine battles at equal levels last 6–10 shots each, and higher levels win more.
  - Early missions win for a moderate player (M1 5/6, M2 5/6, M4 6/6); later missions ramp up.
  - Machine planning takes up to ~300 ms on the server.
- Browser QA against an isolated local Supabase stack and a production build (`scripts/test-fortress-browser.mjs`): 41 checks, 0 axe WCAG 2.2 AA violations, 0 horizontal overflow, 0 page errors.
  - Viewports: 390×844, 1440×900, 320×640 and 844×390 landscape.
  - Solo: build cost, keyboard and drag-to-aim launches, the Machine replying, and a full battle reaching the result card.
  - Online duel: hidden build, the replay arriving on the other phone, an out-of-turn shot refused (409), and a forfeit recording the right winner in `match_history`.
  - Online co-op: the server fires for the Machine; leaving closes the room.
  - Truth or Dare regression.
- WebKit iPhone 13 emulation: touch drag-to-launch, the replay and the Machine's reply, no errors.
- Independent review found 2 high, 2 medium and 3 low issues (win farming through skips and forfeits, a missed replay after a skip, designs leaking during build, overlapping replays, client-only cost check, the Machine pausing after a skip, end-screen flicker). All were fixed and are covered by tests and QA.

## v2 production release (2026-10-10)
- `main` fast-forwarded to ee87d41. Vercel Production was live about 75 s after the push, and `/play/fortress-feud` returns 200.
- Migration `fortress_feud_siege` (library description) was applied after the deploy. Readback confirms the new description, and `fortress-feud` is still active.
- Live public smoke test (Chrome at 390×844, 1440×900 and 844×390; no accounts created): quick battle → build → drag-launch → a hit topples the enemy keep → the Machine replies. 0 page errors, 0 horizontal overflow.
