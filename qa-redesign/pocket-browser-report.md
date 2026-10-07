# Pocket browser review

Chromium, isolated local preview at `http://127.0.0.1:3199/play/pocket-paradise`, 2026-10-07. Backend offline; no claims about authentication, account persistence or database integration. Used browser-qa skill.

**Verdict: preview acceptance passes after the light-theme header fix.** No baseline visual comparison was available, so visual regression status is inconclusive; current screenshots were independently inspected.

Passed:

- All twenty placements through real controls for a deliberately failed charter. Gate warning appeared before committing. Final “Opening delayed” stated missing requirements and explained how to unblock the gate next run.
- A regenerated legal 19-move fixture followed by keyboard final placement earned a 64-point gold charter. Earned postcard includes GOLD CHARTER; reload restores outcome; retry preserves the exact challenge seed.
- Keyboard preview/cancel preserves saved history. Keyboard commit works. No runtime errors.
- No horizontal page overflow at 320, 390, 820 or 1440 pixels in dark, light, arcade and ocean themes. 200% CSS zoom had no page overflow.
- Reduced motion suppresses construction animation. Normal construction lasts 0.38 seconds, one iteration; zero running game animations remained after settling.
- Automated axe checks within the game found no WCAG A/AA violations in all four themes at all four widths. This is not a complete screen-reader or accessibility certification.

Resolved finding:

- Light theme applies a cream background to the local game header. Title remains cream (contrast **1.01:1**), eyebrow **1.4:1**, subtitle **1.44:1**. Reported at every tested viewport. The scoped header background fix now passes contrast at all tested widths; the screenshot and JSON have been refreshed to the corrected state. No Pocket browser blocker remains.

Curated evidence: mobile failed charter, desktop gold charter, desktop active board, light-theme mobile defect, and downloaded gold postcard. The winning branch used a history fixture; the losing branch used twenty UI placements. Do not claim the gold run was fully played manually.
