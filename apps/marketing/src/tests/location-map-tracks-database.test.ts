import { describe, it, expect } from 'vitest';
import {
  DEMO_LOCATION_MAP,
  RETIRED_LOCATION_IDS,
  LOCATIONS,
  resolveLocationId,
  resolveLocationScopeIds,
  resolveLocationSlug,
} from '@/data/vowosData';

/**
 * Every single-location filter in the app resolves a slug through
 * DEMO_LOCATION_MAP before it reaches Supabase. A stale entry does not throw -
 * it returns an empty result set, which reads as "you have no appointments"
 * rather than "this app is misconfigured". That is exactly how the 2026-09-02
 * outage looked, so the map is pinned here until it is replaced by a
 * locations-table-backed provider.
 */
describe('DEMO_LOCATION_MAP tracks the database', () => {
  it('points at the Roberts Enterprises location rows, not the retired ones', () => {
    expect(DEMO_LOCATION_MAP).toEqual({
      'ido-br': 'b7b013f4-6c5f-4ebd-bc55-290d73f969fb',
      'ido-cov': 'f4809557-4834-41c7-a997-9046444682c0',
      'pc-br': '22783385-f099-4ddc-a8d6-0cafd0e3ffbd',
      'pc-cov': '6c663431-dc51-467d-82e4-4f26ae4953bb',
    });
  });

  it('never resolves a slug to a location retired by the org consolidation', () => {
    for (const slug of Object.keys(DEMO_LOCATION_MAP)) {
      expect(RETIRED_LOCATION_IDS).not.toContain(resolveLocationId(slug));
    }
  });

  it('covers every location the picker can emit, with no duplicates', () => {
    const slugs = LOCATIONS.map((l) => l.id).sort();
    expect(Object.keys(DEMO_LOCATION_MAP).sort()).toEqual(slugs);

    const uuids = Object.values(DEMO_LOCATION_MAP);
    expect(new Set(uuids).size).toBe(uuids.length);
  });

  it('round-trips slug -> uuid -> slug for every location', () => {
    for (const { id } of LOCATIONS) {
      expect(resolveLocationSlug(resolveLocationId(id))).toBe(id);
    }
  });

  it('does not turn All Locations into a restrictive database predicate', () => {
    const allSlugs = LOCATIONS.map((location) => location.id);
    const allUuids = Object.values(DEMO_LOCATION_MAP);

    expect(resolveLocationScopeIds('all')).toBeNull();
    expect(resolveLocationScopeIds(allSlugs)).toBeNull();
    expect(resolveLocationScopeIds(allUuids)).toBeNull();
  });

  it('keeps an explicit location subset restrictive', () => {
    expect(resolveLocationScopeIds(['ido-br', 'pc-cov'])).toEqual([
      DEMO_LOCATION_MAP['ido-br'],
      DEMO_LOCATION_MAP['pc-cov'],
    ]);
  });
});
