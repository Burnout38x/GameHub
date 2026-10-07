// Read-only retained-evidence validation, not a browser rerun.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=n=>readFileSync(new URL(n,import.meta.url),'utf8');
const b=JSON.parse(read('browser.json'));
assert.equal(b.results.length,8);assert.deepEqual(b.errors,[]);
for(const r of b.results){assert(r.movement&&r.settled&&r.aligned&&r.gateStable&&r.reducedMotion&&r.toggle&&r.previewIsolated&&!r.overflow);assert.deepEqual(r.axe,[]);}
const lifecycle=JSON.parse(read('lifecycle.json'));assert(lifecycle.hiddenEventCancels&&lifecycle.visibleEventSettles&&lifecycle.resizeCancelsAndAligns);
assert.match(read('tests.log'),/pass 121/);assert.match(read('tests.log'),/fail 0/);
assert.match(read('review.md'),/review/i);
console.log('PASS: 121 tests, 8 Chromium/WebKit resident checks and independent review evidence retained');
