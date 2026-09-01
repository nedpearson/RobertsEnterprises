import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSubmissionPayload, parseArgs, validateEndpoint } from '../powerful-form-backfill.mjs';
import { containsSupabaseServiceRoleJwt } from '../security-token-detector.mjs';

test('builds the canonical bridge payload from a Powerful Form export row', () => {
  const payload = buildSubmissionPayload({
    ID: 25747183,
    Email: 'bride@example.com',
    'First and Last Name': 'Taylor Andrews',
    'Store Location': 'Baton Rouge',
    'First Appointment Request': '2026-09-12 10:00 AM',
  }, 'idobridalcouture.com');

  assert.equal(payload.sourceProvider, 'powerful-form');
  assert.equal(payload.externalSubmissionId, '25747183');
  assert.equal(payload.siteDomain, 'idobridalcouture.com');
  assert.deepEqual(payload.fields.find((field) => field.label === 'Store Location'), {
    label: 'Store Location', value: 'Baton Rouge',
  });
});

test('refuses rows without a stable provider submission id', () => {
  assert.throws(
    () => buildSubmissionPayload({ Email: 'bride@example.com' }, 'idobridalcouture.com'),
    /missing provider submission ID/,
  );
});

test('requires an explicit export and exact website domain', () => {
  assert.deepEqual(parseArgs(['--file', 'submissions.xlsx', '--domain', 'idobridalcouture.com', '--dry-run']), {
    file: 'submissions.xlsx', domain: 'idobridalcouture.com', dryRun: true,
  });
  assert.throws(() => parseArgs(['--file', 'submissions.xlsx']), /--domain is required/);
});

test('never sends the bridge secret over plaintext internet transport', () => {
  assert.match(validateEndpoint('https://example.com/intake'), /^https:/);
  assert.match(validateEndpoint('http://127.0.0.1:8082/intake'), /^http:/);
  assert.throws(() => validateEndpoint('http://example.com/intake'), /must use HTTPS/);
});

test('the credential scanner distinguishes service-role JWTs from public anon JWTs', () => {
  const jwt = (role) => [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ role })).toString('base64url'),
    'synthetic_signature',
  ].join('.');

  assert.equal(containsSupabaseServiceRoleJwt(jwt('service_role')), true);
  assert.equal(containsSupabaseServiceRoleJwt(jwt('anon')), false);
});
