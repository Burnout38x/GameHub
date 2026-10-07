# Market Day engine — 2026-10-06

Implemented original pure, serializable ten-round 2–4 player market rules in `src/lib/market-day.ts`. Three deterministic visible routes, stall acquisition/upgrades, supply purchasing, commissions, independent bank exchange, optional bounded reciprocal trades, round income/events, no player elimination, and prosperity scores with capped cash contribution. Commands require exact state version and authenticated player identity supplied by the caller. Failed commands do not mutate state. The caller must persist under the existing room lock; the engine is not a concurrency primitive.

The 12 locations form an original three-district market. Everyone starts with 12 coins and 2 supplies. Each turn has move, business and optional trade phases. Accept/decline completes the proposing player's turn; sender can close unanswered offers, avoiding negotiation deadlocks. Trades permit at most 20 coins, 6 supplies and one owned stall on each side, require nonempty exchange, recheck assets/capacity on acceptance, and transfer atomically. Wallet cap 99, supplies cap 12. Match ends after every player's tenth turn.

Scoring: reputation + 3 per commission + 2 per owned stall level + min(10, floor(coins / 3)). Supplies have no final score. Every round pays 3 coins plus up to 6 from stall levels and one deterministic shared event, including the last round. Visiting another player's stall pays its level (1–3), bounded by available cash; insolvency never eliminates a player.

Validation:
- `node --import tsx --test tests/market-day.test.ts` → 10 passed, 0 failed (TSX_TSCONFIG_PATH=tsconfig.test.json).
- `npx eslint src/lib/market-day.ts tests/market-day.test.ts --max-warnings=0` → exit 0.
- `npx tsc --noEmit --pretty false` → exit 0.
- Full-match tests simulate 64 complete matches across 32 seeds each for 2 and 4 players (1,920 complete turns), checking all resource bounds, exact ten-round completion, finite scores and JSON serialization.
- Targeted tests cover malformed commands/assets, membership/turn/phase checks, stale/duplicate acceptance, ownership, affordability, supply capacity, non-elimination payments, refusal, sender expiry, asset conservation and score caps.

Integration contract: `createMarketDay(ids, seed)`, `marketDestinations(state)`, `applyMarketDay(state, actorId, command)`, `marketScores(state)`; exported `MarketState`, `MarketCommand`, `MarketAssets`, `MarketOffer`, `MarketPlayer`, `MARKET_BOARD`, `MARKET_EVENTS`, `MARKET_ROUNDS`. Engine throws user-readable `Error` on rejected commands. No database writes or deployment performed by this engine task. Economy is functionally tested, not validated by human balance playtesting.
