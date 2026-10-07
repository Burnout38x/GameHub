# Friends UI implementation and review

Scope: `.forge/progress-friends-anchor.md`, social UI only.

- `/friends` authenticates on the server and preserves the return URL.
- Username search, following/follower counts and bounded lists, follow-back/unfollow, opt-in online visibility, and private invite inbox are implemented with explicit loading, error, retry, and empty states.
- Shared rounded components and theme tokens preserve the existing four themes. Buttons and fields have accessible labels, status/error announcements, minimum touch sizes, and wrapping layouts. Search results do not show stale matches while a new query loads.
- `SocialPresence` (default export) is mounted once for signed-in navigation. It performs a 30-second visible-tab heartbeat and a 60-second inbox refresh. It links to the inbox; it never automatically moves a player out of a game. Hidden tabs stop polling and report themselves hidden on visibility change. Online disclosure remains server-controlled and opt-in.
- `RoomFriendsInvite` (default export, `{ code: string }`) is mounted only in a joined lobby. Mutual friends are listed online-first; hidden/offline status is not falsely described as offline. Invites persist for returning friends, subject to lobby availability and expiry.
- GET refreshes run every 30 seconds for the dashboard / 45 seconds for lobby friends, only while visible. Mutations trigger a refresh event. Heartbeats do not dispatch the event, so there is no polling loop.
- Invite acceptance navigates only after an explicit Join room action and a successful server response. Error messages preserve the current screen.

Checks actually run:
- `npx tsc --noEmit` — passed during implementation.
- `npx eslint src/app/friends src/components/social --max-warnings=0` — passed after correcting the effect-cleanup ref warning.

Independent source review of root integration: `NavLinks` mounts one authenticated presence widget in either branch; `Lobby` guards the invitation panel with `inRoom`; proxy and page both protect Friends. Progress UI explicitly explains UTC boundaries, online-game scope, and multiplayer win streaks. No blocking source-review finding. Root owns isolated browser, accessibility, all-theme, and live deployment verification; those were not run by this agent.
