/**
 * Metadata parser tests.
 *
 * The parser is regex-based over real-world HTML, so the cases that matter are
 * the messy ones: reversed attribute order, single quotes, entities, malformed
 * JSON-LD sitting next to valid JSON-LD, and @graph nesting.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMetadata, schemaTypes, scoreMetadata } from '../metadata';

const FULL = \`<!doctype html><html><head>
  <title>Magnolia Bridal</title>
  <meta property="og:title" content="Magnolia Bridal | Baton Rouge" />
  <meta content="Find your gown" property="og:description">
  <meta property='og:image' content='https://cdn.example/hero.jpg'>
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Magnolia Bridal &amp; Co.">
  <link rel="canonical" href="https://magnoliabridal.example/">
  <script type="application/ld+json">
    {"@context":"https://schema.org","@graph":[{"@type":"LocalBusiness","name":"Magnolia"},{"@type":["Store","Organization"]}]}
  </script>
  <script type="application/ld+json">{ this is not json }</script>
</head><body></body></html>\`;

test('extracts Open Graph and Twitter tags in either attribute order', () => {
  const meta = parseMetadata(FULL);
  assert.equal(meta.og_title, 'Magnolia Bridal | Baton Rouge');
  // content-before-property ordering must still parse
  assert.equal(meta.og_description, 'Find your gown');
  // single-quoted attributes must still parse
  assert.equal(meta.og_image, 'https://cdn.example/hero.jpg');
  assert.equal(meta.twitter_card, 'summary_large_image');
  // entities must be decoded
  assert.equal(meta.twitter_title, 'Magnolia Bridal & Co.');
  assert.equal(meta.canonical_url, 'https://magnoliabridal.example/');
});

test('collects schema types across @graph and arrays, ignoring malformed blocks', () => {
  const types = schemaTypes(FULL);
  assert.ok(types.includes('LocalBusiness'));
  assert.ok(types.includes('Store'));
  assert.ok(types.includes('Organization'));
  // The broken JSON-LD block must not lose the valid one, nor throw.
  assert.equal(schemaTypes('<script type="application/ld+json">{oops}</script>').length, 0);
});

test('a fully tagged page scores high and reports no issues', () => {
  const meta = parseMetadata(FULL);
  assert.ok(meta.social_score >= 90, \`expected a high score, got \${meta.social_score}\`);
  assert.equal(meta.issues.length, 0);
});

test('a bare page is penalised most for a missing share image', () => {
  const meta = parseMetadata('<html><head><title>x</title></head><body></body></html>');
  const codes = meta.issues.map((i) => i.code);
  assert.ok(codes.includes('og_image_missing'));
  assert.ok(codes.includes('og_title_missing'));
  assert.ok(codes.includes('canonical_missing'));
  assert.ok(codes.includes('schema_localbusiness_missing'));
  assert.ok(meta.social_score < 30, \`expected a low score, got \${meta.social_score}\`);
  assert.ok(meta.social_score >= 0, 'score must never go negative');

  // og:image is the single biggest penalty — it is the difference between a
  // rich share card and a grey link.
  const imageIssue = meta.issues.find((i) => i.code === 'og_image_missing');
  assert.equal(imageIssue?.severity, 'high');
});

test('noindex is surfaced as a high-severity issue', () => {
  const meta = parseMetadata('<html><head><meta name="robots" content="noindex, nofollow"></head></html>');
  const issue = meta.issues.find((i) => i.code === 'noindex');
  assert.equal(issue?.severity, 'high');
});

test('scoring is deterministic and bounded', () => {
  const empty = scoreMetadata({
    og_title: null, og_description: null, og_image: null, og_type: null,
    twitter_card: null, twitter_title: null, twitter_image: null,
    canonical_url: null, robots_directives: 'noindex', schema_types: [],
  });
  assert.equal(empty.score, 0, 'worst case must clamp to 0, not go negative');
});
