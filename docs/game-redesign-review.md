# Independent game design review

Reviewed 2026-10-07 against `.forge/anchor.md`, both current engines, both game components, their styles, and the Pocket completion API. This is a design proposal, not a claim that proposed numerical values are balanced.

## Verdict

Both games have validated inputs and functioning interfaces, but their decisions are weaker than their presentation promises. New artwork alone cannot correct that. Each game needs one understandable objective, scarce opportunities, consequences visible before committing, and an ending that evaluates the player's choices.

## Pocket Paradise: a town must work

### Current weaknesses

- Filling all 20 cells is inevitable. Every completed board receives “A little paradise,” regardless of score or requests. There is no authored success criterion, failure, or reason to improve.
- Homes only care about parks; stalls only care about paths. The board consists of two independent adjacency puzzles. Paths need not connect to anything. An isolated food stall is mechanically as useful as one in a functioning town.
- Requiring five of one tile and three of everything is inventory counting. It does little to create an interesting spatial conflict.
- Immediate score previews encourage greedy placement because long-term needs and blocked opportunities are not represented.
- The dimensional transformation reduces usable board space while the HUD communicates only counts. Buildings look like pieces, but they do not visibly become connected, staffed, or inhabited.

### Recommended coherent design

**Premise:** Build a neighborhood that earns its opening-day charter in 20 placements. One shared daily blueprint provides a fair solo challenge; standard play changes the offer sequence. Keep this solo rather than adding a superficial multiplayer mode.

**Central dependency:** Roads connect to the town entrance; buildings need access; residents need services. All four existing tiles now participate in one system.

1. Put a visible entrance outside a fixed board edge, such as the left side of cell 10. A road is connected when an orthogonal road chain reaches that entrance. A building has access when it touches a connected road. The entrance is a landmark, not an extra tile the player must discover.
2. A happy home has access and touches a park. A working stall has access and touches at least one happy home. Each happy home contributes 4 points; each working stall contributes 3, plus 1 per adjacent happy home capped at 2. No repeated reward for redundant road edges.
3. Use a single opening charter with three visible requirements, initially: 5 happy homes, 2 working stalls, and 3 parks. Require the whole charter to pass; score improves the medal after passing. Define silver/gold thresholds from seeded simulations, rather than choosing arbitrary high numbers and assuming they are reachable.
4. At the end, show “Charter earned” or “Opening delayed,” with the exact unmet requirements. Award a bronze/silver/gold postcard stamp only on success. Practice can explain the same outcome without account rewards.
5. Keep three tile offers, but inspect offer sequences across representative seeds for enough required pieces. Road access makes roads mandatory infrastructure; never produce an opening where the player cannot obtain a road for several turns without explaining future offers. A one-turn forecast makes planning fair without introducing currencies or rerolls.

**Meaningful tradeoff:** A road uses scarce land but opens several plots. A park can serve multiple homes, but homes must also reach a road. A stall consumes a useful serviced plot and depends on resident placement. Optimizing one relation can block another. Filling the board is no longer synonymous with winning.

**Presentation:** Show the town gate and physically connected road segments; dim disconnected buildings; put a readable happy/access/service marker on pieces. Placement preview should say “Connects 2 homes; 1 becomes happy” before its point delta. Show charter progress next to the board throughout play. On phones, prioritize board, compact charter HUD, and offer tray rather than a scroll-separated instruction form. The gate must remain visible in both board modes.

**Risks to challenge:** The proposed rules can become one dominant grid pattern. Test several successful layouts and offer sequences. A high score with a failed charter must never look like a win. Charter requirements must be individually and jointly feasible with only 20 plots. Keep scores and account completion separate: losing a finished challenge is still a completion, but not a victory.

## Market Day: race for a finite market

### Current weaknesses

- Restock then commission can be repeated anywhere: two business actions produce 5 points and net +2 coins before passive income. Owning stalls is unnecessary for this engine. Three baseline coins every round means money scarcity quickly disappears.
- Savings stop scoring at 30 coins. Additional income and late-game trades frequently have no meaningful marginal value. The bank exchange is much weaker than commissions except for narrow liquidity situations.
- District names change purchase prices but confer no gameplay effect. More expensive districts have the same income, level score, and commission access as cheap districts.
- Players compete mainly for generic property, while commissions are inexhaustible and identical. All players value identical supplies similarly, so negotiated trades lack natural complementary needs.
- The mandatory move/business/trade click sequence adds time even when neither movement nor trading changes the player's plan. Events are shown only after resolution, making them poor planning tools.
- MarketPlay says the market is finished but provides no dedicated winner celebration or score explanation itself. A ring-movement rule displayed as a reflowing 3/4-column card grid obscures board geography.

