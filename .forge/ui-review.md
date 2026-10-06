# Independent UI review — 2026-10-06

Reviewed `.forge/anchor.md` including theme/live-data amendment. Reviewed room setup/join/lobby, root theme/navigation/home/library, and adjoining RoomClient/LeaveButton paths. Reviewer did not author these files. Review is source-based with numeric contrast calculations; browser persistence and responsive verification remain separate.

## Findings

1. **P1 — Bright theme retains pale important utility colors.** `NavLinks.tsx:31` uses `!text-[#f7bd78]`; homepage `page.tsx:36` uses `!text-[#9cddd2]`; `rooms/page.tsx:32,34` uses `!text-red-300` and `!text-emerald-200`. Global bright overrides (`globals.css:85–90`) have no `!important`, so they lose to these Tailwind declarations regardless of selector specificity. On the bright canvas, amber join text is 1.57:1 and mint All Games text 1.44:1; badge colors on white are red 1.90:1 / emerald 1.28:1. Similar urgent-timer pills in QuizPlay/ChainPlay retain pale red. Remove the important color utilities in favor of semantic theme tokens or provide deliberate matching override precedence. Verify computed colors in both themes.

2. **P2 — Focused skip link is nearly invisible in bright theme.** `globals.css:63` combines `bg-white` with `text-black`. Tailwind now maps white to `--ink-rgb`, making the bright background #243136 with black text (1.57:1). Use explicit contrasting theme colors (for example background var(--ink), color var(--canvas)). Keyboard Tab should show a clearly legible Skip to content control in both themes.

3. **P2 — Small muted bright-theme text fails readable contrast broadly.** Merely remapping `white` to dark ink retains old alpha values. `text-white/60` is about 3.75:1 and `/65` 4.32:1 on the bright canvas; both fall below 4.5:1 for ordinary small text. Examples: new/join description, room player metadata, game card descriptions; `/50` setup timer guidance is 2.88:1. Use a bright-theme muted-text token around 70% ink or a suitable solid color and map existing low-opacity text classes. This also needs visual inspection of error/disabled distinctions.

4. **P2 — Connection errors disappear in lobby/results.** `RoomClient.tsx:115–116` returns Lobby/EndScreen before the error banner at 128. After a successful first load, a later poll failure retains stale state without any warning in those phases. Render the shared connection alert above every loaded-room phase and retain retry. Reproduce by loading a lobby then failing subsequent room GET requests; repeat at results.

5. **P2 — Leave/close failures are silently swallowed.** `LeaveButton.tsx:27–28` catches errors and merely resets busy. A failed close or leave leaves the user with no explanation; navigation is intentionally hidden within rooms, compounding uncertainty. Existing defect in an adjacent flow rather than introduced by the UI patch, but the all-room-flow goal includes it. Add an inline announced error and busy label; keep room unchanged when request fails.

6. **P2 — Full-room visitor has no in-app exit.** `NavLinks.tsx:13` suppresses every navigation link for any `/room/` URL. Lobby only renders LeaveButton when inRoom (`Lobby.tsx:106`), and a nonmember at capacity only sees disabled Room is full (`95–98`). Directly opening a full lobby leaves no in-app route back to browse games/rooms. Add Back to rooms for nonmembers (and do not send leave requests for them).

7. **P3 — Room browser shows contradictory empty state after failure.** `rooms/page.tsx` renders error alert and then also No public rooms right now because the empty-state condition does not exclude `error`. Gate empty results on successful loading. Membership query errors are separately ignored, potentially hiding a player's private rooms without a warning; include that query failure in the error state.

## Reviewed behavior with no source defect found

- New room loading, error/retry, and empty-game states disable submission; state-derived selectedRounds prevents incompatible displayed values after game changes.
- Join validation normalizes pasted code, focuses invalid input, announces errors, disables repeated in-flight submission, and catches non-JSON errors.
- Lobby capacity/minimum count labels match current type rules; copy failure produces an accessible manual-copy fallback.
- Theme choice applies to document root and persists through localStorage; blocked storage is caught and honestly announced. Pre-paint script reads the same key. Browser reload proof still required.
- Game library links consistently distinguish online account-based rooms from no-account local play; search has an accessible label.

No application files edited during this independent review.
