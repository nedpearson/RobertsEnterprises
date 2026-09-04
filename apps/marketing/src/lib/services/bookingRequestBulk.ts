export const ARCHIVED_REQUEST_STATUSES = [
  'archived',
  'sold_archived',
  'unsold_archived',
] as const;

export type AppointmentRequestArchiveScope = 'all' | 'active' | 'archived';

export type AppointmentRequestStatusFilter =
  | 'all'
  | 'new'
  | 'review'
  | 'ai_ready'
  | 'pending'
  | 'waitlist'
  | 'sold'
  | 'unsold'
  | 'unclassified';

export type AppointmentRequestBulkAction =
  | 'archive'
  | 'sold_archive'
  | 'unsold_archive'
  | 'restore'
  | 'delete';

export function isArchivedAppointmentRequestStatus(status: unknown): boolean {
  return ARCHIVED_REQUEST_STATUSES.includes(String(status || '').toLowerCase() as (typeof ARCHIVED_REQUEST_STATUSES)[number]);
}

export function getAppointmentRequestOutcome(status: unknown): 'sold' | 'unsold' | null {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'sold_archived') return 'sold';
  if (normalized === 'unsold_archived') return 'unsold';
  return null;
}

export function getAppointmentRequestStatusForBulkAction(
  action: Exclude<AppointmentRequestBulkAction, 'delete'>,
): string {
  switch (action) {
    case 'archive':
      return 'archived';
    case 'sold_archive':
      return 'sold_archived';
    case 'unsold_archive':
      return 'unsold_archived';
    case 'restore':
      return 'submitted';
  }
}

export function getArchiveCutoffIso(days: number, now = new Date()): string {
  if (!Number.isInteger(days) || days < 1) {
    throw new Error('Archive age must be a positive whole number of days.');
  }

  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function chunkRequestIds(ids: string[], chunkSize = 100): string[][] {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new Error('Chunk size must be a positive whole number.');
  }

  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += chunkSize) {
    chunks.push(ids.slice(index, index + chunkSize));
  }
  return chunks;
}

export interface AppointmentRequestCountSummary {
  active: number;
  archived: number;
  new: number;
  review: number;
  aiReady: number;
  confirmationPending: number;
  waitlist: number;
  soldArchived: number;
  unsoldArchived: number;
  unclassifiedArchived: number;
}

export function getMatchingAppointmentRequestCount(
  summary: AppointmentRequestCountSummary | undefined,
  scope: Extract<AppointmentRequestArchiveScope, 'active' | 'archived'>,
  filter: AppointmentRequestStatusFilter,
): number {
  if (!summary) return 0;
  if (scope === 'archived') {
    if (filter === 'sold') return summary.soldArchived;
    if (filter === 'unsold') return summary.unsoldArchived;
    if (filter === 'unclassified') return summary.unclassifiedArchived;
    return summary.archived;
  }
  if (filter === 'new') return summary.new;
  if (filter === 'review') return summary.review;
  if (filter === 'ai_ready') return summary.aiReady;
  if (filter === 'pending') return summary.confirmationPending;
  if (filter === 'waitlist') return summary.waitlist;
  return summary.active;
}
