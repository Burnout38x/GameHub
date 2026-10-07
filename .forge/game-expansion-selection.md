# Independent game selection — October 6, 2026

## Decision

Select **Pocket Paradise** for single-player and **Market Day** for multiplayer. These are working titles for original games, not cleared brands. Build Pocket Paradise first; follow with Market Day. Research and selection only: no implementation or deployment is authorized by this recommendation.

I independently read the research dossier, inspected `src/lib/game-library.ts` and `src/lib/local-games/catalog.ts`, and reopened the official Monopoly, Dorfromantik and Balatro sources. The present catalog has abundant word, trivia, prediction and conversation play, but no spatial builder or economic board game. This is the decisive advantage of this pairing. Agreement with the researcher follows that comparison, not acceptance of their provisional favorites.

## Comparative scoring

Scores are product judgments, not measured player preferences or forecasts. Scale: 1 weak, 5 strong; engineering scores reward lower implementation/balancing burden. Weights prioritize adding a new kind of play to this specific catalog. Social value means conversation, cooperation or shareable outcomes; solo candidates naturally score lower. Choose within the solo and multiplayer slots, not simply the two highest totals.

| Concept | Audience fit 20% | New playstyle 25% | Mobile 15% | Replay 15% | Social 10% | Engineering 10% | Useful 3D 5% | Total /100 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Pocket Paradise — solo | 5 | 5 | 5 | 4 | 2 | 4 | 5 | **89** |
| Market Day — multiplayer | 4 | 5 | 4 | 4 | 5 | 2 | 5 | **84** |
| Combo Kitchen — solo | 4 | 5 | 4 | 5 | 3 | 3 | 2 | 82 |
| Same Signal — multiplayer | 5 | 1 | 5 | 4 | 5 | 5 | 1 | 73 |
| Doodle Relay — multiplayer | 3 | 4 | 3 | 4 | 5 | 3 | 1 | 70 |
| Camp Together — multiplayer | 3 | 5 | 1 | 4 | 5 | 1 | 5 | 69 |
| Crowd Compass — multiplayer | 2 | 1 | 5 | 3 | 4 | 5 | 1 | 56 |

Market Day wins despite the largest rules/state burden among the board/puzzle candidates. A selector optimizing purely for shortest implementation would choose Same Signal; the user's request instead emphasizes new games and attractive 3D, including a property board game. Both assumptions and the tradeoff should remain visible.

## 1. Pocket Paradise — selected solo game

**Proposal:** one player, an 8–12 minute target session, 20 placements. A cozy miniature neighborhood grows from a compact square grid. Each turn, choose one of three plots—home, food stall, park or path—preview the resulting points and resident requests, then confirm placement. For example, a home wants a nearby park while a stall benefits from connected paths. Requests change between seeded runs. The finished neighborhood becomes a shareable postcard.

