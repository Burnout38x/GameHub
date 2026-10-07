# Online browser verification

Isolated app http://127.0.0.1:3199; disposable local API http://127.0.0.1:58321. Separate headless Chrome contexts; no user profile or live data.

Checks passed: 50. Axe violation groups: 0. Horizontal overflow: 0. Errors: 1. Console warnings: 0.

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
- cleanup user 6da9fa53-4f5a-4d47-8437-8dc8fb92e88a: ok
- cleanup user 1063f4ce-f109-4618-adf6-85075223ad90: ok
- cleanup user 18f62b3e-8b4e-4867-ba57-544153503bb1: ok

Details: qa-workspace/evidence/regression-browser-online-report.json; screenshots: qa-workspace/evidence/online-*.png.
