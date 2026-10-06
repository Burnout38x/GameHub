# Prominent game search — 2026-10-06

Added a labeled search bar in the shared top navigation. GET /games?q=… searches both online and local catalogs by game name, description and gameplay category. URL query is normalized/bounded and initializes library filters. Existing library search now spans the full filter panel width. Empty results support clearing filters to show all games.

Verification:73 automated tests pass, including initial URL-search state across both catalogs and reset; zero-warning lint; production build passes. Isolated browser on a separate local preview verified actual header form submission from /themes, URL term propagation,2 Code Crackers results (online/local), no-results/reset,320/375/1440px no-overflow and no runtime errors. Read-only public catalog requests only; no account or database mutations.
