# Responsive static review

Scope: independent source inspection of global layout, navigation, local games, room games, profile, social views and tables. This is a ranked browser-verification list, not a claim of physical-device testing. No source or database changes made.

## Ranked findings

1. **Long valid usernames and player-entered strings can exceed cards.** `src/app/profile/page.tsx:33` renders the username in a 30px heading without wrapping; registration permits 24 characters (`src/app/register/page.tsx:87`). A username such as `WWWWWWWWWWWWWWWWWWWWWWWW` can exceed a 320px viewport's card. `src/app/rooms/page.tsx:41` host display names also have no emergency wrapping. Global `.pill` (`src/app/globals.css:64`) uses `w-fit` without `max-width` or `overflow-wrap`; turn labels in CodePlay:54, RulePlay:36, MemoryPlay:53, GuessPlay:85 and local Code Crackers:234 include names. Existing Scoreboard and EndScreen correctly use `min-w-0` plus `overflow-wrap:anywhere`; use that pattern. Verify with real maximum-length unbroken usernames, not only short test names. Prioritize a scoped text-wrapping default for user content and bounded pills; don't hide page overflow.

2. **Rule evidence rows do not adapt to narrow cards.** `src/components/room/RulePlay.tsx:104` and `src/app/games/local/rule-discoverer/page.tsx:281` put a value and a second nonwrapping flex row (Accepted/Rejected plus starter clue/player name) side by side. At 320px, outer card and row padding leave about 214px; even ordinary evidence plus both status labels can exceed this. Long examples amplify it. Allow outer and inner flex wrapping and break long values. Verify both starter rows and player-submitted rows. `GuessPlay.tsx:95` guess-history rows similarly need name wrapping and status separation.

3. **Sticky, multi-row navigation can crowd short landscape screens and anchor destinations.** `src/components/Navbar.tsx:21` is always sticky. Signed-in navigation includes profile, seven links, invites, join and optionally Admin, so wraps to multiple rows. At 320px widths or landscape 320px height, much of the visual viewport may remain occupied while scrolling. Consider static header under a short-height media query, and verify normal phone portrait navigation scrolling. `FriendsDashboard.tsx:56` uses `scroll-mt-6` for `#invitations`, less than header height, so invite anchor can land hidden behind the sticky nav. Use adequate scroll-margin or scroll-padding for the sticky header. No rigid fullscreen modal or body scroll lock was found.

4. **Code Crackers action buttons may be squeezed at 320px.** `src/components/room/CodePlay.tsx:94` and `src/app/games/local/code-crackers/page.tsx:255` place Clear and Submit guess in one row with 40px horizontal padding on each button. Panel padding leaves roughly 238px. Browser-check text/padding overflow and consider a narrow-screen column or smaller responsive padding. Five-column digit controls are roughly 40px wide at this size; they fit but are smaller than 44px touch targets. A two-row or smaller-panel-padding layout would improve touch comfort.

## Confirmed safeguards

- No blanket `overflow-x:hidden` on html/body/main; page overflow is not concealed.
- Leaderboard (`src/app/leaderboard/page.tsx:24`) and admin dashboard (`src/app/admin/page.tsx:47`) wide tables have local `overflow-x-auto` containers; intentional table scrolling is appropriate, and should be tested for keyboard reachability.
- Root viewport has device width, initial scale 1, and no zoom restriction (`src/app/layout.tsx:17`). Form `.input` uses 16px base text, avoiding the common iOS small-input autozoom trigger.
- Body has `min-height:100vh`, not a fixed height, so ordinary document scrolling remains available. Native custom select picker is bounded with `max-height:min(24rem,65dvh)` and local vertical scrolling.
- Root viewport does not opt into `viewport-fit:cover`, so lack of explicit safe-area padding is not by itself proof of notch clipping. Test mobile Safari landscape; if switching to cover, add safe-area insets together.
- Room result/scoreboard components already bound and wrap long names; grid layouts generally use responsive column counts.

No screenshot evidence was collected by this static-review agent. Parent browser audit should confirm or dismiss the ranked findings before documenting fixes.
