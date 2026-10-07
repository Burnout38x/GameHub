# Pocket Paradise and Market Day release

Code: d21ddc6adb3b586943d18b03b7548cd233aec865, pushed to both main and codex/gamehub-game-night-upgrade.

Pocket Paradise adds a solo 20-placement neighborhood builder, daily and standard seeds, relaxed practice, validated browser save/resume, score previews, resident requests, dimensional/flat views and downloadable postcard. Signed-in completed runs are replay-verified and count toward progress once per seed.

Market Day adds original 2–4 player, ten-round economic play: choose a route, buy/upgrade stalls, restock, fulfill commissions, trade or exchange at the bank. No player elimination. Server commands, final results and explicit departures persist atomically; stale versions cannot overwrite new state. Tab closure preserves membership for reconnect; explicit leaving ends the match without results and warns players first.

Both appear in Build & strategy and All games. Solo adventures is distinct from Online rooms and Pass & play. All four themes supported. Toy dimensional effects use CSS, not a real-time WebGL engine.

Verification: 98 unit tests passed, ESLint zero warnings, isolated production build successful. Ten integration check groups cover a complete four-player game and solo persistence; nine security groups cover permissions, stale writes, rollback, quotas and invitations. Pocket browser evidence: 58 checks. Market combined UI evidence: 116 checks (80 theme/viewport cases and 16 axe scans), including a complete two-player match. Two WebKit errors around forced hard navigation are retained in the diagnostic file; the final normal user-navigation WebKit run has 49 checks and zero page errors/layout/axe findings. Browser emulation cannot certify physical devices or screen readers. No pre-existing visual baseline exists for these new screens; regression comparison is therefore unavailable, while screenshots/manual inspection and layout checks are recorded.

Database: migration 20261007005306 applied only to jnzbncbmcewsvtjjmddn. New table has RLS and no public/authenticated access; new RPCs are service-role-only, security invoker, empty search_path. Existing profiles/rooms/history/prompts digests unchanged (4/24/20/766 rows). Query plans use primary-key/time indexes. Public schema backup held outside repository. Existing supautils configuration warning is platform-owned and unchanged.

Rollback: disable only the two new catalog slugs, then revert application deployment. Preserve completion/history data; no destructive rollback required. Catalog entries stay inactive until successful compatible production deployment.

Deployment and live verification: pending at initial code push; final result appended below.


Production deployment **6899103935** succeeded for exact code SHA **d21ddc6adb3b586943d18b03b7548cd233aec865**. Both catalog entries then activated and read back. Live URL https://naijagamehub.vercel.app/games. Public live smoke: ten Chromium/WebKit viewport checks (320,390,717,820,1440), zero page errors or horizontal overflow, both launch links discoverable and solo practice preview/flat controls working. No live test accounts, rooms or scores created. Readback still 4 profiles,24 rooms,20 history,766 prompts. All isolated test users/rooms cleaned and app servers stopped.

Forge completion gate: exit 0, four conditions parsed, blocked false (parse mode; mutating/network checks run separately). Anchor archived at .forge/archive/2026-10-06-game-expansion.md.
