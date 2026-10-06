# One long search bar — 2026-10-06

User requested one long field in place of search/category/audience controls. Removed both dropdowns and the duplicate navigation search. Library now has one full-width rounded live-search input; game category badges and play-mode buttons remain. Existing /games?q=… links still initialize the search.

Verification:5 relevant library tests passed, zero-warning lint and production build passed. Browser verified exactly1 searchbox,0 comboboxes, input fills its available width, Code Crackers returns online+local results, and desktop/mobile layouts have no overflow. No database changes.
