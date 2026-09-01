import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import {
  parseMetaWebhookEvents,
  scopeFromCandidates,
  verifyMetaWebhookSignature,
  verifyMetaWebhookToken,
} from '../metaWebhook';

const secret = 'unit-test-meta-secret';

function signed(body: Buffer): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

function messagePayload(overrides: Record<string, unknown> = {}): Buffer {
  return Buffer.from(JSON.stringify({
    object: 'page',
    business_id: 'spoofed-business',
    brand_id: 'spoofed-brand',
    entry: [{
      id: 'page-101',
      time: 1_788_230_400_000,
      messaging: [{
        sender: { id: 'sender-202' },
        recipient: { id: 'page-101' },
        timestamp: 1_788_230_401_000,
        message: { mid: 'mid.abc123', text: 'Do you have appointments Saturday?' },
        ...overrides,
      }],
    }],
  }));
}

test('Meta HMAC accepts the exact signed bytes', () => {
  const body = messagePayload();
  assert.equal(verifyMetaWebhookSignature(body, signed(body), secret), true);
});

test('Meta HMAC rejects missing, malformed, and wrong signatures', () => {
  const body = messagePayload();
  assert.equal(verifyMetaWebhookSignature(body, undefined, secret), false);
  assert.equal(verifyMetaWebhookSignature(body, 'sha256=bad', secret), false);
  assert.equal(verifyMetaWebhookSignature(body, signed(body), 'wrong-secret'), false);
});

test('Meta HMAC rejects a body altered after signing', () => {
  const body = messagePayload();
  const altered = Buffer.from(body.toString('utf8').replace('Saturday', 'Sunday'));
  assert.equal(verifyMetaWebhookSignature(altered, signed(body), secret), false);
});

test('Meta GET verification token fails closed', () => {
  assert.equal(verifyMetaWebhookToken('verify-token', 'verify-token'), true);
  assert.equal(verifyMetaWebhookToken('', 'verify-token'), false);
  assert.equal(verifyMetaWebhookToken('wrong', 'verify-token'), false);
});

test('parser extracts provider message identity and ignores tenant spoof fields', () => {
  const [event] = parseMetaWebhookEvents(messagePayload());
  assert.deepEqual({
    providerAccountId: event.providerAccountId,
    externalEventId: event.externalEventId,
    senderId: event.senderId,
    recipientId: event.recipientId,
    content: event.content,
  }, {
    providerAccountId: 'page-101',
    externalEventId: 'mid.abc123',
    senderId: 'sender-202',
    recipientId: 'page-101',
    content: 'Do you have appointments Saturday?',
  });
  assert.equal('business_id' in event, false);
  assert.equal('brand_id' in event, false);
});

test('parser ignores delivery receipts and outbound echo messages', () => {
  const receipt = Buffer.from(JSON.stringify({
    object: 'page',
    entry: [{ id: 'page-101', messaging: [{ sender: { id: 'sender' }, recipient: { id: 'page-101' }, delivery: { mids: ['mid-1'] } }] }],
  }));
  assert.deepEqual(parseMetaWebhookEvents(receipt), []);
  assert.deepEqual(parseMetaWebhookEvents(messagePayload({ message: { mid: 'mid.echo', text: 'sent by us', is_echo: true } })), []);
});

test('derived event IDs are stable when Meta omits a message id', () => {
  const body = messagePayload({ message: { text: 'No mid present' } });
  const first = parseMetaWebhookEvents(body)[0].externalEventId;
  const second = parseMetaWebhookEvents(body)[0].externalEventId;
  assert.match(first, /^derived_[a-f0-9]{64}$/);
  assert.equal(first, second);
});

test('malformed and unsupported payloads are rejected after signature verification', () => {
  assert.throws(() => parseMetaWebhookEvents(Buffer.from('{')), /not valid JSON/i);
  assert.throws(
    () => parseMetaWebhookEvents(Buffer.from(JSON.stringify({ object: 'user', entry: [] }))),
    /unsupported Meta webhook object/i,
  );
});

const validCandidate = {
  id: 'connection-1',
  business_id: 'business-1',
  brand_id: 'brand-1',
  location_id: 'location-1',
  provider: 'meta_social',
  provider_account_id: 'page-101',
  status: 'active',
  auth_state: 'AUTHORIZED',
};

test('account scope resolves only one exact authorized provider binding', () => {
  assert.deepEqual(scopeFromCandidates([validCandidate], 'page-101'), {
    connectionId: 'connection-1',
    businessId: 'business-1',
    brandId: 'brand-1',
    locationId: 'location-1',
  });
});

test('unknown, ambiguous, unscoped, and unauthorized Meta bindings fail closed', () => {
  assert.equal(scopeFromCandidates([], 'page-101'), null);
  assert.equal(scopeFromCandidates([validCandidate, { ...validCandidate, id: 'connection-2' }], 'page-101'), null);
  assert.equal(scopeFromCandidates([{ ...validCandidate, provider_account_id: 'page-other' }], 'page-101'), null);
  assert.equal(scopeFromCandidates([{ ...validCandidate, brand_id: null }], 'page-101'), null);
  assert.equal(scopeFromCandidates([{ ...validCandidate, auth_state: 'PENDING' }], 'page-101'), null);
  assert.equal(scopeFromCandidates([{ ...validCandidate, status: 'revoked' }], 'page-101'), null);
});
