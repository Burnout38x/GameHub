# Redesign bug trace

Reviewed the current uncommitted working-tree revision. The root agent will add the final code SHA after committing; no commit is claimed here. Findings below were independently discovered unless marked supplemental.

| ID | Initial defect and reproduction | Fix | Retest evidence | Status |
|---|---|---|---|---|
| RD-01 | Generate twenty Pocket offer turns for `seed-0` through `seed-99`; FNV low two bits produced only four distinct complete sequences. Daily variation was largely cosmetic. | v2 avalanche mixes all hash bits; v1 keeps old offers. | `engine-summary.json`: 100/100 distinct; 30 legal planned gold histories; v1 engine and real API compatibility. | Closed |
| RD-02 | With N Market players, stock was 2N and each could buy two only once per round. Nobody could deny a later buyer. | Stock is 2(N−1), refilled each round. | Seven-group engine suite tests legal depletion at 2/3/4 players; real 2P/4P sessions each observe denial and preserve state on rejected purchase. | Closed |
| RD-03 | Switch Pocket to light theme at 320/390/820/1440. Global header background made the cream title contrast 1.01:1, eyebrow 1.4:1 and subtitle 1.44:1. | Scoped local header background. | `pocket-axe.json` and WebKit equivalent: all 16 viewport/theme combinations clean; updated `pocket-light-320.png`. | Closed |
| RD-04 | Switch Market to light theme; active phase text #102c2a on #176860 measured 2.25:1 at all four widths. | Phase chip uses white foreground against the fixed dark green. | `market-browser-summary.json`: zero axe violations in all 16 viewport/theme combinations. | Closed |
| RD-05 | At 320px, successive legal Market moves to addresses 2,5,2,2 with pass/end place players 1,3,4 at Books. Fixed 24px circles were only about 10px apart; player3's number disappeared behind player4. | Per-tile two-row arrangement with sufficient spacing and reserved tile space. | `market-mobile-crowded.png` shows all numbers; pairwise bounding-box assertions prove no overlap; circular geometry and finite travel retained. | Closed |

The original contrast and crowding screenshots were overwritten by the named final-retest captures during the same harness reruns. Initial measurements and reproduction steps above preserve the failure evidence; the final images must not be presented as original failures. Earlier source-level findings remain described in `engine-findings.md` and `integration-review.md`.

Supplemental findings: the Market author identified oval tokens caused by the stretched SVG overlay, and the root identified cancellation-room content flashing before redirect. Those were corrected separately; independent tests subsequently verified circular token geometry, and real legacy departure verified no winner/history. Do not attribute the initial discovery of those two issues to this review.

Harness issue tracked separately: the first WebKit real-room run timed out on login without a page error and removed its disposable account. `webkit-market-login-attempt.json` preserves that initial failure. The successful follow-up used the same explicit password-visibility interaction as the preexisting WebKit QA harness; see final classification below.

Supplemental **RD-06 — nested main landmark**, discovered by the root public smoke: the Pocket component rendered `<main>` inside the layout `<main>`. Root changed the component to `<section aria-label="Pocket Paradise">`; final page-level smoke/axe retest is owned by the root. Independent harness selectors now locate the game class rather than requiring a main tag.

WebKit follow-up classification: the initial masked-password login attempt succeeded after using the preexisting QA show-password interaction. Subsequent turn timeouts were a harness response race: its waiter accepted the previous pass response while waiting to click Finish. Matching request type `end` fixed synchronization. `webkit-market-response-race.json` preserves the diagnostic (server phase trade/version2 while UI later reached the opponent). Final `webkit-market-summary.json` completed successfully at 390/320/1440, including reduced motion. Two `/api/social` navigation access-control messages were retained separately as non-game navigation noise, not silently omitted; game errors were zero. All attempt fixtures were cleaned.

No open game-rule or independently reproduced presentation blockers remain. The final independent report records the backend and cross-browser gate results and their scope.

Root RD-06 retest: `local-release-smoke.json` records all ten Chromium/WebKit viewport checks passing with exactly one main landmark, zero full-page WCAG axe violations, no overflow and no page errors.