**Why this wins:** intuitive tap-to-place controls, meaningful choices without twitch reflexes, a genuinely usable solo experience, and visible 3D rewards on every turn. [Dorfromantik's developer-published Steam page](https://store.steampowered.com/app/1455840/Dorfromantik/) establishes the relaxing spatial-building reference; our design uses its own square plots, adjacency rules, requests, art and scoring. The reference supports a category choice, not proof that this proposed game will succeed.

**3D direction:** warm low-poly buildings, trees and street details; fixed isometric camera, gentle placement animation, and optional restrained ambient motion. Selection, scoring previews and all actions stay in clear rounded UI panels. A fully playable flat board and reduced-motion setting are essential alternatives. Readability and touch targets take priority over camera tricks.

**MVP:** one biome, four plot families, a small original request set, seeded standard runs, relaxed practice, local save/resume, undo before confirmation, clear score breakdown and final postcard. Daily seed can reuse the deterministic engine; a public leaderboard is deferred until server-side replay verification exists. No bots, persistent city economy, endless progression, asset marketplace or mandatory account for a practice run.

**Main risk:** a pretty placement toy without interesting decisions. Validate the rules in a simple flat prototype before producing extensive 3D assets. Show players why a placement scores; test for a dominant strategy and unusable generated offers. Session length and replay appeal remain targets requiring playtesting.

## 2. Market Day — selected multiplayer game

**Proposal:** 2–4 players in the first release, 20–30 minute target session, ten rounds. An original market-town property game: move between districts, acquire and improve stalls, buy supplies, negotiate trades and fulfill commissions. Cash enables actions; completed commissions and reputation determine prosperity alongside a capped contribution from remaining cash. No player elimination. Offer a bank exchange so two-player games do not depend on an opponent agreeing to every trade.

**Turn loop:** reveal movement options → choose a destination → take one business action → optionally propose one bounded trade → resolve income/commission progress. At round end, reveal a shared market event. Deals specify both sides, require acceptance, and expire if not accepted; no open-ended negotiation screen. Prototype movement choice versus dice-assisted movement rather than committing to random landing as the entire strategy.

**Why this wins:** directly addresses the requested Monopoly-like experience and adds tangible places, ownership and negotiation to a catalog currently dominated by prompts and puzzles. [Marmalade's official Monopoly app](https://www.marmaladegamestudio.com/games/monopoly) demonstrates family/friend online play, offline AI and shorter-play options. It does not establish that our rules will be balanced. Four players is the initial ceiling instead of the dossier's six, to reduce downtime and make phone layouts credible.

**3D direction:** a small toy-like market diorama with distinct original districts, cheerful shop upgrades and expressive tokens. Optional Naija-inspired street-market details can give it a local identity without relying on stereotypes. Use an original branching board, own property names, event content, currency art and visual identity. Avoid recreating Monopoly's board, characters or card designs. Animation presents an already-decided action; physics never decides authoritative outcomes.

**MVP:** one board, one ruleset, 2–4 human players, room codes, a tutorial, bounded trade offers, reconnect/resume, results and rematch. An action log explains each balance change. The server validates commands and resolves movement, purchases, trades and payouts atomically; retrying a command must not spend or award twice. Bot opponents, six-player support, auctions, mortgages and multiple maps are later features. This satisfies the requested multiplayer slot independently of the separate solo game.

**Main risk:** runaway economics and long waits, compounded by reconnect/concurrent-action bugs. Cap the match length; keep cash from compounding without a counterweight; surface expected outcomes before confirmation. Explicitly test two-player balance, refused trades, stale offers, simultaneous acceptance, disconnects and duplicate commands. The existing Supabase stack is a basis for turn-based play, not evidence these new transactional rules already exist.

## Why the alternatives lost

- **Combo Kitchen:** strongest solo challenger and potentially deeper replay, but modifier interactions require more balancing and explanation. Less aligned with the requested attractive 3D experience. [Playstack's March 2025 award announcement](https://www.playstack.com/news/balatro-gdc-awards-2025/) substantiates Balatro's acclaim, not demand for our ingredient adaptation.
- **Same Signal:** excellent couples fit and cheaper to build, but overlaps the existing partner-prediction and conversation catalog. Best fallback only if lowering scope becomes the priority.
- **Doodle Relay:** excellent group laughs, but weaker at two players, plus touch drawing/accessibility and user-content moderation costs.
- **Crowd Compass:** another answer/prediction experience and weak for couples at two; not enough catalog expansion.
- **Camp Together:** appealing 3D social moments, but real-time physics, mobile controls and authoritative simulation make it a separate class of engineering project. Poor first expansion for this turn-based app.

## Evidence confidence and build order

The dossier contains established product formats, dated awards, attributed publisher commercial claims and one historical Reddit engagement signal. It did **not** verify an October 2026 TikTok or social trending ranking. Do not market the selections as “currently viral.” Popularity of Monopoly GO! in particular cannot be transferred to a classic trading game: they are different gameplay propositions.

1. Validate Pocket Paradise's flat-board rules and scoring, then add lightweight 3D, saved runs and accessibility. It gives immediate solo value while establishing mobile 3D conventions.
2. Prototype Market Day's economy and two-/four-player turns using a plain board. Resolve fun, downtime and fairness before detailed art.
3. Implement authoritative multiplayer commands and reconnects, then add its diorama and full phone/browser checks. Reuse presentation assets where appropriate, not either game's rules engine.

No calendar estimate is implied. Advancement depends on playable evidence. Neither proposed game has yet been built, user-tested or proven popular.
