import assert from 'node:assert/strict';
import test from 'node:test';
import { requestBusinessScope, requestLocationScope } from '../requestScope';

test('Roberts request scope includes both legacy brand businesses', () => {
  assert.deepEqual(requestBusinessScope('82a5b426-78a2-47ba-896b-3146b1a99c53'), [
    '82a5b426-78a2-47ba-896b-3146b1a99c53',
    '65ad28de-3f86-428d-a5b6-9d89af3542fc',
    '81c291ed-e9a0-430c-ab8c-7ed2216a9c62',
  ]);
});

test('unrelated tenants remain restricted to their own business', () => {
  assert.deepEqual(requestBusinessScope('11111111-1111-1111-1111-111111111111'), [
    '11111111-1111-1111-1111-111111111111',
  ]);
});

test('canonical location filters also include their pre-consolidation rows', () => {
  assert.deepEqual(requestLocationScope(['b7b013f4-6c5f-4ebd-bc55-290d73f969fb']), [
    'b7b013f4-6c5f-4ebd-bc55-290d73f969fb',
    '1bf69ca1-91a2-417b-890f-79089763ae4f',
  ]);
});

test('location expansion is stable and de-duplicated', () => {
  assert.deepEqual(requestLocationScope([
    'b7b013f4-6c5f-4ebd-bc55-290d73f969fb',
    'b7b013f4-6c5f-4ebd-bc55-290d73f969fb',
  ]), [
    'b7b013f4-6c5f-4ebd-bc55-290d73f969fb',
    '1bf69ca1-91a2-417b-890f-79089763ae4f',
  ]);
});
