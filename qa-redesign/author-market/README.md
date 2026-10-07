# Author-run Market visual simulation

This is **not independent review, HTTP integration evidence, or database verification**. The temporary `/qa-market` page in the isolated audit app renders the real `MarketPlay` component. Its in-browser fetch interceptor passes commands to the real `applyMarketDay` reducer. Player identity advances with the active seat solely to exercise presentation. The final state is an explicit visual fixture, not a claimed legal completed match.

At 320px, 390px and 1440px:

- Captured opening, isolated board, movement and final outcome.
- Clicked a seven-space move crossing board corners, skipped business, ended the turn and opened the final fixture.
- Observed one running 1100ms transform animation with eight route keyframes.
- Emulated reduced motion and repeated movement: zero token animations.
- No page errors or horizontal document overflow.

Inspection found and corrected stretched token glyphs caused by nonuniform SVG scaling. Fixed-size 24px numbered tokens now keep circular shapes on every aspect ratio while following the same measured board route. Mobile board labels remain 10–12px rather than shrinking below readability. Final presentation names the winner, personal rank, score components, runner-up margin and largest category advantage. Closed-board copy no longer forecasts another round.

`preview-page.tsx` preserves the temporary page source; it is not installed under the production app. `visual.mjs` launches an isolated headless Chrome against localhost:3199. `summary.json` records the last run. Screenshots remain author evidence only; multiplayer synchronization and actual server authorization require the separate integration pass.

Follow-up fixes from independent review: active phase now uses white on explicit dark teal in both themes. A same-cell group reserves a two-by-two token shelf; all four numbered traders fit without overlap at 320/390/1440. Leaving a group starts the route at that trader's actual former shelf position. The author probe confirms no pairwise token overlap. After an initiating player's committed move, action focus/scroll waits until travel finishes (immediate for reduced motion); the probe finds `Turn actions` focused near the viewport top, then verifies the public-contract jump focuses `Public district contracts`. Passive state refreshes do not initiate that guidance.
