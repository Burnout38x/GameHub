# Rounded dropdown menus — 2026-10-06

Styled native select popup using appearance:base-select and ::picker(select), keeping original form/React events and keyboard/touch behavior. Shared .input selects now receive a22px rounded floating menu,14px option corners, theme surface/ink colors, accent selected/checkmark/hover states,46px option targets, restrained shadow and viewport-limited scrolling. Previous16px arrow inset retained.

Progressive enhancement: browsers without customizable-select support retain their native picker; forced-colors mode explicitly restores native appearance. No React markup/dependency changes. Reference consulted: https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select

Verification: isolated375px Chromium browser passed7 checks: popup rounded style and pointer selection in all4 themes; keyboard opening/navigation/selection; Escape dismissal; forced-colors fallback. No runtime errors. Screenshots select-menu-{dark,light,arcade,ocean}.png; visual inspection confirms rounded theme-matched popup. npm run build passed. No database changes.
