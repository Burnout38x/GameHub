# Pocket Paradise: opening-day charter

## Why this is a different game

The old board rewarded unrelated pairs and praised every filled map. The new board has a shared dependency: gate → path network → happy homes → open food stalls. A road takes up a building plot, a park takes up a road plot, and the most valuable stall locations must touch both infrastructure and residents. Building at the entrance can permanently block the charter; the preview explicitly warns about that choice.

The player chooses one of three deliveries, previews an empty plot, then confirms. Twenty placements end the challenge. A one-delivery forecast supports planning. There is no timer, currency, reroll, additional resource, or dependence on account access to play.

## Exact rules, version 2

The board is 5 columns by 4 rows. Neighbors share an edge; there is no wrap or diagonal adjacency. The west entrance enters row 2, column 1 (zero-based cell 5). The gate is drawn outside the board.

- A path is connected only if an unbroken orthogonal chain of paths reaches cell 5, which must itself contain a path. Each connected path scores 1.
- A happy home touches a connected path **and** a park. Each happy home scores 6, once, even if it has several qualifying neighbors.
- An open stall touches a connected path **and** a happy home. Each open stall scores 5, once.
- Each orthogonal park–park pair scores 1, counted once.
- Other homes, stalls and paths score zero. Infrastructure can activate several pre-existing buildings in one move; preview and scoring recompute the entire dependency graph.

The opening charter requires **4 happy homes, 2 open stalls and 36 points**. All three are mandatory. Completion is a finished attempt, not an automatic victory. After placement 20:

| Stamp | Requirements in addition to the home/stall charter |
|---|---|
| Bronze | 36 points |
| Silver | 46 points |
| Gold | 56 points |

An unfinished board shows medal *pace*, never an awarded stamp. Failed attempts show **Opening delayed**, unmet quantities and a gate/service explanation. Successful attempts name the earned tier. All attempts can download their actual miniature town; only successes get the earned medal stamp. SVG postcards contain the score, home/stall/path counts, challenge seed, mode and rules version. Retry preserves the exact seed and rule version; account deduplication preserves the first recorded result.

## Meaningful choices and boundaries

A home needs two different neighbors. A stall needs an access neighbor and a happy residential neighbor. Filling a high-access corner with a stall can prevent fitting the park that would serve two homes. Placing a disconnected road is a legitimate future investment but earns nothing until the bridge reaches the gate. Closing a gap can activate a whole neighborhood.

The board draws connected road segments and marks working homes/stalls/paths with a check. A preview temporarily shows the prospective network, then reports newly connected paths, happy homes and stalls before the point delta is committed. An unserved placement explains that it still needs neighbors. Context changes with the selected delivery. A full scoring breakdown and all three medal thresholds stay available during play.

The geometry is intentionally fixed for this revision. A learned layout is useful across seeds. This is a spatial planning puzzle with varied delivery pressure, not procedural terrain; the simulation does not claim every seed requires a different optimal shape.

## Determinism and compatibility

The serialized schema stays `version: 1`. New runs additionally carry `rulesVersion: 2`. Missing `rulesVersion` means the existing classic rule set, original offers and original scoring. New creation in the component explicitly requests rules 2; library defaults remain 1 for existing consumers.

`createPocketRun`, `replayPocketRun`, `pocketOffers` and `scorePocketBoard` accept an optional final `1 | 2` rule-version argument. `placePocketTile` uses the run's version. Save validation reconstructs boards from moves, rejects unsupported versions and never trusts supplied board/score fields. A restored classic run displays a classic-rules notice and can finish normally. Its data is not silently upgraded.

The FNV hash's lowest two bits produced only four delivery sequences in classic mode. Modern offers use a deterministic two-stage 32-bit avalanche before selecting the omitted tile. Tests observe 100 distinct full sequences for seeds `0` through `99`; classic delivery sequences remain unchanged. Replaying a v2 seed always produces the same offers and board.

POST `/api/pocket-paradise` sends `rulesVersion: run.rulesVersion ?? 1`. The server must validate 1/2, reconstruct using that version, compute the score/outcome itself, and namespace modern idempotency keys without changing existing keys. Root implementation owns this API integration. Account writes retain stale-response protection, authenticated-save retry, and local preservation on errors. Starting another game during an unfinished run requires an explicit confirmation before replacing the browser save.

## Strategy and calibration evidence

Tests are in `tests/pocket-redesign.test.ts`. The bounded simulation evaluates `simulation-0` through `simulation-199`, twenty legal offered moves per seed. It performs no unbounded search during gameplay. Its planned policy uses a spatial blueprint and only the current delivery plus the same one-turn forecast shown to the player. It places whichever still-needed tile has the largest outstanding count, resolving ties using that forecast; a fallback greedily scores any remaining offered move. The baseline greedily maximizes immediate total without charter knowledge. A deterministic random baseline chooses an empty plot and one of the current offers.

**Final measurements use the corrected, diverse v2 offer generator:**

| Policy | Charter successes / 200 | Gold / 200 | Minimum | Median | Maximum | Mean |
|---|---:|---:|---:|---:|---:|---:|
| Spatial plan + visible forecast | 200 | 198 | 38 | 64 | 64 | 63.785 |
| Highest immediate score | 9 | 0 | 15 | 39 | 52 | 39.33 |
| Random legal moves | 0 | 0 | 0 | 3 | 24 | 3.89 |

A bounded offline candidate search (120 restarts × 1,800 single-tile proposals, annealed score with charter progress weighting) found this 64-point board, with 7 happy homes, 3 open stalls, 7 connected paths and 3 parks:

```text
stall  home  park  home  stall
path   path  home  path  path
home   path  path  path  home
park   home  stall home  park
```

This supported a gold threshold of 56 with room for imperfect choices, silver at 46, and a basic charter at 36. These thresholds distinguish working-but-incomplete plans from efficient towns; they are not a claim about human difficulty. Altering cell 12 from path to stall creates a distinct **37-point bronze** layout with 4 happy homes and 2 open stalls. Altering cells 0 and 1 to home and stall creates a **53-point silver** layout. Tests construct each through real offers on seed `pocket-medals`, not direct board injection alone. All 200 planned simulations replay identically from their histories. This sample establishes attainable goals for those seeds, not a proof over all possible seed strings.

Coverage also includes: disconnected and diagonal roads, exact gate placement, late bridge activation, home prerequisites, stall prerequisites, a mutually exclusive garden/road plot, high-score charter failure, scoring totals, duplicate move rejection, twenty-move limit, classic save restoration and score retention, forged save boards, unsupported versions, and delivery diversity. Fifteen Pocket tests pass, including all six unchanged legacy tests. Targeted ESLint and full `tsc --noEmit` pass.

## Presentation and motion

The self-contained forest canvas gives readable text in all site themes. The town occupies the main column, with an upright map rather than a rotated touch target. On mobile, the charter, board, offers and build controls form one column; large explanatory notebook copy gives way to contextual help. Entry instructions exist in text and accessible cell labels as well as the gate art. Connected roads are drawn between neighboring tiles. Original inline SVG miniatures appear both on the board and postcard.

All movement is finite CSS transform/opacity work: a new building falls a short distance and settles; a newly activated service check expands briefly; an earned stamp settles onto the result. Preview pieces are translucent and stationary. There are no frame loops, perpetual particles, canvas rendering, new dependencies, or autonomous background animation. `prefers-reduced-motion` disables these effects. Flat-piece mode removes piece shadows/settling as an additional visual preference.

Browser playthrough and screen-size review are coordinated by the root/independent reviewer; this document's automated checks do not stand in for those visual checks.
