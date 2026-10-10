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
