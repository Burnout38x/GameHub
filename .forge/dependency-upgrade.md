# Current stable dependency upgrade — 2026-10-06

User requested latest dependencies and warning cleanup after initial functional/UI verification. This is an additional acceptance condition; earlier framework verification is historical until the new stack passes the suites.

Public npm registry checked with `npm outdated --json --fetch-retries=0 --fetch-timeout=20000`. Current stable: Next16.4.0, React/React DOM19.3.0, Tailwind4.3.3, ESLint10.12.0, TypeScript7.0.2, Supabase SSR0.12.7 and client2.117.2. Dependency peer requirements checked before installation. No canary/beta releases requested.

Migration references:
- https://nextjs.org/docs/app/guides/upgrading/version-16 — async cookies/params, proxy replacement for middleware, standalone ESLint CLI.
- https://tailwindcss.com/docs/upgrade-guide — separate PostCSS plugin, explicit legacy config loading, v4 component/application rules.
- https://react.dev/warnings/react-test-renderer — move deprecated test renderer coverage to DOM-based tests.

Planned verification: clean install and dependency tree, npm audit, lint with zero warnings, TypeScript, production build, unit/DOM tests, isolated real database/API and browser flows. No live DB or production deployment is part of this upgrade.

## Migration results

- All direct current-version checks now return `{}` from `npm outdated --json`; dependencies pinned exactly, including aliases.
- Latest ESLint10.12.0 runs with `@eslint/compat`2.1.1 and scoped peer overrides for the three legacy plugin packages. The full imported Next/TypeScript rule sets remain enabled; no blanket warning suppression. A temporary ESLint9 compatibility attempt produced an EOL warning and was replaced.
- Official Microsoft side-by-side setup: `@typescript/native` aliases TypeScript7.0.2 (`tsc`); `typescript` aliases official `@typescript/typescript6`6.0.2 API for tools. This resolves the unsupported TS7 API warning without giving up the latest compiler.
- Tailwind4 CSS-first tokens replace the TypeScript configuration, removing its module-type warning. Next async params/cookies/proxy migration complete.
- React19 lifecycle code now uses timer event callbacks and derived/external state instead of cascading effect updates. All57 logic/DOM regressions passed after these edits; no deprecated test renderer remains.
- Build/dev use supported Webpack mode because this workspace denies Turbopack CSS worker port binding and the isolated app uses an external node_modules symlink. Next16 production compilation/type generation passed; final gate reruns the final source.
- `npm ls --all` exits0; `npm run lint` exits0 with `--max-warnings=0`; `npx tsc --noEmit` exits0.

## Audit limitation, not suppressed

`npm audit --omit=dev --json`: zero production advisories. Full `npm audit`: five high findings in a single development lint chain (`eslint-config-next` → Next ESLint plugin → fast-glob → micromatch → braces). Root advisory https://github.com/advisories/GHSA-vfj7-8cjw-p6xm lists no patched braces release as of this check. Do not downgrade to the old framework to satisfy the audit's proposed dependency removal. This tool only processes repository-controlled lint patterns here; avoid untrusted patterns. No claim is made that the entire development dependency audit is clean. Recheck when the upstream fix ships.

Install-script review is version-pinned for esbuild/fsevents/unrs-resolver in package.json. No arbitrary future script approval or global npm configuration changed.

Final dependency checks: `npm install --dry-run --ignore-scripts` printed “up to date in2s” with no peer/deprecation/install-script warnings; this verifies resolution without replacing node_modules during active browser checks. Initial real upgrade installs completed; transitional warnings were addressed, not removed from history. Final `npm outdated --json` returned an empty object. Evidence copies are in `.forge/verification/`.
