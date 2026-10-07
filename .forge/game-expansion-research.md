# Game expansion research dossier

Research date: October 6, 2026. Researcher handoff for independent selection; no implementation, installation, production mutation, or push performed. Working titles below are proposals, not cleared brands. Proposed player counts and session lengths are design targets, not facts about reference games.

## Evidence boundaries

Sources establish demand for broad categories, not demand for an unbuilt GameHub title. Publisher commercial claims are attributed. No defensible current TikTok ranking was found; do not describe these as October 2026 social-media trends. One dated Reddit engagement signal is included and clearly separated from official evidence. All complexity judgments and original designs below are engineering/product inferences for the existing Next/React/Supabase app.

## Seven candidates

### 1. Market Day — original 3D property-and-trading board game

- Reference: [Marmalade's official MONOPOLY app](https://www.marmaladegamestudio.com/games/monopoly) supports offline AI, online friends, pass-and-play and a Quick Mode. Themed boards demonstrate the attractive miniature-board presentation the user requested.
- Demand: [Scopely reports MONOPOLY GO! passed $6 billion lifetime IAP revenue in 2025](https://www.scopely.com/en/news/sensor-tower-scopelys-monopoly-go-hit-6-billion-revenue-milestone-in-2025-in-record-time), explicitly based on Sensor Tower estimates. This proves commercial interest in tabletop-themed mobile games, not that a traditional property game or our concept will inherit that audience. MONOPOLY GO! is not the same gameplay proposition as classic real-time property trading.
- Original proposal: 2–6 players, 20–30 minutes, a colorful fictional market district. Travel between stalls, invest in shops, trade supplies, complete personal and community commissions. Fixed 10 rounds, score by prosperity/reputation plus cash; nobody eliminated by bankruptcy. Negotiated deals limited to one offer/counteroffer per turn, with explicit acceptance and expiry. Optional solo against deterministic bots later.
- Fit: excellent friends/family spectacle and direct response to user; works for couples at two players, but trading is richer at three or more. Must avoid punitive long downtime.
- Complexity: high rules/state complexity, medium 3D complexity. Use server-authoritative board/economy state, atomic trades, server RNG and versioned commands; 3D is presentation only. A fixed isometric low-poly scene is much safer than physics dice deciding outcomes. Provide accessible 2D board and action list. Bots can use weighted heuristics, no language-model service required.
- Originality: original map topology, economy, scoring, event text, assets and names. Do not reproduce Monopoly board layout, properties, mascots, cards or trade dress. Distinct round-limited commission/reputation system strengthens independent identity. Not legal clearance.
- Selection position: serious multiplayer flagship; most expensive feasible choice here, but meaningfully expands the catalog beyond prompt games.

### 2. Pocket Paradise — cozy solo spatial-building puzzle

- Reference: [Toukana's official Dorfromantik material](https://www.toukana.com/) describes relaxing strategy/puzzle building; its [official Steam listing](https://store.steampowered.com/app/1455840/Dorfromantik/) describes landscape tile placement and high-score planning. [Official tabletop page](https://www.toukana.com/dorfromantik/boardgames) documents the 2023 Spiel des Jahres win for its board-game adaptation and solo/cooperative formats. Award is historical, not a current trend claim.
- Original proposal: solo, 8–12 minutes. Build a small island neighborhood from three offered square plots, balancing homes, food stalls, parks and paths against changing resident requests. Each placement visibly grows a miniature world. Finite 20-placement run, undo before confirmation, daily seed plus relaxed mode. Different geometry, scoring and objectives from the reference.
- Fit: approachable, family-safe, no reading-speed or reaction-time pressure. A compelling reason to open GameHub without waiting for a room. Friends can compare the same daily seed without requiring a second multiplayer game.
- Complexity: medium. Deterministic board/scoring engine, save/resume and seed replay; optional lightweight 3D tiles with 2D fallback. No bots needed and no high-frequency network synchronization. Server verification is needed if daily scores join a competitive leaderboard; do not trust submitted totals.
- Originality: original art, plot shapes, economy, objective deck and progression; avoid copying Dorfromantik's hex-edge terrain system/art style exactly.
- Selection position: strongest approachable solo fit, pairs naturally with Market Day and can share some original 3D environmental assets without sharing rules.

### 3. Combo Kitchen — solo score-building card puzzle

- Reference: [Balatro official site](https://www.playbalatro.com/) explains combination-driven deckbuilding. [Publisher's March 20, 2025 announcement](https://www.playstack.com/news/balatro-gdc-awards-2025/) records Game of the Year, Best Debut, Best Design and Innovation awards at GDC. [Publisher news index](https://www.playstack.com/news) records over five million copies, but its index does not provide a reliable date for that entry.
- Dated social evidence: [January 21, 2025 Reddit sales discussion](https://www.reddit.com/r/balatro/comments/1i6q0yn) had approximately 21,850 votes in the retrieved index. This is a historical engagement snapshot, neither verified unique players nor a present-day trend. Official awards provide stronger provenance than the social count.
- Original proposal: solo, 10–15 minutes. Combine ingredient cards to fulfill orders, choose one kitchen upgrade between rounds and pursue satisfying chain reactions. No poker suits, wagers or casino presentation; original ingredient relationships and objectives. Bots add little value.
- Fit: high replayability and shareable combo results; better for older children/adults than a purely casual conversation game. Tutorial and transparent score previews are necessary.
- Complexity: medium implementation, high balancing burden. Modifier ordering, infinite loops and score overflow require explicit limits and property tests. Mostly 2D card animations; 3D unnecessary.
- Originality: borrow the broad synergy-run structure, not Jokers, card effects, terminology, art or exact progression.
- Selection position: strong solo alternative if strategic depth beats the cozy 3D priority.

### 4. Same Signal — cooperative clue-and-scale game

- Reference: [CMYK's official Google Play listing](https://play.google.com/store/apps/details?id=com.PalmCourt.Wavelength&hl=en) describes Wavelength as cooperative, 2–10+ players and shows 1M+ downloads when retrieved. Cumulative store downloads are established interest, not current trending evidence. [Official app FAQ](https://www.wavelength.zone/app/faq) confirms its remote room model.
- Original proposal: 2–8 players, 8–12 minutes. A clue-giver places an everyday scenario on an original two-axis mood map; everyone privately predicts its location, then the group reveals disagreements. Cooperative score; curated family and couple prompt packs, no forced personal disclosure.
- Fit: excellent couples and mixed groups; low learning curve, strong conversations. No honest bot substitute for knowing your friend.
- Complexity: low–medium; private target/guesses, submission lock and reveal fit existing infrastructure. Rich animations rather than 3D. Number/label controls required alongside a draggable map for accessibility.
- Originality: different two-axis structure, scoring and original content; do not clone Wavelength's dial, target graphic or prompt library.
- Selection position: efficient addition but overlaps existing prediction/connection games, weaker catalog expansion than a board game.

### 5. Doodle Relay — draw-and-guess storytelling

- Reference: [The Op's official Telestrations page](https://theop.games/products/telestrations-12-player-2nd-edition) establishes family/friends drawing and guessing, simultaneous passing, 4–12 players, ages 10+, around 30 minutes. This validates format, not current popularity or a social trend.
- Original proposal: 3–8 players, 10–15 minutes. Original prompts become drawings and captions, ending in a comic-strip reveal. Optional collaborative two-player challenge would require separate design rather than claiming the large-group mode works unchanged.
- Fit: funny, highly shareable recaps, excellent friends/family; drawing motor demands can exclude some users, so offer stamp tools and adjustable timers.
- Complexity: medium–high; canvas/touch ergonomics, stroke persistence, hidden chain visibility, reconnects, moderation/storage and report flow. Do not stream every pointer movement through database writes; persist bounded stroke batches. No 3D benefit.
- Originality: own prompts, visual tools and reveal format; no licensed prompt decks/assets.
- Selection position: good later party release, weaker couples coverage and greater user-content moderation cost.

### 6. Crowd Compass — majority-answer party game

- Reference: [Big Potato's official Herd Mentality page](https://bigpotato.com/products/herd-mentality?variant=45969956995323) states 4–20 players, ages 10+, approximately 20 minutes; publisher claims 2.3M+ copies sold and a December 2024 Amazon category #1. Treat commercial statements as publisher claims; neither establishes a current social trend.
- Original proposal: 4–10 players, 8–12 minutes. Answer original everyday questions, then predict which answer cluster is largest; reward consensus plus occasional correctly predicted minority outcomes. No punitive player elimination.
- Fit: lively family/friend gathering; poor two-person and solo fit. Bots would fabricate human opinion and reduce the central value.
- Complexity: low engine complexity, medium content/answer-clustering burden. Prefer host-approved aliases or explicit voting over opaque automatic semantic judging. Existing prompt infrastructure reusable.
- Originality: original content and scoring; no cow theme or copied special-penalty rule.
- Selection position: fast but overlaps existing prediction/trivia and fails couples-at-two coverage.

### 7. Camp Together — cooperative 3D obstacle expedition

- Reference: [Landfall's official PEAK page](https://landfall.se/peak) documents online co-op/offline solo climbing, daily-changing map, stamina and helping teammates. We did not verify a primary dated sales/social trend number, so none is asserted.
- Original proposal: 2–4 players, 10–15 minutes. Cartoon friends transport picnic supplies over short cooperative obstacles; rescue and shared success, no horror. Original characters/world/mechanics.
- Fit: memorable shared failures/saves and attractive 3D; motor demands and mobile controls are less inclusive than board games. Solo bot companions would require substantial navigation/behavior work.
- Complexity: very high. Needs dedicated authoritative low-latency simulation, collision/prediction/reconciliation and mobile performance engineering; existing turn-based Supabase snapshots are not sufficient by themselves. Do not disguise this as a small React feature.
- Selection position: inspiration for later, not a sensible first expansion on current architecture.

## Cross-category evidence and selector guidance

[Board Game Arena's January 9, 2026 retrospective](https://en.boardgamearena.com/news?id=1025) reports 69M+ hours played in 2025 and 78M+ real-time completed tables, with 6 Nimmt!, Azul and Catan leading distinct players. These are platform-specific 2025 figures, supporting the viability of accessible strategic board formats; they do not establish an October 2026 ranking or demand for these proposed games.

Independent selector should choose exactly one solo/solo-with-bots winner and one multiplayer winner, balancing audience fit, distinct catalog value, original identity, mobile accessibility, buildability and demand evidence. Researcher's provisional pairing is Pocket Paradise plus Market Day: one calm instant solo loop and one social 3D flagship. Combo Kitchen is the main solo challenger; Same Signal is the lower-scope multiplayer challenger. Selector should independently test that judgment against actual catalog overlap and capacity. Session lengths, fairness and replayability need playable-prototype validation; no proposal has been user-tested.
