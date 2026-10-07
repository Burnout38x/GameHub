import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=n=>JSON.parse(readFileSync(new URL(n,import.meta.url),'utf8'));
const live=read('live.json'),deployment=read('deployment.json');
assert.equal(deployment.state,'success');assert.equal(live.base,'https://naijagamehub.vercel.app');assert.equal(live.results.length,8);assert.deepEqual(live.errors,[]);
for(const r of live.results){assert(r.movement&&r.settled&&r.aligned&&r.reducedMotion&&!r.overflow);assert.deepEqual(r.axe,[]);}
console.log('PASS: production deployment and 8 live resident browser checks');
