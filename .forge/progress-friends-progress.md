# Progress, friends and invitations

Anchor: `.forge/progress-friends-anchor.md`.

## Phases

1. Contracts and implementation — MET. Progress summary derives completed results; win streak retains atomic existing finisher rules. Private goal settings, social graph, opt-in presence, mutual invitations and rounded theme-aware UI implemented. Defaults remain both streak types and mutual-friend invites. No response to optional clarification received at implementation checkpoint.
2. Isolated validation and independent review — MET. Both additive migrations applied to disposable local database (127.0.0.1:58322). Native agents cross-reviewed backend/progress and root UI integration. Final result: 80 unit tests pass, lint clean, both production and isolated builds pass; 20 browser/API checks pass across four themes and 320/375/1440 widths with zero accessibility violations/browser errors. Seven database checks cover concurrent room capacity, atomic quotas, expired invites, stale presence and private grants. Actual atomic game completion counts once in progress even when called twice. Local query plan uses the invite inbox index; dashboard ~3.6ms on a small fixture, not a scale benchmark.
3. Release — IN PROGRESS. Fresh schema backup taken; additive migration applied only to authorized live project jnzbncbmcewsvtjjmddn. Before/after existing records: 4 profiles, 24 rooms, 20 match results. All four profiles' aggregate history counts match. RLS enabled on all four new tables; browser roles denied all three RPCs while service role allowed. Push/deployment verification next. Rollback code first, preserve additive tables/preferences unless separately authorized to delete them.

Anchor re-read at implementation checkpoint: yes. Still matches GOAL: yes.

Artifacts: `social-browser-report.json`, `progress-feature-notes.md`, `social-ui-notes.md`. Browser uses a separate headless profile and disposable local accounts; no user browser sessions or production records involved.

Full browser interaction caught an origin-check regression: Next normalizes request.url to its internal listener, so same-origin browser POSTs were rejected. Shared helper now compares the browser-facing Host and protocol, with regression/security tests and independent review. Final full click-through passed after correction.

Completion gate: four conditions parsed, exit 0 (parse mode). Mutating browser/database tests were run explicitly, not automatically rerun by the gate. Existing Supabase-managed `supautils.restrict_extension_versions` connection warning remains outside app scope; no platform configuration changed.
