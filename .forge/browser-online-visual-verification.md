# Online browser verification

Isolated app http://127.0.0.1:3199; disposable local API http://127.0.0.1:58321. Separate headless Chrome contexts; no user profile or live data.

Checks passed: 11. Axe violation groups: 0. Horizontal overflow: 0. Errors: 0. Console warnings: 0.

- production hydration: home game draw and theme respond
- three isolated browser identities logged in
- online-final-css-quiz-play-dark
- online-final-css-quiz-play-light
- online-final-css-correct-reveal-dark
- online-final-css-correct-reveal-light
- online-final-css-wrong-reveal-dark
- online-final-css-wrong-reveal-light
- online-final-css-quiz-result-dark
- online-final-css-quiz-result-light
- final-css-quiz: browser play, score, finish

Details: .forge/browser-online-visual-report.json; screenshots: .forge/screenshots/online-*.png.

This targeted run uses the final production CSS and preserves the separate full 48-check online gameplay result. Eight screenshots cover both-theme play, correct reveal, wrong reveal, and long-name winner results. Dark and bright reveal screenshots were visually inspected: the shared palette, rounded controls, semantic answer colors, and mobile wrapping are consistent. No application source was changed during the run.
