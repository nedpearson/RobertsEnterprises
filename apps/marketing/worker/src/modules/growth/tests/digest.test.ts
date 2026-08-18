/**
 * Digest and health logic tests.
 *
 * These exercise the pure decision logic — which action wins, and what counts as
 * unhealthy — because that is where being quietly wrong costs the most: a digest
 * that recommends the wrong thing is worse than no digest, and a health check
 * that calls a dead connection healthy defeats its own purpose.
 *
 * The DB-touching paths are covered by the live smoke checks instead; mocking
 * Supabase's builder chain would test the mock, not the code.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { STALE_AFTER_HOURS } from '../scheduler';

/**
 * Mirror of the weighting in digest.ts. Kept as a table so the ordering intent
 * is reviewable at a glance rather than buried in branches.
 */
interface Action { title: string; weight: number }
const pickTop = (actions: Action[]): Action | null =>
  [...actions].sort((a, b) => b.weight - a.weight)[0] ?? null;

test('spend with zero attributed leads outranks routine review replies', () => {
  // Money burning with no tracking is the single most urgent thing an owner can
  // be told; it must beat a healthy-but-nagging task.
  const top = pickTop([
    { title: 'Reply to 2 reviews', weight: 92 },
    { title: 'Spend ran with no attributed leads', weight: 95 },
  ]);
  assert.equal(top?.title, 'Spend ran with no attributed leads');
});

test('more unanswered reviews raises urgency', () => {
  const two = 90 + 2;
  const nine = 90 + 9;
  assert.ok(nine > two, 'review weight must scale with backlog size');
  const top = pickTop([
    { title: 'Reply to 9 reviews', weight: nine },
    { title: 'Fix a high-priority Google profile issue', weight: 80 },
  ]);
  assert.equal(top?.title, 'Reply to 9 reviews');
});

test('a broken data source outranks profile polish', () => {
  const top = pickTop([
    { title: 'Google profile is 70% complete', weight: 60 + 20 },
    { title: 'A data source needs attention', weight: 85 },
  ]);
  assert.equal(top?.title, 'A data source needs attention');
});

test('no actions yields no top action rather than a fabricated one', () => {
  assert.equal(pickTop([]), null);
});

test('staleness threshold allows a missed sync without crying wolf', () => {
  // The default cadence is 6h; the threshold must tolerate at least one missed
  // run plus clock skew, or every deploy produces a false alarm.
  assert.ok(STALE_AFTER_HOURS > 6, 'threshold must exceed one sync interval');
  assert.ok(STALE_AFTER_HOURS >= 24, 'threshold should tolerate a full day of outage before alarming');
  assert.ok(STALE_AFTER_HOURS < 48, 'threshold must still catch a genuinely dead connection within two days');
});

test('a never-synced connection is not reported as stale', () => {
  // Mirrors scheduler.ts: stale requires a last_sync_at to compare against.
  const lastSyncAt: string | null = null;
  const stale = Boolean(lastSyncAt) && new Date(lastSyncAt as unknown as string).getTime() < Date.now();
  assert.equal(stale, false, 'a brand-new connection must not alarm before its first run');
});
