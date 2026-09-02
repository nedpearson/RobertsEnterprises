import { describe, expect, it } from 'vitest';
import {
  chunkRequestIds,
  getAppointmentRequestOutcome,
  getAppointmentRequestStatusForBulkAction,
  getArchiveCutoffIso,
  isArchivedAppointmentRequestStatus,
} from './bookingRequestBulk';

describe('booking request bulk helpers', () => {
  it('recognizes every archived request status', () => {
    expect(isArchivedAppointmentRequestStatus('archived')).toBe(true);
    expect(isArchivedAppointmentRequestStatus('sold_archived')).toBe(true);
    expect(isArchivedAppointmentRequestStatus('unsold_archived')).toBe(true);
    expect(isArchivedAppointmentRequestStatus('submitted')).toBe(false);
    expect(isArchivedAppointmentRequestStatus(null)).toBe(false);
  });

  it('preserves sold and unsold outcomes inside archived statuses', () => {
    expect(getAppointmentRequestOutcome('sold_archived')).toBe('sold');
    expect(getAppointmentRequestOutcome('unsold_archived')).toBe('unsold');
    expect(getAppointmentRequestOutcome('archived')).toBeNull();
  });

  it('maps recoverable bulk actions to request statuses', () => {
    expect(getAppointmentRequestStatusForBulkAction('archive')).toBe('archived');
    expect(getAppointmentRequestStatusForBulkAction('sold_archive')).toBe('sold_archived');
    expect(getAppointmentRequestStatusForBulkAction('unsold_archive')).toBe('unsold_archived');
    expect(getAppointmentRequestStatusForBulkAction('restore')).toBe('submitted');
  });

  it('calculates deterministic age cutoffs', () => {
    const now = new Date('2026-09-02T18:00:00.000Z');
    expect(getArchiveCutoffIso(90, now)).toBe('2026-06-04T18:00:00.000Z');
    expect(() => getArchiveCutoffIso(0, now)).toThrow(/positive whole number/i);
  });

  it('chunks large selections to keep PostgREST URLs bounded', () => {
    const ids = Array.from({ length: 205 }, (_, index) => `request-${index}`);
    const chunks = chunkRequestIds(ids, 100);

    expect(chunks).toHaveLength(3);
    expect(chunks.map((chunk) => chunk.length)).toEqual([100, 100, 5]);
    expect(chunks.flat()).toEqual(ids);
  });
});
