# Online browser verification

Isolated app http://127.0.0.1:3199; disposable local API http://127.0.0.1:58321. Separate headless Chrome contexts; no user profile or live data.

Checks passed: 48. Axe violation groups: 0. Horizontal overflow: 0. Errors: 0. Console warnings: 0.

- production hydration: home game draw and theme respond
- three isolated browser identities logged in
- online-quiz-play-dark
- online-quiz-play-light
- online-quiz-result-dark
- online-quiz-result-light
- quiz: browser play, score, finish
- online-prompt-shared-timer-dark
- online-prompt-shared-timer-light
- online-prompt-result-dark
- online-prompt-result-light
- prompt: browser play, score, finish
- online-memory-play-dark
- online-memory-play-light
- online-memory-result-dark
- online-memory-result-light
- memory: browser play, score, finish
- online-guess-play-dark
- online-guess-play-light
- online-guess-result-dark
- online-guess-result-light
- guess: browser play, score, finish
- online-predict-private-dark
- online-predict-private-light
- online-predict-result-dark
- online-predict-result-light
- predict: browser play, score, finish
- online-predict-memory-result-dark
- online-predict-memory-result-light
- predict-memory: browser play, score, finish
- online-code-play-dark
- online-code-play-light
- online-code-result-dark
- online-code-result-light
- code: browser play, score, finish
- online-rule-play-dark
- online-rule-play-light
- online-rule-result-dark
- online-rule-result-light
- rule: browser play, score, finish
- online-chain-final-review-dark
- online-chain-final-review-light
- online-chain-result-dark
- online-chain-result-light
- chain: browser play, score, finish
- quiz deadline shared expiry and end
- host rematch and partner follow/join new lobby
- reduced-motion computed style and visible keyboard focus

Details: .forge/browser-online-report.json; screenshots: .forge/screenshots/online-*.png.

## Final production-stack evidence and independent review

Final run used the isolated production build of Next 16.4 / React 19.3 / Tailwind 4. `node scripts/test-browser-online.mjs` exited 0: **48 checks, 0 axe violations, 0 horizontal overflow, 0 page errors, 0 console warnings**. Source was not edited during this run. New temporary identities and rooms remained confined to the disposable local backend.

All eight online renderer types completed actual browser play/scoring/results; both multiple-choice and free-text prediction variants were exercised. Other evidence covers home hydration, 3 independent authenticated contexts, room joining/starting, private answer collection, invalid/duplicate code input, invalid chain input, out-of-turn controls, shared challenge deadline across clients/reload, quiz expiry visible for both clients before an explicit Finish click, and host rematch/partner follow and join.

Read-only independent review of `advance/route.ts` and `QuizPlay.tsx`: automatic expiry now sends `revealOnly: true`. The server verifies membership, the current round, timed quiz configuration, and deadline; an already revealed round returns without advancing. Manual Next/Finish omits the flag and retains the advancement branch under the same lock. The browser now proves both automatic reveal idempotency and manual advancement.

Read-only final CSS review: rounded controls retain 48px targets; muted/semantic colors cover both themes; reduced-motion rules suppress entry, score, hover and progress movement. The actual browser verifies reduced-motion computed styles and a visible teal keyboard-focus outline in the bright theme. Previous pale-important-color, skip-link, long-name overflow, and timed double-advance findings are resolved. The long-name Code Crackers light result screenshot was visually inspected and wraps within the 375px viewport.

Final CSS refresh: `node scripts/test-browser-online.mjs --visual-only` exited 0 with **11 checks and zero axe violations, overflow, page errors, or console warnings**. It preserves this full 48-check gameplay report while writing `.forge/browser-online-visual-report.json` and `.forge/browser-online-visual-verification.md`. Eight new screenshots cover play, correct reveal, wrong reveal, and a long-name winner result in both themes. The wrong-answer/correct-answer reveal screenshots were visually inspected in dark and bright themes; text and semantic answer colors are clear and the 375px layout fits.
