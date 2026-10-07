# Independent Pocket Life review

Reviewer: `review_residents`, 2026-10-07. Source review and independent execution of the seven route tests; browser verification is assigned to the implementation lead and is not claimed here.

## Findings requiring correction

1. **Newly serviced destinations are not prioritized by the component.** The route model accepts a previous board and its test demonstrates priority, but `PocketLife` initially calls `pocketLife(board)` without one. Once more than three destinations work, a newly unlocked home or stall may receive no visitor while older destinations replay. Pass the preceding committed board, scoped/reset to the current run.
2. **Mobile scale affects board-coordinate translation.** At widths below 440 px, `.resident { scale: .8 }` composes with the actor's translated position, scaling its journey coordinates toward the overlay origin. Scale the artwork inside the positioned actor instead; compare the final foot position with the computed doorstep at mobile widths.
3. **The new information panel shifts the gate.** The panel initially renders inside `.map`, whose height controls the percentage-positioned gate. The gate no longer aligns with row 2 and moves again when the attention details expand. Give board/overlay/gate a common positioned wrapper whose height excludes the panel.

All three were reported to the lead promptly and corrected in source. Independent re-review confirms: the component derives the preceding board by clearing the last committed move's cell (valid for this placement-only game); mobile scaling now applies to the SVG, leaving actor translation unscaled; and the gate now belongs to the positioned board, excluding the panel's height. Browser geometry and integration checks remain the lead's evidence, not this source review's claim.

## Rules and performance assessment

- Route construction reuses authoritative `pocketServices`, starts at cell 5, uses only orthogonal connected paths, and ends in an actually serviced home or stall. It never creates new score state.
- Seven meaningful tests pass, covering disconnection, diagonal rejection, blocked gate, shortest routes, priority, a late bridge and 300 sampled layouts checked against authoritative services. These establish model correctness but do not prove component priority wiring or pixel positions.
- At most three residents receive finite WAAPI animations. There is no idle animation loop, frame callback or simulation interval. Effects cancel on replacement, hidden tabs cancel activity, reduced motion renders a static outcome, and resize resolves to the endpoint. This is an appropriately small visual explanation, not a full population simulation.
- The pointer-transparent overlay preserves board interaction. Residents are decorative to screen readers; working services remain expressed in tile accessible names and detailed missing requirements remain text.
- Classic saves intentionally show no residents because their scoring does not use the new connected-road rules; the compatibility notice explains this.

## Experience limitations

These are small stylized residents with a short walk and destination gesture, not realistic animated people. Static destination markers remain after their journeys. The limited resident count is reasonable for performance, provided newly repaired destinations receive priority. Human judgment of the final animation should supplement automated geometry and timing checks.

## Final presentation and lifecycle review

Re-reviewed the final finite leg-swing addition and v2 paving. Both leg animations join the same cancellation collection as travel, body gait and destination gestures. The maximum is 18 finite WAAPI animations across three residents, with no per-frame JavaScript. Cleanup still cancels all animations, disconnects the resize observer and removes both event listeners. Preview, visibility, reduced-motion and resident-toggle transitions remain bounded; no new lifecycle blocker found.

Inspected the regenerated production-build `390-residents.png`: residents read clearly at mobile scale, the flatter paving joins the actual roads, the gate is aligned to the entry row, and the life panel stays within the scene. The image shows a journey in progress rather than proving timing or cleanup; those are covered by source review and the lead's browser harness. No additional release-blocking visual finding.

## Additional lifecycle finding from the lead's harness

The lead's targeted lifecycle harness found a resize race: skipping the first `ResizeObserver` callback could also skip a genuine size change immediately after replay. Source correction independently reviewed: capture the board's actual initial bounding rectangle, compare each notification against its recorded dimensions, and settle/cancel activity whenever dimensions differ. This preserves an ordinary unchanged initial notification without dropping a real first resize. The observer still disconnects in effect cleanup and settling starts no new animation. The correction addresses the reported cause; final browser/lifecycle rerun results belong to the lead's generated evidence.
