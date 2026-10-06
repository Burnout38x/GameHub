# Dropdown spacing — 2026-10-06

User screenshot showed the native visibility dropdown arrow against the rounded border. Updated shared single-select .input styling to use a16px inset chevron with48px right text padding. Covers room creation, game filters, local settings, reports and admin selects. Daylight uses a darker chevron. Multi-select/listboxes retain native rendering; forced-colors mode restores the native arrow.

Verified CSS in an isolated375px browser on the game library: all4 themes use48px text padding and16px inset, selection works, forced colors restore appearance:auto. Production build passed. Screenshot: screenshots/dropdown-spacing.png. No database changes.
