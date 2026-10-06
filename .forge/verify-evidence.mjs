// Read-only evidence inventory. This checks recorded artifacts, not runtime behavior.
// Runtime evidence comes from the independently executed suites cited in the anchor.
import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const inventory = read('inventory.md');
assert.match(inventory, /18/);
for (const report of ['local-game-audit.md', 'multiplayer-audit.md', 'database-verification.md', 'independent-ui-final-review.md', 'progress.md']) {
  assert.ok(read(report).length > 200, `${report} missing substantive evidence`);
}
assert.match(read('independent-ui-final-review.md'), /Parent review:/);
assert.match(read('progress.md'), /resume|Resume/);
assert.ok(existsSync(new URL('screenshots/light-375-home.png', import.meta.url)));
console.log('Evidence inventory: 18 online games, 8 local games, independent review, progress log, and screenshot artifacts present.');

// Assert the recorded browser results remain complete and clean. This does not
// launch browsers; exact runtime commands and scope are in the adjacent reports.
const json = path => JSON.parse(read(path));
const matrix = json('browser-report.json');
assert.equal(new Set(matrix.checks).size, 83);
for (const key of ['errors', 'violations', 'overflow']) assert.equal(matrix[key].length, 0, `matrix ${key}`);
const local = json('browser-results.json');
assert.equal(new Set(local.passed).size, 8);
assert.equal(local.errors.length, 0);
const visual = json('browser-visual.json');
assert.equal(visual.results.length, 13);
assert.equal(visual.errors.length, 0);
for (const result of visual.results) {
  assert.equal(result.overflow ?? false, false, result.label);
  assert.equal(result.violations?.length ?? 0, 0, result.label);
}
const online = json('browser-online-report.json');
assert.ok(online.checks.length >= 42);
for (const key of ['errors', 'violations', 'overflow']) assert.equal(online[key].length, 0, `online ${key}`);
console.log(`Recorded browser evidence: 83 matrix checks, 8 local completion/replays, 13 theme/motion checks, ${online.checks.length} online checks; zero recorded errors, axe violations or overflow.`);
assert.equal(online.warnings?.length ?? 0, 0, 'online console warnings');
const api = read('verification/online-api.log');
assert.equal((api.match(/^PASS .*create\/join\/start\/play\/score\/finish\/history/gm) ?? []).length, 18);
assert.match(read('verification/timer-concurrency.log'), /2 real multi-client scenarios passed/);
assert.equal(Object.keys(json('verification/outdated.json')).length, 0);
assert.equal(json('verification/production-audit.json').metadata.vulnerabilities.total, 0);
assert.match(read('dependency-review.md'), /PASS/);
console.log('Upgrade evidence: current direct versions, zero production advisories, independent dependency review, 18 API games and 2 concurrent-timer regressions. Full development audit limitation is documented separately.');
const finalCss = json('browser-online-visual-report.json');
assert.equal(finalCss.checks.length, 11);
for (const key of ['errors', 'warnings', 'violations', 'overflow']) assert.equal(finalCss[key].length, 0, `final CSS ${key}`);
console.log('Final CSS: 11 online visual checks, zero warnings/errors/axe violations/overflow.');