### Recommended coherent design

**Premise:** Over ten market days, earn the most prestige by establishing district businesses and serving limited customers. The shared customer board is the core competition; trade supports it. Do not add an unrelated cooperative objective on top.

1. Each of the three districts has one visible customer order per day. Orders expire at day end, cannot be claimed twice, and name a supply cost, coin reward, and prestige reward. A player can fulfill the order only while visiting that district. Start with costs of 2–4 supplies and rewards of 3–6 prestige, then measure balance.
2. Make districts matter: owning two stalls in the same district earns one visible set bonus, not a compounding income multiplier. An owner serving that district receives a small fixed loyalty bonus. A visiting rival may still serve there after the ordinary visit fee, so early ownership cannot lock another player out of scoring.
3. Lower baseline income from 3 to 1 while retaining capped stall income. Buying early must compete with the supplies needed for immediate demand. Price differences require corresponding order quality or a uniform purchase price; merely assigning different district prices is not differentiation.
4. Keep one business action. Remove the generic unlimited commission from the new rules. Restock and rescue exchange remain available everywhere so a player cannot become permanently stuck. Rescue exchange gives liquidity at a clear opportunity cost and never outranks fulfilling a valid order when both are feasible.
5. Rotate the starting player each day. With scarce daily orders, a permanently first player gains repeated first access. Each player still receives exactly ten turns.
6. Show tomorrow's district demand and income/event forecast. A player can pursue an order now, buy toward a district set, or position for tomorrow. Routes should preview the available action and fee, not just highlight three generic places.
7. Preserve optional negotiated trades because district sets create different valuations for stalls. Show both parties the district-set change and resources remaining. An unanswered trade must remain cancellable by its sender. Do not make a trade necessary to win or to complete a turn.
8. Highest final prestige wins, with ties explicitly shared. End with winner names, personal rank, a breakdown of orders/stalls/sets/savings, and a concise reason for the result. Final order completion and all closing income must settle before determining winners.

**Meaningful tradeoff:** Claim today's high-value order before a rival, or buy an asset that supports later days. Pay a rival's fee to deny them demand, or choose a cheaper district. Trade a surplus stall for the last piece of a set, knowing it may also strengthen the other player. These are contextual decisions, not six interchangeable buttons.

**Presentation:** Use a readable market loop or district map with numbered route arrows that remain stable across breakpoints. Put three demand cards beside/above the board and display consumed cards as served, showing who won them. Use distinct player colors plus names/numbers; ownership and physical location are different markings. When another player acts, animate the claimed customer, acquired stall, or transferred coins briefly. The action panel should lead with location-specific opportunities, prices, net costs, and disabled reasons. Show the victory rule outside collapsed help.

**Risks to challenge:** Demand scarcity can overreward turn order; rotation and two-/four-player balance checks are mandatory. Three orders per day for four players deliberately leaves someone without one, but they must have productive investment/restock alternatives. Order rewards, sets and ownership must not compound into unavoidable runaway leadership. Savings should remain a minor endgame outlet, not the best repeated strategy.

## Review gates before accepting an implementation

- A first-time player can answer “What am I trying to achieve?” and “Why would I pick this action?” from the active screen.
- Pocket has a deliberate successful run and a plausible failed run, with correctly different endings; disconnected road chains, multiple-service adjacency, and late reconnection behave consistently.
- Market has demonstrable contested orders, orders that disappear for the opponent, district-set changes after a trade, late-game liquidity decisions, and an explicit shared-tie outcome.
- Compare at least greedy immediate scoring, infrastructure/investment first, and objective-aware strategies across multiple seeds and player counts. Reject a build if an unthinking restock/fulfill loop wins almost everywhere or if buying every affordable stall dominates every other strategy. Report distributions, not one cherry-picked match.
- Check every day/turn boundary for equal turns, supply and coin conservation during trade, single order ownership, final scoring, and stale-command rejection.
- New rule versions must not silently reinterpret existing Pocket histories or Market rooms. Version new games; retain a clearly identified legacy route for in-progress saves/rooms or provide an explicit restart choice while preserving the old save.
- The server must replay the same Pocket rule version used by the client. Never trust client-submitted success, medal, or score. Completion statistics must not imply a victory on charter failure.
- Browser review must judge legibility and perceived cause/effect, not merely absence of overflow or successful clicks. Compare mobile and desktop full game flows, including losing and winning endings.

## Scope discipline

Choose these central systems before adding quests, currencies, unlock trees, random hazards, construction timers, more tile types, or pseudo-cooperative meters. Achievements should recognize actual accomplishments in the core rules. No production or database changes were made for this review.
