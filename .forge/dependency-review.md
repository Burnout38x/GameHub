# Independent dependency review — 2026-10-06

Reviewer: multiplayer agent; package/configuration changes authored by other agents. Verdict: **PASS with the documented development dependency advisory limitation.** No new material defect found in this source review.

Reviewed `package.json`, `eslint.config.mjs`, `next.config.mjs`, TypeScript configuration, README, and `.forge/dependency-upgrade.md`. Exact dependency pins and the two TypeScript aliases are coherent: the installed `@typescript/native` package provides TypeScript 7's `tsc`, while `typescript` provides the official TypeScript 6 API package. This is the [Microsoft-documented side-by-side configuration](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/), not a claim that TypeScript 7 exposes the old JavaScript API.

ESLint peer overrides are limited to three legacy plugins. Both imported Next configurations pass through the [official compatibility wrapper](https://eslint.org/blog/2024/05/eslint-compatibility-utilities/); the upgrade does not disable their complete rule sets. The existing `no-explicit-any` exception remains explicit. Peer overrides alone cannot prove compatibility; the root agent's complete zero-warning lint run supplies practical evidence for this repository. Recheck this bridge when changing rules/plugins and remove overrides when upstream peer ranges support the installed ESLint.

Webpack is an [explicitly supported Next 16 option](https://nextjs.org/docs/app/guides/upgrading/version-16). Scripts select it consistently for build and development. The optional Turbopack root configuration does not skip type or build checks. No `ignoreBuildErrors`, blanket lint bypass, or security-audit suppression was introduced.

The root agent records `npm outdated` returning `{}`, `npm ls --all` exiting zero, zero-warning lint, successful type checking, and zero production audit findings. These are attributed verification results, not commands independently rerun for this source-only review. Separately, this reviewer executed the upgraded isolated application's full 18-game API suite, nine lifecycle cases, and both concurrent quiz-timer cases successfully.

The full audit remains five related high findings in one development lint dependency chain. Independently checked [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): affected braces versions include 3.0.3 and the advisory currently lists no patched version. Documentation accurately preserves this limitation. Repository-controlled lint patterns reduce exposure in this workflow; they do not remove the vulnerable package. Track the upstream fix rather than presenting the full audit as clean or applying an unrelated framework downgrade.

No production services, live database, dependency versions, or configuration were changed by this review.

## Follow-up development runtime check

A separate source copy on port 3299 using only the isolated local backend reproduced a blocked HMR origin warning for `127.0.0.1`. The proxy exclusion alone did not fix Next's own development origin check. Verified and then added the narrow `allowedDevOrigins: ['127.0.0.1']` setting to the main configuration, following the [official configuration reference](https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins). This is the sole source change from the follow-up; it does not allow arbitrary origins.

Final isolated headless Chrome check passed home game drawing, theme changes, and a visible component-label HMR update with state retained. Browser console warnings: **0**; page/WebSocket errors: **0**; unexpected resource failures: **0**. Two `ERR_ABORTED` RSC refresh requests were retained in the raw report during successive temporary HMR edits/restoration; no assets failed. Server emitted no further blocked-origin warning after restart.

Harness corrections: allow initial development hydration to finish before clicking; edit the visible post-draw button label rather than its hidden initial-state branch. The earliest premature-click run and its unused-font preload warning were not treated as a clean pass. No app delay or warning suppression was introduced. Temporary component edits were restored and compared byte-for-byte against the repository source. Production browser tests on port 3199 and the live database were untouched. Raw final report: `/private/tmp/gamehub-codex-audit-20261006/dev-smoke-report.json`.
