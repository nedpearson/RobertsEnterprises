

export type StatusKey =
  | 'confirmed' | 'pending' | 'cancelled' | 'no_show' | 'rescheduled'
  | 'paid' | 'partial' | 'unpaid' | 'refunded' | 'voided'
  | 'open' | 'ordered' | 'in_production' | 'shipped' | 'received' | 'closed'
  | 'draft' | 'sent' | 'overdue' | 'ready' | 'completed' | 'failed'
  | 'in_transit' | 'discrepancy' | 'approved' | 'rejected'
  | string;

interface StatusDef { label: string; bg: string; color: string }

const STATUS_MAP: Record<string, StatusDef> = {
  confirmed:     { label: 'Confirmed',     bg: 'var(--color-success-soft)', color: 'var(--color-success)' },
  paid:          { label: 'Paid',          bg: 'var(--color-success-soft)', color: 'var(--color-success)' },
  received:      { label: 'Received',      bg: 'var(--color-success-soft)', color: 'var(--color-success)' },
  completed:     { label: 'Completed',     bg: 'var(--color-success-soft)', color: 'var(--color-success)' },
  ready:         { label: 'Ready',         bg: 'var(--color-success-soft)', color: 'var(--color-success)' },
  approved:      { label: 'Approved',      bg: 'var(--color-success-soft)', color: 'var(--color-success)' },

  pending:       { label: 'Pending',       bg: 'var(--color-warning-soft)', color: 'var(--color-warning)' },
  partial:       { label: 'Partial',       bg: 'var(--color-warning-soft)', color: 'var(--color-warning)' },
  in_production: { label: 'In Production', bg: 'var(--color-warning-soft)', color: 'var(--color-warning)' },
  shipped:       { label: 'Shipped',       bg: 'var(--color-warning-soft)', color: 'var(--color-warning)' },
  in_transit:    { label: 'In Transit',    bg: 'var(--color-warning-soft)', color: 'var(--color-warning)' },
  sent:          { label: 'Sent',          bg: 'var(--color-info-soft)',    color: 'var(--color-info)' },
  ordered:       { label: 'Ordered',       bg: 'var(--color-info-soft)',    color: 'var(--color-info)' },

  overdue:       { label: 'Overdue',       bg: 'var(--color-danger-soft)', color: 'var(--color-danger)' },
  no_show:       { label: 'No Show',       bg: 'var(--color-danger-soft)', color: 'var(--color-danger)' },
  unpaid:        { label: 'Unpaid',        bg: 'var(--color-danger-soft)', color: 'var(--color-danger)' },
  failed:        { label: 'Failed',        bg: 'var(--color-danger-soft)', color: 'var(--color-danger)' },
  rejected:      { label: 'Rejected',      bg: 'var(--color-danger-soft)', color: 'var(--color-danger)' },
  discrepancy:   { label: 'Discrepancy',   bg: 'var(--color-danger-soft)', color: 'var(--color-danger)' },

  rescheduled:   { label: 'Rescheduled',   bg: '#F3F0FF', color: '#6D4AE8' },

  cancelled:     { label: 'Cancelled',     bg: '#F3F4F6', color: '#6B7280' },
  voided:        { label: 'Voided',        bg: '#F3F4F6', color: '#6B7280' },
  closed:        { label: 'Closed',        bg: '#F3F4F6', color: '#6B7280' },

  draft:         { label: 'Draft',         bg: '#F3F4F6', color: '#9CA3AF' },
  open:          { label: 'Open',          bg: '#EFF6FF', color: '#3B82F6' },
  refunded:      { label: 'Refunded',      bg: '#EFF6FF', color: '#3B82F6' },
};

const DEFAULT_DEF: StatusDef = { label: '', bg: '#F3F4F6', color: '#6B7280' };

interface Props {
  status: StatusKey;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const key = String(status).toLowerCase().replace(/[\s-]/g, '_');
  const def = STATUS_MAP[key] ?? { ...DEFAULT_DEF, label: String(status) };
  const label = def.label || String(status).replace(/_/g, ' ');
  return (
    <span style={{
      display: 'inline-block',
      padding: size === 'sm' ? '2px 8px' : '4px 10px',
      borderRadius: 99,
      fontSize: size === 'sm' ? 11 : 12,
      fontWeight: 500,
      background: def.bg,
      color: def.color,
      whiteSpace: 'nowrap',
      textTransform: 'capitalize',
    }}>
      {label}
    </span>
  );
}
