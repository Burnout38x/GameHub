# Category selector

Added a responsive rounded category section directly below the existing single full-width search bar. All games is the default; seven existing categories group titles across online and pass-and-play catalogs. Counts reflect the current search and play mode; category switching preserves those choices. Reset filters restores all defaults. Buttons expose their selected state with aria-pressed and retain visible keyboard focus and existing theme/motion behavior.

Validation: `npm run lint` passes with zero warnings; `npm test` passes 81 tests, including category/search/mode combinations and All games recovery; `npm run build` succeeds. Isolated Playwright browser on the locally built app checked category switching and recovery across all four themes at 320/375/1440px: 12 checks passed, no overflow, accessibility violations, or browser errors. Screenshot visually reviewed. Only public game-library reads were used; no database changes.

Artifacts: `game-categories-browser.json`, `screenshots/game-categories.png`.
