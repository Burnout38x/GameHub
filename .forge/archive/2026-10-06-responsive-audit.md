GOAL: Check GameHub at phone, tablet, foldable, portrait/landscape and desktop screen sizes; fix overflow, clipped UI and scrolling problems.

DONE WHEN:
  1. Live public routes and local signed-in/game routes audited across representative 320–1920px widths, short landscape heights and foldable widths — PASS (`node scripts/audit-responsive-public.mjs` → live baseline 322 checks; final isolated public 322 + Chromium signed-in 422 + WebKit signed-in 107 = 851 screen/page checks)
  2. Discovered layout defects fixed; critical controls, document scrolling and responsive transitions verified — PASS (`QA_RESPONSIVE=1 node scripts/audit-responsive-private.mjs` → 422 checks, zero layout issues; WebKit variant → 107 checks, zero layout issues; final public → 322 checks, zero defects; narrow controls visually reviewed and axe checks passed)
  3. Relevant tests/build pass, evidence records emulation limits, fixes pushed and production checked — PASS (`npm run lint` → zero warnings; `npm test` → 81 passed; isolated production build → compiled successfully; exact production deployment 6898763229 → success; live Chromium/WebKit smoke → 10 viewport checks passed; evidence records physical-device and console-message limits)

OUT: Physical device certification, production account/room mutations, unrelated database changes.
RISK: Reversible layout changes; isolate test users/rooms locally. Do not conceal overflow with blanket clipping. Record non-baseline visual checks honestly.
