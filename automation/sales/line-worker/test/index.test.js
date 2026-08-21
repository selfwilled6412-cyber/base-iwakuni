import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTextEvents, verifyLineSignature } from '../src/index.js';

async function makeSignature(body, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Buffer.from(digest).toString('base64');
}

test('verifies LINE HMAC-SHA256 signature against raw body', async () => {
  const body = '{"destination":"Utest","events":[]}';
  const secret = 'test-secret';
  const signature = await makeSignature(body, secret);
  assert.equal(await verifyLineSignature(body, signature, secret), true);
  assert.equal(await verifyLineSignature(body, 'invalid', secret), false);
});

test('normalizes text events only', () => {
  const records = normalizeTextEvents({
    events: [
      {
        type: 'message', webhookEventId: 'evt1', timestamp: 1,
        source: { userId: 'U1' },
        message: { id: 'm1', type: 'text', text: ' 自動化相談 ' }
      },
      {
        type: 'message', webhookEventId: 'evt2', timestamp: 2,
        source: { userId: 'U1' },
        message: { id: 'm2', type: 'image' }
      }
    ]
  });
  assert.equal(records.length, 1);
  assert.equal(records[0].message_text, '自動化相談');
  assert.equal(records[0].event_id, 'evt1');
});
