# GameHub architecture and coverage

Next.js16 App Router + React19/TypeScript7/Tailwind4, Supabase Auth/Postgres. Eight client-side same-device game pages. Eight online renderer/engine types cover18 database-configured games. Server mutations authenticate and enforce membership, turns, round tokens and game-specific rules. Protected secrets and redacted snapshots separate what players may see from server state.

Online games checked: Doctor Dash; Riddle Rush; Emoji Movie Guess; Movie Trivia; Mystery Card; Reverse Definition; Mental Math; Never Have I Ever; Would You Rather; Truth or Dare; 2-Minute Challenge; Memory Match; Number Guess Battle; Know Your Partner; Who Remembers It Better; Code Crackers; Rule Discoverer; Word Association Chain.

Local games checked: Mystery Card; Know Your Partner; Code Crackers; Word Association Chain; Reverse Definition; Mental Math Duel; Rule Discoverer; Who Remembers It Better.

Flow coverage: public library -> sign-in redirect retaining selected game -> room settings -> create -> code/share -> join -> lobby capacity/minimums -> host start -> turn/answer/timeout -> scoring/reveal -> next/final -> history/rematch. Leave/disconnection errors, host transfer, departed-player answer quorum, challenge voting, stale-round submission, private answers, and duplicate/concurrent updates have targeted regressions. Local private handoffs, setup validation, replay and content limits are included.

Evidence: local-game-audit.md, multiplayer-audit.md, database-verification.md, browser-verification.md, independent-review.md, independent-ui-final-review.md, ui-review.md. Each report distinguishes code inspection, component execution, real HTTP/database execution and browser observation.
