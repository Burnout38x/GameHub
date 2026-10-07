import test from 'node:test';
import assert from 'node:assert/strict';
import { isSameOriginRequest } from '../src/lib/server/request-origin';

test('accepts browser-facing origin when Next uses an internal listener URL', () => {
  assert(isSameOriginRequest(new Request('http://localhost:3199/api/social', { headers: { origin: 'http://127.0.0.1:3199', host: '127.0.0.1:3199' } })));
  assert(isSameOriginRequest(new Request('http://localhost/api/social', { headers: { origin: 'https://naijagamehub.vercel.app', host: 'naijagamehub.vercel.app', 'x-forwarded-proto': 'https' } })));
});
test('rejects foreign, opaque, malformed and mismatched-scheme browser origins', () => {
  for (const origin of ['https://evil.example', 'null', 'not-a-url', 'http://game.test', 'https://game.test/path']) {
    assert.equal(isSameOriginRequest(new Request('https://game.test/api/social', { headers: { origin, host: 'game.test' } })), false);
  }
  assert(isSameOriginRequest(new Request('https://game.test/api/social')));
});
