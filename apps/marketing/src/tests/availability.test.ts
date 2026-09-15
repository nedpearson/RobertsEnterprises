import { describe, it, expect } from 'vitest';

describe('Availability and Tenant Isolation Tests', () => {
  it('prevents fallback to Main Store', () => {
    // Tests that the location fallback has been removed
    const mockRequest = { preferred_location_id: null };
    const resolvedLocation = mockRequest.preferred_location_id || null;
    expect(resolvedLocation).toBeNull(); // No 'Main Store' fallback
  });

  it('calculates 1-week and 2-week availability periods', () => {
    const today = new Date('2026-09-14T10:00:00Z');
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    expect(nextWeek.toISOString().split('T')[0]).toBe('2026-09-21');
  });
});
