# Brain Bowl, What Would You Do? and Whot! — release record

Request (2026-10-10): add 3–4 games:
- a challenging trivia competition with sections;
- a game of life-situation questions by topic (love, marriage, romance, war, apocalypse…) with a mixed option;
- fun competitive games that look as professionally made as Fortress Feud.

## What shipped

**Brain Bowl (`brain-bowl`, type `bowl`)**
- 256 questions in 8 sections: Science & Nature, History & Politics, Geography & World, Naija Know-How, Sports & Games, Film, Music & TV, Tech & Internet, Brain Teasers. Each section has 10 warm-up, 12 contender and 10 champion questions.
- Mixed Championship rotates through every section, and every match climbs from warm-up to champion.
- Scoring: 500 for a right answer, up to 500 more for speed, a streak bonus from three in a row, a double-points final question, and one 50/50 per match.
- Online rooms show a "get ready" splash, a countdown ring, answer splits, a fun fact and a live leaderboard.
- Same-device Buzzer Duel at `/games/local/brain-bowl`: 2 players, first to buzz answers, and a wrong answer lets the rival steal.

**What Would You Do? (`what-would-you-do`, type `dilemma`)**
- 160 situations in 8 topics: Love & Romance, Marriage & Commitment, Family & Friends, Money & Work, War & Survival, Apocalypse, Moral Grey Zone, Wild Cards. Mixed Bag deals the topics in turn.
- Read the Room: pick what you would do, then predict the room's favourite. A right prediction scores 100.
- Hot Seat (spotlight mode): one player answers, the rest guess them. A right guess scores 100; the hot seat scores 50 per friend who reads them. Rounds are evened out so everyone sits in the seat equally.
- The reveal shows who chose what and waits for everyone to tap Next (or 90 s), so the arguments can happen.
- Pass & play hot seat at `/games/local/what-would-you-do`.

**Whot! (`whot`, type `whot`)**
- The standard 54-card Nigerian deck, 5 cards each.
- Special cards: 1 Hold On, 2 Pick Two, 5 Pick Three, 8 Suspension, 14 General Market, 20 Whot (call a shape).
- When the market runs dry, the played pile is reshuffled once; after that, the hand ends in a tender count (stars count double).
- Online for 2–4 players: single hand, best of 3 or best of 5, with a 20/30/45 s turn timer. A player who runs out of time goes to market automatically.
- Solo at `/play/whot`: 1–3 Machine opponents (Aunty Bisi, Oga Emeka, Baba Sule) at three levels. Level 3 counts cards and sheds points before a tender.
- SVG cards in classic maroon-on-cream, a felt table, card-flight animations, synthesized sounds and a remembered mute.

## Architecture and safety
- The `LiveEngine` contract lives in `src/lib/live/types.ts`. All three games share one route, `/api/rooms/[code]/live`:
  - one 1 KB body cap;
  - same-origin check;
  - room lock;
  - version-fenced saves.
- Results are recorded by `finish_live_room` (migration `20261011000000_live_games.sql`): fenced on the room's state version and game type, with scores clamped to 0–1000.
- Phones only ever receive `engine.view(state, viewer)`:
  - **Trivia:** questions are hidden during the countdown and answers until the reveal.
  - **Whot:** other players' hands stay hidden until the hand ends.
  - **Dilemmas:** picks stay hidden until everyone has chosen.
- Browser QA confirms over the network that no answer and no other hand reaches a phone early.
- Leaving a match removes you from it (Whot cards go back under the market) and the game carries on. The state is saved before the player row is removed.
- Walking out when only one opponent is left concedes the match, once it is properly under way:
  - Bowl and Dilemma: from round 3.
  - Whot: from 6 moves or the second hand.
- The leaver gets a loss in `match_history`. An early exit just closes the room without stats.
- The same-device buzzer deals its deck through `/api/bowl/deck`, so the question bank is never bundled into page JavaScript.
  - The route requires a signed-in player.
  - Residual: a signed-in player could still learn answers by dealing many decks (or by watching reveals), as with the existing quiz games.
- Brain Bowl's leaderboard points are one per right answer, like the other quizzes, so farming is no more profitable there. The speed points decide the winner.
- Content: sub-agents drafted the questions, and an independent fact-checker reviewed all 256 (21 edits for overlaps and wording that could date; no flat-wrong answers).

## Verification
- `npm run lint` clean.
- `npm test`: 157/157, including 18 new live-game tests covering scoring, secrecy, timers, leavers, every Whot special card, the restock and tender, and 300 bot-vs-bot hands that conserve all 54 cards.
- `npm run build` passes.
- Browser QA (`scripts/test-live-games-browser.mjs`, run against an isolated local Supabase stack and a production build): 24 checks, 0 axe WCAG 2.2 AA violations, 0 overflow, 0 page errors.
  - full online matches of all three games between a 390 px phone and a 1440 px desktop, with results recorded in `match_history`;
  - solo Whot at 390, 1440 and 320;
  - buzzer duel and pass-and-play;
  - the light theme checked visually.
- Fortress Feud and Truth or Dare regression suite: 41 checks, 0 violations.
- Independent review found 1 high, 4 medium and 3 low issues, all fixed:
  - the deck route's open access;
  - a hot-seat stall when a non-seat player left mid-round (the seat is now fixed per round);
  - Whot winners pointing at the wrong seat after a leaver between hands;
  - an advance nudge that never retried after a server error;
  - rage-quitting a 2-player match recording nothing (now a forfeit);
  - leave deleting the player row before saving;
  - Whot move numbers repeating across hands;
  - a sound played inside a state updater.
- Re-verified afterwards: 160/160 tests, and browser QA with 25 checks (including the forfeit) and 0 violations.

## Production release (2026-10-10)
- Code went out first: `main` fast-forwarded to cf649f1, and Vercel reported success.
- Migration `live_games` was applied after the deploy. Readback:
  - `brain-bowl`, `what-would-you-do` and `whot` are active;
  - `finish_live_room` is not executable by browsers;
  - both social functions carry the 4-seat Whot cap.
- Live public smoke test (Chrome at 390×844 and 1440×900; no accounts created):
  - all three games are listed in the library;
  - solo Whot dealt, and moves were played against the Machine;
  - the dilemma pass-and-play hot seat starts;
  - `/api/bowl/deck` returns 401 when signed out;
  - 0 page errors, 0 horizontal overflow.
- Online matches were verified end to end on the isolated local stack: test identities only, never production accounts.
