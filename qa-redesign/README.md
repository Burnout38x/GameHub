# Redesign acceptance

Independent QA for `.forge/anchor.md` and `docs/game-redesign-review.md`. Work is local only; isolated Supabase port 58321 and application port 3199 become test targets only after the root agent confirms readiness. No production writes. Existing `qa-workspace` evidence remains untouched.

Status: **independent rules, Chromium/WebKit presentation and real local backend acceptance completed.** See `final-independent-report.md`, `BUG-TRACE.md`, and the machine-readable summaries. The root owns final semantic smoke/release checks and production deployment. Proposed numbers in the initial review were recommendations; acceptance uses the final implemented rules.

| ID | Requirement | Acceptance evidence |
|---|---|---|
| P1 | A readable solo objective can succeed or fail | Full legal winning and losing runs; different outcome text and honest rewards |
| P2 | Infrastructure and adjacency create meaningful decisions | Exact before/after scores for disconnected buildings, late connection, shared services, and boundary cells |
| P3 | No trivial dominant placement policy | Fixed-seed comparison of random, immediate-greedy and objective-aware policies; report sample count and distributions |
| P4 | Forecasts, previews and saved runs are trustworthy | Preview equals committed consequence; reload equals replay; legacy save remains playable or explicitly preserved |
| M1 | Contracts are contested, location-sensitive opportunities | One player claims a shared contract; another can no longer claim it; later demand refresh is explicit |
| M2 | Position, property and resources have competing value | Legal matches comparing repeated delivery, investment-first and demand-aware policies with seat rotation |
| M3 | Turn economy is fair and finite | 2, 3 and 4 players each receive the advertised number of turns, including final round; trade response advances once |
| M4 | Trade and win logic remain authoritative | Assets conserved; sets recompute; stale/outsider requests rejected; final score, winner IDs and EndScreen agree |
| C1 | Old games retain their rules | Explicit legacy Pocket history and Market room fixtures replay/advance without silent conversion |
| C2 | Full server and UI result path works | Final API action commits scores, result and history once; result screen shows concrete breakdown and shared ties |
| U1 | Players can understand choices on mobile and desktop | First screen states objective; active screen shows progress, scarce demand, cost and consequence before committing |
| A1 | Movement represents committed actions | Token visibly travels from previous to authoritative destination; construction/rewards happen once per action |
| A2 | Motion is bounded and lightweight | Transform/opacity transitions or finite WAAPI; no idle frame loop, unbounded particles, or repeatedly animated unchanged polls |
| A3 | Motion cannot compromise correctness | Reduced motion, rapid actions, reconnect/visibility changes, resize and unmount settle to current state without blocking input |

## Evidence limits

Keep one small machine-readable summary per suite and a short human report. At most six curated screenshots: both games mobile/desktop, one meaningful success and one failure/result. Capture a short motion clip or sampled token positions only where a still cannot prove travel. Do not commit credentials, auth state, server logs with secrets, or hundreds of near-identical screenshots.
