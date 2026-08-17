/**
 * Channel derivation tests.
 *
 * These names must match what the ad syncs write into growth_channel_spend
 * ("Google Search", "Meta"). If they drift, spend lands on one channel row and
 * conversions on a lookalike, and every ROAS figure silently becomes wrong while
 * still looking plausible — the worst kind of bug in a reporting product.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveChannel } from '../tracking';

const derive = (o: Partial<Parameters<typeof deriveChannel>[0]>) =>
  deriveChannel({ source: null, medium: null, clickId: null, referrer: null, ...o });

test('paid click ids map to the network that issued them', () => {
  assert.equal(derive({ clickId: 'gclid:abc123' }), 'Google Search');
  assert.equal(derive({ source: 'facebook', medium: 'cpc' }), 'Meta');
  assert.equal(derive({ source: 'instagram', medium: 'paid' }), 'Meta');
});

test('paid channel names match what the ad syncs write as spend', () => {
  // sync/meta-ads writes channel "Meta"; sync must equal capture.
  assert.equal(derive({ source: 'meta', medium: 'cpc' }), 'Meta');
  assert.equal(derive({ source: 'google', medium: 'cpc' }), 'Google Search');
});

test('organic social is distinguished from paid social', () => {
  assert.equal(derive({ referrer: 'https://www.instagram.com/' }), 'Meta');
  assert.equal(derive({ referrer: 'https://www.pinterest.com/pin/1' }), 'Pinterest');
  assert.equal(derive({ referrer: 'https://www.tiktok.com/@x' }), 'TikTok');
});

test('bridal directories are their own channel, not generic referral', () => {
  assert.equal(derive({ referrer: 'https://www.theknot.com/vendors/x' }), 'The Knot');
  assert.equal(derive({ source: 'weddingwire' }), 'The Knot');
});

test('search engines resolve to organic search', () => {
  assert.equal(derive({ referrer: 'https://www.google.com/' }), 'Organic Search');
  assert.equal(derive({ referrer: 'https://duckduckgo.com/' }), 'Organic Search');
  assert.equal(derive({ medium: 'organic' }), 'Organic Search');
});

test('email keeps its own channel', () => {
  assert.equal(derive({ medium: 'email' }), 'Email');
  assert.equal(derive({ source: 'klaviyo', medium: 'newsletter' }), 'Email');
});

test('no signal is Direct, and self-referrals never count as Referral', () => {
  assert.equal(derive({}), 'Direct');
  // A click from our own site must not be laundered into a Referral row.
  assert.equal(derive({ referrer: 'https://vowos.bridgebox.ai/gowns' }), 'Direct');
  assert.equal(derive({ referrer: 'https://someblog.example/post' }), 'Referral');
});

test('an unknown paid source is still recognisably paid', () => {
  assert.equal(derive({ source: 'bridalmagazine', medium: 'cpc' }), 'Bridalmagazine');
  assert.equal(derive({ medium: 'ppc' }), 'Paid');
});
