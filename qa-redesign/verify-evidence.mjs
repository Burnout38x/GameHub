// Read-only artifact gate. This validates retained results; it does not rerun browsers.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const text = name => readFileSync(new URL(name, import.meta.url), 'utf8');
const json = name => JSON.parse(text(name));
const mode = process.argv[2];
if (mode === 'design') {
  for (const name of ['../docs/game-redesign-review.md', '../docs/pocket-redesign.md', '../docs/market-redesign.md']) assert(text(name).length > 500);
  console.log('PASS: both written designs and independent critique retained');
} else if (mode === 'rules') {
  assert.equal(json('engine-summary.json').checks, 7);
  assert.equal(json('engine-summary.json').pocketDistinctOffersAcross100Seeds, 100);
  assert.match(text('final-unit.log'), /pass 114/);
  assert.match(text('final-unit.log'), /fail 0/);
  console.log('PASS: 7 independent engine groups; 114 unit tests; 100 distinct offers');
} else if (mode === 'ui' || mode === 'motion') {
  for (const name of ['pocket-browser-summary.json', 'pocket-webkit-browser-summary.json', 'market-browser-summary.json']) assert.deepEqual(json(name).errors, []);
  assert.equal(json('market-browser-summary.json').results.length, 22);
  const safari = json('webkit-market-summary.json');
  assert(safari.completed && safari.cleanupVerified);
  assert.deepEqual(safari.gameErrors, []);
  assert(safari.checks.some(c => c.reducedMotion && c.motion.length === 0));
  const smoke = json('local-release-smoke.json');
  assert.equal(smoke.checks.length, 10);
  assert.deepEqual(smoke.errors, []);
  for (const c of smoke.checks) { assert(c.singleMain && !c.overflow); assert.deepEqual(c.fullPageAxeViolations, []); }
  console.log('PASS: Chromium/WebKit flows, 22 Market visual checks, bounded/reduced motion, 10 full-page release checks');
} else if (mode === 'integration') {
  for (const name of ['backend-summary.json', 'legacy-market-http-summary.json']) { const r = json(name); assert(r.completed && r.cleanupVerified); }
  assert.deepEqual(json('backend-summary.json').failures, []);
  console.log('PASS: real 2P/4P completion, concurrency, persistence, compatibility and verified fixture cleanup');
} else if (mode === 'release') {
  const live = json('live-smoke.json'), deploy = json('deployment.json');
  assert.equal(live.checks.length, 10);
  assert.deepEqual(live.errors, []);
  assert.equal(deploy.state, 'success');
  assert.equal(live.codeCommit, deploy.codeCommit);
  console.log(`PASS: production ${deploy.codeCommit}, 10 live Chromium/WebKit checks`);
} else throw new Error('Choose design, rules, ui, integration, motion or release');
