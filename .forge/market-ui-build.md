# Market Day presentation build

Implemented `src/components/room/MarketPlay.tsx` with `MarketPlay.module.css`. Uses existing `RoomBundle` props: room, players, userId, refresh (additional bundle props ignored). Parent should mount with the existing bundle. Imports deterministic engine constants/types from `src/lib/market-day.ts`; posts command fields plus `expectedVersion` directly to `callRoomApi(room.code, 'market', body)`.

Includes 12-stall responsive toy-market board with dimensional awnings and shadows, explicit flat-board toggle, native accessible movement buttons only for legal destinations, token player numbers, ownership/level labels, visit fee previews, resource and prosperity summaries, validated business affordances, bounded two-sided trade form, accept/decline controls, offer expiration via finish turn, last-event card, complete scoring tutorial and reverse-chronological action journal. Four theme CSS variables, 3-column phone / 4-column tablet board, wrapping names, touch-size actions, reduced-motion transitions disabled.

Validation: `npx eslint src/components/room/MarketPlay.tsx --max-warnings=0` -> exit 0. Initial `npx tsc --noEmit` reported only engine narrowing errors (communicated to engine owner); no UI errors. Integrated browser/responsive testing pending parent integration. No database or deployment writes.

Follow-up after engine owner's narrowing fix: `npx tsc --noEmit` -> exit 0.

Independent review fixes: extracted trade form into a child mounted only for a current player's trade step with no outstanding offer. Posting/accepting/closing an offer or ending a turn unmounts local trade assets; subsequent turns start with a fresh form. Buy action now labels its reward “+2 stall points”, distinguishing it from net prosperity after spending saved coins. Commission labels its specific commission/reputation points. Both ESLint and TypeScript checks pass after fixes.

## Actual browser validation and final ergonomics

Added compact two-column player summaries on phones. Deliberate game actions now focus and scroll to the turn action panel only after an authoritative version change. Background polling never steals focus. CSS-only shop awnings, perspective and depth have a flat-board alternative; no WebGL dependency is introduced.

Durable harness: `scripts/audit-market-ui.mjs` (isolated app3202 / Supabase58321 only, disposable users/rooms removed in finally). It drives actual buttons/forms, not API game actions. API is used only to create an initial room and verify results. Join-code form, start, keyboard movement/toggle, business actions, offers, acceptance, decline and finish-turn use UI controls.

- Original combined run: `.forge/market-ui-browser.json`,116checks; full two-player twenty-turn Chromium game produced exactly two match-history rows. WebKit exercised three turns including accepted/declined offers and fresh returning-turn draft. Eighty layout cases cover movement/trade forms, all four themes and320/390/717/820/1440widths. Sixteen axe scans had zero violations. Zero layout findings. Two WebKit social page errors occurred only at forced hard navigation.
- Diagnostic `.forge/market-ui-webkit-hard-navigation.json` records social page errors1–2ms before navigation. There is no matching failed social request, so this evidence is **not** classified as proven cancellation. It remains raw evidence.
- Switching the harness to the actual in-app Join with code link/form removed all browser errors. Immediate post-resize scroll measurement initially produced three false bottom-scroll findings; `.forge/market-ui-webkit-resize-race.json` preserves that run. Waiting two animation frames for viewport layout before scrolling and measuring resolves this measurement race.
- Final `MARKET_QA_ENGINE=webkit node scripts/audit-market-ui.mjs` -> exit0; `.forge/market-ui-webkit-browser.json`:49checks, zero layout defects, zero page errors, eight axe scans with zero violations. Both trade responses, keyboard actions and returning-turn form reset passed.
- `npx eslint scripts/audit-market-ui.mjs src/components/room/MarketPlay.tsx --max-warnings=0` -> exit0; `npx tsc --noEmit` -> exit0.

Viewport screenshots, not full-page stitched screenshots, are in `.forge/screenshots/market-{chromium,webkit}-{board,trade-form,results}-*.png`. Manually inspected Chromium390board and320trade form: text, legal destinations and form controls are readable; the long narrow trade form scrolls normally.

Limitations: browser emulation, not physical phones/foldable hinges/keyboards. Axe covers main content and is not comprehensive accessibility certification. Full match played in Chromium; WebKit ran three live turns rather than a second full match. Two raw WebKit errors from synthetic hard navigation remain documented; final normal navigation has none. QA app3202 was stopped after verification; parent app3199 and production database were untouched.
