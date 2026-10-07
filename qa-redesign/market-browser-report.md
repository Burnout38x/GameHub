# Market browser review

Independent Chromium inspection of temporary `/qa-market` local wrapper, 2026-10-07. **Simulated reducer only.** The wrapper bypasses real API and database authorization and supplies a final-result fixture. This report establishes presentation and interaction evidence, not integrated multiplayer persistence.

**Verdict: local presentation acceptance passes after both fixes.** No visual baseline comparison; current board screenshots independently inspected.

1. **Resolved: overlapping mobile traders hid player identity.** At 320px, execute destination addresses 2, 5, 2, 2 for successive players, passing and ending each turn. Players 1, 3 and 4 finish at Books. Their 24px tokens have roughly 10px spacing, and the fourth token obscures the third token's number. See `market-mobile-crowded.png`. A compact two-row token arrangement now preserves all three numbers. Independent bounding-box assertions verify no overlap at 320px; screenshot refreshed.
2. **Resolved: light-theme active phase label failed contrast.** Current phase chip has dark #102c2a text on #176860 background, **2.25:1**, below 4.5:1. Axe reports this at 320, 390, 820 and 1440px. The corrected chip now passes: all sixteen width/theme axe scans report zero violations.

Passed:

- Sixteen width/theme combinations have no horizontal page overflow. Initial tokens remain circular 24×24px in every combination. All four theme game-region axe scans report no violations.
- Desktop board geography reads clearly as a clockwise market loop. Property ownership and trader positions have separate markings. At 320px property names and costs remain readable; central exchange wraps within its space.
- A move from address 1 to 8 creates eight finite clockwise waypoints, lasts no more than 1100ms, visibly changes token position and settles. An unchanged-position business action does not restart travel.
- Reduced-motion travel creates no running animation after the committed effect settles. Interrupting a move with wrapper reset settles to the authoritative replacement with no running travel. Reset is a presentation stress test, not real reconnect evidence.
- Final fixture shows named winner and point-source breakdown. No runtime errors.

Additional verified guidance: after travel, keyboard focus lands on Turn actions; the public-contract shortcut focuses Public district contracts.

Pending: true room API flow, stale/concurrent network actions, reconnect, database result and rematch integration. No product edits were made by this review.
