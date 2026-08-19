/**
 * Growth provider unit tests.
 *
 * Focus is the logic that is both easy to get wrong and expensive to get wrong:
 * OAuth state signing (a forged state could attach an attacker's Google account
 * to another tenant), consent-URL parameters (a missing access_type=offline
 * silently breaks background sync a week later), and the pure mappers.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildConsentUrl, signState, verifyState, PROVIDER_SCOPES } from '../googleAuth';
import { META_SCOPES } from '../metaAuth';
import { scoreListing, mapGbpReview, type GbpLocation, type GbpReview } from '../providers';

process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-signing-key';

test('combined scopes are unioned correctly', () => {
  const google = PROVIDER_SCOPES.google;
  assert.ok(google.length >= 3, 'Google combined scope must contain at least 3 scopes');
  assert.ok(google.includes('https://www.googleapis.com/auth/webmasters.readonly'));
  assert.ok(google.includes('https://www.googleapis.com/auth/business.manage'));
  assert.ok(google.includes('https://www.googleapis.com/auth/analytics.readonly'));

  const meta = META_SCOPES.meta;
  assert.ok(meta.length >= 6, 'Meta combined scope must contain at least 6 scopes');
  assert.ok(meta.includes('ads_read'));
  assert.ok(meta.includes('instagram_basic'));
});

test('signed OAuth state round-trips', async () => {
  const state = await signState({ businessId: 'biz-1', provider: 'google_search_console' });
  const payload = await verifyState(state);
  assert.equal(payload?.businessId, 'biz-1');
  assert.equal(payload?.provider, 'google_search_console');
});

test('tampered OAuth state is rejected', async () => {
  const state = await signState({ businessId: 'biz-1', provider: 'google_search_console' });
  const [, sig] = state.split('.');

  // Swap the tenant id but keep the original signature.
  const forgedBody = Buffer.from(
    JSON.stringify({ businessId: 'victim-tenant', provider: 'google_search_console' }),
  ).toString('base64url');

  assert.equal(await verifyState(`${forgedBody}.${sig}`), null, 'forged tenant must not verify');
  assert.equal(await verifyState('garbage'), null, 'malformed state must not verify');
  assert.equal(await verifyState(''), null, 'empty state must not verify');
});

test('state signed with a different key does not verify', async () => {
  const original = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'key-a';
  const state = await signState({ businessId: 'biz-1', provider: 'google_ads' });
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'key-b';
  assert.equal(await verifyState(state), null);
  process.env.SUPABASE_SERVICE_ROLE_KEY = original;
});

test('consent URL requests offline access so a refresh token is issued', () => {
  const url = new URL(
    buildConsentUrl(
      { clientId: 'cid', clientSecret: 'secret', redirectUri: 'https://example.test/cb' },
      PROVIDER_SCOPES.google_search_console,
      'state-token',
    ),
  );
  assert.equal(url.searchParams.get('access_type'), 'offline');
  assert.equal(url.searchParams.get('prompt'), 'consent');
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('state'), 'state-token');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://example.test/cb');
  assert.match(url.searchParams.get('scope') ?? '', /webmasters\.readonly/);
  // The client secret must never appear in a URL handed to the browser.
  assert.equal(url.toString().includes('secret'), false);
});

test('listing completeness penalises missing profile fields', () => {
  const complete: GbpLocation = {
    name: 'accounts/1/locations/1',
    title: 'Magnolia Bridal',
    storefrontAddress: { locality: 'Baton Rouge' },
    phoneNumbers: { primaryPhone: '(225) 555-0142' },
    websiteUri: 'https://example.test',
    categories: {
      primaryCategory: { displayName: 'Bridal shop' },
      additionalCategories: [{ displayName: 'Wedding store' }],
    },
    regularHours: { monday: '10-6' },
  };
  const full = scoreListing(complete);
  assert.equal(full.score, 100);
  assert.equal(full.issues.length, 0);

  const bare: GbpLocation = { name: 'accounts/1/locations/2', title: 'Bare' };
  const empty = scoreListing(bare);
  assert.ok(empty.score < 40, `expected a low score, got ${empty.score}`);
  assert.ok(empty.score >= 0, 'score must never go negative');
  const codes = empty.issues.map((i) => i.code);
  for (const expected of ['missing_website', 'missing_phone', 'missing_category', 'missing_hours', 'missing_address']) {
    assert.ok(codes.includes(expected), `expected issue ${expected}`);
  }
});

test('review mapping derives status and sentiment from the star rating', () => {
  const base: GbpReview = { reviewId: 'r1', starRating: 'FIVE', comment: 'Wonderful', createTime: '2026-08-01T00:00:00Z' };

  const positive = mapGbpReview(base, 'biz-1', 'listing-1');
  assert.equal(positive.rating, 5);
  assert.equal(positive.status, 'needs_reply');
  assert.equal(positive.sentiment, 'positive');
  assert.equal(positive.business_id, 'biz-1');
  assert.equal(positive.external_id, 'r1');

  const negative = mapGbpReview({ ...base, reviewId: 'r2', starRating: 'TWO' }, 'biz-1', 'listing-1');
  assert.equal(negative.rating, 2);
  assert.equal(negative.status, 'flagged', 'low ratings must be flagged, not silently queued');
  assert.equal(negative.sentiment, 'negative');

  const answered = mapGbpReview(
    { ...base, reviewId: 'r3', reviewReply: { comment: 'Thank you!', updateTime: '2026-08-02T00:00:00Z' } },
    'biz-1',
    'listing-1',
  );
  assert.equal(answered.status, 'replied');
  assert.equal(answered.response_body, 'Thank you!');

  const neutral = mapGbpReview({ ...base, reviewId: 'r4', starRating: 'THREE' }, 'biz-1', 'listing-1');
  assert.equal(neutral.sentiment, 'neutral');

  // An unknown star string must not crash the sync.
  const unknown = mapGbpReview({ ...base, reviewId: 'r5', starRating: 'STAR_RATING_UNSPECIFIED' }, 'biz-1', 'listing-1');
  assert.equal(unknown.rating, 3);
});
