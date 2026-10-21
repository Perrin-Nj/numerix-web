// Unit check of src/shared/client-ip.ts (Node runs the TypeScript file directly). Usage: node scripts/check-client-ip.mjs
import assert from 'node:assert/strict';
import { clientIp } from '../src/shared/client-ip.ts';

const h = (o) => (name) => o[name] ?? null;
assert.equal(clientIp(h({ 'x-forwarded-for': '203.0.113.9' })), '203.0.113.9');
assert.equal(clientIp(h({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1, 10.0.0.2' })), '203.0.113.9', 'first entry only');
assert.equal(clientIp(h({ 'x-forwarded-for': '2001:db8::1' })), '2001:db8::1');
assert.equal(clientIp(h({ 'x-real-ip': '198.51.100.7' })), '198.51.100.7', 'falls back to x-real-ip');
assert.equal(clientIp(h({})), undefined);
assert.equal(clientIp(h({ 'x-forwarded-for': 'evil, 1.2.3.4' })), undefined, 'garbage first entry is dropped, not guessed');
assert.equal(clientIp(h({ 'x-forwarded-for': '1.2.3.4\r\nX-Admin: 1' })), undefined, 'header injection is rejected');
console.log('ok client-ip (7 checks)');
